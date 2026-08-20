# EONFOLK authority index

**Purpose:** Provide the sole map from every planning concern and retained artifact to its canonical owner.

**Status:** CIVILIZATION AMENDMENT INTEGRATED — fresh review and QA pending

**Authority boundary:** This file owns document authority, retention, and read order. It does not restate product or technical decisions.

**Related documents:** [planning status](../PLAN.md), [decisions](decisions/DECISIONS.md), [source ledger](research/SOURCE_LEDGER.md), [first ExecPlan](exec-plans/active/001-foundation.md).

Each concern has one authority. Research records evidence; reviews record objections; authority documents decide. If two files disagree, use this map and repair the non-authoritative file.

## Default six-file read order

1. **This index.**
2. [Product](product/PRODUCT.md).
3. [Human loop](product/HUMAN_LOOP.md).
4. [Distribution](product/DISTRIBUTION.md).
5. [Architecture](engineering/ARCHITECTURE.md).
6. [001-foundation ExecPlan](exec-plans/active/001-foundation.md).

## Coordinator-owned shared authorities

| Concern | Sole authority |
|---|---|
| Planning status, gates, integrations, frozen SHA, exit checklist | [PLAN.md](../PLAN.md) |
| This ownership map and retained-artifact inventory | `INDEX.md` |
| External and measured claim provenance | [SOURCE_LEDGER.md](research/SOURCE_LEDGER.md) |
| Accepted decisions and review reconciliation | [DECISIONS.md](decisions/DECISIONS.md) |
| Ranked risks and abandon/change triggers | [RISKS.md](decisions/RISKS.md) |
| Unproven assumptions and fastest falsification | [OPEN_QUESTIONS.md](decisions/OPEN_QUESTIONS.md) |

## Product authorities

| Concern | Sole authority |
|---|---|
| Promise, audience, selected structure, starting unit, differentiation | [PRODUCT.md](product/PRODUCT.md) |
| Human verbs, first seconds, intervention, explicit return and second action | [HUMAN_LOOP.md](product/HUMAN_LOOP.md) |
| Lifetime, death, succession, inactive sponsor and long-term depth | [PROGRESSION.md](product/PROGRESSION.md) |
| Region topology, newcomer entry, stagnation, canon and private forks | [WORLD_STRUCTURE.md](product/WORLD_STRUCTURE.md) |
| Causal truth, Riverhold fixture, return summary, replay and share facts | [CHRONICLE.md](product/CHRONICLE.md) |
| Future Observatory, research claims, three-ledger provenance and experiment semantics | [OBSERVATORY.md](product/OBSERVATORY.md) |
| First 10/100/1,000 and intrinsic distribution artifact | [DISTRIBUTION.md](product/DISTRIBUTION.md) |

## Game authorities

| Concern | Sole authority |
|---|---|
| Retained mechanics and primitive/system/emergence boundary | [GAME_SYSTEMS.md](game/GAME_SYSTEMS.md) |
| Authoritative ontology, invariants and event semantics | [WORLD_MODEL.md](game/WORLD_MODEL.md) |
| Needs, beliefs, relationships, plans, death and succession | [AGENT_LIFE.md](game/AGENT_LIFE.md) |
| Institutional power, law, offices and conflict | [GOVERNANCE.md](game/GOVERNANCE.md) |
| Resources, ownership, production, exchange and contracts | [ECONOMY.md](game/ECONOMY.md) |

## Design authorities

| Concern | Sole authority |
|---|---|
| Visual hierarchy and Living Woodcut grammar | [DESIGN.md](design/DESIGN.md) |
| Direction selection, runner-up, rejection and asset pipeline | [ART_DIRECTIONS.md](design/ART_DIRECTIONS.md) |
| Desktop interaction, information behavior and semantic alternatives | [INTERACTION.md](design/INTERACTION.md) |
| Motion, sound and reduced-motion behavior | [MOTION_SOUND.md](design/MOTION_SOUND.md) |
| Narrow-screen composition and degradation | [MOBILE.md](design/MOBILE.md) |
| Reviewable concepts, prompts, output identifiers and hashes | [concept provenance](design/concepts/README.md) |

## Engineering authorities

| Concern | Sole authority |
|---|---|
| Layers, packages, three-ledger authority, local-first runtime and future region-server seam | [ARCHITECTURE.md](engineering/ARCHITECTURE.md) |
| UI stack, PixiJS/DOM boundary, routing and asset delivery | [FRONTEND.md](engineering/FRONTEND.md) |
| Determinism, scheduler, commands, events and catch-up | [SIMULATION.md](engineering/SIMULATION.md) |
| IndexedDB world/decision stores, Experiment Manifest, atomic genesis, durable receipts/fencing, snapshots, replay, and version/no-backup policy | [PERSISTENCE.md](engineering/PERSISTENCE.md) |
| Mind, Standard Brain, bounded proposals, raw decision records, viewer-safe trace projections and model ecology | [COGNITION.md](engineering/COGNITION.md) |
| $0/$50/$300 scenarios and cost gates | [COST_MODEL.md](engineering/COST_MODEL.md) |
| Trust boundaries, authorization, moderation and credentials | [SECURITY.md](engineering/SECURITY.md) |

