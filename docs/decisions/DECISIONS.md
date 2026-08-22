# Product-foundation decisions

**Purpose:** Record the accepted product, game, design, technical, quality, and operating choices and reconcile severe review findings.

**Status:** RECONCILED — FROZEN RED TEAMS, PLAYER PERSPECTIVES, AND GOAL-PROMPT CONFIRMATION PASSED

**Authority boundary:** This file owns acceptance and review disposition. Linked authority documents own detailed behavior and contracts; the [source ledger](../research/SOURCE_LEDGER.md) owns provenance.

**Related documents:** [risks](RISKS.md), [open questions](OPEN_QUESTIONS.md), [product](../product/PRODUCT.md), [architecture](../engineering/ARCHITECTURE.md), [first ExecPlan](../exec-plans/completed/001-foundation.md).

## Top 10 decisions

| Rank | ID | Decision | Why now |
|---:|---|---|---|
| 1 | D-001 | Enter the World through one authored autonomous citizen in one bounded local proof | Best robust consumer hypothesis, now subject to a matched Gate 0 kill test |
| 2 | D-002 | Prove life, contingency and bounded attachment in 52 planned hours plus ≤8 fix hours | Makes the product thesis falsifiable before platform work |
| 3 | D-003 | Use rare, informed, rejectable counsel—not unit control or chat—as the core verb | Preserves personhood while giving the player consequential agency |
| 4 | D-004 | Make Chronicle a typed factual projection, never model-written causal prose | Return value and trust depend on inspectable truth |
| 5 | D-005 | Make the deterministic Standard Brain the complete V1 cognition path | Free, fast, replayable, device-inclusive operation is binding |
| 6 | D-006 | Run V1 locally in a Web Worker with IndexedDB behind `PersistencePort` | Fits solo/$0 constraints while preserving a later region-server seam |
| 7 | D-007 | Lock world, cognitive-decision, experiment, replay and persistence contracts before UI work | Prevents presentation, models, or research tooling from becoming authority |
| 8 | D-008 | Use one embodied low-poly PlayCanvas world with Living Woodcut material/Chronicle language | The World Presence override and measured spike made visible people, tasks, and settlement life release-blocking |
| 9 | D-009 | Treat the factual Story Card/replay as private comprehension evidence in V1 | No public route exists, so distribution remains post-proof |
| 10 | D-010 | Keep V1 free, account-free, model-free and noncommercial | Avoids spend, operations and business scope before fun is proven |

## D-001 — Bounded-region citizen sponsorship

**Decision.** EONFOLK's long-term identity is World (consumer persistent civilization sponsoring autonomous minds), Chronicle (factual causal history/replay), and Observatory (future controlled inspection/fork/experiment surface). Retain tournament structure H provisionally as the smallest consumer entry: fixed authored Mara is the player's responsibility lens inside one small local region. Player-facing entry is **Follow Mara / She acts for herself**; it creates a limited sponsor relationship, not a creator/roster or ownership claim. Long-lived public canon, lineage, additional roles, Observatory UI and forks are future hypotheses.

**Evidence.** H scored 4.33 and won the base rubric and four declared sensitivity sets. One citizen beat family, trio and faction in the identical Riverhold scenario. The blind ECHOHOUSE challenger exposed a valid drama/concentration risk but did not beat H overall and required model/content assumptions incompatible with V1 [S-PLAYER-003] [S-PLAYER-004] [S-COMP-001] [S-COMP-002].

**Rejected alternatives.** Direct possession removes shared agency; family/trio/faction dilute first-person responsibility or add management; public shared civilization fails the proof envelope; ECHOHOUSE weakens continuity and zero-model operation.

**Remaining uncertainty.** One-person attachment, indirect-agency tolerance, death continuity and session-20 richness are product hypotheses, not human evidence.

**Resulting behavior.** The slice simulates eight people but foregrounds one. It implements one local region/seed and no death, server canon, cross-region traffic, fork execution, research dashboard, or extra human-role UI. It preserves bounded provenance underneath the consumer loop. Product work reopens before infrastructure if Gate B fails.

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

**Decision.** Chronicle is a deterministic projection of the Canonical World Ledger. Causal edges are direct/trigger/contributing; temporal-predecessor/response-to are separate noncausal relations; allegation is attributed content. Every sentence resolves to events/hashes. Authorized evidence may link a decision/experiment record but can never substitute it for world truth. RV-001–012 is one oracle, while three advice histories must diverge materially and produce separate Chronicles.

**Evidence.** Riverhold oracle RV-001–RV-012 demonstrates biography, relationship history, While You Were Away, world history, replay, Story Card and future public-event forms from one evidence set. Counterfactual branch requirements prevent that oracle from becoming the only trajectory. Research rejects post-hoc narrative inference.

**Rejected alternatives.** Raw logs as the return experience, model-written facts, causal “because” from temporal order, omniscient motives, unmarked allegations and unsimulated counterfactuals.

**Remaining uncertainty.** Strictly qualified fact text may feel cold, and Chronicle polish could disguise a trivial simulation.

**Resulting behavior.** Templates consume only declared predicates; replay uses the snapshot plus exact accepted Canonical World Ledger interval of batch headers and events and never invokes cognition; original proposals remain audit evidence; public justifications remain testimony. Any factual mismatch is P0.

**Constraint fit.** One projection pipeline serves return, replay, QA and sharing without hosted inference or a second content pipeline.

**Reopen trigger.** Reopen density if strangers cannot reconstruct actor, intervention, three causal beats and unresolved tension in five seconds; never weaken factuality to improve drama.

## D-005 — Standard Brain and optional model ecology

**Decision.** A deterministic integer-scored Standard Brain performs all routine and decision-boundary behavior. External/local models are absent from V1 and may later propose one bounded typed action only at decision boundaries. Provider/model/version plus the original structured proposal are provenance, not character identity or marketing; replay never assumes the model can reproduce its output.

**Evidence.** Systems research supports typed memory/plans and bounded action spaces, while browser runtimes impose downloads/device limits [S-SYS-01] [S-SYS-02] [S-MODEL-01] [S-MODEL-05]. The local qwen spike validated schema/authorization/fallback shape but produced 8,064 ms cold latency and poor public copy [S-SPIKE-003].

**Rejected alternatives.** Required model download/key, branded-model onboarding, continuous calls, training/fine-tuning, vector infrastructure, free-form state patches and stored hidden reasoning.

**Remaining uncertainty.** Eight deterministic citizens may feel clockwork; typed justifications may feel authored rather than personal.

**Resulting behavior.** Every decision uses visible facts/beliefs, Standing Plan, bounded actions and budgets. Proposal validation occurs after cognition; failure always advances through Standard Brain. Replay never recalls a provider.

**Constraint fit.** Costs $0, needs no GPU/service/account/download, trains nothing and preserves free useful V1.

**Reopen trigger.** Test optional cognition only after mechanics/stakes/UI pass yet blinded players still isolate repetitive decisions; models must beat Standard Brain without harming fallback, frames, privacy or causal trust.

## D-006 — Local-first architecture with a server seam

**Decision.** Use strict TypeScript/pnpm; pure protocol/simulation/cognition packages; React Router/Vite; one simulation Web Worker; browser IndexedDB through `PersistencePort`; and one application layer. IndexedDB atomically creates one run and keeps distinct batch/event and raw cognitive-decision stores plus one immutable experiment manifest. Cloudflare Worker plus one SQLite-backed `RegionDO` per region remains a post-gate target, not V1 scope.

**Evidence.** The disposable deterministic spike established a viable reducer/scheduler/replay shape [S-SPIKE-001]. Current Durable Objects capabilities/prices are dated planning evidence and must be revalidated [S-SYS-08] [S-SYS-09].

**Rejected alternatives.** Server-first, continuous online simulation, one global authority object, Rust/WASM, custom WebGPU, microservices and shared mutable renderer/simulation state.

**Remaining uncertainty.** IndexedDB durability/eviction, multi-tab behavior, long-horizon growth and later region coordination remain unmeasured.

**Resulting behavior.** V1 saves, reloads, confirms resumable catch-up, and replays offline. It explicitly cannot back up/export/restore/import. Simulation logic cannot import browser/server/provider/render code. A future server can reuse domain contracts but needs new auth/outbox/alarm/backup/moderation/import design; it is not a drop-in adapter.

**Constraint fit.** Eliminates deployment, account, ops and recurring cost from the proof while preserving a reversible boundary.

**Reopen trigger.** Reopen IndexedDB only on quota/recovery evidence; reopen hosted topology only after both product gates and fresh cost/security/backup approval.

## D-007 — Deterministic authority contracts

