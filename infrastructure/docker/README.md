# Docker

Container builds and local development stacks.

## Contents (planned)

- `<service>.Dockerfile` — one multi-stage build per deployable service
- `docker-compose.yml` — local stack: services plus their datastores

## Rules

- Multi-stage builds; ship a minimal, non-root runtime image.
- Build context is the repo root so workspace packages resolve; keep `.dockerignore` tight to avoid
  shipping `node_modules` and build output.
- No secrets in build args or image layers.
