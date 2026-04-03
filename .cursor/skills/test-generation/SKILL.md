---
name: test-generation
description: Generates and extends unit and integration tests with Vitest, Jest, or pytest, focusing on edge cases, error paths, and maintainable structure. Use when adding tests, raising coverage, hardening features, or when the user asks for test cases, mocks, fixtures, or CI-ready suites.
---

# Unit and integration test generation

## Default stance

1. **Detect the stack** from `package.json`, `vite.config.*`, `jest.config.*`, `pytest.ini`, `pyproject.toml`, or existing test files; do not introduce a second framework if one is already wired.
2. **Match local conventions**: file naming (`*.test.ts`, `*.spec.ts`, `__tests__/`), import style, and assertion helpers already in the repo.
3. **Tests must run**: after adding or changing tests, run the project’s test command (or the narrowest file target) and fix failures before handing off.
4. **Coverage is a signal, not the goal**: prioritize correctness, regressions, and clarity over chasing a percentage; avoid testing implementation details that will churn.

## Framework defaults

| Context | Prefer |
|---------|--------|
| Vite frontend/backend | Vitest (aligns with ESM and Vite tooling) |
| Next.js / CRA legacy / explicit Jest setup | Jest (match existing config) |
| Python | pytest (`pytest`, `conftest.py`, fixtures, `parametrize`) |

If the repo has **no runner yet** and uses Vite: recommend Vitest for new JS/TS tests unless the user standardizes on Jest.

## Unit vs integration

- **Unit**: single module/function; collaborators stubbed or trivial; fast; deterministic.
- **Integration**: multiple real pieces (DB with test container or file DB, HTTP layer with test app, React tree with providers). Use fewer, broader tests; mark slow tests or separate job if the project already does.

Label new files or suites so maintainers can see intent (`*.integration.test.ts` or `tests/integration/` when that pattern exists).

## Edge cases and negative paths (checklist)

Apply what matters to the code under test; don’t boilerplate every bullet every time.

- **Inputs**: empty, whitespace-only, min/max length, unicode, wrong type, `null`/`undefined` where allowed or forbidden.
- **Numbers/dates**: zero, negative, boundary times/timezones if date logic exists.
- **Collections**: empty, single element, duplicates, large lists (or reason to skip).
- **Async**: success, rejection, timeout, cancellation/abort if applicable.
- **Idempotency**: repeated calls, double-submit.
- **Auth/config**: missing or invalid env/secrets (where testable without real secrets).
- **Errors**: assert **observable** outcome—message, code, structured error—not only that an exception was thrown.

## Implementation notes

**Vitest / Jest**

- Prefer `describe`/`it` (or consistent project style). Use `test.each` / table tests for parameter matrices.
- Mock at **boundaries** (HTTP, fs, clock): `vi.mock` / `jest.mock`; reset modules or clear mocks per test when the suite needs isolation.
- React components: Testing Library—query by role/label; assert user-visible behavior, not internal state.

**pytest**

- Use fixtures for setup/teardown and shared clients; `parametrize` for input matrices.
- For HTTP apps: `TestClient` or async client per framework; cover 4xx/5xx paths the API promises.

## What to deliver

When generating a suite:

1. **File list** and where tests live relative to source (mirror project habit).
2. **Cases covered**: happy path + edge/negative paths named explicitly.
3. **Artifacts**: mocks/fixtures only where needed; document any env vars or flags for integration tests.
4. **Command** actually run to verify (e.g. `npm test`, `npx vitest run path/to/file`, `pytest path -q`).

## Anti-patterns

- Snapshot-heavy UI tests that encode layout noise without guarding real behavior.
- Global mutable state shared across tests without reset.
- Real network or production-like services in unit tests.
- Asserting private methods or specific call order of internal helpers unless that order is a contract.

## Additional resources

For large API matrices or compliance-style case lists, consider extracting **data-driven** tables (`test.each`, `pytest.mark.parametrize`) instead of copy-pasted tests.

