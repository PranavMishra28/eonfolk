# Cognition, mind, and decision receipts

**Purpose:** lock the visible information boundary, deterministic Standard Brain, cognitive-decision provenance, counsel interpretation, and grounded explanation contract.

**Status:** IMPLEMENTED WITH BOUNDED CONTROLS — Standard Brain retained; Planner promotion and executable model adapters disabled

**Authority boundary:** this file owns `DecisionContext`, `IntentProposal`, `DecisionExplanation`, raw `CognitiveDecisionRecord`, viewer-safe `DecisionTraceProjection`, Standard Brain, and optional-model policy. [SIMULATION](SIMULATION.md) owns authoritative application; [PERSISTENCE](PERSISTENCE.md) owns durable storage; [EVALS](../quality/EVALS.md) owns tests.

**Related documents:** [agent life](../game/AGENT_LIFE.md), [Observatory](../product/OBSERVATORY.md), [human loop](../product/HUMAN_LOOP.md), [security](SECURITY.md), [model research](../research/MODEL_RESEARCH.md)

## Owned decision

Every citizen runs a complete deterministic Standard Brain. Modern-model inference is absent from V1 and unnecessary for both product gates. A later model may propose one catalog action at a named boundary, but cannot see hidden Reality, grant authority, write prose facts, become a character class, or gain code/network/external-system capabilities.

## `DecisionContext`

