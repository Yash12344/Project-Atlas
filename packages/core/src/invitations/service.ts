import { withInvitationAcceptance, withInvitationToken, withTenant } from '@atlas/db';
import { serverEnv } from '@atlas/env/server';
import { createLogger } from '@atlas/logger';
import {
  ConflictError,
  emailSchema,
  ForbiddenError,
  newInvitationId,
  newMembershipId,
  NotFoundError,
  parseOrganizationId,
  ROLES,
  type OrganizationId,
  type Role,
  type UserId,
} from '@atlas/types';
import { z } from 'zod';

import { recordAuditEvent } from '../audit/service';
import { hashToken, generateToken } from '../identity/tokens';
import { assertPermission, type Actor } from '../shared/actor';

const log = createLogger('invitations');

export interface InvitationSummary {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

export interface PendingInvitation {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly organizationId: OrganizationId;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly expiresAt: Date;
}

export interface IssuedInvitation {
  readonly invitation: InvitationSummary;
  /**
   * The acceptance URL, returned once at creation.
   *
   * Atlas does not yet send transactional email, so the inviter shares this
   * link themselves. Only the token's hash is stored, which means this value
   * cannot be recovered afterwards — re-inviting issues a new link. When email
   * delivery lands, this becomes the payload of the message rather than a
   * return value.
   */
  readonly acceptUrl: string;
}

export const createInvitationInputSchema = z.object({
  email: emailSchema,
  role: z.enum(ROLES),
});
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

export async function createInvitation(
  actor: Actor,
  input: CreateInvitationInput,
): Promise<IssuedInvitation> {
  assertPermission(actor, 'member:invite');
  const { email, role } = createInvitationInputSchema.parse(input);

  // Only an owner may create another owner; otherwise an admin could escalate
  // by inviting an owner account they control.
  if (role === 'OWNER' && actor.role !== 'OWNER') {
    throw new ForbiddenError('Only an owner can invite another owner.');
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + serverEnv.INVITATION_TTL_HOURS * 60 * 60 * 1000);

  try {
    const invitation = await withTenant(actor, async (tx) => {
      const existingMember = await tx.membership.findFirst({
        where: { organizationId: actor.organizationId, user: { email } },
      });

      if (existingMember) {
        throw new ConflictError('That person is already a member of this organization.');
      }

      const created = await tx.invitation.create({
        data: {
          id: newInvitationId(),
          organizationId: actor.organizationId,
          email,
          role,
          tokenHash: hashToken(token),
          invitedByUserId: actor.userId,
          expiresAt,
        },
      });

      await recordAuditEvent(tx, {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: 'member.invited',
        targetType: 'invitation',
        targetId: created.id,
        metadata: { email, role },
      });

      return created;
    });

    log.info(
      { invitationId: invitation.id, organizationId: actor.organizationId },
      'invitation created',
    );

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      acceptUrl: new URL(`/invitations/${token}`, serverEnv.APP_URL).toString(),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError('An invitation for that email is already pending.');
    }
    throw error;
  }
}

export async function listPendingInvitations(actor: Actor): Promise<readonly InvitationSummary[]> {
  assertPermission(actor, 'invitation:read');

  const rows = await withTenant(
    actor,
    async (tx) =>
      await tx.invitation.findMany({
        where: {
          organizationId: actor.organizationId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }));
}

export async function revokeInvitation(actor: Actor, invitationId: string): Promise<void> {
  assertPermission(actor, 'invitation:revoke');

  await withTenant(actor, async (tx) => {
    const result = await tx.invitation.updateMany({
      where: {
        id: invitationId,
        organizationId: actor.organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundError('Invitation not found.');
    }

    await recordAuditEvent(tx, {
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: 'member.invitation_revoked',
      targetType: 'invitation',
      targetId: invitationId,
    });
  });

  log.info({ invitationId, actorId: actor.userId }, 'invitation revoked');
}

/**
 * Resolves a raw token to the invitation it names, for the acceptance screen.
 *
 * Runs with no tenant context: the recipient is not a member yet. The token's
 * hash is presented to the database, which exposes exactly the matching row.
 */
export async function findPendingInvitationByToken(
  token: string,
): Promise<PendingInvitation | null> {
  const tokenHash = hashToken(token);

  const invitation = await withInvitationToken(
    tokenHash,
    async (tx) =>
      await tx.invitation.findUnique({
        where: { tokenHash },
        include: { organization: true },
      }),
  );

  if (!invitation || !isRedeemable(invitation)) {
    return null;
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organizationId: parseOrganizationId(invitation.organizationId),
    organizationName: invitation.organization.name,
    organizationSlug: invitation.organization.slug,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Redeems an invitation for an authenticated user.
 *
 * The invitation is bound to the email it was addressed to. Without that
 * check, anyone who obtained the link — a forwarded email, a shared screen —
 * could join the organization.
 */
export async function acceptInvitation(
  userId: UserId,
  userEmail: string,
  token: string,
): Promise<{ organizationId: OrganizationId; organizationSlug: string }> {
  const tokenHash = hashToken(token);

  const invitation = await withInvitationToken(
    tokenHash,
    async (tx) =>
      await tx.invitation.findUnique({
        where: { tokenHash },
        include: { organization: true },
      }),
  );

  if (!invitation || !isRedeemable(invitation)) {
    throw new NotFoundError('This invitation is no longer valid.');
  }

  if (invitation.email !== userEmail.toLowerCase()) {
    throw new ForbiddenError('This invitation was sent to a different email address.');
  }

  const organizationId = parseOrganizationId(invitation.organizationId);

  await withInvitationAcceptance({ organizationId, userId }, tokenHash, async (tx) => {
    // Re-read inside the transaction: between the lookup above and here, the
    // invitation could have been revoked or redeemed by a concurrent request.
    const current = await tx.invitation.findUnique({ where: { tokenHash } });
    if (!current || !isRedeemable(current)) {
      throw new NotFoundError('This invitation is no longer valid.');
    }

    const existing = await tx.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    if (existing) {
      // Already a member — consume the invitation so the link stops working,
      // and leave the existing role alone rather than silently changing it.
      await tx.invitation.update({
        where: { id: current.id },
        data: { acceptedAt: new Date() },
      });
      return;
    }

    await tx.membership.create({
      data: {
        id: newMembershipId(),
        userId,
        organizationId,
        role: current.role,
      },
    });

    await tx.invitation.update({
      where: { id: current.id },
      data: { acceptedAt: new Date() },
    });

    await recordAuditEvent(tx, {
      organizationId,
      actorUserId: userId,
      action: 'member.joined',
      targetType: 'invitation',
      targetId: current.id,
      metadata: { role: current.role },
    });
  });

  log.info({ userId, organizationId }, 'invitation accepted');

  return { organizationId, organizationSlug: invitation.organization.slug };
}

function isRedeemable(invitation: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): boolean {
  return (
    invitation.acceptedAt === null &&
    invitation.revokedAt === null &&
    invitation.expiresAt > new Date()
  );
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code: unknown = Reflect.get(error, 'code');
  return code === 'P2002' || code === '23505';
}
