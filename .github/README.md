# .github/

Repository automation and collaboration metadata. GitHub reads these paths by
convention — files here change how the repo behaves, not what it builds.

| Path                     | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `workflows/`             | GitHub Actions pipelines (CI, and later release/deploy)   |
| `ISSUE_TEMPLATE/`        | Structured forms for bug reports and feature requests     |
| `PULL_REQUEST_TEMPLATE.md` | Checklist applied to every pull request                 |
| `CODEOWNERS`             | Automatic reviewer assignment per directory               |
| `dependabot.yml`         | Scheduled dependency and action update pull requests      |

## Workflow conventions

- Workflows are triggered by pull requests to `main` and pushes to `main`.
- Jobs are named after the workspace they cover so failures point at an owner.
- Anything that runs longer than a few minutes gets its own job so it can be
  cached and retried independently.
- Secrets come from repository or environment secrets — never from the
  workflow file.
