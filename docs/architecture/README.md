# Architecture

How Project Atlas is put together.

**Status:** placeholder — the system is not yet implemented.

## Planned contents

- **System overview** — components and their responsibilities
- **Data flow** — how a request travels from client to datastore and back
- **Service boundaries** — what each service owns and what it must not touch
- **Cross-cutting concerns** — authentication, observability, error handling

## Shape today

```
apps/*  ──►  services/api-gateway  ──►  services/auth
                                   ──►  services/data  ──►  datastore
                                                       ──►  events ──► services/worker
```

Every app depends on shared `packages/*`; no package depends on an app or a
service.

Decisions that produced this shape are recorded in [`adr/`](adr/).
