import type { z } from 'zod';

/**
 * Environment parsing fails at import time, loudly, with every problem listed.
 *
 * The alternative — reading `process.env.X` where it is needed — turns a
 * missing variable into a `undefined` that surfaces as a confusing runtime
 * error hours into a deploy, usually inside a request. Parsing once at module
 * load means a misconfigured container refuses to start, which is the failure
 * mode you want.
 */
export class EnvironmentValidationError extends Error {
  readonly issues: readonly string[];

  constructor(scope: string, issues: readonly string[]) {
    super(
      [
        `Invalid ${scope} environment configuration:`,
        ...issues.map((issue) => `  - ${issue}`),
        '',
        'Check .env against .env.example.',
      ].join('\n'),
    );
    this.name = 'EnvironmentValidationError';
    this.issues = issues;
  }
}

export function parseEnv<T extends z.ZodType>(
  scope: string,
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join('.') || '(root)';
      return `${path}: ${issue.message}`;
    });
    throw new EnvironmentValidationError(scope, issues);
  }

  return result.data;
}
