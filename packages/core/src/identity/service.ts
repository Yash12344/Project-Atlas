import { prisma } from '@atlas/db';
import { createLogger } from '@atlas/logger';
import {
  ConflictError,
  emailSchema,
  newUserId,
  parseUserId,
  passwordSchema,
  personNameSchema,
  UnauthenticatedError,
  ValidationError,
  type UserId,
} from '@atlas/types';
import { z } from 'zod';

import { hashPassword, needsRehash, verifyPassword, verifyPasswordAgainstDummy } from './password';
import { revokeAllUserSessions } from './sessions';

const log = createLogger('identity');

export const registerInputSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  // Length is not re-validated on login. The stored credential may predate a
  // policy change, and rejecting it here would lock the user out of the very
  // flow that could upgrade it.
  password: z.string().min(1, 'Password is required.'),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export interface IdentityUser {
  readonly id: UserId;
  readonly email: string;
  readonly name: string;
}

function toIdentityUser(row: { id: string; email: string; name: string }): IdentityUser {
  return { id: parseUserId(row.id), email: row.email, name: row.name };
}

/**
 * Creates an account.
 *
 * The duplicate-email response is deliberately explicit rather than a silent
 * success. Concealing it would only be meaningful if registration also sent a
 * "someone tried to register with your address" email, which Atlas does not
 * yet do — so a vague error would degrade the experience for every honest user
 * while telling a determined attacker the same thing via the login endpoint.
 * Revisit when transactional email lands.
 */
export async function registerUser(input: RegisterInput): Promise<IdentityUser> {
  const { name, email, password } = registerInputSchema.parse(input);

  const passwordHash = await hashPassword(password);

  try {
    const created = await prisma.user.create({
      data: { id: newUserId(), name, email, passwordHash },
    });

    log.info({ userId: created.id }, 'user registered');
    return toIdentityUser(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError('An account with that email already exists.');
    }
    throw error;
  }
}

/**
 * Verifies credentials.
 *
 * Both failure branches cost the same wall-clock time: an unknown email still
 * runs a full Argon2 verification against a dummy digest. Skipping that turns
 * response latency into an account-existence oracle.
 */
export async function authenticate(input: LoginInput): Promise<IdentityUser> {
  const { email, password } = loginInputSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await verifyPasswordAgainstDummy(password);
    throw new UnauthenticatedError('Incorrect email or password.');
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw new UnauthenticatedError('Incorrect email or password.');
  }

  // The plaintext is in hand exactly once per login; if the stored parameters
  // are behind current policy, this is the only moment an upgrade is possible.
  if (needsRehash(user.passwordHash)) {
    const upgraded = await hashPassword(password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: upgraded } });
    log.info({ userId: user.id }, 'password hash upgraded to current parameters');
  }

  return toIdentityUser(user);
}

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

/**
 * Changes a password and evicts every existing session.
 *
 * A password change that leaves old sessions alive does not remove whoever was
 * using the old credential, which is the usual reason someone changes it.
 */
export async function changePassword(userId: UserId, input: ChangePasswordInput): Promise<void> {
  const { currentPassword, newPassword } = changePasswordInputSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthenticatedError();
  }

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new ValidationError('Current password is incorrect.', [
      { path: 'currentPassword', message: 'Current password is incorrect.' },
    ]);
  }

  if (await verifyPassword(user.passwordHash, newPassword)) {
    throw new ValidationError('Choose a password you have not used before.', [
      { path: 'newPassword', message: 'Choose a password you have not used before.' },
    ]);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  const revoked = await revokeAllUserSessions(userId);
  log.info({ userId, revoked }, 'password changed; sessions revoked');
}

export async function findUserById(userId: UserId): Promise<IdentityUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toIdentityUser(user) : null;
}

/**
 * Narrows a thrown value to a PostgreSQL unique-constraint violation.
 *
 * Written as a structural check rather than an `instanceof` against Prisma's
 * error class so it keeps working across the driver-adapter boundary, where
 * the error may be re-wrapped.
 */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code: unknown = Reflect.get(error, 'code');
  return code === 'P2002' || code === '23505';
}
