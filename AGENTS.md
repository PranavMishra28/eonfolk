# EONFOLK engineering control

**Purpose:** Control repository agents during implementation and future maintenance.

**Status:** ACTIVE REPOSITORY INSTRUCTIONS

**Authority boundary:** This file owns agent process; [docs/INDEX.md](docs/INDEX.md) owns content authority.

**Related documents:** [GOAL.md](GOAL.md), [RESUME.md](RESUME.md), [docs/INDEX.md](docs/INDEX.md).

This repository is the system of record for EONFOLK planning, implementation, and evidence.

## Mission and constraints

- Implement the V1 civilization benchmark through the sole integration branch `feat/v1-civilization` and its one draft mega PR. `main` remains the protected integration target.
- Preserve World/Reality/Epistemics/Truth/Brain/Chronicle/Experiment/Observatory boundaries: typed Reality is sole authority; diagnostics, feedback, cognition, ontology projections, and experiments never mutate it; no hidden chain-of-thought.
- Keep all required V1 software in [GOAL.md](GOAL.md) until executable acceptance evidence is verified; difficulty or elapsed time never converts a requirement to future work.
- Target approximately $0 spend; incur no cost, deploy nothing, and add no credentials without explicit approval.
- V1 is useful and free. Payments, revenue operations, model training, proprietary datasets, partnerships, regulated data, and enterprise sales are out of scope.
- Never edit or reuse frozen Gate 0 treatment resolution as authoritative game logic. Historical evidence is preserved by immutable tags.
- Start with `GOAL.md`, then `RESUME.md`, then `docs/INDEX.md`.

## Evidence language

- **VERIFIED FACT:** supported by an opened, dated source.
- **INFERENCE:** reasoned conclusion from facts.
- **PRODUCT HYPOTHESIS:** proposition requiring implementation or player evidence.
- **UNRESOLVED:** important uncertainty without sufficient evidence.

Material external claims cite an `S-*` entry in `docs/research/SOURCE_LEDGER.md`. Decisions, risks, and questions use stable `D-*`, `R-*`, and `Q-*` identifiers.

## Agent contract

Bounded agents work only on their assigned artifact and file allowlist. They do not create goals, broaden scope, spawn agents, or edit shared authorities. They return findings, evidence, objections, uncertainties, recommendations, tests, and one clean commit. Writing agents use isolated worktrees.

The coordinator owns `GOAL.md`, `RESUME.md`, `docs/INDEX.md`, shared contracts, integration, and the one draft PR. The coordinator inspects every actual diff before integration.

## Document quality

Every authority document states the decision it owns, evidence that would reopen it, rejected alternatives, unproven assumptions, resulting implementation behavior, and fit with the binding personal constraints. Merge or remove redundant prose; a filename is not a deliverable.

## Completion checks

- `git diff --check`
- verify internal Markdown links and source IDs
- search for unfinished-work markers, placeholders, and unsupported “current” claims
- verify no credentials, deployment artifacts, unsupported product claims, or mutable evidence entered the tree
- run the repository's fast or full verification command appropriate to the change
- do not mark the draft PR ready or merge until every required `GOAL.md` row is VERIFIED and the frozen-SHA reviews pass
