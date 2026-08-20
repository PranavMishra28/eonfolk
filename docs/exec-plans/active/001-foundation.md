# 001 — Local proof of life and attachment

**Purpose:** Implement the smallest account-free local game that can falsify whether eight autonomous citizens feel alive and whether sponsoring one creates consequential attachment.

**Status:** ACCEPTED PLAN — implementation has not begun

**Authority boundary:** This plan owns first-slice milestones, scope, evidence and definition of done. Product/engineering/quality authorities own semantics; [PLANS.md](../PLANS.md) owns maintenance rules.

**Related documents:** [product](../../product/PRODUCT.md), [human loop](../../product/HUMAN_LOOP.md), [Chronicle](../../product/CHRONICLE.md), [architecture](../../engineering/ARCHITECTURE.md), [quality bar](../../quality/QUALITY_BAR.md), [Goal prompt](../IMPLEMENTATION_GOAL_PROMPT.md).

**Coordinator:** One integration owner operating through bounded agents where file ownership is non-overlapping.

**Target:** A new focused implementation branch created from an explicitly accepted planning state. No production deployment or merge is authorized by this plan.

## Product outcome

In a free, accountless local browser session, a player sees eight understandable people living in Riverhold, sponsors one mind in under 60 seconds, gives one high-level counsel intervention, sees that citizen independently accept/reject/delay/reinterpret it, observes a later systemic/social consequence, leaves/returns through deterministic catch-up, and verifies the causal chain in a factual Chronicle plus a 10–20-second share composition.

Both gates must pass. A green build, correct reducer, attractive screenshot or elapsed estimate cannot substitute for observed play.

## Binding constraints

- One solo builder; approximately 52 focused hours inside the 40–60-hour envelope.
- MacBook M4 Pro; no owned GPU infrastructure.
- Approximately $0 execution. No spending, credential request, deployment or public publication without explicit approval.
- V1 is useful/free with no account, key, external model, model download or WebGPU requirement.
- No training/fine-tuning, proprietary dataset, required partnership, payments, custody, licensing business, regulated data or enterprise motion.
- Standard Brain is complete. All external cognition is excluded.
- One local region, one deterministic seed and browser IndexedDB. No server/auth/multiplayer/cross-region/forks.
- One PixiJS 2.5D renderer plus semantic DOM. No R3F/Three, dual renderer or production use of generated concept pixels.

## Hour and cut budget

| Work | Focused hours | Scope-control rule |
|---|---:|---|
| Shared foundation and deterministic contracts | 8 | Protocol/reducer/test spine before presentation |
| Gate A — Proof of Life | 20 | Cut environmental polish before any behavior/resource requirement |
| Gate B — Proof of Attachment | 16 | One Riverhold chain; no generalized narrative/content system |
| Browser QA, performance, accessibility and fixes | 8 | Fix gates; remove optional features rather than extend scope |
| **Total** | **52** | Acceptance, not elapsed time, determines completion |

Cut in this order when estimates miss: sound → weather/particles → decorative hatching/transition effects → secondary poses → nonessential inspection filters → any second recipe/exchange variant. Never cut eight citizens, the visible interaction, three resources, Standard Brain, persistence/replay, counsel outcome, delayed consequence, Chronicle factuality, semantic action path or three viewport proofs.

## Exact scope

### Included

- One crafted Riverhold settlement and eight named citizens.
- Food, water and wood; integer needs; movement; gathering/consumption; one bilateral exchange; one conversion/repair recipe.
- Four understandable behavior families: satisfy urgent need, perform role work, exchange/help, pursue/review a Standing Plan.
- Identity, values, sourced beliefs, immediate relationships, reputation facets and public/private communication sufficient for Riverhold.
- One sponsored citizen and one typed decision boundary with acceptance, rejection, delay or reinterpretation.
- Pure deterministic Reality/Mind/Standard-Brain layers; event sourcing, state hashes, snapshots, IndexedDB, controlled catch-up and replay.
- While You Were Away, one causal Chronicle story, manual replay and responsive share composition.
- World-dominant responsive UI, semantic DOM alternative, keyboard path and reduced motion.

### Explicit exclusions

Public multiplayer/canon server, accounts/auth, payments, deployment, telemetry vendor, unrestricted dialogue, generalized farming/crafting/economy, deep law/religion/war, implemented death/lineage, World Forks, cross-region messages, browser-model download, hosted inference, optional provider UI, embeddings/vector database, model migration, social posting APIs, video encoder, SSR/public Chronicle routes, creator tooling and production asset marketplace content.

## Expected repository shape

Names may change only through the decision log before code begins; boundaries may not.

