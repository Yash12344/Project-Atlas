# @atlas/web

The Atlas application: user interface, Server Actions, and the versioned REST API — one deployable.

## Layout

```
src/
├── app/                Routes (App Router)
│   ├── (auth)/         Sign in and sign up
│   ├── (app)/          Authenticated shell
│   │   ├── organizations/   Organization picker
│   │   ├── onboarding/      First organization
│   │   └── [orgSlug]/       The tenant shell: overview, members, settings
│   ├── invitations/    Public acceptance page
│   └── api/            /api/health and /api/v1/*
├── server/             Server-only: session, context, actions, API helpers
├── components/         App-specific components
├── lib/                Client-safe helpers
└── proxy.ts            Edge redirect for unauthenticated traffic
```

## The rules that keep this honest

- **`src/server/context.ts` is the only place a cookie becomes an `Actor`.** Every protected page
  and action starts there. Nothing downstream re-derives identity, and the role is read fresh per
  request so revoking access takes effect immediately rather than at session expiry.
- **Business logic lives in `@atlas/core`.** Route handlers and Server Actions are transport: parse
  input, resolve an actor, call a domain function, shape the response.
- **`proxy.ts` is an optimisation, not a security boundary.** It runs on the edge runtime with no
  database, so it only checks for the _presence_ of a cookie. The authoritative check is
  `requireSession`.
- **API routes are never redirected.** An unauthenticated API request gets a 401 in RFC 9457 form;
  only page routes redirect to `/login`.

## Commands

```bash
pnpm --filter @atlas/web dev        # http://localhost:3000
pnpm --filter @atlas/web build
pnpm --filter @atlas/web test       # unit
pnpm --filter @atlas/web test:e2e   # Playwright, against a production build
```