**Decision.** Lock run-scoped `WorldCommand`, `WorldEventEnvelope`, `WorldBatchHeader`, `DecisionContext`, `IntentProposal`, `DecisionExplanation`, raw `CognitiveDecisionRecord`, filtered `DecisionTraceProjection`, `ExperimentManifest`, `CommandReceipt`, `CatchUpOperationReceipt`, `ReplayManifest` and `PersistencePort`. Keep Canonical World Ledger, Cognitive/Decision Ledger, and Experiment Manifest distinct. Freeze integer/JCS/SHA-256/PRNG/ID/scheduler rules and explicit domains for manifest/context/catalog/proposal/decision hashes. Atomically create genesis; prepare immutable transitions; atomically commit batch/events/head/receipt/fencing/raw decision provenance; then install/publish. Fencing is not canonical hash input. V1 is one schema version with no backup/export/import.

**Evidence.** The simulation spike produced identical repeated and replay hashes for 24-hour and seven-day runs with typed causal parents [S-SPIKE-001]. Architecture/cognition/security research converges on a validation boundary rather than trusting generated intent.

**Rejected alternatives.** `Date.now()`, `Math.random()`, floats for conserved quantities, provider SDKs or renderer imports in simulation, hidden reasoning, direct Brain writes and non-atomic append/state updates.

**Remaining uncertainty.** Migration/upcaster policy, canonical serialization across releases and 30/90/365-day event volume need implementation proof.

**Resulting behavior.** Commands/events/heads/receipts/snapshots/ranges/decisions carry run plus region; causal edges carry consuming mechanisms; stored batch headers let cognition-free replay reproduce state and world-head hashes. Consequential raw decision records connect state/context/plan/proposal/validation/receipt/events without hidden reasoning, while viewer-safe trace projections reauthorize each field. Catch-up is preflighted then durably chaptered.

**Constraint fit.** A small explicit kernel reduces solo debugging and makes no-model, offline, later-server and Chronicle behavior share one source of truth.

**Reopen trigger.** Contract changes require a recorded migration decision and replay fixtures; any inability to preserve deterministic equivalence blocks Gate A.

## D-008 — Embodied Living Woodcut on PlayCanvas

**Decision.** The 2026-08-21 World Presence override supersedes the sparse Pixi implementation choice while retaining Living Woodcut's palette, graphic restraint, and Chronicle grammar. Founder Alpha uses one PlayCanvas React/WebGL2 world: a stylized low-poly settlement, eight full-limbed humanoids, authored routes, carried props, visible action states, and a parallel fully playable semantic DOM. `packages/world-presentation` is the pure boundary between Reality and the renderer. Pixi remains development-only for immutable Gate 0 historical evidence and is not imported by the production web app.

**Evidence.** The bounded PlayCanvas spike rendered eight moving humanoids, six action classes, two interaction classes, and a recognizable settlement with headed p95 frame intervals below 10 ms on three emulated profiles [S-WP-001] [S-WP-003] [S-WP-014]. At exact clean commit `593e5ab`, the integrated build stays within the unchanged 200/650 KiB gzip budgets after deferring the world chunk; all fifteen unchanged-production journeys, zero-egress oracle, frozen cohort, and production audit pass [S-WP-022]. The Recast evaluation found a roughly 191 KiB gzip loader/WASM burden and an EONFOLK-owned interpolation adapter requirement, while the eight-citizen authored graph already supplies deterministic collision-free routes [S-WP-006] [S-WP-009] [S-WP-010].

**Rejected alternatives.** Sparse/static Pixi markers fail the release-blocking presence requirement. R3F/Three remains rejected for the measured first-slice path; dual renderers, custom WebGPU, generalized navmesh/crowd machinery, unreviewed asset packs, generated shipping assets, and a production Blender pipeline exceed the proof scope. Recast is deferred until authored topology demonstrably cannot express a required route.

**Remaining uncertainty.** Procedural primitives may still feel prototype-like, real mid-tier mobile/GPU/thermal behavior remains unmeasured, and the final independent inhabited/alive verdict is not yet recorded. KayKit CC0 assets are a conditional reviewed fallback, not a default dependency or committed payload [S-WP-015] [S-WP-016] [S-WP-021].

**Resulting behavior.** Reality owns action kind, origin, destination, target, simulation window, and result event. Presentation owns fixed-step interpolation, rig pose, camera, and explicitly cosmetic river motion; it never mutates Reality. The humanoid state graph covers idle, walk, carry, gather, inspect, talk, listen, exchange, repair, eat/rest, and reaction. Toma and Iven begin at interaction slots; Mara has a teal silhouette, rust scarf, and distinct headwear. Props make logs, water, grain, trade goods, and tools visible. Flight Recorder records bounded projection acceptance/mismatch data, and deterministic tests reject teleport, blocked-volume entry, missing event links, or action/animation contradiction.

**Constraint fit.** One renderer, procedural primitives, no production asset download, a four-package graph increase, and authored waypoints keep the change local, $0, solo-maintainable, and inside Founder Alpha rather than introducing generalized engine systems.

**Reopen trigger.** Reopen only if integrated three-viewport measurements miss blocking payload/frame/display budgets after the degradation order, authored paths cannot express a required Gate A/B action, or the independent reviewer cannot answer YES that Riverhold feels inhabited and alive after one bounded composition/readability pass.

## D-009 — Consequence-led distribution

**Decision.** The V1 object is a factual three-beat/≤20-second **Story Card**. Advice branches use YOU ADVISED; abstention uses NO ADVICE / YOU ABSTAINED; every branch then uses MARA CHOSE → WHAT FOLLOWED → UNRESOLVED. It is private comprehension evidence with responsive 16:9/9:16 composition, no dead link or seed headline. Public recipient routes and distribution claims are deferred.

**Evidence.** Competitor and distribution research shows AI-agent novelty is occupied and community behavior is channel-specific [S-COMP-001] [S-DIST-001] [S-DIST-002]. The same Riverhold evidence chain can serve QA, return and sharing.

**Rejected alternatives.** Paid acquisition, referral rewards, AI/model leaderboards, posting bots, creator payments/partnerships, analytics SDKs and polished artifacts that conceal trivial mechanics.

**Remaining uncertainty.** Organic conversion, creator interest and voluntary sharing are unproven.

**Resulting behavior.** First 10 are observed high-touch invitations; first 100 require a free direct page and evidence; first 1,000 require intrinsic pull. The slice only supports copyable Story Card text and responsive 16:9/9:16 compositions; deterministic fixture identity remains internal evidence rather than a public seed headline.

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

## Founder Alpha decisions

### D-011 — First-party bounded diagnostics, not session replay

**Decision.** Founder Alpha uses a typed first-party Flight Recorder, stable incident fingerprints, a Reality-protecting Sentinel, bounded native performance summaries, and a local read-only observer. Modes are OFF, LOCAL, and explicit-consent ALPHA. Preserve a disabled `ReplayCapturePort`, but do not add rrweb, browser OpenTelemetry, or an MCP server.

**Evidence.** rrweb 2.1.1 does not capture Pixi canvas by default; its canvas replay path removes script-execution sandbox protection. The reviewed dependency graph would also add more runtime surface than the structured traces need [S-FA-DIAG-001] [S-FA-DIAG-002] [S-FA-DIAG-003]. The browser Performance APIs provide the small timing surface required without a telemetry SDK [S-FA-DIAG-009] [S-FA-DIAG-010].

**Rejected alternatives.** Continuous DOM replay, raw network/body capture, hidden-reasoning capture, provider telemetry, browser OpenTelemetry, arbitrary-file observer access, and an SDK-backed MCP server.

**Remaining uncertainty.** Integrated OFF/LOCAL/ALPHA overhead and cross-browser fingerprint stability still require measured evidence; screenshots plus typed traces may not reproduce every canvas defect.

**Resulting behavior.** Redaction happens before storage or projection; rings and frozen incidents are byte/count bounded; diagnostics cannot write Reality; OFF retains only failures/Sentinel evidence; the observer reports typed health, incidents, performance, network summary, reproduction steps, artifacts, and a bounded world head.

**Constraint fit.** The design is dependency-light, local-first, free, operable on the target Mac, and small enough for one builder.

**Reopen trigger.** Reconsider replay capture only if a concrete unreproducible Alpha defect survives structured traces and screenshots and a bounded spike passes privacy, sandbox, bundle, and overhead gates.

### D-012 — Local feedback first; deployment-ready least-authority relay

