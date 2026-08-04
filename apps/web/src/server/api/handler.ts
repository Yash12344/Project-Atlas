import 'server-only';

import { createLogger, serializeError, withLogContext } from '@atlas/logger';
import { isAtlasError, RateLimitError, ValidationError } from '@atlas/types';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const log = createLogger('api');

/**
 * Error responses follow RFC 9457 (Problem Details for HTTP APIs).
 *
 * Inventing a bespoke error envelope is the default choice and the wrong one:
 * clients then need Atlas-specific parsing, and every new endpoint is free to
 * shape errors differently. RFC 9457 is a published contract with existing
 * client support, and `type`/`title`/`status`/`detail` cover what a caller
 * needs to act.
 *
 * `code` is the Atlas addition and the field clients should branch on — the
 * `detail` text is for humans and may be reworded without notice.
 */
export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly code: string;
  readonly instance?: string;
  readonly errors?: Readonly<Record<string, string>>;
}

const PROBLEM_CONTENT_TYPE = 'application/problem+json';

const TITLES: Readonly<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

function problemResponse(
  problem: ProblemDetails,
  headers: Record<string, string> = {},
): NextResponse<ProblemDetails> {
  return NextResponse.json(problem, {
    status: problem.status,
    headers: { 'content-type': PROBLEM_CONTENT_TYPE, ...headers },
  });
}

function zodProblem(error: z.ZodError, requestId: string): NextResponse<ProblemDetails> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!(path in errors)) {
      errors[path] = issue.message;
    }
  }

  return problemResponse({
    type: 'https://docs.atlas.dev/errors/validation_failed',
    title: TITLES[422] ?? 'Unprocessable Content',
    status: 422,
    detail: 'The request body failed validation.',
    code: 'validation_failed',
    instance: requestId,
    errors,
  });
}

export type ApiHandler<T> = (request: Request, context: T) => Promise<Response>;

/**
 * Wraps a route handler with correlation, logging, and error translation.
 *
 * Every handler gets the same treatment so no endpoint can accidentally return
 * a stack trace or a raw database message. Unrecognised errors become a
 * generic 500 whose `instance` is the request id, which is also on the log
 * line — enough to find the fault without leaking it to the caller.
 */
export function withApiHandler<T>(routeName: string, handler: ApiHandler<T>): ApiHandler<T> {
  return async (request: Request, context: T): Promise<Response> => {
    const requestId = request.headers.get('x-request-id') ?? randomUUID();

    return await withLogContext({ requestId, route: routeName }, async () => {
      const startedAt = performance.now();

      try {
        const response = await handler(request, context);
        response.headers.set('x-request-id', requestId);

        log.info(
          {
            method: request.method,
            status: response.status,
            durationMs: Math.round(performance.now() - startedAt),
          },
          'request completed',
        );

        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return zodProblem(error, requestId);
        }

        if (error instanceof ValidationError) {
          return problemResponse({
            type: 'https://docs.atlas.dev/errors/validation_failed',
            title: TITLES[400] ?? 'Bad Request',
            status: 400,
            detail: error.message,
            code: error.code,
            instance: requestId,
            errors: Object.fromEntries(error.issues.map((issue) => [issue.path, issue.message])),
          });
        }

        if (isAtlasError(error)) {
          const headers =
            error instanceof RateLimitError
              ? { 'retry-after': String(error.retryAfterSeconds) }
              : {};

          log.warn({ code: error.code, status: error.httpStatus }, 'request rejected');

          return problemResponse(
            {
              type: `https://docs.atlas.dev/errors/${error.code}`,
              title: TITLES[error.httpStatus] ?? 'Error',
              status: error.httpStatus,
              detail: error.expose ? error.message : 'An unexpected error occurred.',
              code: error.code,
              instance: requestId,
            },
            headers,
          );
        }

        log.error({ err: serializeError(error) }, 'unhandled error in route handler');

        return problemResponse({
          type: 'https://docs.atlas.dev/errors/internal_error',
          title: TITLES[500] ?? 'Internal Server Error',
          status: 500,
          detail: 'An unexpected error occurred.',
          code: 'internal_error',
          instance: requestId,
        });
      }
    });
  };
}

/**
 * Parses a JSON body against a schema.
 *
 * A malformed body is a validation failure, not a 500 — `request.json()`
 * throws a SyntaxError on invalid input, which would otherwise be logged as a
 * server fault caused by a client mistake.
 */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON.');
  }

  return schema.parse(payload);
}

/** Parses query-string parameters against a schema. */
export function parseSearchParams<S extends z.ZodType>(request: Request, schema: S): z.infer<S> {
  const url = new URL(request.url);
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}

export function jsonResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}
