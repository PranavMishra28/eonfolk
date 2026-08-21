# Founder Alpha diagnostics research

**Purpose:** decide the smallest safe diagnostics, replay-capture, performance, and local-observer foundation for Founder Alpha.

**Status:** DECISION-READY RESEARCH — primary sources and registry probes accessed 2026-08-21; coordinator integration and implementation evidence remain pending

**Authority boundary:** this document owns research findings and recommendations only. It does not authorize dependencies, alter Reality, define canonical product behavior, or edit the source ledger. The coordinator owns accepted decisions and canonical `S-*` rows.

**Related documents:** [002 Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md), [security](../engineering/SECURITY.md), [architecture](../engineering/ARCHITECTURE.md), [Observatory](../product/OBSERVATORY.md), [testing](../quality/TESTING.md), and [source ledger](SOURCE_LEDGER.md).

## Decision summary

1. **KEEP — structured first-party diagnostics.** Implement a small typed diagnostics package with closed event schemas, source-side allowlisting/redaction, byte-and-count-bounded rings, deterministic incident fingerprints, health projections, and Sentinel. Structured records are the diagnostic authority; they never become Reality or Chronicle evidence.
2. **REJECT FOR FOUNDER ALPHA — rrweb runtime dependency.** Do not add `@rrweb/record` or `@rrweb/replay` to the Alpha lockfile unless the one-hour falsification spike below demonstrates unique debugging value without canvas capture, privacy leakage, or budget failure. Riverhold's meaningful world is Pixi canvas: rrweb omits canvas by default, while its documented canvas replay option removes the replay iframe's script-execution sandbox. A sanitized screenshot plus structured trace covers the Alpha need with less surface [proposed S-FA-DIAG-001, S-FA-DIAG-002].
3. **KEEP — a dependency-free optional capture port.** Define a `ReplayCapturePort` whose no-op implementation is the default. This preserves a later opt-in recorder seam without coupling incidents, feedback, or gameplay to session replay.
4. **KEEP — native browser performance signals.** Use `performance.mark`/`measure`, `PerformanceObserver`, a `requestAnimationFrame` frame-time histogram, and feature-detected `longtask`/`event` entries. Do not make unsupported entry types or experimental memory measurement acceptance dependencies [proposed S-FA-DIAG-005, S-FA-DIAG-006].
5. **REJECT FOR FOUNDER ALPHA — browser OpenTelemetry.** Its official JavaScript documentation still calls browser client instrumentation experimental and mostly unspecified; it also introduces SDK/exporter/instrumentation dependencies and a backend-shaped abstraction that this local product does not need [proposed S-FA-DIAG-007].
6. **REJECT FOR FOUNDER ALPHA — an MCP SDK/server.** Implement `pnpm diagnose` and a local read-only observer projection directly. If an external MCP consumer later becomes real, expose the same projection as resource-only stdio MCP; do not expose tools, roots, sampling, prompts, elicitation, filesystem access, or HTTP. This avoids a protocol/dependency burden while retaining a narrow migration path [proposed S-FA-DIAG-008, S-FA-DIAG-009].

These recommendations fit one solo builder, approximately $0 spend, no deployment or credentials, the current local-first architecture, and the need to preserve a compelling Standard-Brain game when every diagnostic facility is unavailable.

## Current repository fit

**VERIFIED FACT — local inspection.** The workspace is a strict TypeScript/pnpm monorepo with a Vite/React/Pixi web app and pure protocol, simulation, cognition, persistence, and Observatory packages. It currently has no replay, telemetry, MCP, logging SDK, server framework, or analytics dependency. Browser benchmark code already uses native `PerformanceObserver`; the runtime includes a user-visible fail-closed boundary. Root runtime dependencies are exact-version pinned and the lockfile is tracked.

**INFERENCE.** A first-party diagnostics package fits the existing typed-boundary style and avoids importing browser/UI concerns into simulation. A generic telemetry SDK would duplicate rather than simplify the few Alpha boundaries that matter.

