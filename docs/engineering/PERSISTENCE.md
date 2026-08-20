# Local persistence and replay

**Purpose:** lock crash-safe browser durability, command receipts, single-writer fencing, snapshots, export, and replay interval semantics.

**Status:** ACCEPTED AFTER RED TEAM — export-only first slice

**Authority boundary:** this file owns `PersistencePort`, `CommandReceipt`, `ReplayManifest`, IndexedDB commit order, writer fencing, and durability UX. [SIMULATION](SIMULATION.md) owns event/state bytes; [SECURITY](SECURITY.md) owns hostile-input bounds.

**Related documents:** [architecture](ARCHITECTURE.md), [testing](../quality/TESTING.md), [engineering red team](../reviews/ENGINEERING_RED_TEAM.md), [ExecPlan](../exec-plans/active/001-foundation.md)

## Owned decision

The first slice keeps one local world in IndexedDB. A transition becomes visible only after its events, durable head, command receipt, and current fencing token commit in one transaction. The slice can export a verified bundle but cannot import, replace, merge, migrate, or promote a world.

## Locked port

The TypeScript surface may refine names but preserves these operations:

```ts
interface PersistencePort {
  getHead(regionId: RegionId): Promise<DurableHead>;
  getCommandReceipt(regionId: RegionId, commandId: CommandId): Promise<CommandReceipt | null>;
  appendEvents(request: CommitTransitionRequest): Promise<CommitTransitionResult>;
  loadSnapshot(ref: SnapshotRef): Promise<VerifiedSnapshot>;
  saveSnapshot(request: SaveSnapshotRequest): Promise<SnapshotRef>;
  getEventRange(request: EventRangeRequest): Promise<readonly WorldEventEnvelope[]>;
  exportWorld(regionId: RegionId): Promise<VerifiedExport>;
}
```

`appendEvents` is stronger than a raw append. Its request includes prior revision/head hash, command/fingerprint, receipt candidate, ordered event batch, post hash/revision, and monotonic fencing token. The adapter verifies the batch hash and commits atomically.

## Durable `CommandReceipt`

Every syntactically valid command ID gets exactly one durable result, accepted or rejected:

- region, command ID, schema version, canonical payload fingerprint, and principal;
- observed expected/actual revision;
- outcome code and accepted event interval or typed rejection code;
- resulting revision/head hash for acceptance, unchanged head for rejection; and
- created simulation boundary and fencing token.

A retry with identical ID/fingerprint returns the receipt without re-evaluation. The same ID with a different fingerprint is `IDEMPOTENCY_COLLISION`; it emits no event and changes no state. A rejected command remains rejected after later world changes and reload.

## Commit-before-publish protocol

For each command the worker/application must:

1. read the durable head and matching receipt, if any;
2. prepare an immutable transition/result without changing live state;
3. call `appendEvents`, which in one read-write transaction verifies prior head/fencing, inserts the complete event batch, writes the accepted/rejected receipt, and advances the head only for acceptance;
4. wait for transaction completion;
5. install the prepared post-state only when the returned durable head matches; and
6. publish projections and acknowledge the command.

If commit fails or the tab crashes before step 4, the candidate is discarded and never appears accepted. If it crashes after step 4 but before publish, startup reconstructs from the durable head and returns the existing receipt. If publication fails, retry publication without reapplying Reality. Crash-injection tests cover every barrier.

## IndexedDB layout and fencing

Stores are `worlds`, `events`, `commandReceipts`, `snapshots`, and `exports`. Event keys are `(regionId, sequence)`; receipt keys are `(regionId, commandId)`.

One active writer owns a monotonically increasing `fencingToken` stored in the world head. Lease transfer increments it transactionally. Every append and snapshot validates it. A suspended old tab with a stale token is rejected even if its wall-clock lease looks valid. Other tabs are read-only; automatic multi-tab takeover is excluded.

Snapshots are rebuildable caches. A snapshot contains state after applying every accepted event with `sequence <= baseSequence`, exact profile/engine/schema versions, canonical bytes/hash, creation head hash, and event-count metadata. Sequence 1 is the first domain event; the genesis snapshot has `baseSequence=0` and no domain event. Durable event/receipt/head commit never depends on snapshot success.

## Replay interval and manifest

`ReplayManifest` contains version, region/seed, snapshot reference/hash with `baseSequence`, half-open event interval `[fromSequenceInclusive, toSequenceExclusive)`, engine/schema/determinism/replay versions, expected final hash, and presentation metadata that cannot supply facts.

Require `fromSequenceInclusive=baseSequence+1` and `toSequenceExclusive=finalSequence+1`; apply exactly `from <= sequence < to`. For zero events `finalSequence=baseSequence`, so start=end=`baseSequence+1` and replay returns the snapshot hash unchanged. Ranges reject gaps, duplicates, wrong region/first sequence, or an end beyond the durable head. Only the current engine/schema/profile is supported; unknown versions fail closed.

## Export-only recovery

**Export save** writes a bounded versioned bundle with manifest, current snapshot, complete required event/receipt suffix, checksums, and plain warnings: progress is local to this device; export is a backup artifact; this version cannot restore/import it yet. Export creation is read-only and cannot pause or rewrite the world.

Import, replacement, merge, old-schema migration, and local-to-public promotion are deferred. There is no hostile-import surface in `001-foundation`; tests verify no import route exists and an unknown-version world fails without modification.

## Future server option

A region server may later reuse pure simulation contracts, event envelopes, receipts, and replay fixtures. It is not a drop-in browser-port implementation: authentication, authorization, transactional outbox/alarm semantics, backup/restore, quotas, moderation, and public-canon import policy require separate design after both product gates.

## Blocking acceptance

- Crash injection before/after prepare, commit request, IndexedDB completion, worker install, projection publish, and acknowledgment never produces visible-undurable or double-applied state.
- Accepted and rejected retry receipts survive reload; same-ID/different-payload collision is stable.
- Stale revision, stale fencing, partial batch, duplicate sequence, batch-hash mismatch, quota abort, corrupt snapshot, and event gap cause no partial mutation.
- Genesis replay and every verified snapshot plus half-open range reach identical canonical bytes/hash.
- Dual-tab fixture proves stale writer rejection after transfer.
- Local-save disclosure appears before counsel; blocked storage is disclosed before investment.
- Export is verified and non-destructive; no import or replace capability is reachable.

## Rejected alternatives

Worker-first publication, best-effort receipt caches, unfenced wall-clock leases, snapshot-only authority, auto-import, destructive replacement, in-place event migration, and a claimed drop-in server adapter.

## Reopen evidence

Reopen snapshot cadence from measured 30/90/365-day bytes. Reopen restore/import only with side-by-side validation and explicit user selection. Reopen server persistence only after both product gates.

## Constraint fit

One adapter, one writer, one current version, and export-only recovery protect history without consuming the slice on migration or distributed systems. The plan stays local, free, accountless, provider-free, and deploys nothing.
