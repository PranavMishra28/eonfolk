# Engineering red team — frozen synthesis

**Purpose:** Adversarially assess the frozen EONFOLK synthesis for systems correctness, determinism, persistence safety, replay fidelity, security, performance, operations, and first-slice feasibility.

**Status:** FROZEN REVIEW COMPLETE — NOT READY FOR IMPLEMENTATION GOAL MODE

**Authority boundary:** This review records objections to frozen commit `4f47eae8fe785f3994e053d01c184e9e3dddb401`. It does not amend product, engineering, quality, decision, risk, question, source-ledger, or execution-plan authorities.

**Related documents:** [authority index](../INDEX.md), [architecture](../engineering/ARCHITECTURE.md), [persistence](../engineering/PERSISTENCE.md), [simulation](../engineering/SIMULATION.md), [security](../engineering/SECURITY.md), [quality bar](../quality/QUALITY_BAR.md), [001-foundation](../exec-plans/completed/001-foundation.md), [decisions](../decisions/DECISIONS.md).

## Review frame and verdict

This review used only the frozen commit named above. It did not inspect later branch state or any other frozen review. Volatile external facts were checked for support and execution-day reopen rules inside the frozen repository; they were not refreshed.

**Verdict: NOT READY.** Two P0 data-integrity paths and eleven P1 contract, gate, and scope failures remain. The architectural direction is promising, but the advertised “locked” contracts are not executable specifications. Starting Goal mode now would force the implementer to invent authority, commit, replay, visibility, and migration semantics while simultaneously attempting a demonstrably overpacked 52-hour product slice.

| Severity | Count | Readiness effect |
|---|---:|---|
| P0 | 2 | Stop: visible/durable divergence and import overwrite can lose canonical history |
| P1 | 11 | Stop: determinism, replay, causality, privacy, gates, renderer authority, and scope are unresolved |
| P2 | 2 | Correct before relying on the future server seam or operational evidence |
| P3 | 0 | No polish-only finding is material while P0/P1 remain |

## Finding index

| ID | Severity | Finding | Primary consequence |
|---|---|---|---|
| ER-001 | P0 | Worker state and IndexedDB commit are not one atomic protocol | Accepted visible progress can disappear or fork after an append failure |
| ER-002 | P0 | Import is allowed to replace a world without a safe replacement contract | A valid or hostile bundle can overwrite invested history |
| ER-003 | P1 | The determinism profile omits algorithms, encodings, ranges, and hash boundaries | Equivalent runs can diverge across runtimes or releases |
| ER-004 | P1 | Rejected-command idempotency cannot be persisted by the declared port | A duplicate ID can produce a different result after state change or reload |
| ER-005 | P1 | Replay interval, event completeness, batch hashing, and engine-version rules conflict | Snapshots can omit/double-apply events or become unverifiable after change |
| ER-006 | P1 | Canonical causal relation types disagree across authorities | Chronicle can encode a non-cause as cause or lose `response-to` |
| ER-007 | P1 | Visibility is a vocabulary, not a noninterference contract | Contexts, catalogs, errors, or causal projections can leak hidden facts |
| ER-008 | P1 | The single-writer lease has no fencing semantics | A suspended former writer can resume after transfer and write again |
| ER-009 | P1 | The irreducible 52-hour scope is internally contradicted by its own research estimate | The build must overrun, silently cut a gate, or ship fragile correctness |
| ER-010 | P1 | Provider-failure tests are blocking even though every provider adapter is excluded | Acceptance requires dead code or tests a route that cannot ship |
| ER-011 | P1 | Long-horizon and device/performance gates are undefined or vacuous | “Pause safely” and “realistic mobile” can pass without a usable result |
| ER-012 | P1 | The renderer authority still selects R3F while accepted decisions forbid it | A zero-context implementer can choose the wrong stack and asset pipeline |
| ER-013 | P1 | Free-form `publicJustification` cannot satisfy the no-unsupported-fact assertion | Player-facing prose can be safe from XSS yet factually ungrounded |
| ER-014 | P2 | The promised drop-in future server seam lacks authenticated authority and transactional outbox/alarm needs | A later `RegionDO` cannot safely implement the same four-operation port |
| ER-015 | P2 | GitHub/tool capability evidence is stale-session narrative, not reproducible execution evidence | Goal mode can rely on missing capabilities or broad, unauthorized credentials |

## P0/P1 findings

### ER-001 — P0 — Worker/IndexedDB commit split permits visible/durable divergence

**Location/evidence.** [`ARCHITECTURE.md`](../engineering/ARCHITECTURE.md) lines 20–22 places canonical transition in Reality/Application while lines 27–34 place the simulation in a Web Worker and the IndexedDB adapter beside it. [`PERSISTENCE.md`](../engineering/PERSISTENCE.md) lines 30–35 and 50 make only the event-batch/head write atomic; lines 81–85 assume catch-up resumes from the committed head. [`SECURITY.md`](../engineering/SECURITY.md) line 25 requires persistence before success acknowledgement. No authority defines when the worker installs candidate state or releases a projection relative to IndexedDB commit.

