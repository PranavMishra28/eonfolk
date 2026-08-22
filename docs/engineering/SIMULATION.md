# Deterministic simulation and protocol

**Purpose:** lock the authoritative command/event model, byte-level determinism profile, causal vocabulary, scheduler, and catch-up behavior.

**Status:** IMPLEMENTED CANDIDATE — clean release lattice pending

**Authority boundary:** this file owns simulation semantics and wire fields. [PERSISTENCE](PERSISTENCE.md) owns durable commit order; [WORLD_MODEL](../game/WORLD_MODEL.md) owns game-state meaning; [CHRONICLE](../product/CHRONICLE.md) owns narration.

**Related documents:** [architecture](ARCHITECTURE.md), [cognition](COGNITION.md), [testing](../quality/TESTING.md), [engineering red team](../reviews/ENGINEERING_RED_TEAM.md)

## Owned decision

Reality is a pure deterministic reducer over one run-scoped region. It accepts revision-checked typed commands, emits an ordered batch of complete domain events plus a canonical batch header, and produces immutable candidate state. Presentation, storage, cognition, wall time, fencing, and device state cannot mutate it.

## Locked command and event contracts

`WorldCommand` contains:

- `schemaVersion`, `commandId`, and `payloadFingerprint`;
- `expectedRevision`, `principal`, `runId`, and `regionId`;
- one closed discriminated-union payload; and
- an optional provenance reference that cannot grant authority.

`WorldEventEnvelope` contains:

- `schemaVersion`, `engineVersion`, stable run-scoped `eventId`, `runId`, `regionId`, `sequence`, and integer `simulationTime`;
- one closed typed event payload;
- `causalParents: { eventId, relation, mechanismId }[]`, where `relation` is only `direct`, `trigger`, or `contributing`, and `mechanismId` names the versioned consuming rule;
- `relatedEvents: { eventId, relation }[]`, where `relation` is only `temporal-predecessor` or `response-to`;
- typed visibility and provenance, including the originating `commandId`, optional executed `interventionId`, and optional preallocated `decisionId`/`proposalId` for cognition-originated actions;
- `preStateHash`, `postStateHash`, `eventHash`, and `batchId`. `batchId` is a stable identifier derived from run, region, prior revision, and command ID before hashing; it is not the batch hash.

Allegation is content of a typed `StatementMade` or `BeliefChanged` event. It is never a causal relation. A parent must precede its child in the same run and region; every causal edge carries the exact rule/mechanism that consumed it. Event and causal-parent IDs are unique only inside their enclosing `runId`; comparisons across runs use an explicit `(runId,eventId)` pair outside canonical causality.

The world event proves only that a typed transition occurred. Its optional `decisionId` links to noncanonical cognitive provenance; it does not make the linked belief, memory, justification, or proposal true. Every consequential accepted proposal has one preallocated decision ID, one durable command receipt, and an accepted event interval. Downstream history traces through event-to-event causal parents, never by mutating the earlier decision record.

## Spatial authority and semantic movement

Reality owns places, symmetric per-edge integer travel durations, authored affordance capacity, task reservations, current task pointers, semantic travel, and carried inventory. `TravelStarted` releases any occupied task, retains the citizen's origin `placeId`, and records origin, destination, route ID, departure, deterministic expected arrival, and typed task. Only `TravelArrived` changes `placeId`; camera time and presentation interpolation cannot arrive early. An ordinary traveller cannot simultaneously occupy a task slot, and a task reservation cannot displace a different participant.

The opening world has five inhabitants in four bounded Reality-owned task reservations: Mara at the market ledger, Toma and Iven in ordered bilateral exchange slots, Odo at mill repair, and Els at the granary ledger. Sela, Rowan, and Neri are authoritative genesis travellers from market→spring, mill→woods, and granary→fields. Their travel is part of the genesis snapshot, not invented renderer traffic. Presentation may interpolate feet along the authored graph and stop one metre short while an arrival remains uncommitted; it cannot emit canonical footsteps or use visibility/camera state as simulation input.

