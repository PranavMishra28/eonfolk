# Cognition, mind, and decision receipts

**Purpose:** lock the visible information boundary, deterministic Standard Brain, cognitive-decision provenance, counsel interpretation, and grounded explanation contract.

**Status:** ACCEPTED AFTER RED TEAM — Standard Brain only in the first slice

**Authority boundary:** this file owns `DecisionContext`, `IntentProposal`, `DecisionExplanation`, `CognitiveDecisionRecord`, Standard Brain, and optional-model policy. [SIMULATION](SIMULATION.md) owns authoritative application; [PERSISTENCE](PERSISTENCE.md) owns durable storage; [EVALS](../quality/EVALS.md) owns tests.

**Related documents:** [agent life](../game/AGENT_LIFE.md), [Observatory](../product/OBSERVATORY.md), [human loop](../product/HUMAN_LOOP.md), [security](SECURITY.md), [model research](../research/MODEL_RESEARCH.md)

## Owned decision

Every citizen runs a complete deterministic Standard Brain. Modern-model inference is absent from V1 and unnecessary for both product gates. A later model may propose one catalog action at a named boundary, but cannot see hidden Reality, grant authority, write prose facts, become a character class, or gain code/network/external-system capabilities.

## `DecisionContext`

The application builds a new immutable context only through `canRead(..., "decision-context", ..., revision)` from [visibility policy `riverhold-visibility-v1`](../game/WORLD_MODEL.md#visibility-policy-riverhold-visibility-v1), containing:

- context ID/version, actor, region, revision, decision reason, and simulation boundary;
- only authorized observation, private-knowledge, sourced-belief, bounded-memory, and message-claim references, each with provenance/confidence where applicable;
- values, relationships, commitments, reputation observations, and active Standing Plan visible to that actor;
- closed typed action catalog with public preconditions/stakes;
- integer budgets for records, bytes, candidates, plan depth, and retries; and
- no omniscient state, secret targets, implementation metadata, moderation state, hidden scoring, or another citizen's private context.

Noninterference is stronger than redaction: two worlds differing only in facts denied by that versioned oracle produce byte-identical context, catalog, target ordering, validation/rejection code/shape/timing class, decision explanation, semantic/patron/public projection, and public Chronicle until one typed observation/disclosure changes permission. Hidden, missing, and revoked targets all expose `ACTION_UNAVAILABLE` through one constant-work/full-catalog/no-early-return response path with a 50 ms minimum release. The Goal prompt owns the framed PLAN_BASE/commit/snapshot seed, 20 warmups/class, 200 rejection-shuffled round-robin cycles, full-sample retention, nearest-rank p95 and no-favorable-rerun rule. Every sample is ≥50 ms and pairwise class median/p95 differences ≤5 ms; code inspection plus that oracle define timing equality.

## `IntentProposal` and grounded explanation

`IntentProposal` contains stable proposal ID, context/actor/revision, exactly one known typed action, optional bounded typed plan/memory proposals, provenance, and a short `publicJustification`. V1 does not accept arbitrary justification text: Standard Brain renders it from `DecisionExplanation` through an authored template.

`DecisionExplanation` contains selected action/template IDs; decisive reason codes; visible fact/belief/relationship/commitment references actually read; integer score terms and tie-break record; counsel disposition (`accepted`, `rejected`, `delayed`, `reinterpreted`, or `not-applicable`); and discarded candidate IDs with bounded public reason codes.

The rendered justification is attributed testimony, not proof. Chronicle factual sentences derive from accepted events, not this string. Future model prose, if authorized, remains optional testimony and cannot replace the typed receipt.

## `CognitiveDecisionRecord`

The Cognitive/Decision Ledger stores one bounded append-only record for every consequential decision boundary and every attempted proposal at that boundary. It is provenance, not canonical Reality. Each record contains:

- record/schema version; stable `decisionId`, `decisionBoundaryId`, actor, region, revision, integer simulation time, and pre-state hash;
- exact decision reason and active Standing Plan ID/version;
- ordered IDs for observations, private knowledge, beliefs, memories, message claims, relationships, values, commitments, and reputation records actually supplied to/read by cognition;
- `DecisionContext` hash, action-catalog hash/version, budgets, and cognition configuration/version;
- cognition kind `standard-brain|model`, with provider/model/version/prompt-template/schema/artifact hashes nullable and **all null for Standard Brain**;
- exact structured proposal/proposal hash and `DecisionExplanation`, or typed missing/timeout/malformed failure code;
- validator stage/outcome/reason, proposed command ID when one exists, durable receipt reference when one exists, and accepted event interval/event IDs when accepted;
- short explicit EONFOLK rationale/template ID, visibility, and provenance; and
- no chain-of-thought, scratchpad, hidden token stream, transcript dump, or inferred private reasoning.

The `decisionId` exists before proposal generation, so cognition-originated accepted events can cite it without a hash cycle. Later downstream consequences trace through typed event causal parents; the past decision record is never rewritten to append descendants. Rejected/malformed proposals remain auditable but do not become world facts.

For the first slice, consequential means Mara's counsel boundary, its branch-dependent return decision, the fixed transferred decision fixture, and any citizen decision whose accepted action supplies Gate A/B evidence. Routine gather/move/consume plan steps do not each create a cognitive record; their accepted world events and Standing Plan reference are sufficient.

## Standard Brain

At a decision boundary it:

1. filters the catalog by visible typed preconditions;
2. scores plan continuation, urgent need, commitment, value, relationship, evidence quality, and risk terms as checked integers;
3. applies counsel as one bounded term, never an override;
4. uses the actor/purpose PRNG stream only for exact ties;
5. emits one intent and typed explanation; and
6. replans within a fixed retry budget after typed rejection.

Routine ticks follow the active Standing Plan. Replan only on named boundaries: precondition failure, completion/expiry/impossibility, important offer/loss/relationship rupture, material resource shock, sponsor counsel, or scheduled review.

Counsel is fair only when UI previews relevant visible reasons and distinct stakes. Acceptance/refusal/reinterpretation must change action/plan and cite at least one decisive term. Seed-only refusal without a reason is prohibited.

## Anti-script fixtures

The same pre-boundary Riverhold snapshot is perturbed independently across trust, value priority, evidence quality, commitment, and counsel intent. At least one non-Mara citizen receives an equivalent transferred fixture. Tests compare full Standard Brain, reactive nearest-need, canonical-trajectory lookup, seeded legal-random, and ablations without values, beliefs, relationships, commitments, or Standing Plan.

A pass requires state-sensitive action/explanation changes and at least three distinct terminal world vectors across counsel intents. Hard-coded Riverhold lookup fails the transfer/perturbation matrix.

## Optional model boundary after V1

A future adapter can be evaluated only after the Standard-Brain loop passes. It receives the same bounded context/catalog, returns the same schema, and is untrusted. Provider/model/version/prompt/schema/artifact hash and the original structured proposal are preserved provenance, not identity or onboarding choice. Removing it preserves liveness and the entire game loop. Model migration is a later explicit cognition event.

Canonical replay never calls Standard Brain or a model: it applies the preserved accepted event history. Model reproducibility is not promised. Future model experiments rerun independent manifests and compare outcome distributions rather than treating one response/run as reproducible evidence.

V1 tests missing/throwing/timed-out/malformed proposal handling with a fake `BrainPort` only to prove deterministic fallback. It ships no provider SDK, provider UI, key, branded choice, continuous inference, training, embeddings, vector storage, or model download. Provider-specific 429/licensing/eval suites are conditional on a later real adapter.

## Blocking acceptance

- Hidden-fact noninterference passes for context, catalog, errors, targets, explanation, and Chronicle projection.
- Every intent names one offered action; stale revision, unavailable action, oversized proposal, and unknown field reject atomically.
- Decision receipts reproduce byte-for-byte on replay and expose actual decisive terms.
- Every consequential record closes the state/context/plan/proposal/validation/receipt/event ID chain; malformed or rejected proposals cannot create canonical events.
- Worlds differing only in hidden facts produce byte-identical authorized cognitive records through the proposal boundary.
- Replay reaches the same canonical hash with cognition disabled and the original accepted proposal remains retrievable for audit.
- Counsel options plus abstain are materially distinct; rejection/reinterpretation is state-grounded and fair.
- Baseline/ablation/transfer fixtures reject canonical lookup and one-seed theater.
- No provider dependency or network is needed; fake adapter failure cannot stop the world.

## Rejected alternatives

Continuous inference, transcript memory, chain-of-thought storage, free-form actions/tools, code/network/external-system authority, model-authored Reality, omniscient prompts, arbitrary refusal, branded-model characters, required downloads/keys, rerunning a model during replay, and generated justification as factual evidence.

## Reopen evidence

Reopen model use only if blinded tests show broader player stories without weakening zero-model play or turning the product into a benchmark. Reopen fields/weights when perturbation or human fairness tests show they do not explain behavior.

## Constraint fit

The first-slice brain is small deterministic CPU code, costs $0, trains nothing, uses no proprietary corpus/GPU/provider, and remains testable by one builder within the time envelope.
