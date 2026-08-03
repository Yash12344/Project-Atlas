# 009 — Testing Guidelines

> **Status:** Placeholder — table of contents only. No content written yet.
> **Owner:** TBD
> **Last updated:** 2026-08-03

What we test, at which layer, and what must pass before code merges or ships.

## Table of contents

1. Testing philosophy
   1. What tests are for here
   2. Cost and confidence trade-offs
2. Test taxonomy
   1. Unit
   2. Integration
   3. Contract
   4. End-to-end
   5. Manual and exploratory
   6. Choosing the right layer
3. Toolchain
   1. Runners and assertion libraries
   2. Browser and mobile test tooling
   3. Local versus CI execution
4. Conventions
   1. File placement and naming
   2. Test structure and naming of cases
   3. Arrange-act-assert discipline
   4. Assertions worth making
5. Unit testing
   1. Scope of a unit
   2. Test doubles: when to mock and when not to
   3. Testing pure domain logic in `packages/core`
6. Integration testing
   1. Service plus datastore
   2. Ephemeral dependencies and containers
   3. Migration testing
7. Contract testing
   1. Provider and consumer responsibilities
   2. Schema compatibility checks
8. End-to-end testing
   1. Critical user journeys to cover
   2. Environment and data setup
   3. Keeping the suite small and stable
9. Test data
   1. Fixtures and factories
   2. Seeding and isolation
   3. Never using production data
10. Flakiness
    1. Detection
    2. Quarantine policy
    3. Root-cause expectations
11. Coverage
    1. Targets per workspace
    2. What coverage does and does not prove
12. Non-functional testing
    1. Performance and load
    2. Accessibility
    3. Security testing
    4. Visual regression
    5. AI capability evaluations
13. CI gates
    1. Required checks per pull request
    2. Pre-merge versus post-merge suites
    3. Handling a red main branch
14. Testing in production
    1. Smoke tests after deploy
    2. Canaries and feature flags
15. Checklist for a new feature
