# Architecture diagrams

Five views of Atlas. Each one exists to make a specific mechanism legible, not to restate the
directory tree.

The dependency edges below are derived from the workspace manifests, and the pipeline from
`.github/workflows/ci.yml` and `turbo.json`. When those change, change these.

---

## 1. Package dependency graph

Solid edges are runtime dependencies. Dotted edges are tooling only — `@atlas/config` supplies
TypeScript, ESLint, and Prettier presets, and ships no runtime code.

```mermaid
flowchart TD
  subgraph app["apps/"]
    WEB["@atlas/web<br/><i>UI · Server Actions · /api/v1</i>"]
  end

  subgraph domain["packages/ — domain"]
    CORE["@atlas/core<br/><i>identity · organizations<br/>invitations · audit</i>"]
    DB["@atlas/db<br/><i>schema · migrations<br/>tenant boundary</i>"]
  end

  subgraph foundation["packages/ — foundation"]
    TYPES["@atlas/types<br/><i>ids · roles · errors</i>"]
    ENV["@atlas/env<br/><i>validated config</i>"]
    LOG["@atlas/logger<br/><i>structured logs</i>"]
  end

  subgraph presentation["packages/ — presentation"]
    UI["@atlas/ui<br/><i>tokens · components</i>"]
  end

  subgraph tooling["packages/ — tooling"]
    CFG["@atlas/config<br/><i>tsconfig · eslint · prettier</i>"]
  end

  WEB --> CORE
  WEB --> DB
  WEB --> UI
  WEB --> TYPES
  WEB --> ENV
  WEB --> LOG

  CORE --> DB
  CORE --> TYPES
  CORE --> ENV
  CORE --> LOG

  DB --> TYPES
  DB --> ENV
  DB --> LOG

  LOG --> ENV

  CFG -.-> WEB
  CFG -.-> CORE
  CFG -.-> DB
  CFG -.-> UI
  CFG -.-> TYPES
  CFG -.-> ENV
  CFG -.-> LOG

  classDef boundary fill:#fde8e8,stroke:#c53030,stroke-width:2px
  class DB boundary
```

**What to notice.** The graph is acyclic and points one way. `@atlas/types`, `@atlas/env`, and
`@atlas/ui` are leaves with no internal runtime dependencies, which is what makes them safe to
import from anywhere including the browser. No package depends on `@atlas/web` — that edge is
rejected by an ESLint rule in `@atlas/config`, so the direction is enforced rather than merely
documented.

`@atlas/db` is highlighted because it is the tenant boundary. Every path from the app to customer
data passes through it.

---

## 2. Request lifecycle

An authenticated page request. The same shape holds for a REST call; only the error rendering
differs.

```mermaid
sequenceDiagram
  autonumber
  actor U as Browser
  participant PX as proxy.ts<br/>(edge)
  participant PG as Page<br/>(server component)
  participant CX as server/context.ts
  participant CO as @atlas/core
  participant DB as @atlas/db
  participant PSQL as PostgreSQL

  U->>PX: GET /acme/members
  Note over PX: Cookie present?<br/>Presence only — no DB, no crypto.
  alt no session cookie
    PX-->>U: 307 → /login?next=/acme/members
  else cookie present
    PX->>PG: forward
  end

  PG->>CX: requireOrganization("acme")
  CX->>CO: validate session token
  CO->>DB: look up session by token hash
  DB->>PSQL: SELECT … (no tenant tables involved)
  PSQL-->>DB: session row
  Note over CX: Session valid?<br/>Checks idle AND absolute expiry.

  CX->>CO: findMembershipBySlug(user, "acme")
  CO->>DB: withUser(userId) …
  DB->>PSQL: membership + organization
  PSQL-->>DB: membership or nothing
  alt not a member
    CX-->>U: 404 — indistinguishable from "no such org"
  else member
    CX-->>PG: Actor {userId, organizationId, role}
  end

  PG->>CO: listMembers(actor)
  Note over CO: assertPermission(actor, "member:read")
  CO->>DB: withTenant(actor) …
  DB->>PSQL: BEGIN · set context · SELECT · COMMIT
  PSQL-->>DB: rows for this tenant only
  DB-->>CO: members
  CO-->>PG: page of members
  PG-->>U: rendered HTML
```

