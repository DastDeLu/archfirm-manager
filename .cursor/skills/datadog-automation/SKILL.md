---
name: datadog-automation
description: Automates Datadog using the public API and Terraform providers for monitors, dashboards, metrics, SLOs, incidents, and alert routing patterns. Use when creating or syncing observability resources, tuning alerts, or integrating incident workflows.
---

# Datadog automation

## Default stance

1. **Keys**: separate **API** vs **Application** keys—never expose app keys to browsers; scope keys via RBAC and service accounts where available.
2. **Sites**: `datadoghq.com`, `datadoghq.eu`, `us3`, `us5`, `gov`, etc.—base URL and org ID must match the tenant.
3. **IaC vs clickOps**: prefer Terraform/OpenTofu or API manifests in Git for dashboards/monitors when the org requires reviewable changes.
4. **Cardinality**: metric tags and monitor queries affect cost—design tag keys consistently before mass-creating monitors.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Monitors | CRUD, downtimes, composite monitors, SLO burn alerts |
| Dashboards / notebooks | JSON definitions, template variables, screenboards vs timeboards legacy |
| Metrics & tags | custom metrics ingestion patterns—automation usually validates queries, not rewriting agents |
| Logs / traces | pipelines and indexes if policy allows API management |
| Incidents / cases | create/update when integrated with IR process (product-dependent) |

## Implementation notes

- Use official **API clients** or `terraform-provider-datadog` with remote state locks.
- Validate monitor queries with **dry-run** or test workspaces before company-wide rollout.
- Respect **rate limits**; batch carefully and backoff.

## Anti-patterns

- One global admin key for all automation.
- Cloning hundreds of near-identical monitors instead of parameterized modules.
- Alert storms: missing notification aggregates or missing silencing policies for maintenance windows.

## Additional resources

Align naming (`service`, `env`, `team`) with internal observability standards; document required tags in the same PR as automation changes.

