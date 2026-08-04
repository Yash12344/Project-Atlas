/**
 * Authorization is capability-based, not rank-based.
 *
 * A numeric rank ("admin >= member") reads well with three roles and collapses
 * the moment a role needs a permission another higher role lacks — billing
 * being the usual first example. Mapping each role to an explicit permission
 * set costs a few lines now and stays correct as roles multiply.
 */
export const ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'organization:read',
  'organization:update',
  'organization:delete',
  'member:read',
  'member:invite',
  'member:remove',
  'member:update_role',
  'invitation:read',
  'invitation:revoke',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MEMBER_PERMISSIONS = [
  'organization:read',
  'member:read',
] as const satisfies readonly Permission[];

const ADMIN_PERMISSIONS = [
  ...MEMBER_PERMISSIONS,
  'organization:update',
  'member:invite',
  'member:remove',
  'invitation:read',
  'invitation:revoke',
  'audit:read',
] as const satisfies readonly Permission[];

const OWNER_PERMISSIONS = [
  ...ADMIN_PERMISSIONS,
  'organization:delete',
  'member:update_role',
] as const satisfies readonly Permission[];

const ROLE_PERMISSIONS: Readonly<Record<Role, ReadonlySet<Permission>>> = {
  MEMBER: new Set(MEMBER_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS),
  OWNER: new Set(OWNER_PERMISSIONS),
};

/** Single source of truth for "may this role do this?". */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
