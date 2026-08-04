import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE_FALLBACK } from '~/lib/constants';

/**
 * The proxy (formerly "middleware") does one thing: bounce
 * obviously-unauthenticated traffic away from application routes before it
 * costs a render.
 *
 * It deliberately does *not* validate the session. This runs on the edge
 * runtime, where there is no database connection and no Node crypto — a real
 * check here would mean either duplicating auth in a second, weaker form or
 * shipping a JWT the server has to trust. The authoritative check lives in
 * `requireSession`, which every protected page and action already calls.
 *
 * So this is an optimisation, not a security boundary. Presence of a cookie is
 * enough to let a request through; it will be rejected downstream if the token
 * is invalid.
 */
const PUBLIC_PATH_PATTERN = /^\/(?:$|login|signup|invitations\/|_next\/|favicon\.ico|robots\.txt)/;

/**
 * API routes are never redirected.
 *
 * A 307 to an HTML login page is a useless response to a programmatic caller:
 * it turns "you are not authenticated" into a page of markup with a 200 at the
 * end of the redirect chain. Route handlers reject unauthenticated requests
 * themselves via `requireSessionOrThrow`, which produces a 401 in RFC 9457
 * form — the answer an API client can actually act on.
 */
const API_PATH_PREFIX = '/api/';

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATH_PATTERN.test(pathname) || pathname.startsWith(API_PATH_PREFIX)) {
    return NextResponse.next();
  }

  const cookieName = process.env['SESSION_COOKIE_NAME'] ?? SESSION_COOKIE_FALLBACK;
  const hasSessionCookie = request.cookies.has(cookieName);

  if (!hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation, which never
    // need an auth decision.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
