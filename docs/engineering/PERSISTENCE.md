# Local persistence and replay

**Purpose:** lock crash-safe browser durability, run-scoped canonical/cognitive ledger separation, experiment identity, genesis, command receipts, single-writer fencing, snapshots, and replay interval semantics.

**Status:** IMPLEMENTED FOUNDER-ALPHA ADAPTER PLUS V1 VERSIONED CONFORMANCE SEAM — V1 browser wiring incomplete

**Authority boundary:** this file owns the Founder Alpha `PersistencePort`, V1 `VersionedPersistencePort`, stored `CognitiveDecisionRecord`, `ExperimentManifest`, `CommandReceipt`, `CatchUpOperationReceipt`, `ReplayManifest`, IndexedDB commit order, writer fencing, and durability UX. [COGNITION](COGNITION.md) owns decision-record meaning; [OBSERVATORY](../product/OBSERVATORY.md) owns research semantics; [SIMULATION](SIMULATION.md) owns event/state bytes; [SECURITY](SECURITY.md) owns hostile-input bounds.

**Related documents:** [architecture](ARCHITECTURE.md), [testing](../quality/TESTING.md), [engineering red team](../reviews/ENGINEERING_RED_TEAM.md), [ExecPlan](../exec-plans/completed/001-foundation.md)

## Owned decision

The first slice keeps one local world in IndexedDB. It stores a Canonical World Ledger, a separate bounded Cognitive/Decision Ledger, and one immutable Experiment Manifest. One crash-safe genesis transaction creates the run. A transition becomes visible only after its batch header/events, durable head, command receipt, current fencing token, and associated consequential-decision record commit in one transaction. V1 adds a provider-neutral exact-version authority-stream seam for Release Genesis/civilization state; its in-memory conformance adapter is implemented, while its IndexedDB/browser integration is still incomplete. The slice cannot back up, export, import, replace, fork, merge, migrate, or promote a world; that honest limitation is disclosed before commitment.

## V1 versioned authority stream

`VersionedPersistencePort` is the future exhibition/server boundary and coexists temporarily with the Founder Alpha port. It scopes every operation by run and region; initializes a hash-verified genesis head/snapshot atomically and idempotently; acquires a monotonically increasing writer fence; appends one bounded event batch against exact revision, sequence, state hash, prior event hash, runtime versions, and fencing token; returns a hashed receipt; retrieves verified continuous half-open ranges; and saves only snapshots that exactly describe the durable head.

The current conformance adapter stages all changed maps before a single commit point. Injected crashes before that point leave no mutation; crashes after it recover through exact idempotent retry. Changed retries, duplicate batch/event IDs, stale writers, gaps, corrupt hashes, out-of-order simulation time, incompatible schemas, engines, or state versions fail closed. Replay accepts a caller-supplied deterministic reducer and snapshot/event bytes only—there is no Brain or transport parameter—and checks every pre/post state and prior-event hash.

This is not yet V1 durability acceptance. The adapter is memory-only, the civilization scheduler does not emit this envelope, the existing IndexedDB adapter still implements the Founder Alpha contract, and catch-up/decision-ledger composition is pending. V1 has no automatic upcaster: the migration policy is explicitly exact-only until a separately reviewed migration proves semantic and hash equivalence.

## Locked port

The TypeScript surface may refine names but preserves these operations:

```ts
interface PersistencePort {
  getExperimentManifest(runId: RunId): Promise<ExperimentManifest>;
  commitGenesis(request: CommitGenesisRequest): Promise<CommitGenesisResult>;
  getHead(runId: RunId, regionId: RegionId): Promise<DurableHead>;
  getCommandReceipt(runId: RunId, regionId: RegionId, commandId: CommandId): Promise<CommandReceipt | null>;
  getDecisionRecord(runId: RunId, regionId: RegionId, decisionId: DecisionId): Promise<CognitiveDecisionRecord | null>;
  getCatchUpOperationReceipt(runId: RunId, regionId: RegionId, operationId: OperationId): Promise<CatchUpOperationReceipt | null>;
  appendEvents(request: CommitTransitionRequest): Promise<CommitTransitionResult>;
  appendRejectedDecision(request: CommitRejectedDecisionRequest): Promise<void>;
  beginCatchUpOperation(request: BeginCatchUpOperationRequest): Promise<CatchUpOperationReceipt>;
  commitCatchUpChapter(request: CommitCatchUpChapterRequest): Promise<CatchUpOperationReceipt>;
  loadSnapshot(ref: SnapshotRef): Promise<VerifiedSnapshot>;
  saveSnapshot(request: SaveSnapshotRequest): Promise<SnapshotRef>;
  getBatchRange(request: BatchRangeRequest): Promise<readonly WorldBatchHeader[]>;
  getEventRange(request: EventRangeRequest): Promise<readonly WorldEventEnvelope[]>;
}
```

