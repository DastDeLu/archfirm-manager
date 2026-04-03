---
name: github-automation
description: Automates GitHub using the REST and GraphQL APIs, GitHub CLI, webhooks, and Actions for repositories, issues, pull requests, branches, checks, and code search. Use when building bots, repo governance, workflow integrations, or CI driving GitHub state.
---

# GitHub automation

## Default stance

1. **Auth model**: GitHub App (preferred for org integrations) vs fine-grained PAT vs classic token—pick the least-privilege option installations allow; use `GITHUB_TOKEN` in Actions with per-job permissions.
2. **REST vs GraphQL**: REST for straightforward CRUD; GraphQL for bulk reads and connection-style pagination—handle cost limits and secondary rate limits.
3. **Webhooks**: verify signatures (`X-Hub-Signature-256`); respond quickly with async workers; dedupe delivery IDs when at-least-once delivery matters.
4. **Idempotency**: issue/PR numbers race with automation—use idempotency keys or search-before-create patterns where appropriate.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Repos | create, archive, branch protection, rulesets, topics, secrets (via Actions/org API) |
| PRs | create, review requests, auto-merge enablement (policy), checks, merge, labels |
| Issues | labels, projects (classic vs Projects v2 GraphQL), milestones |
| Actions | workflow dispatch, caches/artifacts via APIs where supported; prefer workflow files in repo |
| Code | search API, dependency insights—mind abuse and indexing delays |

## Implementation notes

- Prefer **octokit** ecosystem (JS, Ruby, Go) or official `gh` CLI for scripting; pin API previews only when required.
- **Pagination**: follow `Link` headers or GraphQL cursors until exhausted—never assume single page.
- For **enterprise**: endpoints and SSO enforcement differ—confirm hostname (`github.com` vs `ghes`).

## Anti-patterns

- Classic PATs with admin scopes committed to the repository.
- Tight loops hitting search or compare APIs—backoff and cache.
- Writing org secrets from untrusted PR contexts.

## Additional resources

Document App ID, installation mapping, and required permissions in the repo README or internal runbooks alongside automation code.

