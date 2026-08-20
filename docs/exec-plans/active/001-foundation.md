# 001 — Local proof of life, agency, and attachment

**Purpose:** implement the smallest account-free local game that can falsify whether eight deterministic citizens feel alive and whether following Mara creates contingent, consequential care.

**Status:** ACCEPTED EXECPLAN AFTER FROZEN RED TEAMS — implementation has not begun

**Authority boundary:** this plan owns first-slice milestones, files, commands, evidence, rollbacks, and definition of done. Linked product/engineering/quality documents own semantics; [PLANS](../PLANS.md) owns plan maintenance.

**Related documents:** [product](../../product/PRODUCT.md), [human loop](../../product/HUMAN_LOOP.md), [Chronicle](../../product/CHRONICLE.md), [architecture](../../engineering/ARCHITECTURE.md), [quality bar](../../quality/QUALITY_BAR.md), [Goal prompt](../IMPLEMENTATION_GOAL_PROMPT.md)

## Product outcome

Deliver one local Riverhold proof. A player follows fixed authored Mara, sees an authoritative investigation within 60 seconds, reaches two advice intents plus abstain by five minutes, watches her independently interpret and act, observes one of at least three branch-specific consequences, explicitly leaves/advances/returns, and makes one second choice enabled by that outcome. A factual three-beat Chronicle and ≤20-second Story Card distinguish sponsor advice, Mara's choice, and what followed.

Both Gate A and Gate B must pass. The honest release label is **single Riverhold proof**. This plan does not validate fun, delayed retention, session 5/20, succession, newcomers, distribution, public canon, or modern-AI value.

## Binding constraints

- Solo builder; 52 planned focused hours and at most eight contingency hours for fixes/review, never new scope. Hard ceiling 60.
- MacBook M4 Pro, no owned GPU, no training/fine-tuning, no proprietary dataset.
- Approximately $0; no purchase, billing, credential request, deployment, public publication, domain, or paid service without explicit approval.
- Free/useful/accountless V1; no revenue, payment, custody, licensing business, regulated data, partnership, enterprise motion, required model/key/download/WebGPU. Acceptance runs make zero runtime network requests after exact pinned free development dependencies are installed.
- Local-only Web Worker + IndexedDB; no server/auth/multiplayer/Cloudflare/cross-region/fork implementation.
- Deterministic Standard Brain only. No provider SDK/model path.
- React Router/Vite + one PixiJS 2.5D renderer + parallel semantic DOM. No Three/R3F/3D pipeline/dual renderer.

Acceptance—not elapsed time—ends work. If the irreducible loop cannot pass inside 60 hours after declared cuts, stop and reopen the product; do not ship a shallow substitute.

## Repository and human-evidence authority

Implementation resolves and records one immutable `PLAN_BASE` from `origin/plan/000-product-foundation`, then creates `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/implementation` on `codex/eonfolk-001-foundation`. Production code never lands on this planning branch; without separate authority the implementation result remains committed, clean, unmerged, unpushed, and undeployed.

Only an authorized human operator may supply unfamiliar participants and signed-off anonymized manifests for Gate 0/A/B. Codex prepares the build, scripts, seeded assignments, and blank manifests but does not recruit, contact, impersonate, or fabricate people. Planning personas are not human evidence. Missing Gate 0 human evidence stops work before M1; after Gate 0 passes, safe non-human work may continue while later sessions are pending, but Gate A/B and readiness remain unpassed.

## Hour and scope budget

| Milestone | Planned hours | Nonnegotiable outcome |
|---|---:|---|
| M0 — Product and visual kill gates | 4 | matched ugly structure test; Pixi/semantic feasibility decision |
| M1 — Deterministic durable kernel | 8 | byte-level profile and durable-before-visible transition |
| M2 — Ugly counterfactual loop | 8 | DOM-first investigate/advice/divergence/return choice by hour 20 |
| M3 — Gate A Proof of Life | 12 | eight legible autonomous citizens and local persistence |
| M4 — Gate B Proof of Agency/Attachment | 12 | formative comparison, three Chronicles, second decision |
| M5 — Integrated QA/reviews/fixes | 8 | full browser/access/performance/correctness evidence |
| **Planned** | **52** | |
| Fix/review contingency | **0–8** | only failing acceptance criteria; total never exceeds 60 |

