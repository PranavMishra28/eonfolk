# 002 — Founder Alpha

**Purpose:** turn the verified local Riverhold proof into a polished, diagnosable, shareable Founder Alpha without weakening Reality authority or inventing human evidence.

**Status:** RELEASE CANDIDATE — World-as-Product exact-YES confirmation passed with zero P0/P1; clean DEEP, protected mega-PR CI, merge, and cleanup pending

**Authority boundary:** this is the sole living execution log for Founder Alpha scope, progress, evidence, deviations, review findings, and completion. Product and technical semantics remain with the authorities mapped by [INDEX](../../INDEX.md); [PLANS](../PLANS.md) owns maintenance rules.

**Related documents:** [product](../../product/PRODUCT.md), [human loop](../../product/HUMAN_LOOP.md), [Chronicle](../../product/CHRONICLE.md), [Observatory](../../product/OBSERVATORY.md), [architecture](../../engineering/ARCHITECTURE.md), [security](../../engineering/SECURITY.md), [testing](../../quality/TESTING.md), and [completed 001](../completed/001-foundation.md).

## Outcome and release claim

Ship one account-free, local-first Founder Alpha in which an unfamiliar tester can follow Mara, inspect Riverhold, advise **or abstain**, observe her independent interpretation and a branch-specific consequence, leave and return through controlled catch-up, understand the factual Chronicle, take the outcome-dependent second action, inspect safe provenance, create a shareable Story Card, and submit in-product feedback with bounded diagnostics.

The release may claim a technically verified Founder Alpha. It may not claim fun, attachment, retention, human comprehension, public reliability, model superiority, or successful distribution unless the corresponding measured human protocol actually runs. Human Gate 0/A/B and Story Card evidence starts **NOT RUN**.

## Binding constraints and non-goals

- One solo builder; reuse the current proof and resist generalized systems.
- MacBook M4 Pro; no owned GPU, training, fine-tuning, model weights in Git, or required model download.
- Approximately $0; incur no cost, request no paid capability, and deploy nothing without explicit approval.
- V1 remains free, accountless, and useful with Standard Brain alone.
- No payments, revenue operations, custody, licensing business, regulated data, proprietary dataset, required partnership, or enterprise motion.
- No public canonical writes, multiplayer, generalized economy/governance, fork executor, unrestricted dialogue, analytics SDK, hidden chain-of-thought, or client GitHub credential.
- One integration branch: `feat/002-founder-alpha`.
- One mega PR to `main`: `Founder Alpha: observability, feedback, cognition, polish, and release hardening`.
- Acceptance criteria, not elapsed time, stop the run. Scope is cut before authority or evidence quality is weakened.

## Start-state freeze

| Item | Recorded result |
|---|---|
| Start commit | `74a8a7e07d0743f467dd9547ebf4193eb53d6029` |
| Start branch | protected `main`, clean and equal to `origin/main` |
| GitHub state | `PranavMishra28/eonfolk`; default `main`; corrected and reverified **PRIVATE** on 2026-08-21 |
| Open pull requests/issues | none / none |
| Competing coordinator | none found in agents, Git worktrees, branches, or repository processes |
| Required checks | strict `Verify`, `Formal model`, `Secret scan`; admins enforced; force-push/deletion blocked |
| Native vulnerability alerts | disabled; do not claim coverage |
| Exact baseline | `TLA2TOOLS_JAR=/tmp/eonfolk-tla-official-523952485/tla2tools.jar pnpm verify` passed at start SHA |
| Baseline details | 63 unit, 2 property, real IndexedDB reload, fixed timing analyzer, build/budgets/audit, 8 headed browser journeys, zero external egress, 3,480/350-state bounded TLC pass |
| TLC artifact | SHA-256 `eabd140a70f49eb9305a3bd3f3df944eddf87e5a90d329789085f8953a80533a` |

Privacy was a genuine P0 at intake: the API reported `PUBLIC`. The coordinator changed it to private immediately and verified the authoritative API result before creating this branch.

## Authority and conceptual invariants

Preserve these layers in names, boundaries, tests, and explanations:

1. **WORLD** — the consumer experience.
2. **REALITY** — typed canonical state and events; the only layer that mutates Reality.
3. **EPISTEMICS** — observations, sourced knowledge, beliefs, claims, memories, and visibility.
4. **TRUTH** — authorized factual projections derived from Reality; never a new ledger.
5. **BRAIN** — untrusted bounded proposals and deterministic Standard Brain.
6. **CHRONICLE** — causal presentation from authoritative evidence.
7. **EXPERIMENT** — immutable manifests and reproducible comparisons, never reducer input.
8. **OBSERVATORY** — safe read-only inspection and research projections.

Diagnostics, feedback, model proposals, ontology projection, replay capture, and observer tools cannot write canonical world state. No `Truth Ledger` may be introduced.

## Workstreams and ownership

The coordinator owns integration and shared authorities. Specialist work uses isolated worktrees under `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/002-<slug>`, one explicit allowlist, no nested delegation, one clean commit, and no direct push. Before cherry-pick the coordinator checks ancestry, changed files, actual diff, dependencies/licenses, secrets, tests, citations, and constraint fit.

