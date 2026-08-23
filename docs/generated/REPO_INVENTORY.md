# Generated V1 repository inventory

**Purpose:** Record the internal archaeology classification used to migrate the
Founder Alpha repository into the V1 civilization implementation.

**Status:** GENERATED INTERNAL SNAPSHOT — not product or architecture authority.

**Authority boundary:** This inventory reports live code and references at one
commit. [GOAL.md](../../GOAL.md) owns V1 execution state and
[INDEX.md](../INDEX.md) maps current document authority. Regenerate this file
after a structural cleanup; do not decide behavior from it.

**Inventory base:** `feat/v1-civilization` at
`e37f5fff681183bbee92562415a429fdcd31ce68` (2026-08-22). The V1 branch began at
`origin/main` `8eb6afa911cbe386e18dddd26f093aaeef9e5167`.

## Classification summary

| Subsystem | Classification | Live evidence | V1 action |
|---|---|---|---|
| Protocol IDs, canonical encoding, PRNG, command/event envelopes | **PRESERVE / EXTEND** | [`identifiers.ts`](../../packages/protocol/src/identifiers.ts), [`canonical.ts`](../../packages/protocol/src/canonical.ts), [`prng.ts`](../../packages/protocol/src/prng.ts), [`types.ts`](../../packages/protocol/src/types.ts) | Add Release Genesis and generalized world/civilization contracts without weakening deterministic IDs, hashes, visibility, causality, or idempotency. |
| Simulation transition, reducer, invariants and replay | **PRESERVE KERNEL / REPLACE FIXTURE SCHEMA** | [`transition.ts`](../../packages/sim/src/transition.ts), [`reducer.ts`](../../packages/sim/src/reducer.ts), [`invariants.ts`](../../packages/sim/src/invariants.ts), [`replay.ts`](../../packages/sim/src/replay.ts) | Retain the authoritative transition chain; replace `riverhold-world-state-v1`, closed resource/action unions, singleton inventory/mill and slug-authored scheduling with versioned composable systems. |
| Riverhold genesis and fixtures | **LEGACY GOLDEN** | [`genesis.ts`](../../packages/sim/src/genesis.ts), [`riverhold fixture`](../../tests/fixtures/riverhold/index.ts), [`simulation tests`](../../tests/unit/systems/simulation.test.ts) | Freeze enough replay/golden coverage to prove migration. Do not extend Riverhold into the generator or make it a second mutable authority. |
| Cognition | **PRESERVE PORT / GENERALIZE CATALOG** | [`brain-port.ts`](../../packages/cognition/src/brain-port.ts), [`standard-brain.ts`](../../packages/cognition/src/standard-brain.ts), [`context.ts`](../../packages/cognition/src/context.ts) | Keep bounded proposals and deterministic fallback; replace `riverhold-actions-v1`, add structured model provenance, and introduce planning only after project/legal-action contracts exist. |
| Persistence | **PRESERVE PORT / ADD V2 MIGRATION** | [`types.ts`](../../packages/persistence/src/types.ts), [`indexeddb.ts`](../../packages/persistence/src/indexeddb.ts), [`validation.ts`](../../packages/persistence/src/validation.ts), [`persistence.model.test.ts`](../../tests/property/persistence.model.test.ts) | Retain atomic transactions, fencing, receipts, snapshots and catch-up. Add Release Genesis validation, explicit schema upcasting, experiment isolation and long-history evidence; benchmark before changing IndexedDB. |
| World presentation | **PRESERVE PURE MODEL / PARAMETERIZE** | [`types.ts`](../../packages/world-presentation/src/types.ts), [`planner.ts`](../../packages/world-presentation/src/planner.ts), [`scene.ts`](../../packages/world-presentation/src/scene.ts), [`spatial.test.ts`](../../tests/unit/world-presentation/spatial.test.ts) | Build scenes from generated canonical geography and pass scene/catalog inputs into projection, residency and animation. Keep camera/residency derived and non-authoritative. |
| PlayCanvas web application | **MIGRATE IN PLACE** | [`RiverholdWorld.tsx`](../../apps/web/src/components/RiverholdWorld.tsx), [`authoritative-runtime.ts`](../../apps/web/src/authoritative-runtime.ts), [`RiverholdApp.tsx`](../../apps/web/src/RiverholdApp.tsx), [`riverhold.spec.ts`](../../tests/e2e/riverhold.spec.ts) | Reuse renderer, accessibility, Worker and browser harnesses, but replace Riverhold/Mara phase and singleton-scene assumptions after the generalized kernel is executable. |
| Diagnostics | **PRESERVE / REBIND** | [`packages/diagnostics`](../../packages/diagnostics/src), diagnostic browser/source benchmarks and unit tests | Retain read-only recorder, redaction, Sentinel and performance boundaries; bind records to release/experiment/world identities and new failure classes. |
| Observatory | **PRESERVE NONCANONICAL SEAM** | [`packages/observatory`](../../packages/observatory/src), [`projection.test.ts`](../../tests/unit/observatory/projection.test.ts) | Keep outside Reality; generalize projections only after V1 metrics and experiment records are stable. |
| Feedback Worker | **DEFERRED OPTIONAL COHORT** | [`apps/feedback-worker`](../../apps/feedback-worker/src), migrations and four focused test files; root typecheck and mutation scripts include it | V1 is local and requires no deployment. Remove from active verification/product packaging only in one reviewed cohort; preserve its history for a future relay decision. |
| Formal persistence model | **PRESERVE** | [`Persistence.tla`](../../formal/Persistence.tla), [`Persistence.cfg`](../../formal/Persistence.cfg), [`formal README`](../../formal/README.md) | Retain current atomicity/fencing/crash model. Add a separate small model only for a concrete migration, founding or checkpoint protocol; test civilization rules primarily with properties. |
| Gate 0 prototype and study | **HISTORICAL COHORT** | [`tests/prototypes/gate-0`](../../tests/prototypes/gate-0), four root Gate 0 configs, generation/validation scripts and `gate0:*` package scripts | Not part of PR/DEEP V1 execution, but internally cross-referenced. Archive or delete the complete cohort only after its immutable evidence/tag is confirmed and all package/config/typecheck/doc links are removed together. |
| Planning, research, reviews and concepts | **HISTORICAL EVIDENCE + CONSOLIDATION INPUT** | [`docs`](../), [`PLAN.md`](../../PLAN.md), [`SOURCE_LEDGER.md`](../research/SOURCE_LEDGER.md) | Preserve source provenance and frozen review evidence. Replace active Founder Alpha claims with V1 authorities; move superseded execution material out of active/read-order surfaces rather than rewriting history. |