Only permitted cut order: particles/weather/parallax/sound → discretionary art/transition polish → measurement-only 12-citizen presentation stress → stripped Weathered Atlas markers plus semantic view. Never cut Gate 0/A/B, deterministic/durable contracts, security, accessibility, eight default citizens, three resources, divergent advice/return loop, Chronicle truth, or required evidence. Hours 53–60 are fixes/confirmation only.

## Exact included scope

- One crafted Riverhold, one fixed **Follow Mara** onboarding, eight named citizens.
- Food/water/wood; integer needs; movement; gathering/consumption; one Riverhold repair exchange; one `2 wood + work` mill repair.
- Four behavior families: urgent need, role/resource work, exchange/help, Standing Plan/review.
- Typed beliefs, directional relationship bands, values/commitments, reputation observations, typed messages, Standard Brain.
- One pre-boundary snapshot with **verify privately**, **accuse now**, and **abstain/follow plan** histories reaching different terminal state vectors.
- State-changing investigation by 60 seconds; advice boundary by five minutes; typed decision receipt; branch consequence.
- Explicit leave/checkpoint, local-save disclosure, confirmable catch-up capped at seven-day chapters, branch-dependent second decision.
- Event sourcing, durable receipts/head, snapshots, export-only save, deterministic replay, While You Were Away, three-beat Chronicle, responsive Story Card.
- Pixi Living Woodcut world, fully playable semantic view, keyboard, reduced motion, weak-device degradation, three viewports.

## Explicit exclusions

Create-a-person/roster, generalized economy/farming/crafting/governance, deep law/religion/war, death/lineage/session-20 implementation, import/restore/migration upcaster, public URL/SSR/share recipient route, accounts/server/deployment/public multiplayer, World Fork, unrestricted dialogue, hosted/local model, browser download, provider UI, embeddings/vector DB, model migration, social posting/video encoder, telemetry vendor, payments, creator dashboard, and production generated/marketplace art.

## Expected implementation shape

```text
apps/web/                  React Router/Vite, Pixi world, semantic UI, projections
packages/protocol/         versioned contracts, canonical bytes, golden vectors
packages/sim/              pure Reality, reducer, scheduler, invariants, hashes
packages/cognition/        Mind, Standing Plans, Standard Brain, decision receipts
packages/persistence/      PersistencePort and IndexedDB adapter
tests/fixtures/riverhold/  snapshot, branches, perturbations, expected hashes
tests/e2e/                 critical journey and deterministic evidence fixtures
docs/exec-plans/active/001-foundation.md  living progress/evidence log
```

`protocol`/`sim` import no React/browser/Pixi/provider SDK and use no `Date.now()`, `Math.random()`, conserved floats, wall/frame/pointer state, or locale order.

## Locked contracts

- `WorldCommand`: version, command ID, payload fingerprint, expected revision, principal, region, typed payload.
- `WorldEventEnvelope`: ordered sequence/time, engine/schema, typed payload, causal parents (`direct|trigger|contributing`), separate related events (`temporal-predecessor|response-to`), visibility/provenance, pre/post/event hashes, batch ID.
- `DecisionContext`: actor/revision/reason, only visible facts/beliefs, plan/values/relationships/commitments, closed catalog, budgets.
- `IntentProposal`: one catalog action, optional typed plan/memory proposals, short justification rendered from typed `DecisionExplanation`, provenance.
- `DecisionExplanation`: reason codes, actually read references, integer terms, tie-break, counsel disposition.
- `CommandReceipt`: accepted/rejected stable result, fingerprint, revision/head, interval/rejection code, fencing token.
- `ReplayManifest`: snapshot/base sequence, half-open event range, exact versions, final hash, nonfactual presentation metadata.
- `PersistencePort`: head/receipt reads, atomic `appendEvents` transition commit, snapshot load/save, event range, verified export. No import.

The exact determinism and commit protocols live in [SIMULATION](../../engineering/SIMULATION.md) and [PERSISTENCE](../../engineering/PERSISTENCE.md); implementation cannot weaken them through naming changes.

## M0 — Product and visual kill gates (4 hours)

**Product outcome:** avoid spending the slice on the wrong relationship frame or infeasible presentation.

**Scope/exclusions:** Make throwaway low-fidelity, branding-hidden Riverhold decision prototypes for one citizen, family, trio, faction, ECHOHOUSE, and direct control. In parallel, make a disposable projection with semantic/static shell and representative Pixi scene. No production mechanics, persistence, art polish, analytics, or remote research.

