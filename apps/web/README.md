# @atlas/web

Primary customer-facing web application.

**Status:** placeholder — no implementation yet.

## Responsibilities

- Render the public Atlas experience
- Authenticate users against `services/auth` via `@atlas/api-client`
- Compose UI from `@atlas/ui`; apply domain rules from `@atlas/core`

## Not responsible for

Business rules, persistence, or direct database access. The app speaks only to
`services/api-gateway`.

## Getting started

```bash
pnpm --filter @atlas/web dev     # once a dev server is added
```
