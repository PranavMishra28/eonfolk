# EONFOLK development run

**Purpose:** Track planning, implementation, integrations, frozen evidence, blockers, and release-readiness evidence.

**Status:** FOUNDER ALPHA ACTIVE — seven first-confirmation P1s repaired; targeted confirmation and final release lattice pending

**Authority boundary:** This file owns planning status, evidence gates, integration history, frozen SHA and exit checklist. [INDEX](docs/INDEX.md) owns document authority; [decisions](docs/decisions/DECISIONS.md) owns product acceptance.

**Related documents:** [authority index](docs/INDEX.md), [source ledger](docs/research/SOURCE_LEDGER.md), [risks](docs/decisions/RISKS.md), [Founder Alpha ExecPlan](docs/exec-plans/active/002-founder-alpha.md), [completed first ExecPlan](docs/exec-plans/completed/001-foundation.md).

## Binding constraints

- Solo builder; first compelling slice must fit approximately 40–60 focused engineering hours.
- MacBook M4 Pro; no owned GPU infrastructure, model training or fine-tuning.
- Spend target approximately $0. The $50/$300 envelopes are comparisons, not spending authorization.
- V1 is useful/free. Revenue, payments, custody, licensing operations, regulated data, proprietary datasets, partnerships and enterprise sales are excluded.
- The local proof may contain production game code and pinned open-source dependencies. Deployment, paid action, credentials, model weights, and public publication remain forbidden.

## Phase status

| Phase | Status | Concrete evidence |
|---|---|---|
| 1. Private repository and evidence spine | Complete | Private `PranavMishra28/eonfolk`; `main`; source ledger; authority skeleton |
| 2. Independent research and zero-anchor challenge | Complete | Competition/player/distribution, systems/model/tools, ECHOHOUSE challenge |
| 3. Product, game, design, engineering and quality synthesis | Complete | Bounded-region winner, Living Woodcut/PixiJS, local-first Standard-Brain architecture |
| 4. Matched visual concepts and disposable spikes | Complete | Fifteen selected concepts; simulation, rendering and cognition evidence; scratch code not merged |
| 5. Frozen discipline and player-perspective reviews | Complete | Four isolated red teams and five fresh persona walkthroughs target immutable SHA `4f47eae8fe785f3994e053d01c184e9e3dddb401` |
| 6. Reconciliation, final review, QA and draft PR | Complete | Amendment reviews/fixes, exact Goal-blob confirmation, fresh QA, private-repo probe, branch push and existing draft-PR update passed |
| 7. Operator-authorized implementation and consolidation | Complete under override | Private `main` contains preserved planning plus the repaired Riverhold proof; final canonical 15-run performance, complete local verification, pushed-candidate CI, protection, full-history scanning, archive tags, and cleanup pass; the one allowed targeted confirmation's three P1s are repaired; human gates remain NOT RUN |
| 8. Founder Alpha observability, feedback, cognition, polish, and release hardening | Targeted confirmation pending | Start SHA `74a8a7e`; six-review candidate `7319d59` and first confirmation candidate `d9f7c20` were correctly rejected; all frozen and seven confirmation P1s now have accepted bounded repairs/direct regressions on sole branch `feat/002-founder-alpha` |

## Operator implementation override — 2026-08-21

The operator attachment with SHA-256 `d1d339de6a0814b316bd9e7d95c7c9c948cf1d13dfc9bfbb3f10934cc91d89d2` explicitly authorizes implementation to continue without human Gate 0/A/B evidence, direct bootstrap consolidation onto `main`, repository hardening, open-source tooling, and safe archival cleanup. It does **not** authorize fabricated evidence, paid services, deployment, public publication, secrets, or deletion of unique history.

Gate 0/A/B are therefore recorded as **OPERATOR IMPLEMENTATION OVERRIDE**, never **MEASURED HUMAN PASS**. Historical study state remains immutable at the evidence tags. The override record is [operator-implementation-override.md](docs/exec-plans/evidence/001/operator-implementation-override.md).

Verified bootstrap state:

- GitHub reports `PranavMishra28/eonfolk` private with default branch `main`.
- Planning head `f8b82d8` and implementation checkpoint `3d25686` were merged without rewriting history at `cc12d33`.
- Annotated tags preserve the planning head, implementation checkpoint, Gate 0 artifact A, study S, and resume checkpoint.
- Implementation workspace scaffold commit `4fb5f93` pins Node 22.23.1 and pnpm 11.15.1 and rejects x64 Node on macOS.
- After pushed-candidate CI turned green, every unique obsolete branch head was preserved by a remote annotated tag; obsolete PR #2, its two remote branches, seven clean auxiliary worktrees, and 23 local branches were then removed without deleting unique history.
- Systems, persistence, UI and coordinator work were integrated through `20b6d3b`; three independent reviews froze `b387a6d`, their first repairs are `bad215a`, a fresh confirmation failure at `1834f1f` produced `970879a`, and the one final targeted confirmation at `32808e1` exposed three remaining P1s repaired in `90d999b`/`50b2310`. No second confirmation is claimed.
- M1–M5 focused hours are UNKNOWN because contemporaneous segments were not preserved across the resumed run. The 40–60-hour fit therefore remains an unproven scope hypothesis, not an evidence-backed implementation claim.

## Implementation candidate evidence — 2026-08-21

Local `pnpm verify` at `4a677a743d4efcdc337c6ffc0c79d63edee69e8f` passed runtime/cohort/architecture/docs/format/lint/typecheck; 63 unit tests; two property tests; a real Chromium IndexedDB reload; the fixed 20-warmup/200-cycle timing analyzer; build and bundle budgets; a zero-advisory production audit; eight Chromium journeys; 334 routed requests plus 36,489 Chromium-netlog events with zero external attempts; and the bounded TLA+ model (3,480 generated/350 distinct states, depth 10, five invariants). Gitleaks 8.30.1 independently scanned all 103 commits and 4.21 MB of history with no leaks.

The final canonical headed performance harness completed 15 full journeys from clean commit `adf71c841066e1ead961493fa98394c206ca26d3`, using a fresh pinned browser/context/netlog per repetition. It built and hash-bound its own preview output, forced each browser offline after meaningful display, sampled arrival/busy-market/Chronicle for 30 seconds each, kept every pooled and per-state p95 at 9.3 ms or better, and marked meaningful world by 2,266.6 ms in the throttled mobile profile. The route oracle and all 15 independent netlogs recorded zero external attempts. Start/end source, lockfile, dist, browser cohort, arrival invariants, and AC power boundaries matched; power moved from 72% to 85% charging in normal mode. Two prior AC attempts were discarded in full after exposing opaque arrival and long-lived-browser navigation failure modes; no partial sample was accepted and no numerical gate changed. [Performance](docs/exec-plans/evidence/001/implementation/performance.json), [bundle](docs/exec-plans/evidence/001/implementation/bundle.json), and [timing](docs/exec-plans/evidence/001/implementation/decision-trace-timing.json) evidence are retained. The [implementation review](docs/reviews/IMPLEMENTATION_FINAL_REVIEW.md) records all limitations and dispositions.

This evidence does not establish fun, unfamiliar-observer legibility, attachment, delayed return, Story Card comprehension/conversion, physical mobile/4G performance, production scale, or the 40–60-hour labor budget. Gate 0/A/B/Card remain **NOT RUN**.

## Integration history