**Required package boundary.** The diagnostics package may depend on protocol-safe types or receive already-authorized projections. Simulation, protocol, cognition, and persistence core must not import diagnostics. Integration calls diagnostics after typed boundary outcomes or through injected sinks; a throwing/unavailable sink is swallowed at that boundary and cannot alter the command result.

## rrweb 2.1.1 evaluation

### What is verified

- **VERIFIED FACT.** On 2026-08-21, the npm registry reports stable `@rrweb/record@2.1.1` and `@rrweb/replay@2.1.1`, both MIT. The project guide deprecates the legacy `rrweb` entry point for new projects and recommends the scoped record/replay packages [proposed S-FA-DIAG-001, S-FA-DIAG-003].
- **VERIFIED FACT.** The recorder defaults mask only password inputs. It provides `blockClass`/`blockSelector`, `maskTextClass`/`maskTextSelector`, `maskAllInputs`, per-input masking, sampling, and periodic full-snapshot checkout. Therefore privacy requires explicit fail-closed configuration and tests; installation alone is unsafe [proposed S-FA-DIAG-001].
- **VERIFIED FACT.** rrweb's guide explains that replay is an incremental snapshot chain. Keeping the last two segments with `checkoutEveryNms: 60_000` yields an approximate 60–120-second window; it does not provide an exact last-N-event/time ring [proposed S-FA-DIAG-001].
- **VERIFIED FACT.** Canvas is not recorded by default. Recording it must be enabled, and replaying it with `UNSAFE_replayCanvas` adds `allow-scripts` and opts out of sandbox script-execution protection [proposed S-FA-DIAG-002].
- **VERIFIED FACT — measured immutable assets.** The official versioned CDN asset for `@rrweb/record@2.1.1` measured 162,124 bytes raw and 34,643 bytes gzip. `@rrweb/replay@2.1.1` measured 413,436 bytes raw and 87,736 bytes gzip. These are standalone published ESM artifacts, not a Vite tree-shaken application delta [proposed S-FA-DIAG-003].
- **VERIFIED FACT — registry/advisory probes.** The resolved record-only graph described below had no `preinstall`, `install`, or `postinstall` fields and returned zero matching GitHub reviewed advisories for the probed exact versions on the access date. Absence from one database is not proof of safety [proposed S-FA-DIAG-003, S-FA-DIAG-004].

### Exact proposed dependency graph

Installing exact `@rrweb/record@2.1.1` with the access-date registry resolution would add 14 runtime package names. Adding replay would add `@rrweb/replay@2.1.1` as a fifteenth while sharing the rest.

| Package | Access-date resolved version | License | Concern |
|---|---:|---|---|
| `@rrweb/record` | 2.1.1 | MIT | Direct wrapper; depends with carets on rrweb/types/utils |
| `@rrweb/replay` | 2.1.1 | MIT | Only if replay UI is built; keep out of player route |
| `rrweb` | 2.1.1 | MIT | Transitive monolithic implementation despite legacy direct entry being deprecated |
| `@rrweb/types` | 2.1.1 | MIT | Shared types |
| `@rrweb/utils` | 2.1.1 | MIT | Shared utilities |
| `rrdom` | 2.1.1 | MIT | Reconstructed DOM layer |
| `rrweb-snapshot` | 2.1.1 | MIT | DOM serialization; brings PostCSS |
| `@types/css-font-loading-module` | 0.0.7 | MIT | Runtime-declared type package |
| `@xstate/fsm` | 1.6.5 | MIT | State-machine transitive |
| `base64-arraybuffer` | 1.0.2 | MIT | Encoding transitive |
| `mitt` | 3.0.1 | MIT | Event emitter transitive |
| `postcss` | 8.5.26 | MIT | Caret-resolved; security history means lock/audit exact result |
| `nanoid` | 3.3.18 | MIT | PostCSS transitive; exact patched access-date resolution |
| `picocolors` | 1.1.1 | ISC | PostCSS transitive |
| `source-map-js` | 1.2.1 | BSD-3-Clause | PostCSS transitive |

