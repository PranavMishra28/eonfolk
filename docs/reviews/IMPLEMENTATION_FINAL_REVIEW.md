# Implementation final review and reconciliation

**Purpose:** preserve the hostile review of the first integrated Riverhold implementation, every P0/P1 disposition, the repair evidence, and the final confirmation verdict.

**Status:** RECONCILED AT `bad215a`; TARGETED CONFIRMATION PENDING

**Authority boundary:** this file owns implementation-review findings and dispositions. The [ExecPlan](../exec-plans/active/001-foundation.md) owns completion state; engineering and product authorities own the accepted behavior.

**Related documents:** [testing](../quality/TESTING.md), [persistence](../engineering/PERSISTENCE.md), [security](../engineering/SECURITY.md), [performance evidence](../exec-plans/evidence/001/implementation/performance.json)

## Frozen review state

Three fresh reviewers independently inspected exactly `b387a6de4d3bf9eaac6934f877d80cb477a67cbd` without seeing one another's results: CI/evidence, product/visual, and systems/security. Their verdicts were all **FAIL**, with three P0s and multiple P1s. The coordinator inspected the actual diff and reconciled the findings below. Human Gate 0/A/B and Story Card studies remain **NOT RUN**; review cannot convert automated evidence into a human pass.

## P0/P1 dispositions

