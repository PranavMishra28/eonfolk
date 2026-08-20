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

- `schemaVersion`, `engineVersion`, stable `eventId`, `regionId`, `sequence`, and integer `simulationTime`;
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
| Hash | SHA-256 per FIPS 180-4 [S-DET-002], lowercase 64-character hex, over the framed preimages below. |
| PRNG | Exact `xoshiro128**` transition below over four unsigned 32-bit words; no library substitution. |
| PRNG seeding | First 16 digest bytes of the framed PRNG seed tuple below, decoded as four little-endian words; literal all-zero replacement is fixed below. |
| Draw ownership | Stream ID is the framed tuple `(system, entityId, purpose)`, each an NFC UTF-8 string, plus a persisted unsigned-64 draw counter. Adding a cosmetic or unrelated mechanic may not consume another stream. |
| Stable IDs | Validated type prefix plus the full lowercase unpadded RFC 4648 base32 SHA-256 digest from the framed ID tuple below; never use random UUIDs in Reality. |
| Schedule order | `(simulationTime, priority, actorId, localOrdinal)` ascending, with all fields explicit and tested. |

### Canonical tuple and hash grammar

`tuple(tag, fields)` is byte concatenation of ASCII `EONFOLK-TUPLE-v1`, one zero byte, then the tag and every field as `u32be(byteLength) || bytes`. Field order and type are fixed by each schema: NFC strings are UTF-8; counters/revisions are unsigned 64-bit big-endian; counts are unsigned 32-bit big-endian; a hash/seed is its raw fixed-length bytes, never its display hex. The length prefix includes zero-length fields and is rejected above `2^32-1`; there are no implicit separators, coercions, or optional omitted fields.

- `stateHash = SHA-256(tuple("EONFOLK:STATE:v1", [JCS(canonicalRegionState)]))`.
- `payloadFingerprint = SHA-256(tuple("EONFOLK:COMMAND-PAYLOAD:v1", [JCS(typedCommandPayload)]))`; command acceptance recomputes rather than trusts it.
- `batchId = "batch_" + base32(SHA-256(tuple("EONFOLK:BATCH-ID:v1", [regionId, priorRevision, commandId])))`.
- After `batchId`, pre/post hashes, and sequence are fixed, `eventHash = SHA-256(tuple("EONFOLK:EVENT:v1", [JCS(completeEnvelopeWithoutEventHash)]))`.
- After every event hash exists, `batchHash = SHA-256(tuple("EONFOLK:BATCH-HASH:v1", [priorHeadHash, eventCount, orderedEventHashes..., payloadFingerprint, resultRevision, fencingToken]))`; it is stored only in durable head/receipt.
- `stableId = type + "_" + base32(SHA-256(tuple("EONFOLK:ID:v1", [type, worldSeed32, creationSequence])))`, where `type` matches `[a-z][a-z0-9-]{0,31}`, `worldSeed32` is exactly 32 bytes, and base32 uses alphabet `abcdefghijklmnopqrstuvwxyz234567`, full 32-byte digest, no `=` padding (52 characters).
- PRNG state digest is `SHA-256(tuple("EONFOLK:PRNG-SEED:v1", [worldSeed32, system, entityId, purpose]))`; `streamId` is exactly those three framed strings, not a joined string.
- Genesis `priorHeadHash` is `SHA-256(tuple("EONFOLK:GENESIS-HEAD:v1", []))`; every later head is the prior transition's `batchHash`.

The order is acyclic: command fields → `batchId` → complete envelopes → ordered `eventHash` values → `batchHash`/durable head. Hash boundaries never include presentation caches, wall time, IndexedDB metadata, or raw model text.

### Exact `xoshiro128**` transition

Let state be `[s0,s1,s2,s3]` unsigned 32-bit words. One draw returns `u32(imul(rotl32(u32(imul(s1,5)),7),9))`, then applies, in order: `t=u32(s1<<9)`; `s2^=s0`; `s3^=s1`; `s1^=s2`; `s0^=s3`; `s2^=t`; `s3=rotl32(s3,11)`, coercing every result to unsigned 32-bit. If decoded seed state is all zero, replace it with `[0x9e3779b9,0x243f6a88,0xb7e15162,0xdeadbeef]`. That replacement state's first six outputs are `92dcf72a,00544cb2,046d0ff3,7192e3d9,ba2b8389,12be2f0f` as eight-digit lowercase hex. Protocol tests commit tuple hex, digests, IDs, initial states, outputs, and post-draw states; Node and the supported browser must independently reproduce them.

### Independent reference vectors

These values were independently reproduced with Node `crypto` and Ruby `Digest::SHA256`; production code cannot generate its own expected values [S-DET-003]. Inputs are raw `worldSeed32 = 000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`, state 0 `{"regionId":"riverhold","revision":0,"simulationTime":0}`, state 1 with revision/time `1`, payload `{"kind":"Observe","targetId":"citizen_mara"}`, region `riverhold`, prior revision `0`, command `cmd_fixture_0001`, result revision/fence `1`, and the complete event JCS shown by decoding its preimage. Each line is `name preimageHex -> sha256`.

