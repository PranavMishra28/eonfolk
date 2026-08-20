# Cognition, mind, and decision receipts

**Purpose:** lock the visible information boundary, deterministic Standard Brain, counsel interpretation, and grounded explanation contract.

**Status:** ACCEPTED AFTER RED TEAM — Standard Brain only in the first slice

**Authority boundary:** this file owns `DecisionContext`, `IntentProposal`, `DecisionExplanation`, Standard Brain, and optional-model policy. [SIMULATION](SIMULATION.md) owns authoritative application; [EVALS](../quality/EVALS.md) owns tests.

**Related documents:** [agent life](../game/AGENT_LIFE.md), [human loop](../product/HUMAN_LOOP.md), [security](SECURITY.md), [model research](../research/MODEL_RESEARCH.md)

## Owned decision

Every citizen runs a complete deterministic Standard Brain. Modern-model inference is absent from V1 and unnecessary for both product gates. A later model may propose one catalog action at a named boundary, but cannot see hidden Reality, grant authority, write prose facts, or become a character class.

## `DecisionContext`

The application builds a new immutable context only through `canRead(..., "decision-context", ..., revision)` from [visibility policy `riverhold-visibility-v1`](../game/WORLD_MODEL.md#visibility-policy-riverhold-visibility-v1), containing:

- context ID/version, actor, region, revision, decision reason, and simulation boundary;
- only visible fact references and sourced beliefs with provenance/confidence bands;
- values, relationships, commitments, reputation observations, and active Standing Plan visible to that actor;
- closed typed action catalog with public preconditions/stakes;
- integer budgets for records, bytes, candidates, plan depth, and retries; and
- no omniscient state, secret targets, implementation metadata, moderation state, hidden scoring, or another citizen's private context.

Noninterference is stronger than redaction: two worlds differing only in facts denied by that versioned oracle produce byte-identical context, catalog, target ordering, validation/rejection code/shape/timing class, decision explanation, semantic/patron/public projection, and public Chronicle until one typed observation/disclosure changes permission. Hidden, missing, and revoked targets all expose `ACTION_UNAVAILABLE`.

## `IntentProposal` and grounded explanation

`IntentProposal` contains context/actor/revision, exactly one known typed action, optional bounded typed plan/memory proposals, provenance, and a short `publicJustification`. V1 does not accept arbitrary justification text: Standard Brain renders it from `DecisionExplanation` through an authored template.

`DecisionExplanation` contains selected action/template IDs; decisive reason codes; visible fact/belief/relationship/commitment references actually read; integer score terms and tie-break record; counsel disposition (`accepted`, `rejected`, `delayed`, `reinterpreted`, or `not-applicable`); and discarded candidate IDs with bounded public reason codes.

The rendered justification is attributed testimony, not proof. Chronicle factual sentences derive from accepted events, not this string. Future model prose, if authorized, remains optional testimony and cannot replace the typed receipt.

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

A future adapter can be evaluated only after the Standard-Brain loop passes. It receives the same bounded context/catalog, returns the same schema, and is untrusted. Provider/model/version/prompt/schema/artifact hash are provenance, not identity or onboarding choice. Removing it preserves liveness and the entire game loop. Model migration is a later explicit cognition event.

V1 tests missing/throwing/timed-out/malformed proposal handling with a fake `BrainPort` only to prove deterministic fallback. It ships no provider SDK, provider UI, key, branded choice, continuous inference, training, embeddings, vector storage, or model download. Provider-specific 429/licensing/eval suites are conditional on a later real adapter.

## Blocking acceptance

- Hidden-fact noninterference passes for context, catalog, errors, targets, explanation, and Chronicle projection.
- Every intent names one offered action; stale revision, unavailable action, oversized proposal, and unknown field reject atomically.
- Decision receipts reproduce byte-for-byte on replay and expose actual decisive terms.
- Counsel options plus abstain are materially distinct; rejection/reinterpretation is state-grounded and fair.
- Baseline/ablation/transfer fixtures reject canonical lookup and one-seed theater.
- No provider dependency or network is needed; fake adapter failure cannot stop the world.

## Rejected alternatives

Continuous inference, transcript memory, chain-of-thought storage, free-form actions/tools, model-authored Reality, omniscient prompts, arbitrary refusal, branded-model characters, required downloads/keys, and generated justification as factual evidence.

## Reopen evidence

Reopen model use only if blinded tests show broader player stories without weakening zero-model play or turning the product into a benchmark. Reopen fields/weights when perturbation or human fairness tests show they do not explain behavior.

## Constraint fit

The first-slice brain is small deterministic CPU code, costs $0, trains nothing, uses no proprietary corpus/GPU/provider, and remains testable by one builder within the time envelope.
