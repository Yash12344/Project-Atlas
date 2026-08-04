# ADR-002: PostgreSQL row-level security as the tenant boundary

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Atlas engineering

## Context

Atlas is multi-tenant. Every customer's data lives alongside every other customer's, and the system
must guarantee that one can never read another's.

The specific risk is not exotic. In a shared-schema design, tenant isolation is usually implemented
as a `WHERE organization_id = ?` clause applied by convention at every call site. That works until
someone forgets one. The consequence of forgetting is not a bug report — it is one customer reading
another's data, discovered by the customer.

That failure mode has three properties that make it unacceptable to leave to diligence:

- It is invisible in testing, because a test with one tenant's data cannot detect a missing filter.
- It is invisible in review, because the absence of a clause is harder to notice than the presence
  of a wrong one.
- Its cost is unbounded and unrecoverable. You cannot un-disclose data.

This decision is upstream of almost everything else in the codebase, so it was made before the first
table existed.

## Decision

**Shared schema with `organization_id` on every tenant-scoped table, isolation enforced by
PostgreSQL row-level security.**

Specifically:

- Tenant-scoped tables carry `ENABLE` **and** `FORCE ROW LEVEL SECURITY`, with policies keyed on
  transaction-local settings.
- The application connects as a role holding neither `SUPERUSER` nor `BYPASSRLS`. Migrations connect
  as a separate owner role.
- All tenant access flows through a single transaction helper that sets the context and runs the
  caller's work inside it.
- Application-level filtering **remains**, as defence in depth rather than as the boundary.

## Options considered

| Option                                        | Pros                                                                                                                   | Cons                                                                                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared schema + RLS** (chosen)              | Isolation is a database guarantee, not a convention. Fails closed. One schema, one migration run, one connection pool. | Every tenant query needs a transaction. Pre-tenant operations need explicit, reviewable exceptions. Authorization logic lives in two languages.                            |
| **Shared schema, application filtering only** | Simplest to write; no transaction overhead; no SQL to review.                                                          | One forgotten clause is a breach. Rejected outright — the failure mode is the whole problem.                                                                               |
| **Schema per tenant**                         | Strong isolation, per-tenant backup and restore is trivial.                                                            | Migrations fan out: 10,000 tenants means 10,000 DDL runs, and a partial failure leaves the fleet split-brained. Connection and catalogue pressure grows with tenant count. |
| **Database per tenant**                       | Strongest isolation, straightforward per-tenant performance and residency.                                             | Connection count becomes the binding constraint. Cross-tenant queries (billing, admin, analytics) become a distributed problem. Heavy operational cost per customer.       |

Schema- and database-per-tenant are the right answers for a small number of large,
contractually-isolated customers. They are the wrong answers for a self-serve product expecting many
tenants, which is what Atlas is.

## Consequences

**What becomes easier.** The worst case of a forgotten tenant filter is an empty result set. That
inverts the risk: the bug that ships is a visible empty screen rather than a silent leak. Isolation
is testable directly against the database, and those tests assert a property rather than an
implementation.

**What becomes harder, concretely:**

- **Every tenant query runs inside a transaction.** That is overhead on reads that would otherwise
  be single statements, and it means interactive transaction timeouts are now a thing the
  application must respect.
- **Pre-tenant operations need explicit exceptions**, and each one is attack surface. There are
  currently two: a user-scoped context for "which organizations do I belong to?", asked at login
  before any tenant exists; and a token-scoped context for invitation acceptance, where the invitee
  is by definition not yet a member. Both are narrow and both must be re-reviewed whenever they
  change. **Adding a third should require an ADR.**
- **Authorization now lives in two languages.** Role-to-permission mapping is TypeScript; row
  visibility is SQL policy. A reviewer has to hold both. Neither substitutes for the other —
  permissions without RLS leak across tenants, RLS without permissions lets any member delete
  anything inside their own tenant.
- **Adding a table is not just adding a table.** A new tenant-scoped table with no policy is
  readable by every tenant. Nothing currently prevents that omission except review, which is
  precisely the weakness this ADR exists to remove for queries. This is the largest open gap in the
  design.
- **Connection pooling is constrained.** The context must be transaction-local, which is safe behind
  a transaction-mode pooler. A session-mode pooler would change the reasoning and must not be
  introduced without revisiting this.
- **Debugging changes shape.** "Why is this empty?" is a harder question than "why did this throw?",
  and the answer is often a missing context rather than a missing row.

**Enforcement.** CI asserts that the application role can bypass neither `SUPERUSER` nor
`BYPASSRLS`, before any test runs. If that check ever passes silently, every guarantee in this ADR
is void, and the test suite that appears to prove isolation would prove nothing.

**Revisit if.** A customer requires physical data isolation or regional residency, or a single large
tenant's load justifies dedicated infrastructure. The likely answer then is a hybrid: shared schema
for the long tail, dedicated databases for named accounts — not a wholesale migration.
