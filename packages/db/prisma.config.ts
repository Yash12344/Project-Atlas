import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

/**
 * Migration-time configuration.
 *
 * Migrations connect as the *owner* role (DIRECT_DATABASE_URL) because they
 * issue DDL and must not be subject to row-level security. The application
 * connects as a separate, RLS-bound role — see src/client.ts. Keeping the two
 * roles distinct is what makes RLS a real boundary rather than a decoration.
 *
 * The direct URL is also required because Prisma Migrate opens advisory locks
 * and multi-statement transactions that a transaction-mode pooler cannot hold.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
