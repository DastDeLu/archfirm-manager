---
name: file-deletion
description: Advises on secure logical destruction of data, media-specific caveats, and verifiable erasure aligned with modern guidance. Use when wiping drives, retiring hardware, purging sensitive files, meeting compliance, or when the user mentions shred, secure erase, degaussing, crypto erase, or data sanitization.
---

# Secure file deletion and data sanitization

## Default stance

1. **Match policy to threat model**: casual recovery vs lab recovery vs nation-state adversaries changes acceptable methods; organizational policy and regulation (e.g. health/financial) may mandate specific procedures.
2. **Prefer cryptographic erase when full-disk encryption was used correctly**: destroying keys can sanitize data at rest faster than overwrite passes—**only** when keys and backups are accounted for.
3. **Physical media matters**: SSDs/NVMes with FTL wear-leveling, over-provisioning, and TRIM complicate traditional “overwrite every sector” assumptions; HDDs, tapes, and paper have different options.
4. **Verify**: after sanitization, use agreed verification (spot checks, cryptographic proof of key destruction, certificates of destruction from vendors).

## Logical deletion (files)

- **Normal delete**: unlinking leaves recoverable slack/free-space residue on many filesystems—not sufficient for sensitive data.
- **Overwrite utilities**: OS-specific secure-delete tools; multiple passes are often unnecessary per modern research—**follow org standard** (many map to NIST SP 800-88 Rev. 1 categories: Clear, Purge, Destroy).
- **Databases and copy-on-write**: deleting rows may leave replicas, WALs, snapshots, backups, and cloud versioning—plan end-to-end, not only the primary file.

## Storage classes

| Media | Notes |
|-------|--------|
| HDD | Full-drive sanitization with vendor Secure Erase or approved block overwrite; degaussing/destruction for high assurance |
| SSD/NVMe | Prefer vendor ATA/NVMe secure erase / crypto erase; overwrites may be incomplete due to FTL |
| Virtual disks | Zero-fill or delete backing blob; reconcile cloud snapshots and cross-region copies |
| RAID / NAS | Sanitize members or crypto-erase volume; rebuild parity awareness |
| Mobile | Factory reset insufficient for high threat—use enterprise MDM wipe or physical destruction per policy |

## Operational checklist

- [ ] Inventory all copies (sync clients, Time Machine, object storage versions, email attachments).
- [ ] Revoke sharing links and API tokens referencing the data.
- [ ] Execute approved wipe on each persistence location; document method and time (UTC).
- [ ] Retention vs legal hold: **do not destroy** evidence subject to hold—escalate to legal/IR.

## Anti-patterns

- Relying on “empty Recycle Bin” for regulated data.
- Assuming cloud “delete” removes all replicas without checking bucket versioning and backups.
- Publishing detailed adversary-evasion steps; keep guidance proportional to authorized sanitization and compliance.

## Additional resources

Map procedures to **NIST SP 800-88** (or local equivalent) labels: Clear vs Purge vs Destroy; involve certified vendors for physical destruction when required.

