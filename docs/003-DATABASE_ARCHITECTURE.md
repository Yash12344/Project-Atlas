# 003 — Database Architecture

> **Status:** Placeholder — table of contents only. No content written yet.
> **Owner:** TBD
> **Last updated:** 2026-08-03

Datastore choices, ownership boundaries, schema design, and the rules for
changing data safely.

## Table of contents

1. Goals and constraints
2. Datastore selection
   1. Primary transactional store
   2. Cache layer
   3. Queue and event storage
   4. Analytical and reporting store
   5. Rationale and rejected options
3. Ownership model
   1. One writer per store
   2. Cross-service data access rules
   3. Prohibited patterns
4. Logical data model
   1. Core entities
   2. Relationships
   3. Identifiers and key strategy
5. Physical schema
   1. Naming conventions
   2. Column types and nullability rules
   3. Constraints and referential integrity
   4. Soft deletes and tombstones
   5. Audit and timestamp columns
6. Indexing strategy
   1. Index selection principles
   2. Query patterns to support
   3. Review process for new indexes
7. Migrations
   1. Tooling
   2. Expand/contract workflow
   3. Backwards-compatible deploy sequence
   4. Rollback approach
8. Multi-tenancy and data isolation
9. Data lifecycle
   1. Retention policies
   2. Archival
   3. Deletion and right-to-erasure handling
10. Performance and capacity
    1. Connection pooling
    2. Query performance budgets
    3. Partitioning and sharding triggers
11. Backup and recovery
    1. Backup schedule
    2. Restore procedure and RTO/RPO targets
    3. Restore testing cadence
12. Security
    1. Encryption at rest and in transit
    2. Access control and credential rotation
    3. PII classification and handling
13. Seed and fixture data
14. Open questions