**Failure mechanism.** A command can validate and advance the worker's in-memory Reality, then an IndexedDB quota error, transaction abort, tab close, or worker/application crash can prevent append. If the projection or next command observes the candidate head, the running game is ahead of durable history. Reload silently loses the accepted counsel and consequence; queued commands can then be based on a revision that never existed durably. The inverse crash—database commit succeeds but the worker dies before acknowledgement—also requires durable command-result deduplication that the port does not provide. This is canonical data loss/corruption under the repository's own P0 definition.

**Minimum fix.** Specify one application commit state machine. The reducer must prepare an immutable `(candidateState, orderedEventBatch, result)` without installing or publishing it. `appendEvents` must compare the durable head and current writer fencing token, persist the event batch, head, and command receipt atomically, and return the committed head. Only then may the worker install the candidate, publish a projection, and acknowledge. On abort it discards the candidate and reloads the committed head; only one transition may be in flight. On “commit succeeded, acknowledgement lost,” retry returns the stored receipt.

**Blocking test.** Add deterministic barriers and terminate/abort at: before prepare, after prepare, before IndexedDB commit, after IndexedDB commit but before worker install, after install but before acknowledgement, and during a queued second command. After restart, the durable head, in-memory head, projection revision, genesis replay hash, and command result must agree. An uncommitted event must never become visible; a committed event must never disappear or apply twice.

**Affected authorities.** `ARCHITECTURE.md`, `SIMULATION.md`, `PERSISTENCE.md`, `SECURITY.md`, `TESTING.md`, `QUALITY_BAR.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decisions D-006 and D-007; risks R-006 and R-007.

### ER-002 — P0 — Import replacement can overwrite canonical local history

**Location/evidence.** [`PERSISTENCE.md`](../engineering/PERSISTENCE.md) line 15 requires visible export/import, while line 50 permits validation “before replacing or creating any world.” [`SECURITY.md`](../engineering/SECURITY.md) lines 45–47 require MIME/size/schema/hash checks but define no raw/expanded/event/time cap, collision rule, staging identifier, backup, publish transaction, or cleanup behavior. [`001-foundation.md`](../exec-plans/completed/001-foundation.md) lines 167–175 makes import/recovery a release drill without defining the recovery invariant.

**Failure mechanism.** Hash validation proves only that a bundle is internally consistent; it does not make it newer, trusted, or safe to overwrite a local world. An old but valid export—or a hostile bundle choosing an existing `worldId`—can pass every stated check and replace a more recent head. A large valid bundle can fill quota during scratch validation. A crash between destructive replacement and final publication can leave the user with neither a valid old world nor a complete new one. MIME is caller-controlled metadata and does not mitigate these cases.

**Minimum fix.** The lowest-scope fix is export-only backup in the first slice and deferring import/migrations. If import remains, it must always stage under a new local import ID, enforce raw bytes, expanded bytes, record count, string/depth, sequence, and CPU/wall-time limits before publication, and never overwrite by default. Replacement requires an explicit comparison, user confirmation, automatic export/backup of the existing head, an atomic pointer swap, and recoverable old data. Failed/cancelled staging must be garbage-collected without touching the original world. Avoid compressed imports in V1 unless expansion-bomb limits are specified.

**Blocking test.** Start with a newer invested world, then import same-ID older/newer bundles, a valid maximum-size bundle, over-limit/unknown-version/gapped bundles, and a compression bomb if compression exists. Inject quota failure, cancellation, tab close, and crash at every staging/publish boundary. In every non-success case the original export bytes, head hash, selected snapshot, and writer lease remain byte-identical and immediately playable; no unbounded orphan storage remains.

**Affected authorities.** `PERSISTENCE.md`, `SECURITY.md`, `TESTING.md`, `QUALITY_BAR.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; risks R-006 and question Q-009.

### ER-003 — P1 — “Deterministic” is not yet a versioned byte-level profile

**Location/evidence.** [`SIMULATION.md`](../engineering/SIMULATION.md) lines 47–58 names integers, fixed point, a seeded PRNG, stable ordering, canonical serialization, and hashes, but supplies none of their concrete algorithms. Event IDs are only “derived without nondeterministic runtime state” at line 35, and line 43 allows hashes around an “event/batch boundary.” [`WORLD_MODEL.md`](../game/WORLD_MODEL.md) line 26 nevertheless promises identical replay hashes. [`001-foundation.md`](../exec-plans/completed/001-foundation.md) lines 80–103 calls the interfaces locked before those choices exist.

**Failure mechanism.** JavaScript “integer” does not define safe ranges, overflow behavior, fixed-point units, or rounding. A “versioned PRNG” does not define algorithm, seed normalization, stream splitting, draw ownership, or state encoding. “Sort keys” does not define UTF-8 bytes, Unicode normalization, enum encoding, `-0`, non-finite values, absent fields, arrays, or integer representation. No hash algorithm, domain separator, or event-ID derivation is selected. Different reasonable implementations can produce different scheduler order, IDs, bytes, and hashes from the same logical world.

**Minimum fix.** Add one small determinism profile owned by `SIMULATION.md`: time unit/range; fixed-point units, rounding, and checked overflow; exact PRNG algorithm/state/seed/stream derivation; stable ID derivation; scheduler priority table and insertion/cancellation allocation; canonical value domain and byte encoding; Unicode policy; exact hash algorithm and domain separation; and an unambiguous per-event or per-transition-batch hash rule. Reject out-of-domain values before any state or draw.

