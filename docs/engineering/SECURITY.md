# Security and trust boundaries

**Purpose:** define authoritative validation, untrusted-text handling, local data safety, future public-write controls, credentials, and moderation separation.

**Status:** ACCEPTED BASELINE; PUBLIC-SYSTEM CONTROLS DEFERRED WITH THE HOSTED GATE

**Authority boundary:** owns trust boundaries and security requirements. Domain invariants remain in [simulation](SIMULATION.md), persistence integrity in [persistence](PERSISTENCE.md), and CI test placement in [testing](../quality/TESTING.md).

**Related documents:** [architecture](ARCHITECTURE.md), [cognition](COGNITION.md), [persistence](PERSISTENCE.md), [testing](../quality/TESTING.md), [tool inventory](../research/PROPOSED_TOOLS.md), [systems evidence](../research/SYSTEMS_RESEARCH.md)

## Owned decision

Everything outside the reducer's typed domain state is untrusted: user text, citizen prose, model output, imported worlds, renderer input, URLs, browser storage, dependency scripts, MCP/plugin output, GitHub/Cloudflare credentials, and future public commands. Cognition is followed by typed authorization and one atomic validation/reducer path.

The local first slice collects no account, real name, contact, precise location, payment, regulated data, private chat, or provider credential. Citizens are fictional. There are no public canonical writes.

## Canonical write controls

For every local or future command:

- require a closed typed payload, idempotency ID, expected revision, principal, and region;
- authenticate the principal when a future server exists, then authorize the concrete action after cognition;
- validate existence, life/capability, knowledge/visibility, location, ownership, resources, law, limits, and schema bounds;
- apply atomically or reject without state, sequence, PRNG, inventory, or partial-side-effect change;
- persist the accepted result/audit reference before acknowledging success;
- keep replay independent of the original model/provider.

No model, sponsor prose, UI flag, or client-provided role is authority.

## Text and model-output policy

- Render prose as escaped text only. Do not trust model/user Markdown, HTML, CSS, JavaScript, SQL, shell, URL, file path, SVG, code, or tool call.
- If formatted Chronicle text is later needed, build it from authored component templates and typed values; never render provider Markdown directly.
- Enforce byte, code-point, depth, array, numeric, enum, and identifier bounds before domain validation.
- Unknown fields fail closed.
- `publicJustification` and in-world allegations are nonauthoritative text tied to provenance.
- Prompt/model context contains only visible facts and sourced beliefs selected before inference. Hostile names, memories, counsel, and retrieved prose cannot expand the action catalog or request tools.
- There are no generic browser/network/file/database tools in cognition.
- Optional raw provider traces are redacted, opt-in developer artifacts with bounded retention; they are excluded from canonical export.

## Browser-local controls

- Use a restrictive CSP compatible with the chosen local assets; do not add `unsafe-eval` for libraries without explicit security review.
- Bundle production assets; no runtime third-party scripts, analytics, remote component registries, or model endpoints in V1.
- Validate import MIME, size, manifest, schema, versions, sequences, and hashes in isolation before creating a world.
- Treat IndexedDB as mutable/corruptible input on load; verify snapshots and replay head.
- Use one writer lease and test forced-close recovery; never silently last-write-wins.
- Keep important actions in semantic DOM with explicit confirmation only where consequence warrants it.
- Never place secrets in browser code, local storage, events, prompts, screenshots, traces, exports, logs, or URLs.

## Future hosted controls

These are requirements before—not implementation scope for—the hosted gate:

- authenticated patrons for canonical interventions; anonymous users get bounded public reads only;
- HttpOnly/Secure/SameSite session cookies, CSRF defense, allowed-origin checks, and WebSocket origin validation;
- CSP, strict transport, content-type, referrer, and frame-ancestor headers;
- per-IP, per-account, per-region, action-kind, and global write/inference quotas that fail closed;
- idempotent commands/alarms, bounded payloads, backpressure, and cost kill switches;
- least-privileged encrypted platform secrets with rotation/revocation and no owner credential in clients;
- bounded public share/comment surfaces, spam/rate controls, and separate moderation queues;
- backup/export, restore rehearsal, audit events, incident disable/read-only mode, and current dependency/platform review.

