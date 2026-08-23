# Resume EONFOLK V1

**Purpose:** Exact restart point while the V1 civilization integration remains incomplete.

**Status:** IN PROGRESS

**Authority boundary:** [GOAL.md](GOAL.md) owns requirement state; this file owns the operational restart.

## Current state

- Branch: `feat/v1-civilization`
- Last reconciled commit: `2540bd45d0df30b7b8e1f660a190a6936808df3d`
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
- A read-only local Ollama lab tested the one cached `qwen3-coder:30b` model. It is not promoted: one response produced broken public copy at the schema boundary, memory pressure reached warning level, and no executable model gateway exists yet.

## Next executable tasks

1. Implement deterministic generalized world generation and its property tests against the frozen contracts.
2. Integrate local-model lab evidence without promoting a treatment.
3. Implement generalized civilization state and resource conservation on top of generated worlds.
4. Add the validating decision gateway before any executable Model Brain adapter.
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
