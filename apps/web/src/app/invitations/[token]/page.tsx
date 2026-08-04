import { findPendingInvitationByToken } from '@atlas/core';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@atlas/ui';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AcceptInvitationForm } from './accept-invitation-form';
import { getSession } from '~/server/session';

export const metadata: Metadata = { title: 'Invitation' };

interface PageProps {
  readonly params: Promise<{ readonly token: string }>;
}

/**
 * The invitation landing page.
 *
 * Reachable without a session — the whole point is that the recipient may not
 * have an account yet. The token in the URL is what authorizes reading the
 * invitation; see the `invitation_token_access` migration.
 */
export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;
  const invitation = await findPendingInvitationByToken(token);

  if (!invitation) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">This invitation is not valid</CardTitle>
            <CardDescription>
              It may have expired, been revoked, or already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const session = await getSession();
  const signedInAsWrongUser = session !== null && session.user.email !== invitation.email;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Join {invitation.organizationName}</CardTitle>
          <CardDescription>
            You were invited as {invitation.role.toLowerCase()}, at {invitation.email}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {signedInAsWrongUser ? (
            <Alert variant="destructive">
              <AlertDescription>
                You are signed in as {session.user.email}. Sign out and sign in as{' '}
                {invitation.email} to accept.
              </AlertDescription>
            </Alert>
          ) : null}

          {session === null ? (
            <>
              <p className="text-sm text-muted-foreground">
                Sign in or create an account with {invitation.email} to accept.
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/signup?next=${encodeURIComponent(`/invitations/${token}`)}`}>
                    Create account
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/login?next=${encodeURIComponent(`/invitations/${token}`)}`}>
                    Sign in
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <AcceptInvitationForm token={token} disabled={signedInAsWrongUser} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
