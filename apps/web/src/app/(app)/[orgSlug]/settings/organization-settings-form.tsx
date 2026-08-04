'use client';

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
import { updateOrganizationAction } from '~/server/actions/organizations';
import { idleFormState, type FormState } from '~/lib/form-state';

interface OrganizationSettingsFormProps {
  readonly organizationSlug: string;
  readonly currentName: string;
}

export function OrganizationSettingsForm({
  organizationSlug,
  currentName,
}: OrganizationSettingsFormProps) {
  const [state, formAction] = useActionState<FormState<void>, FormData>(
    updateOrganizationAction,
    idleFormState,
  );

  const nameError = fieldError(state, 'name');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">General</CardTitle>
        <CardDescription>The name your team sees.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid max-w-md gap-4">
          <input type="hidden" name="organizationSlug" value={organizationSlug} />
          <FormError state={state} />

          {state.status === 'success' ? (
            <Alert variant="success">
              <AlertDescription>Settings saved.</AlertDescription>
            </Alert>
          ) : null}

          <Field id="org-name" label="Organization name" error={nameError}>
            <Input
              {...fieldControlProps('org-name', nameError)}
              name="name"
              defaultValue={currentName}
              required
            />
          </Field>

          <SubmitButton className="w-fit" pendingLabel="Saving…">
            Save changes
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
