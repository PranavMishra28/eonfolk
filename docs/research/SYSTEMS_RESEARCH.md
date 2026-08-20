# Systems research: simulation, persistence, cognition, scale, cost, and security

**Status:** RESEARCH COMPLETE FOR SYNTHESIS

**Authority:** evidence and recommendation inputs for simulation, persistence, absence, cognition boundaries, scale, cost, and security. The corresponding `docs/engineering/*` documents own final decisions.

**Owned evidence question:** What is the smallest deterministic, local-first civilization architecture that can deliver a compelling 40–60-hour slice for one builder, remain fully useful with no model or key, and preserve a credible path to persistent public regions without committing to premature infrastructure?

**Access date for external sources:** 2026-08-20

Provisional source IDs in this report must be verified and remapped into `docs/research/SOURCE_LEDGER.md` by the coordinator.

## Evidence language

- **VERIFIED FACT:** supported by an opened primary source in the source-ledger appendix.
- **INFERENCE:** an engineering conclusion drawn from verified facts and the binding constraints.
- **PRODUCT HYPOTHESIS:** a proposition requiring implementation or player evidence.
- **UNRESOLVED:** an important uncertainty without sufficient evidence.

## Recommendation

Build a pure, deterministic discrete-event simulation in TypeScript with eight fully represented citizens, typed commands and events, seeded/versioned randomness, Standing Plans, and a deterministic Standard Brain. Persist one local world as an append-only consequential event stream plus rebuildable snapshots in IndexedDB. Advance foreground and offline time through the same event scheduler and exact piecewise aggregation; never simulate empty ticks. Keep model inference, Cloudflare, multi-region distribution, and public canonical writes out of the first slice.

Later, if attachment evidence justifies a public canonical world, place one single-writer region behind a SQLite-backed Cloudflare Durable Object, keep region IDs in V1 contracts, and shard by the smallest future unit that needs strong coordination. Do not build one global Durable Object.

This recommendation is **INFERENCE**, not a claim that the product is fun or that later scale is proven.

## Constraint fit

| Binding constraint | Resulting system rule | Fit |
|---|---|---|
| Solo builder | One simulation package, one persistence adapter, one browser world; no distributed framework | Strong |
| 40–60 focused hours | Eight-agent Proof-of-Life; no server, auth, provider adapter, vector database, or migration fleet | Strong if scope is enforced |
| M4 Pro, no owned GPU infrastructure | CPU-only deterministic simulation; optional browser-model work is a later spike | Strong |
| Approximately $0 spend | Static/local execution and IndexedDB; no required hosted compute or inference | Strong |
| $50/$300 are comparisons, not authorization | Cost envelopes are planning caps and formulas only; no purchase or deployment follows from this report | Strong |
| No training or fine-tuning | Hand-authored rules, parameters, fixtures, and evaluation contexts only | Strong |
| Useful/free V1 | Standard Brain is a complete product path, not a degraded fallback | Mandatory |
| No required keys | Onboarding, play, save, replay, and catch-up perform zero credential checks | Mandatory |

## 1. Smallest coherent architecture

### 1.1 Four boundaries

**INFERENCE:** use four explicit layers.

1. **Reality** owns authoritative world state and applies validated events.
2. **Mind** owns a citizen's beliefs, memories, relationships, goals, commitments, and Standing Plan.
3. **Brain** receives a bounded decision context and proposes typed intent. The required implementation is deterministic.
4. **Application** owns persistence, clock driving, view models, import/export, and later network adapters.

The simulation and cognition packages must not import React, Three.js, browser storage, Cloudflare bindings, or provider SDKs. The renderer reads a compact presentation projection; it does not own simulation truth.

### 1.2 Public contracts to freeze before implementation

**INFERENCE:** the first implementation plan should name, version, and test these contracts before UI work:

- `WorldCommand`: requested operation, actor, target, parameters, command ID, expected world revision.
- `WorldEventEnvelope`: sequence, simulation time, event type/version, causation ID, correlation ID, region ID, payload, engine major.
- `ScheduledItem`: due simulation time, stable priority, insertion sequence, kind, subject, payload.
- `DecisionContext`: only authorized observations, relevant beliefs/memories, legal actions, resource budget, and decision reason.
- `IntentProposal`: proposal ID, one allowed action kind, typed arguments, optional rationale stored as non-authoritative text.
- `StandingPlan`: goal reference, ordered steps, preconditions, next wake condition, contingencies, expiry/review condition, version.
- `ReplayManifest`: engine version, world schema, event schema versions, seed/PRNG version, last sequence, snapshot hash, replay-format version.