Registry manifests use caret ranges for several transitives. An accepted install must inspect the actual `pnpm-lock.yaml` diff, retain exact direct versions, run the cohort/security/license checks, and reject an unexpected resolver change. The published manifests contain build, prepare, or prepublish scripts in places, but the access-date runtime graph exposes no dependency `preinstall`, `install`, or `postinstall` hook. Re-probe the packed artifacts and final lockfile rather than relying on this dated table.

### Privacy and capture contract if the rejection is reopened

The following is the minimum acceptable spike configuration, not an implementation instruction:

- lazy-load only after explicit `LOCAL` activation or per-bundle `ALPHA` consent;
- `maskAllInputs: true` and typed `maskInputOptions` covering every input kind;
- block feedback text, attachment preview, provenance detail, any private/cognitive content, reproduction tokens, and any element capable of carrying arbitrary text or URL-bearing attributes;
- `recordCanvas: false`, `recordCrossOriginIframes: false`, `inlineImages: false`, `collectFonts: false`;
- no console, network, canvas, WebRTC, or third-party plugin;
- disable mousemove and high-volume sampling not required to reproduce a semantic action;
- `checkoutEveryNms: 60_000`, retain at most the current and immediately preceding segment, and enforce a second hard serialized-byte cap;
- freeze an immutable copy only on Sentinel incident, explicit feedback consent, or explicit developer capture; call the stop function before copying; start a new generation only after the frozen bundle is dispositioned;
- run redaction at DOM serialization, then validate the emitted event against an allowed rrweb-event envelope before it reaches a ring, IndexedDB, preview, file, upload, or issue body;
- never treat replay frames or inferred clicks as authoritative events, causal evidence, or proof that Reality committed.

**Objection.** rrweb masking is selector/configuration based and is not a general information-flow proof. DOM attributes, late-added nodes, shadow DOM, error text, or a newly introduced input can bypass an incomplete classification.

**Objection.** With canvas disabled, the replay can show menus and semantic controls but not the visually dominant Riverhold state. With canvas enabled, volume increases and safe replay conflicts with rrweb's documented `UNSAFE_replayCanvas` requirement. A single sanitized screenshot at freeze time is more useful for this Pixi slice.

### Fastest rrweb falsification test

Time-box to one hour only if the coordinator reopens the dependency:

1. Capture a deterministic 10-minute Mara path at 390×844 and 1366×768 with `recordCanvas: false`, two 60-second segments, and all restrictive settings above.
2. Seed canaries in input values, feedback text, DOM text, data attributes, URL query/fragment, error messages, stacks, Chronicle allegations, cognitive records, and world-private values.
3. Freeze on one injected persistence incident and one explicit feedback action. Search the serialized bundles and rendered replay for every canary.
4. Ask a zero-context developer to diagnose the injected incident using (a) structured trace plus sanitized screenshot and (b) the same evidence plus rrweb DOM replay. Retain rrweb only if (b) changes the correct diagnosis or reproduction steps.
5. Measure player-route gzip delta, capture CPU/p95 frame regression, heap, events/minute, serialized bytes/minute, and freeze latency. Pass only if every canary is absent, canvas omission is acceptable, no unsafe replay option is used, and the measured value fits the diagnostics budgets below.

Failure at any step confirms the rejection; it does not trigger weaker masking or a budget waiver.

## Structured Flight Recorder contract

### Closed event model

Every record has `schemaVersion`, `kind`, `severity`, `component`, `sessionSequence`, monotonic observation time, optional simulation time/revision, typed outcome code, correlation IDs, and a closed kind-specific payload. No arbitrary metadata bag is allowed.

Retained kinds should be limited to:

- command requested, validated/rejected, commit started/completed/aborted, and publish completed/failed;
- worker start/ready/error/restart/unavailable;
- persistence load/save/replay/fence/quota/corruption outcomes;
- cognition boundary/proposal validation/fallback using proposal type and outcome code only;
- Chronicle projection start/result with authorized interval/counts only;
- route, safe network summary, browser error category, and UI state transition;
- performance mark/measure, frame histogram summary, supported-entry capability, and bounded long-task/event summaries;
- Sentinel invariant detection, frozen-window reference, recovery attempt/result, and user-safe reproduction ID.