Moderation visibility is independent of canonical factual state. Abusive prose can be hidden, quarantined, or removed from public presentation without altering that an authoritative action occurred. The public projection can show a safe factual template while preserving restricted original text in an access-controlled, retention-bounded store—or discard it if it has no canonical need.

## Tool and supply-chain boundaries

- Pin packages and actions by lockfile/version; do not use `@latest` in CI.
- Review install scripts, transitive licenses/advisories, and generated/copied component provenance.
- Treat Promptfoo configs/providers/assertions and MCP servers as executable trusted code, not sandboxed data.
- Browser automation stays on the owned localhost/test surface and avoids unrelated signed-in tabs.
- Resolve repo, branch, visibility, target, and actual diff before GitHub writes.
- Reinventory plugin capabilities and permissions before connection; optional tools never block the slice.
- If native private-repository secret scanning is unavailable, select one lightweight open-source scanner only after license/provenance review and pin it in CI.

## Required abuse/security tests

- stale revision, duplicate ID, invalid actor, dead actor, impossible target, hidden fact, unauthorized resource, and partial-batch rejection;
- hostile HTML/Markdown/URL/code in names, memories, counsel, import, provider output, and Chronicle values;
- oversized/deep/unknown-field inputs and corrupt snapshot/event intervals;
- model timeout, malformed output, injection attempt, 429, credential revoke, and provider absence with continued Standard Brain progress;
- dual-tab writer, crash during append/snapshot, replay gap/hash mismatch, and import rollback;
- future-only: CSRF/origin, session fixation, public-write quotas, alarm duplication, moderation visibility, secret redaction, and denial-of-wallet.

## Resulting implementation behavior

- An eloquent proposal has no more authority than a malformed one.
- Hostile text appears as inert bounded text or is discarded.
- Stale/duplicate/invalid writes cannot partially change Reality.
- Provider removal and quota failure do not stop the world.
- Local export contains authoritative history but no credential or raw provider trace by default.
- Public moderation can hide harmful presentation without falsifying the Chronicle.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Trust structured model output after schema parse | Schema validity is not domain authority or visible-knowledge proof |
| Render provider Markdown/HTML | Injection/XSS and factual-presentation risk |
| Owner/provider key in browser | Extraction and denial-of-wallet |
| Anonymous canonical writes | Abuse, moderation, integrity, and cost exposure |
| Use prompt instructions as the only isolation | Hostile context can override prose; typed least authority is required |
| Mix moderation state with canonical facts | Removal would falsify history; preservation could expose harmful text |
| Collect accounts/analytics “for later” | No first-slice need and expands data/security obligations |

## Unproven assumptions and reopen evidence

- **UNRESOLVED:** exact CSP needs of the selected renderer and dev/build tooling. Reopen only from a documented blocked resource; do not silently weaken it.
- **UNRESOLVED:** browser export/import threat surface is acceptable. Reopen after fuzzed parser and rollback evidence.
- **UNRESOLVED:** GitHub private-repository secret scanning, push protection, rulesets, and branch protections available to this personal account. The coordinator must probe and record actual responses.
- **UNRESOLVED:** future public moderation can remain separate without leaking restricted text through replay/share endpoints. Reopen during hosted threat modeling.
- **UNRESOLVED:** any optional provider's data/retention terms fit the exact prompt inventory. Reopen on the day of adapter work.

## Constraint fit

The first slice minimizes data, credentials, services, and attack surface by staying local and model-free. Controls are typed and testable by one builder. Hosted/public ceremony is postponed until product evidence justifies it, while the protocol retains the fields needed to add least-authority controls later.
