# API reference

The contracts each service exposes.

**Status:** placeholder — no APIs defined yet.

## Planned contents

- `gateway.openapi.yaml` — the public API surface
- `auth.openapi.yaml` — identity endpoints
- `data.openapi.yaml` — domain read/write endpoints
- `events.md` — asynchronous event schemas consumed by `services/worker`

## Rules

- The specification is the source of truth; client types in
  `packages/api-client` follow it.
- Breaking changes require a version bump and an ADR.
- A pull request that changes a service's public surface updates the spec in the
  same pull request.