The reducer alone changes Reality. Commands and proposals can be rejected without partial mutation.

## 2. Deterministic discrete-event simulation

### 2.1 Why discrete events

**INFERENCE:** EONFOLK's interesting changes are sparse: a shift starts, stock is exhausted, a debt is due, a vote closes, a promise is broken, a relationship threshold is crossed. A fixed minute-by-minute or frame-by-frame tick would manufacture work that has no player-facing consequence. A priority queue ordered by the next meaningful boundary advances directly to the next consequential time.

The product must not equate "always alive" with "always consuming compute." Cloudflare states that inactive Durable Objects incur no duration charge and provides alarms to wake an object later; this supports, but does not require, the same sparse-event design for a future hosted region [S-SYS-08][S-SYS-09].

### 2.2 Determinism contract

**INFERENCE:** equivalent engine major, world seed, canonical command/event history, and replay manifest must produce the same canonical state hash.

Required rules:

- Simulation time is an integer domain value, not `Date.now()`.
- Quantities that affect rules use integers or documented fixed-point units, not unconstrained floating-point accumulation.
- Random choice uses one explicitly selected, seeded, versioned PRNG. Each draw is attributable to a stable subsystem or stream.
- `Math.random()`, wall-clock time, locale-dependent comparison/formatting, unordered object iteration, and random UUIDs are forbidden inside the reducer.
- Equal-time scheduled items sort by `(time, priority, insertionSequence)`; insertion sequence is monotonic and persisted.
- Canonical serialization sorts map/set keys and excludes presentation-only state.
- State hashes cover authoritative state, scheduler state, PRNG state, engine/schema versions, and last applied event sequence.
- The UI may interpolate visuals but cannot feed animation time back into Reality.
- Model output is never re-requested during replay. Only an accepted, validated action/event enters canonical history.

### 2.3 Scheduler shape

**INFERENCE:** use a binary heap in memory and persist a normalized queue in snapshots. Each scheduled item represents a meaningful boundary, not a recurring tick.

Examples:

- end of current work block;
- next meal/need threshold that could alter a plan;
- contract due date;
- inventory exhaustion under the current production/consumption rates;
- market clearing or price review;
- vote deadline;
- journey arrival;
- relationship decay threshold;
- death/illness resolution boundary;
- Standing Plan review condition.

Cancellation uses a stable item ID plus a tombstone/index, not heap surgery that can vary by runtime. Repeating activities schedule only their next boundary after resolution.

### 2.4 Analytical integration

**INFERENCE:** routine state evolves through exact, versioned functions between boundaries. For a constant rate over `[t0, t1)`, compute the total once. If a discontinuity can change the rate, schedule that discontinuity first and split the interval there.

Never silently approximate a non-linear interaction merely because the user was away. If the domain cannot be integrated exactly, convert it into bounded milestone events or accept and version a declared approximation whose error can be tested. Chunk size used to keep the UI responsive must not change results.

### 2.5 Test or reject the kernel

The kernel gate fails unless all of these pass:

- same seed and commands produce byte-equivalent canonical serialization and state hash;
- replay from genesis and replay from every stored snapshot converge;
- processing a target interval in one call or many UI-yielding chunks converges;
- rejected commands cause no mutation and consume no PRNG draw;
- event ordering is stable under equal timestamps;
- resource, ownership, life-state, authorization, and conservation invariants hold under long random command sequences;
- the world reaches a target time with every Brain adapter removed.

Property/model-based tests are a good fit for commands and invariants; fast-check documents model-based command testing, but the exact library decision belongs in the testing authority [S-SYS-07].

## 3. Mind, Standing Plans, beliefs, and bounded proposals

### 3.1 Evidence boundary

**VERIFIED FACT:** Generative Agents reports a 25-agent sandbox and an ablation in which observation, planning, and reflection contributed to judged believability [S-SYS-01]. CoALA proposes modular memory, structured action spaces, and a generalized decision loop [S-SYS-02]. DeepMind's Concordia grounds natural-language action through a Game Master/environment but requires an LLM API [S-SYS-03].

**INFERENCE:** these sources justify explicit memory, planning, and grounded action boundaries. They do not prove continuous LLM calls, natural-language world state, a vector database, or Concordia's framework is appropriate for a 40–60-hour consumer-game slice.

