# Persistence package

`@eonfolk/persistence` is the local durability boundary for the first proof. It supplies the same generic `PersistencePort` through `MemoryPersistence` and `IndexedDbPersistence`. The package deliberately does not import protocol or simulation code: callers provide already-validated structural records, canonical IDs, payload fingerprints, and hashes; the adapter checks storage invariants and scope.

## Guarantees

- one unparented `canonical-local-proof` run per adapter;
- atomic manifest/head/genesis-snapshot creation;
- distinct manifest, world, batch, event, decision, command-receipt, catch-up, and snapshot stores;
- atomic accepted transition across batch/events/head/receipt/optional decision;
- exact command retry by payload fingerprint and typed collision errors;
- monotonically increasing, noncanonical fencing metadata;
- crash injection immediately before and after transaction completion, enabling retry recovery tests;
- ordered, bounded half-open batch/event ranges and snapshot-anchored replay ranges; and
- local limits of 32 events per batch, 50,000 catch-up chapters, 64 snapshots, 256 KiB per record, and 64 MiB of conservatively counted records by default.

`getDecisionRecord` is an internal audit primitive. An application must expose only an authorized projection; raw decision records are not UI or cognition capabilities.

## Explicit non-goals

There is no export, import, replacement, fork, schema upcaster, server adapter, lease timer, automatic tab takeover, SQL layer, or backup guarantee. Browser storage can still be evicted or lost. A future protocol integration may alias these structural types or map richer records into them without moving simulation authority into this package.
