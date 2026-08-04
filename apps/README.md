# apps/

Deployable applications. Each subdirectory is a separately shipped artifact with its own build and
release cadence.

| Directory | Purpose                                  |
| --------- | ---------------------------------------- |
| `web/`    | The Atlas application: UI and public API |

## Why one app rather than several services

Atlas is a modular monolith. Next.js serves the UI, the Server Actions the UI calls, and the
versioned REST API under `/api/v1` — all from one deployable, against one database.

Modularity lives in `packages/core`, where each domain module has an explicit entry point and no
cross-imports of another module's internals. That is what makes a future extraction cheap: a module
with a real boundary can become a service when load actually demands it. Starting with four services
would have meant four pipelines, cross-service authentication, and no cross-service transactions,
bought before a single customer existed.

## Rules

- An app **presents and routes**; it does not own business logic. Domain rules live in
  `@atlas/core`, persistence in `@atlas/db`, widgets in `@atlas/ui`.
- Apps may depend on `packages/*`. Apps must never be imported _by_ a package — the lint config
  rejects it.
- The only place a session becomes an authorized `Actor` is `src/server/context.ts`. Nothing
  downstream re-derives identity.
