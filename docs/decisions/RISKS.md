# Product-foundation risks

**Purpose:** Rank the failure modes that can invalidate or materially change the selected product, slice, visual direction, or architecture.

**Status:** RECONCILED — automated implementation evidence passed; human validation pending

**Authority boundary:** This file owns risk priority, mitigation and abandon/change triggers. [Decisions](DECISIONS.md) owns accepted responses; [open questions](OPEN_QUESTIONS.md) owns experiments.

**Related documents:** [quality bar](../quality/QUALITY_BAR.md), [performance](../quality/PERFORMANCE.md), [first ExecPlan](../exec-plans/completed/001-foundation.md).

## Top 5 abandon-or-change triggers

| Rank | Risk | Trigger | Required response |
|---:|---|---|---|
| 1 | R-001 Indirect agency feels weak or arbitrary | Matched Gate 0 alternative wins overall/≥20 points on desirability/continue, or real behavior does not beat yoked script | Reopen the product tournament; do not add simulation/model polish |
| 2 | R-002 Standard Brain people feel like clockwork | Mechanics/visibility pass, but fresh players cannot attribute a meaningful decision to values, beliefs or relationships | Change Mind/decision design; test optional cognition only behind full fallback |
| 3 | R-003 Chronicle launders trivial mechanics or false causality | The replay is compelling only because of prose, or any factual sentence lacks authoritative evidence | Block Gate B; simplify or replace underlying mechanics/projection |
| 4 | R-004 Riverhold still feels like a visualization, board, or dashboard | Exact World-as-Product verdict is not YES, task/consequence recognition fails, or fresh clean budgets miss after one bounded pass | Fix truth, scale, choreography, camera, and world-first composition; then cut or reopen scope before adding systems |
| 5 | R-005 Irreducible slice exceeds 60 hours | Core Gate A/B path cannot fit after cutting every listed deferred feature | Stop and reduce/rethink the product thesis; never add time silently |

## Risk register

