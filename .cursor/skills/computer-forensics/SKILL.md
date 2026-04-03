---
name: computer-forensics
description: Outlines digital forensics workflows for disk, memory, and log analysis with sound evidence handling and documentation. Use for incident response, authorized investigations, artifact recovery, timeline building, or when the user mentions imaging, chain of custody, MFT, registry, or volatile data collection.
---

# Computer forensics

## Default stance

1. **Operate only within lawful scope**: confirm authorization, policy, and jurisdiction before acquisition or analysis; document who approved what.
2. **Preserve integrity**: prefer forensic images (e.g. E01/RAW) with hashes; record tools, versions, timezones, and exact commands for repeatable results.
3. **Least impact on live systems**: when triage is unavoidable, prioritize volatile data order (RAM, network, processes) per accepted IR practice, then move to disk imaging if required.
4. **Separate analysis from source**: work on copies; keep master images write-blocked or immutable when hardware allows.

## Typical workflow

1. **Scope**: systems involved, users affected, objective (malware, insider, litigation), retention rules.
2. **Acquire**: memory (if policy permits), disks/volumes, mobile/exported cloud artifacts per playbook; hash and label evidence.
3. **Process**: parse filesystems, volumes, partitions; recover deleted items where relevant; extract OS and application artifacts.
4. **Analyze**: timelines, program execution, persistence, lateral movement, data staging/exfiltration hypotheses—tie conclusions to artifacts.
5. **Report**: facts vs inferences, limitations (anti-forensics, encryption, log gaps), indicators, and recommended containment/remediation handoff.

## Technique map (high level)

| Layer | Examples |
|-------|-----------|
| Volatile | Running processes, network connections, open handles, credentials in memory—when live response is in scope |
| Disk | Partition tables, filesystem metadata, MFT/USN Journal (NTFS), timestomping signals, shadow copies |
| OS artifacts | Prefetch, ShimCache, AmCache, SRUM, scheduled tasks, services, WMI, recent docs |
| Applications | Browser history, mail caches, AV/EDR logs, RMM tools, VPN clients |
| Network | Firewall logs, proxy, DNS, DHCP, auth logs—correlate with host timelines |

Prefer **project or organizational playbooks** and approved tools when the repo or team defines them.

## Documentation checklist

- Evidence ID, source, date/time (UTC), analyst, acquisition method, verification hashes.
- Tool versions; commands or GUI steps sufficient for a peer to reproduce on a **copy**.
- Clear chain: what was observed → why it matters → what remains uncertain.

## Anti-patterns

- Analyzing original media in a writeable mount without justification.
- Conclusions without correlating artifacts (single timestamp faith).
- Mixing cleanup/remediation actions before evidence preservation when an investigation is active—follow legal/IR policy.

## Additional resources

Deep vendor-specific training (EnCase, FTK, AXIOM, Velociraptor, etc.) belongs in org docs; keep answers aligned with the user’s stated toolchain and policy.

