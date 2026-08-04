import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LoginForm } from './login-form';
import { getSession } from '~/server/session';

export const metadata: Metadata = { title: 'Sign in' };

interface LoginPageProps {
  readonly searchParams: Promise<{ readonly next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getSession()) {
    redirect('/organizations');
  }

  const { next } = await searchParams;

  return (
    <>
      <LoginForm nextPath={next} />
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/signup" className="text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>
    </>
  );
}
