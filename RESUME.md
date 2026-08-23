# Resume EONFOLK V1

**Purpose:** Exact restart point while the V1 civilization integration remains incomplete.

**Status:** IN PROGRESS

**Authority boundary:** [GOAL.md](GOAL.md) owns requirement state; this file owns the operational restart.

## Current state

- Branch: `feat/v1-civilization`
- Last reconciled commit: `6a32bea88f5d0b8a5b4c4f0bc050fe4c32b7e4ea`
- Starting `origin/main`: `8eb6afa911cbe386e18dddd26f093aaeef9e5167`
- Draft PR: [#9](https://github.com/PranavMishra28/eonfolk/pull/9), `V1 INCOMPLETE: EONFOLK civilization kernel`
- V1 status: INCOMPLETE; do not mark ready or merge

## Green starting evidence

- Exact base was clean and matched `origin/main`.
- Runtime, dependency cohort, architecture, docs, format, lint, typecheck, 194 unit tests, bounded properties, real IndexedDB, timing noninterference, fault journeys, production build, and bundle budgets passed.
- Fifteen of sixteen production browser journeys passed.

## Current failure

- The delayed-authority browser journey timed out after the delayed worker was released; the expected restored `Follow one life` heading did not appear within five seconds.
- Because production browser verification failed, later DEEP mutation, benchmarks, and canonical performance did not run. The baseline is FAIL, not acceptance evidence.

## Completed checkpoints

- Repository archaeology is captured in `docs/generated/REPO_INVENTORY.md`.
- Versioned Release Genesis, experiment-world, generalized world, and civilization protocol contracts are committed with focused tests.
- A read-only local Ollama lab tested the one cached `qwen3-coder:30b` model. It is not promoted: one response produced broken public copy at the schema boundary, memory pressure reached warning level, and no executable model gateway exists yet.

## Next executable tasks

1. Reproduce and repair delayed-worker authority restoration without weakening the no-facts-before-authority guarantee.
2. Implement deterministic generalized world generation and its property tests against the frozen contracts.
3. Integrate local-model lab evidence without promoting a treatment.
4. Implement generalized civilization state and resource conservation on top of generated worlds.
5. Add the validating decision gateway before any executable Model Brain adapter.

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
