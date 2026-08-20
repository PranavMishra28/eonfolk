# Architecture

**Purpose:** define the package boundaries, runtime topology, and local-to-hosted migration seam.

**Status:** ACCEPTED FOR THE FIRST IMPLEMENTATION SLICE; HOSTED TOPOLOGY IS DEFERRED

**Authority boundary:** owns architectural layers, package dependencies, local-first execution, and the future region-server boundary. Simulation rules, storage semantics, cognition policy, and rendering details are owned by their linked authorities.

**Related documents:** [simulation](SIMULATION.md), [persistence](PERSISTENCE.md), [cognition](COGNITION.md), [Observatory](../product/OBSERVATORY.md), [frontend](FRONTEND.md), [security](SECURITY.md), [systems evidence](../research/SYSTEMS_RESEARCH.md), future `docs/exec-plans/active/001-foundation.md`

## Owned decision

The first slice is a strict TypeScript/pnpm workspace with a pure protocol package, pure deterministic simulation package, provider-neutral cognition package, React Router/Vite browser application, simulation Web Worker, and IndexedDB persistence adapter. There is no server, account, deployment, hosted inference, multiplayer, or cross-region implementation.

The four hard layers are:

1. **Reality:** authoritative state, reducer, scheduler, invariants, and canonical events.
2. **Mind:** typed beliefs, memories, relationships, goals, commitments, and Standing Plans.
3. **Brain:** an untrusted producer of one typed intent proposal. The Standard Brain is mandatory.
4. **Application:** validation, persistence, time driving, projections, renderer, and later networking.

Only Reality may change canonical state. Application validates every command or proposal before an atomic state transition. Mind cannot grant authority. Brain never writes Reality.

This supports the long-term World/Chronicle/Observatory identity without implementing a platform now. World owns persistent grounded behavior, Chronicle projects factual causal history, and Observatory may later inspect the same bounded provenance. The consumer loop remains primary.

## First-slice topology

```text
React Router/Vite application
  ├─ semantic DOM controls and Chronicle projections
  ├─ exactly one world renderer
  ├─ simulation Web Worker
  │    ├─ packages/protocol: versioned types only
  │    ├─ packages/sim: Reality, scheduler, reducer, hashes
  │    └─ packages/cognition: Mind, Standard Brain, adapter interface
  └─ IndexedDB PersistencePort adapter
```

The implementation plan may choose different directory names only if it records the mapping before code begins. The dependency direction remains fixed:

```text
protocol <- sim
protocol <- cognition
protocol <- application adapters/UI
sim <- application orchestration
cognition <- application orchestration
```

`sim` and `protocol` must not import React, browser storage, provider SDKs, Cloudflare bindings, Three.js, PixiJS, or any renderer. `cognition` may depend on protocol types but not provider SDKs in the first slice. The renderer consumes presentation projections and cannot feed frame time, wall time, or pointer state into Reality.

## Contract registry

These interfaces are frozen conceptually before UI work. Their single field-level authorities are:

| Contract | Authority | Architectural role |
|---|---|---|
| `WorldCommand` | [Simulation](SIMULATION.md) | Idempotent, revision-checked input to Reality |
| `WorldEventEnvelope` / `WorldBatchHeader` | [Simulation](SIMULATION.md) | Run-scoped ordered events and replayable canonical world-head chain |
| `DecisionContext` | [Cognition](COGNITION.md) | Bounded, visibility-filtered input to any Brain |
| `IntentProposal` / `DecisionExplanation` | [Cognition](COGNITION.md) | One untrusted typed action plus grounded decision receipt |
| `CognitiveDecisionRecord` / `DecisionTraceProjection` | [Cognition](COGNITION.md) | Raw citizen-private audit trace plus viewer-authorized disclosure |
| `ReplayManifest` | [Persistence](PERSISTENCE.md) | Versioned snapshot and event interval needed to replay |
| `ExperimentManifest` | [Persistence](PERSISTENCE.md) | Immutable run/seed/version/cognition/intervention/parent identity |
| `PersistencePort` / `CommandReceipt` / `CatchUpOperationReceipt` | [Persistence](PERSISTENCE.md) | Crash-safe world/decision/catch-up commit, replay, and idempotency boundary |

Provider names and browser APIs never appear in authoritative world contracts. Optional provider/model/version/artifact values appear only as nullable provenance inside cognitive/experiment records. `regionId` and `runId` appear now even though the slice has one local run/region.

## Three-ledger data architecture

- **Canonical World Ledger:** accepted `WorldBatchHeader` plus `WorldEventEnvelope` records and canonical world head, all run/region scoped; reducer input and only source of world-state change.
- **Cognitive/Decision Ledger:** append-only bounded consequential-decision records; audit/explanation input, never reducer authority.
- **Experiment Manifest:** immutable identity/configuration for the run; version/provenance input, never a mutable world event stream.