Every operation and reference is explicitly run/region scoped and verifies those values against the immutable manifest. `commitGenesis` accepts one already-hashed manifest, verified genesis snapshot, initial state hash, genesis world-head hash, and initial fencing token. In one idempotent transaction it creates the manifest, snapshot, head/fence, and empty batch/event/decision/receipt stores. Exact same-run/same-manifest retry returns the existing result; same run ID with different bytes/hash is `RUN_ID_COLLISION`. A crash at any barrier leaves either no run or the complete verified genesis—never a manifest without a matching head/snapshot.

`getDecisionRecord` is a package-internal audit operation, not an Application/UI/Brain capability. Production consumer code receives only the authorized `DecisionTraceProjection` defined by [COGNITION](COGNITION.md); the raw getter is exercised by bounded audit/corruption tests and has no patron/public route.

`appendEvents` is stronger than a raw append. Its request includes run/region; prior revision/state/world-head hashes; command/fingerprint; receipt candidate; one `WorldBatchHeader`; ordered 1–32-event batch; post hash/revision; monotonic fencing token; and optional finalized `CognitiveDecisionRecord`. The adapter requires the manifest/genesis, verifies every run/region/version/hash/batch/decision/command/event reference, requires every non-final event post-state to retain the prior revision and only the final post-state to use prior revision + 1, and commits atomically. `appendRejectedDecision` is idempotent and exists only when proposal/schema validation failed before a `WorldCommand` could exist; it requires the canonical `decisionRecordHash`, returns the prior exact record on identical retry, rejects same decision ID/different hash as `DECISION_ID_COLLISION`, and cannot update world head, batch/event stores, snapshots, or receipts.

## Durable `CommandReceipt`

Every syntactically valid command ID gets exactly one durable result, accepted or rejected:

- run, region, command ID, schema version, canonical payload fingerprint, and principal;
- observed expected/actual revision;
- outcome code and accepted event interval or typed rejection code;
- resulting revision/head hash for acceptance, unchanged head for rejection; and
- created simulation boundary and fencing token.

A retry with identical ID/fingerprint returns the receipt without re-evaluation. The same ID with a different fingerprint is `IDEMPOTENCY_COLLISION`; it emits no event and changes no state. A rejected command remains rejected after later world changes and reload.

## Commit-before-publish protocol

For each command the worker/application must:

1. read the durable head and matching receipt, if any;
2. prepare an immutable transition/result without changing live state;
3. call `appendEvents`, which in one read-write transaction verifies manifest/run/region, prior state/world head, fencing and decision references; inserts the complete batch header and event batch; writes the accepted/rejected receipt and associated consequential-decision record; and advances revision/state/world head only for acceptance;
4. wait for transaction completion;
5. install the prepared post-state only when the returned durable head matches; and
6. publish projections and acknowledge the command.

If commit fails or the tab crashes before step 4, the candidate is discarded and never appears accepted. If it crashes after step 4 but before publish, startup reconstructs from the durable head and returns the existing receipt. If publication fails, retry publication without reapplying Reality. Crash-injection tests cover every barrier.

Counsel deliberately spans two durable transitions: the patron's `CounselIssued` event, then the citizen's cognition-bound resolution. Recovery treats an issued-but-unresolved counsel as the only pending intent, rejects a conflicting replacement, and resumes resolution without emitting a second counsel event. If resolution committed before the crash, startup reconstructs the visible interpretation only from the hash-checked persisted decision/proposal bytes bound to the cognition event; it never reruns the Brain or projects an undefined receipt.