### 3.2 Minimal Mind representation

**INFERENCE:** store typed, provenance-bearing records.

Belief fields:

- proposition key and typed value;
- confidence on a bounded integer scale;
- source event/citizen/statement reference;
- learned simulation time;
- last confirmed time;
- visibility (`private`, `shared-with`, `public`);
- status (`active`, `contradicted`, `forgotten`).

Memory fields:

- authoritative event reference rather than duplicated causal prose;
- participants, place, and topic tags;
- bounded salience and emotional valence;
- learned/experienced time;
- source/provenance;
- optional citizen interpretation clearly separate from fact.

Goal/commitment fields:

- desired condition, utility/priority, deadline, owner, origin;
- commitment target and cancellation/breach rules;
- status and last review reason.

Standing Plan fields:

- goal reference and selected reusable strategy template;
- current step;
- explicit preconditions and resource reservation;
- next meaningful wake condition;
- typed contingency branches;
- completion, block, expiry, and replan conditions.

### 3.3 Deterministic recall

**INFERENCE:** V1 recall should be an indexed score over typed memory, not embeddings:

`score = recencyWeight + salienceWeight + participantMatch + topicMatch + goalMatch`

All weights are integers, ties use stable IDs, and the context has a fixed record/token budget. This is explainable, replayable, inexpensive, and adequate to falsify whether memory affects attachment. A vector database is rejected until lexical/typed retrieval demonstrably fails on a measured corpus.

### 3.4 Decision boundaries

Routine actions follow the Standing Plan. Replanning is allowed only at named boundaries such as:

- plan precondition failed or resource disappeared;
- goal completed, expired, or became impossible;
- important offer, law, discovery, betrayal, loss, or relationship rupture;
- job/office change, market shock, war, crime discovery, or sponsor intervention;
- a scheduled plan review.

**PRODUCT HYPOTHESIS:** rare explicit replanning will read as intentional rather than robotic. This requires a playtest comparing visible continuity and diversity against purely reactive policies.

### 3.5 Standard Brain

**INFERENCE:** the Standard Brain is the V1 product, not a fallback label. It should:

1. filter legal strategy templates by beliefs, temperament, role, commitments, and resources;
2. score them with integer utility terms and seeded tie-breaking;
3. instantiate a Standing Plan;
4. emit one bounded proposal;
5. receive rejection reasons and select a declared contingency or no-op/safe wait.

Personality affects weights and thresholds; it never bypasses law, possession, distance, knowledge, or authorization.

### 3.6 Proposal validator

Every Brain, deterministic or model-backed, returns the same closed union. The validator enforces:

- action is in the supplied allowlist;
- actor is alive, present, capable, and authorized;
- referenced entities exist and were visible in context;
- costs/resources/permissions are satisfiable at the expected revision;
- arguments pass length, numeric, enum, and referential bounds;
- no free-form code, URLs, HTML, SQL, file paths, tool calls, or nested action lists;
- at most one state-changing proposal per decision request in V1.

A rationale is untrusted presentation text. It cannot change outcome or become a fact.

## 4. Persistence, snapshots, replay, and catch-up

### 4.1 Selective event sourcing

**VERIFIED FACT:** Microsoft's current pattern guide describes append-only event streams, reconstruction by replay, snapshots as rebuildable optimizations, immutable event/versioning complications, and the substantial complexity cost of event sourcing. It explicitly says most systems do not need the pattern everywhere [S-SYS-04].

**INFERENCE:** event-source only the canonical civilization aggregate because causal history, replay, absence summaries, and migration are core product requirements. Use ordinary records for settings, cached presentation projections, asset manifests, and analytics preferences. Do not add Kafka, CQRS services, or a purpose-built event database.

### 4.2 Local-first storage

**VERIFIED FACT:** IndexedDB is transactional, asynchronous, stores significant structured data, is available in Web Workers, and is designed for offline-capable browser applications [S-SYS-05]. Browser quota and eviction behavior varies, so storage is not an unconditional durability guarantee [S-SYS-06].

**INFERENCE:** the first adapter needs four stores:

- `worlds`: manifest, metadata, current revision, selected snapshot;
- `events`: compound key `(worldId, sequence)` and indexes by time/type/entity;
- `snapshots`: world ID, event sequence, schema/engine versions, canonical bytes/hash;
- `noncanonical_artifacts`: optional raw provider traces and presentation copy, excluded from replay truth and export by default.

