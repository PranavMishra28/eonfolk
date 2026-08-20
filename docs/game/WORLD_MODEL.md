# Authoritative world model

**Purpose:** define the minimum ontology, invariants, visibility, provenance, and causal semantics that make simulation and Chronicle trustworthy.

**Status:** ACCEPTED AFTER RED TEAM

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

### Visibility policy `riverhold-visibility-v1`

Authorization is one pure total function: `canRead(viewer, purpose, record, atRevision) -> allow|deny`. Every record carries label, created revision, and the subject IDs required by its label; every projection records policy version and revision. A caller cannot supply roles or subjects not already present in canonical state/application configuration.

Viewer kinds are `public`, `citizen(citizenId)`, `participant(principalId)`, `moderator(roleId)`, and test-only `implementation(testRunId)`. Purposes are closed: `decision-context`, `semantic-ui`, `patron-view`, `chronicle-private`, `chronicle-public`, `replay-private`, `export-owner`, `moderation`, and `implementation-diagnostic`.

| Label | Required subjects | Allowed viewers/purposes at `atRevision` |
|---|---|---|
| `public` | none | Every viewer for every purpose except it grants no moderation/diagnostic role by itself. |
| `participant-private` | nonempty principal-ID set | Matching `participant` for semantic UI, patron view, private Chronicle/replay, and owner export; never a citizen DecisionContext or public Chronicle. |
| `citizen-private` | exactly one citizen ID | Matching `citizen` for DecisionContext; owner export and nonproduction diagnostics may contain it; never participant/patron/public presentation. |
| `patron-visible-through-covenant` | citizen ID plus covenant ID | Matching citizen for DecisionContext; matching participant for semantic/patron/private Chronicle/replay only while that covenant's `grantRevision <= atRevision < revokeRevision` (missing revoke means open); owner export and diagnostics. |
| `moderator-only` | moderator role set | Matching configured moderator for `moderation` only; no such viewer or record ships in V1. |
| `implementation-only` | test-run ID | Matching implementation viewer for nonproduction `implementation-diagnostic` only; production builds reject the label at ingress. |

`chronicle-public` admits only `public`. `export-owner` is a verified, explicit, spoiler-warning machine export by the local owning participant and includes all canonical records required to reproduce the world, but excludes separate moderator data and implementation-only records; it is never reused as a UI/Brain/Chronicle projection. Covenant revocation removes future patron access. A typed `ObservedRecord` copied to participant-private while the grant was active remains that participant's observation; revocation never rewrites history.

A public child event with a private parent may be projected only from its own public payload. Public/private projections omit the unreadable parent edge, ID, count, placeholder, and timing distinction; no factual Chronicle sentence may cite it until a typed public disclosure/observation event exists. Catalog generation and target enumeration run after this policy. Hidden, nonexistent, and no-longer-readable targets return the same `ACTION_UNAVAILABLE` code, public wording, payload shape, ordering behavior, and deterministic timing class; explanation and Chronicle cannot reveal which case occurred.

The fixture-owned allow/deny matrix enumerates every viewer × purpose × label row, covenant boundaries at grant/revoke revisions, private-parent/public-child cases, and the one typed disclosure that changes permission. Production code and tests consume the same table; tests may not recreate expected policy in a second implementation.

## Causal and related-event types

Each material event can name causal parents only as `direct`, `trigger`, or `contributing`. Noncausal relations live in a separate `relatedEvents` field as `temporal-predecessor` or `response-to`. Allegations are typed statement/belief content, never relation types or causal truth. Validators require every referenced event to precede the child in-region and every causal edge to name the consuming rule/mechanism. This vocabulary is canonical across simulation, Chronicle, UI, and tests.

## State authority boundaries

- Cognition proposes; it never mutates Reality.
- Application authorizes and validates against expected revision.
- Simulation applies one atomic transition and emits events/pre-post hashes.
- Persistence durably commits accepted envelopes, the head, receipt, and fencing token before Application installs/publishes the candidate; snapshots follow independently.
- Presentation reads state/events and cannot create facts.

## Rejected alternatives

Reject prose as state, untyped property bags for core rules, mutable event history, model-written memories, global omniscient citizen context, random IDs as simulation randomness, in-place canon edits, and a single “cause” field that conflates trigger/condition/allegation.

## Reopen evidence

Reopen ontology if Riverhold requires a fact that cannot be expressed without prose parsing, or invariants make deterministic replay/catch-up impractical. Do not generalize for hypothetical war, religion, markets, or regions.

## Remaining uncertainty

**UNRESOLVED:** exact belief confidence representation and snapshot cadence. **PRODUCT HYPOTHESIS:** the causal type set is sufficient for player truth. Both are fixture/test questions.

## Resulting implementation behavior

Build only types needed by eight citizens and Riverhold. Record actual eligibility, integer winning terms, and reason codes in a typed decision receipt; render a short authored justification as attributed testimony. Replay and Chronicle trace only to accepted events.

## Constraint fit

A small typed model reduces solo debugging and enables local IndexedDB now/server adapter later. It requires no hosted service, model, training set, payments, identity, partner, or regulated data.