```text
state0 454f4e464f4c4b2d5455504c452d76310000000010454f4e464f4c4b3a53544154453a7631000000387b22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a302c2273696d756c6174696f6e54696d65223a307d -> c1978e6ff763e61ece8b938df637202517530503bc6150325b427efa5f87e872
state1 454f4e464f4c4b2d5455504c452d76310000000010454f4e464f4c4b3a53544154453a7631000000387b22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a312c2273696d756c6174696f6e54696d65223a317d -> 8bb47e167faae03a63844d3ae9dfff570c55c86151a3cf08bd8e3689343ce719
payload 454f4e464f4c4b2d5455504c452d7631000000001a454f4e464f4c4b3a434f4d4d414e442d5041594c4f41443a76310000002c7b226b696e64223a224f627365727665222c227461726765744964223a22636974697a656e5f6d617261227d -> b3e71ee858a55bf1497093f89f889edb39d9d3c5b66736908c81b2792af3fbe7
batch-id 454f4e464f4c4b2d5455504c452d76310000000013454f4e464f4c4b3a42415443482d49443a7631000000097269766572686f6c6400000008000000000000000000000010636d645f666978747572655f30303031 -> 7c12f8552849764be6e6b5a63a8c807aa1abfabd718be3750c0226176a8ad5b5
event 454f4e464f4c4b2d5455504c452d76310000000010454f4e464f4c4b3a4556454e543a7631000002527b2262617463684964223a2262617463685f70716a7071766a696a663365787a78677777746476646561706b7132783676356f6766366735696d616974626f32756b32773271222c2263617573616c506172656e7473223a5b5d2c22656e67696e6556657273696f6e223a2231222c226576656e744964223a226576656e745f666978747572655f30303031222c226576656e745061796c6f6164223a7b226b696e64223a224f62736572766564222c226f627365727665724964223a22636974697a656e5f6d617261222c227461726765744964223a226772616e617279227d2c22706f7374537461746548617368223a2238626234376531363766616165303361363338343464336165396466666635373063353563383631353161336366303862643865333638393334336365373139222c22707265537461746548617368223a2263313937386536666637363365363165636538623933386466363337323032353137353330353033626336313530333235623432376566613566383765383732222c2270726f76656e616e6365223a7b226b696e64223a2273696d756c6174696f6e227d2c22726567696f6e4964223a227269766572686f6c64222c2272656c617465644576656e7473223a5b5d2c22736368656d6156657273696f6e223a2231222c2273657175656e6365223a312c2273696d756c6174696f6e54696d65223a312c227669736962696c697479223a7b226b696e64223a22636974697a656e2d70726976617465222c227375626a656374436974697a656e4964223a22636974697a656e5f6d617261227d7d -> 8116281cdc9fde1adfe111f97242f63c6c4467d0ae7c94192a94394f04bfc217
genesis 454f4e464f4c4b2d5455504c452d76310000000017454f4e464f4c4b3a47454e455349532d484541443a7631 -> 1c47866ad1dfbdcc227e1df52b1757cb5cf81ca595636dee662bc61b73b2960b
batch-hash 454f4e464f4c4b2d5455504c452d76310000000015454f4e464f4c4b3a42415443482d484153483a7631000000201c47866ad1dfbdcc227e1df52b1757cb5cf81ca595636dee662bc61b73b2960b0000000400000001000000208116281cdc9fde1adfe111f97242f63c6c4467d0ae7c94192a94394f04bfc21700000020b3e71ee858a55bf1497093f89f889edb39d9d3c5b66736908c81b2792af3fbe7000000080000000000000001000000080000000000000001 -> 7d7e8a7bfd9c8b6a131a1ef3113f716499f14fa8ade69817b3fb2dd5d90b8fc0
prng-seed 454f4e464f4c4b2d5455504c452d76310000000014454f4e464f4c4b3a50524e472d534545443a763100000020000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f00000005737475647900000006676174652d620000000a61737369676e6d656e74 -> 3c492cf720e74b00a5a6d21b4991b73e2cd5e16ee98ddedfc94a22f122e6d7bb
stable-id 454f4e464f4c4b2d5455504c452d7631000000000d454f4e464f4c4b3a49443a763100000007636974697a656e00000020000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f000000080000000000000001 -> 713181d0aefc704b99bac26dcda834d59f9c021fc874b910aae4a5455b6e1730
```

Expected displays are `batch_pqjpqvjijf3exzxgwwtdvdeapkq2x6v5ogf6g5imaitbo2uk2w2q` and `citizen_oeyydufo7ryexgn2yjw43kbu2wpzyaq7zb2lsefk4ssukw3oc4ya`; PRNG digest decodes little-endian to `f72c493c,004be720,1bd2a6a5,3eb79149`. Golden tests use a second test-only encoder or platform hashing utility, never the production tuple/hash helper, and include former ambiguous concatenation pairs.

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
