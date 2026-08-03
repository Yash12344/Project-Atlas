# Security Policy

## Reporting a vulnerability

Do not open a public issue for security problems. Report them privately through
GitHub's [private vulnerability reporting][pvr] on this repository, or by
emailing the maintainers.

Please include: affected component (which `apps/`, `services/`, or `packages/`
directory), the version or commit, reproduction steps, and the impact you
observed.

You can expect an acknowledgement within three business days and a status
update at least every seven days until the issue is resolved.

[pvr]: https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability

## Supported versions

The project is pre-release. Only the `main` branch receives security fixes.

## Handling secrets

- Never commit real credentials. `.env` is git-ignored; `.env.example` holds
  key names with empty or placeholder values only.
- Terraform state and `*.tfvars` are git-ignored — state lives in a remote
  backend, secrets live in a secret manager.
- Secret scanning and dependency alerts are enabled; treat their findings as
  bugs with a due date.
