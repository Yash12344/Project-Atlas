import { prisma } from '@atlas/db';
import { closeTestConnections } from '@atlas/db/testing';
import { RateLimitError } from '@atlas/types';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  clearRateLimit,
  enforceRateLimit,
  purgeExpiredRateLimits,
  rateLimitKeys,
  type RateLimitRule,
} from './rate-limit';

const RULE: RateLimitRule = { limit: 3, windowSeconds: 60 };

function uniqueKey(): string {
  return `test:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

beforeEach(async () => {
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: 'test:' } } });
});

afterAll(async () => {
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: 'test:' } } });
  await closeTestConnections();
});

describe('rate limiting', () => {
  it('allows requests up to the limit and rejects the next one', async () => {
    const key = uniqueKey();

    for (let attempt = 0; attempt < RULE.limit; attempt += 1) {
      await expect(enforceRateLimit(key, RULE)).resolves.toBeUndefined();
    }

    await expect(enforceRateLimit(key, RULE)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('reports how long to wait', async () => {
    const key = uniqueKey();
    for (let attempt = 0; attempt <= RULE.limit; attempt += 1) {
      await enforceRateLimit(key, RULE).catch(() => undefined);
    }

    try {
      await enforceRateLimit(key, RULE);
      expect.unreachable('should have been rate limited');
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      const retryAfter = (error as RateLimitError).retryAfterSeconds;
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(RULE.windowSeconds);
    }
  });

  it('counts keys independently', async () => {
    const first = uniqueKey();
    const second = uniqueKey();

    for (let attempt = 0; attempt <= RULE.limit; attempt += 1) {
      await enforceRateLimit(first, RULE).catch(() => undefined);
    }

    // A different key must be unaffected — otherwise one user's failures lock
    // out everyone else.
    await expect(enforceRateLimit(second, RULE)).resolves.toBeUndefined();
  });

  it('is atomic under concurrency', async () => {
    // Ten simultaneous attempts against a limit of three must produce exactly
    // three successes. A read-then-write implementation would let several
    // requests each observe count=0 and all proceed.
    const key = uniqueKey();

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, async () => {
        await enforceRateLimit(key, RULE);
      }),
    );

    const allowed = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(allowed).toHaveLength(RULE.limit);
    expect(rejected).toHaveLength(10 - RULE.limit);
  });

  it('resets the window once it has expired', async () => {
    const key = uniqueKey();
    const shortRule: RateLimitRule = { limit: 1, windowSeconds: 1 };

    await enforceRateLimit(key, shortRule);
    await expect(enforceRateLimit(key, shortRule)).rejects.toBeInstanceOf(RateLimitError);

    // Move the stored window into the past rather than sleeping, so the test
    // stays fast and deterministic.
    await prisma.rateLimit.update({
      where: { key },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(enforceRateLimit(key, shortRule)).resolves.toBeUndefined();
  });

  it('clears a counter on success', async () => {
    const key = uniqueKey();
    await enforceRateLimit(key, RULE);
    await enforceRateLimit(key, RULE);

    await clearRateLimit(key);

    for (let attempt = 0; attempt < RULE.limit; attempt += 1) {
      await expect(enforceRateLimit(key, RULE)).resolves.toBeUndefined();
    }
  });

  it('purges expired windows', async () => {
    const key = uniqueKey();
    await enforceRateLimit(key, RULE);
    await prisma.rateLimit.update({
      where: { key },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const purged = await purgeExpiredRateLimits();
    expect(purged).toBeGreaterThanOrEqual(1);
    expect(await prisma.rateLimit.findUnique({ where: { key } })).toBeNull();
  });

  it('namespaces keys by concern', () => {
    // A shared namespace would let signup attempts consume a login budget.
    expect(rateLimitKeys.loginEmail('a@b.com')).not.toBe(rateLimitKeys.signupIp('a@b.com'));
    expect(rateLimitKeys.loginEmail('a@b.com')).toContain('login:email:');
  });
});
