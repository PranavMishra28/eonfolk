# Resume EONFOLK V1

**Purpose:** Exact restart point while the V1 civilization integration remains incomplete.

**Status:** IN PROGRESS

**Authority boundary:** [GOAL.md](GOAL.md) owns requirement state; this file owns the operational restart.

## Current state

- Branch: `feat/v1-civilization`
- Last reconciled commit: `6a7cf761179474b0dde2d69b2cf18565e1cf73ee`
- Starting `origin/main`: `8eb6afa911cbe386e18dddd26f093aaeef9e5167`
- Draft PR: [#9](https://github.com/PranavMishra28/eonfolk/pull/9), `V1 INCOMPLETE: EONFOLK civilization kernel`
- V1 status: INCOMPLETE; do not mark ready or merge

## Green starting evidence

- Exact base was clean and matched `origin/main`.
- Runtime, dependency cohort, architecture, docs, format, lint, typecheck, 194 unit tests, bounded properties, real IndexedDB, timing noninterference, fault journeys, production build, and bundle budgets passed.
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
- Bounded routine and project planners generate deterministic multi-step Standing Plans from actor-visible records and legal affordances. Interruption/replan lifecycle and simulation integration remain incomplete.

## Next executable tasks

1. Integrate generalized civilization state and resource conservation on top of generated worlds.
2. Add Standing Plan interruption/replan lifecycle and connect routine/project planning to civilization decision boundaries.
3. Implement physically accounted migration, founding, and long-horizon emergence across multiple seeds.
4. Extend the gateway with a closed Model Brain proposal/provenance contract and process adapter only after the deterministic kernel is green.
5. Run the first fresh V1 DEEP checkpoint after the generalized world and civilization kernel are integrated.

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