Explicitly forbidden fields include prompt text, provider stream, hidden reasoning, raw private/canonical state, event or snapshot bodies, whole hash preimages, user/feedback text, arbitrary error messages, full stack strings, full URLs, headers, bodies, cookies, tokens, credentials, filesystem paths, DOM snapshots, and unbounded arrays/maps.

### Redaction order

1. The call site selects one typed event constructor.
2. The constructor copies only allowlisted primitive/enum fields and length-bounds them.
3. Identifiers are converted to approved opaque IDs or one-way diagnostic correlation tokens; URLs become route IDs plus same-origin status, never query/fragment.
4. Stack input, if any, is parsed immediately into at most three allowlisted module/function tokens; raw stack/error objects are discarded.
5. The closed record is schema-validated.
6. Only the validated record enters the memory ring, persistent ring, preview, export, or upload path.

This is source-side minimization, not a later regex scrub. OWASP likewise advises excluding tokens, session IDs, credentials, sensitive data, and opted-out data; validating untrusted event data; sanitizing before output; and bounding retention [proposed S-FA-DIAG-010].

### Bounds and modes

These are initial implementation budgets to falsify with measurement, not permission to consume them automatically:

| Mode | Memory | Local persistence | Network | Performance budget |
|---|---:|---:|---|---|
| `OFF`/core | 128 records and 128 KiB serialized maximum | none, except an explicitly frozen Sentinel incident capped at 256 KiB | none | no more than 1% p95 frame-time regression and 0.5 ms p95 record call |
| `LOCAL` | 2,048 records and 2 MiB maximum | rolling 8 MiB or 24 hours, whichever is reached first; frozen incidents count inside a 16 MiB total cap | none | no more than 3% p95 frame-time regression and 1 ms p95 record call |
| `ALPHA` | 512 records and 512 KiB live maximum | 4 MiB queue, seven-day expiry, explicit delete/retry controls | only explicit consented bundle; 1 MiB diagnostics maximum, separately bounded screenshot | no more than 3% p95 frame-time regression; upload work outside animation-critical slices |

Count and bytes both bind; whichever limit is reached first evicts oldest complete non-frozen records. Frozen bundles never make gameplay fail: if the total cap is full, create a minimal incident receipt with the fingerprint and `capture-truncated` flag. A storage failure demotes to the in-memory bound. Diagnostics never request persistent-storage permission and never stop Standard Brain/world progress.

### Stable incident fingerprint

Canonicalize and hash only this versioned tuple:

`fingerprintVersion | invariantCode | componentCode | boundaryCode | outcomeCode | top allowlisted module/function token | engine/schema major`

Use Web Crypto SHA-256 where available and a tested deterministic pure fallback only if the existing runtime already has one. Do not include simulation time, sequence, random ID, raw message, free text, URL, state hash, citizen identity, or stack address. The displayed reproduction ID is a short checksum-prefixed encoding of the full fingerprint plus a separate incident occurrence ID; dedup uses the full fingerprint.

Property tests must prove same-category perturbations deduplicate, distinct invariant/boundary/outcome tuples do not, order/canonicalization is stable, and no fingerprint input contains a forbidden canary.

## Sentinel contract

Sentinel is a validating application guard, not a second reducer or compensating world authority.

1. Detect a named invariant failure at a typed boundary.
2. Prevent the candidate command/batch from crossing the commit or publish barrier. If commit status is uncertain, reload and verify the persisted head rather than guessing or replaying the command.
3. Freeze the bounded structured window and create an incident receipt. Diagnostics failure cannot replace the original invariant outcome.
4. Attempt only an enumerated recovery such as worker restart from verified head, persistence reload, semantic-view fallback, or diagnostics demotion.
5. Show a calm authored message with the reproduction ID and safe choices (`Retry safe view`, `Continue without diagnostics`, or `Reload verified world` as applicable).
6. Record recovery outcome outside Reality; never synthesize, delete, or rewrite canonical events to make the incident disappear.