Planned bounded streams are:

1. current primary-source dependency and platform research;
2. diagnostics protocol, recorder, redaction, fingerprint, health, and Sentinel;
3. local observer and incident/reproduction tooling;
4. feedback UI and deploy-ready least-authority relay seam;
5. Founder Alpha product flow, Story Card, provenance, and visual polish;
6. Planner Brain, BrainPort, experiments, and optional model seam;
7. ontology projection with JSON-LD/PROV-O/SHACL boundary;
8. verification lattice, property/fuzz/mutation/formal analysis;
9. performance, accessibility, browser/device, privacy, and security evidence;
10. independent product, systems, visual, cognition, security/privacy, and release reviews.

Only non-overlapping streams run concurrently. Shared-ledger and decision updates are coordinator-only.

## Milestones and acceptance

### M0 — Baseline, research, and contracts

Outcome: the exact starting system and current external choices are evidenced before dependencies or architecture change.

Included:

- primary-source review of current Codex orchestration, GitHub private-repository controls, Cloudflare Worker/D1/R2/Turnstile, rrweb 2.x scoped packages, MCP security, PixiJS, PlayCanvas React/WebGL2, recast-navigation-js, candidate CC0 assets, MLX, llama.cpp, RDF 1.2/JSON-LD/PROV-O/SHACL, TLC, and every changed dependency;
- EONFOLK skill lock entries for any agent skill treated as a code dependency;
- bounded keep/reject decisions for rrweb, Cloudflare feedback relay, Planner Brain, search, model seam, ontology projection, mutation testing, and formal expansion;
- threat model and data inventory before feedback/diagnostics implementation.

Done when current claims have dated primary evidence, proposed dependencies have exact version/license/install-script/transitive review, and rejected options have explicit reasons.

### M1 — Flight Recorder and Sentinel

Outcome: failures become actionable without collecting secrets, hidden reasoning, or unbounded session history.

Implement a focused diagnostics package with typed protocol, bounded ring buffer, recorder, redaction, stable fingerprinting, incident bundle, health projection, and Sentinel invariant handling. Record structured boundary events for command request/validation/commit/publish, worker lifecycle, persistence load/save/replay/fence, cognition proposal/validation/fallback, Chronicle projection, browser route/network errors, UI state transitions, and measured performance marks.

Required behavior:

- modes are `OFF`/core, `LOCAL`, and `ALPHA`; normal gameplay never depends on diagnostics;
- `pnpm dev:observe` and `pnpm diagnose` work locally;
- memory/storage are bounded and deterministic where required;
- source-side redaction precedes storage, replay capture, UI, upload, or issue formatting;
- no prompt, raw private state, full hash preimage, credential, URL secret, arbitrary body, or hidden chain-of-thought is captured;
- Sentinel detects a violated runtime invariant, freezes the relevant bounded window, creates an incident, protects Reality, attempts only typed bounded recovery, and shows a calm safe message plus reproduction ID;
- replay/session capture is optional and subordinate to structured diagnostics. If retained, rrweb history is source-masked, bounded to 60–120 seconds, frozen only on incident/feedback/explicit opt-in, and never authoritative.

Done when injected failures prove no partial canonical mutation, incident dedup is stable, bounds/redaction tests pass, diagnostics OFF overhead is measured, and application operation continues with recording unavailable.

### M2 — Read-only observer and feedback

Outcome: a founder can inspect and reproduce problems, and an Alpha tester can report one safely from inside the product.

The local observer exposes only health, incidents, session summary, typed trace, performance, network summary, reproduction recipe, artifact inventory, and a bounded world-head summary. It is read-only, local-only by default, capability-scoped, and cannot expose raw Reality, cognitive records, arbitrary files, shell, browser control, or mutation commands.

Feedback includes category, bounded text, optional sanitized screenshot, diagnostics consent, exact attachment preview, clear local/upload state, retry, and deletion of queued local material. No GitHub credential enters the browser.

Preferred hosted seam, only if current research supports it: a minimal Cloudflare Worker with D1, R2 only for bounded attachments, Turnstile where useful, and a server-side GitHub App scoped to Metadata read and Issues write. The relay has zero game authority, strict MIME/byte/count/schema/origin/rate/quota/retention controls, incident fingerprint create-or-update semantics, and no arbitrary repository selection. With no credentials or deployment approval, deliver only tested local preview plus deploy-ready configuration and an exact manual setup guide—never a fabricated public URL.

Done when local success/failure/offline/outage/retry/dedup paths work, attachment redaction and rejection are tested, and the world remains playable with the entire feedback path unavailable.

### M3 — Founder Alpha product and visual polish

Outcome: the complete Mara loop is immediately legible, emotionally coherent, and shareable across required viewports.

Preserve Living Woodcut's material/Chronicle grammar while implementing the binding embodied low-poly World Presence override. Improve hierarchy, citizen/action readability, relationship change, Chronicle flow, return tension, second-action clarity, Story Card framing, safe provenance display, mobile composition, empty/loading/failure states, focus, copy feedback, and reduced-motion behavior. Avoid dashboard smell and generic AI styling.

