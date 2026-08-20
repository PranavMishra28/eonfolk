# Open questions and unproven assumptions

**Purpose:** Make the smallest evidence-producing experiment, current default and reopen consequence explicit for every material unknown.

**Status:** RECONCILED — assumptions remain unvalidated by actual players

**Authority boundary:** This file owns experiment questions and required evidence. [Decisions](DECISIONS.md) owns the current choice; [risks](RISKS.md) owns severity.

**Related documents:** [product research](../research/GAME_DESIGN_RESEARCH.md), [quality bar](../quality/QUALITY_BAR.md), [evals](../quality/EVALS.md), [visual QA](../quality/VISUAL_QA.md).

## Top 5 unproven assumptions

| Rank | ID | Assumption | Fastest falsification |
|---:|---|---|---|
| 1 | Q-001 | Following one citizen creates care without direct control | Eight unfamiliar randomized real-versus-scripted sessions with voluntary second action |
| 2 | Q-002 | Rejectable/delayed counsel feels consequential rather than arbitrary | Show forecasts before counsel; test later interpretation and counterfactual understanding |
| 3 | Q-003 | A deterministic Standard Brain can appear intentional for eight citizens | Blinded action/justification review after mechanics and visibility pass |
| 4 | Q-004 | Factual Chronicle can be both trustworthy and emotionally compelling | Sentence trace plus five-second stranger comprehension and next-risk test |
| 5 | Q-005 | Sparse Living Woodcut is readable, warm and within budgets | One authored PixiJS scene, three viewports, physical-device proxy and five silent observers |

## Experiment register

### Q-001 — Does one sponsored citizen create attachment?

- **Why it matters:** This is the emotional premise and starting-unit decision.
- **Current default:** One citizen is the responsibility lens; eight citizens remain authoritative actors.
- **Fastest falsification:** Eight unfamiliar sessions compare the real state-sensitive loop with a randomized yoked script. Ask identity, reason, independent choice, responsibility and voluntarily offered next action. Count abandonment.
- **Evidence required:** Quality Bar's 6/8 completion, 5/8 explanation and 4/8 person-centered second-action thresholds; real beats script on contingency/continue. This is formative bounded evidence, not retention validation.
- **Decision reopened:** D-001 and D-003; compare identical family/trio variants before adding features.

### Q-002 — Does refusal preserve autonomy without destroying agency?

- **Why it matters:** Rejection/reinterpretation is the differentiator but can feel like the game ignoring the player.
- **Current default:** Show visible facts, beliefs, stakes and likely interpretations; the citizen can accept, reject, delay or reinterpret; consequences are delayed but attributable.
- **Fastest falsification:** Give identical Riverhold contexts with different advice, record forecast before commitment, then test whether players can explain the actual interpretation and name meaningful alternatives.
- **Evidence required:** Most testers predict materially different state directions before choice and distinguish “my input contributed” from “I commanded the outcome.” Repeated arbitrary/unforecastable descriptions fail.
- **Decision reopened:** D-003; simplify interpretation rules or reopen directness in the tournament.

### Q-003 — Can the Standard Brain support person-like intentionality?

- **Why it matters:** It is the complete $0/no-model game, not a fallback veneer.
- **Current default:** Integer-scored templates filtered by facts, beliefs, values, relationships, commitments, resources and Standing Plan, with seeded tie-breaking.
- **Fastest falsification:** Perturb trust/value/evidence/commitment/advice, transfer to non-Mara, and compare nearest-need/legal-random/canonical-lookup plus field ablations.
- **Evidence required:** Noninterference, three terminal vectors, actual typed decision terms, transfer, bounded repetition, and progress after fake BrainPort failure with no provider installed.
- **Decision reopened:** D-005; first improve Mind/action space, then permit one optional bounded-model experiment only if the full deterministic experience remains compelling.

### Q-004 — Does Chronicle create return value without laundering the game?

- **Why it matters:** The product depends on causal memory, but a polished log can overclaim or make trivial mechanics seem deep.
- **Current default:** Typed factual projection with direct/trigger/contributing/predecessor/allegation categories from Riverhold events.
- **Fastest falsification:** Give five unfamiliar viewers the three-beat/≤20-second Story Card, ask who advised, who chose, what followed and what remains; audit every sentence.
- **Evidence required:** No unsupported sentence; 3/5 understand within five seconds and do not assign the player direct causal credit; player-loop evidence, not card polish, creates next action.
- **Decision reopened:** D-004 and D-009; change mechanics before adding prose if the causal chain is trivial.

