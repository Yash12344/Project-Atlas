# apps/

End-user applications. Each subdirectory is a **separately deployable client**
with its own `package.json`, build pipeline, and release cadence.

| Directory | Purpose                                                        |
| --------- | -------------------------------------------------------------- |
| `web/`    | Primary customer-facing web application                        |
| `admin/`  | Internal console for operators and support staff               |
| `mobile/` | Cross-platform mobile client (iOS + Android)                   |

## Rules

- An app **presents**; it does not own business logic. Domain rules live in
  `packages/core/`, transport in `packages/api-client/`, widgets in
  `packages/ui/`.
- Apps may depend on `packages/*`. Apps must **not** import from other apps or
  reach into a service's source tree — talk to services over their public API.
- Anything an app copies from a sibling app twice belongs in `packages/`.

## Adding an app

1. `mkdir apps/<name>` and add a `package.json` named `@atlas/<name>`.
2. Extend `tsconfig.base.json` from the repo root.
3. Add a `README.md` covering how to run, build, and deploy it.
4. Add its build and test jobs to `.github/workflows/ci.yml`.
