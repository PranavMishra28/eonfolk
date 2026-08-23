# EONFOLK V1 civilization execution ledger

**Purpose:** Authoritative executable-software checklist for the internal V1 civilization benchmark.

**Status:** IN PROGRESS

**Authority boundary:** This file owns V1 execution state. `docs/INDEX.md` continues to map current content authorities until the V1 documentation consolidation is verified.

**Related:** [RESUME.md](RESUME.md), [AGENTS.md](AGENTS.md), [README.md](README.md).

## Run identity and completion rule

- Starting `origin/main`: `8eb6afa911cbe386e18dddd26f093aaeef9e5167`, inspected 2026-08-22 Pacific.
- Integration lineage: `feat/v1-civilization` → one draft PR → `main`.
- Machine: Apple M4 Max, 48 GB unified memory; 150 GiB free at start; Ollama installed; 17 GB existing Ollama model cache.
- Required states are only **NOT STARTED**, **IN PROGRESS**, **VERIFIED**, and **BLOCKED EXTERNALLY**.
- The PR stays draft and unmerged until every required software row below is **VERIFIED**. Human studies may remain not run and public deployment may remain not deployed.

## Starting evidence

| Requirement | State | Evidence |
|---|---|---|
| Exact remote/local base and GitHub state inspected | VERIFIED | Local and `origin/main` matched `8eb6afa`; repository private; protected `main`; one branch; no open PR/issues |
| Canonical pre-change DEEP baseline | IN PROGRESS | Exact clean base passed runtime through bundle budget and 15/16 production journeys; delayed-authority restoration journey failed; later DEEP constituents did not run |
| Baseline failure repair | VERIFIED | Test-only oracle repair at `2540bd4`; pre-authority fact suppression retained; 50/50 focused repetitions and 16/16 production journeys passed |

## Repository and product

| Requirement | State |
|---|---|
| Repository archaeology reconciled | VERIFIED |
| Generated repository inventory | VERIFIED |
| Stale Founder Alpha active terminology retired or archived | NOT STARTED |
| README rebuilt as the current front door | NOT STARTED |
| Active documentation hierarchy simplified and non-contradictory | NOT STARTED |
| Research bibliography and durable provenance captured | IN PROGRESS |
| Dead code, dependencies, config, fixtures, and docs removed | NOT STARTED |
| Release Genesis is the product entry identity | IN PROGRESS |
| Landing, immersive game, research, and developer surfaces are separated | NOT STARTED |

## Generalized world

| Requirement | State |
|---|---|
| Immutable Release Genesis identity | VERIFIED |
| Deterministic versioned world generator | VERIFIED |
| Multiple materially different valid world seeds | VERIFIED |
| Region/chunk/cell/territory hierarchy | VERIFIED |
| Continuous metric local settlement space | VERIFIED |
| Terrain, water, productivity, timber, constrained material, travel friction, and suitability | VERIFIED |
| Settlement, site/parcel, place, building, and interaction-slot model | VERIFIED |
| Canonical generator golden fixtures and property tests | VERIFIED |
| Generated world persistence and deterministic replay | NOT STARTED |
| Camera/render residency cannot mutate Reality | IN PROGRESS |

## Civilization

| Requirement | State |
|---|---|
| Canonical/subjective/derived/research data classification in code | IN PROGRESS |
| Population, households, relationships, roles, and bounded demographic change | NOT STARTED |
| Typed resource stocks, storage, flows, units, and conservation | VERIFIED |
| Production/consumption recipes, duration, labor, capabilities, transport, and scarcity | IN PROGRESS |
| Grounded needs and pressures with imperfect observability | NOT STARTED |
| Generic Project lifecycle, milestones, dependencies, accounting, failure, and abandonment | VERIFIED |
| Physical construction/project progress | IN PROGRESS |
| Generic Institution, membership, authority, resources, commitments, and norms | IN PROGRESS |
| Minimal agreement/policy primitive needed for collective action | IN PROGRESS |
| Migration with physical people/resource accounting | IN PROGRESS |
| Generic settlement-founding process | IN PROGRESS |
| Legitimate seeded second viable settlement evidence without a time trigger | NOT STARTED |
| Legitimate stagnant/failing seed evidence | NOT STARTED |
| 30/90/365-day civilization experiment matrix and metrics | NOT STARTED |

## Cognition and experiment

