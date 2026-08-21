# Implementation final review and reconciliation

**Purpose:** preserve the hostile review of the first integrated Riverhold implementation, every P0/P1 disposition, the repair evidence, and the final confirmation verdict.

**Status:** FINAL TARGETED CONFIRMATION FAILED AT `32808e1`; ALL THREE P1S REPAIRED; COMPLETE LOCAL VERIFY GREEN; EXACT-HEAD CI PENDING; NO SECOND CONFIRMATION CLAIMED

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
| IFR-CI-004 | P1 | Performance was a one-run smoke rather than the planned repeated profile. | ACCEPT | The final canonical headed protocol completed five clean cold contexts per profile, 5-second warmups plus 30-second arrival/busy-market/Chronicle samples, required desktop/laptop/mobile profiles, throttled mobile load, post-load offline completion, and dual zero-egress oracles. Every numerical gate passed at exact clean source `50b2310`; the [canonical evidence](../exec-plans/evidence/001/implementation/performance.json) includes start/end source, lockfile, built-output, browser-cohort and power identity, qualifying painted marks, and per-run/pooled summaries. |
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
| IFR-CONF-002 | P1 | Phase recovery covered return-pending only; a crash after counsel or return response could repeat canonical actions. | ACCEPT | Final repair preserves a pending `CounselIssued` event through the first commit barrier, refuses a conflicting retry, resumes without a second issue, and reconstructs the visible interpretation after the resolve barrier from hash-checked durable decision/proposal bytes bound to the cognition event. Memory and browser-visible crash/reload tests cover both barriers; return response remains single-use. |
| IFR-CONF-003 | P1 | Five-run performance evidence still violated the canonical headed, cold-context, throttled, 30-second-state procedure. | ACCEPT | The final benchmark builds from captured clean source, retains identical start/end source and dist manifests, validates and records the exact frozen browser cohort twice, and records painted fact-free shell, CTA, eight activities, one Mara, named two-citizen interaction, and semantic/illustrated parity at every mark. Fifteen new journeys at `50b2310` pass; normal-mode battery remained 77% to 75% under DEV-M5-004 with unchanged budgets. |
| IFR-CONF-004 | P1 | Timing noninterference had no exact release-path analyzer. | ACCEPT | Closed by IFR-SS-009 and the retained raw analyzer evidence. |
| IFR-CONF-005 | P1 | The focus test did not actually exercise forward and reverse Tab containment. | ACCEPT | The browser test now presses Tab and Shift+Tab at the single-control dialog boundary, proves wrap containment, then verifies Escape, Back, and invoker restoration. |

The final repair also preserves the structured persistence code through Worker, bridge, and UI; the alert branches on `code === "STALE_FENCE"`, not message text. A real two-tab Playwright path proves the old tab cannot write and the new tab continues.

## Final targeted confirmation and closure

The one allowed final targeted reviewer inspected exact candidate `32808e12dce0398ce0bdc622cd1559ef80db8b67` and returned **FAIL with no P0 and three P1s**. Per the bounded review protocol, no second confirmation is claimed. The coordinator inspected and accepted every finding, applied the smallest repairs, and added direct falsification evidence:

| ID | Severity | Final finding | Disposition | Closure evidence |
|---|---|---|---|---|
| IFR-FCONF-001 | P1 | The two-commit counsel path could crash after issue or resolve, repeat counsel, or render an undefined recovered receipt. | ACCEPT | `90d999b`; one-shot first/second-barrier persistence tests; two browser-visible crash/reload journeys; exactly one `CounselIssued`; hash/link-checked decision/proposal rehydration; no undefined receipt. |
| IFR-FCONF-002 | P1 | `STALE_FENCE` was flattened to message text and detected by substring. | ACCEPT | `90d999b`; typed `RiverholdRuntimeError.code` survives bridge boundaries; UI branches on exact code; real two-tab browser journey remains green. |
| IFR-FCONF-003 | P1 | Performance lacked source-built-output/browser-cohort provenance and qualifying painted marks. | ACCEPT | `50b2310`; final 15-run artifact has identical clean source/lockfile/dist boundaries, exact commands/exits, two cohort validators plus hashes/version, qualifying evidence at every painted mark, unchanged numeric budgets, and zero egress. |

Closed portions independently reconfirmed by that reviewer were authority-loading fail-closed behavior, single-use return response, post-response recovery, true Tab/Shift+Tab wrapping, the fixed 20/200 timing analyzer, and real two-tab fencing. Human Gate 0/A/B/Card remain deliberately **NOT RUN**.

## Automated evidence at repaired candidate

Complete `pnpm verify` at `4a677a743d4efcdc337c6ffc0c79d63edee69e8f` passed runtime/cohort/architecture/docs/format/lint/typecheck, 63 unit tests, two property tests, real Chromium IndexedDB reload, the 20/200-cycle timing analyzer, production build/bundle budgets, zero-advisory dependency audit, eight headed browser journeys with 334 local routes/36,489 netlog events and zero external attempts, and bounded TLA+ (3,480 generated/350 distinct states, depth 10, five invariants). Gitleaks 8.30.1 scanned all 103 commits and 4.21 MB of history with no leaks. The normal production bundle contains no compile-time crash-hook string, and the final canonical performance lab at `50b2310` is green. Exact-head GitHub CI remains pending. This is automated/local evidence only.

## Confirmation conclusion

The final targeted confirmation was run exactly once and failed at `32808e1`; it is not rewritten as a PASS. All three reported P1s are accepted and repaired with the exact evidence above. Complete local verification is green; final readiness still requires green remote CI at the final pushed head, and no reviewer verdict substitutes for that check.
