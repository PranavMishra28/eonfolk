# Cognition and model ecology

**Purpose:** define typed Mind, Standard Brain, decision/proposal contracts, validation, optional-model policy, and failure semantics.

**Status:** STANDARD BRAIN ACCEPTED FOR V1; ALL MODEL ROUTES DEFERRED

**Authority boundary:** owns `DecisionContext`, `IntentProposal`, Standing Plans, model ecology, proposal failure/fallback, and cognition provenance. Reality authorization remains owned by [simulation](SIMULATION.md); behavior evaluation is owned by [evals](../quality/EVALS.md).

**Related documents:** [architecture](ARCHITECTURE.md), [simulation](SIMULATION.md), [security](SECURITY.md), [cost](COST_MODEL.md), [model research](../research/MODEL_RESEARCH.md), [systems research](../research/SYSTEMS_RESEARCH.md)

## Owned decision

The deterministic Standard Brain handles every routine and decision-boundary action in V1. It is the complete normal experience, not a degraded fallback. No model runtime, SDK, download, key, provider login, or hosted call enters the 40–60-hour first slice.

Optional local or hosted models may later produce bounded proposals only at named decision boundaries. Normal onboarding never offers branded-model selection. Provider, model, version, prompt/schema version, and artifact hash are retained as provenance when used, but are not a character class, leaderboard, or primary share headline. Model migration is an explicit versioned cognition-migration event and remains out of the first slice.

Mixed cognition is acceptable only if removing every external model still leaves a compelling game. Reopen branded diversity only if blinded tests show it improves player stories without turning the product into a benchmark.

## Typed Mind and Standing Plan

Mind stores provenance-bearing, visibility-scoped records:

- beliefs: typed proposition/value, bounded confidence, source, learned/confirmed times, visibility, status;
- memories: authoritative event reference, participants/place/topic, salience/valence, learned/experienced time, interpretation explicitly separate from fact;
- goals and commitments: desired condition, priority, deadline, origin, target, breach/cancellation rules, status;
- relationships: directional typed facets and their supporting events;
- Standing Plan: goal, selected strategy template, current step, preconditions, reserved resources, next wake condition, contingencies, completion/block/expiry/review rules, and version.

V1 recall is deterministic integer scoring over recency, salience, participant/topic match, and goal relevance. Stable IDs break ties. Embeddings and a vector database are rejected until a measured fixed corpus shows typed recall is the cause of failure.

Routine behavior follows the active Standing Plan. Replan only when a named boundary occurs: precondition failure, goal completion/expiry/impossibility, important offer/loss/betrayal/relationship rupture, material resource shock, sponsor intervention, or scheduled review.

## `DecisionContext`

Every Brain sees an immutable, size-bounded object containing only:

| Field | Required meaning |
|---|---|
| `contextId`, `schemaVersion` | stable request identity and contract version |
| `regionRevision`, `simulationTime`, `decisionReason` | exact authoritative boundary |
| `citizen` | identity traits, role, values, goal, commitments needed for this decision |
| `visibleFacts` | typed facts the citizen can currently observe, each with authoritative source |
| `beliefs` | bounded sourced beliefs the citizen actually holds, including uncertainty/contradiction |
| `standingPlan` | active plan and the condition that caused review |
| `actionCatalog` | closed typed actions and argument schemas legal to consider, not a grant to execute |
| `budgets` | maximum input/output bytes, records, time, proposals, optional tokens, and cancellation deadline |

Hidden Reality, other citizens' private Mind state, secrets, raw logs, generic tools, URLs, files, SQL, code execution, and recursive planning are absent. Retrieval occurs deterministically before the Brain.

## `IntentProposal`

Every Brain returns at most one proposal containing:

| Field | Required meaning |
|---|---|
| `proposalId`, `schemaVersion`, `contextId`, `expectedRevision` | identity and freshness |
| `action` | exactly one known action from the supplied catalog with typed bounded arguments |
| `planProposal` | optional typed amendment/replacement for the citizen's Standing Plan |
| `memoryProposal` | optional typed proposal to note/interpret an already visible sourced fact; never an invented fact |
| `publicJustification` | short, length-bounded, escaped, untrusted player-facing explanation |
| `provenance` | Standard Brain or exact optional adapter/model/runtime/prompt versions |

There is no hidden-reasoning field. Private chain-of-thought is neither requested nor stored. `publicJustification` cannot authorize action, prove a fact, or change a score.