**Decision.** Gameplay and feedback remain complete locally. The hosted seam is deploy-ready but not deployed: a minimal Worker validates bounded text/diagnostics, exact Origin, Turnstile, D1-backed reservation/dedup/lease state, and delivery through one private single-repository GitHub App with Metadata read and Issues write. Delivery is reconciled at-least-once, not claimed exactly-once. R2 attachments remain disabled.

**Evidence.** GitHub documents narrowly scoped installation tokens but no idempotency key on issue/comment creation, so D1 must own dedup and marker reconciliation [S-FA-PLATFORM-011] [S-FA-PLATFORM-012] [S-FA-PLATFORM-013]. Turnstile validation is mandatory and short-lived but is not identity or a quota [S-FA-PLATFORM-008] [S-FA-PLATFORM-009]. R2 requires a subscription and budget alerts do not cap spend [S-FA-PLATFORM-005] [S-FA-PLATFORM-006].

**Rejected alternatives.** Browser GitHub credentials, PATs, arbitrary repository input, exactly-once claims, automatic deployment, public attachment URLs, foundational hosted feedback, and R2 activation under an assumed free tier.

**Remaining uncertainty.** No Cloudflare account, App registration, key import, live Turnstile, Worker CPU measurement, D1 deployment, public abuse test, or public URL has run.

**Resulting behavior.** The web app previews and queues sanitized reports locally with clear local/upload state and deletion. The relay is an optional adapter with hard schema/origin/rate/quota/retention boundaries and no game authority. Outage never blocks the world.

**Constraint fit.** The accepted path incurs no cost or credentials now, uses no partner, and defers all operations while retaining a narrow future seam.

**Reopen trigger.** Revalidate all quotas, logging defaults, credentials, CPU, D1 reconciliation, abuse controls, and cost posture before any real deployment; reject the relay if fault injection duplicates or loses accepted reports.

### D-013 — Planner earns inclusion; model stays an optional local seam

**Decision.** Standard Brain remains complete and default. A zero-dependency deterministic HTN/GOAP-style Planner may ship only if a frozen 64-context benchmark clears every correctness/runtime gate and improves at least three predeclared coherence/diversity cases. POMCP/MCTS is rejected for Alpha. A provider-neutral local-subprocess BrainPort contract may exist, but no executable, model, weights, download, provider SDK, or network path ships.

**Evidence.** HTN/GOAP techniques provide authored reusable planning structure but have measurable search/precondition cost [S-FA-COG-001] [S-FA-COG-002]. POMCP requires a calibrated black-box transition/observation model that Riverhold does not have [S-FA-COG-003]. Reviewed local runtimes support offline/local execution, but no source establishes EONFOLK quality, latency, memory, thermals, or renderer coexistence [S-FA-COG-004] [S-FA-COG-007].

**Rejected alternatives.** Search sophistication as a deliverable, POMCP/MCTS without a calibrated model, required inference, auto-download, remote model identifiers, training, continuous calls, and free-form state patches.

**Remaining uncertainty.** The benchmark may show no meaningful planner advantage; optional local inference remains entirely unmeasured for this product and machine.

**Resulting behavior.** Standard Brain is the only executable brain. The future `BrainPort` is a type-only proposal-source seam; it has no adapter, deadline, process, model, network, or fallback claim. Candidate Planner promotion is mechanically disabled until a trusted runner derives outcomes from applied terminal state. Experiment pre-run manifests and append-only results are distinct noncanonical records and never reducer input.

**Constraint fit.** Zero new production dependency/model cost, complete no-model operation, and benchmark-gated scope fit the solo-builder envelope.

**Reopen trigger.** Remove the Planner if any hard benchmark gate fails or it does not clear the predeclared improvement floor. Authorize a local-model spike only after product evidence isolates a cognition deficit and an exact executable/model/license/security protocol is separately approved.

### D-014 — Read-only standards-shaped ontology projection

**Decision.** Observatory may project an opaque viewer-authorized Chronicle artifact as bounded embedded JSON-LD 1.1 using stable EONFOLK vocabulary terms and a locally PROV-shaped subset checked by a closed validator. This is not a full PROV-O/SHACL interoperability claim. RDF/JSON-LD is presentation/export data, never canonical Reality, reducer input, or a new ledger. RDF 1.2 and SHACL 1.2 features remain experimental.

**Evidence.** JSON-LD 1.1, PROV-O, and SHACL 1.0 are W3C Recommendations [S-FA-COG-008] [S-FA-COG-010] [S-FA-COG-011]. RDF 1.2 is a Candidate Recommendation Snapshot and SHACL 1.2 is a Working Draft [S-FA-COG-009] [S-FA-COG-012]. Reviewed general-purpose packages add unnecessary dependency/network surface for the bounded projection [S-FA-COG-014].

**Rejected alternatives.** RDF as the source of truth, remote context fetching, arbitrary SPARQL, general graph storage, full standards libraries, draft-only SHACL features, and ontology-driven reducer behavior.

**Remaining uncertainty.** No external consumer has demonstrated that the projection improves inquiry; vocabulary evolution needs versioned fixtures.

**Resulting behavior.** Chronicle authorization mints an artifact bound to viewer, purpose, revision, policy, canonical source digest, and the exact authorized event hashes. Observatory resolves every evidence ID against that set, then emits a deterministic, bounded, offline, versioned projection. Deleting it cannot change replay or world hashes.

**Constraint fit.** A small zero-dependency projection preserves future interoperability without expanding infrastructure or the product loop.

**Reopen trigger.** Change the vocabulary/validator only with a versioned migration fixture or a concrete consumer need; remove the surface if it adds maintenance without demonstrated inquiry value.

### D-015 — Proportionate three-tier verification

**Decision.** Maintain FAST, PR, and DEEP verification tiers. PR protects the complete critical journey and authoritative invariants; DEEP adds long-horizon/property/fuzz/performance/privacy work. Mutation analysis and formal expansion are targeted only where a surviving fault could undermine Reality, persistence, redaction, Sentinel, feedback authorization, or experiment isolation.

**Evidence.** The 001 baseline already provides deterministic replay, IndexedDB, headed browser, network, performance, security-audit, and bounded TLC evidence. GitHub's dated private-repository probe establishes the controls actually present rather than assumed enterprise features [S-FA-PLATFORM-015] [S-FA-PLATFORM-016] [S-FA-PLATFORM-017] [S-FA-PLATFORM-018].

**Rejected alternatives.** A single slow command, backend-only release evidence, unbounded fuzzing, broad mutation score theater, Actions deployment, mandatory outside reviewer, and claims based on unavailable native security products.

**Remaining uncertainty.** Final Alpha runtime and CI duration, diagnostic overhead, and physical mobile behavior are not yet measured.

**Resulting behavior.** Every release claim names its command, SHA, environment, pass/fail/not-run status, and artifact. UI changes require browser-visible evidence; cognition changes require isolation/failure/eval evidence; passing compilation never substitutes for play.

**Constraint fit.** The tiers keep routine feedback short for one maintainer while reserving expensive evidence for explicit release work at approximately $0.

**Reopen trigger.** Rebalance tiers when measured CI time or defect escape shows a check is misplaced; never remove a direct invariant falsification without an equal or stronger replacement.

## Founder Alpha frozen-review reconciliation

Six independent reviewers inspected frozen candidate `7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`. The candidate was correctly rejected. Every P0/P1 is accepted below; “closed by removal/deferral” means the unsafe claim or executable surface no longer exists, not that an active release blocker is tolerated. Human comprehension, attachment, screen-reader, physical-device, live-provider, deployment, and model evidence remain `NOT_RUN` and are not converted into technical passes.

