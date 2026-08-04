import 'server-only';

import { findMembershipBySlug, type Actor, type OrganizationDetail } from '@atlas/core';
import { NotFoundError, UnauthenticatedError } from '@atlas/types';
import { notFound, redirect } from 'next/navigation';

import { getSession, type AuthenticatedSession } from './session';

/**
 * Request context: the single place a cookie becomes an authorized Actor.
 *
 * Nothing downstream re-derives identity. A service takes an `Actor` and
 * trusts it, because the only way to obtain one is through these functions,
 * and each of them ends in a database read that confirms the membership still
 * exists with the role it claims.
 */

/**
 * Requires a signed-in user, redirecting to login otherwise.
 *
 * For pages. `redirect` throws internally, so the return type is honest about
 * always producing a session on the paths that continue.
 */
export async function requireSession(returnTo?: string): Promise<AuthenticatedSession> {
  const session = await getSession();

  if (!session) {
    const target =
      returnTo === undefined ? '/login' : `/login?next=${encodeURIComponent(returnTo)}`;
    redirect(target);
  }

  return session;
}

/**
 * Requires a signed-in user without redirecting — for Server Actions and API
 * routes, where a redirect would be the wrong response to an unauthenticated
 * request.
 */
export async function requireSessionOrThrow(): Promise<AuthenticatedSession> {
  const session = await getSession();

  if (!session) {
    throw new UnauthenticatedError();
  }

  return session;
}

export interface OrganizationContext {
  readonly actor: Actor;
  readonly organization: OrganizationDetail;
  readonly session: AuthenticatedSession;
}

/**
 * Resolves an organization slug to an Actor, or renders 404.
 *
 * A user who is not a member gets the same not-found response as a slug that
 * does not exist. Distinguishing the two would let anyone enumerate the
 * customer list by probing slugs.
 *
 * The role is read fresh on every request rather than cached in the session,
 * so revoking someone's access takes effect on their next request instead of
 * whenever their session happens to expire.
 */
export async function requireOrganization(slug: string): Promise<OrganizationContext> {
  const session = await requireSession(`/${slug}`);
  const membership = await findMembershipBySlug(session.user.id, slug);

  if (!membership) {
    notFound();
  }

  return {
    session,
    organization: membership.organization,
    actor: {
      userId: session.user.id,
      organizationId: membership.organization.id,
      role: membership.role,
    },
  };
}

/** The Server Action and API-route counterpart of `requireOrganization`. */
export async function requireOrganizationOrThrow(slug: string): Promise<OrganizationContext> {
  const session = await requireSessionOrThrow();
  const membership = await findMembershipBySlug(session.user.id, slug);

  if (!membership) {
    // NotFound rather than Forbidden, for the same enumeration reason.
    throw new NotFoundError('Organization not found.');
  }

  return {
    session,
    organization: membership.organization,
    actor: {
      userId: session.user.id,
      organizationId: membership.organization.id,
      role: membership.role,
    },
  };
}