### Q-005 — Is Living Woodcut feasible and legible?

- **Why it matters:** The direction wins on distinctiveness and Chronicle integration but risks small-character readability, coldness and authoring cost.
- **Current default:** Sparse PixiJS 2.5D, one atlas, eight silhouettes/portraits, limited poses and semantic DOM.
- **Fastest falsification:** In the first four implementation hours, build semantic/Pixi projection; measure three viewports, eight citizens and 12-citizen stress; five silent observers.
- **Evidence required:** 3/5 name three activities/interaction; 4/5 find Follow Mara/understand autonomy; budgets and mobile containment pass after at most one simplification.
- **Decision reopened:** D-008; switch to stripped Weathered Atlas if it fails.

### Q-006 — Does succession feel like continuity rather than reset?

- **Why it matters:** Death continuity is a structural gate even though death implementation is excluded from the first slice.
- **Current default:** Covenant, relationships, artifacts, reputation, institutions and unfinished commitments survive; the player chooses or is refused by a successor.
- **Fastest falsification:** Paper/interactive state comparison using identical death aftermath for citizen, family and trio lenses.
- **Evidence required:** Testers identify a new consequential decision and inherited obligation without reading a full history.
- **Decision reopened:** D-001 and post-slice progression scope.

### Q-007 — Is session 20 richer without content explosion?

- **Why it matters:** Persistent history is valuable only if it changes decisions rather than lengthening logs.
- **Current default:** Known people, precedents, roles, artifacts and unfinished commitments change future options; mature entry progressively reveals only relevant history.
- **Fastest falsification:** Paper-simulate sessions 1, 5 and 20 on the same small system and count novel strategic/social considerations versus repeated resource chores.
- **Evidence required:** Session 20 offers context-rich tradeoffs from accumulated state with no new rule family required for each session.
- **Decision reopened:** D-001 and progression; do not build month-two content to cover a shallow state space.

### Q-008 — Will anyone return or share voluntarily?

- **Why it matters:** Distribution and return claims are hypotheses, not reach plans.
- **Current default:** Finish the private factual Story Card/comprehension proof; high-touch first 10 and public distribution require later playable-publication authority; no paid acquisition or posting integration.
- **Fastest falsification:** Observe first 10 with no reminder in the voluntary-return/share measurement; keep abandonment in the denominator.
- **Evidence required:** Thresholds in [distribution](../product/DISTRIBUTION.md), including at least one unaffiliated share that activates a user before scaling beyond 100.
- **Decision reopened:** D-009; stop channel work and revisit product pull/message.

### Q-009 — Is local persistence durable enough for free V1?

- **Why it matters:** Losing the one citizen/history would destroy trust.
- **Current default:** Single-writer IndexedDB adapter, atomic append/snapshot, verified replay and export/recovery path.
- **Fastest falsification:** Crash injection around every prepare/commit/install/publish barrier; quota abort, corrupt snapshot, gap, idempotency collision, stale fencing/dual-tab, verified export, and no-import-route checks.
- **Evidence required:** No visible-undurable/partial/double mutation; deterministic recovery to durable head; clear local-device/export limitation. Import remains deferred.
- **Decision reopened:** D-006 and D-007; a server is not automatically the answer.

### Q-010 — What long-horizon catch-up representation remains exact enough?

- **Why it matters:** Absence must not create an unbounded wait, event explosion or divergent replay.
- **Current default:** Exact meaningful events to 10 minutes; aggregate stable production to 24 hours but stop at boundaries/shocks; boundary/checkpoint advancement to seven days; macro stable spans to 90 days with interruption for salient boundaries.
- **Fastest falsification:** 30/90/365-day deterministic benchmark with conservation, event/storage counts, replay equivalence, interrupt/resume and wall-time profiling.
- **Evidence required:** Declared caps based on measurements, identical authoritative outcomes across batch sizes and no model call.
- **Decision reopened:** D-007 and simulation schedule; do not hide divergence through Chronicle coalescing.
