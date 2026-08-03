# @atlas/admin

Internal administration console for operators and support staff.

**Status:** placeholder — no implementation yet.

## Responsibilities

- Operational views: accounts, records, job status, audit trail
- Privileged actions gated by roles issued by `services/auth`

## Not responsible for

Customer-facing flows — those live in `apps/web`. Admin is deployed separately
and is expected to sit behind network restrictions and stronger authentication.
