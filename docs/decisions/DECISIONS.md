# Product-foundation decisions

**Purpose:** Record the accepted product, game, design, technical, quality, and operating choices and reconcile severe review findings.

**Status:** INITIAL SYNTHESIS — dispositions are provisional until frozen-state red teams complete

**Authority boundary:** This file owns acceptance and review disposition. Linked authority documents own detailed behavior and contracts; the [source ledger](../research/SOURCE_LEDGER.md) owns provenance.

**Related documents:** [risks](RISKS.md), [open questions](OPEN_QUESTIONS.md), [product](../product/PRODUCT.md), [architecture](../engineering/ARCHITECTURE.md), [first ExecPlan](../exec-plans/active/001-foundation.md).

## Top 10 decisions

| Rank | ID | Decision | Why now |
|---:|---|---|---|
| 1 | D-001 | Sponsor one autonomous citizen in one bounded persistent region | Best robust balance of attachment, depth, reversibility and proof feasibility |
| 2 | D-002 | Prove life and attachment in one approximately 52-hour local slice | Makes the product thesis falsifiable before infrastructure |
| 3 | D-003 | Use rare, informed, rejectable counsel—not unit control or chat—as the core verb | Preserves personhood while giving the player consequential agency |
| 4 | D-004 | Make Chronicle a typed factual projection, never model-written causal prose | Return value and trust depend on inspectable truth |
| 5 | D-005 | Make the deterministic Standard Brain the complete V1 cognition path | Free, fast, replayable, device-inclusive operation is binding |
| 6 | D-006 | Run V1 locally in a Web Worker with IndexedDB behind `PersistencePort` | Fits solo/$0 constraints while preserving a later region-server seam |
| 7 | D-007 | Lock commands, events, cognition, replay and persistence contracts before UI work | Prevents presentation or models from becoming authority |
| 8 | D-008 | Use a sparse Living Woodcut language with one PixiJS 2.5D renderer | Strongest distinctiveness/Chronicle fit within the asset and performance ceiling |
| 9 | D-009 | Treat the factual Consequence Card/replay as a product system | Distribution tests the actual consequence rather than AI novelty |
| 10 | D-010 | Keep V1 free, account-free, model-free and noncommercial | Avoids spend, operations and business scope before fun is proven |

## D-001 — Bounded-region citizen sponsorship

**Decision.** Use tournament structure H: one sponsored citizen is the player's responsibility lens inside one small persistent canonical region. Relationships, artifacts, reputation, institutions, lineage and the patron covenant can outlive that citizen. Private World Forks are future non-canon snapshots and cannot alter canon.

**Evidence.** H scored 4.33 and won the base rubric and four declared sensitivity sets. One citizen beat family, trio and faction in the identical Riverhold scenario. The blind ECHOHOUSE challenger exposed a valid drama/concentration risk but did not beat H overall and required model/content assumptions incompatible with V1 [S-PLAYER-003] [S-PLAYER-004] [S-COMP-001] [S-COMP-002].

**Rejected alternatives.** Direct possession removes shared agency; family/trio/faction dilute first-person responsibility or add management; public shared civilization fails the proof envelope; ECHOHOUSE weakens continuity and zero-model operation.

**Remaining uncertainty.** One-person attachment, indirect-agency tolerance, death continuity and session-20 richness are product hypotheses, not human evidence.

**Resulting behavior.** The slice simulates eight people but foregrounds one. It implements one local region/seed and no death, server canon, cross-region traffic or forks. Product work reopens before infrastructure if Gate B fails.

**Constraint fit.** One town and one responsibility lens fit a solo M4 workflow and require no service, model, proprietary dataset, partner, revenue or spend.

**Reopen trigger.** Reopen if a randomized ugly ECHOHOUSE proof beats H by at least 20 percentage points on both immediate replay choice and correct causal explanation, or identical family/trio tests attach materially better than one citizen.

## D-002 — Two-gate, approximately 52-hour proof

**Decision.** Allocate eight hours to shared deterministic foundations, 20 to Proof of Life, 16 to Proof of Attachment, and eight to browser/access/performance fixes. Time constrains scope; acceptance criteria determine completion.

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

**Decision.** Chronicle is a deterministic projection of authoritative events. It distinguishes direct cause, trigger, contributing condition, temporal predecessor and named in-world allegation. Every factual sentence resolves to event IDs and hashes.

**Evidence.** The fixed Riverhold chain RV-001–RV-012 demonstrates biography, relationship history, While You Were Away, world history, replay, share card and public-event forms from one evidence set. The source and engineering research both reject post-hoc narrative inference.

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

**Resulting behavior.** V1 saves, reloads, catches up and replays offline. Simulation logic cannot import browser/server/provider/render code. A server adapter can later replace storage semantics without changing Reality.

**Constraint fit.** Eliminates deployment, account, ops and recurring cost from the proof while preserving a reversible boundary.

**Reopen trigger.** Reopen IndexedDB only on quota/recovery evidence; reopen hosted topology only after both product gates and fresh cost/security/backup approval.

## D-007 — Deterministic authority contracts

**Decision.** Lock `WorldCommand`, `WorldEventEnvelope`, `DecisionContext`, `IntentProposal`, `ReplayManifest` and `PersistencePort` at field level. Reality alone changes canonical state; conserved quantities are integers; time/randomness are injected and seeded.

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

**Decision.** The share object is a factual 10–20 second Consequence Card/replay: consequence in 0–2 seconds, three authoritative beats through 12 seconds, unresolved tension and a seed/event reference. Build screenshot/copy layouts only; public routes and posting integrations are deferred.

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

Frozen-state P0/P1 findings will be recorded here with one of three dispositions:

| Finding | Severity | Disposition | Evidence and reasoning | Affected authorities | Required change and verification |
|---|---|---|---|---|---|
| Initial synthesis has not yet received frozen-state findings | — | — | Review wave begins from the SHA recorded in `PLAN.md` | Review files | Replace this row after all four independent reviews finish |

No P0 may be accepted. A P1 is mitigated only when the affected authority and verification gate are explicit.