Append the accepted event batch and update the world head in one read-write transaction. Snapshot creation can follow in a separate transaction because snapshots are rebuildable; publish it as selected only after hash verification. Export a self-contained replay bundle so users can back up a world before hosted persistence exists.

V1 allows one writer tab. A second tab is read-only or asks to take a lease; it never races canonical writes. Multi-writer browser coordination is outside the slice.

### 4.3 Event and snapshot versioning

**INFERENCE:** persist:

- engine semantic version and determinism major;
- world schema version;
- event type and event schema version;
- cognition/proposal schema version;
- replay format version;
- PRNG algorithm/version and full state;
- last sequence and canonical hash.

Events are immutable. Read-time upcasters turn old payloads into the current in-memory type without rewriting source history. Snapshot migrations create a new snapshot and a recorded migration marker; the prior snapshot/event stream remains exportable. A public world stays pinned to an engine major until a full replay and migration rehearsal passes.

### 4.4 Replay rules

1. Load genesis or the latest verified compatible snapshot.
2. Validate manifest, snapshot bytes, and hash.
3. Apply events in sequence order through versioned upcasters.
4. Reject gaps, duplicate sequences, unknown required event types, or a hash mismatch.
5. Reconstruct scheduler and PRNG state.
6. Compare the resulting head hash with the recorded world head.

Accepted model proposals become canonical action/event records before append. Replay never invokes a model and does not depend on raw rationale.

### 4.5 Offline/catch-up behavior

There is one semantic algorithm for foreground play and absence. Gap length changes yielding and presentation, not simulation rules.

| Absence | Required behavior | Gate |
|---|---|---|
| 10 minutes | Pop meaningful due items, integrate exact routine intervals, commit one batch, render immediately | Same hash as an uninterrupted run |
| 24 hours | Same semantics; split at every discontinuity/decision boundary; build a factual absence summary from emitted events | No per-minute loop; all consequential events retained |
| 7 days | Process deterministic chunks and yield to keep the browser responsive; checkpoint verified batches | Chunk sizes converge to the same hash; interruption resumes safely |
| 90 days | Same scheduler and aggregation; show progress and permit pause/resume. If the event budget is exceeded, stop at a committed boundary rather than dropping events | No silent skip, invented history, or gap-dependent approximation |

**PRODUCT HYPOTHESIS:** a 90-day local catch-up can finish within a humane wait on the M4 Pro if routine life is expressed as intervals and milestones. This must be benchmarked; it is not established by architecture prose.

The factual absence summary may group emitted events, but grouping cannot mutate or replace canonical history. Causal copy cites event IDs and may say "contributed to" unless the engine has an explicit causal edge.

## 5. Future hosted persistence and scaling

### 5.1 Cloudflare fit, after the local gate

**VERIFIED FACT:** SQLite-backed Durable Objects offer private transactional storage and Cloudflare recommends them for new Durable Object classes [S-SYS-10]. An individual Durable Object is single-threaded with a soft workload-dependent limit around 1,000 requests/second; Cloudflare's current design guidance says to model an object around the logical atom of coordination and explicitly rejects one global singleton [S-SYS-11][S-SYS-12].

**INFERENCE:** a later `RegionDO` can be the one writer for a settlement/region. V1 can contain one region, but every entity/event/command ID includes `regionId`. Cross-region interactions use idempotent inbox/outbox events and accept delayed settlement. There are no global synchronous transactions.

**VERIFIED FACT:** each Durable Object can schedule one alarm at a time; alarms are at-least-once and use bounded automatic retries. Cloudflare recommends storing many scheduled items and pointing the one alarm at the next one [S-SYS-09].

**INFERENCE:** persist a future-event priority queue, set the one alarm to its earliest due time, and make alarm processing idempotent by event/command ID. The alarm is a wake signal, not authoritative simulation time.

### 5.2 Citizen fidelity tiers

| Citizens | Representation | Architecture implication | Status |
|---:|---|---|---|
| 8 | Full Reality, Mind, relationships, Standing Plans, exact events | First slice; one local aggregate | **Recommended** |
| 100 | Full state, but only active/affected citizens wake; sleeping citizens use interval integration | Same contracts; benchmark decision density and event volume | **INFERENCE** |
| 1,000 | Hot/warm/cold tiers; hot citizens full, warm scheduled, cold summarized but individually recoverable | Region partitioning and deterministic promotion/demotion | **UNRESOLVED until benchmark** |
| 10,000 | Multiple regions; full fidelity only where active; cohort/macro systems for cold populations with stable identities | Inbox/outbox, interest management, separate read/fanout path | **Not a V1 target** |

