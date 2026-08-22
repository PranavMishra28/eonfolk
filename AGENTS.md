# EONFOLK engineering control

**Purpose:** Control repository agents during implementation and future maintenance.

**Status:** ACTIVE REPOSITORY INSTRUCTIONS

**Authority boundary:** This file owns agent process; [docs/INDEX.md](docs/INDEX.md) owns content authority.

**Related documents:** [PLAN.md](PLAN.md), [ExecPlan contract](docs/exec-plans/PLANS.md), [source ledger](docs/research/SOURCE_LEDGER.md).

This repository is the system of record for EONFOLK planning, implementation, and evidence.

## Mission and constraints

- Implement Founder Alpha through the sole integration branch `feat/002-founder-alpha` and its one mega PR. `main` remains the protected integration target.
- Preserve World/Reality/Epistemics/Truth/Brain/Chronicle/Experiment/Observatory boundaries: typed Reality is sole authority; diagnostics, feedback, cognition, ontology projections, and experiments never mutate it; no hidden chain-of-thought.
- Optimize for a solo builder and a compelling 40–60-hour first implementation slice.
- Target approximately $0 spend; incur no cost, deploy nothing, and add no credentials without explicit approval.
- V1 is useful and free. Payments, revenue operations, model training, proprietary datasets, partnerships, regulated data, and enterprise sales are out of scope.
- Never edit or reuse frozen Gate 0 treatment resolution as authoritative game logic. Historical evidence is preserved by immutable tags.
- Start with `docs/INDEX.md`; it identifies the authority for every concern.

## Evidence language

- **VERIFIED FACT:** supported by an opened, dated source.
- **INFERENCE:** reasoned conclusion from facts.
- **PRODUCT HYPOTHESIS:** proposition requiring implementation or player evidence.
- **UNRESOLVED:** important uncertainty without sufficient evidence.

Material external claims cite an `S-*` entry in `docs/research/SOURCE_LEDGER.md`. Decisions, risks, and questions use stable `D-*`, `R-*`, and `Q-*` identifiers.

## Agent contract

Bounded agents work only on their assigned artifact and file allowlist. They do not create goals, broaden scope, spawn agents, or edit shared authorities. They return findings, evidence, objections, uncertainties, recommendations, tests, and one clean commit. Writing agents use isolated worktrees.

The coordinator owns `PLAN.md`, `docs/INDEX.md`, `docs/research/SOURCE_LEDGER.md`, and all files under `docs/decisions/`. The coordinator inspects every actual diff before integration.

## Document quality

Every authority document states the decision it owns, evidence that would reopen it, rejected alternatives, unproven assumptions, resulting implementation behavior, and fit with the binding personal constraints. Merge or remove redundant prose; a filename is not a deliverable.

## Completion checks

- `git diff --check`
- verify internal Markdown links and source IDs
- search for unfinished-work markers, placeholders, and unsupported “current” claims
- verify no credentials, deployment artifacts, unsupported product claims, or mutable evidence entered the tree
- run the repository's fast or full verification command appropriate to the change
- do not declare implementation readiness until `PLAN.md` links every applicable criterion to concrete evidence
