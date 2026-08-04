'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  fieldControlProps,
  Input,
} from '@atlas/ui';
import { slugify } from '@atlas/types';
import { useActionState, useState } from 'react';

import { FormError, fieldError } from '~/components/form-error';
import { SubmitButton } from '~/components/submit-button';
import { createOrganizationAction } from '~/server/actions/organizations';
import { idleFormState, type FormState } from '~/lib/form-state';

export function CreateOrganizationForm() {
  const [state, formAction] = useActionState<FormState<void>, FormData>(
    createOrganizationAction,
    idleFormState,
  );

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  // The slug follows the name until the user edits it, after which their input
  // wins. Silently overwriting a hand-typed slug is the annoying half of this
  // pattern, so the override is sticky.
  const [slugTouched, setSlugTouched] = useState(false);
  const effectiveSlug = slugTouched ? slug : slugify(name);

  const nameError = fieldError(state, 'name');
  const slugError = fieldError(state, 'slug');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your organization</CardTitle>
        <CardDescription>
          This is the workspace your team will share. You can rename it later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <FormError state={state} />

          <Field id="name" label="Organization name" error={nameError}>
            <Input
              {...fieldControlProps('name', nameError)}
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              autoComplete="organization"
              required
            />
          </Field>

          <Field
            id="slug"
            label="URL slug"
            error={slugError}
            hint={effectiveSlug.length > 0 ? `atlas.dev/${effectiveSlug}` : 'Used in your URLs.'}
          >
            <Input
              {...fieldControlProps(
                'slug',
                slugError,
                effectiveSlug.length > 0 ? `atlas.dev/${effectiveSlug}` : 'Used in your URLs.',
              )}
              name="slug"
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              required
            />
          </Field>

          <SubmitButton className="mt-2 w-full" pendingLabel="Creating…">
            Create organization
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
