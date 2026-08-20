# Final readiness

**Purpose:** answer the twelve product-readiness questions concretely and audit the decision-complete exit conditions.

**Status:** READY FOR GOAL MODE — exact amended execution contract confirmed; product gates remain unrun

**Authority boundary:** this file owns the final readiness answers and exit evidence summary. It does not override [DECISIONS](../decisions/DECISIONS.md), [QUALITY_BAR](../quality/QUALITY_BAR.md), or the [ExecPlan](../exec-plans/active/001-foundation.md).

**Related documents:** [product](../product/PRODUCT.md), [human loop](../product/HUMAN_LOOP.md), [Chronicle](../product/CHRONICLE.md), [architecture](../engineering/ARCHITECTURE.md), [player perspectives](PLAYER_PERSPECTIVES.md)

## Twelve concrete answers

### 1. What is fun without saying AI?

You notice that Mara suspects her friend Toma, check what she actually knows, advise her to verify privately, accuse now, or stay out, then watch her make her own choice. The pleasure is predicting a person you cannot command, accepting responsibility for advice, and seeing a relationship/rule/resource state diverge. If three branches converge or players prefer direct control in Gate 0, this answer is false.

### 2. What is impossible or dramatically weaker without modern AI?

Nothing required by the first proof. Standard Brain supplies all mechanics, autonomy, refusal, catch-up, and replay. Modern models may later broaden natural-language expression or handle semantically varied player wording, but V1 deliberately does not test that value. If a future blinded model adds no story/return value beyond templates, models remain excluded.

### 3. What does the player actively decide?

They decide whether to follow Mara; which authorized evidence to investigate; whether to advise private verification, immediate accusation, or abstention; whether to confirm a proposed absence advance; and which branch-legal response to take on return—repair, uphold, investigate, or observe. They do not schedule labor, move units, inspect secrets, or enact a law directly.

### 4. What tension remains after ten minutes?

The factual issue may be resolved while the human one is not: the audit can establish a public repair reserve and still leave Mara/Toma strained; private verification can preserve trust while leaving public accountability unresolved; abstention can preserve the relationship while the ledger/shortage risk persists. The return choice must operate on that actual branch, not display a generic cliffhanger.

### 5. Why care about one citizen?

Mara has a legible public-duty/caution conflict, trusts the person implicated by her evidence, asked for a limited witness, remembers advice, and bears consequences the player cannot absorb or undo. Gate B requires cross-surface recognition, one exact branch-related reason token, and a voluntary second action; factual recall alone does not count.

### 6. Why return tomorrow?

The bounded proof offers an explicit leave/advance/reveal loop: the world changes first, a factual summary explains the branch, and a second available action depends on what Mara previously chose. This is only same-session/controlled-return motivation. “Tomorrow” and delayed retention remain unproven until participants voluntarily return later without a reminder.

### 7. Why is session 20 richer than session 1?

The planning hypothesis is that relationships, beliefs, commitments, artifacts, reputation, offices, and precedent change future eligibility/stakes. The first slice does not implement or validate session 20, so V1 must not claim it. A later 20-session gate must show new history-dependent choices without adding a new rule/content family each time or the persistent-civilization thesis reopens.

### 8. What exactly gets shared?

In V1, nothing is publicly shared. The player can copy a private responsive Story Card from their accepted branch: advice branches use **YOU ADVISED**, abstention uses **NO ADVICE / YOU ABSTAINED**, and every branch continues **MARA CHOSE → WHAT FOLLOWED → UNRESOLVED** with evidence details. It has no URL/seed headline and tests five-second causal comprehension only. A playable public recipient route and activation measurement require separate authorization.

### 9. Why is this not SEED?

The tested behavior is one limited relationship, rare rejectable advice, explicit counterfactual branches, user-confirmed bounded absence, and event-grounded causal return—not schedules for owned workers, a shared economy, or dialogue/log volume. SEED already occupies persistent autonomous shared society, so EONFOLK must win the branding-hidden Gate 0 matched comparison; this paragraph alone is not differentiation evidence [S-PLAYER-008] [S-COMP-002].

