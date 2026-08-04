'use client';

import { ROLES, type Role } from '@atlas/types';
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  fieldControlProps,
  Input,
} from '@atlas/ui';
import { useActionState } from 'react';

import { FormError, fieldError } from '~/components/form-error';
import { SubmitButton } from '~/components/submit-button';
import { inviteMemberAction, type InvitationCreated } from '~/server/actions/organizations';
import { idleFormState, type FormState } from '~/lib/form-state';

interface InviteMemberFormProps {
  readonly organizationSlug: string;
  readonly actorRole: Role;
}

export function InviteMemberForm({ organizationSlug, actorRole }: InviteMemberFormProps) {
  const [state, formAction] = useActionState<FormState<InvitationCreated>, FormData>(
    inviteMemberAction,
    idleFormState,
  );

  // Only an owner may invite another owner; the server enforces this too, and
  // hiding the option keeps the UI from offering an action it will reject.
  const assignableRoles = ROLES.filter((role) => role !== 'OWNER' || actorRole === 'OWNER');

  const emailError = fieldError(state, 'email');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite someone</CardTitle>
        <CardDescription>
          Atlas does not send email yet, so copy the link and share it yourself.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="organizationSlug" value={organizationSlug} />

          <Field id="invite-email" label="Email" error={emailError} className="flex-1">
            <Input
              {...fieldControlProps('invite-email', emailError)}
              name="email"
              type="email"
              placeholder="teammate@example.com"
              required
            />
          </Field>

          <Field id="invite-role" label="Role" className="sm:w-40">
            {/*
              A native select rather than the Radix one: this form posts as
              plain FormData, and the native control submits its value without
              needing a controlled component or a hidden mirror input.
            */}
            <select
              id="invite-role"
              name="role"
              defaultValue="MEMBER"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0) + role.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Field>

          <SubmitButton pendingLabel="Inviting…">Send invite</SubmitButton>
        </form>

        <FormError state={state} />

        {state.status === 'success' ? (
          <Alert variant="success">
            <AlertDescription className="grid gap-2">
              <span>Invitation created for {state.data.email}. Share this link:</span>
              <code className="block overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
                {state.data.acceptUrl}
              </code>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