| ID | Severity | Finding | Disposition | Repair or rationale |
|---|---|---|---|---|
| IFR-PV-001 | P0 | A browser without Worker support received a fabricated static world and Chronicle. | ACCEPT | Browser fallback now fails closed behind a user-visible error boundary; the static bridge is Node-test-only. |
| IFR-SS-001 | P0 | One click could delete the whole IndexedDB proof with no confirmation or recovery. | ACCEPT | The reset intent, worker deletion route, and UI control were removed. Backup/recovery remains explicitly unavailable. |
| IFR-SS-002 | P0 | Reloading the abstain branch reconstructed advice that was never given. | ACCEPT | Advice is derived from durable `lastCounsel`/selected branch state; all three branches reload to exact, distinct Story Card headings. |
| IFR-PV-002 | P1 | Investigation and the return action were UI-only, not authoritative commands. | ACCEPT | Investigation commits a one-minute `Advance`; return action commits typed `RespondOnReturn`/`ReturnResponseRecorded` with patron authorization and `response-to` evidence. |
| IFR-PV-003 | P1 | Chronicle could duplicate beats, lose advice on reload, and confuse outcome with unresolved tension. | ACCEPT | Chronicle selects unique advice/no-advice, independent choice, and outcome beats; Story Card has a separate authoritative unresolved tension. |
| IFR-PV-004 | P1 | Clipboard failure was reported as success. | ACCEPT | Success copy appears only after fulfilled `writeText`; denial reports an honest selectable-text fallback and is browser-tested. |
| IFR-PV-005 | P1 | Modal focus, Escape, Tab containment, Back, and invoker restoration were incomplete. | ACCEPT | The dialog now focuses its close control, traps Tab, handles Escape/Back, and restores its invoker; Playwright covers the path. |
| IFR-PV-006 | P1 | Mobile world dominance and semantic parity were insufficient. | ACCEPT | Mobile world height and arrival composition were revised; semantic view now includes resources, place, and a named interaction/change; 390×844 and 200% text pass. |
| IFR-SS-003 | P1 | A catch-up crash could advance the same day twice. | ACCEPT | Serialized worker requests, synchronous pending guards, durable replay recovery, phase recovery, and an exact no-double-advance test close the one-day slice case. |
| IFR-SS-004 | P1 | Runtime instances did not acquire a writer fence. | ACCEPT | Every initialization atomically acquires a new persistence fence; a second runtime makes the first fail stale without canonical mutation. |
| IFR-SS-005 | P1 | A valid consumption quantity could overflow derived relief. | ACCEPT | Payload validation caps quantity before multiplication; a boundary test proves typed rejection and unchanged state/head. |
| IFR-SS-006 | P1 | Application rejection paths were not durably receipted. | ACCEPT | `#commit` now writes a bounded rejected receipt (and decision, when present) before surfacing rejection, without changing canonical head. |
| IFR-SS-007 | P1 | Persistence validation was described as cryptographic when it is structural. | PARTIALLY ACCEPT | Persistence enforces atomic structure, bounds, CAS, fencing, and collisions; protocol/simulation compute hashes, and initialization replays every batch/event and compares state/world-head hashes. Documentation does not claim the adapter independently recomputes domain hashes. |
| IFR-SS-008 | P1 | Catch-up did not use chapter receipts. | PARTIALLY ACCEPT | The slice advances exactly one bounded day in one atomic transition, so chapter orchestration adds no recoverable boundary. The persistence package retains tested chapter receipts for future multi-chapter catch-up. |
| IFR-SS-009 | P1 | Hidden-fact timing noninterference lacked the planned 200-cycle analyzer. | PARTIALLY ACCEPT | No external Brain, public multi-user observer, hidden-input UI branch, or network route ships. Functional hidden-fact isolation and zero-egress pass. The timing analyzer remains required before any untrusted cognition or remote/public boundary; no timing-security pass is claimed here. |
| IFR-CI-001 | P1 | The candidate was not pushed/observed green in CI. | ACCEPT | Final readiness remains pending until the repaired SHA and evidence commit are pushed and all three Actions jobs are observed green. |
| IFR-CI-002 | P1 | ExecPlan, handoff, evidence links, and labor log were stale. | ACCEPT | Authorities and evidence are updated in this reconciliation. M1–M5 focused time is explicitly UNKNOWN rather than reconstructed. |
| IFR-CI-003 | P1 | Zero-egress relied on an insufficient route hook. | ACCEPT | Playwright now denies routes and independently parses Chromium netlog; the final local run saw 196 routed requests and 21,358 netlog events with zero external attempts. |
| IFR-CI-004 | P1 | Performance was a one-run smoke rather than the planned repeated profile. | ACCEPT | Five fresh runs per required viewport pass exact display/frame limits. Physical mobile/4G remains unmeasured and explicitly noncanonical. |
| IFR-CI-005 | P1 | Production dependency vulnerability evidence was absent. | ACCEPT | `pnpm audit --prod --audit-level high` is blocking and recorded zero advisories; pinned Gitleaks remains a separate CI job. |
| IFR-PV-007 | P1 | Human Gate A/B and Story Card outcomes were not run. | ACCEPT AS BLOCKER TO HUMAN CLAIMS | No human claim is made. The implementation override permits technical work only; fun, comprehension, attachment, and share conversion remain unvalidated. |

## Corrected and lower-severity findings

- The systems review reported missing 30/90/365-day tests. **REJECT:** `tests/unit/systems/properties.test.ts` already executes exact 30-, 90-, and 365-day deterministic simulations without an LLM.
- Persistence currently provides structural rather than self-contained cryptographic verification. The Application replay comparison is the accepted local boundary; independent adapter hash recomputation remains future hardening.
- Provider/proposal binding, modulo-bias hardening, physical-device performance, production error recovery, and richer authored art remain P2 or later-scope work. None is promoted to a Gate A/B pass claim.

## Automated evidence at repaired candidate

At `bad215a512c72e4fa1afa3f1b42673bb65709d19`, local `pnpm verify` passed: runtime/cohort/architecture/docs/format/lint/typecheck, 59 unit tests, two property tests, a real Chromium IndexedDB reload test, production build/budgets, dependency audit, four Playwright journeys, dual zero-egress oracles, and the bounded TLA+ model (3,480 generated states, 350 distinct, depth 10, five invariants). Five-run performance and persistence results are linked above. This is automated/local evidence only.

## Confirmation

Pending one fresh, zero-context targeted review of this repaired state. Any new P0/P1 must be fixed and rerun before the implementation candidate is pushed as final.
