# Product-foundation decisions

**Purpose:** Record the accepted product, game, design, technical, quality, and operating choices and reconcile severe review findings.

**Status:** RECONCILED AFTER FOUR FROZEN RED TEAMS AND FIVE PLAYER PERSPECTIVES

**Authority boundary:** This file owns acceptance and review disposition. Linked authority documents own detailed behavior and contracts; the [source ledger](../research/SOURCE_LEDGER.md) owns provenance.

**Related documents:** [risks](RISKS.md), [open questions](OPEN_QUESTIONS.md), [product](../product/PRODUCT.md), [architecture](../engineering/ARCHITECTURE.md), [first ExecPlan](../exec-plans/active/001-foundation.md).

## Top 10 decisions

| Rank | ID | Decision | Why now |
|---:|---|---|---|
| 1 | D-001 | Follow one authored autonomous citizen in one bounded local proof | Best robust hypothesis, now subject to a matched Gate 0 kill test |
| 2 | D-002 | Prove life, contingency and bounded attachment in 52 planned hours plus ≤8 fix hours | Makes the product thesis falsifiable before platform work |
| 3 | D-003 | Use rare, informed, rejectable counsel—not unit control or chat—as the core verb | Preserves personhood while giving the player consequential agency |
| 4 | D-004 | Make Chronicle a typed factual projection, never model-written causal prose | Return value and trust depend on inspectable truth |
| 5 | D-005 | Make the deterministic Standard Brain the complete V1 cognition path | Free, fast, replayable, device-inclusive operation is binding |
| 6 | D-006 | Run V1 locally in a Web Worker with IndexedDB behind `PersistencePort` | Fits solo/$0 constraints while preserving a later region-server seam |
| 7 | D-007 | Lock commands, events, cognition, replay and persistence contracts before UI work | Prevents presentation or models from becoming authority |
| 8 | D-008 | Use a sparse Living Woodcut language with one PixiJS 2.5D renderer | Strongest distinctiveness/Chronicle fit within the asset and performance ceiling |
| 9 | D-009 | Treat the factual Story Card/replay as private comprehension evidence in V1 | No public route exists, so distribution remains post-proof |
| 10 | D-010 | Keep V1 free, account-free, model-free and noncommercial | Avoids spend, operations and business scope before fun is proven |

## D-001 — Bounded-region citizen sponsorship

**Decision.** Retain tournament structure H provisionally: fixed authored Mara is the player's responsibility lens inside one small local region. Player-facing entry is **Follow Mara / She acts for herself**; it creates a limited sponsor relationship, not a creator/roster or ownership claim. Long-lived public canon, lineage and forks are future hypotheses.

**Evidence.** H scored 4.33 and won the base rubric and four declared sensitivity sets. One citizen beat family, trio and faction in the identical Riverhold scenario. The blind ECHOHOUSE challenger exposed a valid drama/concentration risk but did not beat H overall and required model/content assumptions incompatible with V1 [S-PLAYER-003] [S-PLAYER-004] [S-COMP-001] [S-COMP-002].

**Rejected alternatives.** Direct possession removes shared agency; family/trio/faction dilute first-person responsibility or add management; public shared civilization fails the proof envelope; ECHOHOUSE weakens continuity and zero-model operation.

**Remaining uncertainty.** One-person attachment, indirect-agency tolerance, death continuity and session-20 richness are product hypotheses, not human evidence.

**Resulting behavior.** The slice simulates eight people but foregrounds one. It implements one local region/seed and no death, server canon, cross-region traffic or forks. Product work reopens before infrastructure if Gate B fails.

**Constraint fit.** One town and one responsibility lens fit a solo M4 workflow and require no service, model, proprietary dataset, partner, revenue or spend.

**Reopen trigger.** Before foundations, randomized branding-hidden matched versions of one-citizen, family, trio, faction, ECHOHOUSE and direct control use the same scenario. Reopen if another wins overall or desirability/desire-to-continue by at least 20 percentage points.

## D-002 — Two-gate, approximately 52-hour proof

**Decision.** Plan 52 hours: 4 product/visual kill gates, 8 deterministic durable kernel, 8 ugly counterfactual loop, 12 Proof of Life, 12 Proof of Agency/Attachment, 8 integrated QA. Reserve at most eight additional hours only for gate fixes/review; hard ceiling 60.

**Evidence.** Research isolates the smallest legible system at eight citizens, three resources, four behavior families, one exchange, one conversion/repair, one social consequence and one causal story. Scratch simulation replayed 24-hour and seven-day runs deterministically; the renderer spike exposed specific mobile and p95 risks [S-SPIKE-001] [S-SPIKE-002].

