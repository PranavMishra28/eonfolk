# Implementation final review and reconciliation

**Purpose:** preserve the hostile review of the first integrated Riverhold implementation, every P0/P1 disposition, the repair evidence, and the final confirmation verdict.

**Status:** RECONCILED; FIRST CONFIRMATION FAILED AT `1834f1f`; REPAIRED CANDIDATE AWAITS FINAL TARGETED CONFIRMATION

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
| IFR-SS-009 | P1 | Hidden-fact timing noninterference lacked the planned 200-cycle analyzer. | ACCEPT | `releaseDecisionTrace` now uses one fixed minimum-release surface for authorized and denied outcomes. The frozen 20-warmup/200-cycle analyzer passes hidden-A, hidden-B, missing, and revoked cases with every release at least 50 ms and median/p95 spread below 5 ms; [raw evidence](../exec-plans/evidence/001/implementation/decision-trace-timing.json) is retained. This is local timing evidence, not a remote side-channel proof. |
| IFR-CI-001 | P1 | The candidate was not pushed/observed green in CI. | ACCEPT | Final readiness remains pending until the repaired SHA and evidence commit are pushed and all three Actions jobs are observed green. |
| IFR-CI-002 | P1 | ExecPlan, handoff, evidence links, and labor log were stale. | ACCEPT | Authorities and evidence are updated in this reconciliation. M1–M5 focused time is explicitly UNKNOWN rather than reconstructed. |
| IFR-CI-003 | P1 | Zero-egress relied on an insufficient route hook. | ACCEPT | Playwright now denies routes and independently parses Chromium netlog; the final local run saw 196 routed requests and 21,358 netlog events with zero external attempts. |
| IFR-CI-004 | P1 | Performance was a one-run smoke rather than the planned repeated profile. | PARTIALLY ACCEPT | The headed protocol completed five cold contexts per profile, 5-second warmups plus 30-second arrival/busy-market/Chronicle samples, required desktop/laptop/mobile profiles, throttled mobile load, post-load offline completion, and dual zero-egress oracles. All numerical gates passed, but the immediate host audit reported Battery Power rather than required AC Power; [raw evidence](../exec-plans/evidence/001/implementation/performance.json) is therefore diagnostic only. The finalized harness records source/power metadata and pooled summaries and must be rerun wholly on AC. |
| IFR-CI-005 | P1 | Production dependency vulnerability evidence was absent. | ACCEPT | `pnpm audit --prod --audit-level high` is blocking and recorded zero advisories; pinned Gitleaks remains a separate CI job. |
| IFR-PV-007 | P1 | Human Gate A/B and Story Card outcomes were not run. | ACCEPT AS BLOCKER TO HUMAN CLAIMS | No human claim is made. The implementation override permits technical work only; fun, comprehension, attachment, and share conversion remain unvalidated. |

## Corrected and lower-severity findings

- The systems review reported missing 30/90/365-day tests. **REJECT:** `tests/unit/systems/properties.test.ts` already executes exact 30-, 90-, and 365-day deterministic simulations without an LLM.
- Persistence currently provides structural rather than self-contained cryptographic verification. The Application replay comparison is the accepted local boundary; independent adapter hash recomputation remains future hardening.
- Provider/proposal binding, modulo-bias hardening, physical-device performance, production error recovery, and richer authored art remain P2 or later-scope work. None is promoted to a Gate A/B pass claim.

## First confirmation findings and repairs

A fresh targeted reviewer inspected exactly `1834f1f79b72b6fa206d037d7c420379674f6fa2` and returned **FAIL**. That review did not inherit the earlier reviewer outputs. Its P0/P1 findings are reconciled here before the one final targeted confirmation:

| ID | Severity | Finding | Disposition | Repair or rationale |
|---|---|---|---|---|
| IFR-CONF-001 | P0 | The browser rendered a static projection before the Worker opened and replayed IndexedDB, so stale Chronicle/world claims could appear as authority. | ACCEPT | Browser projection is now `null` until the Worker response. The loading surface contains no world facts; a delayed-Worker Playwright test starts from a conflicting saved checkpoint and proves no advice/Story Card appears before authoritative replay. Browser no-Worker behavior still fails closed. |
| IFR-CONF-002 | P1 | Phase recovery covered return-pending only; a crash after counsel or return response could repeat canonical actions. | ACCEPT | Recovery now derives the furthest valid phase from replayed `lastCounsel`, simulation time, and canonical `lastReturnResponse`. Crash tests cover post-counsel and post-response recovery; a second response is rejected without changing state. |
| IFR-CONF-003 | P1 | Five-run performance evidence still violated the canonical headed, cold-context, throttled, 30-second-state procedure. | PARTIALLY ACCEPT | The new benchmark implements the full procedure, one-shot next-frame marks, per-state/pooled distributions, latency/long-task/memory diagnostics, exact source/power metadata, and route/netlog oracles; networking is disabled after meaningful-world display and the full journey still completes. A 15-run battery diagnostic passed numerically, but a wholly new clean-commit AC run remains blocking. |
| IFR-CONF-004 | P1 | Timing noninterference had no exact release-path analyzer. | ACCEPT | Closed by IFR-SS-009 and the retained raw analyzer evidence. |
| IFR-CONF-005 | P1 | The focus test did not actually exercise forward and reverse Tab containment. | ACCEPT | The browser test now presses Tab and Shift+Tab at the single-control dialog boundary, proves wrap containment, then verifies Escape, Back, and invoker restoration. |

The same repair also propagates structured persistence error codes through the Worker and presents a clear `STALE_FENCE` alert when a newer tab takes authority. A real two-tab Playwright path proves the old tab cannot write and the new tab continues.

## Automated evidence at repaired candidate

The repaired working tree passes complete `pnpm verify`: runtime/cohort/architecture/docs/format/lint/typecheck, 61 unit tests, two property tests, real Chromium IndexedDB reload, the 20/200-cycle timing analyzer, production build/bundle budgets, zero-advisory dependency audit, six Playwright journeys, dual zero-egress oracles, and bounded TLA+. A 15-run battery performance diagnostic passes every numerical gate, but canonical AC performance, final exact-commit Gitleaks, remote CI, and targeted confirmation remain pending. This is automated/local evidence only.

## Confirmation

Pending the single final targeted confirmation against the exact repaired commit. Any residual P0/P1 blocks the final push/cleanup.
