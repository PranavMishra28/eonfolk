# Resume EONFOLK V1

**Purpose:** Exact restart point while the V1 civilization integration remains incomplete.

**Status:** IN PROGRESS

**Authority boundary:** [GOAL.md](GOAL.md) owns requirement state; this file owns the operational restart.

## Current state

- Branch: `feat/v1-civilization`
- Last reconciled commit: `8eb6afa911cbe386e18dddd26f093aaeef9e5167` (initial base; working ledger not yet committed)
- Starting `origin/main`: `8eb6afa911cbe386e18dddd26f093aaeef9e5167`
- Draft PR: not opened until the initial execution-ledger commit is pushed
- V1 status: INCOMPLETE; do not mark ready or merge

## Green starting evidence

- Exact base was clean and matched `origin/main`.
- Runtime, dependency cohort, architecture, docs, format, lint, typecheck, 194 unit tests, bounded properties, real IndexedDB, timing noninterference, fault journeys, production build, and bundle budgets passed.
- Fifteen of sixteen production browser journeys passed.

## Current failure

- The delayed-authority browser journey timed out after the delayed worker was released; the expected restored `Follow one life` heading did not appear within five seconds.
- Because production browser verification failed, later DEEP mutation, benchmarks, and canonical performance did not run. The baseline is FAIL, not acceptance evidence.

## Next executable tasks

1. Commit and push the V1 ledger; open the one draft V1 PR.
2. Finish repository archaeology and generated inventory.
3. Reproduce and repair delayed-worker authority restoration without weakening the no-facts-before-authority guarantee.
4. Freeze the cross-package Release Genesis and civilization contracts.
5. Implement deterministic generalized world generation and its property tests.

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