Blocking tests inject failure before/after validate, append, snapshot, publish, worker message, IndexedDB transaction completion, Chronicle projection, and diagnostics write. At every point, either the original batch is durably present once and replay-verifiable or canonical head/state/PRNG remain byte-identical to pre-command state.

## Browser performance instrumentation

**VERIFIED FACT.** Performance Timeline specifies `PerformanceObserver`, feature detection through `supportedEntryTypes`, buffered delivery for some entry types, dropped-entry reporting, and recommends observing only needed entry types then disconnecting to limit overhead. Browser buffering is not an unbounded continuous store [proposed S-FA-DIAG-005].

**VERIFIED FACT.** The Long Tasks API reports main-thread tasks exceeding 50 ms but has its own privacy considerations. Event Timing exposes interaction timing/INP-related entries. Both must be feature-detected rather than assumed [proposed S-FA-DIAG-006].

**UNRESOLVED.** Cross-browser support for the exact `longtask`, `event`, and memory APIs on the final Alpha matrix. `measureUserAgentSpecificMemory()` remains limited and experimental in current MDN documentation, so it is developer evidence only, never a release gate [proposed S-FA-DIAG-011].

Implementation recommendation:

- always collect authored `mark`/`measure` entries for world meaningful-display, worker ready, persistence load, catch-up, Chronicle, Story Card, and feedback freeze;
- calculate frame-time histograms from the existing render loop/rAF timestamps rather than emitting each frame;
- observe `longtask` and `event` only when named in `supportedEntryTypes`; aggregate count, max, p50/p95 bucket, and time window, not raw attribution/interaction content;
- record a capability bitmap so absence is distinguishable from zero events;
- sanitize resource timing to known local asset category and duration/size buckets; never store full resource names/URLs;
- disconnect observers during teardown and prove diagnostics-off builds do not register optional observers.

## Local observer and MCP decision

### Alpha surface

Implement a read-only projection consumed by `pnpm diagnose` and, if useful, a developer-only page served by the existing localhost process. The only named reads are:

- health;
- incident list and one sanitized incident;
- session summary;
- typed trace interval;
- performance summary;
- network summary;
- reproduction recipe;
- artifact inventory;
- bounded world-head summary.

There are no generic query, file, SQL, shell, browser-control, model, upload, delete, retry-world-command, or mutation operations. Responses use the same projection/redaction code as feedback preview. World-head output is revision, event/batch counts, engine/schema versions, verification status, and a diagnostic projection digest—never raw Reality or a whole-state hash usable as a substitute for authorization.

For any HTTP developer view: bind `127.0.0.1`, validate exact `Host` and `Origin`, reject cross-origin requests, expose GET-only fixed paths, set `Cache-Control: no-store`, disable CORS, impose response byte/time/rate limits, and use an unguessable process-lifetime capability for non-navigation JSON reads. The current MCP Streamable HTTP specification independently requires Origin validation, localhost binding for local servers, and authentication because of DNS-rebinding risk [proposed S-FA-DIAG-008].

### Why not MCP now

**VERIFIED FACT.** MCP's current revision is `2026-07-28`; it is stateless per request, changed transport semantics, and deprecates roots, sampling, and logging for new implementations. The v2 TypeScript SDK is the stable line for this revision [proposed S-FA-DIAG-008, S-FA-DIAG-009].

**VERIFIED FACT — registry probe.** `@modelcontextprotocol/server@2.0.0` is MIT, reports unpacked size 6,299,914 bytes, and depends on exact `@modelcontextprotocol/core@2.0.0` plus `zod^4.2.0`; core also depends on Zod. The exact server version returned no matching GitHub reviewed advisory on the access date. This is package footprint, not bundled application cost [proposed S-FA-DIAG-012].

**INFERENCE.** An actual MCP server gives Founder Alpha no player value and creates protocol compatibility, executable local-server, client-discovery, and access-control work. The requirement is an MCP-like read-only observer, which a typed local projection satisfies more directly.

If a real consumer later requires MCP, use current `2026-07-28` resource-only stdio:

