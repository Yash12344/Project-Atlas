# 004 — Coding Standards

> **Status:** Placeholder — table of contents only. No content written yet. **Owner:** TBD **Last
> updated:** 2026-08-03

How code in this repository is written, organized, reviewed, and merged.

## Table of contents

1. Scope and enforcement
   1. What is automated versus reviewed by humans
   2. How to propose a change to these standards
2. Languages and runtimes
   1. Supported versions
   2. Language feature policy
3. Repository organization
   1. Where code belongs (`apps`, `packages`, `services`)
   2. Module and file layout within a workspace
   3. Import boundaries
4. Naming conventions
   1. Files and directories
   2. Variables, functions, and types
   3. Packages and workspace names
5. Type safety
   1. Strictness settings
   2. Handling unknown and external data
   3. When `any` and escape hatches are acceptable
6. Functions and modules
   1. Size and responsibility
   2. Public surface and exports
   3. Dependency injection and testability
7. Error handling
   1. Error types and taxonomy
   2. Throwing versus returning results
   3. Error messages and user-facing text
8. Logging
   1. Structured log format
   2. Levels and when to use them
   3. What must never be logged
9. Asynchrony and concurrency
10. Comments and documentation
    1. When a comment earns its place
    2. Doc comments on public APIs
    3. TODO and FIXME policy
11. Formatting and linting
    1. Toolchain
    2. Editor setup
    3. Pre-commit hooks
12. Dependencies
    1. Criteria for adding one
    2. Version pinning and updates
13. Git conventions
    1. Branch naming
    2. Conventional commit format
    3. Rebasing, squashing, and history hygiene
14. Code review
    1. Author responsibilities
    2. Reviewer checklist
    3. Approval and merge rules
15. Deprecation and removal
16. References
