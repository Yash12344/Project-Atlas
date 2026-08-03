import { uuidv7 } from 'uuidv7';
import { z } from 'zod';

/**
 * Identifiers are prefixed, opaque strings backed by a UUIDv7.
 *
 * Why not a bare UUID or a bigserial:
 *  - UUIDv7 is time-ordered, so primary-key inserts stay sequential and the
 *    B-tree does not fragment the way it does under UUIDv4.
 *  - The prefix makes an identifier self-describing in logs, support tickets,
 *    and API payloads. `org_0192...` cannot be mistaken for a user id, and a
 *    mis-routed identifier fails at the parse boundary instead of silently
 *    querying the wrong table.
 *  - Sequential integers leak business volume and foreclose sharding.
 *
 * The dashes are stripped so the printed form stays compact while preserving
 * the leading timestamp bytes that give the ordering.
 */
export const ID_PREFIXES = {
  user: 'usr',
  organization: 'org',
  membership: 'mem',
  invitation: 'inv',
  session: 'ses',
  auditLog: 'log',
} as const;

export type IdEntity = keyof typeof ID_PREFIXES;
export type IdPrefix = (typeof ID_PREFIXES)[IdEntity];

declare const brand: unique symbol;

/** Nominal typing helper: prevents a UserId being passed where an OrgId is due. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type MembershipId = Brand<string, 'MembershipId'>;
export type InvitationId = Brand<string, 'InvitationId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type AuditLogId = Brand<string, 'AuditLogId'>;

const UUID_HEX_LENGTH = 32;

function idPattern(prefix: IdPrefix): RegExp {
  return new RegExp(`^${prefix}_[0-9a-f]{${String(UUID_HEX_LENGTH)}}$`);
}

function createRawId(entity: IdEntity): string {
  return `${ID_PREFIXES[entity]}_${uuidv7().replaceAll('-', '')}`;
}

/**
 * Builds a Zod schema that validates and brands an identifier.
 *
 * Branding happens here and in the matching factory below, and nowhere else.
 * A branded type in a signature is therefore evidence the value was validated,
 * not an assertion someone wrote at the call site.
 */
function idSchema<T extends string>(entity: IdEntity, label: string): z.ZodType<T> {
  const pattern = idPattern(ID_PREFIXES[entity]);
  return z
    .string()
    .regex(pattern, `Invalid ${label}`)
    .transform((value) => value as T);
}

export const userIdSchema = idSchema<UserId>('user', 'user id');
export const organizationIdSchema = idSchema<OrganizationId>('organization', 'organization id');
export const membershipIdSchema = idSchema<MembershipId>('membership', 'membership id');
export const invitationIdSchema = idSchema<InvitationId>('invitation', 'invitation id');
export const sessionIdSchema = idSchema<SessionId>('session', 'session id');
export const auditLogIdSchema = idSchema<AuditLogId>('auditLog', 'audit log id');

export const newUserId = (): UserId => createRawId('user') as UserId;
export const newOrganizationId = (): OrganizationId => createRawId('organization') as OrganizationId;
export const newMembershipId = (): MembershipId => createRawId('membership') as MembershipId;
export const newInvitationId = (): InvitationId => createRawId('invitation') as InvitationId;
export const newSessionId = (): SessionId => createRawId('session') as SessionId;
export const newAuditLogId = (): AuditLogId => createRawId('auditLog') as AuditLogId;

/**
 * Rehydrates an identifier read back from a trusted source (the database).
 * Throws if the stored value does not match the expected shape, which means a
 * corrupt row rather than bad user input.
 */
export function parseUserId(value: string): UserId {
  return userIdSchema.parse(value);
}

export function parseOrganizationId(value: string): OrganizationId {
  return organizationIdSchema.parse(value);
}
