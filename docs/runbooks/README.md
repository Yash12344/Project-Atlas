# Runbooks

Procedures for operating Atlas in production. Written for someone under pressure who has not read
the code.

**Status:** placeholder — no runbooks written yet.

## Planned runbooks

- `deploy.md` — releasing a service, and verifying the release
- `rollback.md` — reverting a bad deploy
- `incident-response.md` — severity levels, roles, communication
- `database-restore.md` — restoring from backup, with expected timings
- `on-call.md` — rotation, escalation path, alert catalogue

## Style

Every runbook states: symptoms, immediate mitigation, diagnosis steps, full resolution, and how to
verify recovery. Commands are copy-pasteable and name the environment explicitly.
