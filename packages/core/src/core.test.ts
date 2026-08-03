import { prisma, withTenant } from '@atlas/db';
import { closeTestConnections, resetDatabase } from '@atlas/db/testing';
import { can, ForbiddenError, NotFoundError } from '@atlas/types';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { recordAuditEvent } from './audit/service.js';
import { authenticate, registerUser } from './identity/service.js';
import { hashPassword, needsRehash, verifyPassword } from './identity/password.js';
import { generateToken, hashToken } from './identity/tokens.js';
import {
  acceptInvitation,
  createInvitation,
  findPendingInvitationByToken,
  listPendingInvitations,
  revokeInvitation,
} from './invitations/service.js';
import {
  createOrganization,
  findMembershipBySlug,
  listMembers,
  listUserOrganizations,
  removeMember,
  updateMemberRole,
} from './organizations/service.js';
import type { Actor } from './shared/actor.js';

const PASSWORD = 'correct horse battery staple';

let unique = 0;
function uniqueSuffix(): string {
  unique += 1;
  return `${Date.now().toString(36)}${String(unique)}`;
}

async function makeUser(label: string): Promise<{ id: UserId; email: string }> {
  const email = `${label}-${uniqueSuffix()}@example.test`;
  const user = await registerUser({ name: `${label} person`, email, password: PASSWORD });
  return { id: user.id, email: user.email };
}

async function makeOrgWithOwner(): Promise<{ actor: Actor; ownerEmail: string; slug: string }> {
  const owner = await makeUser('owner');
  const slug = `acme-${uniqueSuffix()}`;
  const organization = await createOrganization(owner.id, { name: 'Acme Inc', slug });

  return {
    actor: { userId: owner.id, organizationId: organization.id, role: 'OWNER' },
    ownerEmail: owner.email,
    slug,
  };
}

afterAll(async () => {
  await resetDatabase();
  await closeTestConnections();
});

describe('password hashing', () => {
  it('round-trips and rejects the wrong password', async () => {
    const digest = await hashPassword(PASSWORD);

    expect(await verifyPassword(digest, PASSWORD)).toBe(true);
    expect(await verifyPassword(digest, 'not the password')).toBe(false);
  });

  it('uses argon2id with the configured cost', async () => {
    // Pins the security parameters to the encoded output, so a change to the
    // options is a deliberate edit to this assertion rather than a silent
    // downgrade.
    const digest = await hashPassword(PASSWORD);
    expect(digest.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true);
  });

  it('flags hashes weaker than current policy for rehash', () => {
    expect(needsRehash('$argon2id$v=19$m=4096,t=1,p=1$abc$def')).toBe(true);
    expect(needsRehash('$argon2id$v=19$m=19456,t=2,p=1$abc$def')).toBe(false);
    expect(needsRehash('not-a-hash')).toBe(true);
  });

  it('never stores the plaintext', async () => {
    const user = await makeUser('storage');
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(row.passwordHash).not.toContain(PASSWORD);
    expect(row.passwordHash.startsWith('$argon2id$')).toBe(true);
  });
});

describe('authentication', () => {
  it('accepts correct credentials and rejects wrong ones', async () => {
    const user = await makeUser('login');

    await expect(authenticate({ email: user.email, password: PASSWORD })).resolves.toMatchObject({
      id: user.id,
    });
    await expect(authenticate({ email: user.email, password: 'wrong' })).rejects.toThrow();
  });

  it('rejects an unknown account without revealing that it is unknown', async () => {
    await expect(
      authenticate({ email: 'nobody@example.test', password: PASSWORD }),
    ).rejects.toThrow(/Incorrect email or password/);
  });

  it('normalises email case so one address is one account', async () => {
    const user = await makeUser('Casing');

    await expect(
      authenticate({ email: user.email.toUpperCase(), password: PASSWORD }),
    ).resolves.toMatchObject({ id: user.id });
  });

  it('refuses a duplicate registration', async () => {
    const user = await makeUser('dupe');
    await expect(
      registerUser({ name: 'Impostor', email: user.email, password: PASSWORD }),
    ).rejects.toThrow(/already exists/);
  });

  it('rejects a password below the minimum length', async () => {
    await expect(
      registerUser({ name: 'Short', email: `short-${uniqueSuffix()}@example.test`, password: 'tiny' }),
    ).rejects.toThrow();
  });
});

