# services/

Backend services. Each subdirectory is an **independently deployable process**
with its own lifecycle, Dockerfile, health checks, and Kubernetes manifests
under `infrastructure/kubernetes/`.

| Directory      | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `api-gateway/` | Single public entry point: routing, authn enforcement, rate limits |
| `auth/`        | Identity, sessions, tokens, and permission checks                 |
| `data/`        | Core domain read/write API and persistence                       |
| `worker/`      | Background jobs, scheduled tasks, and queue consumers            |

## Rules

- **Own your data.** A service is the only writer of its own store. Cross-service
  reads happen through APIs or events, never by sharing a database table.
- **Contracts are public, internals are not.** Publish the API schema under
  `docs/api/`; keep everything else private to the service.
- **Shared code goes through `packages/`.** Two services needing the same logic
  is a signal to extract a package, not to copy the file.
- **Every service ships with** a health endpoint, structured logs, an
  `.env.example`, and a runbook in `docs/runbooks/`.

## Adding a service

1. `mkdir services/<name>` with a `package.json` named `@atlas/<name>-service`.
2. Add `infrastructure/docker/<name>.Dockerfile`.
3. Add manifests to `infrastructure/kubernetes/base/` and patch per environment
   in `infrastructure/kubernetes/overlays/`.
4. Register build, test, and image publish jobs in `.github/workflows/`.
