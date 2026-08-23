# ExecPlan 003 — V1 civilization

**Purpose:** Implement and verify the Release Genesis civilization benchmark as one private mega PR.

**Status:** ACTIVE — V1 INCOMPLETE

**Authority boundary:** This file owns implementation sequence, evidence expectations, deviations, and integration progress. [GOAL.md](../../../GOAL.md) owns requirement state; [RESUME.md](../../../RESUME.md) owns the exact restart; [INDEX.md](../../INDEX.md) maps product and engineering authorities.

**Owner:** Coordinator on `feat/v1-civilization`.

**Target:** One draft PR to protected `main`; no deployment.

## Product outcome

Release Genesis opens a generated civilization rather than a dashboard or authored Riverhold replay. Multiple people pursue grounded needs and commitments, transform conserved physical resources through visible work, form households and institutions, undertake projects, migrate, and may found another viable settlement. The player can follow one life, understand the world without saying “AI,” intervene through bounded actions, and inspect factual causal history.

Founder Alpha remains a required regression surface, not V1 acceptance evidence.

## Binding scope

- Deterministic versioned generated world with regions, cells, territories, metric settlements, sites, buildings, routes, and slots.
- General population, households, relationships, roles, resources, recipes, projects, institutions, agreements, migration, and founding.
- Complete deterministic Standard Brain plus bounded routine/project planning and Standing Plans.
- Optional local model treatment only behind a closed schema, post-Brain validation, exact provenance, zero-egress isolation, timeout, and deterministic fallback.
- Event-sourced persistence, migration/upcast, snapshots, replay, idempotency, catch-up, crash recovery, Flight Recorder, and Sentinel coverage.
- Separate landing, immersive world, research/evidence, and developer surfaces.
- Desktop/laptop/mobile semantic parity, keyboard critical actions, reduced motion, weak-device degradation, and measured payload/frame/memory budgets.
- 30/90/365-day multi-seed experiments with legitimate viable and stagnant/failing outcomes.

Excluded: public deployment, accounts, payments, paid services, unrestricted dialogue, model downloads, training/fine-tuning, proprietary data, required partners, regulated data, and enterprise/commercial operations.

## Milestones

### M1 — Generalized authority and genesis

Outcome: one release/experiment/world identity deterministically creates a valid, materially seed-dependent region and initial settlement.

Evidence: golden hashes, multi-seed properties, reference integrity, traversability, architecture checks, no wall clock/random/network/provider/renderer imports.

Status: pure contracts/generator complete; fixed-seed browser entry exists, while persistence and default product entry remain incomplete.

### M2 — Civilization kernel

Outcome: people and institutions act on conserved physical resources through recipes and projects; normal conditions can enable or prevent migration/founding.

Evidence: atomic accounting, resource conservation, prerequisite and lifecycle tests, multi-seed long-horizon metrics, viable and stagnant/failing outcomes, deterministic replay.

Status: pure stocks/recipes/projects, pressure/affordance scheduling, canonical land-route traversal, physical carried stocks, canonical second-settlement materialization, legitimate stagnation, and deterministic 30/90/365 evidence pass. Generalized needs/population and product integration remain incomplete.

### M3 — Cognition and experiments

Outcome: routine behavior remains complete without a model; decision boundaries can compare Standard Brain, planner, and an optional validated local model treatment without changing authority or replay semantics.

Evidence: hidden-fact isolation, bounded search, interruption/replan, malformed/timeout/provider failure, exact artifact provenance, zero-egress process evidence, deterministic fallback and historical replay without inference.

Status: deterministic gateway/planners/closed choice and the macOS zero-egress process host are complete; real-model treatment promotion and memory/retrieval remain incomplete. POMCP is rejected by D-016 until a calibrated actor-authorized sampler exists.

### M4 — Persistence and reliability

Outcome: generated worlds survive reload, crash, long absence, version change, and checkpoint failure with the same authoritative history.

Evidence: command atomicity/idempotency, fencing, migrations, replay equivalence, 1/7/30/90/365-day catch-up, injected faults, persistence benchmark, diagnostic correlation and noninterference.

Status: the exact-version authority-stream port and in-memory conformance adapter pass atomicity, idempotency, fencing, snapshots/ranges, crash, corruption, version, and inference-free replay tests. IndexedDB/browser wiring, civilization envelopes, catch-up, and diagnostics remain incomplete; Founder Alpha coverage is regression only.

