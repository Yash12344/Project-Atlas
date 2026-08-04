'use client';

import { can, ROLES, type Role } from '@atlas/types';
import { useActionState } from 'react';

import { SubmitButton } from '~/components/submit-button';
import { removeMemberAction, updateMemberRoleAction } from '~/server/actions/organizations';
import { idleFormState, type FormState } from '~/lib/form-state';

interface MemberActionsProps {
  readonly organizationSlug: string;
  readonly membershipId: string;
  readonly memberRole: Role;
  readonly actorRole: Role;
  readonly isSelf: boolean;
}

export function MemberActions({
  organizationSlug,
  membershipId,
  memberRole,
  actorRole,
  isSelf,
}: MemberActionsProps) {
  const [roleState, roleAction] = useActionState<FormState<void>, FormData>(
    updateMemberRoleAction,
    idleFormState,
  );
  const [removeState, removeAction] = useActionState<FormState<void>, FormData>(
    removeMemberAction,
    idleFormState,
  );

  const canChangeRole = can(actorRole, 'member:update_role');
  const canRemove = can(actorRole, 'member:remove');
  const error =
    roleState.status === 'error'
      ? roleState.message
      : removeState.status === 'error'
        ? removeState.message
        : undefined;

  return (
    <div className="flex items-center justify-end gap-2">
      {error === undefined ? null : (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}

      {canChangeRole ? (
        <form action={roleAction} className="flex items-center gap-1">
          <input type="hidden" name="organizationSlug" value={organizationSlug} />
          <input type="hidden" name="membershipId" value={membershipId} />
          <label className="sr-only" htmlFor={`role-${membershipId}`}>
            Role
          </label>
          <select
            id={`role-${membershipId}`}
            name="role"
            defaultValue={memberRole}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0) + role.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">
            Save
          </SubmitButton>
        </form>
      ) : null}

      {canRemove && !isSelf ? (
        <form action={removeAction}>
          <input type="hidden" name="organizationSlug" value={organizationSlug} />
          <input type="hidden" name="membershipId" value={membershipId} />
          <SubmitButton variant="ghost" size="sm" pendingLabel="Removing…">
            Remove
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
