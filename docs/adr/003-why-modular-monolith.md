# ADR-003: A modular monolith rather than services

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Atlas engineering

## Context

Atlas began with a repository scaffold containing four independently deployable services — a
gateway, an authentication service, a data service, and a worker — plus Kubernetes overlays for
three environments. It had no product, no customers, and no code.

That structure encodes a bet: that the benefits of service boundaries (independent scaling,
independent deployment, fault isolation, team autonomy) will outweigh their costs (distributed
transactions, cross-service authentication, N pipelines, network failure modes, distributed
debugging) before the costs compound.

At zero customers, none of the benefits apply and all of the costs do. Nobody needs to scale the
auth service independently when nobody is logging in. Team autonomy is not a concern for a team that
fits in one room.

The counter-risk is real too: a monolith with no internal structure becomes one where extraction is
impossible, and the moment you genuinely need a service, you cannot get one.

## Decision

**One deployable — a Next.js application backed by one PostgreSQL database — with enforced module
boundaries inside a domain package.**

Concretely:

- The UI, the Server Actions the UI calls, and the versioned REST API all ship as a single artifact.
- Business logic lives in domain modules, each with an explicit public entry point. Modules do not
  import one another's internals.
- The dependency direction (nothing in `packages/` may import an application) is enforced by an
  ESLint rule, so violating it fails CI rather than review.

## Options considered

| Option                          | Pros                                                                                                                                        | Cons                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modular monolith** (chosen)   | One pipeline, one deploy, transactions that actually span the operations that need them. Extraction stays cheap while boundaries stay real. | One blast radius. Scaling is all-or-nothing. Boundaries are enforced by lint, which is weaker than enforcement by network.                      |
| **Microservices from day one**  | Independent scaling and deployment; forced boundaries.                                                                                      | Distributed transactions, cross-service auth, N pipelines, and distributed debugging — paid immediately, before any of the benefits are needed. |
| **Unstructured monolith**       | Fastest to write.                                                                                                                           | Extraction becomes impossible. The option to split later is exactly what this decision is trying to preserve.                                   |
| **Monolith + one auth service** | Isolates the most security-sensitive component.                                                                                             | Adds a network hop to the hottest path in the application, for a benefit that RLS and a separate database role already provide.                 |

## Consequences

**What becomes easier.** A single transaction can span creating an organization, adding its first
membership, and writing the audit entry — which is what makes "an organization always has an owner"
enforceable rather than aspirational. One pipeline, one artifact, one place to look during an
incident. A new engineer runs one thing.

**What becomes harder, concretely:**

- **One blast radius.** An unbounded loop or a memory leak in any code path takes down the whole
  application, including paths unrelated to the fault. There is no bulkhead.
- **Scaling is undifferentiated.** If one workload becomes expensive, the only lever is more
  replicas of everything.
- **Lint is a weaker boundary than a network.** A determined author can still couple two modules
  through the shared database, and no rule will catch it. The boundary holds because people maintain
  it, which means it needs to be a standing review concern, not a one-time setup.
- **Extraction is cheap only while the boundaries are real.** If modules start reaching into each
  other, the option this decision was designed to preserve quietly disappears — and it disappears
  silently, which is the dangerous part. The value of this ADR is mostly in the discipline it
  commits us to, not in the structure it describes.

**What this decision is not.** It is not a claim that services are wrong. It is a claim about
sequencing: a boundary you can draw later, from working code with real load data, is better drawn
than one guessed at before the product exists.

**Revisit if.** A workload's resource profile diverges sharply from the rest — AI inference and
background processing are the likely first candidates. Or when deploy contention becomes real, which
in practice means more than one team shipping to the same artifact. The first extraction should be a
module that already has no inbound coupling; if no such module exists, that is a signal the
boundaries have already eroded and the fix is to restore them before extracting anything.
