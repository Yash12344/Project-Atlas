# Architecture

How Atlas is put together.

## Shape today

```
Browser
   │
   ▼
apps/web (Next.js, one deployable)
   ├── Pages and Server Actions
   └── /api/v1  ── REST, RFC 9457 errors
   │
   ▼
@atlas/core  ── identity · organizations · invitations · audit · rate limiting
   │
   ▼
@atlas/db    ── withTenant() opens a transaction and sets the RLS context
   │
   ▼
PostgreSQL   ── row-level security enforces the tenant boundary
```

Every app and package depends inward; nothing in `packages/` imports an app.

## Why a modular monolith

Atlas runs as one deployable against one database. Module boundaries live inside `packages/core` —
each domain module has an explicit entry point and does not reach into another module's internals —
and are enforced by lint rather than by convention.

That keeps extraction cheap without paying for it up front. A module with a real boundary can become
a service when load demands it; four services on day zero would have meant four pipelines,
cross-service authentication, and no cross-service transactions, bought before the first customer.

## Tenancy

Shared schema, `organization_id` on every tenant-scoped row, isolation enforced by PostgreSQL
row-level security rather than by application filtering.

The reasoning, the policies, and the tests are described in the repository
[README](../../README.md#how-tenancy-works) and implemented in `packages/db/prisma/migrations`.

## Planned contents

- Component and sequence diagrams
- Failure modes and degradation strategy
- Scaling notes: connection pooling, read replicas, caching

Decisions that produced this shape belong in [`adr/`](adr/).
