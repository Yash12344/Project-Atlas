# @atlas/api-gateway-service

The single public entry point to Atlas. Everything external enters here.

**Status:** placeholder — no implementation yet.

## Responsibilities

- Route requests to internal services
- Enforce authentication (verifying tokens issued by `services/auth`)
- Rate limiting, request validation, and API versioning
- Assign correlation IDs for tracing across services

## Rules

No business logic and no database of its own. If the gateway needs to decide
something about the domain, that decision belongs in a downstream service.
