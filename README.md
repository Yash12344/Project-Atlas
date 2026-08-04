# Atlas

Multi-tenant SaaS platform. Turborepo monorepo: one Next.js application, a set of shared packages,
and PostgreSQL.

## Layout

```
Project-Atlas/
├── apps/web/           Next.js 16 — UI, Server Actions, and /api/v1
├── packages/
│   ├── types/          Branded ids, roles, error taxonomy, Zod primitives
│   ├── env/            Environment schemas, validated at process start
│   ├── logger/         Structured logging with redaction and correlation
│   ├── db/             Prisma schema, migrations, tenant-scoped client
│   ├── core/           Domain: identity, organizations, invitations, audit
│   ├── ui/             Design tokens and shared components
│   └── config/         TypeScript, ESLint, and Prettier presets
├── infrastructure/     Docker, Terraform, Kubernetes, ops scripts
├── docs/               Architecture, guides, API reference, runbooks
└── .github/            CI and repository automation
```

## Getting started

```bash
cp .env.example .env
pnpm install
pnpm docker:up          # PostgreSQL, with the two roles provisioned
pnpm db:deploy          # apply migrations
pnpm dev                # http://localhost:3000
```

Node version is pinned in [`.nvmrc`](.nvmrc); run `nvm use` to match it.

## Verification

```bash
pnpm lint               # ESLint, type-aware
pnpm typecheck          # tsc --noEmit across every workspace
pnpm test               # unit and integration, against real PostgreSQL
pnpm build              # production build
pnpm --filter @atlas/web test:e2e   # Playwright, against a production build
```

## How tenancy works

Atlas is a shared-schema multi-tenant system: one database, one set of tables, `organization_id` on
every tenant-scoped row.

The failure mode of that design is a forgotten `WHERE organization_id = ?`, which is not a bug but a
cross-tenant data breach. So application filtering is **not** the security boundary — PostgreSQL
row-level security is:

- Every tenant-scoped table has `FORCE ROW LEVEL SECURITY` and policies keyed on
  `current_setting('app.current_organization_id')`.
- The application connects as a role holding neither `SUPERUSER` nor `BYPASSRLS`. Migrations run as
  a separate owner role.
- All tenant access goes through `withTenant(...)`, which opens a transaction, sets the context
  transaction-locally, and runs the caller's work inside it. Transaction-local means it is safe
  behind a transaction-mode pooler.
- The application-level `where` clause stays too. If it is ever forgotten, RLS returns zero rows
  instead of another customer's data.

`packages/db/src/tenant.test.ts` asserts this against a real database, including the
unfiltered-`findMany` case.

## Architecture notes

- **Modular monolith.** One deployable; module boundaries live in `packages/core` and are enforced
  by lint. A module can be extracted into a service when load demands it, not before.
- **API first.** Domain functions in `@atlas/core` are the single implementation. The UI calls them
  directly; external clients reach the same functions over versioned REST. Errors follow RFC 9457
  problem details.
- **Owned authentication.** Argon2id at OWASP parameters, opaque session tokens stored only as
  SHA-256, separate idle and absolute lifetimes, and rate limiting on login and signup.
- **Identifiers** are prefixed UUIDv7 (`org_0199…`): time-ordered so index inserts stay sequential,
  self-describing in logs, and non-enumerable.

## Further reading

- [Specification set](docs/README.md) — the numbered documents
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