A confirmed catch-up uses one closed run/region-scoped `CatchUpOperationReceipt` with exactly: literal schema version `eonfolk-catch-up-receipt-v1`; run/region, operation and confirmation IDs; SafeU64 `fromSimulationTime <= toSimulationTime`; 64-hex preflight `planHash`; SafeU64 `totalChapters` and `nextChapter`; status `in-progress|complete|rejected`; initial/current revision, state hash and world-head hash; nullable final revision/state/world-head hashes; and nullable typed rejection code. Rejected requires `totalChapters=nextChapter=0`, current=initial, every final field null, and a non-null rejection. In-progress requires `1 <= totalChapters <= 50000`, `0 <= nextChapter < totalChapters`, and null final/rejection fields. Complete requires `1 <= totalChapters=nextChapter <= 50000`, final=current, and null rejection. No extra field or status combination validates.

`beginCatchUpOperation` atomically writes exactly one rejected receipt on preflight failure or one `in-progress` receipt after successful preflight, without a domain event or world-head change. Same operation ID/plan hash returns the existing receipt; a different plan hash is `CATCH_UP_ID_COLLISION`. `commitCatchUpChapter` requires status `in-progress`, exact plan hash, fencing token, and `chapterOrdinal == nextChapter`; in one transaction it commits that child command's 1–32-event batch/header/receipt/optional decision plus the new world head and increments `nextChapter`. The last chapter also sets `complete` and its final hashes. Exact retry returns the already committed child receipt/progress; a stale/different chapter cannot mutate. Startup resumes at `nextChapter`, and the final summary publishes only after `complete`. This makes chapter commits durable and idempotent without pretending that a 50,000-event operation is one atomic event batch.

## IndexedDB layout and fencing

Stores are `experimentManifests`, `worlds`, `batches`, `events`, `decisionRecords`, `commandReceipts`, `catchUpOperations`, and `snapshots`. Head keys are `(runId,regionId)`; batch keys `(runId,regionId,resultRevision)`; event keys `(runId,regionId,sequence)`; decision keys `(runId,regionId,decisionId)`; receipt keys `(runId,regionId,commandId)`; snapshot keys include run/region. Batch headers plus events are the Canonical World Ledger. Decision records remain separate and cannot participate in state reduction merely because they exist.

One active writer owns a monotonically increasing `fencingToken` stored as CAS metadata beside the world head. Lease transfer increments it transactionally but never changes canonical state hash or world-head hash. Every append and snapshot validates it. A suspended old tab with a stale token is rejected even if its wall-clock lease looks valid. Other tabs are read-only; automatic multi-tab takeover is excluded.

Snapshots are rebuildable caches. A snapshot contains run/region, state after applying every accepted event with `sequence <= baseSequence`, exact profile/engine/schema versions, canonical bytes/state hash, base world-head hash, creation head hash, and event-count metadata. Sequence 1 is the first domain event; the genesis snapshot has `baseSequence=0` and no domain event. Durable batch/event/receipt/head commit never depends on later snapshot success.

## Immutable `ExperimentManifest`

Each run has exactly one canonical manifest created with genesis before its first domain event. It contains manifest version; stable run/region IDs; run kind; world seed; initial snapshot reference/hash; engine, schema, determinism, replay, and cognition versions; bounded cognition configuration; Standard-Brain version; optional provider/model/version/prompt/schema/artifact hashes; ordered configured intervention-protocol IDs; parent run/snapshot references; and the manifest hash. `manifestHash` uses the framed JCS domain over the complete object without that field; mutation-and-rehash is not accepted after genesis. Actually executed intervention command IDs live in receipts/events, not the immutable configured list.

For `001-foundation`, run kind is exactly `canonical-local-proof`; all optional provider/model fields and parent references are null; configured intervention-protocol IDs name the bounded patron counsel/advance action families. Actual executed command/intervention IDs are append-only receipt/event provenance. Any attempt to create a fork/experiment kind, change the manifest after genesis, or attach a parent is rejected. Future non-canonical runs require a new versioned design and visibly distinct run ID/ledger; they never append to the parent canon.

## Replay interval and manifest

