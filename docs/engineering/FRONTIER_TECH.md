# Frontier technology decisions

**Purpose:** record narrow implementation decisions for persistence, bounded formal checking, planning, local inference, and provenance projection.

**Status:** IMPLEMENTATION SPIKE — accepted only for the local proof; later infrastructure remains gated.

**Authority boundary:** this document records measured frontier choices and reopen triggers. It does not replace the canonical persistence, simulation, cognition, security, or product authorities, and it authorizes no dependency, model download, deployment, or spend.

**Related documents:** [persistence](PERSISTENCE.md), [simulation](SIMULATION.md), [cognition](COGNITION.md), [architecture](ARCHITECTURE.md), [testing](../quality/TESTING.md)

## Decision register

| Area | Status | Decision for the first slice | Reopen evidence |
|---|---|---|---|
| Browser persistence | **ADOPT** | Use the generic `PersistencePort` with IndexedDB in the browser and `MemoryPersistence` for pure tests. Keep manifests, world heads/batches/events, decisions, command receipts, catch-up receipts, and snapshots in distinct stores while transactions cross stores atomically. | IndexedDB transaction, quota, eviction, or recovery drills fail on target browsers; measured storage approaches 64 MiB; or Gate A/B needs query patterns the adapter cannot serve. |
| SQLite/WASM over OPFS | **DEFER** | A disposable five-repetition browser spike compared a pinned SQLite 3.53.0 OPFS build with IndexedDB over 500 events, ten snapshots, and a 100-event range read. Both completed, but IndexedDB was already integrated and faster; SQLite added about 565 KB gzip plus cross-origin-isolation and worker/VFS complexity without enabling a missing V1 behavior. No SQLite dependency enters V1. | Re-run a production-shaped pinned comparison when profiling shows IndexedDB—not simulation or rendering—is the bottleneck, or when post-gate query/shared-region requirements materially change. |
| Server/region persistence | **DEFER** | Preserve structural portability, but do not claim the browser adapter drops into a region server. Authentication, authorization, backups, outbox/alarm semantics, moderation, and import policy remain new work. | Both product gates pass and a shared canonical region is the next approved experiment. |
| Broad local storage abstraction, event-sourcing framework, or premature CRDT | **REJECT** | One bounded port and one single-writer world are sufficient. Framework or distributed-conflict machinery would consume the solo slice without answering attachment. | A measured multiwriter requirement appears after product validation. |
| TLA+ model | **SPIKE** | Keep a small executable model for atomic genesis/append, idempotent retry, fencing, catch-up progress, and crash/recovery. It is a review instrument, not a proof of TypeScript, IndexedDB, hashes, or the unbounded system. | Persistence transactions materially change; then update the model and bounded constants before accepting the change. |
| Bounded formal CI/toolchain | **ADOPT** | The formal job downloads the official TLA+ 1.8.0 JAR, verifies SHA-256 `eabd14…533a`, installs Java 21, and fails if the tool or invariant run fails. Java and the JAR remain untracked. | Remove or replace only if the persistence protocol is retired or the pinned toolchain becomes unmaintainable; absence must never be reported as a pass. |
| “Formally verified persistence” claim | **REJECT** | Bounded TLC coverage and executable tests may be reported separately. Neither justifies an unqualified formal-verification claim. | Only a defined proof obligation plus implementation refinement argument could reopen the wording. |
| Standard Brain bounded planner | **ADOPT** | Use a deterministic, typed action catalog with explicit budgets and a shallow bounded choice/replan path. It must terminate and operate without a model. Persistence stores only finalized bounded decision provenance, never hidden reasoning. | Fixed behavioral evaluations show the bounded planner cannot express the Gate B accept/reject/delay/reinterpret outcomes. |
| General autonomous planner/search loop | **REJECT** | No open-ended tool loop, unbounded tree search, background model reasoning, or self-modifying plan belongs in the first slice. | A later isolated experiment demonstrates a player-visible gain under deterministic safety and cost bounds. |
| Browser-local model | **DEFER** | No model download or WebGPU requirement in onboarding. WebLLM and Transformers.js demonstrate viable local inference paths, but their model download, memory, latency, browser support, licensing, and renderer GPU-contention costs require measured opt-in evaluation. | Blinded Gate B comparisons show bounded model proposals materially improve stories after download/memory/latency/license/GPU tests pass on target devices. |
| Required external inference or training | **REJECT** | Standard Brain remains complete; no hosted inference, provider key, training, fine-tuning, proprietary dataset, or owned GPU is required. | Reopen only as an optional, separately budgeted experiment after zero-inference play is already compelling. |
| Typed provenance projection | **ADOPT** | Preserve run/region, command, decision, event, causal-parent relation, mechanism, visibility, and hashes so a small authorized projection can later map world facts into interoperable provenance concepts. Projection is derived and never reducer input. | Chronicle evidence cannot express a required factual relation with the closed typed causality vocabulary. |
| Full PROV-O/RDF graph in the canonical ledger | **DEFER** | W3C PROV-O is an interchange ontology with entities, activities, agents, and provenance relations. A full OWL/RDF store would enlarge schemas and disclosure risk without helping Gate A/B. Add only a one-way export projection after its audience and privacy rules exist. | A real interoperability consumer requests it and redaction/nonexposure tests pass. |
| Provenance graph as world authority | **REJECT** | The canonical event ledger and verified state remain Reality. An interchange or Chronicle projection cannot create facts or replace replay. | No reopen trigger within the accepted architecture. |