**Files/packages:** `tests/prototypes/` or an explicitly disposable implementation worktree; only compact results/manifests survive in the ExecPlan/evidence directory. Root dependency changes are coordinator-owned.

**Commands/tests:** record exact preview and browser commands; `git diff --check`; three viewports; cold shell timing; overflow/200% zoom/keyboard/reduced motion; no console error.

**Browser/visual evidence:** five unfamiliar randomized product walkthroughs. After each version, each person records binary `desirable`, binary `want to continue`, and an untied within-person rank across all six; abandonment is zero on both binaries. Lowest summed rank wins. Any tie with Riverhold, another overall winner, or an alternative lead of at least 20 percentage points on either binary reopens the structure. Five silent visual observers use one manifest. 4/5 find Follow Mara/understand autonomy; 3/5 identify Mara, three activities, interaction. Shell by 2 seconds, CTA by 3.

**Performance/security/eval:** no credentials/telemetry. Record the seeded order, raw per-participant binaries/ranks, denominator, summed ranks, and percentage-point comparisons. Living Woodcut gets one simplification pass; then stripped Weathered Atlas or stop.

**Rollback:** delete disposable implementation; retain result table, manifest, screenshots, commit SHA, and decision only.

**Reviewers:** fresh product/game reviewer and visual/accessibility reviewer, neither prototype author.

**Done:** gate result is explicit; chosen interaction/presentation survives; rejected prototypes do not leak into production scope.

## M1 — Deterministic durable kernel (8 hours)

**Product outcome:** no accepted action can disappear, double-apply, fork, or become visible before durability.

**Scope/exclusions:** Workspace; contracts; determinism profile; minimal reducer/scheduler; prepared transition; IndexedDB head/events/receipts/snapshots; fenced single writer; export only. No renderer, full game, import/upcaster/server/model.

**Files/packages:** root manifests/config, `packages/protocol`, `packages/sim`, `packages/persistence`, minimal fixtures/tests.

**Commands/tests:** pinned `pnpm format:check`, `lint`, `typecheck`, `test`, `test:sim`, `test:property`, `build`. Golden JCS/SHA/PRNG/ID/rounding/Unicode vectors in browser/Node; atomic expected revision; accepted/rejected idempotency; same-ID/different-payload; crash injection at prepare/request/commit/install/publish/ack; quota abort; event gap; corrupt snapshot; stale fencing; dual-tab transfer; zero-event/half-open replay; current version load/unknown version fail closed.

**Browser/visual evidence:** a minimal semantic harness shows no accepted result before durable acknowledgment and recovers after each injected crash; not Gate A evidence.

**Performance/security/eval:** hostile text stays escaped/bounded; no network/provider; hashes exclude presentation; transaction failure causes no projection/state mutation.

**Rollback:** revert unintegrated worktree commit. Do not preserve an incompatible schema “for later.”

**Reviewers:** independent systems/correctness reviewer inspects exact commit ordering, byte profile, and crash tests.

**Done:** clean checkout reproduces golden hashes and every crash barrier; no P0/P1 remains.

## M2 — Ugly counterfactual loop (8 hours)

**Product outcome:** by planned hour 20, a DOM-first game—not a document—proves that advice can matter without scripting.

**Scope/exclusions:** Fixed Mara; local disclosure; state-changing investigate; two advice intents + abstain; Standard Brain receipt; three terminal vectors; leave/checkpoint; deterministic confirm-catch-up; one branch-dependent second action; plain three-beat Chronicle. No Pixi polish, generalized systems, share art, provider, public route.

**Files/packages:** `packages/cognition`, Riverhold fixture/branch/perturbation/transfer tests, semantic `apps/web` flow, focused e2e.

**Commands/tests:** full M1 suite; `pnpm test:eval`; perturb trust/value/evidence/commitment/advice; transfer to non-Mara; compare nearest-need/legal-random/canonical-lookup and field ablations; hidden-fact noninterference; fake BrainPort absence/throw/timeout/malformed; same branch replay; different branches diverge materially.

**Browser/visual evidence:** at all viewports, Follow Mara ≤10s, authoritative investigate ≤60s, advice ≤5m, branch consequence, leave/reload/Advance, second decision, Chronicle. Keyboard and reduced motion work in unstyled DOM.

