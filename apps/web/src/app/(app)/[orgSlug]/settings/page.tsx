import { can } from '@atlas/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@atlas/ui';
import type { Metadata } from 'next';

import { OrganizationSettingsForm } from './organization-settings-form';
import { requireOrganization } from '~/server/context';

export const metadata: Metadata = { title: 'Settings' };

interface PageProps {
  readonly params: Promise<{ readonly orgSlug: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const { organization, actor } = await requireOrganization(orgSlug);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization configuration.</p>
      </div>

      {can(actor.role, 'organization:update') ? (
        <OrganizationSettingsForm organizationSlug={orgSlug} currentName={organization.name} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{organization.name}</CardTitle>
            <CardDescription>
              Only owners and admins can change organization settings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identifiers</CardTitle>
          <CardDescription>Useful when contacting support.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Organization ID</span>
            <code className="text-xs">{organization.id}</code>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Slug</span>
            <code className="text-xs">{organization.slug}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
