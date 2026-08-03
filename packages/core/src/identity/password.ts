import { hash, verify } from '@node-rs/argon2';

/**
 * `Algorithm.Argon2id` from @node-rs/argon2, inlined.
 *
 * The package declares Algorithm as an ambient `const enum`, which
 * `verbatimModuleSyntax` cannot import — there is no runtime object to read
 * from. Passing the value explicitly is preferable to relying on the library
 * default: which variant hashes a password is a security parameter, and it
 * should be stated at the call site rather than inherited silently. The
 * `assertsArgon2idInUse` test pins this to the encoded output.
 */
const ARGON2ID = 2;

/**
 * Argon2id parameters, from the OWASP Password Storage Cheat Sheet.
 *
 * 19 MiB of memory with one iteration is the configuration OWASP lists first
 * for Argon2id; the memory cost is what makes GPU and ASIC attacks expensive,
 * which is why it is tuned before the time cost. Parallelism is 1 because the
 * hash runs on a request thread and a higher degree buys the defender little
 * while costing latency.
 *
 * These values are recorded inside the encoded hash, so raising them later
 * does not invalidate existing passwords — `needsRehash` detects the older
 * parameters and the next successful login upgrades that user transparently.
 */
const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/**
 * A precomputed hash used to equalise the cost of authenticating a nonexistent
 * account. See `verifyPassword` callers in the identity service: without this,
 * "no such user" returns in microseconds while a real user costs ~50ms, and
 * the difference is a reliable account-enumeration oracle.
 *
 * Computed once at module load rather than per request.
 */
let dummyHashPromise: Promise<string> | undefined;

export async function hashPassword(plaintext: string): Promise<string> {
  return await hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(digest: string, plaintext: string): Promise<boolean> {
  try {
    return await verify(digest, plaintext, ARGON2_OPTIONS);
  } catch {
    // A malformed or truncated digest is a corrupt row, not a valid login.
    // Returning false keeps the failure indistinguishable from a wrong
    // password to the caller; the row is a separate operational problem.
    return false;
  }
}

/**
 * Burns roughly the same CPU as a real verification, so an unknown email and a
 * wrong password take indistinguishable time.
 */
export async function verifyPasswordAgainstDummy(plaintext: string): Promise<false> {
  dummyHashPromise ??= hash('atlas-timing-equalisation-placeholder', ARGON2_OPTIONS);
  const digest = await dummyHashPromise;
  await verifyPassword(digest, plaintext);
  return false;
}

/**
 * True when a stored hash was produced with weaker parameters than the current
 * policy, so the caller can re-hash while it holds the plaintext.
 */
export function needsRehash(digest: string): boolean {
  const parsed = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(digest);
  if (!parsed) {
    return true;
  }

  const [, memory, time, parallelism] = parsed;
  if (memory === undefined || time === undefined || parallelism === undefined) {
    return true;
  }

  return (
    Number(memory) < ARGON2_OPTIONS.memoryCost ||
    Number(time) < ARGON2_OPTIONS.timeCost ||
    Number(parallelism) !== ARGON2_OPTIONS.parallelism
  );
}
