---
name: circleci-automation
description: Automates CircleCI using the REST API, CLI, and configuration as code for pipelines, workflows, pipelines reruns, and project settings. Use when triggering builds, inspecting jobs, managing contexts, or generating or validating `.circleci/config.yml`.
---

# CircleCI automation

## Default stance

1. **API versions**: use the documented CircleCI API for the account (v1 legacy vs v2)—confirm base path from current docs before coding.
2. **Auth**: personal or project tokens with minimal scope; store in CI secrets; rotate on schedule.
3. **Pipelines vs workflows**: articulate whether the goal is a new pipeline, retry, cancel, or promote; API resources match that vocabulary.
4. **Config**: treat `.circleci/config.yml` as source of truth for behavior; API automation complements—not replaces—ORBs and dynamic config when used.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Projects | list, settings readback, checkout keys (prefer ssh keys managed carefully) |
| Pipelines | trigger with parameters, list, get workflow timeline, cancel |
| Jobs | retrieve steps, artifacts URLs, test metadata when exposed |
| Contexts / variables | org-level secrets management—coordinate with security for writes |
| Insights | flaky tests and duration—read-only analytics for governance |

## Implementation notes

- Wrap HTTP with **retries** on `429` and transient failures; honor pagination cursors.
- For **local iteration**, CircleCI CLI can validate or run selective jobs when documented for the stack.
- **Dynamic config** (`setup workflows`): generating continuation requires understanding parameters passed from setup job.

## Anti-patterns

- Embedding long-lived tokens in repo or logs.
- Triggering duplicate pipelines on every webhook without dedupe keys.
- Editing production contexts without change approval process.

## Additional resources

Keep **breaking API** changelogs visible when upgrading integrations; pin API client assumptions in code comments or wrapper version tags.

