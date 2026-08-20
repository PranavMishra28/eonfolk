# Cognition and behavior evaluation

**Purpose:** define how Standard Brain behavior, proposal safety, attachment relevance, and any later model adapter are evaluated.

**Status:** ACCEPTED EVALUATION CONTRACT; MODEL COMPARISONS DEFERRED

**Authority boundary:** owns cognition fixtures, hard assertions, behavioral rubrics, blinded comparisons, and model-version release gates. Product gate outcomes are owned by [quality bar](QUALITY_BAR.md); cognition mechanics by [cognition](../engineering/COGNITION.md).

**Related documents:** [cognition](../engineering/COGNITION.md), [testing](TESTING.md), [security](../engineering/SECURITY.md), [model research](../research/MODEL_RESEARCH.md), [quality bar](QUALITY_BAR.md)

## Owned decision

Evaluate the deterministic Standard Brain first. Safety and executability use code assertions; continuity, groundedness, apparent intention, diversity, and attachment use scenario rubrics and fresh humans. An LLM judge may diagnose later model outputs but can never be the sole release gate.

No model integration is justified merely because it produces more fluent prose. Optional cognition opens only when player/error analysis isolates a proposal-quality deficit after mechanics, stakes, Mind, Chronicle, and visibility are credible.

## First-slice fixture set

At minimum include fixed contexts for:

- routine plan continuation and scheduled review;
- blocked plan/resource disappearance;
- incomplete and false sourced belief;
- private fact held by another citizen;
- sponsor counsel conflicting with a value or commitment;
- counsel accepted, rejected, delayed, and reinterpreted;
- bilateral exchange and impossible/unaffordable action;
- relationship tension, betrayal/allegation, and reconciliation opportunity;
- death/incapacity/nonexistent ID and stale revision;
- hostile text in a name, memory, counsel, and public justification;
- timeout/malformed/provider absence represented through the adapter harness.

Each fixture records visible facts, sourced beliefs, Standing Plan, action catalog, budgets, legal action set, invariant outcomes, and allowed diversity. It does not force one personality choice when several grounded actions are legitimate.

## Hard assertions

- 100% of decision requests end in one valid accepted proposal, a safe no-op, or deterministic fallback.
- Zero unauthorized actions, hidden-fact uses, invalid/dead actors, nonexistent IDs, or partial mutations.
- Every selected action is in the supplied catalog and valid at the expected revision.
- Public justification introduces no unsupported fact and remains length/schema bounded.
- Repeated Standard Brain runs with the same seed/context match exactly.
- Every timeout, malformed, 429, revoke, missing runtime, or provider-removal fixture preserves world progress through Standard Brain.
- Replay never invokes cognition.

These are blocking invariants, not aggregate percentages.

## Behavioral rubric

Fresh reviewers score evidence, not prose style:

| Dimension | Passing question |
|---|---|
| Groundedness | Does the action use only known facts/beliefs and available means? |
| Value/goal fit | Is the choice intelligible from identity, current goal, and commitments? |
| Plan continuity | Does behavior continue or revise a plan for a named reason rather than react randomly? |
| Social consequence | Does a relationship or commitment affect action and later interpretation? |
| Diversity | Do different citizens/contexts choose meaningfully different legal strategies without noise? |
| Legibility | Can a player explain the choice without inspecting hidden state or chain-of-thought? |
| Agency | Can the citizen credibly reject, delay, or reinterpret sponsor intent? |
| Attachment value | Does the outcome create concern, surprise, responsibility, or a question worth returning for? |

Use identical fixtures and presentation for comparisons. Blind adapter/model branding and randomize order. Report distributions and objections, not only averages.

## Later optional-model corpus and release bar

Before any real adapter experiment, expand to at least 100 contexts spanning the categories above plus scarcity, offers, role loss, law/politics, conflicting commitments, context truncation, and provider-injection text.

An exact adapter/model/runtime/prompt/schema version may enter an experiment only if:

- all hard assertions and failure drills pass;
- at least 95% first-pass schema validity on the fixed corpus (a provisional engineering target, revisable only from error evidence);
- exact provider/model/runtime/weight/prompt versions, hashes, license chain, and costs are recorded;
- persona/goal continuity is no worse than Standard Brain;
- strategic/story value improves in blinded human review;
- latency, download, memory, heat, frame-time, privacy, and fallback budgets pass;
- removing the adapter changes enrichment only, never liveness or canonical replay.

Do not pool failure rates behind a router. Evaluate every exact version separately. Do not silently substitute a different model; fall back to Standard Brain.

## Disposable cognition-spike interpretation

Scratch `780bf84` showed that a local proposal could pass schema/authorization and that stale revision rejection plus deterministic fallback worked. First/warm latency was 8,064/855 ms; justifications were incomplete and mixed-language. This is directional harness evidence only. It neither passes the behavioral rubric nor supports a browser, mobile, small-model, cost, or player-quality claim.

## Resulting implementation behavior

The first implementation ships with explainable deterministic fixtures and player-facing decision evidence. If optional cognition is later considered, the same contexts compare it with Standard Brain and attribute both improvements and regressions to exact versions. Fluency cannot mask hidden-fact, authority, latency, or continuity failure.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| One “correct” action per social scenario | Collapses legitimate personality diversity |
| Fluency-only evaluation | Rewards prose without grounded, consequential behavior |
| LLM judge as release authority | Judge bias/variance and no direct player-attachment evidence |
| Aggregate router score | Hides unstable model/version failures |
| Benchmark model brands in onboarding/shares | Turns citizens into a leaderboard rather than a game |
| Add Promptfoo before a model adapter | Ordinary trusted fixtures cover the first slice with less surface |

## Unproven assumptions and reopen evidence

- **PRODUCT HYPOTHESIS:** rubric scores predict player attachment. Reopen after fresh player walkthroughs correlate poorly.
- **UNRESOLVED:** 100 contexts cover enough later model failure modes. Expand from observed error clusters rather than arbitrary volume.
- **UNRESOLVED:** 95% first-pass schema validity is an appropriate efficiency gate. Reopen only if repair/fallback UX and costs justify a different target without weakening hard assertions.
- **UNRESOLVED:** public justifications can remain factual across reinterpretation. Reopen template/schema after Chronicle review.

## Constraint fit

The first suite is deterministic, local, provider-free, and maintainable by one builder. It forbids training/fine-tuning and paid evaluation requirements. Human review focuses on the product risks that justify the 52-hour slice rather than infrastructure or benchmark prestige.
