# docs/

Written knowledge about Project Atlas. Cross-cutting material lives here; anything specific to one
component belongs in that component's `README.md`.

## Specifications

The numbered documents are the standing specification set. Start at `000`, which maps the rest.
**All eleven are currently placeholders — table of contents only, no content written yet.**

| Document                                                              | Covers                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [000 — Master Implementation Spec](000-MASTER_IMPLEMENTATION_SPEC.md) | Scope, phases, milestones, document map, definition of done            |
| [001 — Vision](001-VISION.md)                                         | Problem, users, goals and non-goals, success metrics, roadmap          |
| [002 — System Architecture](002-SYSTEM_ARCHITECTURE.md)               | Components, boundaries, data flow, cross-cutting concerns              |
| [003 — Database Architecture](003-DATABASE_ARCHITECTURE.md)           | Datastores, ownership, schema, migrations, retention, backup           |
| [004 — Coding Standards](004-CODING_STANDARDS.md)                     | Style, structure, errors, logging, git and review conventions          |
| [005 — Design System](005-DESIGN_SYSTEM.md)                           | Tokens, components, patterns, accessibility, content voice             |
| [006 — AI Engine](006-AI_ENGINE.md)                                   | Capabilities, models, prompts, retrieval, evals, guardrails, cost      |
| [007 — Security](007-SECURITY.md)                                     | Threat model, authn/authz, data protection, secrets, incident response |
| [008 — API Guidelines](008-API_GUIDELINES.md)                         | Style, errors, pagination, versioning, deprecation                     |
| [009 — Testing Guidelines](009-TESTING_GUIDELINES.md)                 | Test layers, data, coverage, flakiness, CI gates                       |
| [010 — DevOps](010-DEVOPS.md)                                         | Environments, CI/CD, IaC, observability, reliability, cost             |

Numbers are permanent identifiers — a retired document keeps its number and is marked superseded
rather than being renumbered.

## Directories

| Directory           | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `architecture/`     | System design: components, boundaries, data flow            |
| `architecture/adr/` | Architecture Decision Records — decisions and their reasons |
| `guides/`           | How-to material for contributors: setup, workflow, testing  |
| `api/`              | Service API contracts and schemas                           |
| `runbooks/`         | Operational procedures: deploys, incidents, recovery        |

## What goes where

- Setting a **standing rule or specification** → the numbered document above
- Describing **how the system is shaped** → `architecture/`
- Recording **why we chose this over that** → `architecture/adr/`
- Teaching someone **how to do a task** → `guides/`
- Specifying **what a service exposes** → `api/`
- Telling an on-call engineer **what to do at 3am** → `runbooks/`

## Conventions

- Markdown, one topic per file. Numbered specs use `NNN-SCREAMING_SNAKE.md`; everything else is
  lowercase-hyphenated.
- Every numbered spec carries a status, owner, and last-updated line at the top.
- ADRs are numbered sequentially and never edited after acceptance — supersede them with a new ADR
  instead.
- Docs that describe code ship in the same pull request as that code.
