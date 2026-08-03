import {
  newAuditLogId,
  newMembershipId,
  newOrganizationId,
  newUserId,
  type OrganizationId,
  type UserId,
} from '@atlas/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from './client.js';
import { withTenant } from './tenant.js';

/**
 * These tests exist because row-level security is the only thing standing
 * between two customers' data in a shared-schema database. A unit test that
 * mocks the database would prove nothing about it; every assertion here runs
 * against a real PostgreSQL instance through the same application role the
 * server uses.
 */

interface Fixture {
  organizationId: OrganizationId;
  userId: UserId;
  slug: string;
}

async function createTenant(label: string): Promise<Fixture> {
  const organizationId = newOrganizationId();
  const userId = newUserId();
  const slug = `${label}-${Date.now().toString(36)}`;

  // The user row is not tenant-scoped, so it is written outside tenant context.
  await prisma.user.create({
    data: {
      id: userId,
      email: `${slug}@example.test`,
      name: `${label} owner`,
      passwordHash: 'not-a-real-hash-unused-by-this-test',
    },
  });

  await withTenant({ organizationId, userId }, async (tx) => {
    await tx.organization.create({
      data: { id: organizationId, name: `${label} org`, slug },
    });
    await tx.membership.create({
      data: {
        id: newMembershipId(),
        userId,
        organizationId,
        role: 'OWNER',
      },
    });
  });

  return { organizationId, userId, slug };
}

describe('row-level security', () => {
  let alpha: Fixture;
  let beta: Fixture;

  beforeAll(async () => {
    alpha = await createTenant('alpha');
    beta = await createTenant('beta');
  });

  afterAll(async () => {
    // Cleanup runs on the unrestricted path: users cascade to memberships.
    await prisma.user.deleteMany({ where: { id: { in: [alpha.userId, beta.userId] } } });
    await prisma.$disconnect();
  });

  it('scopes organization reads to the active tenant', async () => {
    const visible = await withTenant(
      { organizationId: alpha.organizationId, userId: alpha.userId },
      async (tx) => await tx.organization.findMany(),
    );

    expect(visible.map((org) => org.id)).toEqual([alpha.organizationId]);
  });

  it('returns nothing for another tenant, even when queried by primary key', async () => {
    const leaked = await withTenant(
      { organizationId: alpha.organizationId, userId: alpha.userId },
      async (tx) => await tx.organization.findUnique({ where: { id: beta.organizationId } }),
    );

    expect(leaked).toBeNull();
  });

  it('blocks a cross-tenant read even when the query omits its tenant filter', async () => {
    // This is the bug the policies exist to contain: a findMany with no
    // `where` clause at all. Application-level filtering would leak here.
    const memberships = await withTenant(
      { organizationId: alpha.organizationId, userId: alpha.userId },
      async (tx) => await tx.membership.findMany(),
    );

    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.organizationId).toBe(alpha.organizationId);
  });

  it('refuses to write a row into another tenant', async () => {
    await expect(
      withTenant({ organizationId: alpha.organizationId, userId: alpha.userId }, async (tx) => {
        await tx.membership.create({
          data: {
            id: newMembershipId(),
            userId: alpha.userId,
            organizationId: beta.organizationId,
            role: 'ADMIN',
          },
        });
      }),
    ).rejects.toThrow();

    // And the write must not have landed.
    const betaMembers = await withTenant(
      { organizationId: beta.organizationId, userId: beta.userId },
      async (tx) => await tx.membership.findMany(),
    );
    expect(betaMembers).toHaveLength(1);
  });

  it('refuses to update another tenant’s organization', async () => {
    const updated = await withTenant(
      { organizationId: alpha.organizationId, userId: alpha.userId },
      async (tx) =>
        await tx.organization.updateMany({
          where: { id: beta.organizationId },
          data: { name: 'renamed by another tenant' },
        }),
    );

    expect(updated.count).toBe(0);
  });

  it('lets a user see their own memberships across tenants', async () => {
    // The self-scope policy: needed at login, before any tenant is chosen.
    const own = await withTenant(
      { organizationId: alpha.organizationId, userId: alpha.userId },
      async (tx) => await tx.membership.findMany({ where: { userId: alpha.userId } }),
    );

    expect(own).toHaveLength(1);
    expect(own[0]?.userId).toBe(alpha.userId);
  });

  it('sees no tenant rows at all without a tenant context', async () => {
    // The unscoped client is what identity flows use. It must not be able to
    // reach tenant tables, which is what makes it safe to hand to login code.
    const organizations = await prisma.organization.findMany();
    const memberships = await prisma.membership.findMany();

    expect(organizations).toHaveLength(0);
    expect(memberships).toHaveLength(0);
  });

  it('keeps the audit trail append-only', async () => {
    // No UPDATE or DELETE policy exists on audit_logs, so those statements
    // match zero rows rather than raising. The property under test is that the
    // row survives, not that the call throws — PostgreSQL reports a filtered
    // DELETE as a success affecting nothing.
    const context = { organizationId: alpha.organizationId, userId: alpha.userId };

    const written = await withTenant(
      context,
      async (tx) =>
        await tx.auditLog.create({
          data: {
            id: newAuditLogId(),
            organizationId: alpha.organizationId,
            actorUserId: alpha.userId,
            action: 'test.append_only',
          },
        }),
    );

    const deleted = await withTenant(
      context,
      async (tx) => await tx.auditLog.deleteMany({ where: { id: written.id } }),
    );
    expect(deleted.count).toBe(0);

    const updated = await withTenant(
      context,
      async (tx) =>
        await tx.auditLog.updateMany({
          where: { id: written.id },
          data: { action: 'tampered' },
        }),
    );
    expect(updated.count).toBe(0);

    const survivor = await withTenant(
      context,
      async (tx) => await tx.auditLog.findUnique({ where: { id: written.id } }),
    );
    expect(survivor?.action).toBe('test.append_only');
  });
});