Browser-visible acceptance covers:

- first launch and **Follow Mara** in under 60 seconds;
- investigation and visible two-citizen interaction;
- each of verify privately, accuse now, and abstain;
- visibly distinct interpretation/consequence/return options;
- controlled leave, reload, catch-up, Chronicle, replay, second action, evidence/provenance, Story Card, and feedback;
- desktop 1728×1117, laptop 1366×768, mobile 390×844, 200% text, keyboard only, reduced motion, and semantic fallback;
- multi-tab fencing, worker/persistence failure, no-Worker failure, offline/network outage, denied clipboard, and unavailable diagnostics/feedback.

A passing build or backend suite cannot substitute for actual local play and visual evidence.

### M3W — Release-blocking World Presence rearchitecture

Outcome: Riverhold is an embodied physical settlement whose visible people, locomotion, work, interaction, and props project Reality without becoming authority.

Required implementation:

- adopt PlayCanvas React/WebGL2 after a bounded Pixi comparison unless a material blocker appears;
- add pure `WorldPresentation`/`SpatialProjection` contracts with canonical source/action/timing/origin/destination/target/result references;
- use deterministic fixed-step authored paths, work/rendezvous/interaction slots, blocked volumes, and no ordinary teleport; defer Recast unless the authored graph fails a concrete gate route;
- render eight recognizable full-limbed humanoids, including a distinctive Mara, with idle/walk/carry/gather/inspect/talk/listen/exchange/repair/eat-rest/reaction states;
- visibly stage water, grain, logs, trade goods, tools, a paired interaction, and explicitly cosmetic environmental motion;
- keep the world dominant and preserve fully playable semantic DOM, keyboard, reduced-motion, renderer-loss, mobile, and weak-device behavior;
- instrument aggregate presentation source/clock/action/mismatch evidence through Flight Recorder; and
- add deterministic unit and browser temporal tests for movement, class coverage, canonical links, continuity, blocked geometry, mismatch injection, containment, and WebGL2.

World Presence Gate:

1. In ten seconds an unfamiliar observer recognizes a physical settlement, recognizable humans, multiple activities, and one meaningful interaction/process without opening a dashboard.
2. In thirty seconds the observer can describe several visible tasks.
3. Fresh desktop/laptop/mobile performance evidence passes unchanged budgets.
4. Semantic list view exposes equivalent facts and all consequential actions.
5. An independent visual/product reviewer answers **YES** to “Does Riverhold visibly feel inhabited and alive?”

Current progress:

- [x] PlayCanvas/Recast/spatial and CC0 asset spikes researched and coordinator-inspected.
- [x] PlayCanvas adopted; Recast deferred to a measured route-complexity trigger.
- [x] Pure spatial package, canonical action window/origin/destination/target/result seam, authored graph, fixed clock, animation pose graph, mismatch inspector, and Flight Recorder category implemented.
- [x] Procedural settlement, eight articulated citizens, paired opening interaction, props, distinctive Mara, cosmetic river motion, lazy renderer, host containment/pixel-ratio cap, and semantic fallback implemented.
- [x] Unit and production-browser temporal regressions pass; exact clean commit `593e5ab` fits unchanged payload limits and passes all fifteen unchanged-production journeys, cohort, audit, and zero-egress checks [S-WP-022].
- [ ] Rerun the canonical three-profile 15-run performance/egress battery from a clean candidate.
- [ ] Capture exact desktop/laptop/mobile evidence and complete the independent inhabited/alive review.
- [ ] Reconcile any P0/P1, rerun the relevant gate, and include the result in the final release review.

No PR or merge may occur while any unchecked World Presence item remains.

### M3P — Release-blocking World-as-Product correction

Outcome: Riverhold reads as a continuous inhabited place whose visible consequential actions correspond to Reality, rather than as a simulation visualization, small board, or dashboard wrapped around a renderer.

The operator attachment with SHA-256 `21ca7da6f308cbd01510409707760bc7f36fd9e3c08c0a7a681044601e49a863` supersedes only the product/presentation target. It preserves all valid Reality, protocol, persistence, cognition, Chronicle, diagnostics, formal, verification, and Founder Alpha work. It invalidates `593e5ab` as a release presentation without erasing its historical evidence.

Required implementation and evidence:

