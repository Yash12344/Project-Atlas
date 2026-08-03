import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Fields that should appear on every log line emitted while handling one
 * request, without every call site remembering to pass them.
 */
export interface LogContext {
  readonly requestId: string;
  readonly userId?: string;
  readonly organizationId?: string;
  readonly route?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

/**
 * Runs `fn` with the given correlation fields bound to the async context.
 *
 * AsyncLocalStorage is the only mechanism that survives `await` boundaries
 * without threading a context object through every function signature. The
 * cost is that it is Node-only, which is one reason middleware stays on the
 * edge runtime and does no logging.
 */
export function withLogContext<T>(context: LogContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getLogContext(): LogContext | undefined {
  return storage.getStore();
}
