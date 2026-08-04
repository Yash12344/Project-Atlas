import type { ComponentProps } from 'react';

import { cn } from '../lib/cn';

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs',
        'transition-colors outline-none md:text-sm',
        'placeholder:text-muted-foreground',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Invalid state is driven by aria-invalid so the visual and the
        // assistive-technology signal cannot drift apart.
        'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
        className,
      )}
      {...props}
    />
  );
}
