import { prisma } from '@atlas/db';
import { createLogger } from '@atlas/logger';
import { RateLimitError } from '@atlas/types';

const log = createLogger('rate-limit');

/**
 * Fixed-window rate limiting, backed by PostgreSQL.
 *
 * Why Postgres rather than Redis: the database is already a hard dependency,
 * and adding a second datastore for one counter buys a failure mode (Redis
 * down — does login fail open or closed?) in exchange for latency the login
 * path does not notice. At the volumes where this becomes the bottleneck, the
 * right answer is an edge rate limiter in front of the application, not a
 * different store behind it.
 *
 * Fixed windows allow a burst of up to 2x the limit across a boundary. That is
 * an accepted trade: a sliding-log limiter costs a row per attempt, and for
 * credential stuffing the difference between 10 and 20 attempts per 15 minutes
 * is not what stops the attack — the ~500x cost multiplier of Argon2 is.
 */
export interface RateLimitRule {
  readonly limit: number;
  readonly windowSeconds: number;
}

/** Failed logins per email address. Tight, because it protects one account. */
export const LOGIN_ATTEMPT_RULE: RateLimitRule = { limit: 10, windowSeconds: 15 * 60 };

/**
 * Failed logins per client address. Looser, because an office or a mobile
 * carrier NAT puts many legitimate users behind one address — too tight a
 * limit here locks out a whole building.
 */
export const LOGIN_IP_RULE: RateLimitRule = { limit: 50, windowSeconds: 15 * 60 };

/** New accounts per client address, to blunt automated signup. */
export const SIGNUP_IP_RULE: RateLimitRule = { limit: 10, windowSeconds: 60 * 60 };

interface ConsumeResult {
  readonly count: number;
  readonly expiresAt: Date;
}

/**
 * Records one use of `key` and reports the resulting count.
 *
 * A single statement, so concurrent requests cannot interleave a read and a
 * write and both conclude they were under the limit. `ON CONFLICT DO UPDATE`
 * resets the counter when the stored window has already expired, which avoids
 * needing a separate sweep before every check.
 */
async function consume(key: string, rule: RateLimitRule): Promise<ConsumeResult> {
  const rows = await prisma.$queryRaw<{ count: number; expires_at: Date }[]>`
    INSERT INTO rate_limits (key, count, window_started_at, expires_at)
    VALUES (
      ${key},
      1,
      now(),
      now() + make_interval(secs => ${rule.windowSeconds}::double precision)
    )
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.expires_at <= now() THEN 1
        ELSE rate_limits.count + 1
      END,
      window_started_at = CASE
        WHEN rate_limits.expires_at <= now() THEN now()
        ELSE rate_limits.window_started_at
      END,
      expires_at = CASE
        WHEN rate_limits.expires_at <= now()
        THEN now() + make_interval(secs => ${rule.windowSeconds}::double precision)
        ELSE rate_limits.expires_at
      END
    RETURNING count, expires_at
  `;

  const row = rows.at(0);
  if (!row) {
    // Unreachable: the statement always returns the upserted row. Failing
    // closed would lock every user out on an unexpected result, and failing
    // open silently is worse, so this is loud.
    throw new Error('Rate limit statement returned no row.');
  }

  return { count: row.count, expiresAt: row.expires_at };
}

/**
 * Consumes one unit against `key`, throwing once the limit is exceeded.
 *
 * Note the caller decides *when* to consume. Login consumes on failure only,
 * so a user with the right password is never locked out by someone else
 * hammering their address — otherwise the limiter becomes a denial-of-service
 * tool aimed at a known email.
 */
export async function enforceRateLimit(key: string, rule: RateLimitRule): Promise<void> {
  const { count, expiresAt } = await consume(key, rule);

  if (count > rule.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

    log.warn({ key, count, limit: rule.limit }, 'rate limit exceeded');
    throw new RateLimitError(retryAfterSeconds, 'Too many attempts. Try again later.');
  }
}

/** Clears a counter, called after a successful authentication. */
export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/**
 * Deletes expired windows. Intended for the same scheduled job that purges
 * sessions; expired rows are inert, this only bounds table growth.
 */
export async function purgeExpiredRateLimits(): Promise<number> {
  const result = await prisma.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

export const rateLimitKeys = {
  loginEmail: (email: string): string => `login:email:${email}`,
  loginIp: (ip: string): string => `login:ip:${ip}`,
  signupIp: (ip: string): string => `signup:ip:${ip}`,
} as const;
