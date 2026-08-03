# @atlas/utils

Small, dependency-light helpers shared across the monorepo.

**Status:** placeholder — no implementation yet.

## Scope

Dates and durations, ID generation, result/error types, guards and parsing,
string and collection helpers.

## Rules

Every export is pure, individually testable, and independently importable. If a
helper needs domain knowledge, it belongs in `@atlas/core`, not here. This
package is deliberately boring — resist the urge to make it a junk drawer.