- audit and use a coherent metre-scale world with believable citizens, doors, buildings, roads, trees, workplaces, river, forest, homes, market, mill, storage, well, civic place, unused land, and authored boundary concealment;
- implement pan/drag, wheel/pinch zoom, bounded orbit, selection/focus, Follow Mara, and return-to-overview across region, town/activity, and citizen/follow semantic scales;
- add an explicit World → Region → Cell → Place → entity presentation hierarchy and LOD0–LOD3 residency/visibility decisions that never affect Reality;
- represent entrances, interaction/work/storage/rendezvous/resource points, destinations, semantic travel, carried resources, and targets without canonical footsteps;
- derive meaningful movement, work, exchange, conversation, repair, props, and physical consequences from canonical events or current deterministic behavior, with cosmetic ambience clearly separate;
- make the world the normal 80–90% perceptual surface after onboarding, replace the permanent rail with contextual overlays/sheets, and provide selection-first citizen/place/resource detail;
- separate World, Human explanation, and deliberate Research evidence depths through bounded player and research lenses;
- link important Chronicle beats back to relevant people/places and bounded replay focus;
- retain the fully playable semantic DOM, keyboard, reduced-motion, weak-device, renderer-loss, mobile-sheet, and human-language paths;
- extend ten-second deterministic Living World checks to travel, task stages, action/prop/target correspondence, occupancy, stuck/mismatch detection, zoom/pause/reload recovery, and rendering-independence; and
- research the named city/villager simulations plus current PlayCanvas, navigation, culling/loading/instancing, and animation materials before freezing the implementation.

Release requires all nineteen acceptance items in the override, fresh three-viewport performance/accessibility evidence under explicit budgets, the unfamiliar-observer ten/thirty-second and Mara protocols, and an independent reviewer answering exactly **YES** to: “Does this feel like watching real inhabitants of a place, rather than looking at a visualization of a simulation?” Anything else is P1 and blocks the mega PR.

Current progress:

- [x] Override read in full, content hash verified, prior release target invalidated, existing systems preserved.
- [x] Current primary-source research integrated and source-ledger rows verified.
- [x] Metre-scale world hierarchy, camera, semantic zoom/LOD, spatial affordances, truthful choreography, and world-first UI implemented through `3477f79`.
- [x] Unit and focused production-browser temporal, spatial, camera, direct-selection, Chronicle-focus, accessibility, and rendering-independence gates pass: 182/182 unit tests, 2/2 property tests, and the targeted embodied/direct-selection/mobile journeys are green.
- [ ] Fresh desktop/laptop/mobile canonical 15-run performance evidence captured from one frozen clean candidate. The exact mobile qualification repair has one-repetition diagnostic evidence only.
- [x] Fresh independent exact-YES review. Frozen `90c0ad2` received exact **YES** with zero P0/P1 after `17b2a3d` exposed and `4c205e2` repaired the opening-lifetime failure. Human World Presence remains `NOT RUN` under the operator implementation override and may not be relabeled.
- [x] All World-as-Product P0/P1 findings reconciled and the one permitted post-fix targeted confirmation passed.

No PR or merge may occur while any M3P item remains unchecked.

### M4 — Cognition and experiment seams

Outcome: richer deterministic planning can be compared without making a model foundational or weakening authority.

- Keep Standard Brain complete and the default.
- Preserve provider-neutral `BrainPort`; every brain emits one known typed proposal that validation may reject.
- Implement a bounded deterministic Planner Brain using HTN/GOAP-equivalent search only if a frozen benchmark demonstrates meaningfully better plan coherence or branch diversity inside the runtime budget.
- Add bounded belief-aware MCTS/POMCP only if the Planner benchmark identifies a concrete gap and a tiny controlled search beats the simpler planner; otherwise record rejection.
- Define a local open/open-weight Model Brain seam after current MLX/llama.cpp research, but do not commit weights, require a model, auto-download, train, or make network calls. Model output remains untrusted proposal data.
- Store immutable experiment manifests and compare brains using fixed initial state, seed, visible context, budgets, versions, outcomes, invariant results, and cost/latency. Experiment records never enter Reality.
- Add a read-only ontology projection seam capable of JSON-LD/PROV-O-shaped output and SHACL-like validation without making RDF canonical or a reducer dependency.

Done when Standard Brain-only product behavior remains complete, planner/model absence and malformed/failure routes fall back safely, hidden facts stay isolated, replay never reruns cognition, and benchmark/eval claims are reproducible.

### M5 — Verification lattice and release evidence

Outcome: one command per lattice tier yields proportionate, honest evidence.

- **FAST:** formatting/lint/typecheck, focused unit/contract tests, architecture/docs checks.
- **PR:** FAST plus full unit, deterministic replay, property/model smoke, IndexedDB, timing, production build/budgets/audit, critical headed browser journeys, diagnostic/feedback security checks, and bounded formal model.
- **DEEP:** larger fuzz/property corpus, 30/90/365-day horizons, repeated performance profiles, full browser matrix, mutation testing of high-risk validation/reducer/persistence/Sentinel logic, extended network/privacy checks, and cognition experiments where applicable.

Direct falsification tests target every claimed invariant. Mutation analysis is targeted and thresholded only for code whose surviving mutants would undermine Reality authority, persistence, redaction, Sentinel, or feedback authorization. Extend TLA+ only where the new incident/feedback/cognition design adds a small state machine whose safety is not more clearly proven by executable property tests.

Performance evidence reruns after visual/diagnostic integration. Existing OFF budgets cannot silently weaken. LOCAL and ALPHA get explicit CPU, memory, storage, bundle, and upload budgets. Physical mobile remains **NOT RUN** unless a real device protocol is executed; emulation is labeled honestly.

