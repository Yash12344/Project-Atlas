/**
 * The closed set of auditable actions.
 *
 * A union rather than free-form strings: audit queries and alerting rules are
 * written against these values, and a typo in a rarely-exercised code path
 * would otherwise produce an event nobody is watching for.
 */
export const AUDIT_ACTIONS = [
  'organization.created',
  'organization.updated',
  'member.invited',
  'member.invitation_revoked',
  'member.joined',
  'member.removed',
  'member.role_changed',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
