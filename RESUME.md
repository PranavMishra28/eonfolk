# Resume EONFOLK V1

**Purpose:** Exact restart point while the V1 civilization integration remains incomplete.

**Status:** IN PROGRESS

**Authority boundary:** [GOAL.md](GOAL.md) owns requirement state; this file owns the operational restart.

## Current state

- Branch: `feat/v1-civilization`
- Last reconciled implementation commit: `0c45a7c` (`chore(deps): register civilization workspace`)
- Starting `origin/main`: `8eb6afa911cbe386e18dddd26f093aaeef9e5167`
- Draft PR: [#9](https://github.com/PranavMishra28/eonfolk/pull/9), `V1 INCOMPLETE: EONFOLK civilization kernel`
- V1 status: INCOMPLETE; do not mark ready or merge

## Green starting evidence

- Exact base was clean and matched `origin/main`.
- Runtime, dependency cohort, architecture, docs, format, lint, typecheck, 224 unit tests, bounded properties, real IndexedDB, timing noninterference, fault journeys, production build, and bundle budgets passed at their recorded checkpoints.
- Fifteen of sixteen production browser journeys passed.

## Repaired baseline failure

- The delayed-authority failure was a stale phase-specific post-authority assertion. The test now retains every pre-authority fact-suppression assertion and waits for stable authoritative World Pulse and decision evidence after release.
- Focused parallel repetition passed 50/50, the full production suite passed 16/16 with zero external network attempts, and coordinator `verify:fast` passed 25 files / 198 tests. A fresh complete DEEP run on the evolving V1 branch is still required; the failed original baseline is not acceptance evidence.

## Completed checkpoints

- Repository archaeology is captured in `docs/generated/REPO_INVENTORY.md`.
- Versioned Release Genesis, experiment-world, generalized world, and civilization protocol contracts are committed with focused tests.
- The Application counsel path now crosses one validating decision gateway. Primary timeout, throw, and malformed output choose a validated deterministic fallback; no executable model adapter is connected.
- A read-only local Ollama lab tested the one cached `qwen3-coder:30b` model and is recorded in `docs/research/LOCAL_MODEL_LAB.md`. It is not promoted: one response produced broken public copy at the schema boundary and memory pressure reached warning level.
- The pure world generator now produces a versioned 8×8 region, four chunks and territories, 64 classified cells, one continuous metric settlement, canonical sites/places/buildings/routes/slots, a golden hash, three differentiated fixtures, and a 160-seed deep property sweep.
- Bounded routine and project planners generate deterministic multi-step Standing Plans from actor-visible records and legal affordances. Simulation integration remains incomplete.
- Standing Plans now have deterministic advance, interruption, retry, replan, and abandonment transitions. Planner-to-civilization decision-boundary integration remains incomplete.
- Model-origin proposals now have a closed typed schema, exact prompt/schema/artifact provenance, public-copy constraints, and post-Brain validation. No executable model process adapter is connected and Standard Brain remains the promoted fallback.
- A pure immutable civilization kernel now provides integer resource stocks, storage and atomic transfers, conservation audits, recipe/process gates, project dependencies and milestones, households, institutions, agreements, and physically gated migration/founding records. Focused tests passed 11/11, deep conservation properties passed 500 runs each, all 20 TypeScript project graphs passed, and `verify:fast` passed 30 files / 224 tests.
- Migration/founding are not complete V1 evidence: no generalized-world scheduler, route traversal, persistence adapter, new-settlement materialization, or long-horizon seed matrix exists yet.

## Next executable tasks

1. Add the deterministic generated-world presentation projection and connect generated geography to semantic views without giving presentation mutation authority.
2. Integrate the civilization kernel with generated-world scheduling, persistence, and routine/project decision boundaries.
3. Implement physically accounted route traversal, founding materialization, and long-horizon emergence across multiple seeds.
4. Add an executable bounded local Model Brain process adapter only after deterministic integration remains green; keep Standard Brain mandatory.
5. Add V1-specific CI evidence tiers and readiness guards, then run the first fresh V1 DEEP checkpoint.

## Resume commands

```bash
cd /Users/pranav/Documents/ChatGPT/metaverse
git fetch --all --tags --prune
git switch feat/v1-civilization
git status --short
sed -n '1,260p' GOAL.md
pnpm verify:fast
```

Continue all **NOT STARTED** and **IN PROGRESS** required V1 rows. Do not re-plan completed work, mark the PR ready, or merge while any required row is incomplete.
