# Chronicle, causal truth, and replay

**Purpose:** define how authoritative events become biography, relationship history, absence return, world history, replay, public explanation, and share artifacts without overstating causality.

**Status:** DECISION PROPOSED — fixed Riverhold fixture is the acceptance oracle

**Authority boundary:** this file owns factual narrative semantics and the Riverhold presentations. [WORLD_MODEL](../game/WORLD_MODEL.md) owns event truth; [DISTRIBUTION](DISTRIBUTION.md) owns channels; presentation layers may shorten but never invent.

**Related documents:** [product](PRODUCT.md), [human loop](HUMAN_LOOP.md), [distribution research](../research/DISTRIBUTION_RESEARCH.md), [world model](../game/WORLD_MODEL.md)

## Owned decision

The Chronicle is a deterministic projection of authoritative events. It distinguishes:

- **Direct cause:** a validated state transition was mechanically necessary for the stated effect.
- **Trigger:** the event crossed the rule's threshold or initiated the resolver.
- **Contributing condition:** a recorded condition changed eligibility, cost, or likelihood but was not sufficient.
- **Temporal predecessor:** it happened earlier; no causal claim is supported.
- **In-world allegation:** a named speaker/belief claims a relation not established by Reality.

Every factual sentence resolves to event IDs and state hashes. A citizen's justification is testimony/provenance, not hidden reasoning or objective truth. Causal parents are typed, not inferred later from narrative proximity.

## Fixed Riverhold evidence chain

All Chronicle formats use this immutable planning fixture:

| Event | Authoritative fact | Causal role used later |
|---|---|---|
| RV-001 | Day 18 spring inflow falls below the settlement reserve boundary. | Contributing condition to shortage status |
| RV-002 | Storekeeper Toma moves 12 grain units from public bins to a sealed repair reserve; ownership remains Riverhold. | Direct cause of public-bin count change; not proof of theft |
| RV-003 | Mara observes the public ledger shows 12 more units than the open bins and records belief `ledger mismatch`; she does not see RV-002. | Direct cause of her sourced belief |
| RV-004 | Patron counsels Mara: “Expose the shortage before the council vote.” | Contributing input to her next decision; never direct cause of her action |
| RV-005 | At a decision boundary Mara interprets RV-004 as `verify, then disclose`; her caution value, trust in Toma, RV-003, and counsel are recorded conditions. | Direct cause of Standing Plan change; counsel is one causal parent |
| RV-006 | Mara asks miller Iven to recount; Iven observes the sealed reserve mark and reports it to Mara. | Direct cause of verified belief that reserve exists; Iven does not know motive |
| RV-007 | Mara states at market: “The public ledger is wrong and Toma sealed grain from view.” | Trigger for council audit; the statement is an act, not proof of “corruption” |
| RV-008 | Toma rejects Mara's allegation and relationship trust changes from `close` to `strained` under the public-accusation rule. | RV-007 direct cause of relationship transition |
| RV-009 | Council audit finds 12 units, reserve ownership, and a work order for mill repair; it finds no private transfer. | Direct evidence of reserve and purpose; falsifies theft as fact |
| RV-010 | Petition threshold is met by Mara's market statement plus three recorded endorsements. | Trigger for council rule vote |
| RV-011 | Council passes `public-reserve-counts`; future ledgers must separate open stock and sealed reserve. | Direct institutional outcome of valid vote; RV-010 trigger, RV-009 evidence condition |
| RV-012 | Next shortage checkpoint allocates grain using the separated counts; no citizen misses that ration. | Direct effect of the allocation rule at this checkpoint; not proof the law prevented famine generally |

Pre/post hashes and sequence belong to implementation fixtures. This document deliberately makes no unrecorded claim about Toma's intent, Mara's courage, or the law “saving Riverhold.”

## Seven presentations from one chain

### Biography: Mara

“On day 18 Mara found a 12-unit mismatch between Riverhold's ledger and open bins [RV-003]. After counsel from her patron [RV-004], she chose to verify before disclosing [RV-005]. Iven's count confirmed a sealed reserve [RV-006]. Mara's public statement triggered an audit [RV-007], strained her relationship with Toma [RV-008], and helped trigger the petition threshold [RV-010]. The audit found a mill-repair reserve, not a private transfer [RV-009].”