describe('token handling', () => {
  it('stores only the hash of an invitation token', async () => {
    const { actor } = await makeOrgWithOwner();
    const invitee = `invitee-${uniqueSuffix()}@example.test`;

    const issued = await createInvitation(actor, { email: invitee, role: 'MEMBER' });
    const token = issued.acceptUrl.split('/').at(-1) ?? '';

    // Read through a tenant context: the unscoped client cannot see tenant
    // tables at all, which is the property asserted in packages/db.
    const row = await withTenant(
      actor,
      async (tx) => await tx.invitation.findUniqueOrThrow({ where: { id: issued.invitation.id } }),
    );

    expect(token).not.toHaveLength(0);
    expect(row.tokenHash).toBe(hashToken(token));
    expect(row.tokenHash).not.toBe(token);
  });

  it('generates distinct, high-entropy tokens', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateToken()));
    expect(tokens.size).toBe(500);
  });
});

describe('organizations', () => {
  it('creates an organization with the creator as owner', async () => {
    const { actor, slug } = await makeOrgWithOwner();

    const organizations = await listUserOrganizations(actor.userId);
    expect(organizations).toHaveLength(1);
    expect(organizations[0]).toMatchObject({ slug, role: 'OWNER' });
  });

  it('rejects a duplicate slug', async () => {
    const { slug } = await makeOrgWithOwner();
    const other = await makeUser('other');

    await expect(
      createOrganization(other.id, { name: 'Copycat', slug }),
    ).rejects.toThrow(/already taken/);
  });

  it('rejects a reserved slug', async () => {
    const user = await makeUser('reserved');
    await expect(createOrganization(user.id, { name: 'Admin', slug: 'admin' })).rejects.toThrow();
  });

  it('does not resolve a slug for a non-member', async () => {
    const { slug } = await makeOrgWithOwner();
    const outsider = await makeUser('outsider');

    expect(await findMembershipBySlug(outsider.id, slug)).toBeNull();
  });

  it('keeps at least one owner', async () => {
    const { actor } = await makeOrgWithOwner();
    const members = await listMembers(actor);
    const ownerMembership = members.data[0];

    expect(ownerMembership).toBeDefined();
    await expect(
      updateMemberRole(actor, ownerMembership?.id ?? '', 'MEMBER'),
    ).rejects.toThrow(/at least one owner/);

    await expect(removeMember(actor, ownerMembership?.id ?? '')).rejects.toThrow(
      /at least one owner/,
    );
  });
});

