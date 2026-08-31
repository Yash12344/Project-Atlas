# syntax=docker/dockerfile:1.7

# Runtime image for apps/web.
#
# Build context is the repository root, because the app imports workspace
# packages by source and pnpm's store is shared across the workspace. A
# per-app context would resolve none of that.

# --- Base -------------------------------------------------------------------
FROM node:26.8-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# --- Dependencies -----------------------------------------------------------
# Manifests are copied before sources so this layer is cached until a
# dependency actually changes, rather than on every source edit.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/logger/package.json packages/logger/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build ------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @atlas/db run db:generate
# The build evaluates modules that read configuration. There is no database at
# image-build time, so validation is skipped here and enforced at boot instead.
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @atlas/web run build

# --- Runtime ----------------------------------------------------------------
FROM node:26.8-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runs unprivileged. A container process that does not need root should not
# have it, so a container escape does not start from uid 0.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# `output: standalone` emits only the files the server actually reaches,
# including the pruned node_modules — a fraction of the full install.
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Migrations are shipped so a release can apply them, but they are run as a
# deploy step rather than on container start: N replicas booting would
# otherwise race for the migration lock.
COPY --from=build --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
