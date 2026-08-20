# Quality bar

**Purpose:** define the minimum observable product and technical evidence required to call the first slice complete.

**Status:** ACCEPTED PROVISIONAL RELEASE BAR; HUMAN ATTACHMENT REMAINS UNPROVEN

**Authority boundary:** owns the cross-discipline pass/fail standard. Exact test placement, evaluation rubrics, visual evidence, and numerical budgets are owned by the linked quality documents.

**Related documents:** [testing](TESTING.md), [evals](EVALS.md), [visual QA](VISUAL_QA.md), [performance](PERFORMANCE.md), [architecture](../engineering/ARCHITECTURE.md), future `docs/exec-plans/active/001-foundation.md`

## Owned decision

The first slice is complete only when both observable product gates and every blocking correctness, security, accessibility, and performance gate pass. A successful build, green backend test suite, elapsed 52-hour estimate, or polished screenshot cannot substitute for play evidence.

The hour allocation constrains scope. Acceptance criteria determine completion. When the estimate fails, remove explicitly deferred mechanics/polish and record the deviation; never broaden hours silently or lower a gate.

## Gate A — Proof of Life

The evidence build must show:

- one small crafted environment;
- eight autonomous citizens using the deterministic Standard Brain;
- three resources, needs, gathering/consumption, one bilateral exchange, and one conversion/repair loop;
- four legible behavior families and at least two citizens visibly interacting;
- authoritative deterministic events, state hashes, IndexedDB events/snapshots, controlled catch-up, and replay without external inference;
- browser evidence at 1728×1117, 1366×768, and 390×844.

A fresh observer must identify what at least three citizens are doing and notice a citizen-to-citizen interaction without reading a raw event feed. The world must remain understandable through the semantic DOM fallback.

## Gate B — Proof of Attachment

The evidence build must show:

- creation/selection of one mind in under 60 seconds;
- legible identity, values, immediate relationships, and current tension;
- one high-level consequential intervention;
- independent acceptance, rejection, delay, or reinterpretation;
- a later systemic consequence;
- a factual Chronicle that explains typed causal edges without upgrading allegation or temporal order;
- one unresolved emotional reason to return;
- one comprehensible 10–20 second share artifact from the same authoritative chain.

At least one fresh player can state what they decided, how the citizen interpreted it, what changed later, and what they want to learn next. The share artifact communicates the consequence within five seconds to an unfamiliar viewer.

## Blocking technical bar

- deterministic hash, repeated-run, replay, snapshot, chunking, command atomicity, and idempotency checks pass;
- resource/ownership/life/visibility invariants survive property tests and bounded fuzzing;
- 30-, 90-, and 365-day scenarios complete or pause at declared safe boundaries without conservation or replay divergence;
- hidden facts never enter a Brain context or public factual presentation;
- provider/model removal, timeout, malformed output, and quota failure cannot stop world progress;
- production build and the critical browser journey pass;
- security/text/import abuse fixtures pass;
- [performance and accessibility budgets](PERFORMANCE.md) pass on the named profiles;
- there is no production deployment, account, payment, required model, model download, or public multiplayer path.

## Evidence package

For each milestone record:

- exact commit and locked dependency/browser versions;
- commands and exit results;
- seed/world fixture and expected hashes;
- named device/browser/profile and viewport;
- screenshots, traces only on failure or accepted milestone evidence, and observer notes;
- p50/p95/worst measurements where applicable;
- known deviations, risks, and reviewer disposition;
- actual changed-file and Git diff inspection before integration.

Evidence that cannot be reproduced from a named commit is a note, not a pass.

## Severity and stop behavior

- **P0:** data loss/corruption, unauthorized canonical mutation, secrets exposure, unplayable primary journey, or factual Chronicle fabrication. Stop integration and fix.
- **P1:** gate failure, determinism/replay mismatch, inaccessible consequential action, budget miss, or observer cannot understand the required outcome. Fix before readiness.
- **P2:** material friction or quality debt with a bounded workaround. Record owner and reopen trigger; it cannot disguise P0/P1.
- **P3:** polish or deferred improvement with no gate impact.

No accepted P0 or unmitigated P1 may remain.

## Resulting implementation behavior

Review proceeds implementation -> automated tests -> actual local game run -> browser playtest -> independent product/systems/visual/cognition review as applicable -> fix -> rerun. The ExecPlan continuously records progress, evidence, decisions, risks, deviations, and removals.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| “Build passes” as completion | Does not prove a living, legible, consequential game |
| Visual polish before deterministic/replay proof | Can hide a nonauthoritative or fragile world |
| Timebox expiry as acceptance | Estimate constrains scope, not quality |
| Raw event log as Chronicle proof | Sequence and debug text are not a factual causal story |
| Model-backed demo with no fallback | Violates free/no-key liveness and masks Standard Brain quality |
| Desktop-only acceptance | The product explicitly requires mobile and semantic evidence |

## Unproven assumptions and reopen evidence

- **PRODUCT HYPOTHESIS:** the gates correlate with fun and attachment. Reopen after five fresh player walkthroughs or later retention evidence contradicts them.
- **UNRESOLVED:** one fresh observer per integration round detects legibility failures reliably. Reopen if later observers disagree materially.
- **UNRESOLVED:** the 52-hour scope can pass both gates. If not, cut deferred content; reopen the product thesis if the irreducible loop itself exceeds the envelope.
- **UNRESOLVED:** a 10–20 second artifact preserves enough factual nuance. Reopen on five-second comprehension or causal-accuracy failure.

## Constraint fit

The bar tests the smallest eight-citizen local game, not a platform. It treats solo hours and $0 operation as product requirements, forbids infrastructure/model shortcuts, and concentrates evidence on the two risks that justify future investment: observable life and attachment.
