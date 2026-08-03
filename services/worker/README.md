# @atlas/worker-service

Asynchronous work: queue consumers, scheduled jobs, and long-running tasks.

**Status:** placeholder — no implementation yet.

## Responsibilities

- Consume domain events published by other services
- Scheduled maintenance: cleanup, aggregation, reporting
- Retries, backoff, and dead-letter handling

## Rules

Jobs must be idempotent — every message can arrive more than once. No inbound
public traffic; the worker is not routed through the gateway.
