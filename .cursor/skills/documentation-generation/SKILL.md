---
name: documentation-generation
description: Adds and updates JSDoc or TSDoc, Python docstrings, and OpenAPI (Swagger) specs in a style consistent with existing project docs. Use when the user asks for API documentation, spec files, module headers, parameter descriptions, examples, or making docs match team conventions.
---

# Automated documentation

## Default stance

1. **Derive style from the codebase**: read nearby comments, existing OpenAPI/Markdown API docs, `CONTRIBUTING` or team guides, and ESLint JSDoc rules if configured. New docs should read like they were written by the same author—not a different dialect.
2. **Document the contract, not the obvious**: prioritize public exports, HTTP routes, schemas, side effects, errors, invariants, threading/async expectations, and non-trivial arguments. Skip redundant restatements of names that add no information.
3. **Stay aligned with behavior**: docs must match types, validation (e.g. Zod), and actual responses. When code and docs disagree, fix or flag both; do not “document” aspirational behavior.
4. **Keep maintenance cost low**: prefer stable summaries + links to types/schemas over duplicating huge shapes in prose.

## Workflow

1. **Sample**: collect 2–3 representative existing doc comments or spec sections from the same layer (e.g. `src/api`, `src/lib`).
2. **Choose format**: JSDoc/TSDoc, docstring style, or OpenAPI; match project tooling (`openapi.yaml`, `swagger.ts`, generated spec from framework).
3. **Generate**: add or patch documentation in place; preserve file order and section layout expected by the team.
4. **Verify**: run typecheck, lint, or OpenAPI validation if the repo provides it (`swagger-cli validate`, `redocly lint`, framework built-in).

## JSDoc / TSDoc (JavaScript / TypeScript)

- Use `@param`, `@returns`, `@throws` (or `@returns` with union/error types in TSDoc) when behavior is not fully expressed by types.
- For React components: document **props contract** and notable UX/a11y behavior when non-obvious; avoid narrating every prop when TypeScript types suffice—use concise summaries for public/shared components.
- Prefer `{@link}` to related types or routes when the repo already does.
- Match capitalization, sentence vs. fragment style, and `@deprecated` usage to existing files.

## Python docstrings

- Detect style: **Google**, **NumPy**, or **Sphinx** from neighboring modules; do not mix styles in one package.
- Include `Args`, `Returns`, `Raises`, and short `Examples` only when they reduce confusion or encode a contract.

## OpenAPI / Swagger

- Follow the spec version and structure already in the repo (2.0 vs 3.x, single file vs split, `components/schemas` naming).
- Keep **operationId**, tags, and security schemes consistent with existing entries.
- Document request/response bodies with **schemas** referenced by `$ref`; avoid duplicating large inline schemas when components exist.
- Describe **4xx/5xx** response shapes when the API returns stable error payloads.
- Note auth, pagination, idempotency, and rate limits when the team documents them elsewhere—reference or mirror briefly.

## Output shape

When adding documentation at scale, summarize for the user:

- Files touched and whether behavior was assumed vs. confirmed.
- Any mismatches found between code and prior docs.
- Commands run (lint, spec validation) and results.

## Anti-patterns

- Generic filler (“does stuff with data”) or repeating the identifier in different words only.
- OpenAPI drift: hand-written examples that contradict `schema`.
- Over-documentation inside tight CRUD internals when the team only documents public modules.
- English-only mandate if the project consistently uses another language for user-facing strings (match product copy rules, not code-comment language, unless instructed).

## Additional resources

For large APIs, prefer **single source of truth**: generate OpenAPI from code where the stack supports it, or maintain spec next to handlers with a validation step—follow the pattern already adopted in the repository.

