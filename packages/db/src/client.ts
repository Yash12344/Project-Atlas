import { serverEnv } from '@atlas/env/server';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/client/client.js';

/**
 * The base Prisma client.
 *
 * Connects as the *application* role, which holds neither SUPERUSER nor
 * BYPASSRLS. Every query issued through this client is therefore subject to
 * the row-level security policies in prisma/migrations. Without a tenant
 * context set (see tenant.ts), it can reach only the tables that carry no
 * tenant column — `users` and `sessions` — which is exactly the surface the
 * authentication flows need.
 *
 * This is deliberately *not* exported as a general-purpose escape hatch. Code
 * that needs tenant data must go through `forOrganization`.
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log:
      serverEnv.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ],
  });
}

/**
 * Next.js dev mode re-evaluates modules on every hot reload. Without this
 * cache each reload would open a new pool and the database would run out of
 * connections within a few minutes of editing.
 */
const globalForPrisma = globalThis as unknown as { atlasPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.atlasPrisma ?? createPrismaClient();

if (serverEnv.NODE_ENV !== 'production') {
  globalForPrisma.atlasPrisma = prisma;
}

export type { PrismaClient };
