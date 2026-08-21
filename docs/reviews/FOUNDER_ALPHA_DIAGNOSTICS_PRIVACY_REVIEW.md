# Founder Alpha diagnostics, privacy, and feedback threat review

**Purpose:** Record a fresh hostile review of Founder Alpha diagnostics, privacy, feedback, observer, Sentinel, relay, and browser-network boundaries at one frozen implementation candidate.

**Status:** FROZEN INDEPENDENT REVIEW — NOT READY; no P0, five P1, and two P2 findings

**Authority boundary:** This review records evidence and objections only. It does not change Reality, accepted product or engineering decisions, the Founder Alpha plan, release status, or the source ledger. The coordinator owns disposition and reconciliation.

**Related documents:** [authority index](../INDEX.md), [diagnostics](../engineering/DIAGNOSTICS.md), [feedback](../engineering/FEEDBACK.md), [security](../engineering/SECURITY.md), [release contract](../engineering/FOUNDER_ALPHA_RELEASE.md), [quality bar](../quality/QUALITY_BAR.md), and [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

## Frozen subject and independence

- Commit: `7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`
- Tree: `476c381034ab3601746a7e11235fe693d793782c`
- Merge base and comparison base: `main` at `74a8a7e07d0743f467dd9547ebf4193eb53d6029`
- Review worktree: `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/002-review-diagnostics`
- Review branch: `review/fa-diagnostics`
- Independence: the reviewer inspected the frozen code, tests, diff, and canonical authorities without reading or requesting any other Founder Alpha review output.
- Mutation boundary: only this review file was written. No implementation, shared authority, GitHub state, deployment, credential, paid service, or external account was changed.

## Method

The review inspected `git diff main...7319d59260555ffbe4eb2f4d58beb61d3f8a11ee` and traced the following surfaces end to end:

1. diagnostic identity and `off`/`local`/`alpha` mode selection;
2. event construction, source redaction, ring bounds, snapshot freezing, canaries, and fingerprints;
3. Sentinel protect/recover/freeze ordering and its separation from canonical Reality;
4. browser runtime instrumentation, worker error transport, world-head projection, local observer exposure, native performance support, and disabled replay capture;
5. feedback prose, image re-encoding/preview, consent, local queue bounds/deletion/expiry, and failure UI;
6. relay origin/MIME/byte/schema/Turnstile validation, D1 reservation/quota/lease state, GitHub reconciliation, fixed provider destinations, credential handling, and response bounds; and
7. browser CSP plus headed zero-egress and injected runtime-failure behavior.

Focused verification and adversarial probes were run from the frozen worktree:

| Evidence | Result |
|---|---|
| Diagnostics, browser-feedback, Worker, D1, and provider tests: six files / 40 tests | PASS |
| `pnpm test:e2e`: nine headed Chromium journeys | PASS |
| Browser route log and Chromium netlog | PASS: 360 routed requests, 39,935 netlog events, zero external attempts |
| Incident-summary bearer/GitHub-token canary through Sentinel → incident → observer JSON | FAIL: canary survived verbatim |
| Same incident across build identities `aaaaaaa` and `bbbbbbb` | FAIL: both produced `inc_480e60758e537912ce5d29d9` |
| Corrupt local feedback object with 5 MiB diagnostics and a future timestamp | FAIL: 5,243,072 serialized bytes accepted and still retained after the seven-day interval |
| In-memory D1 migration advanced from day 0 to day 40 | FAIL: staged `retained-canary` prose remained; no submission/quota deletion policy or keyed hourly quota exists in schema/trigger DDL |
| Default `off` production crash journey | FAIL: no reproduction ID and no feedback affordance were rendered |

The focused suite passing is useful control evidence, but the adversarial failures show that its present oracles do not cover every asserted privacy and failure contract.

## Verdict

**NOT READY.** No P0 was found in the frozen candidate, and the shipped local path does not deploy or send feedback. However, five P1 failures violate the accepted redaction, actionable-failure, retention, quota, and untrusted-browser-storage contracts. Two P2 defects weaken incident deduplication and signal truthfulness. Founder Alpha readiness must remain blocked until every P1 is repaired or the affected optional relay claim/surface is explicitly removed and the repair is independently confirmed.

| Severity | Count | Readiness effect |
|---|---:|---|
| P0 | 0 | Explicitly none found |
| P1 | 5 | Blocks readiness |
| P2 | 2 | Correct before relying on the affected evidence/operation |

## P0 findings

None. The review found no current canonical mutation by diagnostics/feedback, no committed credential, no browser egress, and no active upload or deployment path.

## P1 findings

### FA-DP-001 — P1 — Incident summaries bypass the redaction boundary

**Failure mechanism.** `FlightRecorder.freeze` applies only Unicode normalization and length bounds to caller-supplied `safeSummary`; it does not apply the forbidden-key/value policy or a closed safe-copy catalog. `projectLocalObserver` then copies the summary into every incident header. A direct Sentinel probe using a bearer-prefixed, GitHub-token-shaped canary preserved that exact canary in serialized observer output. The current application caller happens to use authored copy, but the exported constructor does not enforce the documented source-redaction invariant.

**Impact.** Any future error-derived or incorrectly classified summary can place a credential, contact detail, URL, private fact, prompt, or other prose into an incident, observer, local feedback bundle, screenshot, or later relay adapter before a downstream filter sees it.

**Affected files.** `packages/diagnostics/src/recorder.ts`, `packages/diagnostics/src/sentinel.ts`, `packages/diagnostics/src/observer.ts`, `packages/diagnostics/src/types.ts`, `tests/unit/diagnostics/diagnostics.test.ts`, and `apps/web/src/diagnostics.test.ts`.

**Direct acceptance test.** Feed bearer/GitHub/Stripe-token, email, URL-query, prompt, hidden-reasoning, private-world, oversized, invalid-Unicode, throwing-object, and ordinary authored-copy canaries through every incident-producing API. Assert before freeze that only a closed authored summary code or safely redacted template remains, then assert none of the forbidden canaries appears in the incident, snapshot, observer JSON, local feedback JSON, or formatted relay payload. The safe user-facing copy and stable non-secret reproduction ID must remain usable.

### FA-DP-002 — P1 — The default safe-stop path hides the safe incident and displays the raw runtime error

**Failure mechanism.** `captureRuntimeFailure` creates and stores an incident, but `RiverholdApp` ignores the returned incident and switches to an early failure render. That render occurs before `FeedbackPanel`, contains no reproduction ID, and displays `runtimeError.message` received from the Worker or browser exception as technical detail. The global observer is intentionally registered only in `local` mode, so the default `off` build has no other way to retrieve the incident. A headed injected-crash probe confirmed `hasReproductionId:false` and `hasFeedback:false`.

**Impact.** The default Founder Alpha failure is not actionable through the advertised safe incident path. Testers cannot copy the reproduction ID or save the incident locally, while an arbitrary raw exception message is the only technical payload exposed to the page and therefore to a consented screenshot.

**Affected files.** `apps/web/src/RiverholdApp.tsx`, `apps/web/src/diagnostics.ts`, `apps/web/src/runtime.ts`, `apps/web/src/runtime.worker.ts`, `apps/web/src/main.tsx`, `apps/web/src/diagnostics.test.ts`, and `tests/e2e/riverhold.spec.ts`.

**Direct acceptance test.** In a production `off` build, inject Worker, IndexedDB, stale-fence, and render exceptions whose raw messages contain distinct secret/private-state canaries. Assert the failure page shows only calm authored copy plus the exact `inc_[a-f0-9]{24}` reproduction ID, exposes a bounded local-report/delete path without enabling a global observer, and contains none of the raw canaries in DOM, screenshot, local storage, or observer/report serialization. Reload must retain the already proven durable result without double application.

### FA-DP-003 — P1 — Relay staging and counters have no bounded retention implementation

**Failure mechanism.** The migration creates submissions, incidents, and quota rows but defines no expiry column, purge query, deletion trigger, or bounded cleanup entrypoint. `markDelivered` clears staged prose only after acknowledgement; a permanently retryable or abandoned reservation retains `payload_json` indefinitely. An in-memory migration probe inserted staged prose at day 0, performed later activity at day 40, and still read the original prose. Quota and dedup rows likewise accumulate indefinitely, despite the authority requiring bounded retry staging and at-most-30-day counters/status.

**Impact.** If the optional relay is ever composed, sanitized tester prose and operational metadata can outlive the disclosed retention window and D1 storage can grow without a code-enforced bound. A failed or abandoned delivery is exactly the path most likely to miss manual cleanup.

**Affected files.** `apps/feedback-worker/migrations/0001_feedback_relay.sql`, `apps/feedback-worker/src/d1.ts`, `apps/feedback-worker/src/contracts.ts`, `apps/feedback-worker/src/worker.ts`, `apps/feedback-worker/README.md`, and `tests/unit/feedback-worker/d1.test.ts`.

**Direct acceptance test.** Reserve delivered, retryable, abandoned, leased, and expired-lease submissions with canary prose around every TTL boundary; advance an injected clock; run the bounded cleanup path; and assert staged payloads are cleared/deleted at the declared retry TTL, dedup/status/quota rows do not exceed 30 days, live leases cannot be purged, delivered issue mapping remains only as long as explicitly required, cleanup is idempotent, and cleanup failure leaves relay mutation safely unavailable. Measure the maximum rows/bytes after repeated 30-day rollover.

### FA-DP-004 — P1 — The relay omits its required keyed hourly and daily abuse quota

**Failure mechanism.** The implemented trigger enforces 20 submissions per fingerprint/day, 100 globally/day, and 1,000 globally over rolling 30 days. It has no per-source keyed bucket, hourly bucket, five/hour limit, or ten/day limit. The request and repository contracts carry no privacy-preserving quota key. Turnstile and exact Origin do not provide the missing application quota, and random diagnostics/fingerprints let one accepted client consume the entire global allowance as GitHub issue mutations.

**Impact.** The relay is not deployment-ready under its own least-authority abuse/cost contract. One client can crowd out all Alpha testers and generate up to the global daily GitHub mutation ceiling without crossing a source quota.

**Affected files.** `apps/feedback-worker/src/contracts.ts`, `apps/feedback-worker/src/worker.ts`, `apps/feedback-worker/src/d1.ts`, `apps/feedback-worker/migrations/0001_feedback_relay.sql`, `tests/unit/feedback-worker/worker.test.ts`, `tests/unit/feedback-worker/d1.test.ts`, and `apps/feedback-worker/README.md`.

**Direct acceptance test.** Resolve the predeployment rotating-HMAC bucket decision without storing a raw network address; submit unique IDs/fingerprints from one keyed bucket and assert attempts six in one hour and eleven in one day return typed `429` responses before GitHub mutation, while a different bucket remains available. Assert duplicates do not consume quota twice, rotation has a defined overlap boundary, global/fingerprint limits still apply atomically under concurrency, and no raw address or stable cross-window identity reaches D1, logs, errors, fingerprints, or GitHub. If this control is deferred, the Worker must remain mechanically non-composable/non-deployable and the deployment-ready claim must be withdrawn.

### FA-DP-005 — P1 — The local queue trusts corrupt browser storage and does not enforce its byte/retention bounds

**Failure mechanism.** `isReport` validates only a few envelope fields. It does not reconstruct or bound text, diagnostics, attachment shape/data URL, total serialized bytes, or a future `createdAtMs`. `save` accepts any object passing that shallow predicate, while `list` retains future-dated records because it checks only the lower cutoff. A direct probe saved a forged 5 MiB diagnostics object (5,243,072 serialized bytes) and a timestamp one year in the future; it remained after the nominal seven-day interval. This conflicts with the security rule that browser storage is untrusted and the Alpha queue ceiling of 4 MiB/seven days.

**Impact.** Corrupt or same-origin-mutated local storage can bypass consent/schema expectations, retain private material beyond disclosure, exhaust quota, and repeatedly force large parse/stringify work. The ordinary UI creates well-formed reports, but the load boundary is explicitly required to distrust stored data.

**Affected files.** `apps/web/src/feedback.ts`, `apps/web/src/components/FeedbackPanel.tsx`, `apps/web/src/feedback.test.ts`, and `tests/e2e/riverhold.spec.ts`.

**Direct acceptance test.** Seed local storage with valid boundary records plus oversized text/diagnostics/data URLs, MIME/byte/dimension mismatches, unknown fields, malformed nested observer objects, negative/future timestamps, invalid Unicode, cycles at the API boundary, and total queues immediately below/above 4 MiB. Assert load reconstructs a closed safe schema, removes malformed/future/expired material, never returns attacker-owned nested objects, and save rejects or deterministically evicts before exceeding three reports, seven days, or 4 MiB. Storage exceptions must leave gameplay running and report the local save as failed rather than saved.

## P2 findings

### FA-DP-006 — P2 — Local reproduction fingerprints collide across builds and schemas

**Failure mechanism.** `diagnosticFingerprint` hashes reason, category, name, outcome, component, code, and invariant only. It cannot see snapshot identity, build SHA, protocol/schema version, or a normalized route. A direct probe produced the same `inc_480e60758e537912ce5d29d9` for otherwise identical failures from build identities `aaaaaaa` and `bbbbbbb`, contrary to the diagnostic authority's stated build/schema/route basis.

**Impact.** A reproduction ID can group regressions from incompatible builds or protocols, misleading local triage and any future dedup adapter. The current hosted relay computes a separate fingerprint that does include its small diagnostics projection, so this is not presently a cross-user relay collision.

**Affected files.** `packages/diagnostics/src/fingerprint.ts`, `packages/diagnostics/src/recorder.ts`, `packages/diagnostics/src/types.ts`, and `tests/unit/diagnostics/diagnostics.test.ts`.

**Direct acceptance test.** Assert identical public incident inputs with only sequence/time/session variation produce the same ID, while changes to exact build SHA, diagnostics schema/protocol version, normalized route, public error code, or invariant produce different IDs. Assert prose, identity, IP, URL query/fragment, attachment bytes, and private data cannot influence the hash.

### FA-DP-007 — P2 — Missing capability state makes absent signals ambiguous

**Failure mechanism.** The accepted mode contract requires every mode to record capabilities so unsupported signals cannot be confused with zero incidents. `DiagnosticIdentity` and `ObserverProjection` have no general capability bitmap. In `off`, native performance is simply `null`; the projection cannot distinguish disabled-by-mode, unsupported-by-runtime, unavailable monitor construction, or zero observations. Worker/network/replay availability is likewise inferred from scattered fields or omitted entirely.

**Impact.** A clean observer can overstate runtime health because missing measurement and measured zero look alike. This weakens release evidence rather than canonical Reality.

**Affected files.** `packages/diagnostics/src/types.ts`, `packages/diagnostics/src/observer.ts`, `packages/diagnostics/src/performance.ts`, `apps/web/src/diagnostics.ts`, `apps/web/src/diagnostics.test.ts`, `scripts/diagnose.mjs`, and `tests/unit/diagnostics/performance.test.ts`.

**Direct acceptance test.** For every `off`/`local`/`alpha` × supported/unsupported runtime fixture, assert the frozen observer names each optional signal with closed `disabled`, `unsupported`, `available`, or `active` state. Assert an empty measured summary is distinct from unavailable capture, mode changes update state consistently, and no capability field adds fine-grained fingerprinting data.

## Controls that survived this review

- Diagnostics events use closed categories and category-specific primitive allowlists; tested forbidden fields, unsafe values, cyclic arrays, wrong types, and throwing getters fail closed.
- Ring buffers enforce event and serialized-byte ceilings and account for eviction. Browser defaults are tighter than the canonical ceilings.
- Sentinel records a critical trigger, calls `protectReality` before one bounded recovery attempt, and does not import simulation, cognition, persistence, application, host, or network authority.
- Replay capture is a frozen disabled port with no recording side effect.
- The local observer is exposed only in explicit `local` mode and has no mutation, file, shell, browser-control, environment, or network command.
- The browser feedback UI truthfully says local-only/no relay, requires explicit diagnostics inclusion, re-encodes and previews selected raster images, disables replay/upload, bounds normal UI-created reports to three, and supports per-report/all deletion.
- The relay rejects bad origins, routes, methods, MIME, UTF-8, byte bounds, unknown fields, unconsented diagnostics, and attachments before delivery. It excludes the Turnstile token from persistence/fingerprints.
- D1 duplicate reservation, fingerprint grouping, global mutation lease, stale completion rejection, payload clearing after acknowledged delivery, and lost-response reconciliation passed the focused tests.
- Turnstile and GitHub providers use exact HTTPS endpoints, manual redirect behavior, bounded/schema-checked responses, a fixed private repository constant, injected credentials, short-lived installation tokens, and no browser credential path.
- The local web CSP denies non-self connections and runtime third-party assets; headed route/netlog validation observed zero external attempts.

## Uncertainties and not-run boundaries

- No live Cloudflare Worker/D1/Turnstile/GitHub App composition, permission inspection, credential, provider request, deployment, public abuse test, or cost measurement was run. This is an intentional authorization boundary, not evidence that those paths work.
- No physical-device, Safari, or Firefox execution was run. Chromium network and failure evidence does not establish those runtimes.
- The screenshot path re-encodes through canvas and the headed test validates the exact preview with a small PNG, but this review did not run a metadata-rich, decompression-bomb, color-profile, or browser-decoder differential corpus.
- The CSP is a document meta policy in the local artifact. No deployed HTTP response headers, framing policy, HSTS, Referrer-Policy, or Permissions-Policy were available to inspect.
- Current production incident summaries are authored constants, so FA-DP-001 requires a mistaken/future dynamic caller to leak. The direct exported boundary nevertheless fails the stated redaction invariant today.
- The normal feedback UI constructs bounded reports; FA-DP-005 requires corrupt storage or another same-origin caller. The repository explicitly classifies browser storage as untrusted, so that prerequisite does not remove the finding.