## Missing V1 executable primitives

No current package owns deterministic world generation or a civilization lab.
The canonical state has no World/Region/Cell/Territory/Settlement/Site/Building
hierarchy, households, memberships, institutions, capabilities, recipes,
storage capacities, projects, pressures, migration or founding. The present
30/90/365-day property in
[`properties.test.ts`](../../tests/unit/systems/properties.test.ts) advances the
Riverhold clock and proves conservation/replay; it is not a civilization run.

Create these ownership boundaries rather than enlarging fixture files:

| Proposed owner | Responsibility |
|---|---|
| `packages/protocol/src/release.ts` | Immutable Release Genesis and version/catalog identity. |
| `packages/protocol/src/world.ts` | General canonical geography, settlement, building, route, stock and storage types. |
| `packages/protocol/src/civilization.ts` | Household, institution, role, recipe, pressure, project, migration and founding contracts/events. |
| `packages/worldgen/` | Pure versioned seeded generator, golden fixtures and generator properties; protocol-only dependency. |
| `packages/sim/src/{economy,pressure,projects,institutions,population,founding}.ts` | Authoritative transitions, accounting and invariants. |
| `packages/persistence/src/migrations.ts` | Explicit legacy-to-V1 decode/upcast and Release Genesis validation. |
| `packages/world-presentation/src/scene-builder.ts` | Canonical generated geography to pure render-independent scene definition. |
| `packages/civilization-lab/` | Headless seed/treatment/duration runner and metrics; never a renderer dependency. |

Keep multiple V1 settlements inside one authoritative region: current event
ordering and persistence heads are region-scoped, so cross-region migration
would add an unnecessary atomic-transaction protocol.

## Stale active authorities

These are valid Founder Alpha history but incorrectly remain current entry
points on the V1 branch:

- [`INDEX.md`](../INDEX.md) says **FOUNDER ALPHA ACTIVE**, puts
  `002-founder-alpha.md` in the default read order and calls it the sole living
  plan.
