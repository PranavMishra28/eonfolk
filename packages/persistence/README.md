# Persistence package

`@eonfolk/persistence` is EONFOLK's local durability boundary. It provides
in-memory conformance adapters and the browser IndexedDB implementation used by
the generated civilization.

## Guarantees

- atomic manifest, head, fence, and genesis-snapshot creation;
- run/region-scoped batch, event, decision, command-receipt, catch-up, and
  snapshot stores;
- expected-revision comparison and monotonically increasing writer fencing;
- atomic batch/events/head/receipt/optional-decision commits;
- exact idempotent retry and typed collision rejection;
- bounded, continuous event intervals and snapshot-plus-suffix replay;
- hash, version, corruption, quota, abort, and stale-writer checks; and
- deterministic 1/7/30/90/365-day checkpoint persistence without cognition.

The v9 civilization codec stores exact versioned checkpoint transitions and all
intervening typed step/event records. Replay verifies the source and persistence
hash chains before applying deterministic patches. Unknown runtime, engine,
state, transition, runner, step, or event versions fail closed. One reviewed
legacy checkpoint schema has an explicit migration; there is no implicit
upcaster.

`getDecisionRecord` is an internal audit primitive. Applications expose only an
authorized projection. Raw decision records are not UI or Brain capabilities,
and canonical replay never invokes a model.

## Current limits

There is no supported backup, export, import, replacement, fork, server adapter,
lease timer, automatic tab takeover, SQL layer, or cloud recovery. Browser
storage can be evicted or cleared. A future server adapter must preserve the
port's atomicity and scope but requires a separately reviewed authentication,
moderation, backup, and operations design.
