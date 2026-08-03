# 006 — AI Engine

> **Status:** Placeholder — table of contents only. No content written yet.
> **Owner:** TBD
> **Last updated:** 2026-08-03

The AI capabilities inside Project Atlas: what they do, how they are built,
and how their quality, cost, and safety are controlled.

## Table of contents

1. Scope and objectives
   1. Problems AI is solving here
   2. Where AI is deliberately not used
2. Capabilities
   1. Capability inventory
   2. User-facing behavior per capability
   3. Success criteria per capability
3. Architecture
   1. Position within the system
   2. Request lifecycle
   3. Synchronous versus background inference
   4. Interfaces exposed to apps and services
4. Model strategy
   1. Model selection criteria
   2. Model registry and versioning
   3. Fallback and degradation behavior
   4. Migration process when models change
5. Prompting
   1. Prompt structure and conventions
   2. Prompt storage, versioning, and review
   3. Templating and variable injection
   4. Output format and parsing
6. Context and retrieval
   1. Data sources
   2. Chunking and indexing
   3. Retrieval strategy and ranking
   4. Context window budgeting
   5. Freshness and invalidation
7. Tool use and orchestration
   1. Tool catalogue and schemas
   2. Multi-step and agentic flows
   3. Loop limits and termination conditions
8. State and memory
9. Evaluation
   1. Evaluation datasets
   2. Offline evaluation
   3. Online evaluation and feedback signals
   4. Regression gates in CI
10. Safety and guardrails
    1. Input validation and injection defenses
    2. Output filtering
    3. Handling untrusted retrieved content
    4. Human-in-the-loop requirements
    5. Abuse prevention
11. Privacy and data handling
    1. What is sent to model providers
    2. Retention and training opt-out
    3. Redaction of sensitive data
12. Performance and cost
    1. Latency budgets
    2. Caching strategy
    3. Token and spend budgets
    4. Rate limits and backpressure
13. Observability
    1. Tracing an inference request
    2. Quality and cost dashboards
    3. Alerting
14. Failure modes and recovery
15. Open questions
