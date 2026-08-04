import { prisma } from '@atlas/db';

import { jsonResponse, withApiHandler } from '~/server/api/handler';

/**
 * Liveness and readiness in one endpoint.
 *
 * The database round-trip is the point: a process that is running but cannot
 * reach PostgreSQL must not be routed traffic, and an orchestrator can only
 * know that if the check actually exercises the dependency.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler('health', async () => {
  const startedAt = performance.now();
  await prisma.$queryRaw`SELECT 1`;
  const databaseLatencyMs = Math.round(performance.now() - startedAt);

  return jsonResponse({
    status: 'ok',
    checks: { database: { status: 'ok', latencyMs: databaseLatencyMs } },
  });
});
