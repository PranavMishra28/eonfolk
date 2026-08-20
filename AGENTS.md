# EONFOLK planning control

**Purpose:** Control planning-only agent behavior and the future implementation handoff.

**Status:** ACTIVE REPOSITORY INSTRUCTIONS

**Authority boundary:** This file owns agent process; [docs/INDEX.md](docs/INDEX.md) owns content authority.

**Related documents:** [PLAN.md](PLAN.md), [ExecPlan contract](docs/exec-plans/PLANS.md), [source ledger](docs/research/SOURCE_LEDGER.md).

This repository is the system of record for the EONFOLK product-foundation planning run.

## Mission and constraints

- Plan a consumer game about autonomous citizens; do not implement production game code on this branch.
- Optimize for a solo builder and a compelling 40–60-hour first implementation slice.
- Target approximately $0 spend; incur no cost, deploy nothing, and add no credentials without explicit approval.
- V1 is useful and free. Payments, revenue operations, model training, proprietary datasets, partnerships, regulated data, and enterprise sales are out of scope.
- Start with `docs/INDEX.md`; it identifies the authority for every concern.

## Evidence language

- **VERIFIED FACT:** supported by an opened, dated source.
- **INFERENCE:** reasoned conclusion from facts.
- **PRODUCT HYPOTHESIS:** proposition requiring implementation or player evidence.
- **UNRESOLVED:** important uncertainty without sufficient evidence.

Material external claims cite an `S-*` entry in `docs/research/SOURCE_LEDGER.md`. Decisions, risks, and questions use stable `D-*`, `R-*`, and `Q-*` identifiers.

## Agent contract

Bounded agents work only on their assigned artifact and file allowlist. They do not create goals, broaden scope, spawn agents, edit shared ledgers, or implement production code. They return findings, evidence, objections, uncertainties, recommendations, and proposed source-ledger rows. Writing agents use isolated worktrees and one clean commit.

The coordinator owns `PLAN.md`, `docs/INDEX.md`, `docs/research/SOURCE_LEDGER.md`, and all files under `docs/decisions/`. The coordinator inspects every actual diff before integration.

## Document quality

Every authority document states the decision it owns, evidence that would reopen it, rejected alternatives, unproven assumptions, resulting implementation behavior, and fit with the binding personal constraints. Merge or remove redundant prose; a filename is not a deliverable.

## Completion checks

- `git diff --check`
- verify internal Markdown links and source IDs
- search for unfinished-work markers, placeholders, and unsupported “current” claims
- verify the planning branch contains no production application, license, credentials, or deployment artifacts
- do not declare readiness until `PLAN.md` links every exit criterion to concrete evidence