Promotion from cold to hot cannot invent a biography. Preserve identity, household/organization links, holdings, commitments, last state, and consequential event references even when routine detail is aggregated.

### 5.3 Human spectator tiers

| Humans | Delivery approach | Gate |
|---:|---|---|
| 10 | One region stream; periodic compact deltas | Local/load smoke test |
| 100 | Hibernatable WebSockets, batched deltas, per-client interest filter | Measure message/event mix |
| 1,000 | Separate region writer from read/fanout objects; snapshot plus cursor-based deltas; backpressure | Load test and recovery rehearsal |
| 10,000 | Regional/sharded fanout, cached public projections, admission control, abuse controls | Dedicated architecture review; no cost promise |

**VERIFIED FACT:** Cloudflare's Hibernation WebSocket API keeps connections while allowing the object to leave memory, and its current guidance recommends batching logical messages to reduce overhead [S-SYS-13]. Published connection ceilings are not practical-capacity guarantees; CPU, memory, and message mix can lower them.

## 6. Cost envelopes

### 6.1 Current source facts

**VERIFIED FACT:** Workers Free currently allows 100,000 Worker requests/day with a 10 ms CPU limit per invocation. Workers Paid has a $5/month account minimum, 10 million requests/month included, then $0.30/million, and 30 million CPU-ms included, then $0.02/million CPU-ms. Static asset requests are free/unlimited under the documented model [S-SYS-14].

**VERIFIED FACT:** Durable Objects Free currently includes 100,000 requests/day and 13,000 GB-s/day; limits hard-fail when exceeded. Paid includes 1 million requests/month then $0.15/million and 400,000 GB-s/month then $12.50/million GB-s. SQLite rows/storage have separate limits/rates. Cloudflare warns that its DO examples exclude the Worker request that calls the object [S-SYS-15].

### 6.2 Cost formula

**INFERENCE:** sustainable monthly cost must be modeled without subtracting volatile free developer quotas:

`C = workerBase + workerRequestOverage + workerCpuOverage + doRequestOverage + doDurationOverage + doRowsAndStorage + inference + observability + contingency`

Count the inbound Worker request and the Worker-to-DO/DO operation according to each product's billing model. Measure p50, p95, and worst-case CPU/duration, event writes, rows read, WebSocket messages, snapshot bytes, and model tokens/neurons. Averages alone hide denial-of-wallet risk.

### 6.3 Planning envelopes, not authorization

| Envelope | What it may support | What it does not prove |
|---|---|---|
| ~$0 | Local browser simulation, IndexedDB, exports, deterministic Brain; possibly a hard-capped Free-plan technical demo later | Sustainable public uptime, inference capacity, backups, support, or abuse resistance |
| $50/month | Illustratively: $5 Workers Paid base plus tightly capped traffic/storage/observability experiments and contingency | 1,000–10,000 concurrent humans or continuous model cognition |
| $300/month | A measured small public experiment with separate infra/inference caps and on-call stop switches | A mass social world, profitability, or an SLA |

No deployment is authorized. Before any public experiment, the owner must set platform usage notifications/limits where available, an application-level daily write/inference budget, and a kill switch that preserves read/replay while refusing costly optional work.

## 7. Security and abuse boundaries

### 7.1 Model output and user text

**VERIFIED FACT:** OWASP identifies prompt injection, improper output handling, excessive agency, and unbounded/resource consumption as material LLM-application risks. Its guidance emphasizes least functionality/permissions, downstream authorization, output validation, and resource/spend limits [S-SYS-16][S-SYS-17][S-SYS-18].

**INFERENCE:** all citizen/user/model prose is hostile data. It is never evaluated or interpolated as HTML, Markdown with raw HTML, SQL, JavaScript, shell, URL, file path, or permission expression. Render escaped text; allow only bounded typed proposal fields; authorize every action in the reducer.

### 7.2 Canonical write controls

For a later public experiment:

