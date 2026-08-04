import { createOrganization, listUserOrganizations } from '@atlas/core';
import { organizationNameSchema, slugSchema } from '@atlas/types';
import { z } from 'zod';

import { jsonResponse, parseJsonBody, withApiHandler } from '~/server/api/handler';
import { requireSessionOrThrow } from '~/server/context';

const createOrganizationBody = z.object({
  name: organizationNameSchema,
  slug: slugSchema,
});

/** GET /api/v1/organizations — organizations the caller belongs to. */
export const GET = withApiHandler('v1.organizations.list', async () => {
  const { user } = await requireSessionOrThrow();
  const organizations = await listUserOrganizations(user.id);

  return jsonResponse({
    data: organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: organization.role,
    })),
  });
});

/** POST /api/v1/organizations */
export const POST = withApiHandler('v1.organizations.create', async (request) => {
  const { user } = await requireSessionOrThrow();
  const body = await parseJsonBody(request, createOrganizationBody);

  const organization = await createOrganization(user.id, body);

  return jsonResponse(
    {
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt.toISOString(),
      },
    },
    201,
  );
});
