# Contributing to Project Atlas

## Where does my change go?

| I am adding…                                | Put it in…              |
| ------------------------------------------- | ----------------------- |
| A user-facing application                   | `apps/<name>/`          |
| Code shared by two or more apps or services | `packages/<name>/`      |
| A deployable backend service                | `services/<name>/`      |
| Terraform, manifests, Dockerfiles, ops      | `infrastructure/`       |
| Design notes, guides, runbooks              | `docs/`                 |
| CI, templates, repo automation              | `.github/`              |

Shared code (`packages/`) must not import from `apps/` or `services/`. If a
package needs something from an app, that something belongs in the package.

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

Anything that is hard to reverse — a datastore, a protocol, a boundary between
services — gets an ADR in `docs/architecture/adr/`. Copy `adr/0000-template.md`,
number it sequentially, and link it from the pull request.

## Reviews

At least one approval is required. Reviewers check that the change lands in the
right workspace, respects the dependency direction, and ships with tests and
documentation appropriate to its size.