describe('authorization', () => {
  it('maps roles to permissions', () => {
    expect(can('OWNER', 'member:update_role')).toBe(true);
    expect(can('ADMIN', 'member:update_role')).toBe(false);
    expect(can('ADMIN', 'member:invite')).toBe(true);
    expect(can('MEMBER', 'member:invite')).toBe(false);
    expect(can('MEMBER', 'organization:read')).toBe(true);
  });

  it('stops a member from inviting', async () => {
    const { actor } = await makeOrgWithOwner();
    const memberActor: Actor = { ...actor, role: 'MEMBER' };

    await expect(
      createInvitation(memberActor, { email: 'x@example.test', role: 'MEMBER' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('stops an admin from inviting an owner', async () => {
    const { actor } = await makeOrgWithOwner();
    const adminActor: Actor = { ...actor, role: 'ADMIN' };

    await expect(
      createInvitation(adminActor, { email: `esc-${uniqueSuffix()}@example.test`, role: 'OWNER' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('invitations', () => {
  let context: Awaited<ReturnType<typeof makeOrgWithOwner>>;

  beforeEach(async () => {
    context = await makeOrgWithOwner();
  });

  async function invite(email: string): Promise<string> {
    const issued = await createInvitation(context.actor, { email, role: 'MEMBER' });
    return issued.acceptUrl.split('/').at(-1) ?? '';
  }

  it('is redeemable by the invited address and grants membership', async () => {
    const invitee = await makeUser('joiner');
    const token = await invite(invitee.email);

    const pending = await findPendingInvitationByToken(token);
    expect(pending?.email).toBe(invitee.email);

    const result = await acceptInvitation(invitee.id, invitee.email, token);
    expect(result.organizationId).toBe(context.actor.organizationId);

    const organizations = await listUserOrganizations(invitee.id);
    expect(organizations.map((org) => org.role)).toEqual(['MEMBER']);
  });

  it('cannot be redeemed by a different address', async () => {
    const invitee = await makeUser('intended');
    const interloper = await makeUser('interloper');
    const token = await invite(invitee.email);

    await expect(
      acceptInvitation(interloper.id, interloper.email, token),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('cannot be redeemed twice', async () => {
    const invitee = await makeUser('twice');
    const token = await invite(invitee.email);

    await acceptInvitation(invitee.id, invitee.email, token);
    await expect(acceptInvitation(invitee.id, invitee.email, token)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('cannot be redeemed after revocation', async () => {
    const invitee = await makeUser('revoked');
    const token = await invite(invitee.email);
    const [pending] = await listPendingInvitations(context.actor);

    await revokeInvitation(context.actor, pending?.id ?? '');

    expect(await findPendingInvitationByToken(token)).toBeNull();
    await expect(acceptInvitation(invitee.id, invitee.email, token)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rejects an unknown token', async () => {
    expect(await findPendingInvitationByToken(generateToken())).toBeNull();
  });

  it('refuses to invite an existing member', async () => {
    await expect(
      createInvitation(context.actor, { email: context.ownerEmail, role: 'MEMBER' }),
    ).rejects.toThrow(/already a member/);
  });
});

describe('audit trail', () => {
  it('records organization creation and membership changes', async () => {
    const { actor } = await makeOrgWithOwner();
    const invitee = await makeUser('audited');

    const issued = await createInvitation(actor, { email: invitee.email, role: 'MEMBER' });
    const token = issued.acceptUrl.split('/').at(-1) ?? '';
    await acceptInvitation(invitee.id, invitee.email, token);

    const events = await withTenant(
      actor,
      async (tx) =>
        await tx.auditLog.findMany({
          where: { organizationId: actor.organizationId },
          orderBy: { createdAt: 'asc' },
        }),
    );

    expect(events.map((event) => event.action)).toEqual([
      'organization.created',
      'member.invited',
      'member.joined',
    ]);
  });

  it('rolls the audit entry back with the change it describes', async () => {
    // The entry is written in the caller's transaction, so a failure after it
    // must leave no trace. Without that, the trail records things that never
    // happened.
    const { actor } = await makeOrgWithOwner();
    const before = await withTenant(
      actor,
      async (tx) => await tx.auditLog.count({ where: { organizationId: actor.organizationId } }),
    );

    await expect(
      (async () => {
        await withTenant(actor, async (tx) => {
          await recordAuditEvent(tx, {
            organizationId: actor.organizationId,
            actorUserId: actor.userId,
            action: 'organization.updated',
          });
          throw new Error('deliberate failure after the audit write');
        });
      })(),
    ).rejects.toThrow(/deliberate failure/);

    const after = await withTenant(
      actor,
      async (tx) => await tx.auditLog.count({ where: { organizationId: actor.organizationId } }),
    );
    expect(after).toBe(before);
  });
});
