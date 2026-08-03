# packages/

Shared libraries. Nothing here is deployed on its own — packages are consumed
by `apps/` and `services/` through the workspace as `@atlas/<name>`.

| Directory     | Purpose                                                            |
| ------------- | ------------------------------------------------------------------ |
| `core/`       | Domain models, entities, and business rules — the shared vocabulary |
| `api-client/` | Typed client for the Atlas HTTP/gRPC APIs                          |
| `ui/`         | Reusable UI components, design tokens, and styles                  |
| `utils/`      | Small cross-cutting helpers (dates, IDs, results, validation)      |
| `config/`     | Shared tooling config: TypeScript, ESLint, Prettier presets        |

## Rules

- **Dependencies point inward.** Packages may depend on other packages; they may
  never depend on an app or a service.
- **Public surface is explicit.** Export through the package entry point only;
  consumers must not deep-import internal files.
- **Framework-free where possible.** `core/` and `utils/` stay runtime-agnostic
  so both browser apps and Node services can use them. UI-framework code is
  confined to `ui/`.
- A package earns its place when a second consumer needs it. One consumer means
  the code should stay where it is.

## Versioning

Packages are versioned with the monorepo and consumed via `workspace:*`. Nothing
here publishes to a public registry without an ADR.
