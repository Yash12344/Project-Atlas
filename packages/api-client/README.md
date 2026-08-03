# @atlas/api-client

Typed client for the Atlas public API exposed by `services/api-gateway`.

**Status:** placeholder — no implementation yet.

## Responsibilities

- Request/response types generated or derived from the contracts in `docs/api/`
- Auth token attachment, retries, and error normalization

## Rules

Transport concerns only. Business decisions belong in `@atlas/core`; the client
returns data and typed errors, it does not interpret them.