| Work | Source branch/SHA | Integrated SHA | Files/ownership | Coordinator inspection |
|---|---|---|---|---|
| Bootstrap | local `main` | `bb9e945` | Empty commit only | Clean unborn repo, private remote and default branch verified |
| Knowledge skeleton | coordinator | `f2e3db0` | Planning tree/hygiene | Exact paths, no code/dependencies/license/credentials |
| Zero-anchor challenge | `research/zero-anchor` / `a512c3b` | `bbdfa81` | One review file | Ancestry, allowlist, diff, constraints and sources checked |
| Competition/player/distribution | `research/competition` / `13109c72` | `e8448d5` | Three research files | Ancestry, allowlist, dated claims, citations, secrets and diff checked |
| Systems/model/tools | `research/systems` / `5ccf8cd` | `065cb84` | Three research files | Ancestry, allowlist, primary sources, tool probes and diff checked |
| Visual concepts | coordinator/image generation | `ae1279c` | 15 PNGs plus provenance | Each output reviewed; normalized prompt contract, output ID and SHA-256 recorded; byte-for-byte invocation text was not retained and is not claimed |
| Source-ledger consolidation | coordinator | `45442e8` | Shared ledger only | 111 evidence rows normalized to canonical identifiers |
| Naming screen | coordinator/browser | `52b9213` | Naming evidence and ledger | Web/GitHub/stores/RDAP/USPTO/WIPO/EUIPO exact queries; no clearance claim |
| Product/game synthesis | `research/product` / `419ab58` | `39fc604` | 12 allowlisted product/game files | Parent, actual diff, citations, secrets, constraints and checks inspected |
| Visual synthesis | `research/design` / `486d7a7` | `edf9553` | 6 allowlisted design files | Parent, actual diff, concept use, renderer conclusion and checks inspected |
| Engineering/quality synthesis | `research/engineering` / `669e87b` | `700ed3f` | 12 allowlisted engineering/quality files | Parent, actual diff, contracts, CI/security/budgets and checks inspected |
| Product source remap | coordinator | `25e8aa6` | Product research/authority | Six proposed rows verified/remapped to existing canonical ledger IDs |
| Product frozen red team | `review/product` / `9433f49b` | `0fe9ef4` | `PRODUCT_RED_TEAM.md` only | Frozen parent, one-file diff and checks inspected after all four completed |
| Game frozen red team | `review/game` / `3cb33e8e` | `0bb14aa` | `GAME_RED_TEAM.md` only | Frozen parent, one-file diff and checks inspected after all four completed |
| Engineering frozen red team | `review/engineering` / `6e3695a1` | `698c268` | `ENGINEERING_RED_TEAM.md` only | Frozen parent, one-file diff and checks inspected after all four completed |
| Design frozen red team | `review/design` / `1934bd18` | `b51f7fc` | `DESIGN_RED_TEAM.md` only | Frozen parent, one-file diff and checks inspected after all four completed |
| Authority reconciliation | coordinator | `6850b69` | Shared decisions/product/game/design/engineering/quality/ExecPlan authorities | Every frozen P0/P1 mapped, actual diff and contradiction matrix inspected |
| Final cross-discipline review | `review/final` / `cb978be` | `337326b` | `FINAL_RED_TEAM.md` only | Review pinned to `6850b699`; five P1 and one P2 findings recorded without edits |
| Final bounded fixes | coordinator | `94f3acd` | Determinism, visibility, estimate, Gate 0, Riverhold and source-ledger authorities | Named baseline diff, vectors, source IDs, links and contradictions checked |
| Targeted final confirmation | `review/final-confirmation` / `e56caf5` | `4e82450` | `FINAL_CONFIRMATION.md` only | Independent confirmation passed FR-001–FR-006 against named commits |
| Goal-mode prompt hardening and confirmation | coordinator plus zero-context review rounds | `4cf18d7` | `IMPLEMENTATION_GOAL_PROMPT.md`, dependency/browser evidence and Goal review trail | A final fresh full audit found two narrow study ambiguities; both were closed, and the final targeted confirmation passed exact blob `ba01b70` with no P0/P1 |
| Civilization amendment | coordinator / attached amendment SHA-256 `8f8a692f…` | `d944ac9` | Product/game/engineering/quality/ExecPlan authorities | Exact attachment read; no Gate A/B mechanic, production code, model, server, fork, dashboard or budget expansion |
| Amended implementation-base reconciliation | coordinator | `e9c356b` | Goal/ExecPlan plus run, provenance, replay, epistemic and evidence contracts | Literal bases/ancestry, task sums, amendment substitution and exact diff inspected before immutable review |
| Fresh amendment audits and bounded fixes | three fresh reviewers against `e9c356b`; coordinator | `2f4722e` | Gate protocols, provenance vectors, replay headers, V2 study streams, catch-up recovery and readiness evidence | Seven P1 and six P2 accepted and repaired; Node/Ruby vectors, citations, links and actual changed files inspected |
| Final amended base and confirmation trail | coordinator plus one fresh read-only targeted reviewer against `b2e755c` | `4cd1700` | Exact Goal base binding, amendment review and Goal review trail | Reviewer returned PASS with zero residual/new P0/P1; exact Goal blob `a5e3035`, bytes, hashes, ancestry and all eleven obligations confirmed |

Research branches were not pushed. The coordinator staged explicit paths and integrated only clean commits.

