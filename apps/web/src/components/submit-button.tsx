'use client';

import { Button, type ButtonProps } from '@atlas/ui';
import { useFormStatus } from 'react-dom';

export interface SubmitButtonProps extends Omit<ButtonProps, 'type' | 'asChild'> {
  readonly pendingLabel?: string;
}

/**
 * A submit button that disables itself while its form is in flight.
 *
 * `useFormStatus` reads the state of the nearest enclosing form, so this
 * cannot fall out of sync the way a manually threaded `isPending` prop does.
 * Preventing the second click is what stops a double-submitted invitation or a
 * duplicate organization.
 */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" disabled={pending || disabled} aria-busy={pending}>
      {pending && pendingLabel !== undefined ? pendingLabel : children}
    </Button>
  );
}
