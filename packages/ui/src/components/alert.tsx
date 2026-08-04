import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../lib/cn';

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      info: 'bg-card text-card-foreground',
      destructive: 'border-destructive/40 text-destructive bg-destructive/5',
      success: 'border-success/40 text-success bg-success/5',
    },
  },
  defaultVariants: { variant: 'info' },
});

export interface AlertProps extends ComponentProps<'div'>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      // `role="alert"` makes screen readers announce the message when it
      // appears, which is the entire point of surfacing an error this way.
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<'h5'>) {
  return <h5 data-slot="alert-title" className={cn('mb-1 font-medium', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="alert-description" className={cn('text-sm opacity-90', className)} {...props} />
  );
}
