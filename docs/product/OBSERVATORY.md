# Observatory and research traceability

**Purpose:** define the future research surface, its admissible claims, three-ledger provenance model, experiment identity, and boundary from the consumer first slice.

**Status:** ACCEPTED AS FOUNDATION DIRECTION — no Observatory UI or research claim ships in the first slice

**Authority boundary:** this file owns Observatory product/research semantics. [WORLD_MODEL](../game/WORLD_MODEL.md) owns truth and visibility, [COGNITION](../engineering/COGNITION.md) owns decision records, [PERSISTENCE](../engineering/PERSISTENCE.md) owns stored ledgers/manifests, and [WORLD_STRUCTURE](WORLD_STRUCTURE.md) owns canon/forks.

**Related documents:** [product](PRODUCT.md), [Chronicle](CHRONICLE.md), [architecture](../engineering/ARCHITECTURE.md), [simulation](../engineering/SIMULATION.md), [first ExecPlan](../exec-plans/active/001-foundation.md)

## Owned decision

Observatory is a future surface over the same grounded world and provenance used by the consumer game. It may inspect viewer-authorized `DecisionTraceProjection` records, replay accepted decisions, compare independent runs, and create controlled non-canonical forks from versioned snapshots. Raw citizen-private audit records are never a default research surface. Observatory never grants world authority, edits canon, exposes secrets to an unauthorized viewer, or turns generated prose into fact.

The defensible research object is **behavior and institutional emergence in populations of autonomous AI agents inside persistent, grounded, reproducible simulated environments**. EONFOLK does not simulate, represent, or predict human society. A single run, dramatic anecdote, Chronicle card, or model response is not evidence of a distribution.

## Three distinct data forms

1. **Canonical World Ledger:** ordered authoritative state-changing `WorldEventEnvelope` records. Only this ledger changes Reality.
2. **Cognitive/Decision Ledger:** bounded raw citizen-private audit records of what a citizen observed, knew, believed, remembered, planned, was offered, proposed, and had accepted/rejected at consequential decision boundaries. These records explain agent inputs/actions but are not world truth merely because a citizen believed or proposed them; any viewer receives a separately authorized field-filtered projection.
3. **Experiment Manifest:** immutable run identity: world seed; engine/schema/determinism/replay/cognition versions; cognition configuration; optional provider/model/version/artifact metadata; configured intervention-protocol IDs; canonical/fork/experiment kind; and parent run/snapshot references. Executed intervention IDs live in receipts/events.

The first slice preserves all three as machine-auditable local data. It does not expose a research dashboard, publish a dataset, implement experiment orchestration, or support fork execution/import.

## Traceability chain

For each consequential decision, stable IDs must connect:

`WORLD STATE → OBSERVATION → MEMORY/BELIEF CONTEXT → DECISION BOUNDARY → STANDING PLAN → OPTIONAL MODEL CALL → STRUCTURED PROPOSAL → VALIDATION → ACCEPTED/REJECTED ACTION → WORLD EVENT → DOWNSTREAM CAUSAL EVENTS`.

The optional-model segment is explicitly absent/null under Standard Brain. Records preserve structured inputs, proposal, validator result, accepted receipt/event interval, provider/model/version where applicable, and a short EONFOLK rationale. They never request, store, or depend on private hidden chain-of-thought.

## Reproducibility rule

Canonical replay means applying the recorded accepted event interval to its verified snapshot under the named versions and reproducing the exact state hash. It never means rerunning cognition. A model call may be nondeterministic or unavailable; preserve the original structured proposal and accepted/rejected result instead.

Future experiments use repeated independent manifests/runs, declare interventions and parent snapshot, and report outcome distributions and uncertainty. A counterfactual is factual only about the simulated fork itself; it is never retroactive canon or an unsimulated alternate history.

## Rejected alternatives

Reject benchmark-first onboarding, omniscient agent inspection, chain-of-thought collection, one mixed ledger, rerunning an LLM during canonical replay, treating one seed as scientific evidence, hidden canon mutation, disconnected mini-game experiments, human-society prediction claims, and research scope that changes Gate A/B mechanics.

## Reopen evidence

Reopen the Observatory direction if preserving bounded provenance materially breaks the 60-hour proof after receipt/manifest reuse, if privacy cannot be enforced by the same visibility policy, or if prospective research questions require ungrounded prose/tool autonomy. Remove the research surface before weakening consumer truth, privacy, or product gates.

## Remaining uncertainty

**UNRESOLVED:** which post-gate experiments are scientifically useful, how many independent runs are adequate, which data can be shared safely, and whether researchers value the instrumentation. No current artifact establishes external research demand or publishable findings.

## Resulting implementation behavior

The first implementation stores one immutable local-run manifest and bounded raw cognitive decision records at the already-required consequential boundaries, plus a shared projector that can produce only authorized structured provenance for Chronicle/evidence. No Observatory navigation or analysis UI exists. Future forks and experiments reuse canonical snapshots/events rather than creating disconnected scenario authority.

## Constraint fit

The foundation reuses IDs, receipts, event causality, versions, and IndexedDB already required for Gate B. It adds no model, server, dashboard, dataset, partner, publication, account, deployment, training, regulated data, or paid operation.
