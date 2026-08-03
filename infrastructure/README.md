# infrastructure/

Everything required to run Project Atlas somewhere other than a laptop. This is
the only place cloud resources, cluster manifests, and container builds are
defined — no app or service declares its own infrastructure inline.

| Directory     | Purpose                                                        |
| ------------- | -------------------------------------------------------------- |
| `terraform/`  | Cloud resources as code: networks, databases, clusters, IAM     |
| `kubernetes/` | Workload manifests, layered with Kustomize base + overlays      |
| `docker/`     | Dockerfiles and local `docker-compose` stacks                   |
| `scripts/`    | Operational scripts: bootstrap, migrate, seed, deploy helpers   |

## Terraform

```
terraform/
├── modules/          # Reusable building blocks (network, cluster, database)
└── environments/     # One root module per environment; composes modules
    ├── dev/
    ├── staging/
    └── prod/
```

State lives in a remote backend. `*.tfstate` and `*.tfvars` are git-ignored —
commit `*.tfvars.example` instead. Modules take variables; they never hardcode
account IDs, regions, or secrets.

## Kubernetes

```
kubernetes/
├── base/             # Environment-agnostic manifests per service
└── overlays/         # Kustomize patches: replicas, resources, hostnames
    ├── dev/
    ├── staging/
    └── prod/
```

Overlays only patch. If an overlay is redefining a whole manifest, the base is
wrong.

## Rules

- Environments differ by **configuration, not by code path**. `prod` runs the
  same manifests as `dev` with different values.
- Secrets are referenced, never stored. Use the cluster secret store or a cloud
  secret manager; `.env.example` documents key names only.
- Changes here follow the same review process as application code, and
  `prod` changes require a plan output in the pull request.
