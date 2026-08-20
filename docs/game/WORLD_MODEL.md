# Authoritative world model

**Purpose:** define the minimum ontology, invariants, visibility, provenance, and causal semantics that make simulation and Chronicle trustworthy.

**Status:** DECISION PROPOSED

**Authority boundary:** this file owns game-state meaning, not TypeScript shapes. Engineering contracts own wire/storage form; [CHRONICLE](../product/CHRONICLE.md) owns narration.

**Related documents:** [game systems](GAME_SYSTEMS.md), [agent life](AGENT_LIFE.md), [economy](ECONOMY.md), [world structure](../product/WORLD_STRUCTURE.md)

## Owned decision

Reality consists of versioned region state and ordered accepted events. Minimum entity kinds are region, place, citizen, relationship, resource stack, artifact, message, belief, Standing Plan, sponsor covenant, and scenario-scoped institution/rule. Stable typed IDs—not names—link them.

| Concern | Rule |
|---|---|
| Time | integer simulation units; no `Date.now()` authority |
| Quantity | non-negative integers for conserved goods; no floats |
| Randomness | explicit seed/stream in accepted transition |
| Revision | command validates expected region revision atomically |
| Sequence | one monotonic region event sequence; no gaps/duplicates after commit |
| Ownership | every conserved stack has exactly one location/owner classification |
| Life | dead citizens cannot act; death is a boundary, not slice content |
| Knowledge | a citizen acts only on visible facts and sourced beliefs in `DecisionContext` |
| Provenance | observations/messages/beliefs/actions cite source events and visibility |
| Replay | same snapshot, ordered events, engine/schema/replay versions produce the same state hash |

## Facts, beliefs, allegations, and secrets

Reality facts are authoritative state. A belief records proposition, confidence band, source, acquisition event, last revision, and visibility; it may be false. A private message can cause a belief but does not make its content true. A public allegation is an event containing speaker and proposition. UI and Chronicle never collapse these categories.

Visibility values at minimum are public, participant-private, citizen-private, patron-visible-through-covenant, moderator-only, and implementation-only. Moderation state is separate from canonical fact. The Standard Brain receives only the focal citizen's allowed slice.

## Causal parent types

Each material event can name typed parents: `direct`, `trigger`, `contributing`, and `response-to`. `temporal predecessor` is presentation metadata, not a stored causal assertion unless useful. Allegation references are beliefs/messages, not causal truth. Validators ensure referenced parents precede the event in-region and are visible for the asserted mechanism.

## State authority boundaries

- Cognition proposes; it never mutates Reality.
- Application authorizes and validates against expected revision.
- Simulation applies one atomic transition and emits events/pre-post hashes.
- Persistence appends accepted envelopes then snapshots at policy boundaries.
- Presentation reads state/events and cannot create facts.

## Rejected alternatives

Reject prose as state, untyped property bags for core rules, mutable event history, model-written memories, global omniscient citizen context, random IDs as simulation randomness, in-place canon edits, and a single “cause” field that conflates trigger/condition/allegation.

## Reopen evidence

Reopen ontology if Riverhold requires a fact that cannot be expressed without prose parsing, or invariants make deterministic replay/catch-up impractical. Do not generalize for hypothetical war, religion, markets, or regions.

## Remaining uncertainty

**UNRESOLVED:** exact belief confidence representation and snapshot cadence. **PRODUCT HYPOTHESIS:** the causal type set is sufficient for player truth. Both are fixture/test questions.

## Resulting implementation behavior

Build only types needed by eight citizens and Riverhold. Record eligibility and winning factors for Standard Brain actions, but expose short public justification rather than hidden scoring detail. Replay and Chronicle trace back to accepted events.

## Constraint fit

A small typed model reduces solo debugging and enables local IndexedDB now/server adapter later. It requires no hosted service, model, training set, payments, identity, partner, or regulated data.