**What to notice.** Authorization happens twice, deliberately, at two different levels.
`assertPermission` decides whether this _role_ may perform this _operation_. Row-level security
decides which _rows_ exist at all. Neither substitutes for the other: permissions without RLS leak
across tenants on a missing filter; RLS without permissions lets any member delete anything inside
their own tenant.

Note also that the role is read on every request rather than cached in the session. Revoking
someone's access takes effect on their next request, not whenever their session happens to expire.

---

## 3. Authentication flow

Login, including both failure branches. Signup follows the same shape with a per-address limit and
no credential check.

```mermaid
sequenceDiagram
  autonumber
  actor U as Browser
  participant AC as loginAction
  participant RL as rate limiter
  participant ID as identity
  participant SE as sessions
  participant PSQL as PostgreSQL

  U->>AC: POST email + password

  AC->>RL: consume(ip)
  RL->>PSQL: atomic upsert + increment
  alt address over limit
    RL-->>AC: RateLimitError
    AC-->>U: "Too many attempts" + retry-after
  end

  AC->>ID: authenticate(email, password)
  ID->>PSQL: find user by email

  alt no such account
    Note over ID: Verify against a dummy hash anyway.<br/>Equal wall-clock cost, so latency<br/>is not an account-existence oracle.
    ID-->>AC: UnauthenticatedError
  else account exists
    Note over ID: Verify credential.
    alt wrong password
      ID-->>AC: UnauthenticatedError
    else correct
      Note over ID: Stored parameters below policy?<br/>Upgrade now — the plaintext is<br/>in hand exactly once.
      ID-->>AC: user
    end
  end

  alt authentication failed
    AC->>RL: consume(email)
    Note over RL: Consumed on failure only.<br/>Counting successes would let anyone<br/>lock out a known address.
    AC-->>U: "Incorrect email or password"
  else authenticated
    AC->>RL: clear(email)
    AC->>SE: createSession(user)
    Note over SE: New session row, always.<br/>A token fixed before login is<br/>never the one that ends up valid.
    SE->>PSQL: store SHA-256 of token
    SE-->>AC: opaque token
    AC-->>U: Set-Cookie (HttpOnly, SameSite=Lax)<br/>redirect to organization
  end
```

**What to notice.** Both failure messages are identical, and both cost the same time. The cookie
carries an opaque token and nothing else — no user id, no role, no organization. Anything placed in
a cookie is attacker-controlled input on the next request, so every attribute of the session is read
from the database where the client cannot edit it.

---

## 4. Tenant isolation flow

The mechanism that makes shared-schema multi-tenancy safe.

```mermaid
sequenceDiagram
  autonumber
  participant CO as @atlas/core
  participant DB as withTenant()
  participant PSQL as PostgreSQL<br/>(role: atlas_app)

  CO->>DB: withTenant({organizationId, userId}, fn)
  DB->>PSQL: BEGIN
  DB->>PSQL: set_config('app.current_organization_id', …, LOCAL)
  DB->>PSQL: set_config('app.current_user_id', …, LOCAL)
  Note over PSQL: LOCAL = transaction-scoped.<br/>Discarded on commit or rollback, so the<br/>setting cannot leak to the next request<br/>sharing this pooled connection.

  DB->>PSQL: SELECT * FROM memberships
  Note over PSQL: Policy rewrites the query:<br/>… WHERE organization_id =<br/>current_setting('app.current_organization_id')
  PSQL-->>DB: this tenant's rows only

  DB->>PSQL: COMMIT
  DB-->>CO: result
```

And the property that matters — what happens when the context is missing or wrong:

