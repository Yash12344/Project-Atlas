import { listUserOrganizations } from '@atlas/core';
import type { ReactNode } from 'react';

import { OrganizationNav } from './organization-nav';
import { requireOrganization } from '~/server/context';

interface OrganizationLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly orgSlug: string }>;
}

/**
 * The tenant shell.
 *
 * Membership is verified here, once, for every route beneath it. A page under
 * this layout can assume the user belongs to the organization in the URL —
 * and, because `requireOrganization` reads the role fresh, that assumption
 * cannot be stale.
 */
export default async function OrganizationLayout({ children, params }: OrganizationLayoutProps) {
  const { orgSlug } = await params;
  const { organization, actor, session } = await requireOrganization(orgSlug);
  const organizations = await listUserOrganizations(session.user.id);

  return (
    <div className="min-h-dvh">
      <OrganizationNav
        organization={{ name: organization.name, slug: organization.slug }}
        organizations={organizations.map((item) => ({ name: item.name, slug: item.slug }))}
        user={{ name: session.user.name, email: session.user.email }}
        role={actor.role}
      />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
