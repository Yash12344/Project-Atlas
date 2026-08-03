# Ops scripts

Operational helpers that support deployment and local development.

## Contents (planned)

- `bootstrap.sh` — prepare a fresh checkout or workstation
- `migrate.sh` — run database migrations against a target environment
- `seed.sh` — load development fixtures
- `deploy.sh` — thin wrapper over the deploy pipeline

## Rules

- POSIX shell or Python, executable, with a usage header.
- Fail fast: `set -euo pipefail`.
- Take the target environment as an explicit argument — never default to `prod`.