A coarse `Advance` processes an overdue arrival at the first deterministic simulation boundary at or after its due time. It does not subdivide a long catch-up command at every travel deadline. This bounded behavior is explicit and tested; reopen scheduling only if a product gate requires exact within-command arrival chronology rather than the current boundary semantics.

## Determinism profile `eonfolk-determinism-v2`

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

`tuple(tag, fields)` is byte concatenation of ASCII `EONFOLK-TUPLE-v2`, one zero byte, then the tag and every field as `u32be(byteLength) || bytes`. Field order and type are fixed by each schema: NFC strings are UTF-8; counters/revisions are unsigned 64-bit big-endian; counts are unsigned 32-bit big-endian; a hash/seed is its raw fixed-length bytes, never its display hex. The length prefix includes zero-length fields and is rejected above `2^32-1`; there are no implicit separators, coercions, or optional omitted fields.

- `stateHash = SHA-256(tuple("EONFOLK:STATE:v2", [JCS(canonicalRunRegionState)]))`; the canonical state includes `runId` and `regionId`.
- `payloadFingerprint = SHA-256(tuple("EONFOLK:COMMAND-PAYLOAD:v2", [JCS(typedCommandPayload)]))`; command acceptance recomputes rather than trusts it.
- `batchId = "batch_" + base32(SHA-256(tuple("EONFOLK:BATCH-ID:v2", [runId, regionId, priorRevision, commandId])))`.
- After `batchId`, pre/post hashes, and sequence are fixed, `eventHash = SHA-256(tuple("EONFOLK:EVENT:v2", [JCS(completeEnvelopeWithoutEventHash)]))`.
- After every event hash exists, `batchHash = SHA-256(tuple("EONFOLK:BATCH-HASH:v2", [runId, regionId, batchId, priorWorldHeadHash, firstSequence, eventCount, orderedEventHashes..., payloadFingerprint, resultRevision, finalStateHash]))`. Fencing never enters it.
- `manifestHash = SHA-256(tuple("EONFOLK:EXPERIMENT-MANIFEST:v1", [JCS(manifestWithoutManifestHash)]))`.
- `contextHash`, `catalogHash`, `proposalHash`, and `decisionRecordHash` use the analogous domains `EONFOLK:DECISION-CONTEXT:v1`, `EONFOLK:ACTION-CATALOG:v1`, `EONFOLK:INTENT-PROPOSAL:v1`, and `EONFOLK:DECISION-RECORD:v1`, each over one JCS field containing the complete typed object without its own hash field. The exact proposal canonical bytes are stored beside `proposalHash`.
- `stableId = type + "_" + base32(SHA-256(tuple("EONFOLK:ID:v2", [type, worldSeed32, creationSequence])))`, where `type` matches `[a-z][a-z0-9-]{0,31}`, `worldSeed32` is exactly 32 bytes, and base32 uses alphabet `abcdefghijklmnopqrstuvwxyz234567`, full 32-byte digest, no `=` padding (52 characters). IDs are interpreted inside their enclosing run. `creationSequence` is one global per-run canonical counter; a transition creating several entities assigns consecutive values in typed payload order, never one shared boundary value.
- PRNG state digest is `SHA-256(tuple("EONFOLK:PRNG-SEED:v2", [worldSeed32, system, entityId, purpose]))`; `streamId` is exactly those three framed strings, not a joined string.
- Genesis `priorWorldHeadHash` is `SHA-256(tuple("EONFOLK:GENESIS-HEAD:v2", [runId, regionId, manifestHash, initialStateHash]))`; every later world head is the prior transition's `batchHash`.

Each accepted command also stores one `WorldBatchHeader`: schema/run/region/batch IDs, prior world-head hash, first sequence/count, ordered event hashes, payload fingerprint, result revision, final state hash, and batch hash. Headers plus events are the replayable Canonical World Ledger; receipts duplicate references for idempotency but are not the only hash-chain source. The order is acyclic: preallocated decision/proposal/command IDs → command fields → `batchId` → complete envelopes → ordered `eventHash` values → batch header/hash/world head → finalized cognitive record references. Fencing remains persistence CAS metadata only. Hash boundaries never include presentation caches, wall time, IndexedDB metadata, hidden reasoning, or raw model text outside the preserved bounded structured proposal.

