# World-as-Product systems/correctness release review

**Purpose:** Record an independent systems review of World-as-Product Reality ownership, spatial presentation honesty, deterministic replay/persistence, Chronicle spatial focus, direct interaction boundaries, and the tests claimed as release evidence.

**Status:** FROZEN REVIEW COMPLETE — NOT READY; ZERO P0, FOUR P1, AND ONE P2 FINDING

**Authority boundary:** This file owns review findings against the exact frozen candidate below. It does not amend implementation, planning status, shared authorities, decisions, risks, questions, source evidence, or release claims.

**Related documents:** [authority index](../INDEX.md), [simulation](../engineering/SIMULATION.md), [persistence](../engineering/PERSISTENCE.md), [frontend](../engineering/FRONTEND.md), [security](../engineering/SECURITY.md), [visual QA](../quality/VISUAL_QA.md), [testing](../quality/TESTING.md), and [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

## Frozen target and independence

| Item | Frozen value |
|---|---|
| Source commit | `afdc6e0e68afb54a79445324cd473e9f2a434cda` |
| Source tree | `543c4abd19bab6956b276017beaf07d512384263` |
| Commit time | `2026-08-21T20:52:08-07:00` |
| Comparison base / merge base | `main` at `74a8a7e07d0743f467dd9547ebf4193eb53d6029` |
| Actual comparison | 198 files; 29,148 insertions; 1,529 deletions |
| Review worktree | `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/world-systems-release-review` |
| Review branch | `review/world-systems-release-afdc6e0` |

The reviewer did not read or request either parallel release-review output and did not delegate any part of this review. The frozen target remained unchanged throughout inspection. Only this review artifact was written.

## Method and executed evidence

The review:

1. read the complete World-as-Product override and repository authority map;
2. inspected the actual `main...afdc6e0` diff and traced protocol/state → transition/reducer/scheduler → application commit → IndexedDB reconstruction;
3. traced task reservations, semantic travel, exchange settlement, event-linked projection, presentation clock, camera/direct selection, residency/LOD, Chronicle focus, and diagnostic mismatch detection;
4. checked that camera, selection, diagnostics, cognition, and presentation have no import or command path that mutates Reality; and
5. ran focused deterministic, persistence, property, browser, and architecture checks rather than relying on reported aggregate results.

Executed results:

- `pnpm exec vitest run tests/unit/systems/simulation.test.ts tests/unit/world-presentation/spatial.test.ts apps/web/src/authoritative-runtime.test.ts`: **3 files / 42 tests passed**.
- `pnpm architecture:check`: **passed**.
- `pnpm exec vitest run tests/property/persistence.model.test.ts tests/unit/persistence/memory.test.ts tests/unit/systems/branches.test.ts tests/unit/systems/properties.test.ts`: **4 files / 24 tests passed**.
- `pnpm build`: **passed**; Vite reported the existing PlayCanvas worker externalization and large-chunk warnings.
- Focused production Playwright run for embodied-world and direct-world-selection journeys: **2 tests passed in 14.3 seconds**.
- Direct production-browser durability probe after a fresh genesis: presentation tick advanced from **12 to 102** during three seconds of observation while the IndexedDB world head remained **revision 0, last sequence 0**, and the event store remained empty. This reproduces WAPR-SYS-001 without modifying the frozen tree.

The host supplied Node `v25.2.1`, while the repository pins Node `22.23.1`; pnpm `11.15.1` matched. These focused results are valid review evidence but do not replace the coordinator's pinned-runtime release lattice.

## Verdict

**NOT READY.** No P0 was found. Reality does own the accepted spatial primitives: authored places and symmetric travel durations, task reservations and capacity, origin-preserving `TravelStarted`, authoritative `TravelArrived`, inventory effects, and atomic exchange/repair results. Candidate state remains immutable until a durable commit; focused replay, property, persistence, and stale-writer tests passed. Camera, direct selection, residency, and presentation remain read-only projections.

Four P1 failures nevertheless contradict the release-blocking World-as-Product contract. Canonical Riverhold does not progress while it is watched; completed task results are rendered as continuing tasks and the visible exchange transfer happens after settlement; cross-revision projection resets can rewind travellers while disabling teleport detection; and the claimed ten-second temporal gate neither runs ten seconds nor covers the required lifecycle/reload failures. One P2 leaves Chronicle spatial focus dependent on present-day positions rather than event-time space.

| Severity | Count | Readiness effect |
|---|---:|---|
| P0 | 0 | No canonical corruption, unauthorized write, replay divergence, or destructive persistence path reproduced |
| P1 | 4 | Release-blocking continuity, choreography, projection-honesty, and evidence-gate failures |
| P2 | 1 | Historical spatial-focus correctness gap outside the current fixed Mara path |

**P0/P1 remain:** **YES — four P1 findings remain.** The candidate must not merge until WAPR-SYS-001 through WAPR-SYS-004 are corrected and directly confirmed against one new frozen SHA.

## Findings

### WAPR-SYS-001 — P1 — The visible world clock moves, but canonical Riverhold does not progress while watched

**Evidence and reproduction.** `AuthoritativeRiverholdRuntime.dispatch` emits an `Advance` command only for `investigate-count` (60 seconds) and `confirm-advance` (86,400 seconds). `runtime.worker.ts` has no canonical cadence, alarm, or bounded elapsed-time proposal. `WorldController` independently advances only `presentationTick` on each renderer update. In a fresh production-browser probe, the canvas advanced from presentation tick 12 to 102 while IndexedDB still contained a genesis head at revision 0/sequence 0 and zero world events.

The three genesis travellers and four genesis tasks therefore animate without the world crossing a decision boundary. Watching past a route's visual duration cannot commit `TravelArrived`, settle the exchange, gather a resource, or progress repair. Camera visibility correctly does not affect Reality, but neither does the passage represented by the continuously animated world. “Embodied world advances continuously” currently means only that renderer interpolation advances.

**Affected files.** `apps/web/src/authoritative-runtime.ts`, `apps/web/src/runtime.worker.ts`, `apps/web/src/components/RiverholdWorld.tsx`, `packages/sim/src/scheduler.ts`, and `tests/e2e/riverhold.spec.ts`.

**Recommended disposition: ACCEPT.** Add one bounded application cadence that proposes deterministic `Advance` boundaries to the authoritative worker independently of camera/residency, using wall time only outside Reality. Persist before publishing each accepted boundary, coalesce inactive time through the existing catch-up contract, and preserve the explicit player confirmation where product authority requires it. If that scope is intentionally rejected, stop calling the current behavior a continuous simulated world and reopen the release decision; presentation-only motion cannot satisfy this override.

**Direct confirmation.** Under a controlled clock, observe Riverhold without player input through at least one authored arrival and one task boundary. Assert monotonic durable revision/sequence, `TravelArrived` only at/after its expected simulation time, an off-camera citizen reaches the same result, reload reconstructs the exact head, and disabling the renderer produces identical events/hashes.

### WAPR-SYS-002 — P1 — Canonical result events start persistent visual work, so task choreography runs after settlement and never resumes

**Evidence and reproduction.** The scheduler emits `ExchangeCompleted`, `ResourceGathered`, and `MillRepaired` directly. Their reducers apply inventory/building effects and create a task reservation in the same result event. There is no authoritative task-stage transition that represents approach → work/transfer → result → release/resume. The resulting reservation and `currentBehavior` remain active indefinitely unless a later unrelated action happens to release them.

`canonicalActionForCitizen` maps the most recent result event to a `status: "committed"` exchange/gather/repair animation. `WorldController` deliberately hides the transfer prop while the genesis exchange is `in-progress`, then shows the handoff for ticks 0–47 only after a committed `ExchangeCompleted` event. At tick 330, the unit suite still requires the committed exchange interaction to exist. The prop disappears, but the paired exchange pose and task remain. Equivalent gather and repair result animations loop after their resource/building mutations.

This reverses the override's physical contract. The world first settles the result, then visually performs it, and never emits the “each resumes plan” boundary. The animation is event-linked, but it is not temporally truthful.

**Affected files.** `packages/sim/src/scheduler.ts`, `packages/sim/src/reducer.ts`, `packages/sim/src/transition.ts`, `apps/web/src/authoritative-runtime.ts`, `packages/world-presentation/src/projector.ts`, `apps/web/src/components/RiverholdWorld.tsx`, and the simulation/presentation tests.

**Recommended disposition: ACCEPT.** Model the bounded task stages needed by this slice in Reality: reservation/approach, active work or exchange transfer, committed result, and release/resume. Presentation may interpolate within an authoritative in-progress stage, but it must not display settlement before the result or keep a completed action as current work. Do not add footstep events or a generalized job engine.

**Direct confirmation.** For exchange, gather, and repair, assert the exact state/event/action sequence, reservation ownership and release, prop visibility only during the authoritative transfer/work stage, one atomic conserved result, a reaction/resume state after completion, and no completed pose or transfer remaining after ten seconds, zoom, pause, reload, or unrelated commands.

### WAPR-SYS-003 — P1 — Every new world head resets route interpolation and erases the evidence needed to detect the resulting rewind

**Evidence and failure mechanism.** `WorldController` resets its presentation clock to tick 0 and sets `previousProjection` to null whenever `projection.spatial.source.stateHash` changes. `projectSpatialScene` computes route distance only from `presentationTick * 30`; it does not seed progress from `simulationStart`, current simulation time, a preserved action-progress key, or a coalesced transition. `inspectSpatialProjection` checks teleport distance only when the old and new projections have the same state hash and increasing tick.

An accepted command that changes Reality while a traveller is still in progress therefore redraws that citizen at the route origin. The first such command in the shipped path is the 60-second investigation advance: genesis travel remains due at 150/180 seconds, the state hash changes, and all three travellers restart their visual routes. The diagnostic intentionally discards the prior sample, so `data-teleports="0"` cannot see this cross-head rewind. Reload has the same zero-tick reconstruction problem.

This violates the no-routine-teleport and zoom/pause/reload recovery requirements even though canonical `placeId` remains correctly at the origin.

**Affected files.** `apps/web/src/components/RiverholdWorld.tsx`, `packages/world-presentation/src/projector.ts`, `packages/world-presentation/src/inspection.ts`, and the spatial/browser tests.

**Recommended disposition: ACCEPT.** Key presentation continuity by canonical action identity and derive reconstructable baseline progress from authoritative semantic time. When a coarse command moves simulation time, animate an explicit bounded catch-up transition rather than silently rewinding or jumping. Keep the last projection across a head change long enough to inspect the transition; diagnostics must not exempt the exact boundary most likely to teleport.

**Direct confirmation.** Sample all three genesis travellers mid-route, commit an unrelated event and an `Advance(60)`, then reload at the same authoritative head. Before/after route positions must be monotonic or explicitly coalesced within a declared transition budget; no actor may return toward its origin; cross-head diagnostics must observe the comparison; canonical hashes must remain unchanged by camera and presentation sampling.

### WAPR-SYS-004 — P1 — The automated Living World gate is a two-second pose sampler, not the required ten-second lifecycle test

**Evidence and failure mechanism.** The production test named `embodied world advances continuously without projection contradictions` takes eight samples separated by 250 ms: approximately two seconds, not ten. It checks increasing presentation ticks, class count, moving-actor count, one interaction, and diagnostic counters. It performs no canonical command during the sample and asserts no durable revision, task stage, result, release, resume, stuck timeout, cross-head transition, pause, zoom, reload, or renderer-independence outcome.

The unit suite can inspect arbitrary ticks, but it treats a committed exchange still active at tick 330 as correct. The mismatch inspector has no stuck or permanently-wrong-loop rule, and its teleport rule explicitly excludes state-hash transitions. Passing these tests therefore cannot substantiate the ExecPlan claim that ten-second checks cover task stages, action/prop/target correspondence, occupancy, stuck/mismatch detection, and zoom/pause/reload recovery.

**Affected files.** `tests/e2e/riverhold.spec.ts`, `tests/unit/world-presentation/spatial.test.ts`, `packages/world-presentation/src/inspection.ts`, and `docs/exec-plans/active/002-founder-alpha.md`.

**Recommended disposition: ACCEPT.** Replace the pose sampler with a deterministic temporal scenario spanning at least 300 presentation ticks and multiple authoritative stage boundaries. Add explicit failure oracles for stuck action, completed-action looping, reservation leak, cross-head teleport, prop/result inversion, and reload recovery. Keep a shorter smoke test separately if CI duration requires it; do not label it as the release gate.

**Direct confirmation.** Mutation-test each oracle by injecting one rewind, one permanently completed exchange loop, one missing task release, one early/late prop, one blocked-path point, and one reload progress reset. The ten-second gate must fail every mutant and pass the frozen normal run in illustrated and semantic modes.

### WAPR-SYS-005 — P2 — Chronicle spatial focus is reconstructed from present state, not the event-time place

**Evidence and failure mechanism.** `AuthoritativeRiverholdRuntime.#chronicle` derives each beat's `placeId` from `state.citizens[firstParticipant].placeId` after the full current ledger has been reduced. It does not derive location from the evidence event, its causal travel chain, or a replay at that event sequence. The Chronicle “Show in world” action then focuses the participant's current rig whenever one exists, ignoring the beat's place. The tests require only a known place, nonempty participants/source events, and stability across immediate reload.

The current authored Mara branch happens not to move Mara after the cited market events, so no wrong location was observed in the fixed journey. The representation becomes false as soon as a cited citizen subsequently travels: old history will point to the citizen's present place and can change as the world advances.

**Affected files.** `apps/web/src/authoritative-runtime.ts`, `apps/web/src/RiverholdApp.tsx`, `packages/sim/src/chronicle.ts`, and `apps/web/src/authoritative-runtime.test.ts`.

**Recommended disposition: ACCEPT BEFORE GENERAL CHRONICLE TRAVEL.** Bind spatial focus to event-time semantic place/participants/targets, either directly from typed payloads and preceding travel facts or from a bounded replay projection at the cited sequence. “Show in world” should choose the historical place/object or enter an explicitly labeled replay, not silently follow the actor's current location.

**Direct confirmation.** Create a cited market event, move the participant to the mill, advance and reload, then assert the old beat still focuses market with identical source IDs while a separately labeled “where they are now” action may focus the current mill rig.

## Surviving controls and explicit non-findings

- **Reality ownership:** task reservations, travel, capacity, inventory, and effect state are typed Reality data. Renderer state, camera, focus, semantic zoom, residency, and diagnostics do not alter them.
- **Travel truth:** `TravelStarted` releases occupied tasks and preserves origin `placeId`; only `TravelArrived` changes place. Early arrival reduction is rejected, coarse arrivals occur at a deterministic boundary, and replay reproduced the final state/hash in focused tests.
- **Atomic results:** accepted exchange and repair effects conserve resources and apply atomically; impossible/conflicting operations reject without mutation. WAPR-SYS-002 concerns lifecycle/presentation order, not partial inventory writes.
- **Persistence and replay:** application candidates install after durable commit, stale writers safe-stop, unsupported/coherently tampered stored versions fail closed in focused tests, and the tested travel ledger replayed byte-equivalently.
- **Direct interaction and camera:** selection and camera controls update React/presentation state only. Focus, zoom, pan, orbit, LOD, and cell residency have no dependency path into simulation hashes or scheduler input. Focused browser selection/keyboard checks passed.
- **Security boundary:** no network, wall clock, ambient randomness, provider SDK, React, or renderer import entered `packages/sim`/`packages/protocol`; the architecture boundary check passed. The UI exposes a closed intent catalog rather than arbitrary `WorldCommand` construction.
- **Chronicle evidence:** factual sentences retain real event IDs, visibility filtering, causal relations, and allegation separation. WAPR-SYS-005 is the spatial destination projected for a beat, not a fabricated sentence or broken event link.

## Limitations and reopen conditions

- This systems review did not adjudicate visual appeal, character readability, art identity, the unfamiliar-observer product protocol, or the required exact-YES World Presence answer. Those belong to the parallel product/visual reviews. The four systems P1s independently block release.
- No live Cloudflare, GitHub App, provider/model, deployment, credential, or paid-service path was run or needed. The candidate remains local and model-free.
- The focused browser run was headless Chromium on the host, not physical mobile hardware. Direct selection and keyboard semantics passed; touch hardware, gesture feel, and observer comprehension remain outside this review.
- The direct durability probe observed three real seconds rather than waiting through the entire authored route. WAPR-SYS-001 follows additionally from the absence of any automatic authoritative dispatch path; waiting longer can advance only presentation tick until a user intent is dispatched.
- The Node engine mismatch is a review limitation. The coordinator must rely on its pinned clean release lattice for final toolchain evidence.

## Readiness condition

World-as-Product systems readiness requires direct fixes and confirmation tests for WAPR-SYS-001 through WAPR-SYS-004 against one new frozen commit, with no accepted P0 or unmitigated P1. WAPR-SYS-005 may remain explicitly bounded only while no Chronicle evidence participant can move after the cited event; otherwise it becomes P1 before release. Closure must preserve deterministic Standard Brain operation, atomic persistence/replay, no renderer-to-Reality input, no deployment or paid service, and the solo-builder scope.
