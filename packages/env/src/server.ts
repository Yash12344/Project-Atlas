import { z } from 'zod';

import { parseEnv } from './parse.js';

/**
 * Server-only configuration. Importing this module from client code is a build
 * error by construction: the guard below throws in the browser, so a stray
 * import surfaces immediately rather than shipping secrets to the bundle.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /**
   * Pooled connection used by the application at runtime. This role is subject
   * to row-level security — see packages/db for why that matters.
   */
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string.'),

  /**
   * Unpooled, owner-privileged connection used only by migrations and by the
   * test harness. Prisma Migrate cannot run through a transaction pooler.
   */
  DIRECT_DATABASE_URL: z
    .string()
    .url('DIRECT_DATABASE_URL must be a valid connection string.'),

  APP_URL: z.string().url('APP_URL must be a valid absolute URL.'),

  SESSION_COOKIE_NAME: z.string().min(1).default('atlas_session'),

  /** Idle and absolute session lifetimes, in seconds. */
  SESSION_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  SESSION_ABSOLUTE_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),

  INVITATION_TTL_HOURS: z.coerce.number().int().positive().max(720).default(168),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Next.js evaluates modules during `next build` where a real database is often
 * absent. `SKIP_ENV_VALIDATION=1` lets the build proceed; it must never be set
 * in a running environment, which the deployment checklist covers.
 */
function loadServerEnv(): ServerEnv {
  // Checked via `globalThis` rather than a bare `window` reference so this
  // module type-checks under the DOM-free library config as well as in Next.js.
  if ('window' in globalThis) {
    throw new Error('@atlas/env/server was imported from client code.');
  }

  if (process.env['SKIP_ENV_VALIDATION'] === '1') {
    return serverEnvSchema.parse({
      NODE_ENV: process.env['NODE_ENV'] ?? 'development',
      DATABASE_URL: 'postgresql://build:build@localhost:5432/build',
      DIRECT_DATABASE_URL: 'postgresql://build:build@localhost:5432/build',
      APP_URL: 'http://localhost:3000',
    });
  }

  return parseEnv('server', serverEnvSchema, process.env);
}

export const serverEnv: ServerEnv = loadServerEnv();

export const isProduction = serverEnv.NODE_ENV === 'production';
export const isTest = serverEnv.NODE_ENV === 'test';
