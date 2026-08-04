import { listMembers, listPendingInvitations } from '@atlas/core';
import { can } from '@atlas/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@atlas/ui';
import type { Metadata } from 'next';

import { requireOrganization } from '~/server/context';

interface PageProps {
  readonly params: Promise<{ readonly orgSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgSlug } = await params;
  const { organization } = await requireOrganization(orgSlug);
  return { title: organization.name };
}

export default async function OrganizationOverviewPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const { organization, actor } = await requireOrganization(orgSlug);

  const members = await listMembers(actor);
  // Members without the permission simply do not see the tile, rather than
  // seeing it fail — the service would reject the call anyway.
  const invitations = can(actor.role, 'invitation:read') ? await listPendingInvitations(actor) : [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
        <p className="text-sm text-muted-foreground">
          Created {organization.createdAt.toISOString().slice(0, 10)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-3xl">{members.data.length}</CardTitle>
          </CardHeader>
        </Card>

        {can(actor.role, 'invitation:read') ? (
          <Card>
            <CardHeader>
              <CardDescription>Pending invitations</CardDescription>
              <CardTitle className="text-3xl">{invitations.length}</CardTitle>
            </CardHeader>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your access</CardTitle>
          <CardDescription>
            You are a {actor.role.toLowerCase()} of this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Every query on this page runs inside a PostgreSQL row-level security context bound to this
          organization.
        </CardContent>
      </Card>
    </div>
  );
}