- [`PLAN.md`](../../PLAN.md), [`README.md`](../../README.md),
  [`PLANS.md`](../exec-plans/PLANS.md) and
  [`IMPLEMENTATION_GOAL_PROMPT.md`](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md)
  still link the Founder Alpha plan as active.
- [`002-founder-alpha.md`](../exec-plans/active/002-founder-alpha.md),
  [`FOUNDER_ALPHA_HANDOFF.md`](../../FOUNDER_ALPHA_HANDOFF.md),
  [`OVERNIGHT_HANDOFF.md`](../../OVERNIGHT_HANDOFF.md) and
  [`FOUNDER_ALPHA_RELEASE.md`](../engineering/FOUNDER_ALPHA_RELEASE.md) describe
  completed branches, PRs and release gates as current operations.
- Founder Alpha research/reviews and `docs/exec-plans/evidence/002` should remain
  immutable historical evidence, but links that call `002` active must be
  redirected to the completed record or the new V1 execution authority.

Safe retirement therefore requires one authority migration: create/confirm the
V1 active plan, move `002` to completed history, rebuild INDEX/README/PLAN read
paths, then run the documentation link and contradiction checks. Deleting only
the handoffs or `002` today would leave live broken links.

## Dependency and configuration candidates

| Candidate | Evidence | Disposition gate |
|---|---|---|
| `@playcanvas/react`, `playcanvas`, React, Vite, Playwright, Vitest, TypeScript, Biome, `fast-check` | Direct imports or active build/test/verification use | **Keep.** Re-evaluate versions and budgets, not existence. |
| `pixi.js` | Imported only by Gate 0 prototype; root dependency remains because that historical cohort is executable | Remove with the whole Gate 0 cohort after evidence preservation and lock regeneration. |
| `@base-ui/react`, `@phosphor-icons/react`, `motion`, `react-router`, Tailwind packages | Declared at the root but no executable import was found under `apps`, `packages`, `tests` or `scripts` | Remove candidates after a lockfile/import/build probe confirms no generated or CSS-only use. Do not carry them into V1 by inertia. |
| `playwright.gate0.config.ts`, `vite.gate0.config.ts`, `vitest.gate0.config.ts`, `tsconfig.gate0.json` and `gate0:*` scripts | Refer only to the historical Gate 0 cohort; `tsconfig.gate0.json` is also in root typecheck | Delete/archive as one cohort, then update `package.json`, `scripts/typecheck.mjs`, formatter/linter paths and the lockfile. |
| Feedback Worker app, migration and tests | Typecheck, mutation checks and documentation still reference it; it is absent from the local V1 product path | Decide defer-vs-retain before removal. If deferred, remove app/tests/script references/package lock entries together and retain the implementation at a historical tag. |
| CI UI classifier and evidence names | [CI](../../.github/workflows/ci.yml) still emits `founder-alpha-ui-evidence` and probes `riverhold-canvas` | Keep the portable CI mechanism, but rename/rebind selectors, evidence schema and V1 change-path classification when the new app shell lands. |

## Prioritized cleanup

1. Repair the active authority graph: V1 GOAL/plan/read order become current;
   Founder Alpha plans, handoffs and release records become completed history.
2. Freeze Riverhold replay/golden compatibility, then introduce Release Genesis
   and one coherent V1 schema/version domain before changing canonical state.
3. Add `worldgen` and composable protocol primitives; do not put generalized
   generator or civilization logic in Riverhold fixture files.
4. Generalize simulation accounting/projects/founding and build the headless
   long-horizon lab before adapting UI copy and renderer scenes.
5. Add explicit persistence migration and generated-scene adapters; preserve the
   current deterministic ledger, replay and non-authoritative presentation
   boundaries.
6. Remove verified-unused root dependencies. Retire the Gate 0 and optional
   feedback cohorts only through complete, link-clean, lockfile-clean changes.
7. Rename Riverhold/Founder Alpha selectors, artifacts and browser evidence only
   when replacement V1 journeys exist; until then they remain regression evidence,
   not proof of generalized civilization.

No deletion listed here is authorized solely by this generated snapshot. A
cleanup is safe only when `git grep` shows no remaining live references, the
replacement authority/evidence exists, dependency lock changes are inspected,
and fast verification plus documentation and diff checks pass.
