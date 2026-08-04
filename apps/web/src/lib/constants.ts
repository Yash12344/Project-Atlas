/**
 * Shared between middleware (edge runtime) and the server.
 *
 * Middleware cannot import `@atlas/env/server` — that module reads the full
 * server configuration and pulls in Node-only dependencies. The cookie name is
 * the one value it needs, so it is duplicated here as a fallback and read from
 * the raw environment when set.
 */
export const SESSION_COOKIE_FALLBACK = 'atlas_session';