- spectators may read public projections without an account;
- only authenticated, rate-limited patrons can submit interventions;
- anonymous users cannot write canonical world state;
- all writes include idempotency key, actor, world revision, quota bucket, and audit event;
- origin checks, CSRF protection, secure HttpOnly/SameSite cookies, and WebSocket origin validation are required;
- per-IP, per-account, per-world, and global cost quotas fail closed;
- canonical facts and public presentation visibility are separate, so moderation can hide abusive prose without falsifying the event stream;
- no provider or owner secret reaches browser code, prompts, events, replay bundles, logs, or model context;
- Cloudflare documents encrypted secret bindings for a later Worker, but adopting them still requires explicit credential approval [S-SYS-19].

### 7.3 Data minimization

V1 should collect no real names, contacts, precise location, payment data, regulated data, or private chat. Generated citizens are fictional and clearly presented as such. World exports can contain user-authored text, so import/export size limits, MIME checks, schema validation, and warning labels are required.

## 8. Decision gates and ordered execution

### Gate 0 — contracts and fixtures (4–6 hours)

Deliverables:

- state, command, event, scheduler, Standing Plan, proposal, and replay-manifest schemas;
- one hand-authored eight-citizen seed;
- five consequential scenario fixtures;
- determinism and invariant checklist.

Pass when every authoritative/presentation field and every version owner is named. Fail if the schema contains provider, renderer, or browser-storage types.

### Gate 1 — pure simulation Proof-of-Life (12–15 hours)

Deliverables:

- seeded scheduler/reducer;
- exact interval integration;
- small economy/need/relationship/commitment loop;
- canonical hash and golden replay.

Pass when eight citizens produce an inspectable causal chain and all determinism/invariant tests pass. Stop and simplify if basic life needs per-tick work.

### Gate 2 — Standard Brain and continuity (8–10 hours)

Deliverables:

- typed beliefs/memories/goals;
- deterministic recall;
- strategy templates and Standing Plans;
- proposal validation/rejection/contingency loop.

Pass when the world progresses with no model code and citizens show explainable differences over fixed scenarios. Reject the slice if a provider is needed to create basic agency.

### Gate 3 — local persistence, replay, and absence (8–10 hours)

Deliverables:

- IndexedDB adapter and export/import;
- append/head transaction;
- verified snapshots and replay;
- 10-minute, 24-hour, 7-day, and 90-day catch-up fixtures.

Pass when genesis replay, snapshot replay, interrupted catch-up, and chunk-size variants converge to the same hash.

### Gate 4 — player-facing proof and hardening (10–13 hours)

Deliverables:

- inspectable world projection, citizen detail, causal event view, and factual absence summary;
- long-horizon property/fuzz tests;
- timing/event-volume/storage measurements on the M4 Pro;
- import/text/command security bounds.

Pass when one observer can answer who changed, why, and what happened while away without reading logs or invented prose.

### Gate 5 — contingency (4–6 hours)

Fix only evidence-backed blockers. The 46–60-hour total excludes browser-local models, hosted providers, Cloudflare, auth, multiplayer, 1,000-agent simulation, and elaborate rendering.

### Later Gate A — optional browser inference

Open only after the deterministic slice passes attachment tests. Use `MODEL_RESEARCH.md` benchmarks and licenses. The optional model must not change canonical liveness.

### Later Gate B — hosted canonical region

Open only after repeated return/attachment evidence requires a shared world. Deliver a threat model, Cloudflare account-limit reread, transactional RegionDO spike, backup/export drill, load test, and $0/$50/$300 measured sheet before deployment approval.

## 9. Strongest objections

1. **Event sourcing can consume the slice.** Microsoft's own guidance calls out its complexity [S-SYS-04]. Mitigation: use one event stream and snapshots for the civilization only; no broker, projections service, or CQRS fleet.
2. **The Standard Brain may look shallow.** Deterministic utility can become repetitive. Mitigation: visible commitments, partial beliefs, Standing Plans, seeded variety, and personality-weighted strategy templates; falsify through play, not model spend.
3. **Exact long-gap aggregation may be hard for coupled markets and relationships.** If closed-form updates cross unknown discontinuities, they can diverge. Mitigation: schedule threshold/milestone events and make aggregation functions small and property-tested.
4. **IndexedDB is not a backup.** Quotas/eviction differ by browser [S-SYS-06]. Mitigation: explicit export/import and visible backup state before a user invests deeply.
5. **One RegionDO still serializes a hot settlement.** Cloudflare's single-object throughput is workload-dependent [S-SYS-11]. Mitigation: keep region IDs and split coordination/read fanout later; do not claim 10,000-human capacity.
6. **A causal event log can imply false causality.** Sequence is not cause. Mitigation: explicit causation/correlation edges and cautious narrative language.
7. **Cost can be attacked.** Free limits hard-fail and paid usage can be induced. Mitigation: deterministic fallback, quotas, caching, backpressure, spend caps/alerts, and read-only degradation.

