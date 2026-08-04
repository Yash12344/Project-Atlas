# ADR-005: Zod for runtime validation

- **Status:** Accepted
- **Date:** 2026-08-04
- **Deciders:** Atlas engineering

## Context

TypeScript types are erased at runtime. Every value crossing into Atlas from outside — a form
submission, a JSON body, a query string, an environment variable, a row read back from the database
— is `unknown` in reality no matter what the signature claims.

The tempting failure is to declare an interface and assert the value matches it. That produces code
that type-checks and is wrong, and the wrongness surfaces somewhere unrelated to its cause.

So the requirement is validation at every boundary. The design question is whether the validator and
the type are one artifact or two. Two artifacts drift: someone adds a field to the interface and not
to the validator, and the compiler is satisfied while the runtime is not.

## Decision

**Zod 4, with types inferred from schemas rather than declared alongside them.**

A schema is the single source of truth for both the runtime check and the static type. Hand-writing
an interface next to a schema that describes the same data is forbidden.

## Options considered

| Option                  | Pros                                                                                                                                                          | Cons                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Zod** (chosen)        | One artifact yields validation and type. Transformations let normalisation live with validation. Ubiquitous, so it is the thing a new engineer already knows. | The largest bundle of the modern options. Notable `tsc` cost on large schemas. Meaningful API churn between majors. |
| **Valibot**             | Dramatically smaller when tree-shaken — the strongest option for client bundles. Similar ergonomics.                                                          | Younger, smaller ecosystem, fewer integrations.                                                                     |
| **ArkType**             | Very fast validation and impressive inference.                                                                                                                | Newer and less proven; unusual syntax raises the cost of onboarding.                                                |
| **TypeBox**             | JSON Schema native, so OpenAPI generation is close to free.                                                                                                   | More verbose for ordinary validation. Would be the better choice if generated API specs were the primary driver.    |
| **Hand-written guards** | No dependency, no bundle cost.                                                                                                                                | Every boundary reimplements the same checks, inconsistently. This is the status quo the decision rejects.           |

## Consequences

**What becomes easier.** Types and validation cannot disagree, because there is only one of them.
Normalisation lives with the schema — the email schema trims and lowercases before it validates, so
`" A@B.com "` and `a@b.com` cannot become two accounts, and that property holds at every call site
rather than at the ones someone remembered. Validation failures carry structured, per-field issues,
so one translator can render them into both a form and an RFC 9457 API response.

**What becomes harder, concretely:**

- **Bundle size is the real cost.** Zod is the heaviest of the credible options. Most Atlas
  validation is server-side, which is why the cost is acceptable today — but schemas imported by
  client components ship to the browser. If client bundle size becomes a problem, this is the first
  dependency to examine, and Valibot is the migration target.
- **API churn between majors is a live tax.** Zod 4 moved format validators to the top level and
  deprecated the chained forms. We wrote the original code against the old API and the linter
  rejected it the same day. Expect similar on the next major.
- **`.transform()` makes input and output types differ**, and that surprises people. Our email
  schema's input is any string; its output is a normalised one. Reading the inferred type tells you
  about the output, not what a caller may pass.
- **Type inference has a compile-time cost** that grows with schema size. It is not a problem at
  this scale, but it is a known Zod pain point in large codebases and worth watching in `tsc`
  timings rather than discovering later.

**The rule this establishes.** Parse at the edge; the domain layer receives already-valid data and
says so in its types. A domain function that re-validates its input is a sign the boundary is in the
wrong place.

**Revisit if.** Client bundle size becomes a measured problem, or generated OpenAPI specifications
become a primary deliverable — in which case TypeBox's JSON Schema nativeness changes the calculus.
Note that a migration would touch every boundary in the codebase, so the trigger should be a
measurement, not a preference.
