---
name: software-architecture
description: Shapes systems using layered and ports-and-adapters style boundaries, SOLID at the module level, and appropriate design patterns so dependencies point inward and features stay testable. Use when designing new subsystems, drawing module boundaries, reviewing folder structure, choosing between patterns, or when the user mentions Clean Architecture, hexagonal architecture, onion, DDD, or maintainable design.
---

# Software architecture

## Default stance

1. **Match the problem’s scale**: a small SPA or internal tool rarely needs full enterprise layering; still apply the **dependency rule** and clear boundaries where complexity justifies it.
2. **Respect the codebase**: extend existing folder and import conventions; introduce new layers only with a named purpose and stable public surface.
3. **Make costs explicit**: every abstraction and indirection should earn its keep (multiple implementations, testing, or swappable infrastructure)—avoid speculative “future-proof” shells.
4. **Behavior and data ownership**: decide which module owns each invariant and transaction; avoid scattering domain rules across UI adapters.

## Clean / hexagonal / onion (practical core)

- **Domain (entities, value objects, domain services)**: business rules with no framework or I/O imports.
- **Application / use cases**: orchestrate domain objects; depend on ports (interfaces) for persistence, messaging, clock, config—not on concrete drivers.
- **Adapters (interface, infrastructure)**: HTTP handlers, DB repos, queue consumers, third-party SDKs; translate between outside world and use-case/DTO contracts.
- **Dependency rule**: source dependencies point **inward** (toward domain/application). Outer rings implement interfaces declared inward—not the reverse.

Name folders and packages after **what the team already uses** (`domain`, `application`, `infrastructure`, `api`, `adapters`, etc.) instead of forcing textbook labels if the repo has a working scheme.

## SOLID at architectural scope

- **SRP**: one reason to change per module or package boundary; split when policy (rules) and mechanism (delivery, storage) churn independently.
- **OCP**: extension via new types or plugins where real variability exists—not preemptive plugin systems.
- **LSP & ISP**: small, honest interfaces at ports; adapters must honor contracts consumers.
- **DIP**: high-level policy depends on abstractions; concrete DB/HTTP/email live at the edge. Apply where multiple implementations or tests need substitution.

## Useful patterns at boundaries

| Pattern | Often fits when |
|---------|------------------|
| Anti-corruption layer | Translating a messy external model into an internal domain language |
| Facade (package) | Stable export surface for a complex folder; hides internal refactor freedom |
| Strategy / policy | Swappable rules or pricing engines behind one port |
| Repository | Aggregate persistence behind an interface; keeps domain persistence-agnostic |
| CQRS (light) | Read models diverge from write model and both are maintained deliberately—not by accident |

Use **existing project patterns** before introducing a parallel architectural style in the same feature area.

## Designing a boundary checklist

- **Who calls whom**: sketch import direction; ban upward imports from domain to UI/ORM.
- **DTOs and mappers**: where translation happens (adapter vs use case) and naming consistency.
- **Transactions and consistency**: which use case owns atomic updates; idempotency for retries if relevant.
- **Error model**: domain errors vs transport errors; what clients see.
- **Testing**: domain and use cases testable without HTTP/DB; adapter tests hit real or test doubles per team habit.

## Anti-patterns

- “God package” shared by every feature; unclear ownership of types and helpers.
- Domain importing ORM entities or React components.
- Leaking persistence details (SQL shapes, ORM lazy-loading traps) into use-case signatures.
- Mirrors of the same struct in five layers with manual copy—collapse or generate boundaries intentionally.

## What to deliver

When proposing architecture:

1. **Context**: product constraints, team size, deployment shape (monolith vs services) in one short paragraph.
2. **Proposed boundaries**: packages/modules and allowed dependencies (list or small diagram in text).
3. **Trade-offs**: what is harder (boilerplate, indirection) vs what improves (testability, replacement of infra).
4. **Migration path** when refactoring an existing mess: incremental steps, not a big-bang rewrite unless requested.

## Additional resources

For file-level smells and incremental refactors toward better structure, combine with refactoring guidance in the same engagement when the user is changing existing code rather than only sketching new layout.