| ID | Probability | Impact | Evidence and earliest falsification | Mitigation and owner | Decision affected |
|---|---|---|---|---|---|
| R-001 | High | Fatal | Tournament and blind challenger show H trades immediate drama for continuity. First five fresh sessions test forecast, intervention attribution and desire for the next risk. | Product owner: one crafted decision boundary; show facts, beliefs, stakes, response and delayed consequence. | D-001, D-003 |
| R-002 | High | Fatal | Generated-agent evidence warns dialogue can be repetitive; local model spike did not prove behavior quality [S-PLAYER-010] [S-SPIKE-003]. Blinded Standard-Brain walkthrough is the test. | Game/cognition owner: values, sourced beliefs, relationships and Standing Plans must change legal/selected actions; review action diversity and public explanations. | D-003, D-005 |
| R-003 | Medium-high | Fatal | Riverhold is a designed fixture, not emergent product evidence. Sentence-to-event trace and five-second stranger reconstruction test first. | Chronicle/systems owner: typed causal parents with mechanisms, authorized event projections and template-only facts; keep full-preimage hashes private; judge game consequence before presentation polish. | D-004, D-007, D-009 |
| R-004 | Low-medium | Major | Sparse Pixi, the fixed-camera PlayCanvas diorama, and frozen `afdc6e0`/`17b2a3d` candidates were release-invalidated. Final confirmation against `90c0ad2` answered the exact question **YES** with zero P0/P1; clean `e349c5c` then passed all 26 DEEP rows and the stable-AC 15-run performance/zero-egress battery. Unfamiliar-human and physical-device evidence remain open [S-WP-014] [S-WP-022] [S-WAP-001] [S-WAP-012]. | Visual/product owner: preserve the confirmed Reality-owned choreography and meaningful-world predicate; keep Gate 0/A/B `NOT RUN` until humans execute them. Reopen before adding population, Recast, assets, or a second renderer, or if human legibility fails. | D-008 |
| R-005 | Medium-high | Fatal | The plan estimates 52 hours but event sourcing, replay, Chronicle and access can each expand. Maintain hour/cut log from milestone zero. | Coordinator: exclude every non-gate feature, cut optional sound/ambience/secondary systems, and reject infrastructure expansion. | D-002, D-006 |
| R-006 | Medium | Fatal | IndexedDB genesis/commit split, quota, corruption, stale tabs, or region-only identity can lose/fork history. Backup/import are excluded. | Persistence owner: atomic run genesis; run-scoped batch/events/head/receipt/decision commit; fencing outside canonical hashes; crash barriers; verified snapshots; explicit no-backup/export/import disclosure. | D-006, D-007 |
| R-007 | Medium | Major | 30/90/365-day event volume and catch-up wall time are unknown; seven-day scratch evidence is narrow [S-SPIKE-001]. | Simulation owner: boundary scheduling, batching, checkpoints, storage profiling and safe interruption; macro aggregation only after exact equivalence evidence. | D-007 |
| R-008 | High | Major | Story-card comprehension is not distribution; no user has voluntarily returned/shared. | Product owner: label V1 private evidence, retain denominator, require separate deployment/publication and delayed-return tests before distribution claims. | D-009 |
| R-009 | Low-medium | Major | Exact-name screen cannot find phonetic, class, unregistered or future conflicts [S-NAME-001] [S-NAME-007]. | Coordinator: private codename only; re-run similarity/class search before public use; no domain purchase or clearance claim. | D-010 |
| R-010 | Medium | Major | A future canonical server introduces moderation, auth, abuse, cost and backup failure absent from the local proof. | Architecture/security owner: do not implement until both gates pass; revalidate provider features/prices and threat model with explicit approval. | D-006, D-010 |
| R-011 | Medium | Major | Research provenance can turn into a second event-sourcing platform and break the 60-hour proof. | Architecture owner: one immutable manifest, bounded raw decision records plus one shared filtered projector, no dashboard/query/fork/experiment engine; fund the explicit two-hour delta by removing backup/export. | D-002, D-007 |
| R-012 | Medium | Fatal | Research framing can distort the consumer game or invite unsupported human-society/emergence claims. | Product owner: World first, Chronicle legibility second, Observatory deferred; report only agent behavior in the named simulated environment and require repeated independent runs for distributions. | D-001, D-004, D-007 |
| R-013 | Medium | Fatal | Diagnostics or feedback can retain secrets/private state, grow without bound, or become a second authority. | Diagnostics/security owner: source-side closed allowlists, byte/count/time bounds, opt-in Alpha mode, frozen incident projections, adversarial redaction, and zero Reality-writer dependency. | D-011, D-012 |
| R-014 | Medium | Major | A hosted relay can duplicate GitHub issues, exhaust quotas, expose durable credentials, or create a recurring cost. | Platform owner: local-first queue, exact Origin and schema, Turnstile plus hard application quotas, D1 reservation/lease/marker reconciliation, private Issues-only App, no deployment or R2 without approval. | D-010, D-012 |
| R-015 | Medium | Major | Planner/search complexity can make eight citizens slower or less legible while appearing technically impressive. | Cognition owner: frozen 64-context benchmark, hard correctness/runtime gates, three-case improvement floor, deterministic fallback, and removal on failure. | D-005, D-013 |
| R-016 | Low-medium | Major | Ontology or experiment metadata can leak hidden facts or quietly influence canonical behavior. | Observatory/security owner: viewer authorization before projection, closed offline validator, separate immutable storage, dependency-direction tests, and byte-equality hidden-fact checks. | D-007, D-014 |
| R-017 | Medium | Major | Founder Alpha scope and evidence work can become a solo-maintainer observability platform instead of a better game. | Coordinator: diagnostics/relay/planner/ontology are bounded seams; product journey and Gate evidence outrank optional tooling; cut anything without direct release value. | D-002, D-011, D-015 |

## Cross-risk rules

- Product failure cannot be mitigated by adding infrastructure, a larger population, dialogue volume, art polish or marketing.
- Correctness failure cannot be mitigated by hiding raw evidence or writing a better summary.
- Performance failure removes decoration before citizens, facts, actions or simulation fidelity.
- Model failure always falls back to Standard Brain; it never pauses Reality.
- Research instrumentation is cut before consumer truth/attachment, but the minimal decision/run provenance contract cannot be silently collapsed into the world ledger.
- EONFOLK never claims to simulate or predict human society; one run or Chronicle is anecdote, not a distribution.
- No accepted P0 or unmitigated P1 may survive readiness.
