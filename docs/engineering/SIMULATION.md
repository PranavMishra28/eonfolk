# Simulation

**Purpose:** define authoritative commands/events, deterministic execution, scheduling, causality, and absence advancement.

**Status:** ACCEPTED CONTRACT FOR THE FIRST SLICE

**Authority boundary:** owns Reality mutation, deterministic ordering, canonical hashing, command/event fields, scheduler semantics, and time advancement. Storage atomicity is owned by [persistence](PERSISTENCE.md); Mind and proposals are owned by [cognition](COGNITION.md).

**Related documents:** [architecture](ARCHITECTURE.md), [persistence](PERSISTENCE.md), [cognition](COGNITION.md), [testing](../quality/TESTING.md), [systems evidence](../research/SYSTEMS_RESEARCH.md)

## Owned decision

Implement a pure deterministic discrete-event simulation. The reducer is the only writer of Reality. Routine stable intervals are integrated exactly with integer or documented fixed-point arithmetic; meaningful boundaries are scheduled explicitly. Foreground play and catch-up use the same semantic algorithm.

## `WorldCommand`

Every command contains:

| Field | Required meaning |
|---|---|
| `commandId` | globally unique idempotency ID supplied by the principal/application |
| `expectedRevision` | exact canonical region revision the principal observed |
| `principal` | typed identity and authority class initiating the command |
| `regionId` | target region, present even in the one-region slice |
| `payload` | one member of a closed, versioned discriminated union |

Application metadata may include received time or UI correlation outside the canonical command. No payload contains code, SQL, HTML, URLs, generic JSON patches, or arbitrary nested actions. Duplicate `commandId` returns the recorded result; stale revision or invalid authority rejects atomically with no event, partial mutation, or PRNG draw.

## `WorldEventEnvelope`

Every canonical event contains:

| Field | Required meaning |
|---|---|
| `eventId` | stable identifier derived without nondeterministic runtime state |
| `regionId`, `regionSequence` | region identity and gapless ordered sequence |
| `simulationTime` | integer domain time |
| `engineVersion`, `schemaVersion` | determinism/engine and envelope/payload schema ownership |
| `payload` | one member of a closed, versioned event union |
| `causalParents` | typed edges to prior event IDs: `direct-cause`, `trigger`, `contributing-condition`, or `temporal-predecessor` |
| `visibility` | typed factual visibility policy, separate from moderation/presentation |
| `provenance` | command, scheduled boundary, Standard Brain proposal, validated optional adapter, or migration origin plus stable reference |
| `preStateHash`, `postStateHash` | canonical hashes around the applied event/batch boundary |

An in-world allegation is event content such as `StatementMade`, never a `causalParents` truth. Chronicle copy may not upgrade temporal order or allegation into causality.

## Determinism rules

- Simulation time is an integer value; `Date.now()` is forbidden in Reality.
- Conserved quantities use integers or documented fixed-point units; unconstrained floats are forbidden.
- One seeded, versioned PRNG is split into stable streams or draws with stable ownership. `Math.random()` is forbidden.
- Equal-time work sorts by `(simulationTime, priority, insertionSequence)`; the persisted insertion sequence is monotonic.
- Locale-dependent sort/format, random UUID generation, renderer timing, and unordered map/set serialization are excluded.
- Canonical serialization sorts keys and includes Reality, scheduler, PRNG state, engine/schema versions, and last sequence; it excludes projections and prose.
- Rejected input consumes no state, sequence, scheduled item, or random draw.
- Replay never calls a Brain or provider; it applies recorded accepted facts.

The scheduler uses a binary heap in memory and a normalized queue in snapshots. Each item names its due time, priority, insertion sequence, type, subject, payload, and stable cancellation ID. Repeating behavior schedules its next meaningful boundary only.

## Catch-up semantics

Gap duration changes yielding and presentation, never authoritative rules:

