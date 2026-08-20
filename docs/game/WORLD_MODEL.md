# Authoritative world model

**Purpose:** define the minimum ontology, invariants, visibility, provenance, and causal semantics that make simulation and Chronicle trustworthy.

**Status:** ACCEPTED AFTER RED TEAM

**Authority boundary:** this file owns game-state meaning, not TypeScript shapes. Engineering contracts own wire/storage form; [CHRONICLE](../product/CHRONICLE.md) owns narration.

**Related documents:** [game systems](GAME_SYSTEMS.md), [agent life](AGENT_LIFE.md), [economy](ECONOMY.md), [world structure](../product/WORLD_STRUCTURE.md)

## Owned decision

Reality consists of versioned region state and ordered accepted events. Minimum entity kinds are region, place, citizen, relationship, resource stack, artifact, message/claim, observation, private knowledge, belief, bounded memory, Standing Plan, sponsor covenant, and scenario-scoped institution/rule. Stable typed IDs—not names—link them.

| Concern | Rule |
|---|---|
| Time | integer simulation units; no `Date.now()` authority |
| Quantity | non-negative integers for conserved goods; no floats |
| Randomness | explicit seed/stream in accepted transition |
| Revision | command validates expected region revision atomically |
| Sequence | one monotonic region event sequence; no gaps/duplicates after commit |
| Ownership | every conserved stack has exactly one location/owner classification |
| Life | dead citizens cannot act; death is a boundary, not slice content |
| Knowledge | a citizen acts only on their authorized observations, private knowledge, sourced beliefs, and bounded memories in `DecisionContext` |
| Provenance | observations/messages/knowledge/beliefs/memories/plans/decisions/actions cite stable source IDs, events, and visibility |
| Replay | same snapshot, ordered events, engine/schema/replay versions produce the same state hash |

## Facts, beliefs, allegations, and secrets

Reality facts are authoritative state. The other epistemic forms are distinct:

| Form | Meaning |
|---|---|
| `ObservationRecord` | what one citizen perceived through a typed observation event; it may be partial and is scoped to that observer |
| `KnowledgeRecord` | a private fact reference established for that citizen by an authorized observation/disclosure rule; the possession/visibility of the record is canonical, not public omniscience |
| `BeliefRecord` | a proposition with confidence band, source IDs, acquisition/revision events, and visibility; it may be false or conflict with another belief |
| `MemoryRecord` | a bounded retained reference to observations, knowledge, beliefs, messages, plans, or prior decisions; it cannot create new fact or authority |
| `MessageClaim` | a speaker's attributed proposition communicated to recipients; receipt may update belief but never proves the proposition |

A `BeliefChanged` or `MemoryRecorded` world event is authoritative only about the citizen's mind state, not about the proposition's truth. A private message can cause a belief but does not make its content true. A public allegation is an event containing speaker and proposition. UI, Brain context, Chronicle, and later Observatory never collapse these categories or silently promote one to another.

Visibility values at minimum are public, participant-private, citizen-private, patron-visible-through-covenant, moderator-only, and implementation-only. Moderation state is separate from canonical fact. The Standard Brain receives only the focal citizen's allowed slice.

### Visibility policy `riverhold-visibility-v1`

Authorization is one pure total function: `canRead(viewer, purpose, record, atRevision) -> allow|deny`. Deny before `record.createdRevision`. Every record carries label and exact required subjects; every projection records policy version/revision. A caller cannot supply roles/subjects outside canonical state/application configuration. A covenant carries beneficiary citizen, patron principal, inclusive `grantRevision`, and optional exclusive `revokeRevision`; it is active exactly when `grantRevision <= atRevision && (revokeRevision == null || atRevision < revokeRevision)`.

Viewer kinds are `public`, `citizen(citizenId)`, `participant(principalId)`, `moderator(roleId)`, and test-only `implementation(testRunId)`. Purposes are closed: `decision-context`, `semantic-ui`, `patron-view`, `chronicle-private`, `chronicle-public`, `replay-private`, `export-owner`, `moderation`, and `implementation-diagnostic`.

| Viewer / exact purpose | `public` | `participant-private` | `citizen-private` | `patron-visible-through-covenant` | `moderator-only` | `implementation-only` |
|---|---|---|---|---|---|---|
| `citizen(C)` / `decision-context` | allow | deny | subject is `C` | subject citizen is `C` | deny | deny |
| `participant(P)` / `semantic-ui`, `patron-view`, `chronicle-private`, `replay-private` | allow | subjects contain `P` | deny | covenant patron is `P` and active | deny | deny |
| `public` / `chronicle-public` | allow | deny | deny | deny | deny | deny |
| `participant(P)` / `export-owner` | allow iff `P` is local owner | same | same | same | deny | deny |
| `moderator(R)` / `moderation` | allow | deny | deny | deny | roles contain `R` | deny |
| `implementation(T)` / `implementation-diagnostic` in nonproduction | allow | allow | allow | allow | allow | test-run ID is `T` |

