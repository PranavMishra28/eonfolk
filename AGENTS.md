# EONFOLK engineering control

**Purpose:** Control repository agents during implementation and future maintenance.

**Status:** ACTIVE REPOSITORY INSTRUCTIONS — V1 software is merged; do not reopen that lattice

**Authority boundary:** This file owns agent process; [docs/INDEX.md](docs/INDEX.md) owns content authority.

**Related documents:** [authority index](docs/INDEX.md), [historical V1 ledgers](docs/exec-plans/completed/README.md).

This repository is the system of record for EONFOLK planning, implementation, and evidence.

## Mission and constraints

- Maintain the merged local V1 product on ordinary branches targeting protected `main`. Do not reopen the V1 civilization lattice, rewrite frozen Gate 0 treatment resolution as game logic, or treat historical ledgers as current runbooks.
- Preserve World/Reality/Epistemics/Truth/Brain/Chronicle/Experiment/Observatory boundaries: typed Reality is sole authority; diagnostics, feedback, cognition, ontology projections, and experiments never mutate it; no hidden chain-of-thought.
- Target approximately $0 spend; incur no cost, deploy nothing, and add no credentials without explicit approval.
- The product remains useful and free. Payments, revenue operations, model training, proprietary datasets, partnerships, regulated data, and enterprise sales are out of scope.
- Historical evidence is preserved by immutable tags and files under `docs/exec-plans/completed/`.
- Start with [README.md](README.md), then [docs/INDEX.md](docs/INDEX.md). Use the completed V1 ledgers only when reconstructing that merge.

## Evidence language

- **VERIFIED FACT:** supported by an opened, dated source.
- **INFERENCE:** reasoned conclusion from facts.
- **PRODUCT HYPOTHESIS:** proposition requiring implementation or player evidence.
- **UNRESOLVED:** important uncertainty without sufficient evidence.

Material external claims cite an `S-*` entry in `docs/research/SOURCE_LEDGER.md`. Decisions, risks, and questions use stable `D-*`, `R-*`, and `Q-*` identifiers.

## Agent contract

Bounded agents work only on their assigned artifact and file allowlist. They do not create goals, broaden scope, spawn agents, or edit shared authorities. They return findings, evidence, objections, uncertainties, recommendations, tests, and one clean commit. Writing agents use isolated worktrees.

The coordinator owns `docs/INDEX.md`, shared contracts, integration, and pull requests. The coordinator inspects every actual diff before integration. Historical V1 ledgers under `docs/exec-plans/completed/` are snapshots, not living requirement lists.

## Document quality

Every authority document states the decision it owns, evidence that would reopen it, rejected alternatives, unproven assumptions, resulting implementation behavior, and fit with the binding personal constraints. Merge or remove redundant prose; a filename is not a deliverable.

## Completion checks

- `git diff --check`
- verify internal Markdown links and source IDs
- search for unfinished-work markers, placeholders, and unsupported “current” claims
- verify no credentials, deployment artifacts, unsupported product claims, or mutable evidence entered the tree
- run the repository's fast or full verification command appropriate to the change
- do not claim human attachment, adoption, or playtest results without dated human notes stored outside git
