# Product-foundation risks

**Purpose:** Rank the failure modes that can invalidate or materially change the selected product, slice, visual direction, or architecture.

**Status:** INITIAL SYNTHESIS — red-team amendments pending

**Authority boundary:** This file owns risk priority, mitigation and abandon/change triggers. [Decisions](DECISIONS.md) owns accepted responses; [open questions](OPEN_QUESTIONS.md) owns experiments.

**Related documents:** [quality bar](../quality/QUALITY_BAR.md), [performance](../quality/PERFORMANCE.md), [first ExecPlan](../exec-plans/active/001-foundation.md).

## Top 5 abandon-or-change triggers

| Rank | Risk | Trigger | Required response |
|---:|---|---|---|
| 1 | R-001 Indirect agency feels weak or arbitrary | Players cannot forecast stakes or explain the citizen's interpretation; ugly ECHOHOUSE wins the declared randomized test by at least 20 points | Reopen the product tournament; do not add more simulation |
| 2 | R-002 Standard Brain people feel like clockwork | Mechanics/visibility pass, but fresh players cannot attribute a meaningful decision to values, beliefs or relationships | Change Mind/decision design; test optional cognition only behind full fallback |
| 3 | R-003 Chronicle launders trivial mechanics or false causality | The replay is compelling only because of prose, or any factual sentence lacks authoritative evidence | Block Gate B; simplify or replace underlying mechanics/projection |
| 4 | R-004 Living Woodcut misses legibility, effort or performance | Observer/budget gates fail after one simplification pass or asset work exceeds eight focused hours | Switch to stripped Weathered Atlas before implementation continues |
| 5 | R-005 Irreducible slice exceeds 60 hours | Core Gate A/B path cannot fit after cutting every listed deferred feature | Stop and reduce/rethink the product thesis; never add time silently |

## Risk register

| ID | Probability | Impact | Evidence and earliest falsification | Mitigation and owner | Decision affected |
|---|---|---|---|---|---|
| R-001 | High | Fatal | Tournament and blind challenger show H trades immediate drama for continuity. First five fresh sessions test forecast, intervention attribution and desire for the next risk. | Product owner: one crafted decision boundary; show facts, beliefs, stakes, response and delayed consequence. | D-001, D-003 |
| R-002 | High | Fatal | Generated-agent evidence warns dialogue can be repetitive; local model spike did not prove behavior quality [S-PLAYER-010] [S-SPIKE-003]. Blinded Standard-Brain walkthrough is the test. | Game/cognition owner: values, sourced beliefs, relationships and Standing Plans must change legal/selected actions; review action diversity and public explanations. | D-003, D-005 |
| R-003 | Medium-high | Fatal | Riverhold is a designed fixture, not emergent product evidence. Sentence-to-event trace and five-second stranger reconstruction test first. | Chronicle/systems owner: typed causal parents, allegations, hashes and template-only facts; judge game consequence before presentation polish. | D-004, D-007, D-009 |
| R-004 | High | Major | R3F spike missed desktop p95 and overflowed mobile; Living Woodcut production is unmeasured [S-SPIKE-002]. First authored Pixi scene decides. | Visual owner: one small atlas, quiet hatching, semantic DOM and fixed degradation order; Weathered Atlas is the fallback. | D-008 |
| R-005 | Medium-high | Fatal | The plan estimates 52 hours but event sourcing, replay, Chronicle and access can each expand. Maintain hour/cut log from milestone zero. | Coordinator: exclude every non-gate feature, cut optional sound/ambience/secondary systems, and reject infrastructure expansion. | D-002, D-006 |
| R-006 | Medium | Major | IndexedDB quota, eviction, corruption, multi-tab and restore are untested. Run save/reload/export/import/corrupt-snapshot drills before Gate A. | Persistence owner: single writer, atomic append, verified snapshots, export and explicit recovery UX. | D-006, D-007 |
| R-007 | Medium | Major | 30/90/365-day event volume and catch-up wall time are unknown; seven-day scratch evidence is narrow [S-SPIKE-001]. | Simulation owner: boundary scheduling, batching, checkpoints, storage profiling and safe interruption; macro aggregation only after exact equivalence evidence. | D-007 |
| R-008 | High | Major | Share and return thresholds are hypotheses; no user has voluntarily returned or shared. Test with first 10 before public infrastructure. | Product/distribution owner: retain abandonment denominator, no paid acquisition, and stop channel work if product comprehension fails. | D-009 |
| R-009 | Low-medium | Major | Exact-name screen cannot find phonetic, class, unregistered or future conflicts [S-NAME-001] [S-NAME-007]. | Coordinator: private codename only; re-run similarity/class search before public use; no domain purchase or clearance claim. | D-010 |
| R-010 | Medium | Major | A future canonical server introduces moderation, auth, abuse, cost and backup failure absent from the local proof. | Architecture/security owner: do not implement until both gates pass; revalidate provider features/prices and threat model with explicit approval. | D-006, D-010 |

## Cross-risk rules

- Product failure cannot be mitigated by adding infrastructure, a larger population, dialogue volume, art polish or marketing.
- Correctness failure cannot be mitigated by hiding raw evidence or writing a better summary.
- Performance failure removes decoration before citizens, facts, actions or simulation fidelity.
- Model failure always falls back to Standard Brain; it never pauses Reality.
- No accepted P0 or unmitigated P1 may survive readiness.
