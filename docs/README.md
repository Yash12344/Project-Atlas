# docs/

Written knowledge about Project Atlas. Cross-cutting material lives here;
anything specific to one component belongs in that component's `README.md`.

| Directory       | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `architecture/` | System design: components, boundaries, data flow                 |
| `architecture/adr/` | Architecture Decision Records — decisions and their reasons  |
| `guides/`       | How-to material for contributors: setup, workflow, testing       |
| `api/`          | Service API contracts and schemas                                |
| `runbooks/`     | Operational procedures: deploys, incidents, recovery             |

## What goes where

- Describing **how the system is shaped** → `architecture/`
- Recording **why we chose this over that** → `architecture/adr/`
- Teaching someone **how to do a task** → `guides/`
- Specifying **what a service exposes** → `api/`
- Telling an on-call engineer **what to do at 3am** → `runbooks/`

## Conventions

- Markdown, one topic per file, lowercase-hyphenated filenames.
- ADRs are numbered sequentially and never edited after acceptance — supersede
  them with a new ADR instead.
- Docs that describe code ship in the same pull request as that code.
