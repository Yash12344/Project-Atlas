/**
 * Validates a post-login redirect target.
 *
 * The login form accepts a `next` parameter so an expired session returns the
 * user where they were. That parameter is attacker-controlled, and echoing it
 * into a redirect without checking is the classic open-redirect: a link to
 * `atlas.dev/login?next=https://evil.example` sends users somewhere hostile
 * with Atlas's name on the link.
 *
 * Only same-origin absolute paths pass. `//evil.example` is rejected
 * explicitly — it is a protocol-relative URL that a naive `startsWith('/')`
 * check treats as internal, and browsers resolve it to a different host.
 */
export function safeRedirectPath(candidate: string | null | undefined, fallback: string): string {
  if (candidate === null || candidate === undefined || candidate.length === 0) {
    return fallback;
  }

  if (!candidate.startsWith('/')) {
    return fallback;
  }

  // Protocol-relative (`//host`) and backslash variants (`/\host`, which some
  // browsers normalise to `//host`).
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return fallback;
  }

  return candidate;
}