## Measured persistence spike

On 2026-08-21, `scripts/benchmark-persistence.mjs` ran Node 22.23.1 and the pinned Playwright Chromium on the target Mac. Each of five repetitions created genesis, committed 128 deterministic transitions with 1–4 events each (320 events total), then read the complete event interval after reopening IndexedDB.

| Integrated adapter | Median 128-transition append | Median 320-event recovery read | Interpretation |
|---|---:|---:|---|
| Memory | 6.19 ms | 0.483 ms | Test/reference adapter only; no durability claim. |
| IndexedDB | 62.1 ms | 11.4 ms | Comfortable for eight-citizen event boundaries in this synthetic smoke workload. |

The separate disposable paired workload wrote 500 events and ten snapshots in
one transaction, then read 100 events and the latest snapshot. Its first run
recorded IndexedDB write/read medians of 6.645/0.480 ms and SQLite-WASM/OPFS
medians of 10.755/1.665 ms, with 60.93 ms SQLite initialization. A second
five-repetition run retained raw samples and observed the same ordering. These
numbers are not compared with the 128-transition integrated benchmark above.

These measurements are not a capacity forecast. They exclude renderer contention, quota pressure, large snapshots, eviction, mobile hardware, and OS power-loss durability. The disposable harness was not retained in Git; its hashes, fixed workload, package integrity, raw reproduction samples, and this limitation are recorded in the evidence JSON.

The IndexedDB choice follows its transactional, asynchronous, Worker-available browser contract ([MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), accessed 2026-08-21). SQLite's own WASM persistence guide reports multiple OPFS modes and explicit threading, locking, concurrency, and header tradeoffs ([SQLite WASM persistent storage](https://sqlite.org/wasm/doc/trunk/persistence.md), accessed 2026-08-21). The [disposable spike evidence](../exec-plans/evidence/003/sqlite-opfs-spike.json) supports the bounded V1 decision; it does not establish a universal backend ranking.

## Bounded formal result

`formal/Persistence.tla` was checked with OpenJDK 21.0.12.1 and the official TLA+ 1.8.0 `tla2tools.jar` (release asset ID `523952485`, SHA-256 `eabd140a70f49eb9305a3bd3f3df944eddf87e5a90d329789085f8953a80533a`). TLC 2026.08.21.155922 explored **3,480 generated / 350 distinct states**, depth **10**, with no invariant violation for four command IDs, four revisions/events, three fencing tokens, and two catch-up chapters. The release asset replaced its prepublication predecessor on 2026-08-21; CI rejected the changed bytes before execution, and this new official digest was independently matched and rerun rather than bypassed.

The checked invariants are `TypeInvariant`, `AtomicGenesis`, `LedgerHeadAgreement`, `CatchUpProgress`, and `CrashPreservesDurableShape`. The exact abstraction limits and plain-English meanings live in `formal/README.md`. TLC is the model checker shipped by the TLA+ project ([official TLA+ tools repository](https://github.com/tlaplus/tlaplus), accessed 2026-08-21).

## Local inference and provenance boundary

WebLLM runs inference in-browser with WebGPU and worker support ([official WebLLM repository](https://github.com/mlc-ai/web-llm), accessed 2026-08-21). Transformers.js likewise exposes WebGPU execution while warning that support and behavior vary by browser ([official Transformers.js WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu), accessed 2026-08-21). Those are feasibility signals only. They do not falsify the product requirement that onboarding needs no key, model download, or WebGPU and that the renderer owns a competing GPU budget.

W3C PROV-O is designed to represent and interchange provenance across systems ([W3C PROV-O Recommendation](https://www.w3.org/TR/prov-o/), accessed 2026-08-21). EONFOLK should retain enough typed causal identity to project into that vocabulary later, while keeping the compact canonical event schema, audience filtering, and factual Chronicle rules authoritative now.

## Constraint fit

- **Solo builder / bounded slice:** one TypeScript port, two adapters, no database framework, and a small optional formal tool keep integration legible.
- **Approximately $0 / no deployment:** browser storage and deterministic cognition are complete offline paths; the benchmark, tests, and TLC run incurred no service or model cost.
- **M4 Pro / no owned GPU / no training:** persistence is CPU/storage work; no training, fine-tuning, model weights, or GPU service appears.
- **Useful free V1:** saved local play and replay require no account, provider, payment, license business, partner, or regulated dataset.
- **Honest limits:** local storage is not backup, bounded model checking is not proof, and deferred technologies have no invented benchmark result.