| Gap | Required advancement |
|---|---|
| 10 minutes | exact meaningful events; coalesce only presentation |
| 24 hours | aggregate stable production/consumption intervals but stop at every boundary and shock |
| 7 days | boundary-to-boundary advancement with daily and salient verified checkpoints; yield to the UI |
| 90 days | macro-aggregate stable spans; interrupt for death, shortage, ownership change, plan expiry, cross-region message, or any other declared discontinuity |

The local slice must expose progress and permit cancellation/resume at committed boundaries for long gaps. If an event or wall-time safety budget is reached, stop safely and continue later. Never drop events, invent history, or switch to a gap-specific approximation. Tests also cover 30-, 90-, and 365-day worlds to detect growth and conservation failure.

## Disposable simulation-spike evidence

**DIRECTIONAL LOCAL EVIDENCE:** scratch commit `cd5eea0` exercised a toy scheduler, canonical hashes, causality references, repeated runs, and replay:

| Horizon | Events | Tick loop | Discrete | Equivalence | Final hash prefix |
|---|---:|---:|---:|---|---|
| 24 hours | 195 | 17.154 ms | 4.682 ms | tick=discrete, repeated run, and replay identical | `4d302c7c075e` |
| 7 days | 1,344 | 27.899 ms | 10.382 ms | tick=discrete, repeated run, and replay identical | `56b925223fef` |

187/195 and 1,336/1,344 events respectively carried causal parents; initial seed/root events intentionally did not. This proves only that the proposed invariants are implementable in a toy model. It does not establish production event density, 90/365-day performance, correctness of game mechanics, browser responsiveness, or Chronicle truth.

## Blocking kernel acceptance

- Same seed and command sequence yield byte-equivalent canonical serialization and hashes.
- Replay from genesis and every snapshot converges to the same head.
- One-shot and arbitrarily chunked catch-up converge.
- Idempotent duplicates and stale revisions cannot double-apply or partially mutate.
- Equal-time ordering is stable.
- Resource, ownership, life-state, visibility, and authorization invariants survive property/model-based tests and bounded fuzzing.
- 30-, 90-, and 365-day scenarios conserve resources and complete or pause at a declared boundary.
- Removing every optional model/provider leaves the world progressing.

## Resulting implementation behavior

Eight citizens act from scheduled boundaries rather than empty ticks. Two citizens can exchange or interact through typed commands/events. Every visible consequence can identify authoritative event references. UI animation may smooth movement but cannot alter the final position or time. Leave/return uses the same reducer as foreground play.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Fixed minute/frame tick | Empty work, worse catch-up, and presentation-time coupling |
| Floating-point conserved economy | Cross-runtime drift and hard-to-audit conservation |
| Generic JSON patch events | No domain authorization, schema clarity, or causal meaning |
| Direct Brain/model mutation | Breaks validation, replay, and hidden-fact boundaries |
| Separate approximate offline simulator | Gap-length-dependent history and replay divergence |
| Generalized economy in Gate A | Too much surface for three resources, one exchange, and one recipe |

## Unproven assumptions and reopen evidence

- **UNRESOLVED:** exact piecewise integration remains tractable as relationships and exchange interact. Reopen mechanics if stable spans cannot be split at explicit boundaries.
- **UNRESOLVED:** event volume remains bounded over 365 days. Reopen snapshot cadence or mechanics if measured growth violates storage/wait budgets.
- **PRODUCT HYPOTHESIS:** scheduled plans look intentional rather than sparse or robotic. Reopen behavior families after observer evidence, not by adding calls.
- **UNRESOLVED:** canonical serialization is cross-browser stable. Reopen implementation details if the pinned browser matrix disagrees.

## Constraint fit

The kernel is CPU-only, local, provider-free, and small enough for one builder. The toy spike supports feasibility but cannot expand scope. Three resources, four behavior families, one exchange, and one recipe define the first slice. No training, infrastructure, credentials, or spend is required.
