import { listUserOrganizations } from '@atlas/core';
import { Badge, Button, Card, CardHeader, CardTitle } from '@atlas/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireSession } from '~/server/context';

export const metadata: Metadata = { title: 'Your organizations' };

export default async function OrganizationsPage() {
  const session = await requireSession('/organizations');
  const organizations = await listUserOrganizations(session.user.id);

  // Nothing to choose between yet — send them to create their first one.
  if (organizations.length === 0) {
    redirect('/onboarding');
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your organizations</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/onboarding">New organization</Link>
        </Button>
      </div>

      <div className="grid gap-3">
        {organizations.map((organization) => (
          <Card key={organization.id}>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <div className="grid gap-1">
                <CardTitle className="text-base">
                  <Link href={`/${organization.slug}`} className="hover:underline">
                    {organization.name}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">/{organization.slug}</p>
              </div>
              <Badge variant="outline">{organization.role.toLowerCase()}</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  );
}