| Finding | Severity | Disposition | Repair and direct evidence |
|---|---|---|---|
| FA-CI-001 | P0 | ACCEPT — CLOSED | `2166d37` uses an exact path **and** fingerprint Gitleaks exception for the benign fixture; full-history Gitleaks 8.30.1 passes and the adjacent-secret probe still rejects. |
| FA-CI-002 | P1 | ACCEPT — CLOSED | `2166d37` centralizes the accepted TLC SHA-256 and rejects missing/wrong JAR bytes before Java; the correct artifact still checks 3,480 generated/350 distinct states at depth 10. |
| FA-CI-003 | P1 | ACCEPT — CLOSED AFTER CONFIRMATION REPAIR | `2166d37` established the tiers; `9759988` separates fault-only and exact-production browser artifacts, fixes the comparative browser path, and makes PR/DEEP artifact allowlists disjoint; `8c49759` records every actually executed constituent and stops before unexecuted work. |
| FA-CI-004 | P1 | ACCEPT — CLOSED | `2166d37` makes IndexedDB unavailability/failure nonzero unless an explicit smoke-only probe is requested; smoke output cannot say PASS. |
| FA-SYS-001 | P1 | ACCEPT — CLOSED | `d3915bc` makes expired incident takeover atomic with the singleton global D1 lease and preserves live leases; concurrency/expiry fixtures pass. |
| FA-SYS-002 | P1 | ACCEPT — CLOSED | `d3915bc` implements HMAC-keyed 5/hour and 10/day source quotas, existing fingerprint/global caps, seven-day staging TTL, 30-day cleanup, and fail-closed cleanup. |
| FA-SYS-003 | P1 | ACCEPT — CLOSED | `a0c6d03` compares the durable commit result with the prepared post-head/receipt and safe-stops stale idempotent divergence before publishing candidate state. |
| FA-SYS-004 | P1 | ACCEPT — CLOSED | `a0c6d03` validates snapshot, manifest, batch, event, engine, schema, and outer/data agreement before replay or fencing; unsupported versions fail closed. |
| FA-SYS-005 | P1 | ACCEPT — CLOSED | `a0c6d03` and `ab6e420` require a same-run/region, prior, cognition-originated branch consequence with exact kind/reason; transition, replay, and runtime reject dangling/wrong references. |
| FA-DP-001 | P1 | ACCEPT — CLOSED AFTER CONFIRMATION REPAIR | `d3915bc` closes trusted recorder summaries; `d81d971` also reconstructs hostile browser-storage incident prose solely from the repository-owned summary-code mapping. |
| FA-DP-002 | P1 | ACCEPT — CLOSED | `d3915bc` shows only a sanitized OFF-mode stop reason plus exact incident ID and exposes the local report path; raw runtime errors are not rendered. |
| FA-DP-003 | P1 | ACCEPT — CLOSED | `d3915bc` implements seven-day relay staging expiry and 30-day counter/dedup cleanup without deleting a live lease. |
| FA-DP-004 | P1 | ACCEPT — CLOSED | `d3915bc` derives source buckets through operator-secret HMAC without persisting the raw source and rejects missing source/HMAC capability. |
| FA-DP-005 | P1 | ACCEPT — CLOSED AFTER CONFIRMATION REPAIR | `d3915bc` establishes queue bounds; `d81d971` proves a stored Bearer/credential-pattern canary is removed during closed-schema reconstruction and storage rewrite. |
| FA-VA-P1-001 | P1 | ACCEPT — CLOSED | `2d5f511` adds a 390×844 bounding regression: Follow Mara intersects the initial viewport while the illustrated world remains at least 55% of usable height. |
| FA-VA-P1-002 | P1 | ACCEPT — MITIGATED | `2d5f511` enforces 16 px factual/14 px secondary floors and deterministic 200%-equivalent browser reflow. A separate headful Chrome 151 run at 600×434 CSS/4 DPR recorded zero horizontal overflow and all three counsel choices; direct browser-UI shortcut control was OS-denied and remains honestly `NOT_RUN`. |
| FA-VA-P1-003 | P1 | ACCEPT — CLOSED | `2d5f511` gives counsel a distinct focus ring and implements heading-first modal focus, inert/hidden background, scroll lock, trap, Escape, and invoker restoration with a keyboard-only complete journey. |
| FA-VA-P1-004 | P1 | ACCEPT — CLOSED | `2d5f511` adds a remembered selectable words view and injected renderer-failure fallback; the complete loop remains playable without canvas. |
| FA-VA-P1-005 | P1 | ACCEPT — CLOSED | `2d5f511` implements eight differentiated silhouettes, activity props/labels, and an explicit Toma–Iven wood-for-rations interaction plus equivalent semantic rows. |
| FA-VA-P1-006 | P1 | ACCEPT — CLOSED | `2d5f511` persists manual reduced motion and disables root smooth scrolling and nonessential motion. |
| FA-VA-P1-007 | P1 | ACCEPT — CLOSED | `2d5f511` raises UNKNOWN badge contrast and directly computes every fact/belief/claim badge at ≥4.5:1. |
| FA-COG-R-001 | P1 | ACCEPT — CLOSED AFTER CONFIRMATION REPAIR | `b64531f` adds the comparison surface; `b99530f` makes reactive-nearest-need use only typed need tags with a closed fallback and proves control-specific rules plus all five action/explanation ablations under rehashed contexts. Existing branch tests retain the three terminal world vectors. |
| FA-COG-R-002 | P1 | ACCEPT — CLOSED BY FAIL-CLOSED DEFERRAL | `b64531f` disables promotion; `b99530f` removes the last active 52-goal sentence and limits the descriptor to generated legality/repeatability smoke evidence until a trusted authoritative runner exists. |
| FA-COG-R-003 | P1 | ACCEPT — CLOSED BY REMOVAL | `b64531f` removes the executable optional adapter and false timeout path. The remaining Standard proposal validator is recursively closed, byte/depth/count bounded, reference-authorized, template-checked, and hash-checked. |
| FA-COG-R-004 | P1 | ACCEPT — CLOSED AFTER CONFIRMATION REPAIR | `c518af1` binds ordered context/seed/repetition executions and derives completion/invocation counts; `e2fb64b` requires per-execution proposal/output/terminal-vector hashes, latency, and passing invariants. The docs retain that caller-bound hashes are not proof of a real adapter or authoritative terminal application. |
| FA-COG-R-005 | P1 | ACCEPT — CLOSED AFTER CONFIRMATION REPAIR | `d81d971` adds private `WeakSet` object-identity provenance to the existing immutable artifact binding; reflected-symbol/cloned/private-canary relabelling now fails closed. |
| FA-PRODUCT-P1-001 | P1 | ACCEPT — CLOSED | Same repair/evidence as FA-VA-P1-001; unfamiliar-human findability remains `NOT_RUN`. |
| FA-PRODUCT-P1-002 | P1 | ACCEPT — CLOSED | `2d5f511` presents the exact count mismatch, values, plan, Toma relationship, uncertainty, local-save limit, all choices, and stakes in the same counsel frame on mobile and desktop. |
| FA-PRODUCT-P1-003 | P1 | ACCEPT — CLOSED | `ab6e420` makes default accuse advice deterministically reject: Mara's visible plan, commitment, and trust outweigh counsel without a tie/random draw. Browser evidence in `cb535f4` proves requested advice and chosen action differ. |
| FA-PRODUCT-P1-004 | P1 | ACCEPT — CLOSED | `ab6e420` inserts a six-hour boundary and typed consequence for every branch: verify changes trust after sourced belief; accuse changes trust/petition after allegation; abstention gains one independent petition endorsement with zero causal parents and temporal-only links. |

## Founder Alpha first-confirmation reconciliation

Fresh confirmation at frozen commit `d9f7c20ce2d7439c0886adfd7603f4eab5af1fcb` found zero P0 and seven P1 mechanisms. The failed report is retained in [FOUNDER_ALPHA_CONFIRMATION](../reviews/FOUNDER_ALPHA_CONFIRMATION.md). All seven are accepted and repaired below; this table supersedes the premature closure wording for the affected frozen findings. It does not claim the permitted targeted re-review or final DEEP/remote CI has passed yet.

| Finding | Disposition | Repair and direct evidence |
|---|---|---|
| FA-CONF-001 | ACCEPT — CLOSED IN CODE; TARGETED CONFIRMATION PENDING | `9759988` updates the comparative browser journey to the current counsel control and corrects argument forwarding. The direct OFF/LOCAL/ALPHA benchmark passed all mode/frame/relative/console/zero-egress assertions on the repair branch. |
| FA-CONF-002 | ACCEPT — CLOSED IN CODE; TARGETED CONFIRMATION PENDING | `9759988` isolates two fault-only journeys, then rebuilds/budgets production and runs fourteen journeys against unchanged `dist`; `8c49759` records nineteen actual PR constituents and the seven DEEP additions individually, fail-fast. Crash markers are forbidden in the final production manifest. |
| FA-CONF-003 | ACCEPT — CLOSED IN CODE; TARGETED CONFIRMATION PENDING | `d81d971` requires private `WeakSet` mint identity as well as the immutable brand/binding. A reflected-symbol clone relabelled public with private canary content is rejected. |
| FA-CONF-004 | ACCEPT — CLOSED IN CODE; TARGETED CONFIRMATION PENDING | `d81d971` reconstructs incident prose from the accepted summary code and copies only closed fields. Hostile Bearer/credential-pattern prose is absent after load and storage rewrite. |
| FA-CONF-005 | ACCEPT — CLOSED IN CODE; TARGETED CONFIRMATION PENDING | `b99530f` makes reactive-nearest-need use the only typed need signal available, ignore counsel/risk/values/records, expose a closed selection reason, and proves control plus all five ablation differences under rehashed contexts. No nearest-severity or terminal-world claim is added. |
| FA-CONF-006 | ACCEPT — CLOSED IN AUTHORITY; TARGETED CONFIRMATION PENDING | `b99530f` removes the retained 52-goal statement and explicitly limits the 64 generated cases to legality/repeatability smoke evidence. Planner promotion remains disabled. |
| FA-CONF-007 | ACCEPT — CLOSED IN CODE; TARGETED CONFIRMATION PENDING | `c518af1` binds every ordered context/seed/repetition execution and derives counts; `e2fb64b` additionally requires proposal/output/terminal-vector hashes, latency, and passing invariants per completed execution. Missing, duplicate, reordered, extraneous, mismatched, tampered, incomplete, or unsuccessful runs reject. These caller-bound identities are not presented as proof of a real adapter or authoritative terminal application. |
| FA-QA-001 | ACCEPT — CLOSED IN CODE; TARGETED CONFIRMATION PENDING | The first integrated DEEP run correctly failed closed after every preceding constituent passed because the canonical performance harness retained the same obsolete counsel label already removed from the diagnostics harness. The repair aligns both scripts to `Review Mara's choices` and adds one source-contract regression covering both DEEP browser journeys. A subsequent clean, unchanged run at `59edef3` passed all 26 DEEP rows and fifteen canonical journeys; manifest output SHA-256 `b4bb47f0395b8c122678416aee62db632575b16e05729f3d64a9a3b3af9a83d2`. The failed run and partial benchmark remain unaccepted. |