- expose only fixed `eonfolk-diagnostics://` resources backed by the projection above;
- declare resources only; no tools, prompts, roots, sampling, elicitation, subscriptions, or HTTP;
- accept no filesystem path/template and never expose `file://` resources;
- pin reviewed SDK/core/Zod versions and protocol era; re-probe licenses, install hooks, advisories, and client interoperability;
- keep the server a client-launched subprocess with no ambient credentials or network access.

The current MCP resource specification requires URI validation, access control, permission checks, and path sanitization. The stdio binding is newline-delimited JSON-RPC between a client and its child process [proposed S-FA-DIAG-008].

## Rejected alternatives

| Alternative | Decision | Reason |
|---|---|---|
| Full DOM/canvas session replay by default | Reject | Privacy/volume; Pixi canvas requires explicitly unsafe replay mode |
| Hosted replay/analytics SaaS | Reject | Cost, credentials, third-party data, network dependency, and no Alpha need |
| Console/network rrweb plugins | Reject | Raw console/request material conflicts with closed schemas and minimization |
| OpenTelemetry browser SDK/exporter | Reject | Experimental browser instrumentation and unnecessary dependency/backend surface |
| Sentry or another general RUM SDK | Reject without separate research | Same hosted/privacy/dependency problem; structured local incidents meet current scope |
| Raw `console.error`/stack upload | Reject | Can contain private values, URLs, paths, and arbitrary text |
| Unbounded IndexedDB log | Reject | Quota/privacy/availability risk and no deterministic retention |
| Diagnostics as canonical events | Reject | Would let observation infrastructure mutate or redefine Reality |
| Actual MCP tools for diagnostics | Reject | Model-controlled invocation and mutation-shaped semantics are unnecessary |
| Local MCP over HTTP | Reject | DNS-rebinding/auth surface with no advantage over process-local CLI in Alpha |
| Observer access to repository/filesystem | Reject | Violates the explicit projection allowlist and expands compromise impact |

## Objections, uncertainties, and reopen evidence

### Strongest objections

- Structured traces may miss the exact visual/UI sequence that caused a defect. Mitigation: freeze one sanitized screenshot and explicit UI transition records; reopen rrweb only with the comparative diagnosis test.
- A 128 KiB core ring may be too small around catch-up or persistence storms. Mitigation: aggregation/coalescing and truncation receipts, then measure; do not silently raise the cap.
- A stack-token allowlist can reduce diagnosis quality. Mitigation: source maps stay local in `LOCAL`; translate to bounded module/function tokens before storage and include build/version, not raw paths.
- A local HTTP observer can still be reached by hostile pages. Mitigation: prefer CLI/process-local reads; if HTTP exists, bind loopback, validate Host/Origin, disable CORS, require a process token, and test DNS rebinding/cross-origin denial.

### Unresolved questions

- **UNRESOLVED:** whether sanitized screenshots alone make Pixi rendering defects reproducible.
- **UNRESOLVED:** measured OFF/LOCAL/ALPHA CPU, frame, heap, storage, bundle, and freeze costs on final integrated UI.
- **UNRESOLVED:** whether browser error stack parsing can be stable across the final Chromium/WebKit/Firefox evidence matrix without retaining raw strings.
- **UNRESOLVED:** whether an external Codex/operator workflow gains enough from true MCP resources to justify the v2 SDK after Alpha.
- **UNRESOLVED:** final hosted feedback retention and upload limits; this document supplies diagnostic-side ceilings, not relay authority.

### Reopen triggers

- Reopen rrweb rejection only if structured trace plus screenshot cannot reproduce a blocking class of UI defect and the comparative one-hour spike passes every privacy/performance gate.
- Reopen OpenTelemetry only when a real interoperable collector/backend is approved and manual typed spans become a measured maintenance burden.
- Reopen MCP only when a named external client must read diagnostics and cannot consume the CLI JSON projection.
- Tighten, never silently loosen, bounds after integrated measurements. A missed budget removes optional capture detail before weakening gameplay or Reality safety.

## Required falsification and acceptance tests

### Redaction and privacy

