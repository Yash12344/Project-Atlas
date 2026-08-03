# 002 — System Architecture

> **Status:** Placeholder — table of contents only. No content written yet.
> **Owner:** TBD
> **Last updated:** 2026-08-03

How the pieces of Project Atlas fit together, what each owns, and how a request
travels through the system.

## Table of contents

1. Architectural goals and drivers
   1. Quality attributes
   2. Constraints shaping the design
2. System context
   1. External actors and systems
   2. Trust boundaries
3. Component overview
   1. Applications (`apps/`)
   2. Shared packages (`packages/`)
   3. Services (`services/`)
   4. Datastores and infrastructure
4. Service responsibilities
   1. API gateway
   2. Auth service
   3. Data service
   4. Worker service
5. Communication patterns
   1. Synchronous request/response
   2. Asynchronous events and queues
   3. Contract ownership and versioning
6. Data flow
   1. Read path
   2. Write path
   3. Background and scheduled processing
7. Dependency rules
   1. Allowed dependency directions
   2. Enforcement mechanisms
8. Cross-cutting concerns
   1. Authentication and authorization
   2. Configuration and feature flags
   3. Observability: logging, metrics, tracing
   4. Error handling and resilience
9. Scalability and performance
   1. Expected load profile
   2. Scaling strategy per component
   3. Caching strategy
10. Availability and failure modes
    1. Failure domains
    2. Degradation strategy
11. Deployment topology
    1. Environments
    2. Regions and zones
12. Architecture decisions
    1. Index of relevant ADRs
    2. Decisions still outstanding
13. Diagrams
14. References
