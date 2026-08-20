# EONFOLK planning run

**Purpose:** Track planning execution, integrations, frozen-review state, blockers and evidence for the final readiness declaration.

**Status:** FROZEN SYNTHESIS UNDER ADVERSARIAL REVIEW

**Authority boundary:** This file owns planning status, evidence gates, integration history, frozen SHA and exit checklist. [INDEX](docs/INDEX.md) owns document authority; [decisions](docs/decisions/DECISIONS.md) owns product acceptance.

**Related documents:** [authority index](docs/INDEX.md), [source ledger](docs/research/SOURCE_LEDGER.md), [risks](docs/decisions/RISKS.md), [first ExecPlan](docs/exec-plans/active/001-foundation.md).

## Binding constraints

- Solo builder; first compelling slice must fit approximately 40–60 focused engineering hours.
- MacBook M4 Pro; no owned GPU infrastructure, model training or fine-tuning.
- Spend target approximately $0. The $50/$300 envelopes are comparisons, not spending authorization.
- V1 is useful/free. Revenue, payments, custody, licensing operations, regulated data, proprietary datasets, partnerships and enterprise sales are excluded.
- Planning contains documentation, research evidence, selected concepts and repository hygiene only—no production game code, dependency manifest, deployment or license.

## Phase status

| Phase | Status | Concrete evidence |
|---|---|---|
| 1. Private repository and evidence spine | Complete | Private `PranavMishra28/eonfolk`; `main`; source ledger; authority skeleton |
| 2. Independent research and zero-anchor challenge | Complete | Competition/player/distribution, systems/model/tools, ECHOHOUSE challenge |
| 3. Product, game, design, engineering and quality synthesis | Complete | Bounded-region winner, Living Woodcut/PixiJS, local-first Standard-Brain architecture |
| 4. Matched visual concepts and disposable spikes | Complete | Fifteen selected concepts; simulation, rendering and cognition evidence; scratch code not merged |
| 5. Frozen discipline and player-perspective reviews | In progress | All independent reviews target immutable SHA `4f47eae261ad4011b5126bef0a17cfc5332af7f4` |
| 6. Reconciliation, final review, QA and draft PR | In progress | ExecPlan, Goal prompt and coordinator authorities drafted; review findings remain to reconcile |

## Integration history

| Work | Source branch/SHA | Integrated SHA | Files/ownership | Coordinator inspection |
|---|---|---|---|---|
| Bootstrap | local `main` | `bb9e945` | Empty commit only | Clean unborn repo, private remote and default branch verified |
| Knowledge skeleton | coordinator | `f2e3db0` | Planning tree/hygiene | Exact paths, no code/dependencies/license/credentials |
| Zero-anchor challenge | `research/zero-anchor` / `a512c3b` | `bbdfa81` | One review file | Ancestry, allowlist, diff, constraints and sources checked |
| Competition/player/distribution | `research/competition` / `13109c72` | `e8448d5` | Three research files | Ancestry, allowlist, dated claims, citations, secrets and diff checked |
| Systems/model/tools | `research/systems` / `5ccf8cd` | `065cb84` | Three research files | Ancestry, allowlist, primary sources, tool probes and diff checked |
| Visual concepts | coordinator/image generation | `ae1279c` | 15 PNGs plus provenance | Each output reviewed; exact prompt, output ID and SHA-256 recorded |
| Source-ledger consolidation | coordinator | `45442e8` | Shared ledger only | 111 evidence rows normalized to canonical identifiers |
| Naming screen | coordinator/browser | `52b9213` | Naming evidence and ledger | Web/GitHub/stores/RDAP/USPTO/WIPO/EUIPO exact queries; no clearance claim |
| Product/game synthesis | `research/product` / `419ab58` | `39fc604` | 12 allowlisted product/game files | Parent, actual diff, citations, secrets, constraints and checks inspected |
| Visual synthesis | `research/design` / `486d7a7` | `edf9553` | 6 allowlisted design files | Parent, actual diff, concept use, renderer conclusion and checks inspected |
| Engineering/quality synthesis | `research/engineering` / `669e87b` | `700ed3f` | 12 allowlisted engineering/quality files | Parent, actual diff, contracts, CI/security/budgets and checks inspected |
| Product source remap | coordinator | `25e8aa6` | Product research/authority | Six proposed rows verified/remapped to existing canonical ledger IDs |