- Generate unique canaries in every forbidden source: prompt/private state, feedback, input/textarea/select, DOM text/attribute, URL credentials/query/fragment, headers/body, cookie/token, stack/error, file path, citizen-private record, hash preimage, and attachment metadata.
- Exercise every event constructor, incident freeze, local persistence, preview, CLI/HTTP observer, feedback queue, export, and upload formatter. Byte-search all serialized artifacts and rendered output for every canary.
- Property-test arbitrary Unicode, CR/LF/delimiters, huge strings, nested objects, getters/proxies, cyclic inputs, and unknown keys. Constructors must fail closed or reduce to a fixed safe code.
- Prove `OFF` registers no optional replay/performance/network capture and all modes make zero external requests unless the tester explicitly submits a previewed bundle.

### Bounds and failure behavior

- Property-test count and byte eviction with one oversized record, mixed severity, concurrent producers, frozen incidents, clock reversal, and serialization failure.
- Fill memory, IndexedDB, and upload queue; deny quota; throw from every recorder/storage callback. Gameplay and Standard Brain continue and canonical head is unchanged.
- Prove a 60-second rrweb checkout, if ever enabled, retains only two complete segments and a separate byte ceiling; freeze/stop is idempotent.
- Prove observer list/read responses stay within schema, byte, time, and rate limits and contain no mutation capability.

### Sentinel and authority

- Inject each named invariant before and after every persistence barrier; assert accepted-once or unchanged-head, never partial mutation.
- Kill the worker and diagnostics sink during freeze/recovery; reload only from verified persisted head.
- Assert incidents, feedback, replays, screenshots, observer reads, and recovery records cannot be supplied to any reducer entry point.
- Mutation-test the guards that prevent raw payloads, unbounded fields, commit after invariant failure, and observer mutation.

### Performance and usefulness

- Run the same fixed seed/path at diagnostics `OFF`, `LOCAL`, and `ALPHA` after full visual integration. Compare p50/p95 frame time, long tasks, input latency, meaningful-display time, heap, storage/minute, bundle gzip, and freeze latency.
- Verify unsupported PerformanceObserver entry types produce a capability flag and no failure.
- Have a fresh developer reproduce at least three injected incidents from sanitized evidence only. Failure reopens event selection, not raw logging.

## Constraint fit

| Constraint | Fit |
|---|---|
| Solo builder / 40–60-hour proof heritage | One small first-party package and CLI; reject three general SDK surfaces |
| MacBook M4 Pro / no GPU infrastructure | Native browser APIs and deterministic tests; no model/GPU need |
| Approximately $0 / no spending | Local-only recorder and observer; no SaaS, deployment, or account |
| V1 useful/free | Diagnostics are non-foundational and failure-tolerant |
| No training/proprietary data/partnership | No model or external dataset involved |
| Privacy/security | Closed schemas, pre-storage minimization, bounded retention, explicit consent |
| Reality authority | Diagnostics observe typed outcomes and cannot enter reducers or alter head |

## Proposed source-ledger rows

These rows are proposals only. The coordinator must allocate/confirm IDs and add accepted rows to `SOURCE_LEDGER.md`.