| Requirement | State |
|---|---|
| Standard Brain remains deterministic, complete, and model-free | IN PROGRESS |
| Routine planner with multi-step plans, costs, interruption, commitments, and Standing Plans | IN PROGRESS |
| Project/forward planner uses actor-visible facts and legal affordances | IN PROGRESS |
| Executable local Model Brain treatment | NOT STARTED |
| Real M4 Max model/runtime benchmark and promoted treatment | IN PROGRESS |
| Versioned structured model-decision contract and provenance | VERIFIED |
| Schema, semantic, authority, and world validation after model output | IN PROGRESS |
| Timeout, bounded retry, invalid/unavailable rejection, and deterministic fallback | IN PROGRESS |
| Episodic, semantic, social, goal, commitment, and reflection memory | NOT STARTED |
| Retrieval by relevance, recency, salience, relationship, and goal | NOT STARTED |
| Historical replay never reruns model inference | NOT STARTED |
| Multiple world seeds and Brain treatments carry immutable experiment identity | NOT STARTED |
| POMCP promoted with a defensible sampler or rejected by an evidence-backed ADR | NOT STARTED |

## Persistence and reliability

| Requirement | State |
|---|---|
| Atomic event append, snapshots, schema versions, migrations, and idempotency | IN PROGRESS |
| Single-writer fencing and crash recovery | IN PROGRESS |
| Replay identity across long histories | NOT STARTED |
| Bounded causal catch-up for reload, 1 day, 7 days, and long absence | NOT STARTED |
| Catch-up crash and no-model recovery | NOT STARTED |
| IndexedDB versus SQLite-WASM/OPFS benchmark and decision | NOT STARTED |
| Future exhibition authority/persistence adapter seam | NOT STARTED |
| Flight Recorder correlates genesis, experiment, world, cognition, render, persistence, and performance | NOT STARTED |
| Sentinel covers integrity, privacy, cognition, navigation, render, network, and persistence anomalies | NOT STARTED |
| Injected model, persistence, checkpoint, renderer, asset, navigation, invariant, and latency failures | NOT STARTED |
| `pnpm dev`, `pnpm prod`, and `pnpm diagnose` share product semantics and self-check setup | IN PROGRESS |

## Presentation

| Requirement | State |
|---|---|
| Premium coherent landing/entry route | NOT STARTED |
| Immersive separate world-first game route | NOT STARTED |
| Generalized terrain, routes, settlements, projects, and growth render | IN PROGRESS |
| Semantic region, settlement, and citizen-follow zoom | IN PROGRESS |
| Recognizable stylized humanoid characters and identity | NOT STARTED |
| Grounded pathfinding, entrances, interaction slots, and no routine teleport | NOT STARTED |
| Locomotion, carry, work, social, life, and reaction animation states | NOT STARTED |
| Task props and visible construction/project change | NOT STARTED |
| Contextual citizen/building/project selection UI | NOT STARTED |
| Deliberate Research/Evidence mode separate from play | NOT STARTED |
| Chronicle-to-citizen/location/object replay navigation | NOT STARTED |
| In-game menu feedback with consented bounded diagnostics | NOT STARTED |
| Production UI hides raw developer internals | NOT STARTED |
| GLB/glTF asset pipeline with provenance, licenses, optimization, and cohesive art | NOT STARTED |
| Temporal Living World acceptance suite | NOT STARTED |

## Verification and release

| Requirement | State |
|---|---|
| FAST lane covers V1 architecture, code, build, and focused properties | IN PROGRESS |
| DEEP lane covers all V1 software and exact candidate evidence | NOT STARTED |
| Generator/world/project/resource/migration/founding properties | IN PROGRESS |
| Cognition/model validation, fallback, epistemic isolation, and replay tests | IN PROGRESS |
| Long-horizon civilization matrix | NOT STARTED |
| Persistence/replay/catch-up equivalence and long-history tests | NOT STARTED |
| Browser journeys and temporal Living World tests | NOT STARTED |
| Accessibility and semantic critical-action parity | NOT STARTED |
| Explicit laptop/desktop payload, latency, frame, memory, and diagnostic budgets | NOT STARTED |
| Security, secrets, dependency, zero-egress, and authority checks | IN PROGRESS |
| High-value formal models | IN PROGRESS |
| Targeted mutation suite for V1 pure logic | NOT STARTED |
| Generated documentation freshness checks | NOT STARTED |
| Six frozen-SHA independent reviews | NOT STARTED |
| Every accepted P0/P1 repaired | NOT STARTED |
| Fresh post-fix confirmation | NOT STARTED |
| V1 handoff with evidence and honest limitations | NOT STARTED |
| Draft PR marked ready, protected merge completed, and post-merge main verified | NOT STARTED |
