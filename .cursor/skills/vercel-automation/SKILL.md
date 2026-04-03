---
name: vercel-automation
description: Automates Vercel using the REST API and CLI for deployments, projects, domains, environment variables, teams, and build logs. Use when integrating CI/CD, preview deployments governance, or bulk project configuration.
---

# Vercel automation

## Default stance

1. **Tokens**: personal, team, or OIDC-based tokens—scope to team/project; rotate; never print in logs; treat like production secrets.
2. **Project linkage**: `projectId`/`teamId` slugs are stable identifiers—store in config, not hard-coded scattered strings without comments.
3. **Deployments**: distinguish production vs preview; git integration drives many flows—API augments for redeploy, cancel, alias, or environment promotion patterns.
4. **Env vars**: sensitive vs plaintext; prefer updating via API/CLI in CI with approval gates; verify redeploy picks up changes.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Deployments | create/trigger, list, cancel, inspect build logs/outputs |
| Projects | settings retrieval, framework presets, build & output settings |
| Domains | add/verify, alias assignment, redirect rules interplay |
| Env vars | per environment (prod/preview/dev) with team policies |
| Teams & members | invitations and roles—sensitive HR/security surface |

## Implementation notes

- Prefer official **Vercel CLI** for human workflows and **`@vercel/sdk`** or REST for services; respect rate limits with retries.
- Webhooks for **deployment events** should verify signatures and be idempotent.
- **Edge config / KV** (if used) has separate APIs—do not conflate with core deployments API.

## Anti-patterns

- Wide team tokens in read-only dashboards.
- Updating env vars without redeploy awareness—document whether a rebuild is required.
- Creating infinite deploy loops from GitHub Actions without `concurrency` guards.

## Additional resources

Map **preview branch** strategy (`preview`/`production` promotion) in the same doc as automation triggers to keep Git and API behaviors aligned.