### Exact `xoshiro128**` transition

Let state be `[s0,s1,s2,s3]` unsigned 32-bit words. One draw returns `u32(imul(rotl32(u32(imul(s1,5)),7),9))`, then applies, in order: `t=u32(s1<<9)`; `s2^=s0`; `s3^=s1`; `s1^=s2`; `s0^=s3`; `s2^=t`; `s3=rotl32(s3,11)`, coercing every result to unsigned 32-bit. If decoded seed state is all zero, replace it with `[0x9e3779b9,0x243f6a88,0xb7e15162,0xdeadbeef]`. That replacement state's first six outputs are `92dcf72a,00544cb2,046d0ff3,7192e3d9,ba2b8389,12be2f0f` as eight-digit lowercase hex. Protocol tests commit tuple hex, digests, IDs, initial states, outputs, and post-draw states; Node and the supported browser must independently reproduce them.

### Independent reference vectors

These values were independently reproduced with Node `crypto` and Ruby `Digest::SHA256`; production code cannot generate its own expected values [S-DET-003]. Inputs are raw `worldSeed32 = 000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`, run `run_fixture_0001`, region `riverhold`, state 0 `{"regionId":"riverhold","revision":0,"runId":"run_fixture_0001","simulationTime":0}`, state 1 with revision/time `1`, payload `{"kind":"Observe","targetId":"citizen_mara"}`, prior revision `0`, command `cmd_fixture_0001`, result revision `1`, and a synthetic all-zero raw manifest hash used only by the genesis framing fixture. The complete event JCS is shown by decoding its preimage. Each line is `name preimageHex -> sha256`.

