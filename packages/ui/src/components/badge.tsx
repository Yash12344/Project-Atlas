import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../lib/cn';

const badgeVariants = cva(
  'inline-flex w-fit items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-secondary text-secondary-foreground border-transparent',
        outline: 'text-foreground',
        primary: 'bg-primary text-primary-foreground border-transparent',
        destructive: 'bg-destructive text-destructive-foreground border-transparent',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
