import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      {children}
    </main>
  );
}