```text
state0 454f4e464f4c4b2d5455504c452d76320000000010454f4e464f4c4b3a53544154453a7632000000537b22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a302c2272756e4964223a2272756e5f666978747572655f30303031222c2273696d756c6174696f6e54696d65223a307d -> ee03923beee017d3f6bbaecb8c26fb1b90be065089e34d14f406ebba452003ab
state1 454f4e464f4c4b2d5455504c452d76320000000010454f4e464f4c4b3a53544154453a7632000000537b22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a312c2272756e4964223a2272756e5f666978747572655f30303031222c2273696d756c6174696f6e54696d65223a317d -> 38b5b59666b80577f37be07fd2742050813e0c643e83889fb1e40b7e7fb2e116
payload 454f4e464f4c4b2d5455504c452d7632000000001a454f4e464f4c4b3a434f4d4d414e442d5041594c4f41443a76320000002c7b226b696e64223a224f627365727665222c227461726765744964223a22636974697a656e5f6d617261227d -> 29326f0ed2d90ae5c25db9db6d19f41075ab16958d745c2ffb314325c367b8df
batch-id 454f4e464f4c4b2d5455504c452d76320000000013454f4e464f4c4b3a42415443482d49443a76320000001072756e5f666978747572655f30303031000000097269766572686f6c6400000008000000000000000000000010636d645f666978747572655f30303031 -> 5e571c2da097f92be53f8b63870f4bda754d56daa0140c875440c86f444113a0
event 454f4e464f4c4b2d5455504c452d76320000000010454f4e464f4c4b3a4556454e543a76320000028c7b2262617463684964223a2262617463685f6c7a6c72796c6e6173373473787a6a37726e72796f64326c336a32753276773275616b617a6232756964656736726362636f7161222c2263617573616c506172656e7473223a5b5d2c22656e67696e6556657273696f6e223a2231222c226576656e744964223a226576656e745f666978747572655f30303031222c226576656e745061796c6f6164223a7b226b696e64223a224f62736572766564222c226f627365727665724964223a22636974697a656e5f6d617261222c227461726765744964223a226772616e617279227d2c22706f7374537461746548617368223a2233386235623539363636623830353737663337626530376664323734323035303831336530633634336538333838396662316534306237653766623265313136222c22707265537461746548617368223a2265653033393233626565653031376433663662626165636238633236666231623930626530363530383965333464313466343036656262613435323030336162222c2270726f76656e616e6365223a7b22636f6d6d616e644964223a22636d645f666978747572655f30303031222c226b696e64223a2273696d756c6174696f6e227d2c22726567696f6e4964223a227269766572686f6c64222c2272656c617465644576656e7473223a5b5d2c2272756e4964223a2272756e5f666978747572655f30303031222c22736368656d6156657273696f6e223a2231222c2273657175656e6365223a312c2273696d756c6174696f6e54696d65223a312c227669736962696c697479223a7b226b696e64223a22636974697a656e2d70726976617465222c227375626a656374436974697a656e4964223a22636974697a656e5f6d617261227d7d -> bd40401273fbead505fd09acfd56d36cc2ddd97b35383c67b5c2cbe1b62fe9fd
genesis 454f4e464f4c4b2d5455504c452d76320000000017454f4e464f4c4b3a47454e455349532d484541443a76320000001072756e5f666978747572655f30303031000000097269766572686f6c6400000020000000000000000000000000000000000000000000000000000000000000000000000020ee03923beee017d3f6bbaecb8c26fb1b90be065089e34d14f406ebba452003ab -> 01b9357332a4012f244688f1a6d2cb5d1ee7b791ff01eb4326c0d6dce496b982
batch-hash 454f4e464f4c4b2d5455504c452d76320000000015454f4e464f4c4b3a42415443482d484153483a76320000001072756e5f666978747572655f30303031000000097269766572686f6c640000003a62617463685f6c7a6c72796c6e6173373473787a6a37726e72796f64326c336a32753276773275616b617a6232756964656736726362636f71610000002001b9357332a4012f244688f1a6d2cb5d1ee7b791ff01eb4326c0d6dce496b982000000080000000000000001000000040000000100000020bd40401273fbead505fd09acfd56d36cc2ddd97b35383c67b5c2cbe1b62fe9fd0000002029326f0ed2d90ae5c25db9db6d19f41075ab16958d745c2ffb314325c367b8df0000000800000000000000010000002038b5b59666b80577f37be07fd2742050813e0c643e83889fb1e40b7e7fb2e116 -> c9112b43d170cbf1c9d0a0ded5053c10889dbf160ec95110a70fbaaa11a8183a
prng-seed 454f4e464f4c4b2d5455504c452d76320000000014454f4e464f4c4b3a50524e472d534545443a763200000020000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f00000005737475647900000006676174652d620000000a61737369676e6d656e74 -> 0bed568abf8c04ba1b963bcaaaee97ef6f2ef58619f0d27864319cb7308e6582
stable-id 454f4e464f4c4b2d5455504c452d7632000000000d454f4e464f4c4b3a49443a763200000007636974697a656e00000020000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f000000080000000000000001 -> 672b0e7acc32f7e81a11238076c4d6c3c392a0d17df5638d9f05531690c26ada
```

Expected displays are `batch_lzlrylnas74sxzj7rnryod2l3j2u2vw2uakazb2uideg6rcbcoqa` and `citizen_m4vq46wmgl36qgqreoahnrgwypbzfigrpx2whdm7avjrnegcnlna`; PRNG digest decodes little-endian to `8a56ed0b,ba048cbf,ca3b961b,ef97eeaa`. The event fixture's provenance is exactly `{"commandId":"cmd_fixture_0001","kind":"simulation"}`. Golden tests use a second test-only encoder or platform hashing utility, never the production tuple/hash helper, and include former ambiguous concatenation pairs plus every new manifest/context/catalog/proposal/decision-record domain.

### Normative two-event revision vector

This is an alternative isolated fixture and never coexists with the single-event fixture. It reuses the run, region, command, payload fingerprint, batch ID, and genesis head above only to expose the revision difference. Its intermediate state is `{"fixtureStep":1,"regionId":"riverhold","revision":0,"runId":"run_fixture_0001","simulationTime":1}`; its final state changes `fixtureStep` to 2, revision to 1, and time to 2. Event 1 is `Observed`; event 2 is `MemoryRecorded` with a direct `riverhold-observation-memory-v1` parent. The intermediate post-state retains prior revision 0, and only event 2's post-state uses result revision 1.