### M6 — Frozen independent review and repair

Freeze one candidate SHA. Fresh reviewers inspect that identical state without seeing other reviews:

1. product/game and complete player journey;
2. systems/correctness/determinism/persistence;
3. visual/accessibility/responsive experience;
4. cognition/evals/experiment/ontology boundaries;
5. security/privacy/diagnostic/feedback threat surface;
6. CI/release/evidence/reproducibility.

Every P0/P1 is accepted, partially accepted, or rejected with evidence. Accepted findings receive the smallest fix and direct regression. Then a fresh targeted confirmation inspects only repaired claims. Failures and NOT RUN human gates remain preserved.

### M7 — Mega PR, merge, and cleanup

Before opening the PR:

- full `main...HEAD` diff, dependencies, licenses, install scripts, generated artifacts, credentials, large files, and authority contradictions inspected;
- `pnpm verify` and the complete DEEP acceptance command pass from a clean tree;
- release candidate is locally played and browser-reviewed;
- `FOUNDER_ALPHA_HANDOFF.md` records exact commands/results, known limits, setup, operations, diagnostics/privacy behavior, and human gates;
- repository is private and remote settings are re-probed.

Open or reuse exactly one PR from `feat/002-founder-alpha` to `main` with the required title. Observe all required checks green. Merge only after review closure and user-authorized acceptance. Then fetch/prune, delete the merged integration branch locally/remotely, remove all 002 worktrees and stale merged remote branches, retain immutable evidence tags where useful, enable delete-on-merge if appropriate, and verify one clean `main` equal to `origin/main`.

## Verification commands

Commands are maintained as scripts rather than prose-only promises. The intended final surface is:

```sh
pnpm verify:fast
pnpm verify:pr
pnpm verify:deep
TLA2TOOLS_JAR=/absolute/reviewed/tla2tools.jar pnpm verify
pnpm dev:observe
pnpm diagnose
pnpm test:e2e
pnpm test:performance
pnpm test:mutation
pnpm security:audit
```

Exact availability and results are recorded below as implementation lands. A named command that is intentionally rejected is removed rather than left as a dead promise.

## Progress log

