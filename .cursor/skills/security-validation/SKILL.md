---
name: security-validation
description: Spots common web and application vulnerabilities (injection, XSS, auth/session issues, unsafe deserialization patterns) and recommends validation, encoding, and hardening appropriate to the stack. Use when reviewing security, handling untrusted input, forms and APIs, HTML or Markdown rendering, file uploads, or when the user asks for sanitization or vulnerability checks.
---

# Security and validation

## Default stance

1. **Assume untrusted input at trust boundaries**: HTTP params/body, headers, cookies, files, webhooks, queue messages, SSR props—validate and encode for the **consumer context**, not a generic “sanitize” pass.
2. **Prefer safe construction over clever escaping**: parameterized queries / ORM bindings, structured APIs, allowlists for enums, typed schemas (e.g. Zod) at the boundary, templating that auto-escapes by default.
3. **Be precise about severity**: distinguish exploitable issues, defense-in-depth gaps, and theoretical risks; cite concrete code paths or patterns when possible.
4. **Match the stack**: browser apps need HTML/URL/DOM context awareness; servers need SQL, shell, XML, and path discipline; follow frameworks’ recommended primitives.

## Workflow

1. **Identify trust boundaries** in the change or feature: what crosses from untrusted to trusted?
2. **Scan for symptom patterns** (below); read surrounding code for missing validation, double decoding, or “reflected” data flows.
3. **Recommend fixes** as concrete patterns (library + API), not vague advice.
4. **Verify**: run existing lint/security tools if present (`npm audit`, Semgrep, Snyk, Bandit, etc.); do not claim “clean” without scoped review.

## Common issues and directions

| Risk | Typical signals | Direction |
|------|-----------------|-----------|
| SQL injection | String-concat SQL, dynamic identifiers in raw SQL | Parameterized queries / bound params; never interpolate identifiers without strict allowlists |
| XSS (stored/reflected/DOM) | `innerHTML`, `dangerouslySetInnerHTML`, `document.write`, injecting URL/hash into `javascript:` links, outdated Markdown/HTML renderers | Escape HTML for HTML context; strip or sandbox when rich text is required; strict CSP where feasible; sanitize with maintained libraries **in the right mode** |
| Command injection | `exec`, `spawn` with user-influenced shell string | Pass `argv` arrays; avoid shell; validate file names and paths |
| Path traversal | User-chosen path segments joined to filesystem | Canonicalize, restrict to base dir, allowlist filenames, reject `..` |
| CSRF | State-changing endpoints relying only on cookies | Same-site cookies, CSRF tokens, or framework middleware as appropriate |
| SSRF | Server fetches user-supplied URL or redirects | Block private IPs/metadata URLs; allowlist hosts/schemes; disable follow redirects or validate targets |
| Auth/session | JWT in `localStorage`, missing `httpOnly`/`Secure`/`SameSite`, long-lived tokens without rotation | Follow framework/session defaults; prefer httpOnly cookies for session tokens unless a documented SPA pattern exists |
| Secrets | Hard-coded keys, logging tokens, client bundles containing privileged credentials | Env + secret store; redact logs; never ship server secrets to the browser |

## Validation vs encoding

- **Validation**: shape, type, range, allowed values—reject or normalize **before** use; fail closed for security-critical fields.
- **Encoding**: depends on sink—HTML attributes, JS string embedded in HTML, URL query, CSS, SQL—**context-specific**; do not assume one sanitizer fixes all sinks.
- **Rich text**: prefer markdown→safe HTML with a vetted pipeline; avoid regex-only HTML “cleaning.”

## Frontend (React / SPA) notes

- Treat **rendered HTML from Markdown or CMS** as untrusted unless a strict sanitizer and CSP back it.
- **URL handling**: validate `http:`/`https:` before assigning to `href` or `window.location`; be wary of `javascript:` and data URLs where user input influences links.
- **postMessage**: verify `origin`; avoid `*` if exchanging sensitive data.

## What to deliver

For each finding:

1. **Issue** (short title) and **severity** (e.g. critical / high / medium / low / informational).
2. **Location**: file and symbol or request path when known.
3. **Exploitability** or impact in one sentence, honestly scoped.
4. **Fix**: preferred pattern and alternative; mention tests or checks to add.

## Anti-patterns

- Blacklist-only HTML “stripper” as sole XSS defense.
- Generic “sanitize string” helper used for SQL, HTML, and shell indiscriminately.
- Logging raw payloads containing PII or secrets.
- Dismissing issues because “only admins” can trigger them—lateral movement and account takeover still matter.

## Additional resources

For organizational policy (password rules, key rotation, pentest cadence), defer to team standards; keep findings grounded in the code under review.

