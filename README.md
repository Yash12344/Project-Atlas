# Project Atlas

Monorepo for Project Atlas — client applications, shared libraries, backend
services, and the infrastructure that runs them, all in one place.

> **Status:** scaffold only. The directory tree, placeholder documents, and
> baseline configuration are in place; no features are implemented yet.

## Layout

```
Project-Atlas/
├── apps/             # Deployable end-user applications
├── packages/         # Shared libraries consumed by apps and services
├── services/         # Independently deployable backend services
├── infrastructure/   # Terraform, Kubernetes, Docker, and ops scripts
├── docs/             # Architecture, guides, API reference, runbooks
└── .github/          # CI workflows, issue/PR templates, repo automation
```

Each top-level directory has its own `README.md` explaining what belongs in it
and what does not.

## Getting started

```bash
git clone https://github.com/yash12344/project-atlas.git
cd project-atlas
cp .env.example .env
pnpm install     # workspaces are declared in pnpm-workspace.yaml
```

Node version is pinned in [`.nvmrc`](.nvmrc). Run `nvm use` to match it.

## Conventions

- **Workspace boundaries.** `apps/` and `services/` may depend on `packages/`.
  `packages/` must never depend on an app or a service.
- **One deployable per directory.** Anything under `apps/` or `services/` owns
  its own `package.json`, Dockerfile, and deployment manifests.
- **Docs live next to decisions.** Cross-cutting design goes in `docs/`;
  component-specific notes go in that component's `README.md`.

## Further reading

- [Architecture overview](docs/architecture/README.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
