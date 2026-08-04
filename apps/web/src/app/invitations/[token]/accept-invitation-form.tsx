'use client';

import { useActionState } from 'react';

import { FormError } from '~/components/form-error';
import { SubmitButton } from '~/components/submit-button';
import { acceptInvitationAction } from '~/server/actions/auth';
import { idleFormState, type FormState } from '~/lib/form-state';

interface AcceptInvitationFormProps {
  readonly token: string;
  readonly disabled: boolean;
}

export function AcceptInvitationForm({ token, disabled }: AcceptInvitationFormProps) {
  const [state, formAction] = useActionState<FormState<void>, FormData>(
    acceptInvitationAction,
    idleFormState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <FormError state={state} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton disabled={disabled} pendingLabel="Joining…">
        Accept invitation
      </SubmitButton>
    </form>
  );
}
