# Chronicle, causal truth, and replay

**Purpose:** define how authoritative events become biography, relationship history, absence return, world history, replay, public explanation, and share artifacts without overstating causality.

**Status:** ACCEPTED AFTER RED TEAM — one oracle plus counterfactual branch suite

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

## Riverhold oracle chain

All seven formats below demonstrate one accepted history. It is an oracle for sentence provenance, not an immutable product trajectory:

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

## Counterfactual branch suite

Implementation starts from one byte-identical pre-boundary snapshot and records at least three legal histories:

| Branch | Required distinct terminal state | Chronicle distinction |
|---|---|---|
| Verify privately | verified reserve belief; Toma trust preserved; no immediate public petition | advice contributed to private verification; no claim of public reform |
| Accuse now | public statement/audit; Toma trust strained; allegation remains attributed | Mara's statement triggers audit; advice is only contributing input |
| Abstain/follow plan | no patron input; trust preserved; ledger uncertainty or later shortage remains | no causal credit to player; later outcome is Mara's independent action |

Trust, values, evidence quality, and commitment perturbations must change decisions, and the equivalent fixture must transfer to one non-Mara citizen. Each branch produces its own biography delta, relationship delta, While You Were Away, three-beat replay/card, and evidence disclosure. The current `RV-001…RV-012` chain is the “verify then disclose” regression oracle only.

## Seven presentations from one chain

### Biography: Mara

“On day 18 Mara found a 12-unit mismatch between Riverhold's ledger and open bins [RV-003]. After counsel from her patron [RV-004], she chose to verify before disclosing [RV-005]. Iven's count confirmed a sealed reserve [RV-006]. Mara's public statement triggered an audit [RV-007], strained her relationship with Toma [RV-008], and helped trigger the petition threshold [RV-010]. The audit found a mill-repair reserve, not a private transfer [RV-009].”

### Relationship history: Mara ↔ Toma

“Their relationship changed from close to strained when Mara publicly alleged that Toma had sealed grain from view [RV-007, RV-008]. Toma said she treated a repair reserve as misconduct [RV-008, allegation]. The audit verified the reserve and work order but did not establish either person's moral account [RV-009].”

### While You Were Away

“Mara verified the hidden reserve with Iven [RV-006], spoke at market [RV-007], and lost Toma's trust [RV-008]. The audit found the grain still belonged to Riverhold and was reserved for mill repair [RV-009]. A petition then reached the vote threshold [RV-010]. **Unresolved:** will Mara repair the relationship before the council implements the new rule?”

### World history

“Day 18 — After a public ledger mismatch and audit [RV-003, RV-007, RV-009], Riverhold passed `public-reserve-counts` [RV-010, RV-011]. The rule first governed an allocation at the next shortage checkpoint [RV-012].”

### Primary replay/card cut — no more than 20 seconds

| Time | Visual fact | Caption and provenance |
|---|---|---|
| 0–3s | counsel plus Mara/Iven | “You advised. Mara chose to verify first.” [RV-004–RV-006] |
| 3–12s | market, distance, audit | “Her statement triggered an audit and strained Toma's trust. The grain was a public repair reserve—not proven theft.” [RV-007–RV-009] |
| 12–20s | rule notice; Mara/Toma apart | “A petition triggered the new ledger rule. The record changed; their relationship has not.” [RV-010, RV-011, RV-008] |

Those are three presentation beats with expandable event evidence. World/Chronicle marks use exactly the same five meanings: direct cause, trigger, contributing condition, temporal predecessor, and attributed allegation; `response-to` may appear in evidence detail but is not causal.

### Story Card

Headings are branch-derived. Advice branches use **YOU ADVISED**; abstention uses **NO ADVICE / YOU ABSTAINED**. The example below is the advised Riverhold oracle, not the operational abstention study card.

> YOU ADVISED: expose the shortage [RV-004]
>
> MARA CHOSE: verify, then speak [RV-005–RV-007]
>
> WHAT FOLLOWED: her statement triggered an audit; Toma's trust broke; a petition triggered the rule [RV-007, RV-008, RV-010, RV-011]
>
> UNRESOLVED: repair the friendship or enforce the precedent?
>
> EVIDENCE: expandable event references; seed/version metadata is not consumer headline

### Future public event page

If later deployment is authorized, the canonical URL shows title, exact region/time, three factual beats, current unresolved tension, versions, and expandable evidence. “Sponsor advice contributed to Mara's plan” is permitted only when an advice event exists [RV-004, RV-005]. An abstention branch must say no advice was given and name Mara's independently followed plan/outcome. “The sponsor exposed corruption” and “Mara saved Riverhold from famine” are prohibited. Allegations display speaker and belief status. V1 ships **Copy story card**, contains no dead link, and tests comprehension—not acquisition.

## Factual generation rules

Templates select only declared predicates. Names and short public justifications are escaped text. No model may write fact text, HTML, Markdown, URLs, causality, or canonical summaries. Unknown remains unknown. Coalescing may say “gathered 8 wood across four stable events” only when all four event ranges and conservation checks support it. Replay recomputes hashes; it never calls cognition.

## Rejected alternatives

Reject raw event feeds as the return view, omniscient biography, prose-inferred causes, model-written fact summaries, “because” based solely on temporal order, hidden private beliefs on public pages, unexecuted counterfactuals, and promotional claims of consciousness/emergence.

## Reopen evidence

Reopen presentation density if three of five context-free viewers cannot identify actor, independent choice, three beats, and unresolved tension within five seconds, or if they credit the sponsor as direct author of Mara's action/law. Reopen taxonomy only if engine contracts cannot encode the distinctions. Any factual mismatch blocks Gate B.

## Remaining uncertainty

**PRODUCT HYPOTHESIS:** strict factual phrasing can still feel emotionally alive. **UNRESOLVED:** whether players prefer more mystery; mystery may hide motives, never authoritative state transitions.

## Resulting implementation behavior

Implement three branch histories, While You Were Away, one manually stepable three-beat/≤20-second replay, and one responsive **Copy story card** from the accepted branch. Biography, relationship history, public page, and SSR are contracts/deferred. Tests trace every sentence and prohibit unsupported causal words.

## Constraint fit

One shared projection system avoids a second content pipeline, hosted inference, and fact moderation. It fits local $0 execution and requires no training, dataset, account, server, partner, payment, or regulated data.
