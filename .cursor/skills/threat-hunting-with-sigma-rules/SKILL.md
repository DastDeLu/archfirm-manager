---
name: threat-hunting-with-sigma-rules
description: Applies Sigma detection rules to structured logs and SIEMs for hypothesis-driven threat hunting, tuning, and triage—not only firing alerts. Use when translating Sigma YAML to backends, mapping fields, reducing false positives, hunting APT/TTP patterns, or when the user mentions Sigma, EVTX, Splunk, Elasticsearch, Opensearch, or SOC detection engineering.
---

# Threat hunting with Sigma rules

## Default stance

1. **Hunt with hypotheses**: start from actor, TTP, blast radius, or visibility gap—not from “run all rules and scroll.”
2. **Field mapping is the job**: Sigma is portable; **your** log schema (ECS, CIM, ASIM, custom) must align via config/conversion—verify counts and samples after conversion.
3. **Measure noise**: tune `level`, `status`, filters, and time windows; document exclusions with owners and expiry dates.
4. **Test safely**: run in dev/index with sampled data when possible; avoid destructive actions from automated responses tied to draft rules.

## Workflow

1. **Inventory data**: which sources cover the hypothesis (process creation, network, auth, DLL loads, scripting, cloud audit)?
2. **Select or author rules**: prefer maintained repositories and vetted contributions; read `description`, `references`, and `detection`.
3. **Convert & deploy**: generate platform-specific queries (Splunk SPL, Lucene/KQL variants, etc.) with the project’s pipeline; fix field names and function equivalents.
4. **Baseline**: compare hit volume vs historical distribution; hunt top outliers before alert-grade enforcement.
5. **Iterate**: add logical `filters` (paths, parents, users) to drop benign clusters; escalate true positives with entity context.

## Sigma rule literacy

- **Metadata**: `title`, `id`, `status`, `author`, `date`, `modified`, `logsource`, `detection`, `falsepositives`, `level`, `tags` (`attack.tXXXX`, `attack.technique` helpers for ATT&CK).
- **`logsource`**: `product`, `category`, `service`—must match available ingestion; adjust when feeds differ (Sysmon vs native Security, EDR vs OS logs).
- **`detection`**: `selection` + `condition`; understand `SelectionA and not Filter_B` patterns and `1 of selection*`.
- **Correlations** (where supported): sequences and time-bounded chains—confirm backend capability before relying on them.

## Tuning checklist

- [ ] Representative time range (include business hours and batch windows).
- [ ] Parent/child process sanity for LOLBins; path allowlists with documented rationale.
- [ ] Service accounts vs end users; break hits down by `user`, `host`, `commandline` entropy proxies if useful.
- [ ] Cross-source corroboration (EDR + proxy + auth) before high-severity declaration.

## Anti-patterns

- Deploying `experimental` rules enterprise-wide without owner and review cadence.
- Converting rules without adjusting for case sensitivity, tokenization, or multiline command lines on the target SIEM.
- Treating a Sigma hit as proof of compromise without host and identity context.

## Additional resources

Maintain a **local overlay** for field mappings and suppressed binaries unique to the environment; keep upstream rule IDs for merge tracking when rules are versioned in Git.

