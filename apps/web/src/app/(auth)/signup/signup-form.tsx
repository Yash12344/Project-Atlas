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
import { useActionState } from 'react';

import { FormError, fieldError } from '~/components/form-error';
import { SubmitButton } from '~/components/submit-button';
import { signupAction } from '~/server/actions/auth';
import { idleFormState, type FormState } from '~/lib/form-state';

export function SignupForm() {
  const [state, formAction] = useActionState<FormState<void>, FormData>(
    signupAction,
    idleFormState,
  );

  const nameError = fieldError(state, 'name');
  const emailError = fieldError(state, 'email');
  const passwordError = fieldError(state, 'password');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your Atlas account</CardTitle>
        <CardDescription>You will set up an organization next.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <FormError state={state} />

          <Field id="name" label="Full name" error={nameError}>
            <Input
              {...fieldControlProps('name', nameError)}
              name="name"
              autoComplete="name"
              required
            />
          </Field>

          <Field id="email" label="Email" error={emailError}>
            <Input
              {...fieldControlProps('email', emailError)}
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>

          <Field
            id="password"
            label="Password"
            error={passwordError}
            hint="At least 12 characters."
          >
            <Input
              {...fieldControlProps('password', passwordError, 'At least 12 characters.')}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>

          <SubmitButton className="mt-2 w-full" pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
