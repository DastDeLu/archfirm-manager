---
name: supabase-automation
description: Automates Supabase using the Management API, CLI, SQL migrations, and client SDK patterns for schemas, RLS policies, edge functions, storage buckets, and typed API exposure. Use when provisioning projects, applying migrations in CI, or scripting configuration beyond the dashboard.
---

# Supabase automation

## Default stance

1. **Keys**: `service_role` bypasses RLS—server/CI only; `anon` for public clients with strict RLS; never embed service keys in frontends.
2. **Migrations as truth**: prefer versioned SQL (CLI `db diff`/`migration`) over one-off dashboard edits for anything repeatable.
3. **RLS first**: schema automation must pair table changes with policy updates—tests should cover forbidden reads/writes as well as happy paths.
4. **Projects/regions**: management operations target a **project ref**; confirm organization billing and region constraints before provisioning.

## Primary surfaces

| Area | Typical automation |
|------|--------------------|
| Database | migrations, seeds (non-prod), extensions, roles—via CLI or pipeline |
| Auth | tenant config usually manual; automate user admin only with strong safeguards |
| Storage | bucket create/policy via SQL or dashboard exports captured as migrations where supported |
| Edge functions | deploy via CLI in CI; secrets via project settings—not committed plaintext |
| APIs | generate types from schema (`gen types`) when repo uses TypeScript clients |

## Implementation notes

- **Supabase CLI** for localdev parity and linking projects; CI should fail on migration drift.
- **Management API** for org-level automation (project create, backups schedule) if enabled for the account—permissions vary.
- For **branching/preview DBs** (if product tier supports), script lifecycle to avoid orphaned instances.

## Anti-patterns

- Running `service_role` from end-user devices casually.
- Editing production schema without migration files.
- Public buckets with sensitive paths—pair path policies with signed URL strategy.

## Additional resources

Document **project ref**, required secrets (`SUPABASE_ACCESS_TOKEN`, DB URLs), and who may run destructive SQL in runbooks next to automation.