```text
apps/web/                  React Router/Vite shell, Pixi world, semantic DOM, projections
packages/protocol/         versioned contracts and canonical serialization types
packages/sim/              pure Reality, reducer, scheduler, invariants, hashing
packages/cognition/        typed Mind, Standing Plans, deterministic Standard Brain
packages/persistence/      PersistencePort contract and IndexedDB adapter
tests/fixtures/riverhold/  deterministic world, commands, expected events/hashes
tests/e2e/                 accountless Playwright journey and viewport evidence
package.json
pnpm-workspace.yaml
tsconfig.base.json
```

`packages/sim` and `packages/protocol` may not import React, browser APIs, provider SDKs, PixiJS or render assets. Renderer timing/pointer state never enters Reality.

## Locked interfaces

Implementation must express these meanings with strict serializable TypeScript types:

- `WorldCommand`: `commandId`/idempotency ID, `expectedRevision`, `principal`, `regionId`, typed payload and schema version.
- `WorldEventEnvelope`: `regionId`, ordered region sequence, simulation time, engine/schema versions, typed payload, typed causal parents, visibility, provenance and canonical pre/post hashes.
- `DecisionContext`: identity/version/revision/reason, visible facts, sourced beliefs, active Standing Plan, closed action catalog and byte/time/record/proposal budgets—never hidden Reality.
- `IntentProposal`: identity/context/revision, one known typed action, optional typed plan/memory proposals, short escaped public justification and provenance—never hidden reasoning.
- `ReplayManifest`: version, snapshot reference/hash, inclusive ordered event interval, engine/replay/schema versions and presentation metadata.
- `PersistencePort`: atomic append, load/save verified snapshot, retrieve ordered ranges and report revision; IndexedDB implements it without leaking browser APIs into simulation.

## Milestone 0 — Shared deterministic foundation (8 hours)

**Product outcome.** A headless Riverhold seed can accept a valid command, reject stale/duplicate/illegal inputs atomically, advance deterministically and replay to the same hash without a browser or model.

**Included scope.** Workspace/toolchain; six types; canonical integer/time/PRNG/serialization rules; minimal state/reducer/scheduler; invariant and deterministic fixtures; plan/evidence logs.

**Excluded scope.** UI, Pixi, IndexedDB implementation detail beyond the port, full citizens/resources, model adapter and server code.

**Files/packages.** Root manifests/config; `packages/protocol`; `packages/sim`; minimal `packages/cognition`; Riverhold fixtures; focused tests. No application dependency may enter pure packages.

**Commands.** Pin exact versions, then maintain equivalent scripts for `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:sim`, `pnpm test:property`, and `pnpm build`. Record the exact bootstrap command and lockfile diff; do not use floating `@latest` in CI.

**Blocking tests.** Canonical serialization/hash; repeated seed/command hash; replay equivalence; equal-time ordering; seeded PRNG; expected revision; command idempotency; atomic rejection/no partial mutation; integer conservation; schema bounds/unknown versions; hidden fields absent from `DecisionContext`; Standard Brain produces only catalog actions.

**Browser/visual evidence.** None required for headless correctness, but the future shell must still start before this milestone closes; a blank/diagnostic page is not Gate A evidence.

**Performance/access/security/eval gates.** 24-hour and seven-day headless cases complete deterministically; no `Date.now()`, `Math.random()` or conserved floats; malicious text stays data; no secret/provider/network dependency; Standard Brain/no-model test passes.

**Rollback.** Revert the unintegrated worktree commit or reset the focused branch before integration; fixtures and decisions remain in the coordinator worktree. Do not preserve an incompatible schema “for later.”

**Reviewers.** Systems/correctness reviewer is independent of implementer. Product reviewer confirms fixtures encode a future consequential choice rather than only resource churn.

**Done.** Coordinator inspects changed files and actual diff, reruns every focused command from a clean checkout, records stable fixture hashes, and finds no P0/P1.

## Milestone 1 — Gate A: Proof of Life (20 hours)

**Product outcome.** A fresh observer sees a crafted living settlement with eight autonomous citizens, identifies at least three activities and notices two citizens interact without reading a raw event feed.

**Included scope.** Full three-resource/need loop; movement; four behavior families; one exchange; one repair/conversion; eight identities/plans; PixiJS Living Woodcut scene; semantic list/map; IndexedDB event/snapshot adapter; controlled leave/return catch-up.

**Excluded scope.** Sponsor/counsel UI and Riverhold political outcome beyond the data needed for Gate B; generalized economy; additional regions/recipes; sound; optional cognition.

**Files/packages.** Extend `packages/sim`, `packages/cognition`, `packages/persistence`, `apps/web`, `tests/fixtures/riverhold`, focused browser tests and authored asset sources/atlas with item provenance.

**Commands.** All Milestone 0 checks plus `pnpm build`, `pnpm test:long`, the local dev/preview command, `pnpm exec playwright test --grep @gate-a`, and recorded payload/frame measurement commands.