```text
multi-state-mid 454f4e464f4c4b2d5455504c452d76320000000010454f4e464f4c4b3a53544154453a7632000000637b226669787475726553746570223a312c22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a302c2272756e4964223a2272756e5f666978747572655f30303031222c2273696d756c6174696f6e54696d65223a317d -> 992deec3b34ae2da329c01430436bb7a6b5594d316cc23fd11b2aea0c1ad731a
multi-state-final 454f4e464f4c4b2d5455504c452d76320000000010454f4e464f4c4b3a53544154453a7632000000637b226669787475726553746570223a322c22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a312c2272756e4964223a2272756e5f666978747572655f30303031222c2273696d756c6174696f6e54696d65223a327d -> faff6c74ee61e133f690113b8b1b65efb34b438a95767dc30e870028abd615ef
multi-event-1 454f4e464f4c4b2d5455504c452d76320000000010454f4e464f4c4b3a4556454e543a76320000028c7b2262617463684964223a2262617463685f6c7a6c72796c6e6173373473787a6a37726e72796f64326c336a32753276773275616b617a6232756964656736726362636f7161222c2263617573616c506172656e7473223a5b5d2c22656e67696e6556657273696f6e223a2231222c226576656e744964223a226576656e745f666978747572655f30303031222c226576656e745061796c6f6164223a7b226b696e64223a224f62736572766564222c226f627365727665724964223a22636974697a656e5f6d617261222c227461726765744964223a226772616e617279227d2c22706f7374537461746548617368223a2239393264656563336233346165326461333239633031343330343336626237613662353539346433313663633233666431316232616561306331616437333161222c22707265537461746548617368223a2265653033393233626565653031376433663662626165636238633236666231623930626530363530383965333464313466343036656262613435323030336162222c2270726f76656e616e6365223a7b22636f6d6d616e644964223a22636d645f666978747572655f30303031222c226b696e64223a2273696d756c6174696f6e227d2c22726567696f6e4964223a227269766572686f6c64222c2272656c617465644576656e7473223a5b5d2c2272756e4964223a2272756e5f666978747572655f30303031222c22736368656d6156657273696f6e223a2231222c2273657175656e6365223a312c2273696d756c6174696f6e54696d65223a312c227669736962696c697479223a7b226b696e64223a22636974697a656e2d70726976617465222c227375626a656374436974697a656e4964223a22636974697a656e5f6d617261227d7d -> 6a274c731783285e14576af8f84ff7f5bc7da07b1bbcd90ac1a0ee84113dfd2d
multi-event-2 454f4e464f4c4b2d5455504c452d76320000000010454f4e464f4c4b3a4556454e543a7632000003057b2262617463684964223a2262617463685f6c7a6c72796c6e6173373473787a6a37726e72796f64326c336a32753276773275616b617a6232756964656736726362636f7161222c2263617573616c506172656e7473223a5b7b226576656e744964223a226576656e745f666978747572655f30303031222c226d656368616e69736d4964223a227269766572686f6c642d6f62736572766174696f6e2d6d656d6f72792d7631222c2272656c6174696f6e223a22646972656374227d5d2c22656e67696e6556657273696f6e223a2231222c226576656e744964223a226576656e745f666978747572655f30303032222c226576656e745061796c6f6164223a7b22636974697a656e4964223a22636974697a656e5f6d617261222c226b696e64223a224d656d6f72795265636f72646564222c22736f757263654576656e744964223a226576656e745f666978747572655f30303031227d2c22706f7374537461746548617368223a2266616666366337346565363165313333663639303131336238623162363565666233346234333861393537363764633330653837303032386162643631356566222c22707265537461746548617368223a2239393264656563336233346165326461333239633031343330343336626237613662353539346433313663633233666431316232616561306331616437333161222c2270726f76656e616e6365223a7b22636f6d6d616e644964223a22636d645f666978747572655f30303031222c226b696e64223a2273696d756c6174696f6e227d2c22726567696f6e4964223a227269766572686f6c64222c2272656c617465644576656e7473223a5b5d2c2272756e4964223a2272756e5f666978747572655f30303031222c22736368656d6156657273696f6e223a2231222c2273657175656e6365223a322c2273696d756c6174696f6e54696d65223a322c227669736962696c697479223a7b226b696e64223a22636974697a656e2d70726976617465222c227375626a656374436974697a656e4964223a22636974697a656e5f6d617261227d7d -> a073cf49d9e6d2b00dc98bffeb4451893a07a41be07beea15c99f07c5439db4f
multi-batch-hash 454f4e464f4c4b2d5455504c452d76320000000015454f4e464f4c4b3a42415443482d484153483a76320000001072756e5f666978747572655f30303031000000097269766572686f6c640000003a62617463685f6c7a6c72796c6e6173373473787a6a37726e72796f64326c336a32753276773275616b617a6232756964656736726362636f71610000002001b9357332a4012f244688f1a6d2cb5d1ee7b791ff01eb4326c0d6dce496b9820000000800000000000000010000000400000002000000206a274c731783285e14576af8f84ff7f5bc7da07b1bbcd90ac1a0ee84113dfd2d00000020a073cf49d9e6d2b00dc98bffeb4451893a07a41be07beea15c99f07c5439db4f0000002029326f0ed2d90ae5c25db9db6d19f41075ab16958d745c2ffb314325c367b8df00000008000000000000000100000020faff6c74ee61e133f690113b8b1b65efb34b438a95767dc30e870028abd615ef -> 3f4643c2998138ce69539e723ca82c1756685b6223021d26159f191e46d36458
```