**Blocking test.** Commit golden canonical bytes, IDs, PRNG vectors, and hashes for Unicode edge cases, reordered object/map insertion, maximum/minimum values, equal-time scheduling, cancellation, and multi-event transitions. Run them in the exact supported Node and browser engines. Repeated, one-shot/chunked, genesis/snapshot, and supported-browser runs must be byte-identical, not merely structurally equal.

**Affected authorities.** `SIMULATION.md`, `WORLD_MODEL.md`, `PERSISTENCE.md`, `TESTING.md`, `PERFORMANCE.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decision D-007.

### ER-004 — P1 — Rejected-command idempotency is impossible through the declared port

**Location/evidence.** [`SIMULATION.md`](../engineering/SIMULATION.md) line 27 says every duplicate `commandId` returns the recorded result while stale or unauthorized input creates no event. [`PERSISTENCE.md`](../engineering/PERSISTENCE.md) lines 21–27 exposes no command-receipt operation, and line 32 accepts only a nonempty accepted event batch with “idempotency context.” [`SECURITY.md`](../engineering/SECURITY.md) line 25 requires only the accepted result to be persisted before acknowledgement.

**Failure mechanism.** A rejected ID has no durable record. After reload or a state change, retrying the same ID can be re-evaluated and return a different error or become accepted. For accepted commands, a database commit followed by lost acknowledgement cannot reliably return the original result unless result bytes and a request fingerprint were atomically stored. Reusing one ID with a different payload is also undefined. The claimed idempotency contract therefore fails precisely under crash/retry conditions where it matters.

**Minimum fix.** Scope IDs by world/region and authenticated execution principal. Persist a `CommandReceipt` containing request fingerprint, status, stable result/rejection, and resulting head in the same transaction as any accepted events; a rejected receipt changes no canonical revision, scheduler, resource, or PRNG state. A duplicate with the same fingerprint returns the receipt; the same ID with a different fingerprint fails as an ID collision. Define retention or explicitly narrow the guarantee if forever-deduplication is not intended.

**Blocking test.** Reject command ID X, advance the world until its payload would be legal, restart, and retry X: it must return the original rejection with no event/draw. Retry X with a different payload: it must fail collision. For an accepted X, crash after commit but before acknowledgement and retry: return the original result and head without a second event.

**Affected authorities.** `SIMULATION.md`, `PERSISTENCE.md`, `SECURITY.md`, `ARCHITECTURE.md`, `TESTING.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decision D-007.

### ER-005 — P1 — Replay boundaries, event completeness, and version semantics conflict

**Location/evidence.** [`PERSISTENCE.md`](../engineering/PERSISTENCE.md) line 35 calls ranges “inclusive/exclusive,” line 61 leaves interval endpoints unnamed, while [`001-foundation.md`](../exec-plans/completed/001-foundation.md) line 88 and [`IMPLEMENTATION_GOAL_PROMPT.md`](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md) line 82 call the interval “inclusive.” `PERSISTENCE.md` line 13 stores only “consequential” events; lines 69–79 upcast old events into the current in-memory type and apply a “versioned reducer” without defining which engine implementation owns the recorded hash. [`SIMULATION.md`](../engineering/SIMULATION.md) line 43 leaves hashes at an event or batch boundary.

**Failure mechanism.** A snapshot covering sequence S can cause S to be applied twice or S+1 to be skipped. A transition that emits multiple facts has no defined per-event state or atomic batch replay boundary. If routine interval integration mutates canonical quantities without an event that fully encodes that mutation, genesis replay cannot reconstruct a later snapshot. After reducer semantics change, upcasting into the current reducer does not preserve the old engine's expected hash merely because an `engineVersion` string is present.

**Minimum fix.** Define explicit `snapshotSequence`, `firstEventSequence`, and `lastEventSequence` semantics (or one precise half-open interval) and a zero-event form. State that every canonical mutation, including integrated stable intervals and scheduler/PRNG changes, is fully reproducible from the persisted stream. Choose either sequential per-event hashes or an atomic transition-batch envelope with `batchId`, one pre/post hash, ordered payloads, and atomic replay. For the first slice, support one engine/schema only and fail closed on others; defer upcasters/migrations. Later, retain executable old reducers or define a migration checkpoint/equivalence policy that does not pretend the old hash came from the new reducer.

**Blocking test.** Replay from genesis and snapshots at genesis, every event, every multi-event transition, and head, including zero-event intervals. Exercise an integrated routine span, scheduler cancellation, and PRNG draws. Introduce a fixture whose reducer semantics changed: it must either replay under the pinned old engine or fail explicitly as unsupported, never silently produce a new hash under the old manifest.