**Rejected alternatives.** No generalized economy, multiplayer, auth, deployment, model download, unrestricted dialogue, deep law/religion/war, death implementation or World Fork implementation. A backend-only demo and an expired timebox are not passes.

**Remaining uncertainty.** Integration may exceed the estimate; the core interaction may still feel thin after mechanics are cut to fit.

**Resulting behavior.** Cut sound, ambience, secondary recipes, generalized UI and deferred systems before adding hours or lowering a gate. Observable browser evidence is mandatory at all three viewports.

**Constraint fit.** The plan explicitly targets the 40–60-hour envelope and approximately $0 local operation.

**Reopen trigger.** If the irreducible counsel-to-consequence loop cannot pass both gates inside the bounded scope, stop implementation and revisit D-001 rather than quietly building a platform.

## D-003 — Rare, informed, rejectable intervention

**Decision.** The loop is observe → investigate → counsel or commit → citizen interprets/refuses → consequences compound → Chronicle explains → choose the next risk. The key first-session choice is informed, delayed and rejectable. Advice is scarce by situation, not a paid meter.

**Evidence.** Published work associates forecastably different states and moral/social/consequential characteristics with perceived agency and meaningful choice [S-PLAYER-003] [S-PLAYER-004]. Player/competitor evidence warns that scheduling and generated conversation volume do not by themselves create care [S-PLAYER-008] [S-PLAYER-010].

**Rejected alternatives.** Direct movement, job queues, feeding/healing chores, chat spam, omniscient commands and idle reward collection create activity or control rather than shared agency.

**Remaining uncertainty.** Refusal may feel like arbitrary denial; delayed effects may weaken attribution.

**Resulting behavior.** At a named decision boundary, show visible facts, beliefs, stakes, two or three intents and abstain. Record acceptance, rejection, delay or reinterpretation and make the later consequence visible.

**Constraint fit.** One authored decision chain concentrates design/testing work and avoids unrestricted language or a broad command system.

**Reopen trigger.** Reopen if fresh players cannot predict materially different outcomes before counsel, cannot explain the interpretation later, or consistently demand possession after understanding the loop.

## D-004 — Chronicle factuality and causal taxonomy

**Decision.** Chronicle is a deterministic projection of authoritative events. Causal edges are direct/trigger/contributing; temporal-predecessor/response-to are separate noncausal relations; allegation is attributed content. Every sentence resolves to events/hashes. RV-001–012 is one oracle, while three advice histories must diverge materially and produce separate Chronicles.

**Evidence.** Riverhold oracle RV-001–RV-012 demonstrates biography, relationship history, While You Were Away, world history, replay, Story Card and future public-event forms from one evidence set. Counterfactual branch requirements prevent that oracle from becoming the only trajectory. Research rejects post-hoc narrative inference.

**Rejected alternatives.** Raw logs as the return experience, model-written facts, causal “because” from temporal order, omniscient motives, unmarked allegations and unsimulated counterfactuals.

**Remaining uncertainty.** Strictly qualified fact text may feel cold, and Chronicle polish could disguise a trivial simulation.

**Resulting behavior.** Templates consume only declared predicates; replay never invokes cognition; public justifications remain testimony. Any factual mismatch is P0.

**Constraint fit.** One projection pipeline serves return, replay, QA and sharing without hosted inference or a second content pipeline.

**Reopen trigger.** Reopen density if strangers cannot reconstruct actor, intervention, three causal beats and unresolved tension in five seconds; never weaken factuality to improve drama.

## D-005 — Standard Brain and optional model ecology

**Decision.** A deterministic integer-scored Standard Brain performs all routine and decision-boundary behavior. External/local models are absent from V1 and may later propose one bounded typed action only at decision boundaries. Provider/model/version is provenance, not character identity or marketing.

**Evidence.** Systems research supports typed memory/plans and bounded action spaces, while browser runtimes impose downloads/device limits [S-SYS-01] [S-SYS-02] [S-MODEL-01] [S-MODEL-05]. The local qwen spike validated schema/authorization/fallback shape but produced 8,064 ms cold latency and poor public copy [S-SPIKE-003].

**Rejected alternatives.** Required model download/key, branded-model onboarding, continuous calls, training/fine-tuning, vector infrastructure, free-form state patches and stored hidden reasoning.

**Remaining uncertainty.** Eight deterministic citizens may feel clockwork; typed justifications may feel authored rather than personal.

**Resulting behavior.** Every decision uses visible facts/beliefs, Standing Plan, bounded actions and budgets. Proposal validation occurs after cognition; failure always advances through Standard Brain. Replay never recalls a provider.

**Constraint fit.** Costs $0, needs no GPU/service/account/download, trains nothing and preserves free useful V1.

