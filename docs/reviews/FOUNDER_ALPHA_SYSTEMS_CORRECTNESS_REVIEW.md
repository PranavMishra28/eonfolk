# Founder Alpha systems correctness review

**Purpose:** Record an independent hostile review of Founder Alpha authority, command, replay, persistence, diagnostics, feedback, epistemic, Observatory, liveness, and attack-surface correctness.

**Status:** FROZEN REVIEW COMPLETE — NOT READY; ZERO P0, FIVE P1, AND TWO P2 FINDINGS

**Authority boundary:** This file owns review findings against the exact frozen candidate below. It does not amend implementation, planning status, shared authorities, decisions, risks, questions, source evidence, or release claims.

**Related documents:** [authority index](../INDEX.md), [architecture](../engineering/ARCHITECTURE.md), [simulation](../engineering/SIMULATION.md), [persistence](../engineering/PERSISTENCE.md), [diagnostics](../engineering/DIAGNOSTICS.md), [feedback](../engineering/FEEDBACK.md), [security](../engineering/SECURITY.md), [Observatory](../product/OBSERVATORY.md), [quality bar](../quality/QUALITY_BAR.md), and [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

## Frozen target and independence

This review inspected commit **`7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`**, exact tree **`476c381034ab3601746a7e11235fe693d793782c`**, against `main`/merge base **`74a8a7e07d0743f467dd9547ebf4193eb53d6029`**. The target remained unchanged throughout inspection.

The reviewer did not read or request any other Founder Alpha review output and did not delegate any part of the review.

## Method

The review:

1. started from the authority index and read the simulation, persistence, diagnostics, feedback, security, Observatory, quality, and active ExecPlan contracts;
2. inspected the actual `main...7319d592` diff and traced protocol → reducer/transition → application commit → IndexedDB reload/replay, including fencing and checkpoint behavior;
3. traced diagnostics redaction, ring bounds, Sentinel ordering, local observer projection, and worker/UI failure handling for any path back into Reality;
4. traced browser feedback storage and the optional Worker from ingress validation through Turnstile, hashing, D1 reservation/quota/lease state, reconciliation, GitHub provider restrictions, and credential minting;
5. inspected cognition visibility, hidden-fact paired tests, deterministic fallback, decision records, and the standards-shaped Observatory projection; and
6. ran focused suites plus a real SQLite adversarial lease-expiry probe.

Commands and results:

- Focused Vitest systems set: **19 files / 119 tests passed**, covering systems, persistence, diagnostics, feedback Worker, cognition, Observatory, and web runtime tests.
- Real Chromium IndexedDB reload: **1 test passed**.
- Type checking: **12 project graphs passed**, including the feedback Worker graphs.
- Architecture boundary check: **passed**.
- Adversarial SQLite probe against the checked-in D1 migration: first lease `lease-one` expired; reacquisition returned `lease-two`; the incident held `lease-two` while the singleton delivery lock still held expired `lease-one`; delivery under `lease-two` returned no row. This directly reproduces FA-SYS-001.
- The host supplied Node `v25.2.1`, while the repository pins Node `22.23.1`; pnpm `11.15.1` matched. The focused tests passed with the engine warning, so this run is useful review evidence but not a substitute for the canonical pinned-runtime verification.

## Verdict

**NOT READY.** No P0 was found: the ordinary application path prepares immutable candidate state, commits before installing it, atomically stores accepted world/decision records, replays on reload, fences ordinary stale writers, keeps diagnostics out of the authoritative dependency graph, and remains fully live on Standard Brain with no model or provider.

Five P1 failures nevertheless contradict blocking correctness/security contracts: expired feedback leases split the two D1 locks; advertised source quotas and bounded retention do not exist; an idempotent persistence result can be ignored while stale candidate state is published; reload accepts unsupported ledger versions; and canonical return-response references need not resolve. The two P2 findings are dormant or local-only but should be closed before their surfaces are relied on.

| Severity | Count | Readiness effect |
|---|---:|---|
| P0 | 0 | No immediate data-loss, secret-exposure, or unauthorized canonical-write path reproduced |
| P1 | 5 | Blocking relay, replay, durable-visible, and canonical-reference correctness failures |
| P2 | 2 | Dormant projection-confidentiality and hostile-local-storage hardening gaps |

## Findings

### FA-SYS-001 — P1 — Expired D1 incident leases bypass the singleton lease and permanently wedge reconciliation

**Evidence and failure mechanism.** `ACQUIRE_LEASE_SQL` in `apps/feedback-worker/src/d1.ts` permits acquisition when `lease_until_ms` is expired even if `lease_token` remains non-null. The `feedback_global_lease_before_update` trigger in `apps/feedback-worker/migrations/0001_feedback_relay.sql` acquires the singleton lock only when `OLD.lease_token IS NULL`. Replacing an expired non-null incident token therefore skips the trigger. `markDelivered` and `markRetryable` both require the incident token and singleton token to match, so the new worker can reconcile or create a GitHub issue/comment but cannot finalize D1. It cannot clear its lease either. Retries remain wedged and can repeat external reconciliation work.

The real SQLite probe produced:

```text
incident_token = lease-two
global_token   = lease-one
global_until   = 40000
delivery       = null
```

This is not the documented unavoidable GitHub exactly-once limitation. It is an internal two-lock state that prevents acknowledged or reconciled delivery after an ordinary lease-expiry recovery.

**Affected files.** `apps/feedback-worker/migrations/0001_feedback_relay.sql`, `apps/feedback-worker/src/d1.ts`, `tests/unit/feedback-worker/d1.test.ts`, and the D1 fake in `tests/unit/feedback-worker/fakes.ts`.

**Required correction.** Make expired incident reacquisition and singleton acquisition one coherent atomic transition. The old incident token may be replaced only if the singleton is simultaneously acquired for the new token, including the expired-non-null case. Ensure stale tokens cannot clear or finalize the new lease.

**Direct acceptance test.** With the real migration, reserve one submission, acquire lease A, let both lease deadlines expire without a state write, acquire lease B, and assert both the incident and singleton rows hold B. Then reconcile an already-created issue and assert `markDelivered` succeeds, clears staged prose and both leases, and a late A completion fails. Repeat for `markRetryable` and for a second fingerprint contending on the singleton.

### FA-SYS-002 — P1 — The relay cannot enforce its claimed keyed quotas or bounded D1 retention

**Evidence and failure mechanism.** The feedback authority claims five accepted reports per keyed bucket/hour and ten/day, retry staging with a bounded TTL, and dedup/status/counters retained at most 30 days. `FeedbackRepository.reserve` receives no source bucket, hour bucket, rotating-HMAC key, or equivalent identity. The migration enforces only 20 per incident fingerprint/day, 100 global/day, and 1,000 global/rolling 30 days. It contains no expiry column, cleanup statement, scheduled sweep, or deletion trigger. Reserved/retryable `payload_json`, submission rows, incident rows, and old quota buckets can therefore persist indefinitely. Turnstile does not supply the missing source quota and is explicitly not a quota in the authority.

This makes the current seam materially easier to spam and makes its privacy/retention description false if composed and deployed.

**Affected files.** `apps/feedback-worker/src/contracts.ts`, `apps/feedback-worker/src/d1.ts`, `apps/feedback-worker/src/worker.ts`, `apps/feedback-worker/migrations/0001_feedback_relay.sql`, `tests/unit/feedback-worker/d1.test.ts`, and `docs/engineering/FEEDBACK.md`.

**Required correction.** Before any deploy-ready claim, either implement a privacy-reviewed keyed source quota with atomic hour/day counters and a deterministic bounded cleanup path, or explicitly remove those claims and keep deployment blocked. Add an explicit staging expiry and a cleanup mechanism that deletes expired prose and old status/quota material without deleting live delivery state.

**Direct acceptance test.** From one deterministic keyed bucket, reserve five distinct reports in an hour and ten in a day; the next report at each boundary must return its exact quota scope without partial counters or submission rows. Advance beyond the declared staging TTL and 30-day metadata window, execute the supported sweep, and assert staged prose and expired counters/status rows are absent while a live leased/delivered record remains consistent. The test must use the real migration, not only the in-memory fake.

### FA-SYS-003 — P1 — The application ignores idempotent commit results and can publish stale candidate state

**Evidence and failure mechanism.** `MemoryPersistence` and `IndexedDbPersistence` intentionally return an existing durable receipt before re-evaluating revision/fence when the same command ID and payload fingerprint already exist. `AuthoritativeRiverholdRuntime.#commit` awaits `commitTransition` but discards its `idempotent`, `receipt`, and `head` result; it always installs `prepared.postState`, constructs its own `postHead`, and appends the prepared events.

Under two-tab interleaving, tab B can commit the same revision/kind command and then advance the durable head before tab A's blocked write resumes. Tab A receives an idempotent result containing the newer durable head, ignores it, and publishes its older prepared projection as authoritative. The durable ledger is not corrupted, but the durable-before-visible invariant and the new diagnostic world-head claim are violated until the stale tab's next failure or reload.

**Affected files.** `apps/web/src/authoritative-runtime.ts`, `packages/persistence/src/memory.ts`, `packages/persistence/src/indexeddb.ts`, `apps/web/src/runtime.worker.ts`, and `apps/web/src/authoritative-runtime.test.ts`.

**Required correction.** Treat `CommitTransitionResult` as authoritative. A non-idempotent result must exactly match the prepared receipt/head before installation. An idempotent result must never install the candidate blindly: rehydrate and replay the returned durable head, or safe-stop with a typed stale/idempotent divergence error. Apply the same rule to rejected-command duplicates where later head movement is allowed.

**Direct acceptance test.** Block runtime A immediately before persistence, let runtime B commit the identical command and at least one later command, then release A. Assert A never returns or diagnoses its prepared lower revision as healthy. It must either replay to B's exact state/head or return a typed safe-stop, while IndexedDB retains one copy of the duplicate command and the later durable batch.

### FA-SYS-004 — P1 — Reload replay does not fail closed on unsupported ledger versions

**Evidence and failure mechanism.** `replayLedger` validates version fields only when its optional `ReplayManifest` argument is supplied. `AuthoritativeRiverholdRuntime.initialize` does not load or pass that manifest. The replay loop checks run/region, sequences, hashes, and causal parents, but not `WorldBatchHeader.schemaVersion`, `WorldEventEnvelope.schemaVersion`, or `engineVersion`. Persistence read methods return stored `data` without schema validation. In particular, the batch hash excludes the batch-header schema version, so changing only the stored header schema to a future/unknown value preserves every current hash and replay result. The application then reports the world healthy.

This directly contradicts the blocking bar and security rule that unknown saved versions fail closed without presenting current history.

**Affected files.** `packages/sim/src/replay.ts`, `apps/web/src/authoritative-runtime.ts`, `packages/persistence/src/indexeddb.ts`, `packages/persistence/src/validation.ts`, `tests/unit/systems/simulation.test.ts`, and `apps/web/src/authoritative-runtime.test.ts`.

**Required correction.** Require the immutable experiment/replay manifest on every application replay and validate exact supported manifest, snapshot, header, event, engine, world-schema, determinism, and replay versions before reduction. Validate stored outer records agree byte-for-byte with the header/event carried in `data`; do not rely on TypeScript casts at the storage boundary.

**Direct acceptance test.** Persist a real non-genesis batch, mutate only `batch.data.schemaVersion` to `future-unsupported` while leaving all hashes and the outer row unchanged, and reload. The Worker must fail closed before returning any projection or healthy diagnostic head. Repeat independently for event schema/engine version, manifest version, outer/data disagreement, and an unknown snapshot schema; assert no durable record changes.

### FA-SYS-005 — P1 — Canonical return responses accept dangling related-event references

**Evidence and failure mechanism.** `RespondOnReturn` validates that no prior response exists, but it never proves `priorEventId` exists, precedes the response, belongs to the same run/region, or is a legal branch event. It writes the unverified ID into both the event payload and `relatedEvents`. Replay checks only `causalParents`; it never validates `relatedEvents`. The current UI happens to select a real cognition event, but the authoritative command/replay boundary itself permits a canonical dangling or cross-purpose response link.

**Affected files.** `packages/sim/src/transition.ts`, `packages/sim/src/replay.ts`, `apps/web/src/authoritative-runtime.ts`, `tests/unit/systems/branches.test.ts`, and `tests/unit/systems/simulation.test.ts`.

**Required correction.** Validate the referenced event against authoritative run-scoped history (or against an explicit bounded reference index in Reality) before accepting the command. Replay must enforce related-event relation enums, uniqueness, same run/region, and strict prior existence just as it does for causal parents.

**Direct acceptance test.** Submit an otherwise valid patron `RespondOnReturn` with a nonexistent, future, cross-run, and wrong-branch event ID; each must produce one stable rejected receipt with unchanged state/sequence/head. Then mutate a replay fixture to contain a dangling `response-to` relation and assert replay fails before reduction.

### FA-SYS-006 — P2 — Observatory output can assert public authorization without evidence bound to that viewer/purpose

**Evidence and failure mechanism.** `projectAuthorizedChronicleToProv` is correctly read-only and accepts no Reality/persistence write capability. However, its `ChronicleProjection` input carries no viewer, purpose, authorization revision, or evidence-visibility binding. The function accepts caller-supplied `viewerKind: "public"` and `purpose: "chronicle-public"` and emits those claims for any structurally valid Chronicle projection, including one previously generated for a patron/private view. The name “Authorized” and pair check validate only a caller assertion, not authorization provenance.

There is no current application consumer, so this is dormant P2 rather than a present public leak.

**Affected files.** `packages/observatory/src/index.ts`, `packages/sim/src/chronicle.ts`, and `tests/unit/observatory/projection.test.ts`.

**Required correction.** Pass a branded/opaque projection result that binds viewer kind, purpose, revision, and visibility-policy version at `projectChronicle`, or have the Observatory entry point perform authorization from events itself. Do not permit independent relabeling of a private projection as public.

**Direct acceptance test.** Build one Chronicle containing patron-visible counsel/belief evidence, then try to serialize it with a public viewer/purpose. The API must reject it. A Chronicle generated through the public authorization path must serialize, contain only public evidence IDs, and remain byte-stable.

### FA-SYS-007 — P2 — The local feedback queue trusts future-dated and unbounded stored records

**Evidence and failure mechanism.** `LocalFeedbackQueue.list` treats browser storage as parsed objects, but `isReport` checks only broad scalar types and a few enums. It does not reapply report ID/text/diagnostics/attachment byte/depth/schema bounds, and it accepts `createdAtMs` arbitrarily far in the future. A corrupt or same-origin-written record can therefore retain large nested diagnostics/image data in memory and localStorage indefinitely despite the three-report/seven-day contract.

This cannot mutate Reality and the queue is local-only, so it is P2 hardening rather than a canonical failure.

**Affected files.** `apps/web/src/feedback.ts` and `apps/web/src/feedback.test.ts`.

**Required correction.** Validate every loaded field with the same closed schema and byte/depth/image bounds used at creation, reject future timestamps beyond a small clock-skew allowance, and remove malformed storage on read without throwing or pausing gameplay.

**Direct acceptance test.** Seed localStorage with a future-dated report, oversized text, oversized data URL, malformed observer object, unknown keys, and a valid report. `list()` must return only the valid report, rewrite storage to only that bounded record, and leave an independently running world dispatch unaffected.

## Surviving controls and explicit non-findings

- **Reality authority and ordinary atomicity:** candidate state is prepared without mutating the input and installed only after a normal successful persistence transaction. Accepted world events, decision record, receipt, and head share one IndexedDB transaction. No diagnostics, feedback, cognition record, or Observatory function has a direct canonical write import.
- **Determinism and zero-model liveness:** golden protocol vectors, repeated histories, 30/90/365-day runs, replay without cognition, paired hidden-fact contexts, and missing/throwing/malformed/timeout BrainPort fallbacks passed. The shipped journey directly uses Standard Brain and requires no provider/model/download.
- **Fencing:** ordinary stale-fence writes fail, two runtime instances are covered, and fencing does not enter canonical hashes. FA-SYS-003 concerns the separate duplicate-receipt fast path and application handling of its result.
- **Diagnostics/Sentinel:** category-specific allowlists redact before storage; buffers are bounded; observer output is read-only; Sentinel calls `protectReality` before recovery/freeze. No path from diagnostic contents to reducer input was found.
- **Feedback provider boundary:** exact Origin/route/MIME/size checks, mandatory verified Turnstile hostname/action, bounded provider responses, manual redirect refusal, fixed private repository paths, neutralized report Markdown, short-lived GitHub App installation credentials, and no browser credential path are present. No deployment, credentials, paid service, or public URL entered the tree.
- **Hidden-fact isolation:** the inspected decision-context policy filters records before hashing/scoring; paired hidden-secret fixtures are byte-identical; public Chronicle drops private parents. FA-SYS-006 is a later re-labeling boundary, not a failure of `projectChronicle` filtering itself.

## Uncertainties and reopen conditions

- The review did not run a live Cloudflare D1, Turnstile, or GitHub App path; none is configured or authorized. SQLite exposes the trigger logic deterministically, but provider search consistency, account limits, CPU, logging defaults, and permissions remain **NOT RUN**.
- The review did not alter IndexedDB manually in a browser to execute every unsupported-version mutant. FA-SYS-004 follows directly from the omitted manifest argument and absent version comparisons; its required browser mutation test is the closure evidence.
- The interleaved two-runtime duplicate scenario in FA-SYS-003 was code-traced rather than injected into this frozen tree because the reviewer was restricted to the review artifact. Its closure requires the specified controlled persistence test.
- Cryptographic replay detects accidental byte corruption but cannot authenticate a wholly rewritten local database against an external trust root. The finding does not demand a server or signature; it demands exact supported-version and internal cross-record validation before current code reduces stored bytes.
- Human Gate 0/A/B and Story Card evidence remain **NOT RUN**. This systems review neither tests nor upgrades product desirability, comprehension, attachment, return behavior, or distribution claims.

## Readiness condition

Founder Alpha systems readiness requires direct tests closing FA-SYS-001 through FA-SYS-005, no accepted P0, and no unmitigated P1. FA-SYS-006 and FA-SYS-007 may remain explicitly deferred only while the Observatory serializer has no consumer and feedback remains local-only/untrusted; either becomes P1 before public export or relay activation. All fixes must preserve zero-model liveness, the no-deployment/no-credentials boundary, and the separation of Reality from diagnostics, feedback, cognition audit data, and Observatory projections.
