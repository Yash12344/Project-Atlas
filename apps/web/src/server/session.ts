import 'server-only';

import {
  findUserById,
  validateSessionToken,
  type IdentityUser,
  type SessionRecord,
} from '@atlas/core';
import { serverEnv } from '@atlas/env/server';
import { cookies } from 'next/headers';

/**
 * Session cookie handling.
 *
 * The cookie holds an opaque token and nothing else. No user id, no role, no
 * organization — anything placed in a cookie is attacker-controlled input on
 * the next request, so every attribute of the session is read from the
 * database where it cannot be edited by the client.
 */
const COOKIE_NAME = serverEnv.SESSION_COOKIE_NAME;

interface CookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  expires?: Date;
  maxAge?: number;
}

function cookieOptions(expires: Date): CookieOptions {
  return {
    // Not readable from JavaScript, so an XSS bug cannot exfiltrate the token.
    httpOnly: true,
    // `lax` still sends the cookie on top-level navigations, which is what
    // makes an emailed invitation link work while blocking cross-site POSTs.
    sameSite: 'lax',
    secure: serverEnv.NODE_ENV === 'production',
    path: '/',
    expires,
  };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, cookieOptions(expiresAt));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { ...cookieOptions(new Date(0)), maxAge: 0 });
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export interface AuthenticatedSession {
  readonly session: SessionRecord;
  readonly user: IdentityUser;
}

/**
 * Resolves the current session, or null.
 *
 * Returns null rather than throwing so that callers which merely *prefer* a
 * session (the marketing page, the login form) do not need a try/catch.
 */
export async function getSession(): Promise<AuthenticatedSession | null> {
  const token = await readSessionToken();
  if (token === null || token.length === 0) {
    return null;
  }

  const session = await validateSessionToken(token);
  if (!session) {
    return null;
  }

  const user = await findUserById(session.userId);
  if (!user) {
    // The session outlived its user. Treat as signed out.
    return null;
  }

  return { session, user };
}