**Affected authorities.** `PERSISTENCE.md`, `SIMULATION.md`, `WORLD_MODEL.md`, `ARCHITECTURE.md`, `TESTING.md`, `QUALITY_BAR.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decision D-007 and risk R-007.

### ER-006 — P1 — Causal relation enums and storage meaning disagree

**Location/evidence.** [`SIMULATION.md`](../engineering/SIMULATION.md) lines 40–45 stores `direct-cause`, `trigger`, `contributing-condition`, and `temporal-predecessor` inside `causalParents`. [`WORLD_MODEL.md`](../game/WORLD_MODEL.md) lines 34–36 instead defines `direct`, `trigger`, `contributing`, and `response-to`, and says temporal predecessor is presentation metadata rather than stored causal assertion. [`CHRONICLE.md`](../product/CHRONICLE.md) lines 13–21 uses direct cause, trigger, contributing condition, temporal predecessor, and allegation. D-004 in [`DECISIONS.md`](../decisions/DECISIONS.md) lines 74–84 accepts the Chronicle set.

**Failure mechanism.** An implementer following Simulation will encode a noncausal temporal relation in the causal field and cannot encode `response-to`. Another implementer following World Model will reject valid fixtures produced by the first. Chronicle then has enough type ambiguity to render “before” as a causal edge or silently discard response semantics. That is a direct path to a Gate B causal-truth failure.

**Minimum fix.** Select one canonical causal enum and exact names. Keep noncausal ordering in a separate `relatedEvents`/temporal reference field. Keep allegation as typed event/belief content. Define which reducer rule may emit each causal edge, required parent ordering/region rules, and whether actor knowledge is relevant or separate from mechanical causation. Align Riverhold, design marks, projections, and all schemas.

**Blocking test.** Encode RV-001–RV-012 against one shared schema. Reject a temporal predecessor placed in the causal set, represent `response-to` if retained, reject forward/self/missing parents, and assert every Chronicle causal label round-trips to exactly one canonical relation without inference from sequence.

**Affected authorities.** `WORLD_MODEL.md`, `SIMULATION.md`, `CHRONICLE.md`, `COGNITION.md`, `DESIGN.md`, `TESTING.md`, `EVALS.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decision D-004.

### ER-007 — P1 — Hidden-fact isolation lacks a noninterference contract

**Location/evidence.** [`WORLD_MODEL.md`](../game/WORLD_MODEL.md) lines 28–36 lists visibility labels but no evaluator, subject set, time/revocation rule, derivation rule, or public-redaction rule. [`COGNITION.md`](../engineering/COGNITION.md) lines 35–48 promises visible-only context, line 45 supplies an action catalog, lines 73–80 return typed rejection reasons after validation, and line 80 rechecks visibility and other hidden domain conditions. [`SECURITY.md`](../engineering/SECURITY.md) line 37 requires hostile context not to expand the catalog. [`QUALITY_BAR.md`](../quality/QUALITY_BAR.md) line 50 makes hidden-fact isolation blocking.

**Failure mechanism.** Two worlds with the same visible facts but different secret state can expose the secret through action availability, target IDs, numeric bounds, selected strategy, validation timing, or a detailed rejection reason. A public event can also cite a private causal parent and reveal its ID or content through Chronicle expansion. Filtering the `visibleFacts` array alone does not stop these side channels. Later provider prompt injection is irrelevant; the leak can occur entirely in deterministic code.

**Minimum fix.** Define a pure, versioned `canRead(viewer, purpose, record, atRevision)` policy and subject/participant semantics for every visibility class. Build DecisionContext, action catalogs, target lists, public Chronicle, and rejection messages only through purpose-specific projections. A Brain-safe rejection code must not disclose hidden existence/value; internal diagnostics stay outside Mind and presentation. Derived/public events do not inherit or reveal private parents unless a typed disclosure event authorizes it. The future server must inject authenticated viewer identity outside client payload.

**Blocking test.** Use metamorphic world pairs identical in every visible record but different in private Reality/Mind. For each citizen/patron/public viewer, DecisionContext bytes, catalog/targets, Standard-Brain proposal, Brain-visible rejection, public projection, and timing class must remain identical until an authoritative observation/disclosure event occurs. Exhaust every visibility class and a public child event with a private parent.

**Affected authorities.** `WORLD_MODEL.md`, `COGNITION.md`, `SIMULATION.md`, `SECURITY.md`, `CHRONICLE.md`, `TESTING.md`, `EVALS.md`, `QUALITY_BAR.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decisions D-004, D-005, and D-007.

### ER-008 — P1 — The writer lease is not fenced

**Location/evidence.** [`PERSISTENCE.md`](../engineering/PERSISTENCE.md) lines 15 and 45 store a writer lease, while line 118 admits crash recovery is unresolved. [`SECURITY.md`](../engineering/SECURITY.md) line 47 requires a lease and lines 82–83 require dual-tab/crash tests. No document defines acquisition, transfer, expiry, ownership token, fencing generation, renewal, clock source, or an atomic lease check inside `appendEvents`.

**Failure mechanism.** Tab A can be suspended, Tab B can time out/take the lease, and Tab A can later resume. Expected head compare-and-swap prevents one simultaneous stale append, but it does not prevent former writer A from reading the new head and appending again. The system has two serialized writers despite promising one. Timeout-only leases are especially unsafe under browser suspension and clock changes.

**Minimum fix.** Prefer a browser Web Lock where supported plus an IndexedDB fencing generation as durable correctness. Lease acquisition/transfer increments a monotonic fencing token. Every append and snapshot-publication transaction verifies the token; a resumed old tab can never regain write authority without reacquisition. BroadcastChannel may improve UX but is not authority. Define crash recovery, explicit takeover, read-only behavior, and environments without Web Locks.

**Blocking test.** Pause A after it acquires a lease, transfer/take over in B, commit in B, then resume A, refresh it to the current head, and attempt append/snapshot publication. Both must fail on fencing, not merely stale revision. Also force-close the writer during append and verify deterministic reacquisition, one counsel effect, gapless sequence, and unchanged replay hash.

**Affected authorities.** `PERSISTENCE.md`, `SECURITY.md`, `ARCHITECTURE.md`, `TESTING.md`, `QUALITY_BAR.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; risk R-006 and question Q-009.

