import { z } from 'zod';

/**
 * Shared field schemas. Every boundary parses with these rather than
 * hand-rolling a check, so normalisation rules (lowercasing an email, trimming
 * a name) apply everywhere or nowhere.
 */

/** Lowercased and trimmed: `A@B.com` and `a@b.com` must not be two accounts. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email is required.')
  .max(254, 'Email is too long.')
  // Normalisation runs first, then the format check, so `  A@B.com ` and
  // `a@b.com` are validated as the same value rather than one passing and the
  // other failing on whitespace.
  .pipe(z.email('Enter a valid email address.'));

/**
 * Length is the only password rule enforced here.
 *
 * Composition rules ("one symbol, one digit") measurably push users toward
 * predictable substitutions without adding entropy. NIST SP 800-63B recommends
 * a long minimum and no composition requirement. The 256 ceiling bounds the
 * work an unauthenticated caller can ask Argon2 to do.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(256, 'Password is too long.');

export const personNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required.')
  .max(120, 'Name is too long.');

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, 'Organization name must be at least 2 characters.')
  .max(120, 'Organization name is too long.');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Slugs appear in URLs and must never collide with a routing segment, so the
 * reserved list is enforced at the schema rather than at each call site.
 */
const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'app',
  'auth',
  'login',
  'logout',
  'signup',
  'settings',
  'onboarding',
  'invitations',
  'health',
  'static',
  '_next',
  'www',
]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug must be at least 3 characters.')
  .max(48, 'Slug is too long.')
  .regex(SLUG_PATTERN, 'Use lowercase letters, numbers, and single hyphens.')
  .refine((value) => !RESERVED_SLUGS.has(value), 'That slug is reserved.');

/** Best-effort slug derived from a display name; the caller still validates. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.has(value);
}