The stores share typed IDs and atomic transition boundaries but not authority. Canonical replay consumes only the manifest, snapshot, and accepted Canonical World Ledger interval of batch headers plus events. A future Observatory can query authorized projections of all three; the first slice has no dashboard, query service, fork UI, dataset pipeline, or model-comparison surface.

## First-slice scope fit

The architecture serves exactly one crafted settlement, eight citizens, three resources, four legible behavior families, one bilateral exchange, one conversion/repair recipe, relationships sufficient for one social consequence, one sponsored citizen, one causal Chronicle story, one immutable run manifest, and bounded provenance for already-required consequential decisions. Generalized economy, institution kernel implementation, Observatory UI, fork execution, experiment orchestration, content frameworks, distributed coordination, analytics/dataset pipelines, and plugin systems are excluded.

The roughly 52-hour allocation is a scope ceiling, not evidence of completion. If integration exceeds it, remove deferred mechanics or visual polish. Do not add infrastructure, a framework, or generated boilerplate to preserve an overlarge scope.

## Long-term target after both product gates

Only after Proof of Life and Proof of Attachment pass may a hosted design be implemented:

- React Router/Vite remains the client and public Chronicle/share routes become server-rendered.
- A Cloudflare Worker owns HTTP/orchestration.
- One SQLite-backed `RegionDO` is the single writer for each bounded region, starting with one.
- A `RegionDO` can reuse simulation/event/receipt semantics, but server persistence is a new adapter and security design—not a drop-in replacement for IndexedDB.
- Cross-region work uses idempotent inbox/outbox messages and accepts delayed settlement; no global synchronous transaction is assumed.
- Append-only events, verified snapshots, a seeded scheduler, and idempotent alarms/commands remain authoritative.

This is a migration option, not an approved deployment. Cloudflare pricing, account limits, plugin permissions, backups, and alternatives must be revalidated on the execution day. One global Durable Object is rejected.

## Resulting implementation behavior

- The world runs, saves, reloads, catches up, and replays with every external model and server adapter absent.
- Canonical state changes enter through one typed validation/reducer path.
- Presentation can be discarded and rebuilt from canonical data.
- Pure domain logic can later be reused by a region adapter; authentication, outbox/alarm, backup, moderation, and history-import semantics must be designed separately.
- Engine, schema, cognition, PRNG, and replay versions travel with saved history.
- World truth remains distinct from each citizen's observations, private knowledge, beliefs, memories, plans, and communicated claims.
- Original structured proposals and validator outcomes survive in raw citizen-private audit records; public/patron consumers receive filtered trace projections, and canonical replay never depends on reproducing cognition.
- Future institutions can compose shared membership/role/rule/asset/authority/agreement/succession/enforcement concepts without shipping those systems in Gate A/B.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Server-first or Cloudflare-first slice | Consumes solo-builder hours before attachment is proven and creates cost/deployment obligations |
| Continuous online simulation | Violates the $0/no-server default; sparse catch-up provides the product behavior |
| LLM-centric architecture | Breaks zero-inference liveness, replay, and cost constraints |
| Full CQRS/event sourcing for all application data | Causal history warrants one event-sourced world aggregate, not a service fleet |
| One global authority object | A future throughput and fault-domain bottleneck |
| Rust/WASM or custom WebGPU compute now | No measurement shows strict TypeScript is insufficient |
| Shared mutable state between renderer and simulation | Makes authoritative outcomes dependent on presentation timing |

## Unproven assumptions and reopen evidence

- **PRODUCT HYPOTHESIS:** eight deterministic citizens can produce attachment. Reopen the architecture only if mechanics and Mind quality pass but player evidence isolates cognition/runtime limits.
- **UNRESOLVED:** a single Web Worker is sufficient under full renderer load. Reopen package/runtime partitioning if measured p95 worker latency or main-thread contention misses [performance budgets](../quality/PERFORMANCE.md).
- **UNRESOLVED:** IndexedDB without backup/restore is adequate for the bounded proof. Reopen after Gate A/B or sooner if quota, eviction, multi-tab, or genesis/recovery drills fail.
- **UNRESOLVED:** region is the later coordination atom. Reopen if measured cross-region invariants require frequent synchronous transactions.
- **UNRESOLVED:** Cloudflare remains the best later host. Reopen on current price, account capability, operational, backup, or security evidence before implementation.

## Constraint fit

| Binding constraint | Fit |
|---|---|
| Solo builder / 40–60 hours | One local application and three small domain packages; no distributed system |
| M4 Pro / no owned GPU | CPU-first worker simulation; renderer is measured separately; no training |
| Approximately $0 / no spend | Browser and IndexedDB are the complete first path; hosted work requires a new gate and approval |
| Useful, free V1 | No account, key, download, or hosted model is needed |
| No regulated/proprietary/partner dependency | Fictional local world and authored fixtures only |
| Future commercial ideas only | No payment, entitlement, licensing, custody, or enterprise boundary exists in V1 |