**Reopen trigger.** Test optional cognition only after mechanics/stakes/UI pass yet blinded players still isolate repetitive decisions; models must beat Standard Brain without harming fallback, frames, privacy or causal trust.

## D-006 — Local-first architecture with a server seam

**Decision.** Use strict TypeScript/pnpm; pure protocol/simulation/cognition packages; React Router/Vite; one simulation Web Worker; browser IndexedDB through `PersistencePort`; and one application layer. Cloudflare Worker plus one SQLite-backed `RegionDO` per region remains a post-gate target, not V1 scope.

**Evidence.** The disposable deterministic spike established a viable reducer/scheduler/replay shape [S-SPIKE-001]. Current Durable Objects capabilities/prices are dated planning evidence and must be revalidated [S-SYS-08] [S-SYS-09].

**Rejected alternatives.** Server-first, continuous online simulation, one global authority object, Rust/WASM, custom WebGPU, microservices and shared mutable renderer/simulation state.

**Remaining uncertainty.** IndexedDB durability/eviction, multi-tab behavior, long-horizon growth and later region coordination remain unmeasured.

**Resulting behavior.** V1 saves, reloads, confirms catch-up, exports, and replays offline. Simulation logic cannot import browser/server/provider/render code. A future server can reuse domain contracts but needs new auth/outbox/alarm/backup/moderation/import design; it is not a drop-in adapter.

**Constraint fit.** Eliminates deployment, account, ops and recurring cost from the proof while preserving a reversible boundary.

**Reopen trigger.** Reopen IndexedDB only on quota/recovery evidence; reopen hosted topology only after both product gates and fresh cost/security/backup approval.

## D-007 — Deterministic authority contracts

**Decision.** Lock `WorldCommand`, `WorldEventEnvelope`, `DecisionContext`, `IntentProposal`, `DecisionExplanation`, `CommandReceipt`, `ReplayManifest` and `PersistencePort`. Freeze integer/JCS/SHA-256/PRNG/ID/scheduler rules. Prepare immutable transitions, atomically commit events/head/receipt/fencing, then install/publish. V1 is export-only and one schema version.

**Evidence.** The simulation spike produced identical repeated and replay hashes for 24-hour and seven-day runs with typed causal parents [S-SPIKE-001]. Architecture/cognition/security research converges on a validation boundary rather than trusting generated intent.

**Rejected alternatives.** `Date.now()`, `Math.random()`, floats for conserved quantities, provider SDKs or renderer imports in simulation, hidden reasoning, direct Brain writes and non-atomic append/state updates.

**Remaining uncertainty.** Migration/upcaster policy, canonical serialization across releases and 30/90/365-day event volume need implementation proof.

**Resulting behavior.** Commands carry idempotency and expected revision; events carry sequence, simulation time, versions, typed causal parents, visibility, provenance and hashes; replay uses ordered recorded facts.

**Constraint fit.** A small explicit kernel reduces solo debugging and makes no-model, offline, later-server and Chronicle behavior share one source of truth.

**Reopen trigger.** Contract changes require a recorded migration decision and replay fixtures; any inability to preserve deterministic equivalence blocks Gate A.

## D-008 — Living Woodcut on PixiJS

**Decision.** Select Living Woodcut, Weathered Atlas as runner-up/fallback, and Hearthscale only as warmth/readability reference. Implement a deliberately sparse 2.5D scene with one PixiJS renderer and semantic DOM; generated concepts are references, never production pixels.

**Evidence.** Branding-removed review scored Living Woodcut 38/45, Weathered Atlas 33/45 and Hearthscale 28/45. The R3F spike fit payload/load ceilings but missed desktop p95 at 17.1 ms and exposed a mobile panel overflow [S-SPIKE-002].

**Rejected alternatives.** R3F/Three for V1, dual renderers, 3D asset pipeline, literal engraved detail, generated shipping assets, painterly scene production and mixed art languages.

**Remaining uncertainty.** Sparse authored woodcut assets may lose warmth/readability; PixiJS performance and asset effort remain unmeasured.

**Resulting behavior.** One small authored atlas, fixed oblique composition, eight silhouettes/portraits, limited poses, paper/ink grammar and causal marks. DOM owns all facts/actions. Simplify effects/cadence/markers before any budget waiver.

**Constraint fit.** One atlas and renderer reduce asset, tooling and performance burden for one builder on an M4 at $0.

**Reopen trigger.** After one simplification pass, switch to stripped Weathered Atlas if three of five observers cannot identify three activities and one interaction, budgets miss, or the asset inventory exceeds eight focused hours.

## D-009 — Consequence-led distribution