The first slice supports one engine/schema version only under determinism profile `eonfolk-determinism-v2`. Unknown versions fail closed. No upcaster is implemented; changing any rule above requires a new profile and explicit migration plan.

## Transition lifecycle

The pure kernel returns `PreparedTransition`: run/region; prior revision/state/world-head hashes; command/fingerprint; accepted or rejected `CommandReceipt` candidate; ordered complete event batch and `WorldBatchHeader` for acceptance; immutable post-state candidate; and expected durable state/world-head hashes. It does not publish or install the candidate. [Persistence](PERSISTENCE.md) defines durability and acknowledgment.

One accepted `WorldCommand` emits **1–32** events. Sequences are contiguous; event 0 pre-state equals the durable pre-state, each later pre-state equals the preceding post-state, and the last post-state equals the prepared candidate. If the durable prior revision is `r`, every non-final event post-state retains revision `r`; only the final event post-state sets revision `r+1`. Thus a one-event batch changes revision in its sole post-state, while a multi-event batch changes it only in the final post-state. No intermediate state is externally visible. A rejection or deterministic no-op emits zero events and leaves revision, canonical state, world head, and every PRNG counter unchanged; it still receives a durable rejected receipt so retries are stable. “Accepted empty batch” is invalid.

The kernel accepts only actions expressible by the current typed Reality. The catalog may later expand through reusable affordances, but no model/prose may introduce a new effect, resolver, network/tool capability, or canonical field at runtime. Novel strategies must emerge from compositions of accepted actions and state, not scripted outcome branches.

## Catch-up semantics

Catch-up advances the same scheduler and emits the same boundary events as foreground play. It never invents a second aggregate reducer. A confirmed catch-up is a parent operation, not one oversized `WorldCommand`: preflight the entire requested interval, event/storage ceilings, schedule, and chapter plan before mutation. A preflight failure rejects the whole operation without change. A passing operation records one idempotent `CatchUpOperationReceipt` and then commits deterministic ordered child commands of 1–32 events, each with parent operation ID and chapter ordinal; progress is durable and resumes at the first missing chapter after a crash. Already committed chapters never roll back or reapply. Presentation withholds the final return summary until the operation completes, and accurately reports recovery if interrupted. The 50,000-event limit applies to the whole parent operation, not one batch.