**Performance/security/eval:** no branch may be a label over converged state; typed receipt names actual terms; no secret leaks through catalog/error/order; no arbitrary prose fact.

**Rollback:** if the real state-sensitive loop does not beat a yoked script in a small diagnostic review, stop/reopen product before world/polish; do not add dialogue/content.

**Reviewers:** product/game, systems/causality, cognition/eval.

**Done:** three reproducible terminal hashes and branch-specific Chronicles exist; one outcome-dependent second command mutates state; reviewers find no P0/P1.

## M3 — Gate A: Proof of Life (12 hours)

**Product outcome:** Riverhold reads as eight understandable people acting, not moving marks or a log/dashboard.

**Scope/exclusions:** Full three-resource/need loop, four behavior families, story-relevant exchange/repair, eight identities/plans, authoritative two-citizen interaction, Pixi atlas/semantic view, snapshots/export, controlled catch-up. No new crisis/content/system, sound, server, model.

**Files/packages:** extend sim/cognition/persistence/web, authored source atlas/provenance, Riverhold fixtures, `@gate-a` Playwright.

**Commands/tests:** full PR baseline; resource/ownership/need/action/movement/exchange/repair invariants; 24h/7d foreground/catch-up equivalence; 30/90/365 exact-horizon runs under [simulation caps](../../engineering/SIMULATION.md); `pnpm exec playwright test --grep @gate-a`; payload/frame/load measurement.

**Browser/visual evidence:** named manifests at 1728×1117, 1366×768, 390×844 for arrival, Mara, three activities, authoritative interaction, reload, semantic mode, keyboard, reduced motion, 200% zoom, clustered targets. Five silent unfamiliar observers; declared 3/5 and 4/5 thresholds from Quality Bar.

**Performance/security/eval:** shell ≤200 KB gzip; route JS ≤650 KB; assets ≤6 MB desktop/4 MB mobile; shell/Mara ≤2s, CTA ≤3s, meaningful world ≤3s target desktop/≤5s mobile profile; desktop p95 ≤16.7 ms, mobile ≤33.3; eight default, twelve measurement-only practical. No canvas-only fact/action.

**Rollback:** remove decoration in cut order. After one simplification failure use stripped Weathered Atlas/semantic world; never add R3F/server or waive budget.

**Reviewers:** five fresh observers plus independent product/game, systems, visual/access, and cognition reviewers.

**Done:** automated gates and human thresholds pass with reproducible manifests; external inference/network absent.

## M4 — Gate B: Proof of agency and bounded attachment (12 hours)

**Product outcome:** real state-sensitive Mara creates more perceived contingency and desire to continue than a yoked scripted trajectory.

**Scope/exclusions:** Finish three branch-specific world changes, typed explanations, relationship warmth across surfaces, leave/return/second action, While You Were Away, Chronicle/manual replay, responsive 16:9/9:16 Story Card. No public URL, posting, create-a-person, extra crisis, session-20/death claim.

**Files/packages:** branch projections, Chronicle templates/evidence, decision/return UI, e2e/eval fixtures.

**Commands/tests:** full PR baseline, `@gate-b`, sentence-to-event/provenance audit, causal/related/allegation vocabulary, card copy, replay without cognition, full noninterference, all branch hashes, second-action eligibility/effect.

**Browser/visual evidence:** full journey at three viewports plus eight unfamiliar real-versus-yoked sessions: seeded counterbalancing is exactly four real-first/four control-first. After each condition and before the other, each participant scores perceived contingency and desire to continue on labeled integer 1–7 scales. Require Quality Bar's 6/8, 5/8, 4/8 thresholds and a strictly higher eight-person real mean on both scales; ties fail. Five separate card viewers require 3/5 correct comprehension/no false direct credit. Record all failures/abandonment.

**Performance/security/eval:** Gate A budgets remain passing. Escaped template text only; evidence disclosure resolves each sentence. Mara is recognizable across world/portrait/return/Chronicle and at least 4/8 express person-centered concern/curiosity.

**Rollback:** simplify copy/presentation, not facts. If Chronicle carries trivial mechanics, branches converge, or real does not beat yoked script, fail Gate B and reopen product; do not add model/dialogue.

**Reviewers:** product/game, systems/causality, visual/access, cognition/eval, all independent of affected implementation.