### ER-009 — P1 — The 52-hour “irreducible” slice is not credible

**Location/evidence.** [`001-foundation.md`](../exec-plans/completed/001-foundation.md) lines 32–42 allocates 8/20/16/8 hours while forbidding cuts to eight citizens, three resources, Standard Brain, persistence/replay, counsel consequence, Chronicle, semantic action path, and three viewports. Lines 44–55 add movement, economy, four behaviors, Mind/social state, event sourcing, IndexedDB, catch-up, replay, Pixi, a fully playable semantic alternative, reduced motion, and share output. Lines 91–185 add property/fuzz, import/migrations, 365-day runs, performance profiling, human observer gates, accessibility, and independent review. The underlying [`SYSTEMS_RESEARCH.md`](../research/SYSTEMS_RESEARCH.md) lines 378–435 already estimates 46–60 hours for contracts, headless simulation/cognition, persistence, an inspectable projection, hardening, and contingency, explicitly excluding elaborate rendering.

**Failure mechanism.** The synthesis adds the complete authored Pixi experience, parallel semantic game, three-viewport proof, Riverhold attachment branch, share composition, import security, and broader QA without adding time to a research estimate already consuming the entire envelope. There is no meaningful declared cut left if correctness or UI integration expands. The likely outcomes are silent >60-hour work, fake/waived evidence, or rushed persistence/security—the exact P0s found above.

**Minimum fix.** Re-plan around a maximum 48-hour work breakdown plus 12 hours explicit contingency/review, including human-test and dependency/setup time. For the first slice: export only (no import/upcasters/migrations); current schema/engine only; no provider harness/traces; one basic authored Pixi atlas with native semantic controls and no Motion/Base UI/3D pipeline; remove the twelve-citizen requirement; implement one actual Riverhold outcome with the other interpretation modes as small deterministic fixtures; and move 90/365-day full-matrix, physical-device performance, and future-server contract work to follow-up gates. If those cuts no longer test the product thesis, acknowledge that the thesis itself exceeds the envelope.

**Blocking test.** Before Goal mode, map every blocking criterion to one owned implementation task, dependency, evidence task, and three-point estimate; total the expected case at no more than 48 hours with 12 hours reserved. Count review/fix and fresh-player time. At hour 8, the frozen byte-level contracts and failure-injected commit protocol must pass headlessly; at the next boundary, stop or execute predeclared cuts rather than borrowing from QA.

**Affected authorities.** `001-foundation.md`, `IMPLEMENTATION_GOAL_PROMPT.md`, `QUALITY_BAR.md`, `TESTING.md`, `VISUAL_QA.md`, `PERFORMANCE.md`, `COST_MODEL.md`, `DECISIONS.md`, `RISKS.md`, and `OPEN_QUESTIONS.md`; decisions D-002 and D-007, risk R-005.

### ER-010 — P1 — Provider fallback is a fictional blocking gate in a provider-free slice

**Location/evidence.** [`COGNITION.md`](../engineering/COGNITION.md) lines 11–17 says Standard Brain handles every boundary and no model runtime/SDK enters the slice. [`001-foundation.md`](../exec-plans/completed/001-foundation.md) lines 139–151 excludes model adapters but requires provider absence/timeout/malformed fixtures. [`QUALITY_BAR.md`](../quality/QUALITY_BAR.md) line 51, [`SECURITY.md`](../engineering/SECURITY.md) line 81, [`EVALS.md`](../quality/EVALS.md) line 31, and [`IMPLEMENTATION_GOAL_PROMPT.md`](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md) lines 132–134 make provider failure blocking or routinely conditional.

**Failure mechanism.** There is no provider route to time out, return 429, revoke a credential, or produce malformed output. Passing the gate requires implementing a dummy adapter/fallback orchestrator expressly excluded by scope, or writing tests against dead code that prove nothing about the shipped path. It spends scarce hours and can conceal the more important fact: Standard Brain itself has no second fallback if it throws or violates invariants.

**Minimum fix.** In V1, replace provider-failure gates with compile/dependency/network absence and direct Standard-Brain liveness tests. If a tiny generic `BrainPort` remains, test cancellation/`NoProposal` as a pure interface behavior without provider-specific errors or traces. Move 429, credential, model-not-found, schema-repair, and provider-removal tests to the first real optional-adapter gate.

**Blocking test.** From a clean install with network denied after dependencies are present, scan the dependency/import graph for provider/model runtimes, run every decision fixture through Standard Brain, and replay without cognition. All worlds progress. Provider-specific failure fixtures must be absent from the V1 blocking manifest and become required automatically only when an adapter package/change exists.

