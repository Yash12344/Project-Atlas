/**
 * Domain errors are thrown, not returned.
 *
 * A Result type forces every caller to unwrap, which reads well in isolation
 * and becomes noise across a call chain where the only sensible response to a
 * failure is to stop. Throwing typed errors keeps the happy path readable, and
 * the single boundary translator (`toProblemDetails` in the web app) turns any
 * AtlasError into an RFC 9457 response. The `code` field is part of the public
 * API contract; the message is for humans and may change.
 */
export const ERROR_CODES = [
  'validation_failed',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal_error',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface FieldIssue {
  readonly path: string;
  readonly message: string;
}

export abstract class AtlasError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly httpStatus: number;

  /**
   * True when the message is safe to show an end user. Internal errors carry
   * diagnostic text that must never cross the network boundary.
   */
  readonly expose: boolean = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    // `new.target.name` rather than a hardcoded string, so a subclass reports
    // its own name without restating it.
    this.name = new.target.name;
  }
}

export class ValidationError extends AtlasError {
  readonly code = 'validation_failed';
  readonly httpStatus = 400;
  readonly issues: readonly FieldIssue[];

  constructor(message: string, issues: readonly FieldIssue[] = []) {
    super(message);
    this.issues = issues;
  }
}

export class UnauthenticatedError extends AtlasError {
  readonly code = 'unauthenticated';
  readonly httpStatus = 401;

  constructor(message = 'Authentication required.') {
    super(message);
  }
}

export class ForbiddenError extends AtlasError {
  readonly code = 'forbidden';
  readonly httpStatus = 403;

  constructor(message = 'You do not have access to this resource.') {
    super(message);
  }
}

export class NotFoundError extends AtlasError {
  readonly code = 'not_found';
  readonly httpStatus = 404;

  constructor(message = 'Resource not found.') {
    super(message);
  }
}

export class ConflictError extends AtlasError {
  readonly code = 'conflict';
  readonly httpStatus = 409;
}

export class RateLimitError extends AtlasError {
  readonly code = 'rate_limited';
  readonly httpStatus = 429;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = 'Too many requests.') {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalError extends AtlasError {
  readonly code = 'internal_error';
  readonly httpStatus = 500;
  override readonly expose = false;
}

export function isAtlasError(error: unknown): error is AtlasError {
  return error instanceof AtlasError;
}