**Done:** branch, human, factuality, second-action, card, browser, and technical criteria pass; claim remains bounded.

## M5 — Integrated QA, review, and fixes (8 hours)

**Product outcome:** one clean local build passes the complete observable journey and failure/degradation paths.

**Scope/exclusions:** cross-gate fixes, final clean commands, evidence manifests, independent reviews, at most one targeted confirmation. No new mechanics, public CI/deployment, content expansion, import, provider.

**Files/packages:** only files required by recorded failures plus living ExecPlan logs/evidence; routine large videos stay out of Git.

**Commands/tests:** clean format/lint/typecheck/unit/determinism/replay/property/fuzz/build/critical Playwright/access/performance; crash/fence/export/version/no-import; 30/90/365; network-disabled Standard Brain; dependency/license/secret scan.

**Browser/visual evidence:** final named-commit journey and all states at three viewports; physical mobile caveat/result; keyboard, reduced motion, semantic degradation; final participant tables.

**Performance/security/eval:** all numerical gates pass without waiver. A clean build records zero runtime requests; no credential, telemetry, provider SDK, dynamic code, or untrusted active rendering; bounded commands/text/storage/catch-up/export; corrupt/oversize/gap/stale-fence/unknown-version/quota cases fail closed without head advance; and no unresolved high/critical production-dependency advisory. Record scan source/date/findings/false-positive rationale. Exact diff/dependencies/licenses inspected.

**Rollback:** revert smallest failing integration or remove lowest-priority presentation feature. A product-gate miss returns to owner; deployment/merge is never recovery.

**Reviewers:** one fresh cross-discipline reviewer. If it finds P0/P1, fix and run one targeted confirmation only.

**Done:** clean status; actual base...HEAD reviewed; all evidence links resolve; no accepted P0/unmitigated P1; no scope/spend/deploy violation.

## Future CI and repository policy

Every relevant PR blocks on format/lint, strict TypeScript, unit, deterministic/replay, bounded property/fuzz, production build, and critical Playwright journey. Cognition changes add noninterference/perturbation/transfer/baseline/ablation/fake-failure suites; a later real model adds exact provider/eval regressions. Major UI changes add deterministic three-viewport evidence and visual review.

Weekly grouped Dependabot for npm/Actions, max five PRs, no automerge. Protect `main` checks/force-push/deletion where the personal private repo allows; no outside reviewer requirement. If native secret scanning remains disabled, add one pinned/license-reviewed open-source diff scan. Failed Playwright artifacts retain 14 days; accepted milestone evidence 30; no routine successful videos. Long fuzz/horizon/browser matrices run nightly/manual. [TESTING](../../quality/TESTING.md) records actual capability probes.

## Living execution logs

Future Goal mode updates these sections continuously, never reconstructed at the end.

### Progress and hours

| Timestamp | Milestone | Commit | Focused hours | Result/next |
|---|---|---|---:|---|
| Planning freeze | M0–M5 | planning branch | 0 | implementation not begun |

### Decisions and deviations

| ID/time | Decision or deviation | Evidence | Gate effect | Owner/reopen |
|---|---|---|---|---|
| none | none yet | — | — | — |

### Surprises, risks, and findings

| ID/time | Severity | Observation | Action/confirmation |
|---|---|---|---|
| none | — | none yet | — |

### Integration record

| Source worktree/commit | Allowlist/diff inspected | Commands | Integrated commit | Rollback |
|---|---|---|---|---|
| none | — | — | — | — |

### Evidence index

Operator-supplied human manifests have fixed future paths: `docs/exec-plans/evidence/001/gate-0-human.json`, `gate-a-human.json`, `gate-b-human.json`, and `story-card-human.json`. Each is anonymized, names the tested commit/seed/script, contains all assignments/raw responses/abandonment, and records operator sign-off; absence means the corresponding gate is not passed.

| Gate | Commit/manifest | Automated result | Human/browser result |
|---|---|---|---|
| M0/A/B | not run | not run | not run |

## Final definition of done

Ready only when M0, Gate A, Gate B, technical/access/performance/security criteria, independent reviews, and evidence all pass; actual diff/changed files/dependencies are inspected; branch is clean; total focused time is recorded; and the final report distinguishes observed bounded evidence from fun/retention/scale hypotheses. Do not merge, deploy, publish, spend, or broaden scope under this plan.
