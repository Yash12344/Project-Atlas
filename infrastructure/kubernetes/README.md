# Kubernetes

Workload manifests, layered with Kustomize.

```
base/            Environment-agnostic Deployments, Services, ConfigMaps
overlays/        Per-environment patches
  dev/           Single replica, relaxed resource limits
  staging/       Production topology at reduced scale
  prod/          Full replicas, autoscaling, strict limits
```

## Rules

- `base/` must be deployable on its own; overlays only patch it.
- An overlay that replaces a whole manifest means the base is wrong — fix the base instead.
- Secrets are referenced from the cluster secret store, never committed here.