### Founder Alpha integration checkpoint

| Work | Integrated SHA | Coordinator evidence |
|---|---|---|
| Diagnostics contracts and runtime | `64ade02`, `625869c`, `09c8981`, `e2b4efb`, `b04c10a`, `377cd62` | Allowlisted diffs, redaction/Sentinel/observer tests, full session identity, truthful browser boundaries, HMR behavior, build and zero-egress checks inspected |
| Local feedback and relay | `cdd2a84`, `c3c1328`, `1809cba`, `b3e4f34`, `c071567`, `e173092`, `20c4fd8` | Queue/expiry/image/consent UI, D1 state machine, provider endpoints/crypto and adversarial tests inspected; coordinator caught and repaired one stale-label E2E failure |
| Cognition and Observatory | `9b95022`, `c383de1` | Frozen corpus, hidden-fact pairs, manifest hashes, subprocess contract, authorized projection, validator, imports, and tests inspected; Planner correctly deferred |
| Verification and release | `980645b`, `7234738`, `072265f`, `ee8f3a2`, `279e1c6` | Eight targeted mutants killed, CI path gates/artifacts inspected, source diagnostic budgets passed, physical evidence retained as `NOT_RUN` |
| Frozen six-review record | `e31b6c3`, `35a79a8`, `d3ac5c4`, `3c9573b`, `57ace13`, `ad21815` | Six fresh reviews inspected identical `7319d59`; one P0 and 29 P1 findings were preserved before repair |
| Systems/CI/privacy repair | `a0c6d03`, `2166d37`, `d3915bc` | Durable-before-visible, replay/version/reference, lease/quota/retention, redaction/storage, full-history secret, exact formal tool, and fail-closed lattice fixes inspected |
| Cognition/Observatory repair | `b64531f` | Named controls/ablations/transfer, recursive validation, promotion fail-closure, manifest/result split, and authorized artifact projection inspected |
| Visual/product repair | `2d5f511`, `ab6e420`, `cb535f4` | Mobile/counsel/keyboard/fallback/lexicon/access repairs plus deterministic counsel rejection, six-hour typed consequences, factual Chronicle, exact card times, and production-browser regressions inspected |
| Shared authority synthesis | `7a1ba77`, `d9f7c20`, plus current candidate updates | Every frozen P0/P1 and all seven first-confirmation P1s have an explicit disposition and direct repair evidence; fresh targeted confirmation and final clean lattice remain |
| First Founder Alpha confirmation | `7cbdcfa` | Fresh reviewer inspected exact tagged `d9f7c20`; zero P0 and seven P1 mechanisms retained before repair |
| Confirmation repair batch | `d81d971`, `b99530f`, `c518af1`, `e2fb64b`, `9759988`, `8c49759` | Observatory/hostile-storage, control/claim, execution-bound experiment evidence, production-artifact identity, runnable DEEP browser comparison, and per-constituent tier evidence repaired with direct regressions |

## Disposable spike evidence

Scratch worktrees/branches were not merged. Their SHAs are preserved by remote annotated tags, and their clean worktrees/local branches were removed after the green pushed-candidate checkpoint.

| Spike | Local SHA | Result | Decision consequence |
|---|---|---|---|
| Deterministic simulation | `cd5eea0` | 24h/7d repeated and replay hashes matched; discrete scheduling was 3.66×/2.69× faster than ticks in the fixture | Preserve deterministic reducer/scheduler/contracts; extend to 30/90/365 days during implementation |
| Rejected R3F rendering | `4bdef56` | 291.39 KB gzip JS; ~1s load; p95 17.1 ms desktop/laptop and 17.3 ms mobile viewport; mobile panel overflow | Exposed budget/layout risk; Living Woodcut selects PixiJS and requires a new early authored proof |
| Bounded cognition | `780bf84` | qwen3-coder 30B: 8,064 ms cold/855 ms warm; schema/auth/fallback passed; public copy failed quality | Boundary shape valid; no model runtime ships; Standard Brain remains complete |

## GitHub capability probe — 2026-08-20

