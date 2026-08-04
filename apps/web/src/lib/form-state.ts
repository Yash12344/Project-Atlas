/**
 * The contract between a Server Action and the component that renders it.
 *
 * Deliberately free of server imports. `runFormAction` — which touches the
 * logger and the error taxonomy — lives in `~/server/form`, which is marked
 * `server-only`. Client components need the *type* and the initial value, and
 * pulling those from the server module would drag `server-only` into the
 * browser bundle and fail the build.
 *
 * A discriminated union rather than `{ error?: string }` so a component cannot
 * render a success state while an error is present.
 */
export type FormState<T = undefined> =
  | { readonly status: 'idle' }
  | { readonly status: 'success'; readonly data: T }
  | {
      readonly status: 'error';
      readonly message: string;
      readonly fieldErrors: Readonly<Record<string, string>>;
    };

/**
 * The initial state for every form.
 *
 * Typed as the idle member alone rather than `FormState<never>`: a
 * `FormState<never>` is not assignable to `FormState<void>` because their
 * success branches differ, which would force a cast at each `useActionState`
 * call. The idle member is assignable to every instantiation.
 */
export const idleFormState: { readonly status: 'idle' } = { status: 'idle' };

/** Reads a field-level error, if the state carries one. */
export function fieldError<T>(state: FormState<T>, field: string): string | undefined {
  return state.status === 'error' ? state.fieldErrors[field] : undefined;
}
