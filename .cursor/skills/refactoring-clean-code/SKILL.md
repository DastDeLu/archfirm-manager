---
name: refactoring-clean-code
description: Identifies code smells, proposes incremental restructurings aligned with SOLID and fitting design patterns, and explains trade-offs. Use when refactoring, improving maintainability, reducing coupling, simplifying modules, or when the user asks for clean code, SOLID, or design patterns.
---

# Refactoring and clean code

## Default stance

1. **Read before restructuring**: Map callers, data flow, and existing abstractions. Prefer changes that match naming, folder layout, and patterns already used in the same feature area.
2. **Small, verifiable steps**: Prefer a sequence of refactors (each leaving the codebase buildable and testable) over a single large rewrite unless the user explicitly wants a broad redesign.
3. **Behavior first**: Preserve observable behavior unless the user accepts a breaking change; call out API or contract impacts.
4. **Trade-offs in plain language**: Every suggestion should say what improves (coupling, testability, clarity) and what it costs (indirection, files, learning curve).

## Workflow

1. **Clarify goal** (if missing): readability, testability, performance, extensibility, or bug risk reduction.
2. **Locate smells** using the checklist below; note severity (blocks change / causes bugs vs. maintenance drag).
3. **Pick one primary lever**: usually extraction, inversion of dependency, or boundary clarification—not all at once.
4. **Tie to SOLID or a pattern** only when it genuinely fits; avoid forcing a pattern for its own sake.
5. **Propose concrete steps**: what to rename/move/extract, what tests to add or run, and what to defer.

## Code smells (quick signals)

| Smell | Typical issue | Direction (not prescriptive) |
|-------|----------------|------------------------------|
| Long method / class | Hard to test and reason about | Extract methods, split types by responsibility |
| Duplicated logic | Drift and inconsistent fixes | Extract shared function/module; consider parametrization vs. inheritance |
| Feature envy | Type reaches into another’s data | Move behavior closer to the data; clarify boundaries |
| Primitive obsession | Raw strings/arrays carry domain rules | Value objects, enums, small types |
| Shotgun surgery | One change touches many files | Cohesion: move related code together; façade only if boundaries are real |
| Divergent change | One class changes for unrelated reasons | Split responsibilities (SRP) |
| Large conditionals | Rules buried in branches | Polymorphism, strategy, table-driven rules, or early returns—pick what fits the codebase |
| Leaky abstraction | Internals exposed to callers | Narrow interfaces; hide construction behind factories/builders where useful |
| Tight coupling to concrete types | Hard to substitute or test | Depend on interfaces/protocols; inject dependencies |
| God object / module | Central grab-bag | Partition by domain or layer; define explicit public surfaces |

## SOLID (what to verify)

- **S**ingle responsibility: one reason to change per unit; split when change reasons diverge.
- **O**pen/closed: extend via new types or plugins rather than editing a growing switch—when extension is real, not hypothetical.
- **L**iskov substitution: subtypes honor contracts; no surprising weakening of pre/postconditions.
- **I**nterface segregation: small, focused surfaces; avoid “catch-all” interfaces.
- **D**ependency inversion: high-level policy should not depend on low-level details; both depend on abstractions **when indirection pays for itself** (multiple implementations, testing, or swappable infrastructure).

## Design patterns (fit, don’t force)

Use patterns when they **remove duplication, clarify ownership, or make extension cheaper**. Prefer the simplest structure that satisfies the actual (not imagined) churn.

| Pattern | Often fits when |
|---------|------------------|
| Strategy / policy | Swappable algorithms; replacing large conditionals **with real variability** |
| Factory / builder | Object creation is non-trivial or should stay centralized |
| Adapter | Integrating third-party or legacy APIs behind a stable internal interface |
| Facade | Simplifying a coarse subsystem for a narrow use case |
| Observer / pub-sub | Many react to events; loose coupling between producers and consumers |
| Repository | Persisted aggregates; hides storage details from domain/use-case layer |
| Decorator | Adding cross-cutting behavior to an interface without subclass explosion |
| Module / façade file | Package-level API for a folder; reduces import graph noise |

If the project already uses a pattern (e.g. hooks + context, service layer, event bus), **extend that pattern** before introducing a parallel style.

## How to present refactor suggestions

For each cluster of issues:

1. **Observation**: what the code is doing and why it’s hard to change or test.
2. **Smell / principle**: name 1–2 smells and the SOLID or structural principle most relevant.
3. **Proposal**: specific steps (extract X, introduce interface Y, move Z), ordered.
4. **Risks**: blast radius, migration path, and tests to run or add.
5. **Defer**: what not to refactor now and why.

Use severity language consistent with the rest of the conversation (e.g. must-fix vs. optional), without unnecessary emoji unless the user prefers it.

## Anti-patterns for this skill

- Rewriting working code for “purity” without a goal or failing tests.
- Introducing abstraction layers “for future flexibility” with no current callers or scenarios.
- Applying enterprise patterns in a small script or single-integration module without payoff.
- Ignoring project conventions to showcase a textbook.

## Additional resources

For extended catalogs of smells and refactorings ( Fowler-style ), rely on well-known references when depth helps; keep replies in-chat focused on the code at hand unless the user asks for theory.

