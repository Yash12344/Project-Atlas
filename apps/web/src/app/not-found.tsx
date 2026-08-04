import { Button } from '@atlas/ui';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
        <p className="text-sm text-muted-foreground">
          That page does not exist, or you do not have access to it.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/organizations">Back to your organizations</Link>
      </Button>
    </main>
  );
}
