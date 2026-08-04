# Architecture Decision Records

One file per decision that is expensive to reverse: a datastore, a protocol, a module boundary, a
language or framework choice.

## Index

| ID  | Title                                                                  | Status   |
| --- | ---------------------------------------------------------------------- | -------- |
| 001 | [Prisma as the data access layer](001-why-prisma.md)                   | Accepted |
| 002 | [PostgreSQL RLS as the tenant boundary](002-why-postgres-rls.md)       | Accepted |
| 003 | [A modular monolith rather than services](003-why-modular-monolith.md) | Accepted |
| 004 | [Turborepo for task orchestration](004-why-turborepo.md)               | Accepted |
| 005 | [Zod for runtime validation](005-why-zod.md)                           | Accepted |

## Process

1. Copy `000-template.md` to `NNN-short-title.md`, numbering sequentially.
2. Open it as `Proposed` in a pull request and link it from the description.
3. Once merged, set the status to `Accepted`.
4. Never rewrite an accepted ADR. Supersede it with a new one and mark the old record
   `Superseded by ADR-NNN`.

Numbers are permanent. A superseded record keeps its number.

## What makes one of these worth reading

The value is the _reasoning_, not the outcome. Anyone can read the code and see that Atlas uses
Prisma; what they cannot recover is which alternatives were weighed, what the decision cost, and
what would change the answer.

So every record here states the options that were rejected and why, and — the part most often
skipped — what became **harder** as a result. An ADR that lists only benefits is marketing, and it
gives a future reader no way to judge whether the trade still holds.