### Relationship history: Mara ↔ Toma

“Their relationship changed from close to strained when Mara publicly alleged that Toma had sealed grain from view [RV-007, RV-008]. Toma said she treated a repair reserve as misconduct [RV-008, allegation]. The audit verified the reserve and work order but did not establish either person's moral account [RV-009].”

### While You Were Away

“Mara verified the hidden reserve with Iven [RV-006], spoke at market [RV-007], and lost Toma's trust [RV-008]. The audit found the grain still belonged to Riverhold and was reserved for mill repair [RV-009]. A petition then reached the vote threshold [RV-010]. **Unresolved:** will Mara repair the relationship before the council implements the new rule?”

### World history

“Day 18 — After a public ledger mismatch and audit [RV-003, RV-007, RV-009], Riverhold passed `public-reserve-counts` [RV-010, RV-011]. The rule first governed an allocation at the next shortage checkpoint [RV-012].”

### 15–30-second replay

| Time | Visual fact | Caption and provenance |
|---|---|---|
| 0–2s | public bins vs ledger | “12 units did not match.” [RV-003] |
| 2–5s | counsel committed | “You advised Mara to expose the shortage.” [RV-004] |
| 5–9s | Mara walks to Iven; sealed mark | “She did not obey immediately. She verified.” [RV-005, RV-006] |
| 9–13s | market confrontation | “Mara spoke; Toma's trust broke.” [RV-007, RV-008] |
| 13–17s | audit sheet | “The grain was a public repair reserve—not a proven theft.” [RV-009] |
| 17–21s | council rule notice | “The petition triggered a rule vote.” [RV-010, RV-011] |
| 21–25s | Mara/Toma apart | “The ledger changed. Their relationship has not.” [RV-011, RV-008] |

### Share card

> YOU ADVISED: expose the shortage [RV-004]
>
> MARA DID: verified, then spoke [RV-005–RV-007]
>
> RESULT: public reserve counts became law; Toma's trust broke [RV-008, RV-011]
>
> UNRESOLVED: repair the friendship or enforce the precedent?
>
> SEED/EVENT: RIVER-18 / RV-003…RV-011

### Public event page

The canonical URL shows title, exact region/time, three factual beats, current unresolved tension, `ReplayManifest` versions, and expandable evidence. “Patron counsel contributed to Mara's plan” is permitted [RV-004, RV-005]. “The patron exposed corruption” and “Mara saved Riverhold from famine” are prohibited. Allegations display speaker and belief status.

## Factual generation rules

Templates select only declared predicates. Names and short public justifications are escaped text. No model may write fact text, HTML, Markdown, URLs, causality, or canonical summaries. Unknown remains unknown. Coalescing may say “gathered 8 wood across four stable events” only when all four event ranges and conservation checks support it. Replay recomputes hashes; it never calls cognition.

## Rejected alternatives

Reject raw event feeds as the return view, omniscient biography, prose-inferred causes, model-written fact summaries, “because” based solely on temporal order, hidden private beliefs on public pages, unexecuted counterfactuals, and promotional claims of consciousness/emergence.

## Reopen evidence

Reopen presentation density if fresh players cannot identify actor, intervention, three beats, and unresolved tension within five seconds; reopen causal taxonomy only if engine contracts cannot encode necessary distinctions without ambiguity. Any factual mismatch blocks Gate B.

## Remaining uncertainty

**PRODUCT HYPOTHESIS:** strict factual phrasing can still feel emotionally alive. **UNRESOLVED:** whether players prefer more mystery; mystery may hide motives, never authoritative state transitions.

## Resulting implementation behavior

Implement one Riverhold fixture, While You Were Away, manual 15–30-second replay, and one 10–20-second share layout from the same events. Biography, relationship history, world page, and SSR are contracts/deferred. Tests trace every sentence to typed evidence and prohibit unsupported causal words.

## Constraint fit

One shared projection system avoids a second content pipeline, hosted inference, and fact moderation. It fits local $0 execution and requires no training, dataset, account, server, partner, payment, or regulated data.
