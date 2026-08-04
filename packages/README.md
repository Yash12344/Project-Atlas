# packages/

Shared libraries, consumed through the workspace as `@atlas/<name>`. Nothing here is deployed on its
own.

Internal packages ship **TypeScript source**, not a build artifact: the app transpiles them
(`transpilePackages` in `next.config.ts`). That removes a build step from the dependency graph and
the class of bug where a stale `dist/` disagrees with its source.

| Directory | Purpose                                                            |
| --------- | ------------------------------------------------------------------ |
| `types/`  | Branded ids, roles and permissions, error taxonomy, Zod primitives |
| `env/`    | Environment schemas, validated once at process start               |
| `logger/` | Structured logging with redaction and request-scoped correlation   |
| `db/`     | Prisma schema, migrations, and the tenant-scoped client            |
| `core/`   | Domain modules: identity, organizations, invitations, audit        |
| `ui/`     | Design tokens and the shared component library                     |
| `config/` | TypeScript, ESLint, and Prettier presets                           |

## Dependency direction

```
config ← (tooling only)
types  ← env ← logger ← db ← core ← ui/web
```

Dependencies point inward. `types` knows about nothing; `core` knows about `db`, `logger`, `env`,
and `types`; nothing in `packages/` may import an app. The last rule is enforced by
`no-restricted-imports` in `packages/config/eslint/base.js`, not by convention.

## The two rules that matter most

1. **Tenant data is reached only through `withTenant`.** The unscoped Prisma client cannot see
   tenant tables at all — row-level security denies it — so the boundary is enforced by PostgreSQL
   rather than by reviewer diligence.
2. **`core` is framework-free.** It runs in a request handler, a background job, or a test with no
   fake request. That is what makes it testable without mocking the database.
