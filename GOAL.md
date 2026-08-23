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
| Stale Founder Alpha active terminology retired or archived | VERIFIED |
| README rebuilt as the current front door | VERIFIED |
| Active documentation hierarchy simplified and non-contradictory | VERIFIED |
| Research bibliography and durable provenance captured | VERIFIED |
| Dead code, dependencies, config, fixtures, and docs removed | VERIFIED |
| Release Genesis is the product entry identity | VERIFIED |
| Landing, immersive game, research, and developer surfaces are separated | VERIFIED |

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
| Generated world persistence and deterministic replay | VERIFIED |
| Camera/render residency cannot mutate Reality | VERIFIED |

## Civilization

| Requirement | State |
|---|---|
| Canonical/subjective/derived/research data classification in code | VERIFIED |
| Population, households, relationships, roles, and bounded demographic change | VERIFIED |
| Typed resource stocks, storage, flows, units, and conservation | VERIFIED |
| Production/consumption recipes, duration, labor, capabilities, transport, and scarcity | VERIFIED |
| Grounded needs and pressures with imperfect observability | VERIFIED |
| Generic Project lifecycle, milestones, dependencies, accounting, failure, and abandonment | VERIFIED |
| Physical construction/project progress | VERIFIED |
| Generic Institution, membership, authority, resources, commitments, and norms | VERIFIED |
| Minimal agreement/policy primitive needed for collective action | VERIFIED |
| Migration with physical people/resource accounting | VERIFIED |
| Generic settlement-founding process | VERIFIED |
| Legitimate seeded second viable settlement evidence without a time trigger | VERIFIED |
| Legitimate stagnant/failing seed evidence | VERIFIED |
| 30/90/365-day civilization experiment matrix and metrics | VERIFIED |

## Cognition and experiment

| Requirement | State |
|---|---|
| Standard Brain remains deterministic, complete, and model-free | VERIFIED |
| Routine planner with multi-step plans, costs, interruption, commitments, and Standing Plans | VERIFIED |
| Project/forward planner uses actor-visible facts and legal affordances | VERIFIED |
| Executable local Model Brain treatment | VERIFIED |
| Real M4 Max model/runtime benchmark and promoted treatment | VERIFIED |
| Versioned structured model-decision contract and provenance | VERIFIED |
| Schema, semantic, authority, and world validation after model output | VERIFIED |
| Timeout, bounded retry, invalid/unavailable rejection, and deterministic fallback | VERIFIED |
| Episodic, semantic, social, goal, commitment, and reflection memory | VERIFIED |
| Retrieval by relevance, recency, salience, relationship, and goal | VERIFIED |
| Historical replay never reruns model inference | VERIFIED |
| Multiple world seeds and Brain treatments carry immutable experiment identity | VERIFIED |
| POMCP promoted with a defensible sampler or rejected by an evidence-backed ADR | VERIFIED |

## Persistence and reliability

| Requirement | State |
|---|---|
| Atomic event append, snapshots, schema versions, migrations, and idempotency | VERIFIED |
| Single-writer fencing and crash recovery | VERIFIED |
| Replay identity across long histories | VERIFIED |
| Bounded causal catch-up for reload, 1 day, 7 days, and long absence | VERIFIED |
| Catch-up crash and no-model recovery | VERIFIED |
| IndexedDB versus SQLite-WASM/OPFS benchmark and decision | VERIFIED |
| Future exhibition authority/persistence adapter seam | VERIFIED |
| Flight Recorder correlates genesis, experiment, world, cognition, render, persistence, and performance | VERIFIED |
| Sentinel covers integrity, privacy, cognition, navigation, render, network, and persistence anomalies | VERIFIED |
| Injected model, persistence, checkpoint, renderer, asset, navigation, invariant, and latency failures | VERIFIED |
| `pnpm dev`, `pnpm prod`, and `pnpm diagnose` share product semantics and self-check setup | VERIFIED |

## Presentation

| Requirement | State |
|---|---|
| Premium coherent landing/entry route | VERIFIED |
| Immersive separate world-first game route | VERIFIED |
| Generalized terrain, routes, settlements, projects, and growth render | VERIFIED |
| Semantic region, settlement, and citizen-follow zoom | VERIFIED |
| Recognizable stylized humanoid characters and identity | VERIFIED |
| Grounded pathfinding, entrances, interaction slots, and no routine teleport | VERIFIED |
| Locomotion, carry, work, social, life, and reaction animation states | VERIFIED |
| Task props and visible construction/project change | VERIFIED |
| Contextual citizen/building/project selection UI | VERIFIED |
| Deliberate Research/Evidence mode separate from play | VERIFIED |
| Chronicle-to-citizen/location/object replay navigation | VERIFIED |
| In-game menu feedback with consented bounded diagnostics | VERIFIED |
| Production UI hides raw developer internals | VERIFIED |
| GLB/glTF asset pipeline with provenance, licenses, optimization, and cohesive art | VERIFIED |
| Temporal Living World acceptance suite | VERIFIED |

## Verification and release

| Requirement | State |
|---|---|
| FAST lane covers V1 architecture, code, build, and focused properties | IN PROGRESS |
| DEEP lane covers all V1 software and exact candidate evidence | NOT STARTED |
| Generator/world/project/resource/migration/founding properties | IN PROGRESS |
| Cognition/model validation, fallback, epistemic isolation, and replay tests | IN PROGRESS |
| Long-horizon civilization matrix | IN PROGRESS |
| Persistence/replay/catch-up equivalence and long-history tests | VERIFIED |
| Browser journeys and temporal Living World tests | IN PROGRESS |
| Accessibility and semantic critical-action parity | IN PROGRESS |
| Explicit laptop/desktop payload, latency, frame, memory, and diagnostic budgets | IN PROGRESS |
| Security, secrets, dependency, zero-egress, and authority checks | IN PROGRESS |
| High-value formal models | IN PROGRESS |
| Targeted mutation suite for V1 pure logic | IN PROGRESS |
| Generated documentation freshness checks | VERIFIED |
| Six frozen-SHA independent reviews | NOT STARTED |
| Every accepted P0/P1 repaired | NOT STARTED |
| Fresh post-fix confirmation | NOT STARTED |
| V1 handoff with evidence and honest limitations | NOT STARTED |
| Draft PR marked ready after exact-candidate premerge evidence | NOT STARTED |

## Post-merge operational reattestation

This operational row is not part of the premerge readiness roster: requiring a completed merge before marking the PR ready would deadlock the release. It remains mandatory after the protected merge and before branch/tag/worktree cleanup.

| Requirement | State | Evidence |
|---|---|---|
| Protected merge completed and a fresh push-to-main run reattested the exact merge commit | NOT STARTED | Must be a new `push` run whose head is the protected merge commit; premerge dispatches cannot be reclassified by ancestry |
