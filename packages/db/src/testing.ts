import { serverEnv } from '@atlas/env/server';
import { Pool } from 'pg';

import { prisma } from './client';

/**
 * Test-only database helpers. Not exported from the package index — importing
 * `@atlas/db/testing` from application code is a visible mistake in review.
 *
 * These run on the *owner* connection, deliberately. The application role
 * cannot delete tenant rows without a tenant context, and several foreign keys
 * are `ON DELETE RESTRICT` (deleting an inviter would erase who invited whom),
 * so per-row cleanup through the normal path is both blocked and wrong to
 * allow. TRUNCATE is not subject to row-level security and is the correct tool
 * for resetting a test database.
 */
const TENANT_TABLES = [
  'audit_logs',
  'invitations',
  'memberships',
  'sessions',
  'organizations',
  'users',
] as const;

let pool: Pool | undefined;

function ownerPool(): Pool {
  pool ??= new Pool({ connectionString: serverEnv.DIRECT_DATABASE_URL, max: 2 });
  return pool;
}

/**
 * Empties every table. Guarded against running anywhere but a test database,
 * because the cost of getting this wrong is unrecoverable.
 */
export async function resetDatabase(): Promise<void> {
  // NODE_ENV is the only guard, deliberately. Host-based heuristics
  // ("does the URL contain localhost?") are not safety properties — a
  // production database reached through an SSH tunnel or a sidecar matches
  // them exactly. Test runners set NODE_ENV=test; nothing else does.
  if (serverEnv.NODE_ENV !== 'test') {
    throw new Error(
      `resetDatabase refused to run with NODE_ENV=${serverEnv.NODE_ENV}. It truncates every table and is only ever valid against a test database.`,
    );
  }

  await ownerPool().query(
    `TRUNCATE TABLE ${TENANT_TABLES.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

/** Releases both the Prisma pool and the owner pool at the end of a run. */
export async function closeTestConnections(): Promise<void> {
  await prisma.$disconnect();
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
