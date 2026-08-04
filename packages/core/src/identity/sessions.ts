import { prisma } from '@atlas/db';
import { serverEnv } from '@atlas/env/server';
import {
  newSessionId,
  parseOrganizationId,
  parseUserId,
  type OrganizationId,
  type SessionId,
  type UserId,
} from '@atlas/types';

import { generateToken, hashToken } from './tokens';

export interface SessionRecord {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly activeOrganizationId: OrganizationId | null;
  readonly expiresAt: Date;
  readonly idleExpiresAt: Date;
}

export interface IssuedSession {
  readonly session: SessionRecord;
  /** Returned exactly once, at creation. Only its hash is stored. */
  readonly token: string;
}

export interface SessionOrigin {
  readonly ipAddress?: string | undefined;
  readonly userAgent?: string | undefined;
}

/**
 * Rewriting `lastActiveAt` on every request turns each authenticated page view
 * into a database write. The timestamp only needs to be accurate enough to
 * drive the idle timeout, so it is refreshed at most once a minute.
 */
const ACTIVITY_WRITE_INTERVAL_MS = 60_000;

function toSessionRecord(row: {
  id: string;
  userId: string;
  activeOrganizationId: string | null;
  expiresAt: Date;
  idleExpiresAt: Date;
}): SessionRecord {
  return {
    id: row.id as SessionId,
    userId: parseUserId(row.userId),
    activeOrganizationId:
      row.activeOrganizationId === null ? null : parseOrganizationId(row.activeOrganizationId),
    expiresAt: row.expiresAt,
    idleExpiresAt: row.idleExpiresAt,
  };
}

/**
 * Issues a new session.
 *
 * Always called on a fresh login rather than reusing an existing row, so a
 * session identifier fixed by an attacker before authentication is not the one
 * that ends up authenticated.
 */
export async function createSession(
  userId: UserId,
  activeOrganizationId: OrganizationId | null,
  origin: SessionOrigin = {},
): Promise<IssuedSession> {
  const token = generateToken();
  const now = Date.now();

  const row = await prisma.session.create({
    data: {
      id: newSessionId(),
      userId,
      tokenHash: hashToken(token),
      activeOrganizationId,
      expiresAt: new Date(now + serverEnv.SESSION_ABSOLUTE_TIMEOUT_SECONDS * 1000),
      idleExpiresAt: new Date(now + serverEnv.SESSION_IDLE_TIMEOUT_SECONDS * 1000),
      ipAddress: origin.ipAddress ?? null,
      userAgent: origin.userAgent ?? null,
    },
  });

  return { session: toSessionRecord(row), token };
}

/**
 * Resolves a presented token to a live session, or null.
 *
 * Two independent lifetimes are checked. The absolute expiry bounds how long a
 * stolen token is useful no matter how often it is exercised; the idle expiry
 * ends sessions that stop being used. Enforcing only one of the two leaves an
 * obvious hole in whichever direction is missing.
 */
export async function validateSessionToken(token: string): Promise<SessionRecord | null> {
  const row = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!row) {
    return null;
  }

  if (row.revokedAt !== null) {
    return null;
  }

  const now = new Date();
  if (row.expiresAt <= now || row.idleExpiresAt <= now) {
    return null;
  }

  const shouldExtend = now.getTime() - row.lastActiveAt.getTime() > ACTIVITY_WRITE_INTERVAL_MS;

  if (!shouldExtend) {
    return toSessionRecord(row);
  }

  // The idle window slides forward, but never past the absolute expiry.
  const slidTo = new Date(now.getTime() + serverEnv.SESSION_IDLE_TIMEOUT_SECONDS * 1000);
  const idleExpiresAt = slidTo > row.expiresAt ? row.expiresAt : slidTo;

  const refreshed = await prisma.session.update({
    where: { id: row.id },
    data: { lastActiveAt: now, idleExpiresAt },
  });

  return toSessionRecord(refreshed);
}

/** Switches which organization a session is acting in. */
export async function setActiveOrganization(
  sessionId: SessionId,
  organizationId: OrganizationId,
): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { activeOrganizationId: organizationId },
  });
}

export async function revokeSession(sessionId: SessionId): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revokes every session belonging to a user.
 *
 * Called after a password change: a credential change that leaves old sessions
 * alive does not actually evict whoever was using the old password.
 */
export async function revokeAllUserSessions(userId: UserId): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/**
 * Deletes sessions that expired more than a day ago.
 *
 * Intended for a scheduled job. Expired rows are already unusable; this keeps
 * the table from growing without bound.
 */
export async function purgeExpiredSessions(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return result.count;
}