- 2026-08-21 — Intake audited. Exact start `74a8a7e`; clean `main`; no open PR/issues; no competing coordinator/worktree. GitHub unexpectedly reported the repository public. Coordinator corrected it to private and verified `isPrivate:true` before implementation.
- 2026-08-21 — Baseline `pnpm verify` passed with the reviewed official TLC jar hash recorded above. Biome emitted one non-blocking deprecation notice for `linter.recommended`; record for maintenance.
- 2026-08-21 — Created the only integration branch `feat/002-founder-alpha`; moved completed 001 history out of the active plan directory.
- 2026-08-21 — Integrated first-party diagnostics (`64ade02`, `625869c`) and local-only feedback (`cdd2a84`). Local observer smoke returned a bounded healthy world-head projection; typecheck, 73 unit tests, build/budgets, nine headed journeys, and zero-egress netlog passed at the feedback checkpoint.
- 2026-08-21 — Three isolated research streams completed against explicit one-file allowlists and were inspected before integration: diagnostics `ea91c83`, cognition `88e4176`, and platform `23eb6c8`. Coordinator normalized 49 dated source rows into the shared ledger.
- 2026-08-21 — Integrated the bounded local observer, safe local feedback flow, Sentinel hardening, native performance summaries, targeted mutation lattice, relay core/providers, cognition experiment seams, 64-case cognition smoke corpus, authorized Observatory projection, conditional CI evidence, and release contract through `20c4fd8`. No deployment, credential, model, training path, telemetry SDK, or paid action entered the tree.
- 2026-08-21 — A coordinator-operated production preview completed the full Mara abstention path through return, branch-specific second action, factual Chronicle, Story Card, provenance, and feedback controls with zero console errors/warnings and no non-static network request. This is local technical browser evidence, not an unfamiliar-human Gate 0/A/B/Card result.
- 2026-08-21 — World-as-Product integration replaced invented cyclic bustle with Reality-owned affordance reservations and semantic travel; bound the renderer to the metre-scale manifest; added a 250×210 m bounded region, semantic three-band camera/LOD/residency, direct citizen/place selection, mobile sheets, Chronicle spatial focus, one-shot committed exchange transfer, and automated Living World truth checks. Screenshot inspection then closed the default dashboard lens and moved first arrival to the primary town scale. Human observer evidence remains `NOT RUN`.
- 2026-08-21 — Clean source-level diagnostics profiling passed every record-call and ring ceiling in OFF/LOCAL/ALPHA. The source harness explicitly does not claim browser-frame, input, display, heap, upload, thermal, or physical-device results; the physical-device record remains `NOT_RUN`.
- 2026-08-21 — The cognition smoke-corpus descriptor hash is `cb1713b932e1a848a264ac3fcf7788b42ce281a17306887ebf39e2beeb965596`: its generated 64 cases detected no illegal or nondeterministic Standard Brain proposal across five repetitions. This is not the future frozen canonical corpus, and it does not derive hidden-pair equivalence or scenario-goal completion from authoritative terminal world state. Planner disposition is `defer-no-candidate`; no Planner or model runtime ships and no goal-completion claim is made.
- 2026-08-21 — Confirmation repair binds each experiment manifest to an ordered context/seed/repetition execution plan and accepts only in-order per-execution proposal/output/terminal-vector hashes, latency, and invariant evidence. Completed-run, invocation, and success counts are derived by the journal; incomplete, duplicate, reordered, extraneous, mismatched, tampered, failed-invariant, and otherwise unsuccessful records reject. Those hashes remain caller-supplied structurally bound identities until a future trusted runner derives them; no adapter, authoritative terminal application, or Planner run is claimed.
- 2026-08-21 — Diagnostic identity hardening `377cd62` added session/build/app/protocol/experiment/run/runtime/viewport/mode identity and fail-closed build resolution. Browser traces are limited to observed responses/projections and bridge-owned checkpoints; 124-test FAST, focused tests, build, live observer smoke, and clean source diagnostics benchmark passed.
- 2026-08-21 — Froze exact candidate `7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`, tree `476c381034ab3601746a7e11235fe693d793782c`, under annotated tag `founder-alpha-review-candidate-1`. Six fresh reviewers independently inspected that identical state before any review output was integrated.
- 2026-08-21 — Frozen verdict is **NOT READY**. Reviewers recorded one P0: the exact protected full-history Gitleaks command rejects a benign synthetic UUID fixture, so CI cannot pass. P1 findings cover durable/idempotent replay correctness, related-event validation, relay leases/quotas/retention, diagnostic redaction/actionability, hostile local storage, mobile entry/accessibility/fallback/world lexicon, player-visible independence/consequences, cognition experiment integrity/authorization, and verification-lattice evidence. All P0/P1 findings are accepted for bounded repair; no readiness claim is permitted before targeted confirmation.
- 2026-08-21 — Integrated systems `a0c6d03`, CI `2166d37`, privacy/relay `d3915bc`, cognition/Observatory `b64531f`, visual/accessibility `2d5f511`, product consequence `ab6e420`, and integrated browser-alignment `cb535f4` repairs. The shared reconciliation in DECISIONS accepts every frozen P0/P1 with direct regression or fail-closed removal; human and live-provider claims remain `NOT_RUN`.
- 2026-08-21 — Clean repaired FAST passed at `cb535f4`: runtime/cohort/architecture/docs/format/lint, 12 TypeScript project graphs plus Worker suites, and 152 unit tests across 21 files. Focused production Playwright passed verify and default accuse-rejection journeys after Chronicle copy alignment; the full clean browser matrix remains part of PR/DEEP verification.
- 2026-08-21 — A separate headful Chrome 151 production run at 200%-equivalent CSS/DPR metrics recorded zero horizontal overflow at arrival and counsel and all three counsel choices. Direct browser-UI keystroke automation was denied by macOS and remains explicitly `NOT_RUN`; the source-bound evidence record does not claim otherwise.
- 2026-08-21 — Confirmation repair split browser evidence into two crash-hook-only journeys followed by a clean production rebuild, budget check, and fourteen unchanged production journeys. Both suites passed their zero-egress network oracle; the production bundle remained within the 200/650 KiB gzip budgets and contained no crash marker. PR manifests now hash only the inspected production `dist`; DEEP alone admits its four benchmark outputs. The corrected OFF/LOCAL/ALPHA browser benchmark completed its full current counsel path from a clean, unchanged source tree with `PASS`: every mode met frame, relative-journey, zero-egress, clean-console, and mode-evidence assertions. Full integrated DEEP remains pending coordinator integration.
- 2026-08-21 — Confirmation follow-up replaced the unverifiable outer `pnpm verify:*:checks` manifest row with runner-owned ordered step lists. PR now records nineteen actual constituent commands/results; DEEP reuses those exact nineteen and appends seven DEEP-only commands. Direct regressions prove prefix identity, unique IDs, per-step timing/status, and fail-fast omission of unexecuted work. The check-only aliases call the same list rather than maintaining a second command sequence.
- 2026-08-21 — Exact clean PR passed all nineteen rows at `b286da8`. The first integrated DEEP attempt then correctly failed closed only at canonical performance because that second harness retained the obsolete counsel label already repaired in the diagnostics harness. No partial sample is accepted. Both DEEP browser scripts now use the current `Review Mara's choices` phase contract, protected by one direct source regression; the invalidated targeted-review candidate remains tagged as failed-run evidence and received no review verdict.
- 2026-08-21 — Exact clean DEEP passed all 26 ordered rows at `59edef3c768d9a3fe9409f07d77d49fded4b9554`, with unchanged source/lockfile, production-only `dist`, four admitted DEEP artifacts, and output SHA-256 `b4bb47f0395b8c122678416aee62db632575b16e05729f3d64a9a3b3af9a83d2`. Fifteen fresh-browser canonical journeys kept worst per-state p95 at 10.0 ms or better, meaningful-world display at 2,354 ms or better, and route/netlog external attempts at zero. This is automated local evidence; targeted confirmation, protected remote checks, human gates, physical mobile, screen reader, live providers, and deployment remain pending or `NOT RUN` as applicable.
- 2026-08-21 — Operator world-presence override SHA-256 `bb1e6a7969d22477ce2ae12bc0fe57c40cd12e139370addf90d3c91dcc9245e1` invalidated `fe7f1d0` as a release candidate despite its exact clean DEEP pass. The interrupted targeted reviewer returned no accepted verdict. Sparse Pixi is now a P1 presentation failure; PlayCanvas architecture evidence, embodied spatial projection, temporal Living World tests, unchanged semantic accessibility, repeated performance, and a fresh independent inhabited/alive YES are required before PR or merge. Reality/cognition/persistence/Chronicle authority and all honest `NOT RUN` boundaries remain unchanged.
- 2026-08-21 — Three bounded scratch/research branches completed and were inspected before integration: spatial architecture `f15c5df`, renderer spike `95c2882`, and asset/provenance research `74ac403`. PlayCanvas React/WebGL2 was accepted; Recast and runtime CC0 assets were deferred. The scratch renderer demonstrated the required embodied direction and sub-10-ms headed p95 on emulated profiles, while the unoptimized KayKit subset exceeded the asset ceiling.
- 2026-08-21 — Implemented `packages/world-presentation`, PlayCanvas world, authored path/slot graph, eleven-class procedural rig, visible props/paired interaction, semantic action provenance, bounded presentation diagnostics, lazy chunking, failure fallback, canvas containment, and temporal regressions. The current candidate has 182 unit tests and sixteen production browser journeys; the earlier 173/fifteen checkpoint remains historical. This is an implementation checkpoint, not the clean performance or independent human World Presence pass.
- 2026-08-21 — Exact clean integration checkpoint `593e5ab8bbf0bbe0f5977bc016b6c520a4877bf8` passed the production build, unchanged payload limits (95,581-byte critical shell; 632,154-byte total JavaScript; 512,155-byte lazy world chunk; zero world assets), all fifteen unchanged-production journeys, zero external attempts across 202 routed requests and 31,446 netlog events, frozen 199-package cohort, and production audit [S-WP-022]. Canonical repeated performance and independent aliveness remain open.

