# Persistence and replay

**Purpose:** define local storage, append/snapshot atomicity, replay provenance, migrations, and the future server adapter seam.

**Status:** ACCEPTED FOR LOCAL-FIRST SLICE; HOSTED ADAPTER DEFERRED

**Authority boundary:** owns `PersistencePort`, `ReplayManifest`, IndexedDB layout, single-writer behavior, snapshot/replay/migration semantics, and durability UX. Event meaning and hashes are owned by [simulation](SIMULATION.md).

**Related documents:** [architecture](ARCHITECTURE.md), [simulation](SIMULATION.md), [security](SECURITY.md), [testing](../quality/TESTING.md), [systems evidence](../research/SYSTEMS_RESEARCH.md)

## Owned decision

Event-source only the canonical civilization aggregate. The first slice stores an append-only consequential event stream and rebuildable verified snapshots in IndexedDB. Settings, cached projections, rendering state, and optional noncanonical provider traces are ordinary records and never replay truth.

One browser tab holds the writer lease. Other tabs are read-only or explicitly request a lease transfer. Multi-writer conflict resolution is out of scope. A visible export/import path is required because browser storage is not a backup guarantee.

## `PersistencePort`

The domain-facing port exposes only the operations needed to preserve and replay authoritative history:

```ts
interface PersistencePort {
  appendEvents(request: AppendEventsRequest): Promise<AppendResult>;
  loadSnapshot(request: LoadSnapshotRequest): Promise<VerifiedSnapshot | null>;
  saveSnapshot(request: SaveSnapshotRequest): Promise<SnapshotRef>;
  getEventRange(request: EventRangeRequest): Promise<readonly WorldEventEnvelope[]>;
}
```

The exact TypeScript may vary, but semantics do not:

- `appendEvents` takes world/region, expected head revision/hash, idempotency context, and one ordered nonempty batch. It atomically writes the batch and advances the head or writes nothing.
- `loadSnapshot` selects a compatible verified snapshot at or before a requested sequence.
- `saveSnapshot` writes bytes plus versions/hash first, verifies them, and only then publishes the reference. Snapshots are rebuildable and may be created after the event transaction.
- `getEventRange` returns a complete ordered inclusive/exclusive interval and fails on gaps or duplicate sequences.

Browser, Cloudflare, SQL, filesystem, and provider types cannot cross this interface.

## IndexedDB adapter

The local adapter uses four stores:

| Store | Canonical role |
|---|---|
| `worlds` | manifest, current revision/hash, writer lease, selected snapshot reference |
| `events` | compound `(worldId, regionId, regionSequence)` key; time/type/entity indexes are conveniences |
| `snapshots` | immutable bytes, covered event sequence, versions, PRNG/scheduler state, canonical hash |
| `noncanonical_artifacts` | optional redacted provider traces or cached presentation; excluded from normal replay/export by default |

The accepted event batch and head advancement share one read-write transaction. If the transaction aborts, neither becomes visible. Snapshot failure cannot invalidate committed events. Import validates MIME/size, manifest, versions, schema, sequence continuity, and hashes in scratch storage before replacing or creating any world.

## `ReplayManifest`

Every export, snapshot replay, Chronicle replay, or public replay reference contains:

| Field | Required meaning |
|---|---|
| `manifestVersion` | version of this contract |
| `worldId`, `regionId` | source identity |
| `snapshotRef` | immutable versioned snapshot identifier, sequence, content hash, and schema versions |
| `eventInterval` | ordered start/end region sequences required after the snapshot |
| `engineVersion`, `replayVersion` | deterministic engine and replay implementation versions |
| `worldSchemaVersion`, `eventSchemaVersions`, `prngVersion` | state/event/randomness decoding owners |
| `presentationMetadata` | title, selected subjects, camera/beats, locale, content warnings; explicitly noncanonical |
| `expectedHeadHash` | final canonical state hash after applying the interval |

Presentation metadata may choose how to show facts but cannot supply facts or causality.

## Replay and migration

1. Validate the manifest and snapshot bytes/hash.
2. Load genesis or the latest compatible verified snapshot.
3. Retrieve the exact event interval and reject gaps, duplicates, or unknown required types.
4. Upcast immutable old event payloads into the current in-memory type.
5. Apply through the versioned reducer without invoking cognition.
6. Restore and check scheduler and PRNG state.
7. Compare the resulting head hash with the manifest/world head.

Events are never rewritten. Read-time upcasters have golden fixtures. Snapshot migration creates a new snapshot and a recorded migration event/marker while preserving the old stream and export. Engine-major migration requires full replay rehearsal and hash/equivalence policy approval; a hosted region stays pinned until it passes.

## Catch-up durability

Catch-up commits ordered batches at deterministic boundaries. UI-yield chunk size cannot change event content or hashes. Interruption resumes from the last committed head and idempotently replays any submitted-but-unacknowledged command. A 90/365-day run may pause on an event/time safety budget; it cannot publish a future head before all prior events are durable.

The factual While You Were Away projection is rebuilt from committed events. It may group routine items for presentation but cannot replace, delete, or infer canonical facts.

## Future `RegionDO` adapter

After both product gates and a separate deployment/cost approval, a SQLite-backed region authority may implement the same semantics. One region is one writer/transaction boundary. Commands and alarms are idempotent. An alarm merely wakes the region to process the earliest due scheduled item; it does not define simulation time. Cross-region messages use ordered idempotent inbox/outbox events.

This adapter is excluded from `001-foundation`. Migration from local world to public canon is not implied; private local history may remain private or require an explicit, reviewed import policy later.

## Resulting implementation behavior

- Reload resumes the same world and verifies its head.
- A duplicate counsel command cannot apply twice.
- Catch-up can be interrupted and resumed without changing outcomes.
- A corrupted snapshot falls back to earlier verified history rather than silently accepting it.
- A user can export a self-contained replay/backup before investing further.
- Optional provider traces can be deleted without damaging Reality or Chronicle facts.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Snapshot-only save file | Cannot support factual causal replay, idempotency audit, or migrations reliably |
| Event-source settings/UI caches | Complexity without product truth value |
| LocalStorage | No suitable transactional structured event/snapshot boundary |
| Cloud database in Gate A/B | Adds auth, network, cost, deployment, and failure modes before attachment proof |
| Silent last-write-wins across tabs | Can fork or corrupt canonical local history |
| Rewrite events during migration | Destroys provenance and makes prior replays unverifiable |
| Persist raw model output as fact | Untrusted prose is not canonical evidence |

## Unproven assumptions and reopen evidence

- **UNRESOLVED:** IndexedDB quota and eviction are adequate on the supported browser matrix. Reopen after quota, persistence-request, eviction, and recovery drills.
- **UNRESOLVED:** explicit export is understandable and used before loss. Reopen the backup UX after player tests.
- **UNRESOLVED:** one-writer lease recovery is reliable across crashes. Reopen after forced-close and dual-tab tests.
- **UNRESOLVED:** event volume/snapshot bytes remain within budgets at 30/90/365 days. Reopen cadence and mechanics from measurements.
- **UNRESOLVED:** the future region adapter preserves semantics. It requires contract tests against both adapters before any hosted migration.

## Constraint fit

IndexedDB requires no account, server, credential, spend, or operations. Selective event sourcing serves Chronicle/replay without a service fleet. The four-operation port is small enough for a solo slice and keeps later hosting reversible. Export reduces—but does not eliminate—local durability risk.