## Standard Brain

At a decision boundary it:

1. filters strategy templates by beliefs, values, role, commitments, action catalog, and resources;
2. scores legal candidates with documented integer utility terms;
3. uses seeded tie-breaking;
4. instantiates or retains a Standing Plan;
5. emits one bounded proposal;
6. receives typed rejection reasons and follows a declared contingency, replans once, or safely waits.

Personality changes weights and thresholds; it cannot bypass knowledge, distance, ownership, capability, law, or authority.

## Validation and failure semantics

Application parses a closed schema, rejects unknown fields and out-of-context IDs, enforces size/depth/string/numeric bounds, checks the expected revision, then rechecks life state, visibility, position, ownership, resources, law, and authority. Acceptance is atomic through Reality. Rejection causes no partial mutation.

Any absent runtime, unsupported WebGPU, user refusal, download failure, timeout, 429, revoked credential, malformed schema, hidden-fact use, stale revision, budget exhaustion, or provider removal immediately uses the Standard Brain for that boundary. Replay uses the recorded accepted event and never reinvokes any Brain.

## Disposable cognition-spike evidence

**DIRECTIONAL LOCAL EVIDENCE:** scratch commit `780bf84` exercised an already present local `qwen3-coder:30b` against a bounded proposal/authorization harness. The first call completed in **8,064 ms** and a warm call in **855 ms**. Schema and authorization gates passed; a stale revision was rejected and deterministic fallback progressed. Public justifications were incomplete and mixed-language.

This supports the adapter/validator/fallback shape only. It is not evidence for player attachment, browser-local inference, a sub-2B model, stable latency, mobile viability, download size, GPU contention, provider economics, or acceptable prose. The 30B local developer model is not a V1 dependency or candidate runtime.

## Model routes after product proof

| Route | Decision |
|---|---|
| Deterministic Standard Brain | Required now |
| WebLLM **or** Transformers.js browser-local runtime | Post-attachment spike; choose one only after download/memory/thermal/frame/license tests |
| User-authorized provider | Later opt-in experiment; never onboarding, never required |
| Owner-hosted provider/Workers AI | Eval or hosted gate only with measured costs, quotas, secrets, and spend approval |
| Developer-local open weights | Research/eval only |
| Continuous calls, training/fine-tuning, public self-hosted GPU | Rejected |

## Resulting implementation behavior

- Eight citizens plan and act with no model package installed.
- A sponsor intervention can be accepted, rejected, delayed, or reinterpreted because the citizen evaluates it through values, beliefs, commitments, and current plan.
- The UI can explain the public decision inputs and outcome without claiming hidden reasoning.
- Provider failure cannot pause world progress or alter replay.
- Exact cognition provenance can support debugging without becoming product branding.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Model selection during onboarding | Account/download jargon before the product has shown value |
| Model writes Reality or free-form state patches | Authorization, replay, hidden-fact, and injection failure |
| Continuous per-citizen inference | Cost, latency, liveness, and solo-operations failure |
| Random free-model routing | Character continuity and version provenance failure |
| Natural-language-only memory | Hard to authorize, retrieve, migrate, or replay |
| Embeddings/vector database in V1 | Infrastructure without a measured eight-citizen need |
| Store chain-of-thought | Unnecessary sensitive/unreliable data; no product authority |
| Required browser-model download | Violates free, fast, device-inclusive onboarding |

## Unproven assumptions and reopen evidence

- **PRODUCT HYPOTHESIS:** the Standard Brain can create attachment. Reopen optional cognition only after mechanics, stakes, memory, UI, and visibility pass yet blinded players still find behavior repetitive.
- **UNRESOLVED:** public justification can be both short and faithful. Reopen template/copy generation after factuality review.
- **UNRESOLVED:** one small browser model can improve bounded proposals without renderer interference. Reopen only through the full device/eval gate.
- **UNRESOLVED:** model diversity creates better stories rather than benchmark discourse. Reopen only with blinded story preference and retention evidence.

## Constraint fit

The accepted route costs $0, runs CPU-first on the M4 Pro and ordinary browsers, needs no account/key/model download, trains nothing, and preserves deterministic replay. The first implementation adds a small typed seam instead of a provider integration. All paid, hosted, local-weight, and branded-model work is explicitly post-gate and separately authorized.
