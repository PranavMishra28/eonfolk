# Deterministic simulation and protocol

**Purpose:** lock the authoritative command/event model, byte-level determinism profile, causal vocabulary, scheduler, and catch-up behavior.

**Status:** ACCEPTED AFTER RED TEAM — implementation has not begun

**Authority boundary:** this file owns simulation semantics and wire fields. [PERSISTENCE](PERSISTENCE.md) owns durable commit order; [WORLD_MODEL](../game/WORLD_MODEL.md) owns game-state meaning; [CHRONICLE](../product/CHRONICLE.md) owns narration.

**Related documents:** [architecture](ARCHITECTURE.md), [cognition](COGNITION.md), [testing](../quality/TESTING.md), [engineering red team](../reviews/ENGINEERING_RED_TEAM.md)

## Owned decision

Reality is a pure deterministic reducer over one region. It accepts revision-checked typed commands, emits an ordered batch of complete domain events, and produces immutable candidate state. Presentation, storage, cognition, wall time, and device state cannot mutate it.

## Locked command and event contracts

`WorldCommand` contains:

- `schemaVersion`, `commandId`, and `payloadFingerprint`;
- `expectedRevision`, `principal`, and `regionId`;
- one closed discriminated-union payload; and
- an optional provenance reference that cannot grant authority.

`WorldEventEnvelope` contains:

- `schemaVersion`, `engineVersion`, `regionId`, `sequence`, and integer `simulationTime`;
- one closed typed event payload;
- `causalParents: { eventId, relation }[]`, where `relation` is only `direct`, `trigger`, or `contributing`;
- `relatedEvents: { eventId, relation }[]`, where `relation` is only `temporal-predecessor` or `response-to`;
- typed visibility and provenance;
- `preStateHash`, `postStateHash`, `eventHash`, and `batchId`. `batchId` is a stable identifier derived from region, prior revision, and command ID before hashing; it is not the batch hash.

Allegation is content of a typed `StatementMade` or `BeliefChanged` event. It is never a causal relation. A parent must precede its child in the same region; a causal parent must name the rule/mechanism that consumed it.

## Determinism profile `eonfolk-determinism-v1`

This profile is one indivisible protocol decision. Golden vectors cover every row.

| Concern | Locked rule |
|---|---|
| Time | Integer simulation seconds, `0..Number.MAX_SAFE_INTEGER`; wall time is input only to a noncanonical catch-up proposal. |
| Conserved quantities | Non-negative signed 32-bit integers; every add/subtract is checked before mutation. |
| Scores and fixed point | Signed 32-bit integers; weights use basis points (`10_000 = 1.0`); multiplication checks safe-integer bounds and division truncates toward zero. |
| Text | Reject unpaired surrogates; normalize accepted human-authored strings to Unicode NFC once at ingress; cap bytes and code points. Canonical state stores the normalized result. |
| Serialization | RFC 8785 JSON Canonicalization Scheme over the restricted integer-only domain; no `undefined`, `NaN`, infinities, duplicate keys, map/set iteration, locale sorting, or object-identity order [S-DET-001]. |
| Hash | SHA-256 per FIPS 180-4 [S-DET-002], lowercase hex, with UTF-8 domain separation such as `EONFOLK:STATE:v1\0` or `EONFOLK:EVENT:v1\0`. |
| PRNG | Versioned `xoshiro128**` using unsigned 32-bit words, `Math.imul`, and explicit rotate-left; implementation and reference vectors live in protocol tests. |
| PRNG seeding | First 16 bytes of `SHA-256("EONFOLK:PRNG:v1\0" + worldSeed + "\0" + streamId)` interpreted as four little-endian words; replace the forbidden all-zero state with the fixed vector in the golden fixture. |
| Draw ownership | Stable stream IDs per system/entity/purpose and a persisted draw counter. Adding a cosmetic or unrelated mechanic may not consume another stream. |
| Stable IDs | Deterministic prefix plus lowercase base32 of `SHA-256(type + worldSeed + creationSequence)`; never use random UUIDs in Reality. |
| Schedule order | `(simulationTime, priority, actorId, localOrdinal)` ascending, with all fields explicit and tested. |

