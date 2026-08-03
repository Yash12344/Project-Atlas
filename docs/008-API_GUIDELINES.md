# 008 — API Guidelines

> **Status:** Placeholder — table of contents only. No content written yet.
> **Owner:** TBD
> **Last updated:** 2026-08-03

Rules every Atlas API follows so that clients can learn one API and understand
the rest. Concrete contracts live in `docs/api/`.

## Table of contents

1. Scope
   1. Public, partner, and internal APIs
   2. Which rules are mandatory
2. API style
   1. Protocol choices and when each applies
   2. Resource-oriented design
   3. When RPC-style endpoints are acceptable
3. URL and resource conventions
   1. Path structure
   2. Naming and pluralization
   3. Nesting depth limits
   4. Identifiers
4. HTTP semantics
   1. Method selection
   2. Status code usage
   3. Idempotency and idempotency keys
   4. Caching headers
   5. Conditional requests
5. Requests
   1. Content types
   2. Body and query parameter conventions
   3. Validation rules
   4. Field naming and casing
   5. Date, time, and numeric formats
6. Responses
   1. Envelope policy
   2. Field inclusion, sparse fieldsets, and expansion
   3. Nullability conventions
7. Errors
   1. Error response schema
   2. Error code taxonomy
   3. Field-level validation errors
   4. What may and may not appear in error messages
8. Collections
   1. Pagination
   2. Filtering
   3. Sorting
   4. Result limits
9. Authentication and authorization
   1. Credential transmission
   2. Scopes and permissions
   3. Unauthorized versus forbidden
10. Rate limiting and quotas
    1. Limit tiers
    2. Response headers
    3. Client backoff expectations
11. Versioning and compatibility
    1. Versioning scheme
    2. What counts as a breaking change
    3. Additive change rules
12. Deprecation
    1. Notice period
    2. Headers and communication
    3. Sunset process
13. Asynchronous APIs
    1. Long-running operations
    2. Webhooks
    3. Event schemas and delivery guarantees
14. Documentation requirements
    1. Specification as source of truth
    2. Examples and changelog
15. Client generation
16. Checklist for a new endpoint