The reviewed P2s were also bounded: build/schema-bound fingerprints and capability truth (`d3915bc`), authorized Observatory input and hostile local storage (`b64531f`/`d3915bc`), 44 px targets and ordinary-language/local-feedback copy (`2d5f511`), and exact `00:00`/`00:06`/`00:12` Story Card labels (`ab6e420`). The disposable rehearsal procedure and all human judgments remain operational/human evidence rather than product claims.

## Civilization amendment integration

| ID | Binding direction | Accepted implementation consequence | Scope guard |
|---|---|---|---|
| CA-001 | Maximum strategy, causal boundaries | Typed Reality actions may compose into unforeseen strategies; prose/models never write state or gain arbitrary tools/network/code | No new Gate A/B mechanic |
| CA-002 | Preserve private information | World facts, observations, private knowledge, beliefs, confidence/provenance, memories, and message claims remain distinct; raw audit records never reach partial viewers | Small records plus one shared filtered projector |
| CA-003 | Research traceability | hashed raw `CognitiveDecisionRecord` closes state → context → plan → proposal → validation → receipt → event IDs; `DecisionTraceProjection` discloses safely | Consequential boundaries only |
| CA-004 | Three data forms | Separate run-scoped batch/event store, raw decision store, and immutable `ExperimentManifest` | No query/dashboard service |
| CA-005 | Replay is not model reproduction | Canonical replay consumes manifest + snapshot + accepted batch/event ledger and reproduces state/world head; original proposal is separate audit evidence | No model adapter/runtime |
| CA-006 | Future institution kernel | Preserve composition concepts for membership/roles/rules/assets/authority/claims/agreements/succession/enforcement | Only grandfathered fixed Riverhold data/validator; no government system |
| CA-007 | Human roles | Preserve Stranger/Follower/Patron/Historian/Experimenter/Creator compatibility | Implement only Mara follow/counsel/history path |
| CA-008 | Canon and counterfactuals | Future forks name canonical parent snapshot/run and never write back | No fork execution/import/UI |
| CA-009 | Research positioning | Study agent behavior/institution emergence in grounded simulated environments; never claim human-society prediction | No dataset/publication/benchmark claim |
| CA-010 | Proof scope unchanged | Keep Gate 0/A/B, 52 planned + ≤8 fix hours, and explicit exclusions | Explicit 2-hour provenance delta is funded by removing 2-hour backup/export work |

## Civilization-amendment review reconciliation

The first fresh amendment, Goal-prompt, and systems reviews found no P0 and fourteen P1 contract defects. Every P1 is accepted and corrected below before the confirmation target is frozen; P2 notes are also closed so they cannot become implementation forks.

| Finding | Severity | Disposition | Evidence/reasoning and required verification | Affected authorities |
|---|---|---|---|---|
| CAR-001 | P1 | ACCEPT — MITIGATED | Raw `CognitiveDecisionRecord` is internal audit data; a separately authorized `DecisionTraceProjection` rechecks every reference. Hidden-fact byte equality applies only to actor/viewer-visible projections. | COGNITION, CHRONICLE, OBSERVATORY, SECURITY |
| CAR-002 | P1 | ACCEPT — MITIGATED | Initial and resumed execution bind the exact current Goal-prompt Git blob through `orchestrationPromptBlob`; the predecessor prompt copy is explicitly non-authoritative. | Goal prompt |
| CAR-003 | P1 | ACCEPT — MITIGATED | The two-hour provenance/run/genesis delta replaces two hours of removed backup/export work; task totals and Gate A/B mechanics remain 40/52/65 and unchanged. | 001, Goal prompt, PERSISTENCE |
| CAR-004 | P1 | ACCEPT — MITIGATED | Readiness stays candidate until the amended commit receives fresh confirmation and current QA replaces the pre-amendment evidence. | PLAN, FINAL_READINESS, Goal prompt |
| ZCR-001 | P1 | ACCEPT — MITIGATED | ExecPlan and Goal now share the external-inbox, content-addressed human-evidence destination, and append-only import-ledger authority. | 001, Goal prompt |
| ZCR-002 | P1 | ACCEPT — MITIGATED | Gate B uses the same 60-second action and exact four allowed reason tokens in both authorities. | 001, Goal prompt, FINAL_READINESS |
| PSR-001 | P1 | ACCEPT — MITIGATED | `runId` plus region scopes every world command/event/context/decision/head/receipt/snapshot/range/key and is checked against the immutable manifest. | WORLD_MODEL, SIMULATION, COGNITION, PERSISTENCE, 001, Goal prompt |
| PSR-002 | P1 | ACCEPT — MITIGATED | Idempotent `commitGenesis` atomically creates manifest, genesis snapshot/head/fence, and empty ledgers; crashes leave all or none. | PERSISTENCE, TESTING, 001, Goal prompt |
| PSR-003 | P1 | ACCEPT — MITIGATED | Fencing is CAS metadata only. Stored canonical `WorldBatchHeader` records make the world-head chain cognition-free and replayable. V2 vectors are independently reproduced. | SIMULATION, PERSISTENCE, TESTING, Goal prompt |
| PSR-004 | P1 | ACCEPT — MITIGATED | Framed JCS domains now lock manifest/context/catalog/proposal/raw-decision preimages; exact proposal bytes and collision-safe record hashes are stored. | SIMULATION, COGNITION, PERSISTENCE, Goal prompt |
| PSR-005 | P1 | ACCEPT — MITIGATED | Every causal-parent edge now carries a versioned `mechanismId`; temporal/response relations remain separate. | SIMULATION, WORLD_MODEL, CHRONICLE |
| PSR-006 | P1 | ACCEPT — MITIGATED | Accepted commands contain 1–32 state-chained events and one revision advance; catch-up preflights globally, then commits resumable idempotent child chapters. | SIMULATION, PERSISTENCE, TESTING, Goal prompt |
| PSR-007 | P1 | ACCEPT — MITIGATED | Raw whole-state/event/batch hashes are diagnostic unless the entire preimage is readable; Chronicle cites authorized event/payload projections and may use only a nonauthoritative projection digest. | WORLD_MODEL, CHRONICLE, SECURITY, Goal prompt |
| PSR-008 | P1 | ACCEPT — MITIGATED | RV-010–RV-012 is grandfathered as authored data plus one fixed validator; generalized government/institution code remains excluded. | GOVERNANCE, 001, Goal prompt |
| PSR-009 | P2 | ACCEPT — MITIGATED | Proposal rejection uses one deterministic fallback/no-op and zero Brain retries; any replan occurs only at a later named boundary. | COGNITION, Goal prompt |
| PSR-010 | P2 | ACCEPT — MITIGATED | Message observation means the communication act occurred, never that its proposition is observed or true. | AGENT_LIFE, WORLD_MODEL, Goal prompt |
| PSR-011 | P2 | ACCEPT — MITIGATED | The manifest names configured intervention-protocol IDs; executed intervention/command IDs live in receipts/events. | PERSISTENCE, OBSERVATORY, Goal prompt |
| PSR-012 | P2 | ACCEPT — MITIGATED | Persisted decision records round-trip as separate audit evidence; canonical replay neither regenerates nor consumes cognition records. | COGNITION, PERSISTENCE |
| PSR-013 | P2 | ACCEPT — MITIGATED | `creationSequence` is one global per-run counter and assigns consecutive values in typed payload order. | SIMULATION, Goal prompt |
| CAA-001 | P1 | ACCEPT — MITIGATED | Product authority now uses six participants, all Williams rows, unique rank plus 4/6 floors, comparative reopen, and diagnostic-only Replay. | PRODUCT, QUALITY_BAR, 001, Goal prompt |
| CAA-002 | P1 | ACCEPT — MITIGATED | Quality Bar and ExecPlan now start Gate B clocks only on the same complete advice-ready and changed-return frames as the Goal prompt. | QUALITY_BAR, 001, Goal prompt |
| CAA-003 | P1 | ACCEPT — MITIGATED | Gate B administration explicitly records four comprehension slots, conditional `SecondActionWhy`/null, then Contingency and Continue. | QUALITY_BAR, 001, Goal prompt |
| CAA-004 | P2 | ACCEPT — MITIGATED | Original QA/exit checks are explicitly historical; amended readiness remains unchecked until fresh confirmation and QA. | PLAN, FINAL_READINESS |
| ACF-001 | P1 | ACCEPT — MITIGATED | The golden event now carries its required originating command ID; event and dependent batch hashes were independently regenerated, and accepted provenance must match batch/receipt references. | SIMULATION, Goal prompt, TESTING |
| ACF-002 | P2 | ACCEPT — MITIGATED | Observatory now names accepted batch headers plus events and requires state/world-head replay. | OBSERVATORY |
| ACF-003 | P2 | ACCEPT — MITIGATED | Raw decision lookup/store keys now include run, region, and decision ID. | PERSISTENCE |
| ZG-001 | P1 | ACCEPT — MITIGATED | All four Gate B/Gate A option PRNG digest/draw/order sentinels now use the only permitted V2 tuple/domain and were independently reproduced. | Goal prompt, SOURCE_LEDGER |
| ZG-002 | P1 | ACCEPT — MITIGATED | Every invocation requires a higher-authority operator-supplied approved prompt blob; repo/checkpoint values can verify but never create that approval. | Goal prompt, FINAL_READINESS |
| ZG-003 | P1 | ACCEPT — MITIGATED | Non-final event post-states retain prior revision; only the final post-state increments. A full alternative two-event state/event/batch vector closes the bytes. | SIMULATION, PERSISTENCE, Goal prompt |
| ZG-004 | P2 | ACCEPT — MITIGATED | Closed `CatchUpOperationReceipt`, idempotent begin, and exact-next atomic child/progress commit now define crash resume. | PERSISTENCE, 001, Goal prompt |
| ZG-005 | P2 | ACCEPT — MITIGATED | Goal status now states the external-blob approval precondition without requiring a post-confirmation self-edit. | Goal prompt |
| ZG-006 | P2 | ACCEPT — MITIGATED | Gate 0 reserves 165 operator minutes, leaving 75 minutes for T01+T03 low work inside M0's four-hour target. | Goal prompt, 001 |