### 10. Why is this not TerraLingua or AI Town with better graphics?

TerraLingua is an agent-society research/code artifact and AI Town is a persistent conversation-oriented starter world [S-COMP-008] [S-COMP-014]. EONFOLK's proof is a consumer decision loop with typed authority, state-sensitive refusal, durable counterfactual consequences, false-causality controls, a second return decision, and no model requirement. If players experience it as watching agents/chat plus a polished log, the distinction fails.

### 11. What is the hardest unproven assumption?

That limited indirect advice plus deterministic behavior creates care and responsibility rather than arbitrary denial, scripted theater, or a smaller colony simulator. No current document, concept, spike, or agent walkthrough proves this with humans.

### 12. Which experiment falsifies it fastest?

Gate 0 first: six unfamiliar participants compare ugly one-citizen/family/trio/faction/ECHOHOUSE/direct-control versions of the same decision under a complete balanced Williams schedule. Then, before polish, eight unfamiliar sessions compare the real state-sensitive DOM loop with a yoked canonical script. Reopen if Riverhold loses the unique rank/four-of-six floor, an alternative exceeds it by at least two true responses on desirability/continue, the real loop fails to beat script on contingency/continue, fewer than four of eight take the outcome-dependent second action within 60 seconds and select one of `mara-toma-concern`, `curiosity`, `obligation`, or `anticipated-relationship-consequence`, or branches converge.

## Contradiction audit

| Concern | Locked answer | Sole authority |
|---|---|---|
| Product structure | bounded local Riverhold proof; fixed Mara; public canon later | [PRODUCT](../product/PRODUCT.md) |
| Human loop | early investigate, two advice intents + abstain, explicit advance, second choice | [HUMAN_LOOP](../product/HUMAN_LOOP.md) |
| Starting unit | one fixed authored focal citizen among eight; no creator/roster | [PRODUCT](../product/PRODUCT.md) |
| Long horizon | session 5/20/death/newcomer are hypotheses, not V1 claims | [PROGRESSION](../product/PROGRESSION.md) |
| Distribution | private Story Card comprehension; no public URL/activation claim | [DISTRIBUTION](../product/DISTRIBUTION.md) |
| Model ecology | complete Standard Brain; no model/provider in V1 | [COGNITION](../engineering/COGNITION.md) |
| Renderer/assets | PixiJS 2.5D atlas + semantic DOM; no R3F/3D pipeline | [FRONTEND](../engineering/FRONTEND.md) |
| Persistence | atomic run genesis; durable-before-visible run-scoped IndexedDB; receipts/fencing; no backup/export/import | [PERSISTENCE](../engineering/PERSISTENCE.md) |
| Causality | direct/trigger/contributing causal; temporal/response separate; allegation content | [SIMULATION](../engineering/SIMULATION.md) |
| Scope/hours | 52 planned + ≤8 fix/review, hard 60; Gate 0/A/B | [001-foundation](../exec-plans/active/001-foundation.md) |
| Budgets/access | explicit payload/time/frame/mobile/semantic/reduced-motion gates | [PERFORMANCE](../quality/PERFORMANCE.md) |
| CI/security | required/conditional suites, probed capabilities, no invented protection | [TESTING](../quality/TESTING.md) |

## Constraint-fit audit

- Solo builder: one scenario, one renderer/atlas, one local adapter, one version, no platform.
- 40–60 hours: 52 planned, ≤8 fix contingency; product proof occurs before hour 20.
- M4/no GPU: worker/Pixi/DOM and Standard Brain are CPU/local; physical device is a QA target, not infrastructure.
- Approximately $0: no spend/action/service needed; $50/$300 remain unapproved comparisons.
- Free V1: no account/key/download/model/server/payment.
- No training/data/partner/enterprise: authored fictional fixtures only; no commercial operations.

## Civilization amendment audit