## 10. Rejected options

| Option | Decision | Reason |
|---|---|---|
| Fixed-step/minute simulation | Reject | Wastes work on empty time and complicates 90-day catch-up |
| Continuous LLM cognition | Reject | Violates cost, liveness, determinism, and no-key constraints |
| LLM writes Reality directly | Reject | Breaks authorization, replay, and security boundaries |
| Natural-language-only memory | Reject for V1 | Hard to validate, query, migrate, and replay |
| Vector database | Reject until measured need | More infrastructure than eight-agent typed recall requires |
| Full event sourcing for all app data | Reject | Complexity without causal/replay value |
| Kafka/NATS/Redis/Temporal/Kubernetes | Reject | No first-slice product value and unsuitable for one local writer |
| One global Durable Object | Reject | Cloudflare explicitly warns it becomes a bottleneck [S-SYS-12] |
| Full fidelity for 10,000 citizens | Reject as planning fiction | No measured event density, memory, storage, or player need |
| Anonymous canonical public writes | Reject | Abuse, moderation, and denial-of-wallet risk |
| Rust/WASM rewrite or custom WebGPU compute | Reject | No benchmark proves TypeScript is insufficient |

## 11. Unproven assumptions and reopen evidence

| Assumption | Status | Evidence that reopens the recommendation |
|---|---|---|
| Eight citizens can create attachment with deterministic planning | **PRODUCT HYPOTHESIS** | Five target-player sessions cannot explain or care about any citizen after the slice |
| Sparse meaningful events remain manageable for 90 days | **UNRESOLVED** | Benchmark exceeds the wait/storage budget or event count grows superlinearly |
| Typed recall is sufficient | **UNRESOLVED** | Fixed continuity evals fail and error analysis shows semantic retrieval, not missing world state, is causal |
| One local writer is acceptable | **PRODUCT HYPOTHESIS** | Required first-session flow demonstrably needs shared synchronous play |
| IndexedDB plus export is adequate for V1 | **UNRESOLVED** | Supported-browser quota/eviction tests or recovery drills fail |
| Region is the correct future consistency atom | **UNRESOLVED** | Load/contention tests or game design show frequent synchronous cross-region invariants |
| Cloudflare remains the best hosted fit | **UNRESOLVED** | Current license/pricing/limits, backup needs, or measured workload favor another platform |
| $50/$300 can support a small public test | **UNRESOLVED** | Measured unit costs and abuse margin exceed the envelope |

## 12. Implementation implications for authority documents

- `engineering/ARCHITECTURE.md`: isolate `sim`, `protocol`, `cognition`, and application adapters; local-first first slice, future region boundary.
- `engineering/SIMULATION.md`: freeze determinism, scheduler ordering, PRNG, fixed-point, canonical serialization/hash, reducer, and invariant rules.
- `engineering/PERSISTENCE.md`: selective event sourcing, IndexedDB stores, one-writer policy, snapshots, export/import, replay and migration.
- `engineering/COGNITION.md`: Standard Brain, typed Mind, deterministic recall, Standing Plans, proposal contract, and model-independent liveness.
- `engineering/COST_MODEL.md`: formulas and measured p50/p95/worst-case rows; free quotas separated from sustainable pricing.
- `engineering/SECURITY.md`: trust boundaries, text/output handling, canonical authorization, quotas, moderation visibility, and credential rules.
- `quality/TESTING.md`: golden seeds, property/model tests, replay/snapshot/catch-up/migration tests, and long-horizon invariants.
- `product/CHRONICLE.md`: summaries derived from event references, with sequence separated from explicit cause.

## 13. Plan-mode-safe verification

Before implementation, a planning run can safely:

- trace every proposed field to one authority document;
- walk five scenario fixtures by hand through command -> proposal -> validation -> event -> projection;
- calculate event/write/message/token units from declared assumptions;
- review failure matrices for duplicate alarm, crash between append/snapshot, unknown event version, hash mismatch, quota failure, and provider removal;
- inspect current primary pricing/limit/license pages without deploying, installing, creating accounts, or entering credentials;
- verify no first-slice deliverable requires a model, Cloudflare, an account, or a secret.

