import 'server-only';

import { createLogger, serializeError } from '@atlas/logger';
import { isAtlasError, ValidationError } from '@atlas/types';
import { z } from 'zod';

import type { FormState } from '~/lib/form-state';

const log = createLogger('form');

export type { FormState } from '~/lib/form-state';

function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    // First message per field wins: showing three messages under one input is
    // noise, and the first is the most specific.
    if (path.length > 0 && !(path in fieldErrors)) {
      fieldErrors[path] = issue.message;
    }
  }

  return fieldErrors;
}

/**
 * Runs a Server Action body and converts any failure into form state.
 *
 * Without a single translator here, each action grows its own try/catch and
 * they drift: one leaks a database error string to the browser, another
 * swallows a real fault as "something went wrong". This function is the only
 * place that decides what an end user is allowed to see.
 */
export async function runFormAction<T>(
  actionName: string,
  body: () => Promise<T>,
): Promise<FormState<T>> {
  try {
    return { status: 'success', data: await body() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 'error',
        message: 'Please correct the highlighted fields.',
        fieldErrors: fieldErrorsFromZod(error),
      };
    }

    if (error instanceof ValidationError) {
      return {
        status: 'error',
        message: error.message,
        fieldErrors: Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message])),
      };
    }

    if (isAtlasError(error) && error.expose) {
      return { status: 'error', message: error.message, fieldErrors: {} };
    }

    // Anything reaching here is a fault, not a user mistake. It is logged in
    // full and reported generically, so an internal message or a stack trace
    // never reaches the browser.
    log.error({ action: actionName, err: serializeError(error) }, 'server action failed');
    return {
      status: 'error',
      message: 'Something went wrong. Please try again.',
      fieldErrors: {},
    };
  }
}

/**
 * Reads a string field from FormData.
 *
 * FormData values are `string | File`; a File where a string was expected
 * means a malformed request, and coercing it with `String(value)` would
 * produce the useless literal "[object File]" deep inside a validator.
 */
export function formString(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}