**Decision.** The V1 object is a factual three-beat/≤20-second **Story Card** labeled YOU ADVISED → MARA CHOSE → WHAT FOLLOWED → UNRESOLVED. It is private comprehension evidence with responsive 16:9/9:16 composition, no dead link or seed headline. Public recipient routes and distribution claims are deferred.

**Evidence.** Competitor and distribution research shows AI-agent novelty is occupied and community behavior is channel-specific [S-COMP-001] [S-DIST-001] [S-DIST-002]. The same Riverhold evidence chain can serve QA, return and sharing.

**Rejected alternatives.** Paid acquisition, referral rewards, AI/model leaderboards, posting bots, creator payments/partnerships, analytics SDKs and polished artifacts that conceal trivial mechanics.

**Remaining uncertainty.** Organic conversion, creator interest and voluntary sharing are unproven.

**Resulting behavior.** First 10 are observed high-touch invitations; first 100 require a free direct page and evidence; first 1,000 require intrinsic pull. The slice only supports copyable text/seed and responsive 16:9/9:16 compositions.

**Constraint fit.** Reuses product evidence, requires no spend or service, and adds no business operation to V1.

**Reopen trigger.** If a stranger cannot understand who acted/what changed/why to click in five seconds, repair the game/Chronicle before channel work. If no unaffiliated share activates a user by 100, stop the 1,000-user plan.

## D-010 — Free, accountless, noncommercial V1

**Decision.** Normal V1 needs no account, key, model download, WebGPU, payment or hosted service. The production-cost column never subtracts free tiers. $50 and $300 are comparison ceilings requiring fresh approval; no spend is authorized. EONFOLK remains a private planning codename only.

**Evidence.** Tool/provider quotas, policies and prices are dated and revocable [S-MODEL-08] [S-MODEL-09] [S-SYS-08]. The bounded naming screen found no exact collision on checked surfaces but is not legal clearance [S-NAME-001] [S-NAME-007] [S-NAME-008] [S-NAME-009].

**Rejected alternatives.** V1 revenue/payments/custody/licensing, required partner or enterprise motion, proprietary data, regulated data, foundational hosted-free inference, domain purchase and public naming claims.

**Remaining uncertainty.** Later hosting economics, public-world moderation and trademark similarity remain unresolved and deliberately outside V1.

**Resulting behavior.** CI/security/performance are planned without enterprise ceremony. No purchase, deployment, public publication or credential request occurs. Naming stays decoupled from domain schemas.

**Constraint fit.** This decision directly implements every binding personal, hardware, cost and business constraint.

**Reopen trigger.** Only reopen commercial/hosted/naming behavior after both product gates, separate evidence and explicit authorization.

## Review reconciliation

The frozen-state findings are accepted as historical critiques unless explicitly partial/rejected below. “ACCEPT — MITIGATED” means the finding is valid and the revised authority removes or blocks it; it does not mean a live P0 is tolerated. Every fix is blocking in the revised ExecPlan/Quality Bar.

