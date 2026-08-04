import { createInvitation, listMembers } from '@atlas/core';
import { emailSchema, paginationSchema, ROLES } from '@atlas/types';
import { z } from 'zod';

import {
  jsonResponse,
  parseJsonBody,
  parseSearchParams,
  withApiHandler,
} from '~/server/api/handler';
import { requireOrganizationOrThrow } from '~/server/context';

interface RouteContext {
  readonly params: Promise<{ readonly slug: string }>;
}

const inviteBody = z.object({
  email: emailSchema,
  role: z.enum(ROLES),
});

/** GET /api/v1/organizations/{slug}/members */
export const GET = withApiHandler<RouteContext>('v1.members.list', async (request, context) => {
  const { slug } = await context.params;
  const { actor } = await requireOrganizationOrThrow(slug);

  const pagination = parseSearchParams(request, paginationSchema);
  const page = await listMembers(actor, pagination);

  return jsonResponse({
    data: page.data.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    })),
    pagination: { nextCursor: page.nextCursor, hasMore: page.hasMore },
  });
});

/** POST /api/v1/organizations/{slug}/members — invite someone. */
export const POST = withApiHandler<RouteContext>('v1.members.invite', async (request, context) => {
  const { slug } = await context.params;
  const { actor } = await requireOrganizationOrThrow(slug);

  const body = await parseJsonBody(request, inviteBody);
  const issued = await createInvitation(actor, body);

  return jsonResponse(
    {
      data: {
        id: issued.invitation.id,
        email: issued.invitation.email,
        role: issued.invitation.role,
        expiresAt: issued.invitation.expiresAt.toISOString(),
        // Returned once. Atlas does not send email yet, so the caller is
        // responsible for delivering this link.
        acceptUrl: issued.acceptUrl,
      },
    },
    201,
  );
});