The application builds a new immutable context only through `canRead(..., "decision-context", ..., revision)` from [visibility policy `riverhold-visibility-v1`](../game/WORLD_MODEL.md#visibility-policy-riverhold-visibility-v1), containing:

- context ID/version, actor, run, region, revision, decision reason, and simulation boundary;
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

The Cognitive/Decision Ledger stores one bounded append-only raw audit record for every consequential decision boundary and every attempted proposal at that boundary. It is provenance, not canonical Reality or a viewer projection. Each raw record is labeled `citizen-private-audit` and names its subject citizen, but that sensitivity label is not a runtime audience grant: the raw getter is persistence-internal and available only to nonproduction implementation diagnostics or a future separately authorized spoiler-bearing owner-export implementation. Citizens, Brains, patrons, public UI, Chronicle, and Observatory never receive the raw record directly; authorized consumers use `DecisionTraceProjection`. Each record contains:

- record/schema version; stable `decisionId`, `decisionBoundaryId`, actor, run, region, revision, integer simulation time, and whole canonical pre-state hash;
- exact decision reason and active Standing Plan ID/version;
- ordered IDs for observations, private knowledge, beliefs, memories, message claims, relationships, values, commitments, and reputation records actually supplied to/read by cognition;
- `DecisionContext` hash, action-catalog hash/version, budgets, and cognition configuration/version;
- cognition kind `standard-brain|model`, with provider/model/version/prompt-template/schema/artifact hashes nullable and **all null for Standard Brain**;
- exact structured proposal canonical bytes/proposal hash and `DecisionExplanation`, or typed missing/timeout/malformed failure code;
- validator stage/outcome/reason, proposed command ID when one exists, durable receipt reference when one exists, and accepted event interval/event IDs when accepted;
- short explicit EONFOLK rationale/template ID, subject/sensitivity, and provenance;
- `decisionRecordHash` over the complete record without that field; and
- no chain-of-thought, scratchpad, hidden token stream, transcript dump, or inferred private reasoning.

The `decisionId` exists before proposal generation, so cognition-originated accepted events can cite it without a hash cycle. Later downstream consequences trace through typed event causal parents; the past decision record is never rewritten to append descendants. Rejected/malformed proposals remain auditable but do not become world facts.

## `DecisionTraceProjection`

Any consumer-facing or research-facing trace is a new immutable projection keyed by decision ID, viewer, purpose, `atRevision`, visibility-policy version, and projection schema. The projector re-runs `canRead` independently for every referenced observation, knowledge, belief, memory, claim, relationship, value, commitment, receipt, and event. It includes only authorized typed fields and public explanation terms; it always omits the raw whole-state hash, raw record hash, provider artifacts, and every unreadable ID, count, ordering position, sentinel, or timing clue. It may include an explicitly nonauthoritative digest of its own canonical projected bytes for cache/equality checks.

Hidden/missing/revoked references follow the same constant-work policy as target lookup. Worlds differing only in viewer-invisible facts must produce byte-identical `DecisionContext`, proposal/explanation through the actor-visible boundary, `DecisionTraceProjection`, and Chronicle projection until a typed disclosure changes permission. The internal raw decision record is expected to differ when its whole-state hash or protected audit bindings differ and is not part of that viewer-level noninterference claim.

For the first slice, consequential means Mara's counsel boundary, its branch-dependent return decision, the fixed transferred decision fixture, and any citizen decision whose accepted action supplies Gate A/B evidence. Routine gather/move/consume plan steps do not each create a cognitive record; their accepted world events and Standing Plan reference are sufficient.

## Standard Brain

At a decision boundary it:

1. filters the catalog by visible typed preconditions;
2. scores plan continuation, urgent need, commitment, value, relationship, evidence quality, and risk terms as checked integers;
3. applies counsel as one bounded term, never an override;
4. uses the actor/purpose PRNG stream only for exact ties;
5. emits one intent and typed explanation; and
6. records a typed rejection and uses the single authored deterministic fallback/no-op allowed by the current boundary; V1 never invokes Brain twice at one boundary.

Routine ticks follow the active Standing Plan. A rejection may schedule a later named replan boundary, but it is not an immediate Brain retry. Replan only on named boundaries: precondition failure, completion/expiry/impossibility, important offer/loss/relationship rupture, material resource shock, sponsor counsel, or scheduled review.

Counsel is fair only when UI previews relevant visible reasons and distinct stakes. Acceptance/refusal/reinterpretation must change action/plan and cite at least one decisive term. Seed-only refusal without a reason is prohibited.

## Anti-script fixtures

The same pre-boundary Riverhold snapshot is perturbed independently across trust, value priority, evidence quality, commitment, and counsel intent. At least one non-Mara citizen receives an equivalent transferred fixture. Tests compare full Standard Brain, reactive nearest-need, canonical-trajectory lookup, seeded legal-random, and ablations without values, beliefs, relationships, commitments, or Standing Plan.

A pass requires state-sensitive action/explanation changes and at least three distinct terminal world vectors across counsel intents. Hard-coded Riverhold lookup fails the transfer/perturbation matrix.

## Optional model boundary after V1

A future adapter can be evaluated only after the Standard-Brain loop passes. It receives the same bounded context/catalog, returns the same schema, and is untrusted. Provider/model/version/prompt/schema/artifact hash and the original structured proposal are preserved provenance, not identity or onboarding choice. Removing it preserves liveness and the entire game loop. Model migration is a later explicit cognition event.

Canonical replay never calls Standard Brain or a model: it applies the preserved accepted event history. Model reproducibility is not promised. Future model experiments rerun independent manifests and compare outcome distributions rather than treating one response/run as reproducible evidence.

Founder Alpha exposes only the future `BrainPort` proposal-source type. It deliberately ships no executable optional adapter and therefore makes no timeout, cancellation, process-kill, or model-fallback claim. Standard Brain is the only executable brain. A later adapter must add a real bounded process lifecycle and adversarial missing/throwing/hung/late/malformed tests before it can enter the application. V1 ships no provider SDK, provider UI, key, branded choice, continuous inference, training, embeddings, vector storage, or model download.

## Founder Alpha planner and experiment gate

Standard Brain remains the complete default. A deterministic zero-dependency HTN/GOAP-style Planner is accepted only after a frozen 64-context corpus runs five repetitions with identical outputs, no illegal proposal, no hidden-fact influence, no replay dependency, bounded search/runtime, safe malformed/absence fallback, and improvement in at least three predeclared coherence or branch-diversity cases. Missing any hard gate or improvement floor rejects/removes the Planner rather than expanding search.

The implemented smoke corpus retains descriptor SHA-256 `cb1713b932e1a848a264ac3fcf7788b42ce281a17306887ebf39e2beeb965596` and can detect nondeterministic or illegal Standard Brain output across its generated cases. It does **not** freeze the full canonical contexts/oracles or derive goal completion and hidden equivalence from applied terminal world state. Candidate promotion is mechanically impossible: caller-reported goal/safety/search flags cannot produce an eligible result. Its recorded disposition is `defer-no-candidate`; Founder Alpha ships no Planner and makes no Planner-superiority or scenario-goal-completion claim. Promotion requires a later trusted runner that hashes exact context/catalog/oracle bytes, invokes the candidate, applies accepted actions through the authoritative path, and derives terminal vectors itself.

POMCP/MCTS is rejected because Riverhold has no calibrated stochastic transition/observation model. Search state may contain only `DecisionContext` fields and bounded planner-local bookkeeping; it cannot read canonical state directly or emit more authority than one `IntentProposal`.

`ExperimentManifestV2` is an immutable pre-run identity, JCS-canonicalized and SHA-256 identified outside Reality. It preserves the declared context and seed order and expands their Cartesian product with repetition into a one-based ordered execution plan; every ordinal is bound to one exact context hash, seed, and repetition before the run. `ExperimentResultV2` is one execution record, not a caller-supplied aggregate: it repeats that identity and carries the exact output hash, one latency sample, terminal failure when applicable, and invariant results. A completed execution requires a hashed output and only passing invariants.

Results append separately to a noncanonical in-memory journal only after their exact manifest hash has been committed. The journal accepts only the next planned execution and rejects missing, duplicate, reordered, extraneous, mismatched, tampered, or unsuccessful evidence before it will attest a completed run. Invocation and success counts are derived from bound per-execution records rather than trusted aggregates. This is research-integrity code, not durable experiment storage or proof that any adapter was run. A provider-neutral local subprocess contract remains design data only. Founder Alpha includes no executable adapter, model, weights, SDK, provider selection, or claim that a model deadline is enforced.

The Observatory implementation accepts only an opaque artifact minted by the Chronicle visibility projector. The artifact binds viewer, purpose, revision, policy version, canonical source digest, and the authorized event hashes to which every evidence ID must resolve. Observatory then emits a bounded embedded JSON-LD 1.1, locally PROV-shaped subset checked by a closed syntax/cardinality validator. This is not a full PROV-O or SHACL conformance/interoperability claim. Remote contexts, network fetches, an RDF store, inference, external consumers, and a write path are absent; projection output cannot become reducer input or canonical truth.

## Blocking acceptance

- Hidden-fact noninterference passes for context, catalog, errors, targets, explanation, filtered decision-trace projection, and Chronicle projection; raw audit records are excluded.
- Every intent names one offered action; stale revision, unavailable action, oversized proposal, and unknown field reject atomically.
- Persisted decision records round-trip byte-for-byte and are retrieved for separate audit; canonical replay does not regenerate them.
- Every consequential record closes the state/context/plan/proposal/validation/receipt/event ID chain; malformed or rejected proposals cannot create canonical events.
- Worlds differing only in hidden facts produce byte-identical actor-visible contexts/proposals/explanations and viewer-authorized decision-trace projections through the proposal boundary.
- Replay reaches the same canonical hash with cognition disabled and the original accepted proposal remains retrievable for audit.
- Counsel options plus abstain are materially distinct; rejection/reinterpretation is state-grounded and fair.
- Baseline/ablation/transfer fixtures reject canonical lookup and one-seed theater.
- No provider dependency, optional adapter, or network is needed; Standard Brain alone completes the world path.

## Rejected alternatives

Continuous inference, transcript memory, chain-of-thought storage, free-form actions/tools, code/network/external-system authority, model-authored Reality, omniscient prompts, arbitrary refusal, branded-model characters, required downloads/keys, rerunning a model during replay, and generated justification as factual evidence.

## Reopen evidence

Reopen model use only if blinded tests show broader player stories without weakening zero-model play or turning the product into a benchmark. Reopen fields/weights when perturbation or human fairness tests show they do not explain behavior.

## Constraint fit

The first-slice brain is small deterministic CPU code, costs $0, trains nothing, uses no proprietary corpus/GPU/provider, and remains testable by one builder within the time envelope.