## Review reconciliation

The frozen-state findings are accepted as historical critiques unless explicitly partial/rejected below. “ACCEPT — MITIGATED” means the finding is valid and the revised authority removes or blocks it; it does not mean a live P0 is tolerated. Every fix is blocking in the revised ExecPlan/Quality Bar.

| Finding | Severity | Disposition | Evidence/reasoning and required verification | Affected authorities |
|---|---|---|---|---|
| PR-001 | P1 | ACCEPT — MITIGATED | Gate B now uses 8 sessions, yoked control, a within-60-second second action and one of four exact branch-related reason tokens; recall alone cannot pass. | PRODUCT, QUALITY_BAR, EVALS |
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
| ER-002 | P0 | ACCEPT — MITIGATED | V1 now has no backup/export/import/replacement/upcaster route; unknown versions fail closed without mutation. This is stricter than the historical export-only fix. | PERSISTENCE, SECURITY, TESTING |
| ER-003 | P1 | ACCEPT — MITIGATED | Exact integer/rounding/text/JCS/SHA-256/xoshiro/stream/ID/hash boundaries and golden vectors are frozen. | SIMULATION |
| ER-004 | P1 | ACCEPT — MITIGATED | Durable accepted/rejected receipt and same-ID/different-fingerprint collision are atomic with head/events. | PERSISTENCE |
| ER-005 | P1 | ACCEPT — MITIGATED | Snapshot-after-base plus half-open range/zero-event case; one version; gaps/unknown versions fail. | PERSISTENCE, TESTING |
| ER-006 | P1 | ACCEPT — MITIGATED | One canonical causal enum; temporal/response separate; allegation is typed content. | SIMULATION, WORLD_MODEL, CHRONICLE |
| ER-007 | P1 | ACCEPT — MITIGATED | Noninterference covers context/catalog/errors/targets/explanations/public projection. | COGNITION, EVALS, SECURITY |
| ER-008 | P1 | ACCEPT — MITIGATED | Monotonic writer fencing token is checked on append/snapshot; stale-tab transfer test blocks. | PERSISTENCE |
| ER-009 | P1 | ACCEPT — MITIGATED | Product/visual kill gates and ugly loop precede full world; 52 planned + ≤8 fixes, hard 60. | 001 |
| ER-010 | P1 | ACCEPT — MITIGATED BY REMOVAL | No fictional provider-specific path or executable fake-adapter claim remains. Standard Brain is the complete path; hung/timeout/revoke/malformed/provider checks become blocking only if a real optional adapter is later proposed. | COGNITION, TESTING |
| ER-011 | P1 | ACCEPT — MITIGATED | 30/90/365 must reach exact terminal time under explicit time/event/storage caps; named desktop/mobile profiles. | SIMULATION, PERFORMANCE |
| ER-012 | P1 | ACCEPT — SUPERSEDED | The earlier Pixi-only mitigation was release-invalidated by the World Presence override. D-008 now selects one PlayCanvas/WebGL2 renderer and still forbids a mixed renderer stack. | FRONTEND, PERFORMANCE |
| ER-013 | P1 | ACCEPT — MITIGATED | Typed DecisionExplanation supplies reason codes/references/terms; authored justification is testimony, not fact. | COGNITION, AGENT_LIFE |
| DR-001 | P1 | ACCEPT — SUPERSEDED | Renderer authority is now unambiguously PlayCanvas plus the pure WorldPresentation boundary; Pixi is historical evidence only. | FRONTEND, PERFORMANCE |
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
| PP-009 | P1 | ACCEPT — MITIGATED | Local-device notice appears in first peek and before advice; storage failure precedes commitment; the absence of backup/export is explicit. | MOBILE, PERSISTENCE |
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
| FR-003 | P1 | ACCEPT — MITIGATED | Eighteen prerequisite/owner/evidence tasks total 40/52/65 after the six-person Gate 0 correction; productive labor sums across agents, eight hours remain contingency, and timed M0 forces re-estimation. | 001, COST_MODEL, Goal prompt |
| FR-004 | P1 | ACCEPT — MITIGATED | Six people see all six under a complete balanced Williams schedule with fixed content/timing, exact questions/rank/tie/abandonment rules and mock analyzer. | QUALITY_BAR, 001, Goal prompt |
| FR-005 | P1 | ACCEPT — MITIGATED | Mill is the single repair object across resource rule, visual cue, work order, scope and Chronicle; well remains only the water site. | ECONOMY, GAME_SYSTEMS, DESIGN, CHRONICLE, 001 |
| ZC-001 | P1 | ACCEPT — MITIGATED | Acceptance distinguishes permitted local preview asset requests from forbidden DNS/external egress and records HAR assertions. | Goal prompt, SECURITY, PERFORMANCE |
| ZC-002 | P1 | ACCEPT — MITIGATED | M1 is defined inline as first production durable protocol/simulation milestone; missing Gate 0 blocks all production packages/apps. | Goal prompt |
| ZC-003 | P1 | ACCEPT — MITIGATED | Exact eligibility/agreement, frozen manifests, seeds, assignments, scripts, anchors, rubrics and withdrawal handling now precommit every human gate. | Goal prompt, QUALITY_BAR, EVALS |
| ZC-004 | P1 | ACCEPT — MITIGATED | One build/profile/cache/run/mark/frame/gzip/egress procedure decides every performance budget. | PERFORMANCE, Goal prompt |
| ZC-005 | P1 | ACCEPT — MITIGATED | Voluntary informed participation, affirmative agreement, no PII/recording and withdrawal rights replace consent-free observation language. | Goal prompt, QUALITY_BAR, 001 |
| Z2-001 | P1 | ACCEPT — MITIGATED | Stable H/FAM/TRI/FAC/ECH/DIR IDs, six literal rows and H-specific scoring eliminate Gate 0 assignment ambiguity. | Goal prompt, QUALITY_BAR |
| Z2-002 | P1 | ACCEPT — MITIGATED | Gate B fixes descending rejection-sampled shuffle, missing-rating failure and branch-derived factual Card answers; the operational abstention card records `no-one`, not a fictional adviser. | Goal prompt, QUALITY_BAR |
| Z2-003 | P1 | ACCEPT — MITIGATED | Every hash domain has a typed field schema plus full independently reproduced preimage/digest/ID vectors; tests use a second encoder. | SIMULATION, Goal prompt |
| Z2-004 | P1 | ACCEPT — MITIGATED | Full viewer/purpose/label truth table defines subject matching and inclusive-grant/exclusive-revoke semantics; static oracle is separate from production. | WORLD_MODEL, Goal prompt |
| Z2-005 | P1 | ACCEPT — MITIGATED | Deny-by-default browser flags, route abort/log and Chromium netlog cover attempted DNS and non-HTTP egress; offline journey is required. | SECURITY, PERFORMANCE, Goal prompt |
| Z2-006 | P1 | ACCEPT — MITIGATED | One headed lockfile-pinned Playwright Chromium revision and complete app-bundle manifest own all numerical gates; the 52 KB launcher alone is insufficient, and physical browser evidence stays separate. | PERFORMANCE, Goal prompt |
| Z2-007 | P1 | ACCEPT — MITIGATED | Goal mode may commit policy/config only; GitHub API/settings/protection/Dependabot/push/PR mutations require separate operator authority. | TESTING, 001, Goal prompt |
| Z3-001 | P1 | PARTIALLY ACCEPT — PRESENTATION MITIGATED | The asserted 54-hour arithmetic double-counted one row: the 18 accepted expected estimates machine-sum to 52. Replacing the prose list with an ID table, total, row count and mandatory machine-sum removes that review ambiguity without relabeling or cutting work. | 001, Goal prompt |
| Z3-002 | P1 | ACCEPT — MITIGATED | Resume now requires a clean resume-only checkpoint commit whose `resume.json` names its first parent, avoiding a self-hashing current-HEAD field; any other collision stops for operator direction. | 001, Goal prompt |
| Z3-003 | P1 | ACCEPT — MITIGATED | Gate B fixes both condition timelines, prompt/rating administration, real-only behavioral counts, independent subsets, and diagnostic-only control counterparts. | QUALITY_BAR, 001, Goal prompt |
| Z3-004 | P1 | ACCEPT — MITIGATED | Gate A now freezes one application commit/seed/time across its cohort and reuses only Gate 0 questions/rubric, never its discarded build. | QUALITY_BAR, 001, Goal prompt |
| Z3-005 | P2 | ACCEPT — MITIGATED | Prompt status distinguishes dormant planning text from a future operator invocation that authorizes only the listed local actions and stops. | Goal prompt |
| Z3-006 | P2 | ACCEPT — MITIGATED | M0–M5 are minimum ordered non-coalescible runnable checkpoints with mandatory independent reviewer roles; extra checkpoints remain allowed. | 001, Goal prompt |
| Z3-007 | P2 | ACCEPT — MITIGATED | One Story Card branch is rejection-sampled from a framed seed and committed before viewer exposure; all five viewers receive that frozen card. | QUALITY_BAR, 001, Goal prompt |
| Z4-001 | P1 | ACCEPT — MITIGATED | Human results arrive through a bounded read-only external inbox; schema/hash/sign-off validation, evidence/labor and analysis commits, and a new resume-only checkpoint preserve the clean resume oracle. | QUALITY_BAR, 001, Goal prompt |
| Z4-002 | P1 | ACCEPT — MITIGATED | Exact `gate-0`, `gate-a`, `gate-b`, and `story-card` bytes plus independent zero-base seeds/order/branch vectors make every study derivation reproducible. | QUALITY_BAR, Goal prompt, SOURCE_LEDGER |
| Z4-003 | P1 | ACCEPT — MITIGATED | The prompt embeds closed P0–P3 definitions, mitigation/confirmation ownership and the no-waiver/reopen rule. | Goal prompt |
| Z4-004 | P1 | ACCEPT — MITIGATED | Gate 0 now requires H's unique rank win, 4/6 Yes on both binaries, and no alternative lead of two true responses; an all-zero mock must fail. | QUALITY_BAR, 001, Goal prompt |
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
| Z6-001 | P1 | ACCEPT — MITIGATED | Gate phases advance only on analyzer PASS; same-phase checkpoints and new-study retry loops retain every failed/void cohort, while Gate 0 product failure needs operator authority. | Goal prompt |
| Z6-002 | P1 | ACCEPT — MITIGATED | Evidence import uses an exclusive no-follow lock, O_EXCL destination, atomic ledger replacement, exact partial-state recovery, evidence/analysis commits and no-op duplicate rule. | Goal prompt |
| Z6-003 | P1 | ACCEPT — MITIGATED | Manifest fields/types, artifact paths/raw hashes, timers/questions/anchors, assignment and participant cardinality/order, per-gate maps, validator and byte budgets are closed. | Goal prompt |
| Z6-004 | P1 | ACCEPT — MITIGATED | Gate B evidence now uses P01–P08 exactly like the frozen shuffle/vector. | Goal prompt |
| Z6-005 | P1 | ACCEPT — MITIGATED | Replay is a literal post-consequence diagnostic question; only Desirable/Continue drive the floor, and consequence time resets at confirmation. | QUALITY_BAR, Goal prompt |
| Z6-006 | P1 | ACCEPT — MITIGATED | Both Gate B conditions assert full ready frames and inherit focus/navigation/reload/pause/no-restart failure rules. | QUALITY_BAR, Goal prompt |
| Z6-007 | P1 | ACCEPT — MITIGATED | Unique append-only integer-second work segments cover coordinator/child/reviewer/operator labor, parallel work sums, and global/M0 remaining budgets block the next action. | 001, Goal prompt |
| Z6-008 | P1 | ACCEPT — MITIGATED | Goal invocation requires the exact already-installed Chromium path/version/SHA and stops rather than downloading on mismatch. | PERFORMANCE, PROPOSED_TOOLS, Goal prompt |
| Z6-009 | P1 | ACCEPT — MITIGATED | Navigation timing origin, visibility timing seed/order/warmup/analyzer, raw retention and changed-commit-only reruns make performance/security results reproducible. | COGNITION, PERFORMANCE, TESTING, Goal prompt |
| Z6-010 | P2 | ACCEPT — MITIGATED | Human text/file byte budgets, test-only synthetic PLAN_BASE label, `gzip -9 -n`, and an explicit transitive license allow/block policy close the bounded review caveats. | PERFORMANCE, Goal prompt |
| Z7-001 | P1 | ACCEPT — MITIGATED | The import mutex now resolves through the linked worktree's absolute Git path and uses exact no-follow/exclusive, fsynced lock bytes. | Goal prompt |
| Z7-002 | P1 | ACCEPT — MITIGATED | Every reachable import/analysis/living-plan/resume/checkpoint partial state has an exact byte/parent/diff recovery rule; the final stale lock is removed only after chain validation. | Goal prompt |
| Z7-003 | P1 | ACCEPT — MITIGATED | Canonical per-gate script/question/anchor JSON and exact criterion-key/scoring semantics close the study/analyzer bytes. | Goal prompt |
| Z7-004 | P1 | ACCEPT — MITIGATED | Raw double clock comparisons, ceiling conversion, first-frame ranges and timer-overrun failures make integer evidence deterministic. | QUALITY_BAR, Goal prompt |
| Z7-005 | P1 | ACCEPT — MITIGATED | Observation notes are explicitly nullable and unavailable abandoned values remain schema-valid failures/zeroes. | Goal prompt |
| Z7-006 | P1 | ACCEPT — MITIGATED | All six milestone ceilings and the Gate 0/A/B/card-to-task map now control every operator segment and manifest cap. | 001, Goal prompt |
| Z7-007 | P1 | ACCEPT — MITIGATED | The prompt embeds immutable plan base `f0ec6a1e34a74d117de84c094286ec703ca7f15f`, requires its local ancestry/object and authorizes no fetch. | Goal prompt |
| Z7-008 | P1 | ACCEPT — MITIGATED | Exact inert planning evidence freezes all 195 transitive versions, integrities, licenses and lifecycle scripts; implementation validates graph equality before installation. | DEPENDENCY_COHORT, Goal prompt, SOURCE_LEDGER |
| Z8-001 | P1 | ACCEPT — MITIGATED | Participant scripts use opaque presentations; treatment and real/control IDs remain hidden instrumentation only. | Goal prompt |
| Z8-002 | P1 | ACCEPT — MITIGATED | Gate B fixes one exact seven-slot order, including the conditional second-action reason and null-on-timeout behavior. | Goal prompt, QUALITY_BAR |
| Z8-003 | P1 | ACCEPT — MITIGATED | Gate 0 defines the complete fixed 225-second slot, timeout priority, immediate-answer lock, reveal/view/Replay/reset/padding sequence. | Goal prompt, QUALITY_BAR |
| Z8-004 | P1 | ACCEPT — MITIGATED | Synthetic and operational study vectors list the independently reproduced seeds, row map, shuffle draws/order and Story Card selection. | Goal prompt |
| Z8-005 | P1 | ACCEPT — MITIGATED | Participant records equate only `record.assignment` with the manifest assignment and independently require top-level ID/role equality. | Goal prompt |
| Z8-006 | P1 | ACCEPT — MITIGATED | Any Gate 0 withdrawal or skipped presentation fails structural completeness; partial raw evidence remains without replacement. | Goal prompt, QUALITY_BAR |
| Z8-007 | P1 | ACCEPT — MITIGATED | Gate 0 percentage-point logic uses fixed-denominator integer counts, never binary floating-point subtraction. | Goal prompt, QUALITY_BAR |
| Z8-008 | P1 | ACCEPT — MITIGATED | A failed analysis creates an immediate remediation checkpoint, prohibits another source, and requires fix/new A/new S/confirmation before renewal. | Goal prompt |
| Z8-009 | P1 | ACCEPT — MITIGATED | Deterministic temps, exact target bundles and enumerated Git states make interrupted import/living-plan/resume writes recoverable. | Goal prompt |
| Z8-010 | P1 | ACCEPT — MITIGATED | Milestone amounts are targets; one exact 28,800-second fix/confirmation pool, reservations and ceiling rules make hours 53–60 reachable only for fixes. | 001, Goal prompt |
| Z8-011 | P1 | ACCEPT — MITIGATED | Every canonical install uses `--ignore-scripts` and committed pnpm configuration; frozen lifecycle metadata remains review evidence. | Goal prompt, DEPENDENCY_COHORT |
| Z8-012 | P1 | ACCEPT — MITIGATED | Payloads use literal bytes; timing fixes warmup/order, nearest-rank p50/p95 and absolute pair differences. | PERFORMANCE, Goal prompt |
| Z8-013 | P1 | ACCEPT — MITIGATED | One finite numeric table bounds commands, text, contexts, plans, retries, batches, snapshots, catch-up, storage and horizon runs; backup/export/import routes are absent. | Goal prompt, SECURITY |
| Z8-014 | P1 | ACCEPT — MITIGATED | JSON counters use safe nonnegative integers through `Number.MAX_SAFE_INTEGER`; conserved values/scores/counts have exact signed/unsigned ranges and fail on overflow. | Goal prompt, SIMULATION |
| Z9-001 | P1 | ACCEPT — MITIGATED | Every import target records exact predecessor and target bytes/hashes and permits atomic rename-over-predecessor plus idempotent completion. | Goal prompt |
| Z9-002 | P1 | ACCEPT — MITIGATED | A validated import lock atomically renames to a deterministic cleanup tombstone whose exact deletion suffixes are resumable. | Goal prompt |
| Z9-003 | P1 | ACCEPT — MITIGATED | Recovery names every literal repository-relative path and closed property; Base64 is padded standard-alphabet RFC 4648. | Goal prompt |
| Z9-004 | P1 | ACCEPT — MITIGATED | GitHub mutation/settings calls remain prohibited while the named unauthenticated public-advisory GET is expressly allowed. | Goal prompt |
| Z9-005 | P1 | ACCEPT — MITIGATED | Operator evidence contains raw opaque responses only; exact receipt-derived keys score ordinal presentations before hidden treatment mapping, with no subjective field. | Goal prompt, QUALITY_BAR, 001 |
| Z9-006 | P1 | ACCEPT — MITIGATED | Gate 0 now uses six people and all six balanced Williams rows; position and first-order predecessor balance are independently checked. | Goal prompt, QUALITY_BAR, 001 |
| Z10-001 | P1 | ACCEPT — MITIGATED | Every objective prompt has a fixed token/label/cardinality set and a deterministic per-participant order in the manifest, with independently reproduced shuffle sentinels. | Goal prompt, QUALITY_BAR |
| Z10-002 | P1 | ACCEPT — MITIGATED | Gate 0 fixes all six chooser/authority/continuity treatments; Gate B fixes the exact three-row state-insensitive control and its typed branch vectors before enrollment. | Goal prompt, QUALITY_BAR, 001 |
| Z10-003 | P1 | ACCEPT — MITIGATED | Closed per-attempt protocol status/invalidation reason preserves raw answers, distinguishes withdrawal, requires valid timers and deterministically fails/noncontributes by gate. | Goal prompt, QUALITY_BAR, 001 |
| Z10-004 | P1 | ACCEPT — MITIGATED | Story Card reserves exactly 60 T15 minutes before Gate B reserves exactly 240; neither study freezes unless the complete 300-minute allocation exists. | Goal prompt, 001 |
| Z10-005 | P1 | ACCEPT — MITIGATED | Evidence destination hash and decoded bytes must equal the exact signed inbox source before locking, after normalization and during full-chain validation. | Goal prompt |
| Z10-006 | P1 | ACCEPT — MITIGATED | A canonical gate-surface oracle binds accepted human evidence to every later integration and final runnable HEAD; mismatches cannot integrate or inherit historical PASS. | Goal prompt, QUALITY_BAR, 001 |
| Z11-001 | P0 | ACCEPT — MITIGATED | Story Card headings/adviser/direct-cause answers are branch-derived; the operational abstention card says no advice was given, Mara followed her plan and ledger uncertainty remained. | CHRONICLE, Goal prompt, QUALITY_BAR |
| Z11-002 | P1 | ACCEPT — MITIGATED | Gate 0 builds both disposable surfaces before exposure and imports one combined eleven-record cohort; no partial product evidence or post-exposure instrument change is authorized. | Goal prompt, 001, QUALITY_BAR |
| Z11-003 | P1 | ACCEPT — MITIGATED | Gate B records use one literal flat key set; both ordinals always freeze every option order, including conditional second-action reason. | Goal prompt |
| Z11-004 | P1 | ACCEPT — MITIGATED | Every Gate 0 product/observer, Gate A observer, Gate B condition and Story Card attempt now has one exact durable-response terminal event for invalidation. | Goal prompt, QUALITY_BAR |
| Z11-005 | P1 | ACCEPT — MITIGATED | Full fixed operator caps use one integer global/milestone/open-reservation/protected-high-estimate formula; a smaller coordinator-chosen cap cannot freeze. | Goal prompt, 001 |
| Z11-006 | P1 | ACCEPT — MITIGATED | Recovery state 6 admits, verifies, renames/fsyncs or removes the exact Recovery-B temp and rejects every other entry. | Goal prompt |
| Z11-007 | P1 | ACCEPT — MITIGATED | Browser identity covers the complete 326-file/five-symlink app bundle and framework hash, independently reproduced in Node/Ruby; the launcher hash alone cannot pass. | Goal prompt, PERFORMANCE, PROPOSED_TOOLS |
| Z12-001 | P1 | ACCEPT — MITIGATED | The four-person family comparator selects a unique 2–1–1 plurality; a 2–2 split uses Mara's member of the tied pair and only an exact Mara score tie reaches fixed action order. | Goal prompt, QUALITY_BAR |
| Z12-002 | P1 | ACCEPT — MITIGATED | Every manifest stores the lowercase 64-hex seed; option-order PRNG seeding consumes exactly its decoded 32 bytes, with Story Card bound to `cardSeed`. | Goal prompt |

All P0/P1 findings have an authority-level mitigation; none is accepted as a live condition. The targeted cross-discipline confirmation passed FR-001 through FR-006 at `94f3acd`. A fresh full Goal-prompt audit found Z12-001/002 against the prior blob; the final corrective confirmation passed exact commit `4cf18d7ed0f40009551df63be356e59b7aeeda6e`, blob `ba01b70c244dbf5f1b0f4bdacd86b473f8172cba`, with no residual or new P0/P1. The immutable trail is in [GOAL_PROMPT_REVIEW](../reviews/GOAL_PROMPT_REVIEW.md).
