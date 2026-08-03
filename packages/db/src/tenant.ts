import type { OrganizationId, UserId } from '@atlas/types';

import type { Prisma } from '../generated/client/client.js';
import { prisma } from './client.js';

/**
 * Who is acting, and inside which tenant. Both branded, so a raw string cannot
 * be passed by accident.
 */
export interface TenantContext {
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
}

/**
 * The client handed to tenant-scoped work. It is a transaction client, so the
 * row-level security context set below cannot leak to another request sharing
 * the same pooled connection.
 */
export type TenantClient = Prisma.TransactionClient;

/**
 * Runs `fn` with row-level security bound to one organization.
 *
 * Every tenant-scoped read and write in the application goes through here.
 *
 * Why an explicit transaction rather than a Prisma client extension:
 * the documented `$extends` approach wraps each individual operation in its
 * own transaction, which is fine until someone needs two statements to be
 * atomic. At that point the extended client is called inside
 * `$transaction(...)`, each inner query tries to open a nested transaction,
 * and the failure is subtle. Making the transaction the unit of tenancy
 * removes that trap: the GUCs are set once, every statement in the callback
 * sees them, and multi-statement work is atomic by construction.
 *
 * `set_config(..., TRUE)` is transaction-local (equivalent to SET LOCAL), so
 * the setting is discarded on commit or rollback. That is what makes this safe
 * behind a transaction-mode connection pooler, where the next request may be
 * handed the same physical connection.
 */
export async function withTenant<T>(
  context: TenantContext,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT
        set_config('app.current_organization_id', ${context.organizationId}, TRUE),
        set_config('app.current_user_id', ${context.userId}, TRUE)
    `;
    return await fn(tx);
  });
}

/**
 * Runs `fn` with only the acting user bound, and no tenant selected.
 *
 * This is the context for questions that legitimately span tenants because no
 * tenant has been chosen yet: "which organizations do I belong to?" at login,
 * and the organization switcher. The self-scope policies on `memberships` and
 * `organizations` answer exactly those and nothing more — the caller still
 * cannot see a row belonging to an organization they are not a member of.
 */
export async function withUser<T>(
  userId: UserId,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT set_config('app.current_user_id', ${userId}, TRUE)
    `;
    return await fn(tx);
  });
}

/**
 * Runs `fn` with an invitation token presented as the authorization.
 *
 * Used only by the acceptance flow, where the caller is not yet a member and
 * therefore has no tenant context. The policy in the
 * `invitation_token_access` migration exposes exactly the invitation whose
 * stored hash matches, plus the organization it belongs to.
 *
 * The hash is passed, never the raw token, so the value is inert if it reaches
 * a query log.
 */
export async function withInvitationToken<T>(
  tokenHash: string,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT set_config('app.invitation_token_hash', ${tokenHash}, TRUE)
    `;
    return await fn(tx);
  });
}

/**
 * Runs `fn` inside a tenant context *and* with an invitation token presented.
 *
 * Accepting an invitation needs both: the token authorizes the read, and the
 * tenant context authorizes inserting the membership and the audit entry into
 * the organization the invitation names.
 */
export async function withInvitationAcceptance<T>(
  context: TenantContext,
  tokenHash: string,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT
        set_config('app.current_organization_id', ${context.organizationId}, TRUE),
        set_config('app.current_user_id', ${context.userId}, TRUE),
        set_config('app.invitation_token_hash', ${tokenHash}, TRUE)
    `;
    return await fn(tx);
  });
}
