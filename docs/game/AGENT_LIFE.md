# Citizen life, mind, plans, and succession

**Purpose:** define what makes a citizen autonomous, legible, bounded, and continuous without relying on an external model.

**Status:** ACCEPTED FOR FIRST SLICE; DEATH/SUCCESSION DEFERRED

**Authority boundary:** this file owns citizen state and life semantics. [WORLD_MODEL](WORLD_MODEL.md) owns truth/visibility; cognition engineering owns proposal interfaces; [PROGRESSION](../product/PROGRESSION.md) owns player-facing continuity.

**Related documents:** [human loop](../product/HUMAN_LOOP.md), [game systems](GAME_SYSTEMS.md), [model research](../research/MODEL_RESEARCH.md)

## Owned decision

Every citizen has: stable identity; 2–3 ranked values; bounded needs; relationships; roles; authorized observations; private knowledge; sourced beliefs with confidence/provenance; bounded memories; reputation observations; commitments; a stable-ID Standing Plan; action budget; and a deterministic Standard Brain. Personality is demonstrated by repeated state-grounded choices, not adjectives or generated chatter.

## Decision cycle

1. A typed boundary occurs: need threshold, plan blocked/complete/expired, message, relationship shock, sponsor counsel, or scenario decision.
2. `DecisionContext` includes only authorized observation/knowledge/belief/memory references, active Standing Plan, legal action catalog, and budgets.
3. Standard Brain scores plan-continuation, self-maintenance, commitments, values, and social effects with seeded tie-breaking.
4. Standard Brain emits exactly one known typed action plus a typed `DecisionExplanation`; authored copy renders the public justification.
5. Application validates authorization, knowledge, location, resources, life state, and revision.
6. Application records the proposal and validator result in the bounded Cognitive/Decision Ledger; an accepted action changes Reality and links its event provenance to that decision ID. A rejected proposal uses the boundary's deterministic fallback/no-op and may schedule a later replan boundary, never a second Brain invocation in V1. A future optional adapter failure falls back to Standard Brain.

The citizen may accept, reject, delay, or reinterpret counsel. Reinterpretation must map to a legal intent and have a visible state-grounded reason. “Because the AI decided” is prohibited.

## Standing Plan

A plan contains stable plan ID/version, goal type, target IDs, ordered bounded steps, commitment/source, start/expiry boundary, retry/replan budget, and status. It is observable structured intent, not free-form chain-of-thought. Routine ticks follow the plan without new cognition. Blockage or boundary causes replan; absence never triggers unlimited decisions.

An observation, knowledge record, belief, memory, message claim, and plan are never interchangeable. A bounded memory may retain references and an authored summary key, but cannot reveal an unobserved fact, increase authority, or become a new belief without a typed update. At consequential boundaries the decision record lists the exact IDs actually supplied/read; the system stores no hidden reasoning transcript.

## Relationship and communication

The slice stores directional familiarity/trust/strain bands and last material interaction. Public/private messages carry speaker, proposition, recipients, provenance, and source visibility; receiving one creates a claim plus an observation that the communication act occurred, never an observation or automatic knowledge of the proposition. Generated presentation is optional and noncanonical. Relationship changes require declared rules such as public accusation, fulfilled exchange, shared work, or broken commitment. Repetitive small talk creates no mechanical depth.

## Deferred life, death, and succession hypothesis

Death is not implemented or promised by the first proof. A later click/paper test must compare successor, witness-only, and episodic closure before coding. If retained, death has typed cause/conditions, no wall-clock surprise, and no cloned memory; succession must create a meaningful decision rather than relabel a reset.

## Model-ecology policy

Standard Brain is mandatory and complete. Optional models operate only at decision boundaries on the bounded catalog. Model/provider/version and original structured proposal are provenance; canonical replay never reruns the model. No citizen class, status, skill, or social worth derives from model brand. No normal onboarding key/download. No training, fine-tuning, embeddings service, vector database, continuous calls, hidden reasoning storage, or model-created Reality.

## Rejected alternatives

Reject model-per-citizen identity, ensemble prompts with all secrets, unrestricted tool use/dialogue, transcript-as-memory, omniscient planning, continuous inference, arbitrary refusal, purchasable intelligence, resurrection tokens, and citizens freezing without sponsor/model.

## Reopen evidence

Reopen Standard-Brain-only slice only after it passes technically but blinded tests show an optional bounded model materially improves causal stories and return, with fallback still compelling. Reopen mind fields if player explanations cannot map to them or fixtures need fewer fields.

## Remaining uncertainty

**PRODUCT HYPOTHESIS:** four behavior families and small typed mind create person-like consistency. **UNRESOLVED:** value weights, refusal frequency, plan horizon, and succession attachment.

## Resulting implementation behavior

Implement eight authored citizens, fixed focal Mara, four behavior families, separate bounded observation/knowledge/belief/memory/relationship/plan records, Standard Brain, consequential decision provenance, three counterfactual counsel histories, state perturbation/transfer fixtures, and deterministic replay. Defer model adapters, birth, aging, death, lineage, open speech, generalized memory retrieval, and every additional long-term autonomy mechanic.

## Constraint fit

Typed minds run on CPU in a worker, cost $0, and fit the 52-hour local slice. They need no GPU service, training, data corpus, identity account, payment, partner, or enterprise support.
