# API reference

The contracts each service exposes.

**Status:** placeholder — no APIs defined yet.

## Planned contents

- `v1.openapi.yaml` — the public API surface served under `/api/v1`
- `events.md` — asynchronous event schemas, once background processing lands

## Rules

- The specification is the source of truth; client types in `packages/api-client` follow it.
- Breaking changes require a version bump and an ADR.
- A pull request that changes a service's public surface updates the spec in the same pull request.