- 2026-08-21 — Frozen candidate `afdc6e0e68afb54a79445324cd473e9f2a434cda` received three independent release reviews. Product and visual answered the binding inhabited-place question exactly **NO**. Across the wave, seven implementation P1 mechanisms and the failed stable-power evidence boundary remain: unlabelled activity legibility, visible Mara consequence, return/Chronicle framing, canonical watched-world cadence, truthful task completion/resume, cross-head travel continuity, and a real ten-second lifecycle gate. The reviews are immutable records; repair proceeds on a new candidate. Human World Presence remains `NOT RUN`.
- 2026-08-21 — Canonical DEEP attempts remained fail-closed: one lacked the explicit approved TLC path, one found the coordinator's stale loopback preview on port 4173, and the first uninterrupted attempt reached stage 26 before the meaningful-world predicate rejected the grammatically different `exchanging` label. No partial run was accepted. Qualification diagnostics then exposed a second identity mismatch: citizen rows used full names while the interaction cue used first names. Both in-progress and committed cues now use canonical full names plus the stable action noun `exchange`; direct spatial regressions lock participants, event linkage, and the no-result-claimed boundary before the full clean rerun.
- 2026-08-21 — A complete 15-repetition performance attempt met every display/frame limit but remained non-accepted because macOS changed from AC to battery during mobile repetition five. The same interface transition emitted `NETWORK_MAC_OS_CONFIG_CHANGED` metadata containing old/new private addresses; the overbroad netlog scanner misclassified those interface facts as connection attempts even though all route logs and every connection record remained local or blocked. Both browser oracles now exclude only that named configuration-event type while continuing to inspect all connection/DNS/URL/endpoint records. Stable-source/stable-power/zero-egress evidence must be rerun; the failed metrics are not promoted.
- 2026-08-21 — Frozen `afdc6e0` product, systems, and visual reviews were integrated only after all three completed. Their seven P1 mechanisms were repaired through `e1100f6` and `e6b4e95`; combined pinned FAST reached 190 tests and the 12-second production lifecycle passed. The final cross-discipline pass against `17b2a3d` closed those mechanisms but answered **NO** because the first watched boundary removed the only opening interaction before throttled mobile paint.
- 2026-08-21 — Repair `4c205e2` keeps the canonical genesis exchange reserved through simulation time 180 and settles it once at 240. The one permitted post-fix confirmation against frozen `90c0ad2` answered the exact binding question **YES**, found zero P0/P1, measured unchanged throttled mobile meaningful world at 4,439.5 ms with a current illustrated interaction, and observed clean release/resume by time 360/reload. This is independent automated evidence; human Gate 0/A/B remain `NOT RUN`, and the full canonical battery remains pending.

## Decision, risk, and deviation log

