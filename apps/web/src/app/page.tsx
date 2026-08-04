import { Button } from '@atlas/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSession } from '~/server/session';

/**
 * The root route is a router, not a landing page: a signed-in user should
 * never see a marketing splash when they open the app.
 */
export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect(session.session.activeOrganizationId === null ? '/organizations' : '/organizations');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Atlas</h1>
        <p className="text-lg text-muted-foreground">Multi-tenant infrastructure for teams.</p>
      </div>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Create an account</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