### M5 — World as product

Outcome: arrival communicates a living generated world immediately; region, settlement, citizen, work, construction, migration, Chronicle, and research views are understandable and controllable.

Evidence: deterministic browser journeys and screenshots at 1728×1117, 1366×768, and 390×844; fresh observer task-legibility; accessibility parity; reduced motion; weak-device fallback; payload/frame/memory/meaningful-display budgets.

Status: pure projections and an account-free generated browser checkpoint exist. The independent browser audit found an abstract grid/site diagram without citizens or activity, so World Presence, default entry, embodied simulation, and temporal acceptance remain incomplete.

### M6 — Exact-candidate release lattice

Outcome: one frozen source candidate satisfies every software requirement and hostile review.

Evidence: clean exact-HEAD PR and target-Mac DEEP manifests, V1-specific visual and civilization artifacts, formal/security/mutation/property gates, six independent reviews, P0/P1 dispositions, one confirmation, protected GitHub checks.

Status: not started; no candidate frozen.

## Continuous logs

Detailed commit-level checkpoints and limitations are maintained in [RESUME.md](../../../RESUME.md); requirement state is maintained in [GOAL.md](../../../GOAL.md); coordinator integrations are summarized in [PLAN.md](../../../PLAN.md). Every material deviation must be recorded there before the next integration push.

- 2026-08-22 — Integrated a deterministic 30/90/365 experiment harness. It establishes replayable test infrastructure but cannot satisfy emergence while its decisions are fixed-day and its founding remains record-only.
- 2026-08-22 — Added the supplementary portable-extended GitHub Actions tier. Its exact-source manifest explicitly cannot substitute for target-Mac DEEP or V1 readiness.
- 2026-08-22 — Integrated `/genesis` and `/world` with six cross-viewport browser checks. An independent visual inspection failed the World Presence bar; no visual acceptance claim is permitted.
- 2026-08-22 — Closed the POMCP disposition through D-016 and consolidated primary research into `docs/RESEARCH.md`, `references.bib`, and dated source-ledger rows. POMCP remains rejected until a calibrated actor-authorized sampler and failing information-value case exist.
- 2026-08-22 — Integrated the bounded macOS local-process host. Exact artifact verification, canonical framing, deny-network sandboxing, timeout/kill/cancellation, hidden-fact rejection, deterministic fallback, and inference-free recorded-proposal restoration pass focused native tests. This is an executable safety seam, not an actual-model promotion or product integration.
- 2026-08-22 — Replaced fixed calendar expansion with pressure/affordance rules, canonical least-cost migration routes, physically accounted traversal, and a migration-provenanced second generated settlement. Coordinator review removed duplicate experiment logic and made a registered route mandatory. Deterministic 30/90/365 and deep randomized properties pass; needs/population/product integration remain open.
- 2026-08-22 — Integrated the V1 versioned persistence seam and in-memory conformance adapter. Atomic/idempotent append, fencing, exact-head snapshots, continuous ranges, crash recovery, corruption/version rejection, and replay without cognition pass; IndexedDB/civilization/catch-up integration remains open.

## Review roles

- Product/game: observable world, agency, attachment, legibility, and non-log return value.
- Systems/correctness: authority, determinism, conservation, emergence, persistence, replay, and failure recovery.
- Visual/accessibility: world dominance, character/action readability, performance, keyboard/semantic parity, and reduced motion.
- Cognition/eval: actor-visible context, schema/authorization boundary, model provenance, fallback, experiment identity, and no hidden reasoning.
- CI/security: exact-candidate evidence, workflow permissions, secrets, supply chain, retention, and readiness claims.
- Cross-discipline confirmation: fresh frozen-SHA release verdict after all accepted P0/P1 fixes.

## Stop and rollback rules

Do not weaken an acceptance criterion to fit elapsed time. Remove nonessential breadth before compromising authority, no-model completeness, factual causality, accessibility, or evidence. Stop for data loss, unbounded authority, an unresolved P0/P1, required spend/deployment/credentials, or a scope decision that needs new product authority.

Every bounded integration remains revertible by its clean commit. Never reset or delete unique history. The PR remains draft and unmerged until all `GOAL.md` software rows are verified and the exact candidate passes the full lattice.