| ID | State | Record |
|---|---|---|
| FA-D-001 | ACCEPT | Correct GitHub privacy immediately; public state is a P0 regardless of prior handoff prose. |
| FA-D-002 | ACCEPT | Keep Standard Brain and canonical Reality untouched by diagnostics, feedback, experiments, and ontology projection. |
| FA-D-003 | REJECT | Do not add rrweb, browser OpenTelemetry, or an MCP server. Keep a disabled `ReplayCapturePort`; typed traces, native performance measures, and explicit screenshots are the Alpha surface. |
| FA-D-004 | ACCEPT WITH GATE | Implement only a dependency-light deploy-ready Worker/D1/Turnstile/private-GitHub-App relay seam. Do not deploy, create credentials, activate R2, or claim exactly-once delivery. |
| FA-D-005 | ACCEPT WITH GATE | Planner Brain must earn inclusion against a future trusted frozen 64-context Standard-Brain benchmark and three-case improvement floor; the current generated corpus is smoke-only. Otherwise remove it. POMCP/MCTS is rejected. |
| FA-D-006 | ACCEPT | Keep optional local-model work at the provider-neutral subprocess contract only. No executable, model, weight, download, SDK, or network call enters Founder Alpha. |
| FA-D-007 | ACCEPT | Keep one authorized offline JSON-LD 1.1, locally PROV-shaped projection with a closed repository validator. It claims neither full PROV-O nor SHACL conformance; RDF never becomes Reality or reducer input. |
| FA-D-008 | ACCEPT | Observer remains a typed local read-only command. MCP is optional future transport and no security boundary. |
| FA-D-009 | ACCEPT | R2 stays disabled because activation crosses a subscription/cost gate and budget alerts do not cap spend. |
| FA-R-001 | ACTIVE | Diagnostics could become an unbounded privacy leak or second authority. Close through source redaction, bounds, explicit modes, and hostile tests. |
| FA-R-002 | ACTIVE | Alpha polish could hide branch convergence or weak product pull. Preserve counterfactual and human NOT RUN labels. |
| FA-R-003 | ACTIVE | Feedback relay could create abuse, credential, quota, and GitHub issue-spam risk. It remains least-authority and non-foundational. |
| FA-R-004 | ACTIVE | Added instrumentation can break performance/accessibility. Measure OFF/LOCAL/ALPHA separately and simplify before waiving budgets. |
| FA-R-005 | ACTIVE | Large Alpha scope can exceed solo maintenance capacity. Reject optional dependencies/features that do not improve the complete tester loop. |

## Evidence index

| Evidence | State | Location or command |
|---|---|---|
| Start baseline | PASS | exact command and counts in Start-state freeze |
| GitHub privacy | PASS after P0 correction | authoritative `gh repo view` / REST result on 2026-08-21 |
| Diagnostics/Sentinel | AUTOMATED PASS; targeted confirmation pending | redaction, bounds, Sentinel authority, HMR-stable observer, native performance and injected-fault tests; clean source benchmark at `279e1c6` |
| Feedback/observer | AUTOMATED PASS; live path NOT RUN | browser-only queue/preview/delete/expiry, hostile-summary reconstruction, relay D1/quota/reconciliation/provider adversarial fixtures; live provider path NOT RUN |
| Founder Alpha browser matrix | EXACT-YES CONFIRMED; CLEAN DEEP PENDING | The invalidated Pixi candidate passed two test-only injected-fault journeys and fourteen production journeys at `59edef3`. The World-as-Product candidate has sixteen production journeys; frozen `90c0ad2` received exact **YES** with zero P0/P1. Fresh clean DEEP and canonical zero-egress/performance evidence remain. |
| Cognition experiments | BOUNDED AUTOMATED PASS / promotion disabled | controls/ablations/transfer and proposal validation pass; self-attested corpus claims removed; ordered per-execution result journal; unforgeable authorized Observatory artifact; no model/planner candidate run |
| Performance OFF/LOCAL/ALPHA | CLEAN LOCAL DEEP PASS | `pnpm benchmark:diagnostics` passed absolute source ceilings; the corrected three-mode browser comparison and fifteen-run canonical profile passed all assertions at `59edef3`; physical mobile remains `NOT RUN` |
| Security/privacy review | FIRST CONFIRMATION REPAIRED; targeted confirmation pending | closed summaries/safe-stop/storage/quota/retention/fingerprint/capability and hostile-storage regressions integrated; live relay NOT RUN |
| Human Gate 0/A/B/Story Card | NOT RUN | no claim permitted |

## Definition of done

Founder Alpha is complete only when the full account-free loop, diagnostics modes, Sentinel, read-only observer, safe feedback, provenance, Story Card, Standard Brain fallback, accepted cognition/ontology seams, verification lattice, browser/access/performance/security evidence, six frozen reviews, repairs, and fresh confirmation are present and reproducible; every P0 is closed; every P1 is closed or explicitly mitigated without false claims; the mega PR is green and merged; remote/local branch cleanup is verified; and `FOUNDER_ALPHA_HANDOFF.md` tells a zero-context operator exactly what works, what is not run, and how to reproduce the evidence.
