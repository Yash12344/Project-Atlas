import type { Metadata } from 'next';

import { CreateOrganizationForm } from './create-organization-form';
import { requireSession } from '~/server/context';

export const metadata: Metadata = { title: 'Create an organization' };

export default async function OnboardingPage() {
  await requireSession('/onboarding');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <CreateOrganizationForm />
    </main>
  );
}
