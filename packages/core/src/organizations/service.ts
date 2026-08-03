import { withTenant, withUser, type TenantClient } from '@atlas/db';
import { createLogger } from '@atlas/logger';
import {
  ConflictError,
  DEFAULT_PAGE_SIZE,
  NotFoundError,
  organizationNameSchema,
  newMembershipId,
  newOrganizationId,
  parseOrganizationId,
  parseUserId,
  slugSchema,
  toPage,
  ValidationError,
  type OrganizationId,
  type Page,
  type Role,
  type UserId,
} from '@atlas/types';
import { z } from 'zod';

import { recordAuditEvent } from '../audit/service.js';
import { assertPermission, type Actor } from '../shared/actor.js';

const log = createLogger('organizations');

export interface OrganizationSummary {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly role: Role;
}

export interface OrganizationDetail {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: Date;
}

export interface MemberSummary {
  readonly id: string;
  readonly userId: UserId;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly joinedAt: Date;
}

export const createOrganizationInputSchema = z.object({
  name: organizationNameSchema,
  slug: slugSchema,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;

/**
 * Creates an organization and its first membership.
 *
 * Both rows are written in one transaction scoped to the new organization id.
 * That is what the `organizations_tenant_insert` policy requires, and it means
 * an organization without an owner is not a reachable state: either both
 * statements commit or neither does.
 */
export async function createOrganization(
  userId: UserId,
  input: CreateOrganizationInput,
): Promise<OrganizationDetail> {
  const { name, slug } = createOrganizationInputSchema.parse(input);
  const organizationId = newOrganizationId();

  try {
    const organization = await withTenant({ organizationId, userId }, async (tx) => {
      const created = await tx.organization.create({
        data: { id: organizationId, name, slug },
      });

      await tx.membership.create({
        data: {
          id: newMembershipId(),
          userId,
          organizationId,
          role: 'OWNER',
        },
      });

      await recordAuditEvent(tx, {
        organizationId,
        actorUserId: userId,
        action: 'organization.created',
        targetType: 'organization',
        targetId: organizationId,
        metadata: { slug },
      });

      return created;
    });

    log.info({ organizationId, userId }, 'organization created');

    return {
      id: parseOrganizationId(organization.id),
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError('That slug is already taken.');
    }
    throw error;
  }
}

/**
 * Every organization the user belongs to.
 *
 * Runs under `withUser`, which sets only the acting-user GUC. The self-scope
 * policies answer this without granting the caller a tenant context they have
 * not selected.
 */
export async function listUserOrganizations(userId: UserId): Promise<readonly OrganizationSummary[]> {
  const memberships = await withUser(
    userId,
    async (tx) =>
      await tx.membership.findMany({
        where: { userId },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      }),
  );

  return memberships.map((membership) => ({
    id: parseOrganizationId(membership.organization.id),
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
  }));
}

/**
 * Resolves a slug to the membership the user holds in it.
 *
 * Returns null rather than throwing when there is no membership, so callers
 * can render a 404 without distinguishing "no such organization" from "not
 * yours" — the two must be indistinguishable or the slug namespace becomes
 * enumerable.
 */
export async function findMembershipBySlug(
  userId: UserId,
  slug: string,
): Promise<{ organization: OrganizationDetail; role: Role } | null> {
  const membership = await withUser(
    userId,
    async (tx) =>
      await tx.membership.findFirst({
        where: { userId, organization: { slug } },
        include: { organization: true },
      }),
  );

  if (!membership) {
    return null;
  }

  return {
    organization: {
      id: parseOrganizationId(membership.organization.id),
      name: membership.organization.name,
      slug: membership.organization.slug,
      createdAt: membership.organization.createdAt,
    },
    role: membership.role,
  };
}

export const updateOrganizationInputSchema = z.object({
  name: organizationNameSchema,
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInputSchema>;

export async function updateOrganization(
  actor: Actor,
  input: UpdateOrganizationInput,
): Promise<OrganizationDetail> {
  assertPermission(actor, 'organization:update');
  const { name } = updateOrganizationInputSchema.parse(input);

  return await withTenant(actor, async (tx) => {
    const updated = await tx.organization.update({
      where: { id: actor.organizationId },
      data: { name },
    });

    await recordAuditEvent(tx, {
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: 'organization.updated',
      targetType: 'organization',
      targetId: actor.organizationId,
      metadata: { name },
    });

    return {
      id: parseOrganizationId(updated.id),
      name: updated.name,
      slug: updated.slug,
      createdAt: updated.createdAt,
    };
  });
}

export async function listMembers(
  actor: Actor,
  pagination: { limit?: number; cursor?: string } = {},
): Promise<Page<MemberSummary>> {
  assertPermission(actor, 'member:read');
  const limit = pagination.limit ?? DEFAULT_PAGE_SIZE;

  const rows = await withTenant(actor, async (tx) =>
    // One row beyond the page size tells us whether another page exists
    // without a second COUNT query.
    await tx.membership.findMany({
      where: { organizationId: actor.organizationId },
      include: { user: true },
      orderBy: { id: 'asc' },
      take: limit + 1,
      ...(pagination.cursor === undefined
        ? {}
        : { cursor: { id: pagination.cursor }, skip: 1 }),
    }),
  );

  const mapped = rows.map((row) => ({
    id: row.id,
    userId: parseUserId(row.userId),
    name: row.user.name,
    email: row.user.email,
    role: row.role,
    joinedAt: row.createdAt,
  }));

  return toPage(mapped, limit);
}

/**
 * Counts owners inside an open transaction.
 *
 * The "an organization always has an owner" invariant spans rows, so it cannot
 * be a column constraint. Checking it inside the same transaction as the write
 * means a concurrent demotion cannot slip between the check and the update:
 * both transactions touch the same membership rows, so PostgreSQL serialises
 * them and the loser re-reads the updated count.
 */
async function countOwners(tx: TenantClient, organizationId: OrganizationId): Promise<number> {
  return await tx.membership.count({
    where: { organizationId, role: 'OWNER' },
  });
}

export async function updateMemberRole(
  actor: Actor,
  membershipId: string,
  nextRole: Role,
): Promise<void> {
  assertPermission(actor, 'member:update_role');

  await withTenant(actor, async (tx) => {
    const membership = await tx.membership.findUnique({ where: { id: membershipId } });

    if (!membership || membership.organizationId !== actor.organizationId) {
      throw new NotFoundError('Member not found.');
    }

    if (membership.role === nextRole) {
      return;
    }

    if (membership.role === 'OWNER' && (await countOwners(tx, actor.organizationId)) === 1) {
      throw new ValidationError('An organization must keep at least one owner.');
    }

    await tx.membership.update({ where: { id: membershipId }, data: { role: nextRole } });

    await recordAuditEvent(tx, {
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: 'member.role_changed',
      targetType: 'membership',
      targetId: membershipId,
      metadata: { from: membership.role, to: nextRole },
    });
  });

  log.info({ membershipId, nextRole, actorId: actor.userId }, 'member role changed');
}

export async function removeMember(actor: Actor, membershipId: string): Promise<void> {
  assertPermission(actor, 'member:remove');

  await withTenant(actor, async (tx) => {
    const membership = await tx.membership.findUnique({ where: { id: membershipId } });

    if (!membership || membership.organizationId !== actor.organizationId) {
      throw new NotFoundError('Member not found.');
    }

    if (membership.role === 'OWNER' && (await countOwners(tx, actor.organizationId)) === 1) {
      throw new ValidationError('An organization must keep at least one owner.');
    }

    await tx.membership.delete({ where: { id: membershipId } });

    await recordAuditEvent(tx, {
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: 'member.removed',
      targetType: 'membership',
      targetId: membershipId,
      metadata: { removedUserId: membership.userId },
    });
  });

  log.info({ membershipId, actorId: actor.userId }, 'member removed');
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code: unknown = Reflect.get(error, 'code');
  return code === 'P2002' || code === '23505';
}
