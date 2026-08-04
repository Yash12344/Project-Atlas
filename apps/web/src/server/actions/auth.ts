'use server';

import {
  acceptInvitation,
  authenticate,
  clearRateLimit,
  createSession,
  enforceRateLimit,
  listUserOrganizations,
  rateLimitKeys,
  registerUser,
  revokeSession,
  setActiveOrganization,
  LOGIN_ATTEMPT_RULE,
  LOGIN_IP_RULE,
  SIGNUP_IP_RULE,
} from '@atlas/core';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { safeRedirectPath } from '~/lib/redirect';
import { requireSessionOrThrow } from '../context';
import { formString, runFormAction, type FormState } from '../form';
import { clearSessionCookie, getSession, readSessionToken, setSessionCookie } from '../session';

async function requestOrigin(): Promise<{ ipAddress?: string; userAgent?: string }> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ipAddress = forwarded?.split(',')[0]?.trim();
  const userAgent = headerList.get('user-agent') ?? undefined;

  return {
    ...(ipAddress === undefined || ipAddress.length === 0 ? {} : { ipAddress }),
    ...(userAgent === undefined ? {} : { userAgent }),
  };
}

/**
 * Signs a user in and decides where they land.
 *
 * A user with exactly one organization goes straight to it; anyone else picks.
 * The session records the active organization so a refresh does not lose it.
 */
export async function loginAction(
  _previous: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  let destination = '/';

  const result = await runFormAction('auth.login', async () => {
    const origin = await requestOrigin();
    const email = formString(formData, 'email').trim().toLowerCase();

    // The per-address counter is checked before doing any Argon2 work, so a
    // flood costs the attacker a round trip and costs us an index lookup.
    if (origin.ipAddress !== undefined) {
      await enforceRateLimit(rateLimitKeys.loginIp(origin.ipAddress), LOGIN_IP_RULE);
    }

    let user;
    try {
      user = await authenticate({ email, password: formString(formData, 'password') });
    } catch (error) {
      // Consumed on failure only. Counting successful logins too would let
      // anyone lock a known account out by submitting bad passwords for it.
      await enforceRateLimit(rateLimitKeys.loginEmail(email), LOGIN_ATTEMPT_RULE);
      throw error;
    }

    await clearRateLimit(rateLimitKeys.loginEmail(email));

    const organizations = await listUserOrganizations(user.id);
    const only = organizations.length === 1 ? organizations[0] : undefined;

    const { session, token } = await createSession(user.id, only?.id ?? null, origin);

    await setSessionCookie(token, session.expiresAt);

    destination = safeRedirectPath(
      formString(formData, 'next'),
      only ? `/${only.slug}` : '/organizations',
    );
  });

  if (result.status === 'error') {
    return result;
  }

  // `redirect` throws a control-flow signal, so it must run outside the
  // try/catch in runFormAction or it would be reported as a failure.
  redirect(destination);
}

export async function signupAction(
  _previous: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  const result = await runFormAction('auth.signup', async () => {
    const origin = await requestOrigin();

    if (origin.ipAddress !== undefined) {
      await enforceRateLimit(rateLimitKeys.signupIp(origin.ipAddress), SIGNUP_IP_RULE);
    }

    const user = await registerUser({
      name: formString(formData, 'name'),
      email: formString(formData, 'email'),
      password: formString(formData, 'password'),
    });

    const { session, token } = await createSession(user.id, null, origin);
    await setSessionCookie(token, session.expiresAt);
  });

  if (result.status === 'error') {
    return result;
  }

  redirect('/onboarding');
}

export async function logoutAction(): Promise<never> {
  const session = await getSession();

  if (session) {
    await revokeSession(session.session.id);
  }

  await clearSessionCookie();
  redirect('/login');
}

/** Switches the organization the current session is acting in. */
export async function switchOrganizationAction(formData: FormData): Promise<never> {
  const { session } = await requireSessionOrThrow();
  const slug = formString(formData, 'slug');

  const organizations = await listUserOrganizations(session.userId);
  const target = organizations.find((organization) => organization.slug === slug);

  if (!target) {
    // Not a member: send them back to the picker rather than disclosing
    // whether the slug exists.
    redirect('/organizations');
  }

  await setActiveOrganization(session.id, target.id);
  redirect(`/${target.slug}`);
}

/**
 * Redeems an invitation for the signed-in user.
 *
 * The session is re-read here rather than trusting a hidden form field: the
 * token in the URL says which organization, and the cookie says who.
 */
export async function acceptInvitationAction(
  _previous: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  let destination = '/organizations';

  const result = await runFormAction('invitations.accept', async () => {
    const { user, session } = await requireSessionOrThrow();
    const token = formString(formData, 'token');

    const { organizationId, organizationSlug } = await acceptInvitation(user.id, user.email, token);

    await setActiveOrganization(session.id, organizationId);
    destination = `/${organizationSlug}`;
  });

  if (result.status === 'error') {
    return result;
  }

  redirect(destination);
}

/** True when a request carries a live session cookie; used by public pages. */
export async function hasSession(): Promise<boolean> {
  const token = await readSessionToken();
  return token !== null && token.length > 0;
}
