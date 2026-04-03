---
name: sentry-automation
description: Automates Sentry using the REST API and organization tokens for issues, projects, releases, deploy tracking, alerts, and DSYM/proguard mapping uploads. Use when scripting issue triage, release health gates, or syncing project metadata across many apps.
---

# Sentry automation

## Default stance

1. **Hosting**: sentry.io vs self-hosted changes base URL and rate limits; confirm region and auth (auth token header).
2. **Tokens**: org-level vs project-level with minimum scopes (`project:read`, `event:write`, etc.)—avoid owner tokens for CI upload jobs unless required.
3. **Issues vs events**: automation usually targets **issues** (grouped) for triage; raw event search is heavier—scope queries and time windows.
4. **Releases + commits**: associate releases with commits for suspect commits; CI should create release and finalize after deploy.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Issues | bulk resolve/ignore, assignment, comments, linking to external trackers |
| Projects & teams | create, DSN retrieval (sensitive), platform settings |
| Releases / deploys | create, upload artifacts, associate commits |
| Alerts | rules and metric alerts—mirror monitoring ownership |
| Debug files | upload symbols with retention awareness |

## Implementation notes

- Official **sentry-cli** for uploads; REST for governance operations; confirm routes against current Sentry REST docs (self-hosted may lag cloud).
- Rate limits: backoff; batch where API supports bulk endpoints.
- **PII**: issue payloads can contain user data—handle exports under privacy policy.

## Anti-patterns

- DSN or auth tokens in client-visible bundles (DSN is expected client-side; org tokens are not).
- Permanently ignoring error classes without product owner approval.
- Creating duplicate releases per commit without `version` discipline.

## Additional resources

Align **`environment`** and **`release`** naming with deployment pipeline; document required Gradle/Xcode/npm integration once per mobile/web stack.

