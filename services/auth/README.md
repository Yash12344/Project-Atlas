# @atlas/auth-service

Identity and access management.

**Status:** placeholder — no implementation yet.

## Responsibilities

- Registration, login, and credential handling
- Session and token issuance, refresh, and revocation
- Roles and permission checks
- Audit trail for authentication events

## Rules

Sole owner of the identity datastore. Other services verify tokens; they never
read auth tables directly. Secrets and signing keys come from the environment
or a secret manager — see `SECURITY.md`.