`ReplayManifest` contains version, run/region/seed, Experiment Manifest hash, snapshot reference/hash with `baseSequence` and base world-head hash, half-open event interval `[fromSequenceInclusive, toSequenceExclusive)`, covering batch-header range, engine/schema/determinism/replay versions, expected final state hash/world-head hash, and presentation metadata that cannot supply facts.

Require `fromSequenceInclusive=baseSequence+1` and `toSequenceExclusive=finalSequence+1`; apply exactly `from <= sequence < to`. For zero events `finalSequence=baseSequence`, so start=end=`baseSequence+1` and replay returns the snapshot hash unchanged. Ranges reject gaps, duplicates, wrong region/first sequence, or an end beyond the durable head. Only the current engine/schema/profile is supported; unknown versions fail closed.

Canonical replay reads only the verified Experiment Manifest, snapshot, and accepted Canonical World Ledger interval of batch headers plus events. It verifies run/region/version bindings, event state-hash chains, batch hashes and the world-head chain, reaching both expected final hashes. It never reruns a Standard Brain or model and never derives events from a Cognitive/Decision Ledger record. The preserved original proposal/validator/receipt chain is audit evidence; model-output reproducibility is explicitly outside the replay guarantee.

## Backup and recovery boundary

Backup/export, import, restore, replacement, merge, old-schema migration, and local-to-public promotion are deferred. The UI plainly says the proof is saved only in this browser and cannot yet be backed up or restored. Tests verify that no export/import/replace route exists and an unknown-version world fails without modification. This cut funds the amendment's provenance/privacy work without changing either product gate.

## Future server option

A region server may later reuse pure simulation contracts, event envelopes, receipts, and replay fixtures. It is not a drop-in browser-port implementation: authentication, authorization, transactional outbox/alarm semantics, backup/restore, quotas, moderation, and public-canon import policy require separate design after both product gates.

## Blocking acceptance

- Crash injection before/after prepare, commit request, IndexedDB completion, worker install, projection publish, and acknowledgment never produces visible-undurable or double-applied state.
- Accepted and rejected retry receipts survive reload; same-ID/different-payload collision is stable.
- Stale revision, stale fencing, partial batch, duplicate sequence, batch-hash mismatch, quota abort, corrupt snapshot, and event gap cause no partial mutation.
- Genesis crash injection produces either no run or a complete manifest/snapshot/head/empty-ledger unit; mismatched same-ID genesis cannot alter it.
- Genesis replay and every verified snapshot plus half-open batch/event range reach identical canonical bytes, state hash, and world-head hash.
- Every run/region/version binding and compound key matches the immutable manifest; a fork-like run cannot collide with or append to its parent.
- Every cognition-originated accepted event cites a stored decision ID whose context/proposal/validation/receipt/event chain verifies; rejected decision records cannot advance canonical head.
- Experiment Manifest is immutable after genesis, binds all replay versions/configuration, and rejects first-slice fork/parent/model fields.
- Canonical replay succeeds with cognition unavailable and never calls BrainPort; original structured proposal bytes and hashed raw decision records remain byte-verifiable audit records.
- Dual-tab fixture proves stale writer rejection after transfer.
- Local-save disclosure appears before counsel; blocked storage is disclosed before investment.
- No backup/export/import/replace capability is reachable; local-only disclosure appears before counsel.

## Rejected alternatives

Worker-first publication, best-effort receipt/decision caches, non-atomic genesis, region-only keys, a mixed world/cognition ledger, fencing inside canonical hashes, receipts as the only batch-chain source, unfenced wall-clock leases, snapshot-only authority, model rerun as replay, premature backup/export/import, destructive replacement, in-place event migration, first-slice fork creation, and a claimed drop-in server adapter.

## Reopen evidence

Reopen snapshot cadence from measured 30/90/365-day bytes. Reopen backup/export/restore/import only with side-by-side validation and explicit user selection. Reopen server persistence only after both product gates.

## Constraint fit

One adapter, one writer, one current version, one small manifest, bounded consequential-decision records, and no backup/import surface protect history/provenance without consuming the slice on a dashboard, fork engine, migration, or distributed system. The plan stays local, free, accountless, provider-free, and deploys nothing.