- Up to 10 minutes: exact meaningful events; presentation may coalesce repetition.
- Up to 24 hours: algebraically aggregate stable production spans but stop at plan, resource, relationship, counsel, ownership, or shock boundaries.
- Up to 7 days: boundary-to-boundary advancement with daily and salient checkpoints.
- Up to 90 days: macro-aggregate only spans proven equivalent by property tests; interrupt for death, shortage, ownership change, plan expiry, institution change, or cross-region message.

The local product proposes an advance from elapsed wall time, explains the proposed interval, caps one interactive advance at seven days, and requires **Advance Riverhold**. No death or irreversible event happens from wall time before confirmation. Longer gaps are explicit sequential chapters; wall-clock duration is never canonical input.

## Blocking acceptance

- Golden canonical bytes, hashes, PRNG vectors, stable IDs, rounding, overflow, scheduler ties, and Unicode ingress match in browser and Node; independent encoders also match manifest/context/catalog/proposal/decision-record hashes.
- Same seed/commands and snapshot plus its exact half-open Canonical World Ledger range (batch headers and events) produce identical state bytes, state hash, and world-head hash: snapshot includes events through `baseSequence`; replay requires `from=baseSequence+1`, `to=finalSequence+1`; genesis is base 0/no domain event; zero events has `from=to=baseSequence+1`.
- Every accepted command has 1–32 contiguous, state-hash-chained events and advances revision once; rejected/no-op commands have none and change no canonical/hash/PRNG state.
- Every accepted event's provenance `commandId` equals the command and receipt committed with its batch; an executed `interventionId`, decision ID, or proposal ID must match its referenced record when present.
- Three counsel intents from the same pre-boundary snapshot reach at least three materially different terminal state vectors; no branch label may converge to the same authoritative result.
- Direct/trigger/contributing edges carry actual versioned `mechanismId` values; temporal and response relations cannot appear as causal parents.
- Consequential decision IDs resolve to bounded cognitive records and receipts; communication claims/beliefs/memories never pass as world facts without an accepted observation/disclosure transition.
- Snapshot plus the exact accepted Canonical World Ledger interval of batch headers and events replays exactly with cognition disabled; replay never reruns a model or Standard Brain.
- Catch-up preflight failure is whole-request atomic; successful multi-batch operations survive interruption, resume at the exact next chapter, never duplicate a chapter, and reach the same final state/world-head hashes as uninterrupted execution.
- 30-, 90-, and 365-day headless fixtures reach the exact requested terminal simulation time, conserve resources, stay within declared event/storage caps, and replay to the same hashes. A safe early pause is failure.
- Provisional target-M4 caps are 3 seconds/25,000 events/8 MB at 30 days, 10 seconds/75,000 events/20 MB at 90 days, and 45 seconds/250,000 events/64 MB at 365 days. Measurements may tighten these; weakening requires an explicit decision and does not change the seven-day interactive cap.
- The build has no model SDK/runtime dependency, and Standard Brain makes progress with the network disabled.

## Rejected alternatives

Tick-everything loops, wall-clock authority, `Date.now()`, `Math.random()`, conserved floats, locale-dependent ordering, random IDs, prose patches, model-authored facts, arbitrary code/network effects, scripted high-order outcomes, one generic `cause`, causal edges without mechanisms, temporal order as cause, cognition rerun as replay, fencing in canonical hashes, oversized catch-up commands, and installing worker state before durable commit.

## Reopen evidence

Reopen the profile only for a demonstrated cross-runtime mismatch, unsafe integer bound, or measured horizon failure after removing nonessential event density. Reopen product catch-up if players cannot understand/consent to the explicit advance; never fix it with silent wall-clock progression.

## Resulting implementation behavior

The first code milestone implements golden vectors and crash barriers before the renderer. One fixture version ships; unsupported data fails closed. Every authoritative decision is replayable without cognition or network access.

## Constraint fit

The profile is CPU-only, provider-free, narrow enough for one builder, and prevents migration/platform work from consuming the 40–60-hour proof. It requires no training, server, account, paid service, proprietary data, or deployment.