## Quality authorities

| Concern | Sole authority |
|---|---|
| Cross-discipline acceptance and severity definitions | [QUALITY_BAR.md](quality/QUALITY_BAR.md) |
| Tests, CI, Dependabot, GitHub controls and artifact retention | [TESTING.md](quality/TESTING.md) |
| Standard-Brain and later optional-model evaluation | [EVALS.md](quality/EVALS.md) |
| Browser screenshots, observer tests and visual mismatch handling | [VISUAL_QA.md](quality/VISUAL_QA.md) |
| Payload, frame, scale, device and accessibility budgets | [PERFORMANCE.md](quality/PERFORMANCE.md) |

## Research evidence

| Evidence set | Retained artifact |
|---|---|
| Named competitors and adjacent substitutes | [COMPETITORS.md](research/COMPETITORS.md) |
| Review/community/player behavior evidence | [PLAYER_RESEARCH.md](research/PLAYER_RESEARCH.md) |
| Structures A–H, challenger comparison and scenario tournament | [GAME_DESIGN_RESEARCH.md](research/GAME_DESIGN_RESEARCH.md) |
| Simulation, persistence, cognition and infrastructure evidence | [SYSTEMS_RESEARCH.md](research/SYSTEMS_RESEARCH.md) |
| Model routes, local/hosted constraints and provenance | [MODEL_RESEARCH.md](research/MODEL_RESEARCH.md) |
| Visual comparison and rendering-spike interpretation | [DESIGN_RESEARCH.md](research/DESIGN_RESEARCH.md) |
| First-user paths, channels and share behavior | [DISTRIBUTION_RESEARCH.md](research/DISTRIBUTION_RESEARCH.md) |
| Live tool/skill/plugin/MCP availability and risks | [PROPOSED_TOOLS.md](research/PROPOSED_TOOLS.md) |
| Exact future direct/transitive dependency graph, integrity, licenses and lifecycle metadata | [DEPENDENCY_COHORT.md](research/DEPENDENCY_COHORT.md) |
| Bounded codename collision screen | [NAMING_RESEARCH.md](research/NAMING_RESEARCH.md) |

## Reviews

| Review purpose | Retained artifact |
|---|---|
| Blind alternative and hostile thesis challenge | [ZERO_ANCHOR_CHALLENGE.md](reviews/ZERO_ANCHOR_CHALLENGE.md) |
| Product desirability and scope red team | [PRODUCT_RED_TEAM.md](reviews/PRODUCT_RED_TEAM.md) |
| Game loop, attachment and progression red team | [GAME_RED_TEAM.md](reviews/GAME_RED_TEAM.md) |
| Architecture, correctness, security and cost red team | [ENGINEERING_RED_TEAM.md](reviews/ENGINEERING_RED_TEAM.md) |
| Visual direction, access and solo asset-burden red team | [DESIGN_RED_TEAM.md](reviews/DESIGN_RED_TEAM.md) |
| Five hostile player-perspective walkthroughs | [PLAYER_PERSPECTIVES.md](reviews/PLAYER_PERSPECTIVES.md) |
| Final cross-discipline review and frozen findings | [FINAL_RED_TEAM.md](reviews/FINAL_RED_TEAM.md) |
| Targeted confirmation of final cross-discipline fixes | [FINAL_CONFIRMATION.md](reviews/FINAL_CONFIRMATION.md) |
| Immutable zero-context Goal-prompt review trail and final confirmation | [GOAL_PROMPT_REVIEW.md](reviews/GOAL_PROMPT_REVIEW.md) |
| Civilization amendment audit, dispositions and immutable final confirmation | [CIVILIZATION_AMENDMENT_REVIEW.md](reviews/CIVILIZATION_AMENDMENT_REVIEW.md) |
| Twelve readiness answers and final exit evidence | [FINAL_READINESS.md](reviews/FINAL_READINESS.md) |

## Execution and repository hygiene

| Concern | Retained artifact |
|---|---|
| ExecPlan writing and maintenance contract | [PLANS.md](exec-plans/PLANS.md) |
| Two-gate 52-hour vertical slice | [001-foundation.md](exec-plans/active/001-foundation.md) |
| Self-contained future Goal-mode orchestration | [IMPLEMENTATION_GOAL_PROMPT.md](exec-plans/IMPLEMENTATION_GOAL_PROMPT.md) |
| Completed-plan retention path | `exec-plans/completed/.gitkeep` |
| Agent constraints and read order | [AGENTS.md](../AGENTS.md) |
| Secret-safe local examples | [.env.example](../.env.example) and [.gitignore](../.gitignore) |
| Pull-request evidence checklist | [pull request template](../.github/pull_request_template.md) |
| Markdown lint configuration | `../.markdownlint-cli2.jsonc` |

No license, workflow, package manifest, application package, production dependency, credential, deployment artifact, or generated production asset belongs in this planning branch.
