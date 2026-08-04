import { Alert, AlertDescription } from '@atlas/ui';

import type { FormState } from '~/lib/form-state';

// Re-exported so a component that renders form errors imports one module.
export { fieldError } from '~/lib/form-state';

/**
 * Renders the form-level message of a failed action.
 *
 * Field-level messages belong next to their input; this is only for errors
 * that do not attach to one, such as "Incorrect email or password".
 */
export function FormError<T>({ state }: { readonly state: FormState<T> }) {
  if (state.status !== 'error') {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
