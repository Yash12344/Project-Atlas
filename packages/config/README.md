# @atlas/config

Shared tooling configuration consumed by every workspace.

**Status:** placeholder — no implementation yet.

## Contents (planned)

- `tsconfig/` — base, library, and application TypeScript presets
- `eslint/` — lint rules, including the import boundaries between workspaces
- `prettier/` — formatting preset

## Why

Config lives in one package so a rule change is one pull request instead of twenty, and so workspace
boundaries are enforced by lint rather than by habit.