| Proposed ID | Claim | Direct source | Accessed | Class | Confidence | Reopen condition |
|---|---|---|---|---|---|---|
| S-FA-DIAG-001 | rrweb 2.1.1 scoped packages, masking options, checkout semantics, and legacy-package deprecation | [rrweb guide pinned to release commit](https://github.com/rrweb-io/rrweb/blob/3deb6e7da4528ddb33b5b7ff6a3e805d4ed14930/guide.md) | 2026-08-21 | B | High for pinned release | Re-probe before install or on rrweb release |
| S-FA-DIAG-002 | Canvas is off by default; canvas replay uses `UNSAFE_replayCanvas` and removes script-execution sandbox protection | [rrweb canvas recipe pinned to release commit](https://github.com/rrweb-io/rrweb/blob/3deb6e7da4528ddb33b5b7ff6a3e805d4ed14930/docs/recipes/canvas.md) | 2026-08-21 | B | High | Reopen only on documented safe canvas replay change |
| S-FA-DIAG-003 | Exact 2.1.1 package metadata, MIT license, graph, integrity, unpacked sizes, and immutable CDN asset-size measurements | [npm record metadata](https://registry.npmjs.org/%40rrweb%2Frecord/2.1.1), [npm replay metadata](https://registry.npmjs.org/%40rrweb%2Freplay/2.1.1), [record ESM](https://cdn.rrweb.com/record/2.1.1/dist/record.js), [replay ESM](https://cdn.rrweb.com/replay/2.1.1/dist/replay.js), and local `pnpm view`/gzip probes | 2026-08-21 | A | High for access-date registry/artifacts | Re-run against actual lockfile/install |
| S-FA-DIAG-004 | Exact access-date proposed rrweb graph returned zero matching reviewed advisories; absence is not proof of safety | [GitHub Advisory Database API](https://docs.github.com/en/rest/security-advisories/global-advisories) and local exact-version `gh api /advisories` probes | 2026-08-21 | A | High for query result; limited to indexed advisories | Re-run immediately before dependency acceptance and release |
| S-FA-DIAG-005 | PerformanceObserver supports feature detection, buffered delivery for defined entries, dropped counts, and bounded-observer guidance | [W3C Performance Timeline](https://www.w3.org/TR/performance-timeline/) | 2026-08-21 | A | High | Reopen on target-browser evidence |
| S-FA-DIAG-006 | Long tasks exceed 50 ms and Event Timing exposes interaction timing; both have defined privacy/processing semantics | [W3C Long Tasks](https://www.w3.org/TR/longtasks-1/) and [W3C Event Timing](https://www.w3.org/TR/event-timing/) | 2026-08-21 | A | High for specifications | Feature-detect and recheck browser matrix |
| S-FA-DIAG-007 | OpenTelemetry JavaScript calls browser client instrumentation experimental and mostly unspecified | [OpenTelemetry JavaScript status](https://opentelemetry.io/docs/languages/js/) and [browser guide](https://opentelemetry.io/docs/languages/js/getting-started/browser/) | 2026-08-21 | A | High | Reopen when browser status becomes stable or a backend is approved |
| S-FA-DIAG-008 | Current MCP 2026-07-28 transport/resource security and local HTTP protections; stdio is a child-process JSON-RPC binding | [MCP release](https://blog.modelcontextprotocol.io/posts/2026-07-28/), [stdio](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio), [HTTP security](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), and [resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) | 2026-08-21 | A | High | Reopen on protocol revision or transport decision |
| S-FA-DIAG-009 | MCP TypeScript v2 is stable for 2026-07-28; current revision deprecates roots, sampling, and logging for new implementations | [MCP TypeScript v2 server docs](https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/server/) and [2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/) | 2026-08-21 | A | High | Reopen on SDK/protocol release |
| S-FA-DIAG-010 | Logging should exclude secrets/sensitive data, validate and sanitize untrusted events, protect logs, and bound disposal | [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | 2026-08-21 | A | High | Reopen on threat-model change |
| S-FA-DIAG-011 | `measureUserAgentSpecificMemory()` remains experimental and limited-availability | [MDN measureUserAgentSpecificMemory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory) | 2026-08-21 | B | High for access-date compatibility note | Recheck final target browsers |
| S-FA-DIAG-012 | `@modelcontextprotocol/server@2.0.0` is MIT, depends on core 2.0.0 and Zod, and has a material unpacked package footprint | [npm server metadata](https://registry.npmjs.org/%40modelcontextprotocol%2Fserver/2.0.0) and local registry/advisory probes | 2026-08-21 | A | High for exact registry artifact | Re-probe before any install |

## Recommendation to the coordinator

Accept the structured Flight Recorder/Sentinel/native-performance/local-CLI design and explicitly close `FA-D-003` as **REJECT FOR FOUNDER ALPHA, REOPENABLE BY A ONE-HOUR VALUE/PRIVACY SPIKE**. Do not spend implementation time integrating rrweb, OpenTelemetry, or MCP SDKs before the game loop is polished. Preserve a no-op `ReplayCapturePort` and a typed read-only diagnostic projection so future evidence can add a recorder or resource-only stdio adapter without changing Reality, incident, or feedback contracts.
