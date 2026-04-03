---
name: gitlab-automation
description: Automates GitLab using the REST (and GraphQL where applicable) APIs and CLI for projects, merge requests, issues, pipelines, branches, and group settings. Use when integrating DevOps workflows, generating MRs, or governing group-level configuration on GitLab.com or self-managed.
---

# GitLab automation

## Default stance

1. **Hosted vs self-managed**: base URL and authentication flows differ; confirm whether runner tags, IP allowlists, or SSO change API access.
2. **Auth**: personal access tokens, project/group tokens, or OAuth with minimal scopes (`api` is powerful—prefer narrower scopes when available).
3. **Permissions**: group/project membership gates writes; handle `403` distinctly from `404` to avoid information leaks in user-facing tools.
4. **Pagination**: use `page`/`per_page` or `Link` headers; fetch until empty—many list endpoints are capped at 100 per page.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Projects | create, transfer (careful), features flags, protected branches, merge method |
| MRs | create, approve, merge when pipeline succeeds, discussions, draft status |
| Issues | labels, weights, iterations (if Premium/ultimate features in play) |
| Pipelines | trigger, retry, cancel, download artifacts, child pipelines awareness |
| Branches | create from SHA or ref, delete with policy checks |

## Implementation notes

- Prefer **python-gitlab** or official patterns from GitLab docs; exponential backoff on `429`.
- **Webhooks**: validate secret token; pipeline and MR events drive many integrations—design idempotent handlers.
- **Terraform**: GitLab provider for groups, projects, variables—align with org IaC standards.

## Anti-patterns

- Tokens with owner-level scope for project-only bots.
- Polling pipeline status without jitter—use webhooks or job notifications when possible.
- Mass branch deletes without protected branch and MR policy review.

## Additional resources

Note **tier-specific** features (iterations, security dashboards) before recommending API calls; link to GitLab version docs for self-managed instances.

