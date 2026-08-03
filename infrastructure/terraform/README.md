# Terraform

Cloud resources as code.

```
modules/         Reusable building blocks — network, cluster, database, IAM
environments/    One root module per environment, composing those modules
  dev/           Ephemeral, low-cost, safe to destroy
  staging/       Production-shaped, production-sized-down
  prod/          Live environment; changes require a reviewed plan
```

## Rules

- Modules are parameterized and account-agnostic. No hardcoded IDs or regions.
- State lives in a remote backend with locking. `*.tfstate` is git-ignored.
- `*.tfvars` is git-ignored; commit `*.tfvars.example` to document the inputs.
- Environments differ only in variable values, never in resource structure.