```mermaid
flowchart TD
  Q["Query reaches PostgreSQL"] --> R{"Is the connecting role<br/>subject to RLS?"}
  R -->|"atlas_app: no SUPERUSER,<br/>no BYPASSRLS"| P{"Is a tenant context set<br/>for this transaction?"}
  R -->|"owner role"| F["FORCE ROW LEVEL SECURITY<br/>binds the owner too"]
  F --> P

  P -->|"unset"| N["current_setting returns NULL<br/>NULL comparison is never true"]
  P -->|"set"| M{"Does the row's organization_id<br/>match the context?"}

  N --> ZERO["Zero rows"]
  M -->|"no"| ZERO
  M -->|"yes"| ROWS["Row is visible"]

  ZERO --> SAFE["Worst case of a forgotten<br/>filter is an empty result,<br/>never another customer's data"]

  classDef safe fill:#e6f6ec,stroke:#2f855a,stroke-width:2px
  classDef allowed fill:#eef2ff,stroke:#4338ca,stroke-width:2px
  class SAFE,ZERO safe
  class ROWS allowed
```

**What to notice.** The design fails closed. An unscoped connection sees nothing rather than
everything, which inverts the usual risk: the bug you ship is a visible empty screen, not a silent
cross-tenant leak.

Two invariants hold this up, and CI asserts the first before running any test:

1. The runtime role holds neither `SUPERUSER` nor `BYPASSRLS`.
2. Tenant data is reached only through the scoping helpers in `@atlas/db`.

There are two deliberate exceptions, both narrow. `withUser` binds only the acting user, for the
genuinely cross-tenant question "which organizations do I belong to?" asked at login before any
tenant is chosen. The invitation helpers bind a token hash, because an invitee is by definition not
yet a member and has no tenant context — possession of the token is the authorization.

---

## 5. Build pipeline

Turborepo task graph on the left, CI jobs on the right.

```mermaid
flowchart LR
  subgraph turbo["turbo task graph"]
    direction TB
    GEN["db:generate<br/><i>cached on schema.prisma</i>"]
    GEN --> LINT["lint"]
    GEN --> TC["typecheck"]
    GEN --> TEST["test"]
    GEN --> BUILD["build"]
  end

  subgraph ci["GitHub Actions"]
    direction TB
    subgraph verify["job: verify"]
      direction TB
      V1["checkout · pnpm · node"]
      V2["install --frozen-lockfile"]
      V3["provision atlas_owner<br/>and atlas_app roles"]
      V4["assert atlas_app cannot<br/>bypass RLS"]
      V5["db:generate · db:deploy"]
      V6["format:check"]
      V7["lint"]
      V8["typecheck"]
      V9["test<br/><i>75 tests, real PostgreSQL</i>"]
      V10["build"]
      V1 --> V2 --> V3 --> V4 --> V5 --> V6 --> V7 --> V8 --> V9 --> V10
    end

    subgraph e2e["job: e2e"]
      direction TB
      E1["install · provision · migrate"]
      E2["install Chromium"]
      E3["build"]
      E4["playwright test<br/><i>against a production build</i>"]
      E5["upload traces on failure"]
      E1 --> E2 --> E3 --> E4 --> E5
    end

    verify --> e2e
  end

  turbo -.->|"invoked by"| ci

  classDef gate fill:#fef3c7,stroke:#b45309,stroke-width:2px
  class V4 gate
```

**What to notice.** Step `V4` is a gate, not a formality: it fails the build if the application role
can bypass row-level security. If that check ever passes silently, every isolation guarantee in the
repository is void, so it runs before any test that would otherwise appear to prove isolation works.

The end-to-end suite runs against a production build rather than the dev server. Dev mode differs in
bundling, static optimisation, and error handling, so a smoke test that only passes under `next dev`
proves less than it looks like it does.

Both jobs provision the two database roles explicitly, because a GitHub Actions service container
cannot run the init scripts that `infrastructure/docker/postgres/init` provides locally.