**Blocking tests.** Resource conservation and ownership; need bounds; movement/action legality; bilateral exchange atomicity; recipe conservation; citizen death/life guards even if death is not reachable; repeated/replayed hashes; snapshot/genesis convergence; event gap/corrupt snapshot/migration fixtures; refresh/crash/multi-tab behavior; 30/90/365-day simulations; safe interruption/resume; zero-LLM progress.

**Browser/visual evidence.** Capture arrival, three legible activities, one two-citizen interaction, persistence reload and semantic fallback at 1728×1117, 1366×768 and 390×844. Include keyboard-only and reduced-motion evidence. Record a silent 30-second observer result; raw feed may be hidden.

**Performance/access/security/eval gates.** Shell ≤200 KB gzip; total initial-route JS including lazy renderer ≤650 KB gzip; first-world assets ≤6 MB desktop/4 MB mobile; meaningful world ≤3 seconds target Mac/laptop and ≤5 seconds realistic mid-tier mobile/4G profile; desktop p95 ≤16.7 ms/60 FPS target; mobile p95 ≤33.3 ms/30 FPS minimum; eight default/twelve practical. Text is escaped; no canvas-only fact/action; hostile imported saves cannot bypass schema/authorization. Behavior-family/state attribution passes the Standard Brain rubric.

**Rollback.** Remove optional ambience/effects/assets in the locked order. If Pixi fails after one simplification pass, switch once to stripped Weathered Atlas and record the decision. If persistence fails, keep the port/reducer and replace only the adapter; do not add a server.

**Reviewers.** Fresh product/game observer; independent systems/correctness reviewer; visual/accessibility reviewer. Cognition/eval reviewer checks Standard Brain changes.

**Done.** All automated gates pass; each viewport has reproducible evidence; fresh observer names three activities and notices an interaction; full game remains playable through semantic DOM; no external inference/network is used; coordinator verifies actual diff and evidence.

## Milestone 2 — Gate B: Proof of Attachment (16 hours)

**Product outcome.** The player sponsors Mara in under 60 seconds, understands her values/relationships/tension, counsels one consequential course, sees her independently interpret it, later observes a systemic/social effect, understands the factual chain and leaves with one unresolved reason to return.

**Included scope.** Identity lens; sponsored covenant; one Riverhold decision boundary; investigate/counsel/abstain path; accept/reject/delay/reinterpret outcome; later market/audit/relationship/rule consequence; While You Were Away; manually stepable Chronicle; copy text/seed; responsive 16:9 and 9:16 share composition.

**Excluded scope.** Free-form chat, additional authored crises, public URL/SSR, posting/video APIs, model adapters, death/succession implementation and generalized governance.

**Files/packages.** Riverhold fixture/events/projections; Mind/Standing Plan rules; application identity/counsel/return/Chronicle/replay/share surfaces; focused eval and Playwright fixtures.

**Commands.** Full PR baseline plus `pnpm test:eval`, `pnpm exec playwright test --grep @gate-b`, screenshot/evidence capture at all viewports, and deterministic replay/sentence-provenance audit.

**Blocking tests.** `DecisionContext` hidden-fact isolation; allowed action catalog; acceptance/rejection/delay/reinterpret branches; stale/duplicate proposal rejection; atomic counsel/resource commitment; provider absence/timeout/malformed fixtures still progress through Standard Brain even though no provider ships; every Chronicle sentence resolves to authoritative predicates/event IDs; allegation never becomes fact; replay invokes no cognition; leave/return uses controlled time and identical hashes.

**Browser/visual evidence.** Full account-free journey at 1728×1117, 1366×768 and 390×844: first launch → select/create mind → inspect identity/tension → observe interaction → counsel/abstain → see interpretation → controlled leave/reload → changed world → While You Were Away → manual Chronicle replay → 16:9/9:16 artifact. Capture reduced-motion and keyboard-only equivalents.

**Performance/access/security/eval gates.** Gate A budgets remain passing. Citizen creation/selection <60 seconds in fresh walkthrough. All consequential actions use semantic controls and visible focus. Public text is escaped; no generated HTML/Markdown/SQL/URL/code; private belief/visibility remains isolated. At least one fresh player states decision, interpretation, later change and next concern. Three of five unfamiliar artifact viewers understand the consequence within five seconds.

**Rollback.** Remove secondary panels/copy/animation first. Simplify the Riverhold branch without inventing causality. If interpretation is arbitrary or Chronicle is carrying trivial mechanics, fail Gate B and reopen D-001/D-003/D-004; do not add dialogue or more content.

**Reviewers.** Product/game reviewer; systems/causality reviewer; visual/accessibility reviewer; cognition/eval reviewer. Reviewers inspect the actual browser experience, not only fixtures or screenshots.

**Done.** Observable Gate B criteria pass with reproducible event/hash and browser evidence, every sentence is factual, the unresolved return reason is stated by a fresh player, and no P0/P1 remains after fix/rerun.

