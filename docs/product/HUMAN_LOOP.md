# Human loop and intervention contracts

**Purpose:** define what the player perceives and does from moment to lifetime, including the exact first-session and return timing.

**Status:** DECISION PROPOSED

**Authority boundary:** this file owns human verbs, decision boundaries, timing, and session closure. [PRODUCT](PRODUCT.md) owns the promise; [GAME_SYSTEMS](../game/GAME_SYSTEMS.md) owns rule primitives; [CHRONICLE](CHRONICLE.md) owns factual explanation.

**Related documents:** [player evidence](../research/PLAYER_RESEARCH.md), [tournament](../research/GAME_DESIGN_RESEARCH.md), [agent life](../game/AGENT_LIFE.md), [progression](PROGRESSION.md)

## Owned decision

The moment loop is **observe → investigate → counsel or commit → citizen interprets/refuses → consequences compound → Chronicle explains → choose the next risk**. Advice is scarce by situation, not by purchasable energy. World time advances at discrete meaningful boundaries and stops at a safe checkpoint on exit.

## Retained verb contracts

| Verb | Trigger and information | Cost | Interpretation/refusal | Authoritative effect and delay | Counterplay | Chronicle trace |
|---|---|---|---|---|---|---|
| Observe | Any time; visible state, public acts, identity/tension summaries | Attention only | None | Changes no world fact | Filter by citizen/place; semantic list equivalent | Not an event unless player bookmarks |
| Investigate | A tension exposes a factual uncertainty; preview names source/place | One bounded attention opportunity and simulation time | Witness may refuse; evidence may be incomplete | Adds a sourced belief or observation, never omniscience; resolves in seconds/minutes | Ask another source, inspect artifact, accept unknown | source, visibility, fact/belief distinction, event IDs |
| Counsel | Citizen reaches a typed decision boundary; show known stakes and 2–3 materially distinct intents plus abstain | One covenant intervention for that boundary; no currency | Accept, reject, delay, or reinterpret for displayed value/belief/relationship | Updates the citizen's Standing Plan/belief only if interpreted; systemic consequence is delayed | Citizen can reconsider; others react; player can repair later, not undo history | advice, interpretation, chosen action, eligibility causes, later effect |
| Commit | A citizen plan needs sponsor standing or one bounded patron resource | Explicit named stake that cannot be reused | Citizen may reject the attached expectation or use support differently within declared bounds | Resource/standing transfer is immediate and authoritative; use is autonomous | Withdraw before commitment; later renegotiate; social actors contest | transfer, promise terms, recipient plan, subsequent use |
| Abstain | At any decision boundary after stakes are known | Foregoes influence; time advances | Citizen acts without sponsor input | Records deliberate non-intervention; no invented causal credit | Player may act at a later boundary | abstention and subsequent independent action kept separate |
| Release/choose successor | Covenant transition, sponsor choice, or death aftermath | Ends privileged access to that citizen | Citizen/successor can decline covenant | Rebinds covenant at a safe boundary; cannot erase history | Remain witness; choose eligible successor; delay once | release, acceptance, inherited obligations, preserved lineage links |

Remove verbs whose only result is activity: move a citizen, queue jobs, repeatedly feed/heal, spam chat, set hourly schedules, collect idle rewards, or click a Chronicle entry merely to clear it. Gathering and consumption are citizen behaviors, not routine player chores.

## Time contract

| Time | Player-visible outcome |
|---|---|
| 0–5 seconds | World dominates the screen; Mara is marked by name, desire (“earn a council voice”), and tension (“trusts Toma; suspects his count”). “The town lives by its own plans” states the autonomy promise. |
| 5–30 seconds | Three citizens' actions are legible through movement/task silhouettes; two interact; player can select Mara by world or semantic list. No lore gate. |
| 30 seconds–3 minutes | Identity, values, immediate relationships, and tension fit one panel. Player watches autonomy, investigates one clue, and learns evidence can be public fact, sourced belief, or allegation. |
| 3–10 minutes | A decision boundary opens; player forecasts counsel stakes, commits/abstains, sees interpretation and independent action, then one delayed relationship/resource/institution consequence. Chronicle explains three authoritative beats. |
| Session end | World stops at a stable checkpoint. Player sees Mara's current Standing Plan, one unresolved question, and what can advance on bounded return. Close has no penalty, streak, or emergency. |
| Day return | Changed tableau first, then a 10-second While You Were Away summary. Choose repair, investigation, escalation, or observe. |
| Week return | One relationship/institution consequence has compounded at checkpoints; summary compresses stable production and stops at shocks. |
| Session 5 | Player recognizes how Mara interprets counsel, owns one regret/repair, and sees another citizen or artifact remember it. |
| Session 20 | Choice meaning comes from relationships, precedents, offices, lineage, and era—not larger numbers or more frequent commands. |

## Session and lifetime arcs

**Session:** orient in changed tableau → recognize focal tension → gather one missing fact → choose one risk → witness response → leave at unresolved stable boundary. A session may end after observation; the game never demands counsel to remain “efficient.”

**Citizen lifetime:** meet an unfinished person → build a model of values and distortions → share responsibility for consequences → watch roles/relationships change → face a bounded irreversible decision → memorialize death/release → choose the covenant's next relationship. Death creates a successor decision, not a reset or monetized replacement.

## Decision-boundary requirements

A counsel prompt exists only when at least two legal actions lead to materially distinct forecasted stakes, the citizen has enough visible reasons to interpret, the result is not already determined, and delay will make a later consequence observable. The Standard Brain chooses without a model. The application shows a short public justification derived from typed state, never hidden reasoning.

## Rejected alternatives

Reject continuous chat, command queues, daily chores, direct possession, invisible random refusal, irreversible first-session death, punitive wall-clock decay, and “return to read a log.” Reject advice menus whose options collapse to the same state.

## Reopen evidence

Reopen if most fresh players cannot forecast difference between counsel options, cannot explain why the citizen responded, or request routine control after understanding autonomy. Test direct control and trio/family only through the identical Riverhold scenario before broadening verbs.

## Remaining uncertainty

**PRODUCT HYPOTHESIS:** a single decision in ten minutes feels active enough. **UNRESOLVED:** how much refusal is tolerable. **UNRESOLVED:** whether factual explanations reduce mystery. Measure comprehension, frustration, and anticipation separately.

## Resulting implementation behavior

Gate B implements Observe, one bounded Investigate, Counsel, and Abstain. Commit and succession are documented contracts but deferred. Every consequential action has a keyboard/semantic DOM path. Reduced motion preserves manual Chronicle stepping and response legibility.

## Constraint fit

Four proof verbs and one conflict fit the 52-hour envelope, need no model or server, and avoid content/moderation costs. No monetization, training, proprietary corpus, identity, partnership, or regulated information enters the loop.
