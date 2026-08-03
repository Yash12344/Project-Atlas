import {
  can,
  ForbiddenError,
  type OrganizationId,
  type Permission,
  type Role,
  type UserId,
} from '@atlas/types';

/**
 * Who is acting, where, and with what role.
 *
 * Every tenant-scoped service takes an Actor as its first argument. Making it
 * explicit rather than reading an ambient session inside the domain layer
 * keeps these functions callable from a request handler, a background job, or
 * a test without any of them needing a fake request.
 */
export interface Actor {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly role: Role;
}

/**
 * Authorization gate. Throws rather than returning a boolean so that a
 * forgotten check is a missing statement — visible in review — instead of an
 * ignored return value.
 */
export function assertPermission(actor: Actor, permission: Permission): void {
  if (!can(actor.role, permission)) {
    throw new ForbiddenError(`Your role (${actor.role}) cannot perform this action.`);
  }
}