**Affected authorities.** `COGNITION.md`, `SECURITY.md`, `QUALITY_BAR.md`, `TESTING.md`, `EVALS.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decision D-005.

### ER-011 — P1 — Long-horizon and performance acceptance can pass vacuously

**Location/evidence.** [`SIMULATION.md`](../engineering/SIMULATION.md) lines 60–71 defines behavior only through 90 days, yet lines 92 and 113 require or discuss 365 days. [`PERFORMANCE.md`](../quality/PERFORMANCE.md) lines 88–92 defers catch-up event/time limits until measurement and line 115 has no humane-wait number. [`QUALITY_BAR.md`](../quality/QUALITY_BAR.md) line 49 passes a 30/90/365-day case if it merely “complete[s] or pause[s] at a declared safe boundary.” `001-foundation.md` lines 127–131 and 193–195 requires a “realistic mid-tier mobile/4G profile” without naming device, browser, CPU/network throttle, cache state, or automation method.

**Failure mechanism.** A 365-day test can pause at its first committed event and technically pass. There is no supported maximum gap, required progress rate, event/storage ceiling, or resume-count limit. Two implementers can choose favorable and incomparable “mid-tier mobile” profiles. The result can satisfy prose while making an old world take hours or making the mobile budget irreproducible.

**Minimum fix.** Before implementation, either set a supported V1 absence horizon and concrete wall-time/event/storage/resume limits, or classify 90/365 days as measurement-only reopen evidence rather than a release pass. Define semantics for every supported duration, not just table exemplars. Pin browser versions, M4 profile, mobile hardware or reproducible emulation CPU/network settings, cold/warm cache, pixel ratio, and measurement script. “Pause” passes only if minimum simulated-time progress and bounded resume count are met.

**Blocking test.** Use named fixed worlds at every supported horizon and assert target simulation time, final hash, maximum event/snapshot bytes, maximum wall time, maximum uninterrupted worker slice, and maximum resumes. Run performance capture twice on the pinned desktop and mobile profiles and report p50/p95/worst variance. A missing physical device is a caveat or deferred gate, not evidence from viewport emulation.

**Affected authorities.** `SIMULATION.md`, `PERSISTENCE.md`, `PERFORMANCE.md`, `QUALITY_BAR.md`, `TESTING.md`, `VISUAL_QA.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; risk R-007 and question Q-010.

### ER-012 — P1 — Renderer and asset authorities still conflict after Pixi selection

**Location/evidence.** [`INDEX.md`](../INDEX.md) line 70 says `FRONTEND.md` owns the PixiJS/DOM boundary. [`FRONTEND.md`](../engineering/FRONTEND.md) lines 5 and 15–21 still makes R3F/WebGL2 provisional, lines 54–58 mandates Blender → GLB → KTX2, and lines 80–85 treats Pixi as an unresolved switch. D-008 in [`DECISIONS.md`](../decisions/DECISIONS.md) lines 138–152 rejects R3F/Three and 3D assets for V1. `001-foundation.md` line 30 and the Goal prompt lines 65–72 and 95–112 require PixiJS only. [`PERFORMANCE.md`](../quality/PERFORMANCE.md) lines 19–23 still budgets “3D assets” and its degradation order names shadows/mesh detail.

**Failure mechanism.** A zero-context implementer following the authority index can legitimately install R3F/Three, author GLB/KTX2 assets, and optimize shadows; following the accepted decision makes all of that prohibited scope. The contradiction affects dependencies, payload evidence, asset provenance, frame gates, and the first eight-hour setup, so it cannot be left as editorial cleanup.

**Minimum fix.** Make `FRONTEND.md` unambiguously accept one PixiJS 2.5D renderer, a sprite/atlas asset path, and DOM facts/actions; retain the R3F spike only as rejected evidence. Rewrite performance budgets and degradation terms for raster/vector atlas bytes, texture resolution, draw calls, batching, filters, and particle count. Keep Weathered Atlas as an art treatment fallback without changing renderer unless a new decision explicitly says so.

**Blocking test.** The initial lockfile/import graph contains PixiJS but no Three/R3F/GLB/KTX2 toolchain. One authored Pixi fixture at all pinned profiles passes payload/frame/layout/access gates and renderer loss leaves the same consequential semantic path. Any renderer change reopens D-008 rather than following stale prose.

**Affected authorities.** `INDEX.md`, `FRONTEND.md`, `PERFORMANCE.md`, `VISUAL_QA.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `RISKS.md`, `OPEN_QUESTIONS.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decision D-008 and risk R-004.

### ER-013 — P1 — Free-form justification cannot meet the factuality assertion

**Location/evidence.** [`COGNITION.md`](../engineering/COGNITION.md) lines 50–63 defines `publicJustification` as a free-form bounded escaped string, while validation at lines 78–82 checks shape/authority but not semantic support. [`EVALS.md`](../quality/EVALS.md) line 40 requires every public justification to introduce no unsupported fact. [`CHRONICLE.md`](../product/CHRONICLE.md) line 21 and the Goal prompt line 93 call justification testimony rather than evidence.

**Failure mechanism.** Escaping prevents code execution, not false claims. A string can be schema-valid and say “Toma stole the grain” without any fact supporting theft. No generic byte/schema validator can prove arbitrary natural language is grounded. If that text appears beside a decision or enters a summary, it violates the hard assertion or misleads the player even when Chronicle itself remains templated.