`stateHash` hashes the complete canonical region state after an event. `eventHash` hashes the complete envelope excluding only `eventHash` itself. A separate `batchHash`, stored in the durable head and receipt rather than inside the envelope, chains the prior head hash, ordered event hashes, command fingerprint, resulting revision, and fencing token. Hash boundaries never include presentation caches, wall time, IndexedDB metadata, or raw model text.

Version `v1` supports one engine/schema version only. Unknown versions fail closed. No upcaster is implemented in the first slice; changing any rule above requires a new profile and explicit migration plan.

## Transition lifecycle

The pure kernel returns `PreparedTransition`: prior revision/hash; command/fingerprint; accepted or rejected `CommandReceipt` candidate; ordered complete event batch for acceptance; immutable post-state candidate; and expected durable head/batch hashes. It does not publish or install the candidate. [Persistence](PERSISTENCE.md) defines durability and acknowledgment. A rejected command never mutates state but still receives a durable receipt so retries are stable.

## Catch-up semantics

Catch-up advances the same scheduler and emits the same boundary events as foreground play. It never invents a second aggregate reducer.

- Up to 10 minutes: exact meaningful events; presentation may coalesce repetition.
- Up to 24 hours: algebraically aggregate stable production spans but stop at plan, resource, relationship, counsel, ownership, or shock boundaries.
- Up to 7 days: boundary-to-boundary advancement with daily and salient checkpoints.
- Up to 90 days: macro-aggregate only spans proven equivalent by property tests; interrupt for death, shortage, ownership change, plan expiry, institution change, or cross-region message.

The local product proposes an advance from elapsed wall time, explains the proposed interval, caps one interactive advance at seven days, and requires **Advance Riverhold**. No death or irreversible event happens from wall time before confirmation. Longer gaps are explicit sequential chapters; wall-clock duration is never canonical input.

## Blocking acceptance

- Golden canonical bytes, hashes, PRNG vectors, stable IDs, rounding, overflow, scheduler ties, and Unicode ingress match in browser and Node.
- Same seed/commands and snapshot plus half-open event range produce identical state and bytes.
- Three counsel intents from the same pre-boundary snapshot reach at least three materially different terminal state vectors; no branch label may converge to the same authoritative result.
- Direct/trigger/contributing edges cite actual consuming rules; temporal and response relations cannot appear as causal parents.
- 30-, 90-, and 365-day headless fixtures reach the exact requested terminal simulation time, conserve resources, stay within declared event/storage caps, and replay to the same hash. A safe early pause is failure.
- Provisional target-M4 caps are 3 seconds/25,000 events/8 MB at 30 days, 10 seconds/75,000 events/20 MB at 90 days, and 45 seconds/250,000 events/64 MB at 365 days. Measurements may tighten these; weakening requires an explicit decision and does not change the seven-day interactive cap.
- The build has no model SDK/runtime dependency, and Standard Brain makes progress with the network disabled.

## Rejected alternatives

Tick-everything loops, wall-clock authority, `Date.now()`, `Math.random()`, conserved floats, locale-dependent ordering, random IDs, prose patches, model-authored facts, one generic `cause`, temporal order as cause, and installing worker state before durable commit.

## Reopen evidence

Reopen the profile only for a demonstrated cross-runtime mismatch, unsafe integer bound, or measured horizon failure after removing nonessential event density. Reopen product catch-up if players cannot understand/consent to the explicit advance; never fix it with silent wall-clock progression.

## Resulting implementation behavior

The first code milestone implements golden vectors and crash barriers before the renderer. One fixture version ships; unsupported data fails closed. Every authoritative decision is replayable without cognition or network access.

## Constraint fit

The profile is CPU-only, provider-free, narrow enough for one builder, and prevents migration/platform work from consuming the 40–60-hour proof. It requires no training, server, account, paid service, proprietary data, or deployment.
