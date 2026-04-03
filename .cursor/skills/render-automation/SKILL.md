---
name: render-automation
description: Automates Render using the public API and infrastructure-as-code patterns for services, deploys, custom domains, environment groups, and logs access where supported. Use when scripting blue/green expectations, scaling triggers, or synchronizing environment configuration.
---

# Render automation

## Default stance

1. **Ownership**: API keys are account-scoped—use dedicated automation keys with minimal services attached; rotate on departure.
2. **Service types**: web services, static sites, cron jobs, databases, Redis—each supports different fields and lifecycle actions; confirm type before calling endpoints.
3. **Deploys**: distinguish trigger deploy (from repo), clear build cache, rollback—idempotency lives in git SHA, not arbitrary repeats.
4. **Secrets**: sync env vars via API cautiously—prefer staging changes and verifying rollouts; never log values.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Services | list, create/update metadata, instance types, regions (where available), health |
| Deploys | trigger, status polling, rollback when supported |
| Domains | custom domains and certificates lifecycle |
| Env groups | shared variables across services—change control critical |
| Logs | when API/CLI exposes log tailing—mind PII export policies |

## Implementation notes

- Refer to **current Render API docs** for paths and auth headers; version assumptions explicitly in code comments.
- Combine with **Git** as source of truth for app behavior; API for ops, not for replacing review for code changes.
- Wrap with retries on `5xx`; cap poll frequency when waiting for deploy health.

## Anti-patterns

- Spam deploy triggers on webhook loops without commit dedupe.
- Dumping env vars into tickets or CI logs.
- Mixing production and preview service keys in one script.

## Additional resources

If the org uses **Blueprint YAML** (`render.yaml`), prefer declarative updates reviewed in PR alongside selective API operations for operational tasks.

