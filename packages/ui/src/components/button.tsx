import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../lib/cn';

const buttonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-sm font-medium transition-colors outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3',
        md: 'h-9 px-4 py-2',
        lg: 'h-10 px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Renders the child element instead of a `button`, keeping the styling. */
  asChild?: boolean;
}

/**
 * React 19 passes `ref` as an ordinary prop, so `forwardRef` is no longer
 * needed to expose the underlying element.
 */
export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      data-slot="button"
      // A button inside a form defaults to `submit`, which silently submits
      // when the author meant an inert control. Defaulting to `button` makes
      // submission opt-in.
      {...(asChild ? {} : { type: type ?? 'button' })}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
