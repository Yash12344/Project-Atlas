# ADR-004: Turborepo for task orchestration

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Atlas engineering

## Context

Atlas is one application and seven packages in a single repository. That structure needs an answer
to three questions:

1. **Ordering** — the Prisma client must be generated before anything that type-checks against it.
2. **Selection** — a change to one package should not re-run every task in every other package.
3. **Consistency** — `pnpm lint` should mean the same thing at the root as it does inside a package,
   in CI as on a laptop.

pnpm workspaces already handle dependency resolution and linking. What they do not provide is a task
graph.

## Decision

**Turborepo, on top of pnpm workspaces.**

## Options considered

| Option                    | Pros                                                                                                                                                                                | Cons                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Turborepo** (chosen)    | Task graph and content-hashed caching for very little configuration. Understands workspace topology natively. Adds nothing to the runtime — remove it and the packages still build. | Environment variables must be declared per task or they are stripped. Cache correctness depends on declaring inputs and outputs accurately. Remote caching means Vercel or self-hosting. |
| **pnpm workspaces alone** | No extra tool. Already present.                                                                                                                                                     | No caching, no task graph, no selective execution. Adequate at eight packages; does not scale, and the ordering problem still needs solving by hand.                                     |
| **Nx**                    | More capable graph, generators, better large-repo tooling, richer analysis.                                                                                                         | Considerably more opinionated and a larger surface to learn. Its strengths address problems this repository does not have yet.                                                           |
| **Bazel / Pants**         | Genuinely hermetic, correct at any scale, polyglot.                                                                                                                                 | The cost of adopting it for a TypeScript-only repository of this size is not close to justified.                                                                                         |

## Consequences

**What becomes easier.** Ordering is declared once rather than remembered. Unchanged packages are
skipped, so the feedback loop stays short as the repository grows. Root-level scripts are thin
wrappers over the graph, so the same command means the same thing everywhere.

**What becomes harder, concretely — both of these cost us real time:**

- **Turborepo strips undeclared environment variables.** This is deliberate — it is what makes cache
  keys sound — but the failure is opaque. Our test tasks ran without `APP_URL`, so configuration
  validation threw at module load, and the test runner reported _"no test files found"_ rather than
  a missing variable. Anything a task's code reads at import time must be listed in `turbo.json`,
  and the symptom of forgetting is misleading.
- **`^task` and `task` are different, and the difference matters.** `^db:generate` means "the
  generate task of my _dependencies_" — it does not include the package's own. The database package
  lints its own source against its own generated client, so it needed both. With only the caret,
  linting raced generation and would have failed intermittently in CI while passing locally, which
  is the worst class of flake.
- **Cache correctness is a standing obligation.** Wrong `inputs` or `outputs` produce stale-cache
  bugs where a task is skipped that should have run. Those are hard to diagnose precisely because
  the symptom is _the absence_ of work. Any new task must declare both.

**What we deliberately did not adopt.** Remote caching. It is Turborepo's biggest lever, and it
requires either a Vercel account or self-hosting a cache server. Local caching plus GitHub Actions'
own dependency cache is sufficient at this size, and adding a hosted dependency to CI for a build
that takes seconds is not yet worth it.

**Revisit if.** The package count grows past what one person holds in their head, or CI wall-clock
time becomes a complaint — at which point remote caching is the first thing to turn on, and Nx
becomes worth re-evaluating for its stronger graph analysis.
