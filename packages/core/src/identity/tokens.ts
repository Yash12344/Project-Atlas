import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Opaque bearer tokens for sessions and invitations.
 *
 * Why opaque tokens rather than a signed JWT in a cookie: a JWT cannot be
 * revoked before it expires without a server-side denylist, which is the same
 * lookup a session row already performs — so the JWT buys nothing and costs
 * the ability to log someone out. Session state also has to be read anyway to
 * know which organization the user is acting in.
 *
 * 32 bytes from the CSPRNG is 256 bits of entropy, well beyond guessing range.
 * base64url keeps it URL-safe for invitation links.
 */
const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Tokens are stored as their SHA-256 digest, never in plaintext.
 *
 * A leaked database backup therefore does not hand over live sessions or
 * usable invitation links. SHA-256 rather than Argon2 is correct here: the
 * input is 256 bits of uniform randomness, so there is no dictionary to attack
 * and a slow KDF would only add latency to every authenticated request.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison for the cases where two secrets are compared in the
 * application rather than by an indexed database lookup.
 */
export function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
