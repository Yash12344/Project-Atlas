import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignupForm } from './signup-form';
import { getSession } from '~/server/session';

export const metadata: Metadata = { title: 'Create an account' };

export default async function SignupPage() {
  if (await getSession()) {
    redirect('/organizations');
  }

  return (
    <>
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
