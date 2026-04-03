---
name: pagerduty-automation
description: Automates PagerDuty using the REST API for incidents, services, escalation policies, schedules, on-call queries, and event integration keys. Use when wiring alerting pipelines, rotating schedules, status dashboards, or post-incident automation.
---

# PagerDuty automation

## Default stance

1. **Auth**: REST API tokens scoped to required abilities; Events API v2 requires **integration/routing keys** distinct from user tokens—store separately with least access.
2. **Events vs REST**: sending alerts (`events` ingest) differs from managing services/incidents via REST—pick the right surface for fire-and-forget vs CRUD.
3. **User impact**: automations that page humans should include deduplication keys, severity, and runbook links; avoid noisy loops from flaky upstream checks.
4. **Compliance**: some changes (escalation policy edits) need change windows—mirror ITIL practices even when API allows instant updates.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Incidents | create, acknowledge, resolve, merge, notes, timeline fetch |
| Services | integrations (generic webhooks, monitoring tools), maintenance mode |
| Schedules | layers, overrides, who-is-on-call queries for tooling |
| Escalation policies | rules and targets—edits are sensitive |
| On-call | read current/oncoming shifts for chatops or routing |

## Implementation notes

- Use official API clients when available; exponential backoff and respect rate headers.
- For **Change Events** or status products (if licensed), separate API bases may apply—confirm account capabilities.
- Webhook **v3 signatures** when receiving PD callbacks—verify before acting.

## Anti-patterns

- Rotating integration keys without updating all senders (pages stop or duplicate).
- Auto-resolving human incidents from unreliable upstream signals without guardrails.
- Broad API keys on laptops without rotation.

## Additional resources

Pair automation with a **service naming convention** and ownership tags; document which integration key belongs to which monitoring source.