`chronicle-public` admits only `public`. `export-owner` is a verified, explicit, spoiler-warning machine export by the local owning participant and includes all canonical records required to reproduce the world, but excludes separate moderator data and implementation-only records; it is never reused as a UI/Brain/Chronicle projection. Covenant revocation removes future patron access. A typed `ObservedRecord` copied to participant-private while the grant was active remains that participant's observation; revocation never rewrites history.

A public child event with a private parent may be projected only from its own public payload. Public/private projections omit the unreadable parent edge, ID, count, withheld-evidence sentinel, and timing distinction; no factual Chronicle sentence may cite it until a typed public disclosure/observation event exists. Catalog generation and target enumeration run after this policy. Hidden, nonexistent, and no-longer-readable targets return the same `ACTION_UNAVAILABLE` code, public wording, payload shape, ordering behavior, and deterministic timing class; explanation and Chronicle cannot reveal which case occurred.

Every unlisted viewer/purpose pair denies. Commit this normative table as static test-oracle data and implement `canRead` separately; exhaustive fixtures are generated from the table, not from the production function. Fixtures cover grant/revoke boundaries, private-parent/public-child cases, and the typed disclosure that changes permission.

## Strategic freedom within Reality

The long-term rule is: **you may attempt anything expressible through Reality; Reality determines what happens.** A decision context exposes a closed, versioned catalog of typed affordances that the current world state can validate. The catalog may grow after the proof through shared primitives for cooperation, competition, exchange, deception, organization, rulemaking, conflict, treaty, and novel strategy; those outcomes are never selected by a story script or created by prose.

Typed does not mean developers pre-author each historical outcome. It means each attempted action declares inputs/effects that the authoritative rules can accept, reject, partially satisfy, or resolve into consequences. A model may propose only one offered action. Citizens never receive arbitrary code execution, filesystem, network, credential, external-system, or unbounded tool authority in the name of autonomy.

## Causal and related-event types

Each material event can name causal parents only as `direct`, `trigger`, or `contributing`. Noncausal relations live in a separate `relatedEvents` field as `temporal-predecessor` or `response-to`. Allegations are typed statement/belief content, never relation types or causal truth. Validators require every referenced event to precede the child in-region and every causal edge to name the consuming rule/mechanism. This vocabulary is canonical across simulation, Chronicle, UI, and tests.

## State authority boundaries

- Cognition proposes; it never mutates Reality.
- Application authorizes and validates against expected revision.
- Simulation applies one atomic transition and emits events/pre-post hashes.
- Persistence durably commits accepted envelopes, the head, receipt, fencing token, and any consequential-decision record before Application installs/publishes the candidate; snapshots follow independently.
- Presentation reads state/events and cannot create facts.

## Rejected alternatives

Reject prose as state, untyped property bags for core rules, mutable event history, model-written or unprovenanceable memories, global omniscient citizen context, communication-as-truth, random IDs as simulation randomness, in-place canon edits, arbitrary code/network/tool authority, scripted long-term outcomes, and a single “cause” field that conflates trigger/condition/allegation.

## Reopen evidence

Reopen ontology if Riverhold requires a fact that cannot be expressed without prose parsing, epistemic categories leak into one another, or invariants make deterministic replay/catch-up impractical. Preserve generic composition seams, but do not implement types or mechanics solely for hypothetical war, religion, markets, institutions, or regions before the product gates.

## Remaining uncertainty

**UNRESOLVED:** exact belief confidence representation and snapshot cadence. **PRODUCT HYPOTHESIS:** the causal type set is sufficient for player truth. Both are fixture/test questions.

## Resulting implementation behavior

Build only concrete mechanics needed by eight citizens and Riverhold. Keep observations, private knowledge, beliefs, memories, messages, and world facts as separate typed records even where the fixture is small. Record actual eligibility, integer winning terms, and reason codes in a bounded cognitive decision record; render a short authored justification as attributed testimony. Replay and Chronicle facts trace only to accepted events, with decision records as non-factual provenance.

## Constraint fit

A small typed model reduces solo debugging and enables local IndexedDB now/server adapter later. It requires no hosted service, model, training set, payments, identity, partner, or regulated data.
