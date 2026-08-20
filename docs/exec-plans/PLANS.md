# ExecPlan contract

**Purpose:** Define how implementation plans are written, maintained, evidenced, reviewed and closed.

**Status:** ACCEPTED FOR FUTURE IMPLEMENTATION

**Authority boundary:** This file owns ExecPlan format and maintenance. [001-foundation](active/001-foundation.md) owns the first slice; the [Goal prompt](IMPLEMENTATION_GOAL_PROMPT.md) owns orchestration instructions.

**Related documents:** [quality bar](../quality/QUALITY_BAR.md), [testing](../quality/TESTING.md), [visual QA](../quality/VISUAL_QA.md), [planning status](../../PLAN.md).

An ExecPlan is a living implementation contract. A developer with only the repository, the plan and ordinary local tools must be able to reproduce the work and understand why every material deviation occurred.

## Required front matter

Every plan begins with purpose, status, authority boundary, related documents, owner/coordinator, target branch, explicit product outcome, non-goals and binding constraints.

## Required live sections

Maintain these continuously, at least at each integration boundary:

1. **Progress:** timestamp, commit/worktree, completed outcome, tests and remaining gate.
2. **Evidence:** command, exit result, seed/hash, browser/device/viewport, artifact path and reviewer observation.
3. **Decisions:** implementation choice, alternatives, reason, affected files and reopen trigger.
4. **Risks/findings:** severity, owner, status, fix and confirmation evidence.
5. **Deviations and removals:** planned versus actual scope; why; effect on gates. No silent expansion.
6. **Integration log:** source branch/SHA, actual changed-file/diff inspection, checks, integrated SHA and rollback.
7. **Hours/cuts:** focused time by milestone is evidence for scope control, never a substitute for acceptance.

## Milestone contract

Each milestone specifies:

- player-visible product outcome;
- exact included scope and exclusions;
- expected files/packages and allowed ownership;
- commands and prerequisites;
- unit, deterministic, property/fuzz, build and browser tests as applicable;
- browser/visual evidence with named viewport/device/profile;
- performance, accessibility, security and cognition/eval gates;
- rollback/recovery path;
- implementation and independent reviewer roles; and
- observable definition of done.

## Execution loop

For each bounded change: implement → run focused tests → run the actual local game → browser playtest → inspect visual/semantic evidence → independent review → fix → rerun. A passing build or backend test suite cannot substitute for the game being understandable in the browser.

Before integration, the coordinator verifies ancestry, worktree ownership, changed files, actual Git diff, secrets, licenses, tests, evidence, scope and `git diff --check`. Integrate only a clean commit. Subagents cannot delegate and cannot edit coordinator-owned plan/decision/evidence logs.

## Stop rules

Stop and record the condition when:

- a P0, unmitigated P1, data-loss or authorization risk exists;
- the next step requires deployment, spending, credentials, public publication or scope outside authorization;
- passing a product gate requires weakening its acceptance criterion;
- the irreducible product loop exceeds the time envelope after all declared cuts; or
- required evidence is impossible from the current environment.

Elapsed time alone is not a completion or stop condition. Completion means every milestone and product gate has reproducible evidence, the branch is clean, reviews are reconciled, and no required work remains.

## Closure

On completion, move the plan from `active/` to `completed/` in one reviewable commit, preserve its final logs/evidence links, update the authority index, and state which hypotheses remain unvalidated by humans. Do not merge or deploy unless separately authorized.
