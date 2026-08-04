'use client';

import { useActionState } from 'react';

import { SubmitButton } from '~/components/submit-button';
import { revokeInvitationAction } from '~/server/actions/organizations';
import { idleFormState, type FormState } from '~/lib/form-state';

interface RevokeInvitationButtonProps {
  readonly organizationSlug: string;
  readonly invitationId: string;
}

export function RevokeInvitationButton({
  organizationSlug,
  invitationId,
}: RevokeInvitationButtonProps) {
  const [state, formAction] = useActionState<FormState<void>, FormData>(
    revokeInvitationAction,
    idleFormState,
  );

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="invitationId" value={invitationId} />
      {state.status === 'error' ? (
        <span className="text-xs text-destructive" role="alert">
          {state.message}
        </span>
      ) : null}
      <SubmitButton variant="ghost" size="sm" pendingLabel="Revoking…">
        Revoke
      </SubmitButton>
    </form>
  );
}
