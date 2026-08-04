import { z } from 'zod';

import { parseEnv } from './parse';

/**
 * Client configuration. Only `NEXT_PUBLIC_*` variables belong here — anything
 * in this schema is inlined into the browser bundle and is public by
 * definition.
 *
 * Next.js replaces `process.env.NEXT_PUBLIC_X` at build time by static text
 * substitution, so each variable must be referenced by its full literal name.
 * Spreading `process.env` would yield an empty object in the browser.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url('NEXT_PUBLIC_APP_URL must be a valid absolute URL.'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export const clientEnv: ClientEnv = parseEnv('client', clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
});