A later execution run must re-open Cloudflare pricing/limits/alarms/SQLite/secret documentation on the day of use, inspect the actual account dashboard, confirm the selected plan, set budgets/alerts, run local and remote integration tests, and record exact versions. Published documentation is not a substitute for the account's live limits.

## Source-ledger appendix — proposed rows

| Provisional ID | Claim supported | Primary source | Accessed | Type | Confidence | Reopen note |
|---|---|---|---|---|---|---|
| S-SYS-01 | Generative Agents used memory/reflection/planning and reports an ablation contribution to believability in a 25-agent sandbox | [Generative Agents paper](https://arxiv.org/abs/2304.03442) | 2026-08-20 | A, paper by authors | High for paper claim | Reopen for replication/generalization evidence |
| S-SYS-02 | CoALA proposes modular memory, structured action space, and generalized decision process | [CoALA paper](https://arxiv.org/abs/2309.02427) | 2026-08-20 | A, paper by authors | High | Framework is descriptive, not a game prescription |
| S-SYS-03 | Concordia grounds entity actions through environment/GM components and requires an LLM API | [DeepMind Concordia repository](https://github.com/google-deepmind/concordia) | 2026-08-20 | B | High | Reopen if a no-LLM mode appears |
| S-SYS-04 | Event sourcing provides replay/audit, snapshots are optimizations, and the pattern has substantial complexity/tradeoffs | [Microsoft Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) | 2026-08-20 | A | High | Reopen if source guidance materially changes |
| S-SYS-05 | IndexedDB is asynchronous, transactional structured browser storage available to workers | [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | 2026-08-20 | A/B reference | High | Confirm target-browser behavior in execution |
| S-SYS-06 | Browser storage quota and eviction behavior varies | [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | 2026-08-20 | A/B reference | High | Reopen per supported browser release |
| S-SYS-07 | fast-check documents model-based command testing | [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/) | 2026-08-20 | B | High | Verify package version/license before install |
| S-SYS-08 | Inactive/hibernated Durable Objects avoid duration charge under documented conditions | [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) | 2026-08-20 | A | High | Reopen on deployment day |
| S-SYS-09 | A Durable Object has one alarm; alarms are at-least-once with retries; many events should be stored behind the next alarm | [Durable Objects alarms](https://developers.cloudflare.com/durable-objects/api/alarms/) | 2026-08-20 | A | High | Reopen on platform version change |
| S-SYS-10 | SQLite-backed Durable Object storage is the recommended backend for new classes | [Durable Object SQLite API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) | 2026-08-20 | A | High | Validate transactions/PITR/account tier later |
| S-SYS-11 | Individual Durable Objects are single-threaded with workload-dependent throughput/soft limits | [Durable Objects FAQ](https://developers.cloudflare.com/durable-objects/reference/faq/) | 2026-08-20 | A | High for documented soft limit | Benchmark actual workload |
| S-SYS-12 | Cloudflare advises one object per coordination atom and rejects one global singleton | [Rules of Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/) | 2026-08-20 | A | High | Reopen with region contention evidence |
| S-SYS-13 | Hibernation keeps WebSockets while objects sleep; batching reduces message overhead | [Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) | 2026-08-20 | A | High | Practical connection capacity needs load tests |
| S-SYS-14 | Current Workers Free/Paid request, CPU, minimum-price, and static-asset terms | [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) | 2026-08-20 | A | High on access date | Must reopen on execution/deployment day |
| S-SYS-15 | Current DO Free/Paid compute/storage pricing and Free hard-failure behavior | [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) | 2026-08-20 | A | High on access date | Docs contain storage-limit nuances; use lower bound until dashboard confirms |
| S-SYS-16 | OWASP lists prompt injection, insecure/improper output handling, excessive agency, and consumption risks | [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | 2026-08-20 | A | High | Reopen for canonical 2026 final mapping |
| S-SYS-17 | Excessive-agency mitigations include minimal functionality/permissions and downstream authorization | [OWASP Excessive Agency](https://owasp.org/www-project-top-10-for-large-language-model-applications/2_0_vulns/LLM06_ExcessiveAgency.html) | 2026-08-20 | A | High | None |
| S-SYS-18 | Unrestricted resource consumption includes cloud-cost attacks and calls for quotas/spend controls | [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) | 2026-08-20 | A | High | Map to current release during security review |
| S-SYS-19 | Workers secrets are encrypted bindings for API keys/auth tokens | [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/) | 2026-08-20 | A | High | Confirm actual credential workflow before use |