Repository remained private with default `main`. Actions are enabled with all actions allowed and no required SHA pinning. Rulesets API returned an empty list; `main` is unprotected. Dependabot alerts and automated fixes are disabled. Secret scanning is disabled, push protection is not evidenced, code scanning is disabled, and private vulnerability reporting was not established. No setting was changed. Exact API results and implementation consequences are recorded in [testing](docs/quality/TESTING.md#actual-private-repository-probe--2026-08-20).

## Final GitHub hardening and cleanup — 2026-08-21

Pushed technical candidate `7d857a216cb9fbd76f2a0afd64418822a84b9a2e` passed all three jobs in [Actions run 32481390293](https://github.com/PranavMishra28/eonfolk/actions/runs/32481390293). GitHub then accepted classic `main` protection with strict required `Verify`, `Formal model`, and `Secret scan` checks, administrator enforcement, and force-push/deletion disabled. Rulesets remain empty; native vulnerability alerts/secret scanning/code scanning remain disabled, so the pinned Gitleaks job is the active secret control. Twenty-six remote tags preserve all unique historical heads. Obsolete draft PR #2 was closed unmerged, its two remote branches were deleted, seven clean auxiliary worktrees and 23 obsolete local branches were removed, and Dependabot PRs #3/#4 remain open and unmerged.

## Frozen review state

The initial synthesis is frozen at full SHA **`4f47eae8fe785f3994e053d01c184e9e3dddb401`** (`docs: freeze initial product foundation synthesis`). All four discipline reviews and five persona walkthroughs targeted that identical commit without earlier review output. The four review files were integrated only after all completed. Their historical verdict was NOT READY; reconciliation accepts and mitigates the P0/P1 findings in `DECISIONS.md`.

## Pre-amendment planning QA — 2026-08-20 (historical)

The following evidence passed for the original planning handoff at `9ed4d28`; it is not current amendment QA and cannot establish current readiness.

`git diff --check` passed. Markdown lint reported 60 files and zero issues. Offline link/anchor validation checked 1,036 links (264 unique) with zero errors. The source audit found 128 unique dated ledger rows, all 128 referenced and no missing source IDs. Every retained Markdown artifact is nonempty and named in `INDEX.md`; `AGENTS.md` is 46 lines. Placeholder and credential-pattern scans were empty. The only worktree is the repository root. The contradiction table in `FINAL_READINESS.md` agrees on product, loop, starting unit, long horizon, distribution, model ecology, renderer, persistence, causality, hours, budgets, CI and security.

The tracked tree contains no production TypeScript/JavaScript/WASM, application dependency or lock manifest, workflow, deployment configuration, license or credential. The three inert dependency-evidence files and final Goal-prompt blob match their recorded sizes and SHA-256 values.

## Civilization amendment final QA — 2026-08-20

The final immutable execution-contract target is commit `b2e755c37a836ccb1660cfa337561be16e93a178`; its Goal prompt is Git blob `a5e30353d3bee951ff25a85758f9accf22aea30a`, 151,873 bytes / 643 newline-terminated lines, raw SHA-256 `12fbdd2a6975b07d8e5e2c5b75a861cbc355cd20c99e5fa4eea903331433b7ae`. The [civilization amendment review](docs/reviews/CIVILIZATION_AMENDMENT_REVIEW.md) records the first-audit failures, every disposition, and the final fresh PASS with zero P0/P1.

`git diff --check` passed. Markdown lint reported 62 files and zero issues. Offline link/anchor validation checked 1,089 links (268 unique) with zero errors. The source audit found 128 unique dated ledger rows, all 128 referenced and no missing source IDs. Every retained Markdown artifact is nonempty and indexed; `AGENTS.md` is 47 lines. The final tree has 84 tracked files, including 15 selected PNG concepts, and the only worktree is the repository root.

The fourteen published determinism preimages in Simulation and Goal, both displayed IDs, V2 PRNG state, synthetic/operational Gate B assignments, synthetic/operational Gate A option orders, Williams balance, 40/52/65 task sums, 52-hour milestone sum and 60-hour ceiling were independently reproduced. The contradiction scan agrees on Gate protocols, World/Chronicle/Observatory identity, three data forms, typed private epistemics, event provenance, batch-header/event replay, final-only multi-event revision, catch-up recovery, no-model fallback, local persistence, Pixi renderer, budgets, CI and scope.

The tracked tree contains no production source, executable dependency/lock manifest, workflow, deployment configuration, license, credential, unfinished marker or empty retained artifact. GitHub remains private with default `main`; Actions are enabled, rulesets are empty, `main` is unprotected, Dependabot/automated fixes/secret scanning/code scanning remain disabled or unevidenced, and no setting was changed. Exactly one draft PR remains open and unmerged.

## Planning draft PR handoff (historical)

At the planning handoff, draft [#1, Plan: Eonfolk product and technical foundation](https://github.com/PranavMishra28/eonfolk/pull/1) was open and unmerged. The later operator override authorized consolidation; #1 was merged, obsolete implementation PR #2 was closed unmerged, and their superseded remote branches were removed only after archive tags and green `main` existed.

## Pre-amendment exit evidence (historical)

- [x] Private repository, `main` and planning branch verified.
- [x] Authority map, source ledger, Top 10 decisions, Top 5 assumptions and Top 5 change triggers drafted.
- [x] Competition, distribution, player, game-design, systems, model, naming, tool and design evidence sourced.
- [x] Zero-anchor challenger compared using the same product rubric/scenarios.
- [x] Structure, starting unit, timed loop, explicit return, inactivity, stagnation and fork policy specified; session-20/death/newcomer claims explicitly deferred.
- [x] Model ecology, deterministic fallback, persistence, absence, scale, cost, security and moderation specified.
- [x] Fifteen matched concepts retained with prompt/provenance; Living Woodcut selected with runner-up/rejections.
- [x] Tool/plugin/MCP inventory includes every requested capability and required fields.
- [x] CI contract and actual private-repository capability probe recorded.
- [x] Initial performance/accessibility budgets use measured rendering-spike evidence.
- [x] 52-planned-hour ExecPlan plus ≤8 fix hours has Gate 0/A/B browser-visible criteria and no scope expansion.
- [x] Self-contained implementation Goal prompt revised after red team.
- [x] Four frozen-state reviews and five player perspectives complete.
- [x] Every P0/P1 mapped to a disposition and affected authorities revised.
- [x] Final cross-discipline review and one targeted confirmation complete.
- [x] Final readiness answers are specific/falsifiable; a fresh full Goal-prompt audit and the final corrective targeted confirmation pass.
- [x] Internal links, source IDs, contradictions, Markdown and Git diff pass final QA.
- [x] Fifteen clean scratch/research/review worktrees removed with local branch SHAs retained in this plan.
- [x] Planning branch pushed and exactly one draft PR opened; no merge.

At the amendment-integration checkpoint, the original `READY FOR GOAL MODE` declaration was suspended pending fresh review, exact Goal-blob confirmation, QA, push and draft-PR update. The current evidence below supersedes that historical suspension.

## Current exit evidence

- [x] Solo-builder, 40–60-hour, M4 Pro, approximately-$0, free-V1, no-training and no-commercial-operation constraints shape the selected scope.
- [x] Every retained planning artifact is nonempty, indexed and owned by one authority; top decisions, assumptions and abandon/change triggers are surfaced.
- [x] Competition, player, distribution, model ecology, naming, tools and visual direction are sourced; the zero-anchor challenger was tested.
- [x] The local-first two-gate ExecPlan has browser-visible product, correctness, performance, accessibility, security and stop criteria.
- [x] Tool/plugin/MCP inventory, CI/CD contract, actual GitHub capability probes and measured provisional budgets exist.
- [x] Fifteen selected concepts have prompt/provenance records; rejected spikes and research worktrees were not merged.
- [x] Frozen discipline reviews, five player perspectives, full Goal audits, civilization-amendment audits and the one final targeted confirmation are reconciled with no accepted P0 or unmitigated P1.
- [x] The self-contained Goal prompt's exact approved Git blob is `a5e30353d3bee951ff25a85758f9accf22aea30a`; external higher-authority approval remains mandatory for execution.
- [x] Fresh Markdown, link, source, contradiction, secret, license, production-code and Git QA passes.
- [x] The private repository is consolidated on protected `main`; required CI is green at the pushed technical candidate; unique history is remotely tagged; obsolete PR/branches/worktrees are cleaned; only unmerged Dependabot PRs remain.

`READY FOR GOAL MODE` means the contract is ready to implement and falsify, not that fun, attachment, refusal tolerance, delayed return, session-20 depth, or the research thesis has been validated with humans.