**Minimum fix.** Make V1 explanation a typed `DecisionExplanation` containing reason codes, selected utility factors, visible fact/belief/event references, and authored template slots. If optional model prose later exists, render it only as clearly attributed testimony and exclude it from factual explanation, Chronicle predicates, and hard groundedness claims. Do not ask a semantic evaluator to turn arbitrary prose into authority.

**Blocking test.** Every V1 explanation clause must be generated from an allowlisted template and resolve to a visible typed record. Fuzz hostile/unsupported prose through proposal fields and prove it is discarded or displayed only in a nonfactual attributed area; it must never alter Chronicle copy, action score, fact status, or causal labels.

**Affected authorities.** `COGNITION.md`, `EVALS.md`, `CHRONICLE.md`, `SECURITY.md`, `QUALITY_BAR.md`, `001-foundation.md`, and `IMPLEMENTATION_GOAL_PROMPT.md`; decisions D-004 and D-005.

## P2 findings

### ER-014 — P2 — The future server seam is an option, not the claimed drop-in adapter

`ARCHITECTURE.md` lines 72–89 and `PERSISTENCE.md` lines 87–91 claim a `RegionDO` can implement the same storage semantics without simulation change. The actual four-operation port has no authenticated execution context, command receipt lookup, fenced writer token, transactional inbox/outbox, alarm/scheduler publication, audit result, backup/restore, or read-model cursor. `SIMULATION.md` lines 21–24 also puts a client/application-supplied authority class inside `WorldCommand`, while `SECURITY.md` lines 22 and 28 says a future server must authenticate it and trust no client role.

Minimum correction: call the current port V1-local and preserve pure domain types, but stop promising adapter substitution. At the hosted gate, inject authenticated authority out of band, design atomic receipt/event/outbox/alarm semantics, threat-model import-to-canon, and run a two-adapter contract spike before selecting `RegionDO`. This remains P2 only because all hosted work is explicitly deferred.

### ER-015 — P2 — GitHub/tool evidence is not an execution-day operational control

`TESTING.md` lines 99–116 reports interpreted `gh api` outcomes but retains no exact commands, redacted response artifact, response timestamp, or named commit evidence; `PLAN.md` line 61 overstates this as “Exact API results.” That conflicts with `QUALITY_BAR.md` line 70, which says unreproducible evidence is only a note. `PROPOSED_TOOLS.md` lines 39–52 is explicitly current-session state and lines 206–241 requires re-probing, but the Goal prompt has no startup tool/auth/capability inventory. It also records broad `repo`/`workflow` scopes that are capability, not authorization. `TESTING.md` line 106 observes that all Actions are allowed and SHA pinning is not required, while `SECURITY.md` line 68 permits a generic “lockfile/version” pin; GitHub Actions have no package lockfile here, so a movable action tag can still enter a privileged CI job.

Minimum correction: add a read-only execution preflight to the Goal prompt that records tool versions, active skill/tool availability, local Playwright/browser smoke, exact redacted GitHub capability commands/results, account/plan caveats, and whether local-only substitutes exist. No push, ruleset, setting, workflow, PR, or other remote mutation follows without explicit authorization. Treat current probe prose as dated planning context, not a passing implementation control. If CI is later authorized, pin third-party actions to reviewed commit SHAs, declare least `permissions`, avoid secrets on untrusted fork code, and narrow the allowed-actions policy before relying on the workflow.

## Contract audit

The architecture calls six interfaces “frozen conceptually before UI work,” but none currently reaches implementable field-level closure.

| Contract | Audit | Blocking gaps |
|---|---|---|
| `WorldCommand` | **FAIL** | Simulation omits the schema version required by the ExecPlan/Goal; principal trust is ambiguous; ID scope/fingerprint/result retention is absent; rejected deduplication is impossible (ER-004, ER-014) |
| `WorldEventEnvelope` | **FAIL** | ID derivation, event-versus-batch hash boundary, complete mutation encoding, causal enum, visibility evaluator, and exact schema/version ownership are unresolved (ER-003, ER-005–ER-007) |
| `DecisionContext` | **FAIL** | Size budgets have no concrete bounds; action catalog/targets/rejections can leak hidden state; viewer/purpose/revision policy is absent (ER-007) |
| `IntentProposal` | **FAIL** | Proposal/context ID derivation and retry behavior are absent; free-form justification conflicts with factual hard assertions; Brain-safe rejection semantics are missing (ER-007, ER-013) |
| `ReplayManifest` | **FAIL** | Interval endpoints conflict; compatible engine/reducer availability and zero-event/head/snapshot rules are absent; presentation/private-data filtering is not versioned (ER-005) |
| `PersistencePort` | **FAIL** | Declared interface lacks the revision-report operation required by the ExecPlan/Goal, plus commit choreography, command receipts, writer fencing, import/export, world lifecycle, and safe future-server requirements (ER-001, ER-002, ER-004, ER-008, ER-014) |
| `ScheduledItem` / Standing Plan support | **PARTIAL** | Conceptual fields exist, but priority registry, ID/cancellation derivation, wake-condition encoding, plan step atomicity, and snapshot/event ownership are not frozen (ER-003, ER-005) |

## Contradiction matrix

