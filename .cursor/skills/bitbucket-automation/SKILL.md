---
name: bitbucket-automation
description: Automates Bitbucket Cloud or Data Center operations on repositories, pull requests, branches, issues, and workspaces using REST APIs and pipelines. Use when scripting PR workflows, branching policies, webhooks, or workspace admin tasks in Bitbucket.
---

# Bitbucket automation

## Default stance

1. **Cloud vs Data Center**: confirm product and base URL (`api.bitbucket.org/2.0` for Cloud vs self-hosted); paths and auth schemes differ.
2. **Auth**: app passwords, OAuth, or HTTP access tokens with least privilege; never commit secrets—use CI OIDC or secret managers when available.
3. **Idempotency**: check for existing branches, PRs, or hooks before create; respect `409`/`404` handling and pagination (`next` links) on list endpoints.
4. **Repos & workspaces**: scope API calls with `workspace` slug and `repo_slug`; prefer UUIDs in integrations that move across renames when supported.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Repos | create/configure (Cloud API permissions vary), default branch, settings retrieval |
| Branches | create/delete, branch restrictions (permissions), compare commits |
| Pull requests | create, update, decline, approve (with permission), comments, diff stats |
| Issues / trackers | if enabled (Cloud differs by product); prefer Jira integration notes if that is the system of record |
| Pipelines | trigger builds, variables, deployment variables; read build status for PR gates |

## Implementation notes

- Prefer **official Bitbucket REST** from Atlassian docs for the user’s deployment type; wrap calls in small clients with retries for `429` and transient `5xx`.
- Map **webhook payloads** when reacting to `pullrequest:*` or `repo:*` events; verify signatures if documented for the deployment.
- For **bulk admin**, consider Atlassian-supported tooling or Terraform provider if the org standardizes on it.

## Anti-patterns

- Assuming Cloud endpoints work on Data Center without checking.
- Wide tokens for read-only dashboards.
- Unbounded polling; use webhooks or exponential backoff.

## Additional resources

Follow organization naming for workspaces/projects; document required OAuth scopes or token permissions next to any automation wrapper in the repo.

