# 010 — DevOps

> **Status:** Placeholder — table of contents only. No content written yet.
> **Owner:** TBD
> **Last updated:** 2026-08-03

How Atlas is built, deployed, observed, and operated. Implementation lives in
`infrastructure/` and `.github/workflows/`; runbooks live in `docs/runbooks/`.

## Table of contents

1. Goals and operating principles
2. Environments
   1. Local development
   2. Development
   3. Staging
   4. Production
   5. Parity rules and permitted differences
3. Source control and branching
   1. Branching model
   2. Protected branches and required checks
   3. Release branches and tagging
4. Build
   1. Build tooling and caching
   2. Reproducibility
   3. Artifact naming and retention
5. Continuous integration
   1. Pipeline stages
   2. Required checks
   3. Runtime budget and parallelism
   4. Handling failures
6. Continuous delivery
   1. Promotion flow across environments
   2. Approval gates
   3. Deployment strategies: rolling, blue-green, canary
   4. Database migrations during deploy
   5. Rollback procedure
   6. Feature flags and dark launches
7. Containers
   1. Base images and hardening
   2. Multi-stage build conventions
   3. Registry, tagging, and retention
   4. Vulnerability scanning
8. Infrastructure as code
   1. Terraform workflow
   2. Plan review requirements
   3. State management and locking
   4. Drift detection
9. Kubernetes operations
   1. Base and overlay conventions
   2. Resource requests and limits
   3. Autoscaling
   4. Health checks and probes
10. Configuration and secrets
    1. Configuration sources and precedence
    2. Secret storage and injection
    3. Rotation
11. Observability
    1. Logging pipeline
    2. Metrics and dashboards
    3. Distributed tracing
    4. Service level objectives
    5. Alerting rules and routing
12. Reliability operations
    1. On-call rotation
    2. Incident severity and response
    3. Postmortems
    4. Error budgets
13. Backup and disaster recovery
    1. Backup coverage
    2. RTO and RPO targets
    3. Recovery drills
14. Capacity and cost
    1. Capacity planning
    2. Cost monitoring and attribution
    3. Optimization review cadence
15. Access control
    1. Production access policy
    2. Break-glass procedure
    3. Audit logging
16. Maintenance
    1. Dependency and platform upgrades
    2. Certificate renewal
    3. Scheduled maintenance windows