Research branches were not pushed. The coordinator staged explicit paths and integrated only clean commits.

## Disposable spike evidence

Scratch worktrees/branches were not merged and must be removed after the planning review preserves their SHAs.

| Spike | Local SHA | Result | Decision consequence |
|---|---|---|---|
| Deterministic simulation | `cd5eea0` | 24h/7d repeated and replay hashes matched; discrete scheduling was 3.66×/2.69× faster than ticks in the fixture | Preserve deterministic reducer/scheduler/contracts; extend to 30/90/365 days during implementation |
| Representative R3F rendering | `4bdef56` | 291.39 KB gzip JS; ~1s load; p95 17.1 ms desktop/laptop and 17.3 ms mobile viewport; mobile panel overflow | 3D plausible but did not pass; Living Woodcut selects PixiJS and requires new measured authored proof |
| Bounded cognition | `780bf84` | qwen3-coder 30B: 8,064 ms cold/855 ms warm; schema/auth/fallback passed; public copy failed quality | Boundary shape valid; no model runtime ships; Standard Brain remains complete |

## GitHub capability probe — 2026-08-20

Repository remained private with default `main`. Actions are enabled with all actions allowed and no required SHA pinning. Rulesets API returned an empty list; `main` is unprotected. Dependabot alerts and automated fixes are disabled. Secret scanning is disabled, push protection is not evidenced, code scanning is disabled, and private vulnerability reporting was not established. No setting was changed. Exact API results and implementation consequences are recorded in [testing](docs/quality/TESTING.md#actual-private-repository-probe--2026-08-20).

## Frozen review state

The initial synthesis is frozen at full SHA **`4f47eae261ad4011b5126bef0a17cfc5332af7f4`** (`docs: freeze initial product foundation synthesis`). All four discipline/player reviews target that identical commit and receive no earlier review output. Review files are integrated only after all four reports are complete.

## Exit evidence

- [x] Private repository, `main` and planning branch verified.
- [x] Authority map, source ledger, Top 10 decisions, Top 5 assumptions and Top 5 change triggers drafted.
- [x] Competition, distribution, player, game-design, systems, model, naming, tool and design evidence sourced.
- [x] Zero-anchor challenger compared using the same product rubric/scenarios.
- [x] Structure, starting unit, timed loop, return, session-20, death, newcomer, inactivity, stagnation and fork policy specified.
- [x] Model ecology, deterministic fallback, persistence, absence, scale, cost, security and moderation specified.
- [x] Fifteen matched concepts retained with prompt/provenance; Living Woodcut selected with runner-up/rejections.
- [x] Tool/plugin/MCP inventory includes every requested capability and required fields.
- [x] CI contract and actual private-repository capability probe recorded.
- [x] Initial performance/accessibility budgets use measured rendering-spike evidence.
- [x] Two-gate 52-hour ExecPlan has browser-visible acceptance criteria.
- [x] Self-contained implementation Goal prompt drafted.
- [ ] Four frozen-state reviews and five player perspectives complete.
- [ ] Every P0/P1 reconciled and affected authority revised.
- [ ] Final cross-discipline review and any single targeted confirmation complete.
- [ ] Final readiness answers specific/falsifiable and Goal prompt passes zero-context review.
- [ ] Internal links, source IDs, contradictions, Markdown and Git diff pass final QA.
- [ ] Scratch worktrees removed with SHAs retained in this plan.
- [ ] Planning branch pushed and exactly one draft PR opened; no merge.

`READY FOR GOAL MODE` will mean ready to implement and falsify the slice. It will not claim that fun, attachment, refusal tolerance or session-20 retention have been validated with humans.