## Milestone 3 — Integrated browser, access and release evidence (8 hours)

**Product outcome.** One clean local build passes Gate A and B end-to-end at the three required viewports and remains understandable, deterministic and recoverable under failure/degradation.

**Included scope.** Cross-gate fixes; critical Playwright journey; payload/frame/load profiles; semantic/reduced-motion journey; save/export/recovery drill; 30/90/365-day/manual test evidence; final independent reviews and fix loop.

**Excluded scope.** New mechanics, public hosting, CI workflow expansion beyond the agreed baseline, marketing launch and any “nice to have” not tied to a failing gate.

**Files/packages.** Only files required to fix recorded findings; ExecPlan progress/evidence/decision/risk/deviation logs; compact reproducible evidence manifest. Large routine videos do not enter Git.

**Commands.** From a clean checkout run formatting/lint, strict typecheck, unit, deterministic/replay, property/fuzz, production build, critical Playwright journey, accessibility scan/manual keyboard path, long-horizon matrix and production-preview performance capture.

**Blocking tests.** Every test listed in [testing](../../quality/TESTING.md), including hashes, replay, atomicity, idempotency, migrations, conservation, hidden facts, provider failure and no-LLM progress. Test an invalid/corrupt import and recovery. Conditional visual/cognition suites run for all affected changes.

**Browser/visual evidence.** Final named-commit captures and observer notes at 1728×1117, 1366×768 and 390×844 for onboarding, life, sponsor/counsel, leave/return, catch-up, Chronicle and share; keyboard, reduced-motion and simplified semantic mode included. Retain failed Playwright artifacts 14 days and accepted milestone evidence 30 days in future CI.

**Performance/access/security/eval gates.** All numerical budgets pass without waiver; CSP/CSRF/origin controls are documented for future hosted routes but no server ships; local import/text/auth boundaries pass; Standard Brain and Chronicle rubrics pass. No secrets, production credentials, license surprise or unapproved dependency.

**Rollback.** Revert the smallest failing integration commit or remove the lowest-priority visual feature. A product-gate failure returns to its decision owner. No deployment/merge occurs as a recovery action.

**Reviewers.** Independent final product/game and systems reviewers; visual reviewer for any UI diff; cognition reviewer for Mind/Brain diff. One targeted confirmation pass is allowed for new P0/P1 findings.

**Done.** Clean status; actual base...HEAD diff reviewed; all acceptance evidence links resolve; no accepted P0 or unmitigated P1; no scope/deployment/spend violation; both gates observable in the actual game.

## Future CI implementation contract

Every relevant PR blocks on formatting/lint, strict TypeScript, unit tests, deterministic/replay tests, bounded property/fuzz tests, production build and the critical Playwright journey. Cognition changes add schema/authorization/hidden-fact/provider-failure/fallback/behavior regressions. Major UI changes add deterministic three-viewport evidence and practical failing traces.

Use weekly grouped Dependabot for npm and GitHub Actions, at most five open PRs, no automerge. Protect `main` with checks and force-push/deletion blocks where the personal private repository permits; do not require an outside reviewer. Probe real capabilities and record unavailable/plan-gated states. Failed Playwright artifacts retain 14 days; accepted milestone evidence 30; successful videos are not routine. Longer fuzz, horizon, browser matrix, migration and optional-cognition suites are nightly/manual.

## Initial performance and accessibility budgets

The locked budgets are: shell ≤200 KB gzip; total initial-route JS ≤650 KB gzip; assets ≤6 MB desktop/4 MB mobile; meaningful display ≤3 seconds Mac/laptop and ≤5 seconds mid-tier mobile/4G; desktop p95 ≤16.7 ms/60 FPS target; mobile p95 ≤33.3 ms/30 FPS; eight default/twelve practical. Reduced motion disables camera/parallax/autoplay/particles and keeps manual replay. Selection, identity, counsel, return, Chronicle and replay are keyboard-accessible semantic DOM. Degrade pixel ratio/effects, then visual cadence, then markers, then a fully playable semantic list/map. No important information exists only in the canvas.

## Progress log

Implementation begins only after the planning branch is explicitly accepted. The future coordinator appends dated, commit-specific entries here; this planning state contains no implementation work.

## Definition of overall done

- Gate A and Gate B each pass in the running browser with fresh-observer evidence.
- Every blocking correctness/security/access/performance test passes from a clean commit.
- World progress and replay remain complete with all external models/network absent.
- The ExecPlan's progress, evidence, decision, risk, deviation, integration and hour/cut logs are current.
- Actual Git diffs and changed files are independently inspected before integration.
- No production deployment, public multiplayer, account, payment, paid action or silent scope expansion occurred.
- Remaining human-validation assumptions are reported honestly; completion does not claim fun or retention has been validated at scale.