| Concern | Authority A | Authority B | Consequence | Required resolution |
|---|---|---|---|---|
| Renderer | `FRONTEND.md` lines 15–21 selects R3F provisionally | D-008, 001, and Goal forbid R3F and require Pixi | Wrong dependencies/assets/budgets | Revise frontend/performance to final Pixi decision |
| Causal relations | `SIMULATION.md` stores temporal predecessor and lacks response-to | `WORLD_MODEL.md` forbids stored temporal cause and includes response-to | Chronicle schema cannot be authoritative | One enum plus separate noncausal relation |
| Command schema | `SIMULATION.md` command field table has no schema version | 001/Goal require one | Wire format is not actually locked | Add exact version/type ownership |
| Persistence head | `PERSISTENCE.md` exposes four operations without head/revision read | 001/Goal says the port reports revision | Implementers must invent a fifth operation or leak adapter state | Freeze exact port including head/receipt semantics |
| Replay range | Persistence says inclusive/exclusive or unspecified endpoints | 001/Goal says inclusive interval | Off-by-one replay | Name first/last semantics and zero-event case |
| Provider scope | Cognition/001 excludes adapters and SDKs | Quality/security/evals/Goal require provider failures | Dead-code gate or scope breach | Make provider suite conditional on a real adapter |
| Horizon | Simulation semantics stop at 90 days and budgets are unset | Quality/001/Goal blocks on 365 days or immediate safe pause | Vacuous release test | Set supported horizon and measurable progress/caps |
| Authority status | `WORLD_MODEL.md` and `CHRONICLE.md` remain “DECISION PROPOSED” | Decisions/001/Goal call their contracts accepted/locked | Goal starts from unsettled truth semantics | Reconcile findings, then change status deliberately |
| GitHub evidence | Testing/Plan present actual capability as completed evidence | Testing itself says re-run; tool inventory is session-bound | Stale controls can be mistaken for enforcement | Execution-day reproducible preflight |

## Minimum scope cuts before re-estimation

These cuts protect the actual product thesis—autonomous life, rejectable counsel, consequence, factual return—while removing machinery that does not prove it.

1. **Export only.** Defer import, legacy upcasters, migrations, replacement, and import fuzzing. Preserve one current engine/schema and a self-contained immutable export.
2. **No provider-shaped runtime work.** Keep Standard Brain and typed proposal boundaries. Remove provider errors, traces, repair loops, tokens, and adapter orchestration until an actual post-gate adapter exists.
3. **Narrow long horizon.** Pick one useful supported V1 absence horizon with a real wait/storage budget. Keep 90/365-day headless measurements as follow-up evidence unless they receive exact, nonvacuous release thresholds.
4. **Make the visual proof deliberately primitive.** Pixi only, one small authored atlas or shapes, native semantic DOM controls, no Motion/Base UI/3D pipeline, no twelve-citizen performance requirement, and no physical-mobile claim without a named device.
5. **One Riverhold vertical branch.** Ship one observed interpretation/outcome chain; cover accept/reject/delay/reinterpret as small deterministic fixtures rather than four equally polished content branches.
6. **Defer the hosted seam beyond pure domain isolation.** Keep `regionId` and pure packages, but do not implement or promise auth, outbox, alarm, cross-region, or drop-in `RegionDO` compatibility.
7. **Budget correctness first.** Freeze the commit state machine, idempotency receipts, deterministic bytes, event completeness, causal enum, and visibility noninterference before any renderer integration.

If the remaining work still cannot fit 48 planned hours plus 12 contingency/review hours, the repository must trigger R-005 and reduce the product proof rather than relabeling work as polish.

## Strongest surviving choices

- **Standard Brain as the complete V1 path survives.** It is the cleanest fit with $0, no account/key/download, replay, device inclusion, and no training. Removing fictional provider tests makes this choice stronger.
- **Pure Reality plus typed proposal validation survives.** One reducer and no renderer/wall-clock authority are correct boundaries once the commit protocol and deterministic bytes are specified.
- **Local-first before server survives.** No deployment, auth, public writes, or Cloudflare work belongs before product evidence. The future adapter claim should be weakened, not the local-first decision.
- **One Pixi renderer plus semantic DOM survives.** It aligns with the accepted art direction and accessibility goal; the stale R3F/3D authority must be removed.
- **Typed facts, beliefs, allegations, and template Chronicle survive.** This is the right defense against narrative laundering once causal enums, visibility, and typed explanations agree.
- **Append-only canonical history plus rebuildable snapshots survives in reduced form.** One current schema, complete events, verified snapshots, and export are sufficient; migrations/import/general server compatibility are premature.
- **Cut-before-spend and no-deploy discipline survives.** The cost and credential boundaries are explicit and appropriately conservative.

## Readiness conditions

Do not change this verdict until:

1. ER-001 and ER-002 have authority-level protocols and failure-injection tests;
2. ER-003 through ER-008 are reconciled into one executable contract set;
3. the causal, visibility, renderer, and justification contradictions are removed from every affected authority and prompt;
4. long-horizon/device gates have exact nonvacuous profiles or are explicitly deferred;
5. provider-only work and other scope cuts are removed from the V1 blocking manifest;
6. the first-slice plan is re-estimated within the binding envelope with contingency and a stop/cut boundary; and
7. the revised Goal prompt passes a fresh zero-context contract audit without requiring unstated authority, tools, or algorithms.

Until then, the only safe implementation work is a bounded disposable contract/commit-protocol spike. Full Goal mode is **NOT READY**.
