---
name: migration-updating
description: Plans and executes dependency upgrades and framework migrations with changelog-driven steps, minimal blast radius, and verification. Use when bumping packages, adopting new major versions, moving between frameworks, resolving peer dependency conflicts, or when the user asks to modernize or update the stack.
---

# Migration and updating

## Default stance

1. **Let release notes drive the work**: read upstream migration guides, CHANGELOG breaking sections, and deprecation timelines before editing; prefer official codemods and documented replacement APIs over guessed rewrites.
2. **Shrink the change set**: upgrade one major axis at a time (e.g. framework OR large ecosystem OR linters) when practical; avoid mixing unrelated breaking bumps in one commit without a reason.
3. **Reproducible installs**: update lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `uv.lock`, `poetry.lock`) with the chosen package manager; record Node/Python versions if the upgrade requires them.
4. **Prove it with automation**: run build, typecheck, lint, and tests after each meaningful step; note skipped checks and manual smoke paths.

## Workflow

1. **Inventory**: list direct deps to change, transitive risk (native addons, peer deps), and any pins/workarounds already in the repo.
2. **Plan**: order upgrades (tooling → core framework → plugins → app code); identify codemods and manual touchpoints.
3. **Execute**: apply version bumps; fix compile errors and deprecations; replace removed APIs using docs, not imagination.
4. **Verify**: full local pipeline; fix regressions; document behavior changes for reviewers.
5. **Handoff**: summarize breaking changes, config diffs, and “if prod breaks” rollback (revert commit / prior lockfile).

## Semver and risk

- **Patch/minor**: usually safe; still scan notes for security exceptions and Node/engine field changes.
- **Major**: assume breaks; schedule focused review; watch peer dependency chains (React, TypeScript, bundlers, ESLint flat config).
- **Transitives**: if a vulnerability fix forces a major, treat it as a migration with the same discipline.

## Framework and codebase migrations

- Prefer **incremental** moves: module-by-module, route-by-route, or feature-flagged paths when strangling an old stack.
- Keep **API compatibility layers** thin and temporary; mark removal deadlines in comments or tickets when the team uses them.
- Align **config files** with the new defaults (Vite, Next, Jest/Vitest, ESLint flat config) using generated examples from official templates as reference, then re-apply project-specific rules.

## Common pain points

| Area | Watch for |
|------|-----------|
| TypeScript | `moduleResolution`, `jsx`, lib DOM types, stricter checks in new TS |
| Bundlers | plugin API changes, ESM-only packages, `exports` field resolution |
| React | concurrent features, hook deps, removed legacy APIs, Strict Mode double-invoke in dev |
| CSS / PostCSS / Tailwind | major jumps often need config migration tables |
| ESLint | flat config migration, dropped rules, parser upgrades tied to TS version |

## What to deliver

- **Diff summary**: packages/configs touched and why.
- **Breaking changes** encountered and how they were addressed.
- **Commands run** and results (or explicit gaps if CI-only).
- **Follow-ups**: deferred refactors, deprecated API still in use, or manual QA steps.

## Anti-patterns

- Blind `npm update` across majors without reading notes.
- Editing `node_modules` or lockfile by hand except as a last resort with clear justification.
- Silencing new type errors with blanket `@ts-ignore` / `any` instead of fixing root causes.
- Shipping migration + unrelated feature work in the same change.

## Additional resources

When upstream provides an upgrade CLI or codemod, **run it first**, then fix residual issues—faster and closer to maintainer intent than fully manual edits.