| Finding | Severity | Disposition | Evidence/reasoning and required verification | Affected authorities |
|---|---|---|---|---|
| PR-001 | P1 | ACCEPT — MITIGATED | Gate B now uses 8 sessions, yoked control, voluntary second action and person-centered threshold; recall alone cannot pass. | PRODUCT, QUALITY_BAR, EVALS |
| PR-002 | P1 | ACCEPT — MITIGATED | Shell/CTA/investigate/advice deadlines are 2s/3s/60s/5m; ugly loop exists by planned hour 20. | PRODUCT, HUMAN_LOOP, 001 |
| PR-003 | P1 | ACCEPT — MITIGATED | Same snapshot must reach three terminal vectors; perturb/transfer/baseline tests reject fixed lookup. | HUMAN_LOOP, CHRONICLE, COGNITION |
| PR-004 | P1 | ACCEPT — MITIGATED | Explicit leave/advance/return ends in one branch-legal state-changing second decision. | HUMAN_LOOP, 001 |
| PR-005 | P1 | ACCEPT — MITIGATED | Mara requested a witness; access, one obligation and control limits are explicit; onboarding says Follow Mara. | PRODUCT, INTERACTION |
| PR-006 | P1 | ACCEPT — MITIGATED | Matched branding-hidden Gate 0 tests H against family/trio/faction/ECHOHOUSE/direct control. | PRODUCT, QUALITY_BAR |
| PR-007 | P1 | ACCEPT — MITIGATED | Reordered 4/8/8/12/12/8 plan proves product before polish; ≤8 fix contingency and cut order are explicit. | 001, RISKS |
| PR-008 | P1 | ACCEPT — MITIGATED | V1 is Copy story card/comprehension only; public activation/distribution is not claimed. | DISTRIBUTION, CHRONICLE |
| GR-001 | P1 | ACCEPT — MITIGATED | RV chain is one oracle; three branch histories and different state hashes are blocking. | CHRONICLE, SIMULATION |
| GR-002 | P1 | ACCEPT — MITIGATED | State-changing investigate occurs by 60s and advice by 5m. | HUMAN_LOOP, INTERACTION |
| GR-003 | P1 | ACCEPT — MITIGATED | Gate A interaction changes Reality; Gate B anti-script/baseline/ablation matrix tests personality fields. | GAME_SYSTEMS, EVALS |
| GR-004 | P1 | ACCEPT — MITIGATED | UI previews relevant reasons/stakes and receipt cites decisive visible terms; random refusal alone prohibited. | HUMAN_LOOP, COGNITION |
| GR-005 | P1 | ACCEPT — MITIGATED | Outcome-dependent second choice ships; session-5/20 language is explicitly post-V1 hypothesis. | HUMAN_LOOP, PROGRESSION |
| GR-006 | P1 | PARTIALLY ACCEPT — MITIGATED BY DEFERRAL | Succession is not claimed/shipped; paper/click test must precede later design. Implementing it now would violate scope. | PROGRESSION, AGENT_LIFE |
| GR-007 | P1 | ACCEPT — MITIGATED | Leave checkpoint, proposed interval, user-confirmed Advance, seven-day chapter cap, and no silent death are locked. | HUMAN_LOOP, SIMULATION |
| GR-008 | P1 | ACCEPT — MITIGATED | Gate 0 repeats matched starting-unit comparison rather than trusting paper scores. | PRODUCT, QUALITY_BAR |
| GR-009 | P1 | ACCEPT — MITIGATED | Five-observer Gate A and eight-session Gate B replace handpicked single success. | QUALITY_BAR, VISUAL_QA |
| ER-001 | P0 | ACCEPT — MITIGATED | Prepare → atomic events/head/receipt/fence → install → publish; crash injection at every barrier is blocking. | PERSISTENCE, SIMULATION, 001 |
| ER-002 | P0 | ACCEPT — MITIGATED | V1 is export-only; no import/replacement/upcaster route; unknown versions fail closed without mutation. | PERSISTENCE, SECURITY, TESTING |
| ER-003 | P1 | ACCEPT — MITIGATED | Exact integer/rounding/text/JCS/SHA-256/xoshiro/stream/ID/hash boundaries and golden vectors are frozen. | SIMULATION |
| ER-004 | P1 | ACCEPT — MITIGATED | Durable accepted/rejected receipt and same-ID/different-fingerprint collision are atomic with head/events. | PERSISTENCE |
| ER-005 | P1 | ACCEPT — MITIGATED | Snapshot-after-base plus half-open range/zero-event case; one version; gaps/unknown versions fail. | PERSISTENCE, TESTING |
| ER-006 | P1 | ACCEPT — MITIGATED | One canonical causal enum; temporal/response separate; allegation is typed content. | SIMULATION, WORLD_MODEL, CHRONICLE |
| ER-007 | P1 | ACCEPT — MITIGATED | Noninterference covers context/catalog/errors/targets/explanations/public projection. | COGNITION, EVALS, SECURITY |
| ER-008 | P1 | ACCEPT — MITIGATED | Monotonic writer fencing token is checked on append/snapshot; stale-tab transfer test blocks. | PERSISTENCE |
| ER-009 | P1 | ACCEPT — MITIGATED | Product/visual kill gates and ugly loop precede full world; 52 planned + ≤8 fixes, hard 60. | 001 |
| ER-010 | P1 | PARTIALLY ACCEPT — MITIGATED | No fictional provider-specific path. A fake BrainPort tests generic absence/failure because the requested no-model fallback remains binding; 429/revoke become conditional later. | COGNITION, TESTING |
| ER-011 | P1 | ACCEPT — MITIGATED | 30/90/365 must reach exact terminal time under explicit time/event/storage caps; named desktop/mobile profiles. | SIMULATION, PERFORMANCE |
| ER-012 | P1 | ACCEPT — MITIGATED | FRONTEND selects Pixi-only 2.5D atlas and forbids Three/R3F/3D pipeline. | FRONTEND, PERFORMANCE |
| ER-013 | P1 | ACCEPT — MITIGATED | Typed DecisionExplanation supplies reason codes/references/terms; authored justification is testimony, not fact. | COGNITION, AGENT_LIFE |
| DR-001 | P1 | ACCEPT — MITIGATED | Renderer authority now unambiguously Pixi/atlas; all R3F language is historical rejected-spike evidence. | FRONTEND, PERFORMANCE |
| DR-002 | P1 | ACCEPT — MITIGATED | Single orientation → Follow Mara → peek → inspect/investigate → decide state machine. | INTERACTION, MOBILE |
| DR-003 | P1 | ACCEPT — MITIGATED | Four-hour visual checkpoint occurs before full sim/persistence integration. | FRONTEND, 001 |
| DR-004 | P1 | ACCEPT — MITIGATED | Exact five-observer manifest and 3/5, 4/5 thresholds replace singular observer. | VISUAL_QA, QUALITY_BAR |
| DR-005 | P1 | ACCEPT — MITIGATED | Asset list cut to two portraits, modular bodies, story props/marks; all production steps count in budget. | FRONTEND, DESIGN |
| DR-006 | P1 | ACCEPT — MITIGATED | One primary three-beat ≤20s Chronicle/card and canonical five visual meanings. | CHRONICLE, DESIGN |
| DR-007 | P1 | ACCEPT — MITIGATED | Water/wood/exchange/verify/relationship lexicon specifies pose/prop/place/motion/before-after/DOM. | DESIGN |
| DR-008 | P1 | ACCEPT — MITIGATED | Gate B measures cross-surface Mara recognition, concern and voluntary next action, not recall alone. | DESIGN, QUALITY_BAR |
| PP-001 | P0 | ACCEPT — MITIGATED | Three branches, perturb/transfer/baseline/ablation and randomized real-versus-yoked sessions block scripted agency. | PRODUCT, EVALS |
| PP-002 | P0 | PARTIALLY ACCEPT — MITIGATED BY HONEST SCOPE | Recipient route is not authorized; V1 is private Copy story card with no distribution/click claim. | DISTRIBUTION, CHRONICLE |
| PP-003 | P0 | ACCEPT — MITIGATED | Single Riverhold proof label; session 5/20, succession, newcomer and retention claims removed from V1. | PRODUCT, PROGRESSION |
| PP-004 | P1 | ACCEPT — MITIGATED | Fixed Follow Mara/autonomy copy replaces create/choose/sponsor ambiguity. | PRODUCT, INTERACTION |
| PP-005 | P1 | ACCEPT — MITIGATED | Two-second shell, three-second CTA, 60-second investigation, five-minute advice. | HUMAN_LOOP, PERFORMANCE |
| PP-006 | P1 | ACCEPT — MITIGATED | Authoritative interaction and anti-script matrix test state-sensitive people. | GAME_SYSTEMS, EVALS |
| PP-007 | P1 | ACCEPT — MITIGATED | Reproducible leave/advance manifest and second decision are in Gate B. | HUMAN_LOOP, 001 |
| PP-008 | P1 | ACCEPT — MITIGATED | Mobile world/peek/scroll/back/chooser/People/zoom rules and tests are explicit. | MOBILE, FRONTEND |
| PP-009 | P1 | ACCEPT — MITIGATED | Local-device notice appears in first peek and before advice; storage failure precedes commitment; export is honest. | MOBILE, PERSISTENCE |
| PP-010 | P1 | ACCEPT — MITIGATED | Card says advised/chose/what followed and tests false causal credit. | CHRONICLE, DISTRIBUTION |
| PP-011 | P1 | ACCEPT — MITIGATED | Eight sessions, cross-surface identity, concern, voluntary second action, yoked control; reload is not retention. | QUALITY_BAR, EVALS |
| PP-012 | P1 | PARTIALLY ACCEPT — MITIGATED WITHOUT EXPANSION | Decision boundary is stable/readable with one-line stakes for screen sharing; no chat integration/dashboard. | INTERACTION, 001 |
| PP-013 | P1 | ACCEPT — MITIGATED | One consistent eight-session formative script precedes audience/channel cohorts. | QUALITY_BAR, DISTRIBUTION |
| ZG-001 | P0 | ACCEPT — MITIGATED | Operator-only human evidence paths and a stop before production foundations prevent fabricated/recruited evidence while permitting later non-human work. | Goal prompt, 001, QUALITY_BAR |
| ZG-002 | P1 | ACCEPT — MITIGATED | Goal prompt resolves immutable planning base and exact implementation worktree/branch; production never edits planning. | Goal prompt, 001 |
| ZG-003 | P1 | ACCEPT — MITIGATED | Gate 0 binary/rank and Gate B anchored/strict-mean algorithms make outcomes mechanical. | Goal prompt, QUALITY_BAR |
| ZG-004 | P1 | ACCEPT — MITIGATED | Finite security gate enumerates egress, active content, bounds, fail-closed storage, advisories and evidence. | Goal prompt, QUALITY_BAR, SECURITY |
| FR-001 | P1 | ACCEPT — MITIGATED | Length-framed typed tuples, exact base32, acyclic batch/event order, literal xoshiro transition/state/vector and collision fixtures close the byte profile. | SIMULATION, Goal prompt |
| FR-002 | P1 | ACCEPT — MITIGATED | `riverhold-visibility-v1` owns the viewer/purpose/label/revision matrix, private-parent behavior, coalesced error surface and typed disclosure. | WORLD_MODEL, COGNITION, SECURITY, TESTING |
| FR-003 | P1 | ACCEPT — MITIGATED | Eighteen prerequisite/owner/evidence tasks total 39.5/52/65; productive labor sums across agents, eight hours remain contingency, and timed M0 forces re-estimation. | 001, COST_MODEL, Goal prompt |
| FR-004 | P1 | ACCEPT — MITIGATED | All five see all six under a seeded cyclic-Latin schedule with fixed content/timing, exact questions/rank/tie/abandonment rules and mock analyzer. | QUALITY_BAR, 001, Goal prompt |
| FR-005 | P1 | ACCEPT — MITIGATED | Mill is the single repair object across resource rule, visual cue, work order, scope and Chronicle; well remains only the water site. | ECONOMY, GAME_SYSTEMS, DESIGN, CHRONICLE, 001 |
| ZC-001 | P1 | ACCEPT — MITIGATED | Acceptance distinguishes permitted local preview asset requests from forbidden DNS/external egress and records HAR assertions. | Goal prompt, SECURITY, PERFORMANCE |
| ZC-002 | P1 | ACCEPT — MITIGATED | M1 is defined inline as first production durable protocol/simulation milestone; missing Gate 0 blocks all production packages/apps. | Goal prompt |
| ZC-003 | P1 | ACCEPT — MITIGATED | Exact eligibility/agreement, frozen manifests, seeds, assignments, scripts, anchors, rubrics and withdrawal handling now precommit every human gate. | Goal prompt, QUALITY_BAR, EVALS |
| ZC-004 | P1 | ACCEPT — MITIGATED | One build/profile/cache/run/mark/frame/gzip/egress procedure decides every performance budget. | PERFORMANCE, Goal prompt |
| ZC-005 | P1 | ACCEPT — MITIGATED | Voluntary informed participation, affirmative agreement, no PII/recording and withdrawal rights replace consent-free observation language. | Goal prompt, QUALITY_BAR, 001 |
| Z2-001 | P1 | ACCEPT — MITIGATED | Stable H/FAM/TRI/FAC/ECH/DIR IDs, six literal rows and H-specific scoring eliminate Gate 0 assignment ambiguity. | Goal prompt, QUALITY_BAR |
| Z2-002 | P1 | ACCEPT — MITIGATED | Gate B fixes descending rejection-sampled shuffle, missing-rating failure and exact `the player/you` card answer. | Goal prompt, QUALITY_BAR |
| Z2-003 | P1 | ACCEPT — MITIGATED | Every hash domain has a typed field schema plus full independently reproduced preimage/digest/ID vectors; tests use a second encoder. | SIMULATION, Goal prompt |
| Z2-004 | P1 | ACCEPT — MITIGATED | Full viewer/purpose/label truth table defines subject matching and inclusive-grant/exclusive-revoke semantics; static oracle is separate from production. | WORLD_MODEL, Goal prompt |
| Z2-005 | P1 | ACCEPT — MITIGATED | Deny-by-default browser flags, route abort/log and Chromium netlog cover attempted DNS and non-HTTP egress; offline journey is required. | SECURITY, PERFORMANCE, Goal prompt |
| Z2-006 | P1 | ACCEPT — MITIGATED | One headed lockfile-pinned Playwright Chromium executable/revision/hash owns all numerical gates; physical browser is separate evidence. | PERFORMANCE, Goal prompt |
| Z2-007 | P1 | ACCEPT — MITIGATED | Goal mode may commit policy/config only; GitHub API/settings/protection/Dependabot/push/PR mutations require separate operator authority. | TESTING, 001, Goal prompt |
| Z3-001 | P1 | PARTIALLY ACCEPT — PRESENTATION MITIGATED | The asserted 54-hour arithmetic double-counted one row: the 18 accepted expected estimates machine-sum to 52. Replacing the prose list with an ID table, total, row count and mandatory machine-sum removes that review ambiguity without relabeling or cutting work. | 001, Goal prompt |
| Z3-002 | P1 | ACCEPT — MITIGATED | Resume now requires a clean manifest-only checkpoint commit whose manifest names its first parent, avoiding a self-hashing current-HEAD field; any other collision stops for operator direction. | 001, Goal prompt |
| Z3-003 | P1 | ACCEPT — MITIGATED | Gate B fixes both condition timelines, prompt/rating administration, real-only behavioral counts, independent subsets, and diagnostic-only control counterparts. | QUALITY_BAR, 001, Goal prompt |
| Z3-004 | P1 | ACCEPT — MITIGATED | Gate A now freezes one application commit/seed/time across its cohort and reuses only Gate 0 questions/rubric, never its discarded build. | QUALITY_BAR, 001, Goal prompt |
| Z3-005 | P2 | ACCEPT — MITIGATED | Prompt status distinguishes dormant planning text from a future operator invocation that authorizes only the listed local actions and stops. | Goal prompt |
| Z3-006 | P2 | ACCEPT — MITIGATED | M0–M5 are minimum ordered non-coalescible runnable checkpoints with mandatory independent reviewer roles; extra checkpoints remain allowed. | 001, Goal prompt |
| Z3-007 | P2 | ACCEPT — MITIGATED | One Story Card branch is rejection-sampled from a framed seed and committed before viewer exposure; all five viewers receive that frozen card. | QUALITY_BAR, 001, Goal prompt |
| Z4-001 | P1 | ACCEPT — MITIGATED | Human results arrive through a bounded read-only external inbox; schema/hash/sign-off validation, evidence-only import and a new manifest-only checkpoint preserve the clean resume oracle. | QUALITY_BAR, 001, Goal prompt |
| Z4-002 | P1 | ACCEPT — MITIGATED | Exact `gate-0`, `gate-a`, `gate-b`, and `story-card` bytes plus independent zero-base seeds/order/branch vectors make every study derivation reproducible. | QUALITY_BAR, Goal prompt, SOURCE_LEDGER |
| Z4-003 | P1 | ACCEPT — MITIGATED | The prompt embeds closed P0–P3 definitions, mitigation/confirmation ownership and the no-waiver/reopen rule. | Goal prompt |
| Z4-004 | P1 | ACCEPT — MITIGATED | Gate 0 now requires H's unique rank win, 3/5 Yes on both binaries, and no alternative 20-point lead; an all-zero mock must fail. | QUALITY_BAR, 001, Goal prompt |
| Z4-005 | P2 | ACCEPT — MITIGATED | Node, pnpm and the complete mandatory direct dependency cohort are exact; any added dependency needs logged necessity, license/install/integrity review and re-estimation. | 001, Goal prompt, PROPOSED_TOOLS |
| Z4-006 | P2 | ACCEPT — MITIGATED | Work stops at 60 focused hours or before an action would cross it, not after the ceiling. | Goal prompt |
| Z4-007 | P2 | ACCEPT — MITIGATED | The evidence schema permits bounded written observation notes exactly as disclosed in the voluntary-participation script. | 001, Goal prompt |
| Z5-001 | P1 | ACCEPT — MITIGATED | `resume.json` has an exact non-circular schema/phase state machine; cohort imports are deterministic, content-addressed, append-only and ledgered without overwriting failed evidence. | 001, Goal prompt |
| Z5-002 | P1 | ACCEPT — MITIGATED | Study artifact/manifest commits, JCS manifest hash, outer/participant types, per-cohort maps, null/failure behavior and sign-off are normative and reject extra fields. | QUALITY_BAR, Goal prompt |
| Z5-003 | P1 | ACCEPT — MITIGATED | Signed setup/facilitation/analysis minutes exclude waits/participant response and count once per imported source SHA toward the 60-hour ceiling. | 001, Goal prompt |
| Z5-004 | P1 | ACCEPT — MITIGATED | Gate 0 product/visual and Gate A use foreground `performance.now()` from exact ready frames; focus/reload/pause invalidates without restart/replacement. | QUALITY_BAR, Goal prompt |
| Z5-005 | P1 | ACCEPT — MITIGATED | Snapshots include events through base; replay starts base+1 and ends final+1; genesis/zero-event boundaries are literal. | SIMULATION, PERSISTENCE, Goal prompt |
| Z5-006 | P1 | ACCEPT — MITIGATED | Hidden/missing/revoked errors share constant work and 50 ms release; 200-per-class round-robin medians/p95 must be pairwise within 5 ms. | COGNITION, TESTING, Goal prompt |
| Z5-007 | P2 | ACCEPT — MITIGATED | The canonical desktop/mobile lab is blocking; a physical phone is diagnostic, cannot substitute, and device absence does not stop work. | PERFORMANCE, 001, Goal prompt |
| Z5-008 | P2 | ACCEPT — MITIGATED | Development authority permits unauthenticated read-only exact package/advisory GETs to named official endpoints and still forbids remote mutation/credentials. | Goal prompt |

All P0/P1 findings have an authority-level mitigation; none is accepted as a live condition. The one allowed targeted cross-discipline confirmation passed FR-001 through FR-006 at `94f3acd`; the final Goal-prompt pass must verify the later Z2/Z3/Z4/Z5 mitigations before readiness.
