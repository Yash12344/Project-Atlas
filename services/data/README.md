# @atlas/data-service

Core domain API and persistence for Atlas.

**Status:** placeholder — no implementation yet.

## Responsibilities

- Read and write operations over the primary domain entities
- Schema ownership and migrations
- Emitting domain events consumed by `services/worker`

## Rules

Sole writer of the primary datastore. Shares its domain vocabulary with clients
through `@atlas/core`, and its contract through `docs/api/`.
