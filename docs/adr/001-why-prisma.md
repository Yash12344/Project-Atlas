# ADR-001: Prisma as the data access layer

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Atlas engineering

## Context

Atlas needs a way to define its schema, evolve it safely, and query it from TypeScript. The choice
governs three separate concerns that are often conflated:

1. **Schema definition** — where the shape of the data is declared.
2. **Migrations** — how that shape changes over time without losing data.
3. **Query construction** — how application code reads and writes.

Constraints specific to this system:

- The tenancy design (ADR-002) requires setting transaction-local PostgreSQL configuration before
  every tenant query. Whatever we choose must not obstruct raw SQL or explicit transaction control.
- Migrations must be reviewable as SQL, because the row-level security policies are the security
  boundary and reviewers need to read them directly.
- The team is small. Tooling that requires operating a build system or a code-generation pipeline is
  a cost we cannot amortise yet.

## Decision

Use **Prisma 7** for schema definition, migrations, and the majority of queries, with raw SQL used
deliberately where the query API cannot express what we need.

## Options considered

| Option                       | Pros                                                                                                                                                                                                     | Cons                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma** (chosen)          | Mature migration tooling: versioned SQL files, shadow-database drift detection, a distinct deploy command. Schema is a single source of truth generating both the client and the types. Large ecosystem. | Query API cannot express our RLS context; API surface still churns between majors. Generated client is a build artifact that must be sequenced in the task graph. |
| **Drizzle**                  | Closer to SQL, so raw control and RLS-style patterns are more natural. Much lighter. Types derived from schema without a generation step.                                                                | Migration tooling is younger and less prescriptive. Less established convention for a team to follow.                                                             |
| **Kysely**                   | Excellent type-safe query builder, minimal abstraction.                                                                                                                                                  | Query building only — no schema source of truth, no migration story. We would assemble the missing two-thirds ourselves.                                          |
| **Raw `pg` / `postgres.js`** | Zero abstraction, complete control.                                                                                                                                                                      | Every type is hand-maintained and drifts from the schema. Migrations become a bespoke system. Rejected on maintenance cost.                                       |
| **TypeORM**                  | Long-established, familiar to many.                                                                                                                                                                      | Decorator and Active Record legacy, weaker inference, a history of migration-generation surprises.                                                                |

**Drizzle was the closest call, and the argument against Prisma is real.** A design as
raw-SQL-adjacent as ours — transaction-local settings, policy-driven visibility, an atomic upsert
for rate limiting — gets less value from a query abstraction than a typical CRUD application does.
Prisma won on migration maturity and on being the more conventional choice for someone joining the
team, not on being the better fit for the query patterns.

## Consequences

**What becomes easier.** The schema file is the single place data shape is declared. Migrations are
generated as reviewable SQL, and hand-written SQL can be added to them — which is exactly how the
RLS policies are applied. `migrate deploy` gives a distinct, non-interactive path for production.

**What becomes harder, concretely:**

- **Prisma 7 made driver adapters mandatory** and moved connection URLs out of the schema into a
  config file. We paid that migration cost on day one. It is evidence the API surface is still
  moving, and future majors will likely cost similar work.
- **The documented approach to RLS did not survive review.** Prisma's recommended client-extension
  pattern wraps each individual operation in its own transaction, which breaks as soon as two
  statements must be atomic. We use an explicit transaction helper instead (see ADR-002). We are not
  following the library's guidance here, and anyone reading Prisma's docs will find advice this
  codebase deliberately rejects.
- **Raw SQL is required in places.** The rate limiter's conditional window-reset upsert cannot be
  expressed through the query API. Each such escape hatch loses the type safety that motivated the
  choice.
- **The generated client is a build artifact.** It must be produced before linting, type-checking,
  or testing. We got this wrong once — the task graph let the database package lint against a
  not-yet-generated client — and CI would have raced intermittently.

**Revisit if.** The count of raw-SQL escape hatches keeps growing, or a future Prisma major imposes
another migration of this size. At that point Drizzle becomes the obvious candidate, and the
migration cost is bounded because the schema and the SQL migrations are both portable — it is the
query call sites that would need rewriting.
