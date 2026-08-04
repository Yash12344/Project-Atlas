import { serverEnv } from '@atlas/env/server';
import { pino, type Logger, type LoggerOptions } from 'pino';

import { inspect } from 'node:util';

import { getLogContext } from './context';

export { withLogContext, getLogContext, type LogContext } from './context';
export type { Logger } from 'pino';

/**
 * Paths scrubbed before a log line is serialised.
 *
 * Redaction is a denylist, which is inherently incomplete — so the standing
 * rule is that whole request/response bodies are never logged, only named
 * fields. This list is the second line of defence for the cases where someone
 * logs an object that happens to carry one of these keys.
 */
const REDACTED_PATHS = [
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  'secret',
  'authorization',
  'cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.secret',
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
];

/**
 * Development gets human-readable output; every other environment gets
 * newline-delimited JSON on stdout, which is what log shippers expect. Writing
 * to a file or an external service from the process is deliberately avoided —
 * that is the platform's job, not the application's.
 */
function buildOptions(): LoggerOptions {
  const base: LoggerOptions = {
    level: serverEnv.LOG_LEVEL,
    redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    // Correlation fields are injected here so they cannot be forgotten.
    mixin: () => ({ ...getLogContext() }),
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (serverEnv.NODE_ENV === 'development') {
    return {
      ...base,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
      },
    };
  }

  return base;
}

export const logger: Logger = pino(buildOptions());

/**
 * Creates a namespaced child logger. Prefer this over the root logger so lines
 * carry the module that produced them.
 */
export function createLogger(component: string): Logger {
  return logger.child({ component });
}

/**
 * Normalises an unknown thrown value into something safe to log.
 *
 * `catch (error: unknown)` can receive anything a library chose to throw;
 * calling `.message` on it is exactly the unsafe member access the lint rules
 * forbid, so the narrowing happens once, here.
 */
export function serializeError(error: unknown): {
  message: string;
  name: string;
  stack?: string;
  cause?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack === undefined ? {} : { stack: error.stack }),
      ...(error.cause === undefined ? {} : { cause: describeCause(error.cause) }),
    };
  }

  return { name: 'UnknownError', message: inspect(error, { depth: 2 }) };
}

/**
 * A `cause` may be anything. `String(value)` renders a plain object as
 * "[object Object]", which tells an on-call engineer nothing, so structured
 * values are inspected instead.
 */
function describeCause(cause: unknown): string {
  if (cause instanceof Error) {
    return `${cause.name}: ${cause.message}`;
  }
  if (typeof cause === 'string') {
    return cause;
  }
  return inspect(cause, { depth: 2 });
}
