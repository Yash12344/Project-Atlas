# Contributing to Project Atlas

## Where does my change go?

| I am adding…                            | Put it in…                   |
| --------------------------------------- | ---------------------------- |
| A page, route handler, or Server Action | `apps/web/src/`              |
| A business rule or domain operation     | `packages/core/src/<module>` |
| A shared component or design token      | `packages/ui/src/`           |
| A schema change or migration            | `packages/db/prisma/`        |
| Terraform, manifests, Dockerfiles, ops  | `infrastructure/`            |
| Design notes, guides, runbooks          | `docs/`                      |
| CI, templates, repo automation          | `.github/`                   |

Shared code (`packages/`) must not import from `apps/`; the lint config rejects it. If a package
needs something from an app, that something belongs in the package.

Business logic belongs in `packages/core`, not in a route handler or a Server Action. Those are
transport: they parse input, resolve an `Actor`, call a domain function, and shape the response.

## Workflow

1. Branch from `main` using `feat/…`, `fix/…`, `docs/…`, or `chore/…`.
2. Make the change, keeping it scoped to one concern.
3. Run `pnpm lint && pnpm typecheck && pnpm test` before pushing.
4. Open a pull request and fill in the template.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add refresh token rotation
fix(web): correct pagination offset
docs(architecture): record ADR-0002
```

Scope should be the workspace directory name where practical.

## Architecture decisions

Anything that is hard to reverse — a datastore, a protocol, a module boundary — gets an ADR in
`docs/adr/`. Copy `000-template.md`, number it sequentially, and link it from the pull request.

## Reviews

At least one approval is required. Reviewers check that the change lands in the right workspace,
respects the dependency direction, and ships with tests and documentation appropriate to its size.
