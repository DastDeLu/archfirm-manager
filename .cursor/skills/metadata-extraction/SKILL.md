---
name: metadata-extraction
description: Extracts and interprets file metadata for triage, correlation, and forensic documentation while noting privacy and chain-of-custody concerns. Use with office documents, images, PDFs, media containers, archives, or when the user mentions EXIF, document properties, timestamps, GPS, or embedded author fields.
---

# Metadata extraction and analysis

## Default stance

1. **Authorized use only**: handle metadata in line with privacy law, workplace policy, and case scope; minimize collection to what the question requires.
2. **Prefer non-destructive read tools**: copy-first workflow; record tool versions and hashes when extracting from evidentiary files.
3. **Treat timestamps as hypotheses**: camera clocks, PDF creators, and editor “last modified” fields can be wrong, manipulated, or timezone-ambiguous—correlate with filesystem and server logs.
4. **Beware embedded surprises**: metadata parsers can be abused via malformed files—use current tools, sandbox if org policy requires.

## Common categories

| Category | Examples |
|----------|-----------|
| Images (raster) | EXIF/IPTC/XMP: camera model, lens, GPS, datetime, software, thumbnails |
| Documents | OOXML/ODF properties: author, company, revision, template paths, printer names |
| PDF | Producer, Creator, dates, XMP, JavaScript flags (policy-dependent handling) |
| Audio/video | Container tags, encoder strings, location in some formats |
| Archives | Comment fields, internal paths leaking usernames or machine names |

## Practical extraction

- **Multi-format**: metadata-focused CLIs and libraries (e.g. patterns like ExifTool-style workflows) for batch inventory and CSV/report output when scripting is needed.
- **Pivoting**: link identifiers across files (serial numbers, GUIDs, consistent author strings) to build timelines—never over-claim uniqueness.
- **Redaction vs removal**: stripping metadata for publication is distinct from forensic acquisition—**do not strip** originals used as evidence; export sanitized copies separately.

## Output discipline

For forensic notes, record:

- Source file identifier/hash, UTC extraction time, tool + version, selected fields (not unbounded dumps unless required).
- Field semantics stated plainly (e.g. “DateTimeOriginal from EXIF, not validated”).
- Uncertainty: missing fields, conflicting times, stripped metadata.

## Anti-patterns

- Trusting GPS coordinates without corroboration.
- Confusing filesystem MAC(B) times with embedded metadata times without documenting the difference.
- Broadcasting sensitive personal data from metadata into tickets or public reports—mask per policy.

## Additional resources

Specialized mobile, cloud, and messaging artifacts belong under org-specific playbooks; hook into those when the user names a platform (M365, Google Workspace, etc.).

