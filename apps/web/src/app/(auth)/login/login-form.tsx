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
import { loginAction } from '~/server/actions/auth';
import { idleFormState, type FormState } from '~/lib/form-state';

export function LoginForm({ nextPath }: { readonly nextPath?: string | undefined }) {
  const [state, formAction] = useActionState<FormState<void>, FormData>(loginAction, idleFormState);

  const emailError = fieldError(state, 'email');
  const passwordError = fieldError(state, 'password');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in to Atlas</CardTitle>
        <CardDescription>Enter your email and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <FormError state={state} />

          {nextPath === undefined ? null : <input type="hidden" name="next" value={nextPath} />}

          <Field id="email" label="Email" error={emailError}>
            <Input
              {...fieldControlProps('email', emailError)}
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>

          <Field id="password" label="Password" error={passwordError}>
            <Input
              {...fieldControlProps('password', passwordError)}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>

          <SubmitButton className="mt-2 w-full" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