| Requirement | Authoritative evidence | First-slice effect | Deferred behavior |
|---|---|---|---|
| World / Chronicle / Observatory identity | [Product](../product/PRODUCT.md), [Observatory](../product/OBSERVATORY.md) | consumer Mara loop remains primary; preserve provenance | public civilization/research surface |
| Maximum strategy, absolute causal boundaries | [World model](../game/WORLD_MODEL.md), [simulation](../engineering/SIMULATION.md) | only typed Reality actions can change state; no arbitrary tools/network | broader composable affordance catalog |
| Private information | [World model](../game/WORLD_MODEL.md), [cognition](../engineering/COGNITION.md) | separate observation/knowledge/belief/memory/claim records and noninterference tests | richer memory/communication |
| Consequential-decision traceability | [Cognition](../engineering/COGNITION.md), [persistence](../engineering/PERSISTENCE.md) | bounded state/context/plan/proposal/validation/receipt/event records | Observatory query/analysis |
| Three data forms | [Architecture](../engineering/ARCHITECTURE.md), [persistence](../engineering/PERSISTENCE.md) | separate world/decision stores and one immutable run manifest | experiment service/dataset |
| Replay ≠ model reproduction | [Persistence](../engineering/PERSISTENCE.md), [evals](../quality/EVALS.md) | replay with cognition disabled; preserve original proposal | repeated independent model runs/distributions |
| Future Institution kernel | [Governance](../game/GOVERNANCE.md) | names/IDs avoid council-only lock-in | generic institutions/organizations/war |
| Human roles | [Product](../product/PRODUCT.md) | Follow Mara provides only the narrow patron/history path | Stranger/Follower/Historian/Experimenter/Creator UI |
| Canon and counterfactuals | [World structure](../product/WORLD_STRUCTURE.md) | one `canonical-local-proof` manifest; no fork route | snapshot-derived noncanonical World Forks |
| Research positioning and unchanged gates | [Observatory](../product/OBSERVATORY.md), [001-foundation](../exec-plans/active/001-foundation.md) | no human-society claim, dashboard, or added mechanics; the two-hour contract delta replaces two hours of removed export work | post-gate bounded research |

## Required exit checks

- [x] Hard personal/build constraints affect scope, architecture, and stop conditions.
- [x] `IMPLEMENTATION_GOAL_PROMPT.md` exists and is self-contained; exact blob `a5e30353d3bee951ff25a85758f9accf22aea30a` passed final fresh targeted confirmation with zero P0/P1.
- [x] Tool/plugin/MCP inventory contains every requested capability and field.
- [x] CI/CD contract covers required/conditional/security/branch/update/retention behavior and actual private-repo probes.
- [x] Initial performance/accessibility budgets incorporate the failed R3F spike and require a new early Pixi measurement.
- [x] Gate A/B have browser-visible three-viewport criteria and human denominators.
- [x] Distribution and model ecology alter V1 scope rather than remain prose appendices.
- [x] Top decisions, assumptions, and abandon/change triggers are present.
- [x] Four frozen red teams and five hostile perspectives are reconciled.
- [x] Final independent cross-discipline review findings were fixed and the one targeted confirmation passed.
- [x] Amended Goal prompt passes an immutable fresh full review/fix cycle and final targeted confirmation with no residual P0/P1; the [review record](CIVILIZATION_AMENDMENT_REVIEW.md) preserves exact identities and dispositions.
- [x] Fresh amendment Markdown/link/source/contradiction/secret/license/code/Git QA passes.
- [x] Amended branch is pushed and exactly one draft PR exists; draft [#1](https://github.com/PranavMishra28/eonfolk/pull/1) remains open and unmerged.
- [x] Civilization amendment authorities and revised Goal prompt pass fresh independent review and final QA.

Future Goal invocation must supply `APPROVED_ORCHESTRATION_PROMPT_BLOB=a5e30353d3bee951ff25a85758f9accf22aea30a` in higher-authority metadata; the repository cannot originate that approval. `READY FOR GOAL MODE` means the experiment contract is implementation-ready, not that the product or research thesis is true or that Gate 0/A/B/Card has passed with humans.
