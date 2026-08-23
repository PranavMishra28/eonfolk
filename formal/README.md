# Bounded persistence invariants

This model is a small-state check of transaction boundaries, not a proof of the TypeScript or browser implementation. `Persistence.cfg` checks four command IDs, four revisions/events, three fencing-token advances, and two catch-up chapters. Increasing those constants expands coverage but cannot turn bounded model checking into an unbounded proof.

The checked invariants mean:

1. **Atomic genesis:** durable state is either entirely empty or has a ready world with a nonzero fence. A crash cannot expose a manifest-like ready phase without its head/ledger basis.
2. **Atomic append:** revision, last sequence, batch keys, event keys, and accepted command receipts advance together. There is no reachable partial batch or receipt-only acceptance.
3. **Idempotency:** retrying a command already in `receipts` is a durable no-op. A command can contribute at most one revision.
4. **Fencing:** append actions require the exact current fencing token. The modeled stale-writer action changes no durable variable, while writer transfer changes only the fence.
5. **Exact-head snapshots:** genesis installs revision zero atomically, later snapshots require the current writer fence and durable revision, stale writes are no-ops, and exact retries do not create a second record.
6. **Catch-up progress:** chapters advance exactly one at a time, never exceed the declared bound, and only the final chapter marks the operation complete.
7. **Crash/recovery:** crash and recovery change only process state. They never roll back or partially expose a durable transaction.

The abstraction deliberately treats a committed batch as one event. Production tests separately cover the 1–32-event intra-batch state-hash chain, IndexedDB abort behavior, quota errors, supplied hashes, record bounds, and browser reloads.

Run with:

```sh
TLA2TOOLS_JAR=/absolute/path/to/tla2tools.jar \
JAVA_HOME=/absolute/path/to/jdk \
node scripts/check-formal.mjs
```

The JAR must be supplied explicitly. `scripts/formal-toolchain.mjs` is the repository's single source for the accepted TLA+ version, download URL, and SHA-256. `check-formal.mjs` hashes the JAR and rejects it before starting Java unless the digest matches. It never searches temporary directories or accepts a stale tool implicitly.

If Java or the JAR is unavailable, the script reports `TOOL_UNAVAILABLE` and exits nonzero. An identity mismatch reports `TOOL_IDENTITY_MISMATCH` and exits nonzero before Java runs. CI supplies the same checksum-verified TLA+ 1.8.0 JAR and Java 21; tool absence or substitution is never a passing formal check.
