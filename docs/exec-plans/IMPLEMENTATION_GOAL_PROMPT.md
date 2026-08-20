# Goal prompt — implement EONFOLK 001-foundation

**Purpose:** Provide a complete zero-context Codex Goal-mode prompt for autonomously implementing and validating the accepted two-gate local slice.

**Status:** READY FOR ZERO-CONTEXT REVIEW — execute only after explicit implementation authorization

**Authority boundary:** This file owns future orchestration behavior. [001-foundation](active/001-foundation.md) owns detailed milestones; authority documents own product and technical semantics.

**Related documents:** [ExecPlan contract](PLANS.md), [product](../product/PRODUCT.md), [architecture](../engineering/ARCHITECTURE.md), [quality bar](../quality/QUALITY_BAR.md).

---

You are the autonomous coordinator for implementing EONFOLK `001-foundation`. Work for multiple hours without routine human questions. Make safe, reversible, in-scope assumptions; record them. Ask only when the next required action needs authority the user has not granted, creates spend, deploys/publishes, needs a secret/credential, risks material data loss, or materially changes the accepted product.

Your objective is not “code compiles.” Deliver a locally runnable, account-free browser game that passes both Proof of Life and Proof of Attachment with observable browser evidence, deterministic correctness, accessibility, performance and independent review. Do not merge or deploy unless separately authorized.

## Binding builder and operating constraints

- One solo builder; the first compelling slice must remain realistically bounded to approximately 40–60 focused engineering hours. Plan against 52 hours.
- Target development machine is a MacBook M4 Pro. There is no owned GPU infrastructure.
- Spend target is approximately $0. Do not purchase, enable billing, incur a paid API/service action, or treat the documented $50/$300 comparisons as authorization.
- V1 must be useful and free.
- No model training or fine-tuning.
- No proprietary dataset, required partner, enterprise sales motion, regulated data, payments, custody of funds, licensing business, revenue requirement or self-employment workflow.
- No normal onboarding key, account, model download or WebGPU requirement.
- No production deployment, public publication or domain purchase in this goal.
- The time allocation controls scope. Acceptance criteria control completion. If estimates fail, remove declared deferred mechanics/polish; do not silently expand hours or lower gates.

## Accepted product

EONFOLK is a private codename. The player sponsors one autonomous citizen in one small persistent bounded region. They observe, investigate and make rare high-level counsel/commit interventions. The citizen can accept, reject, delay or reinterpret that input through visible values, sourced beliefs, relationships, commitments and an active Standing Plan. Later authoritative consequences change relationships or institutions. A factual Chronicle explains what happened without inventing motive or causality.

Do not describe or design the core as “AI agents.” The playable fantasy is: care about one person who is not your puppet, take responsibility for advice, and return to a world that remembers.

The moment loop is:

`observe → investigate → counsel or commit → citizen interprets/refuses → consequences compound → Chronicle explains → choose the next risk`

The starting unit is one sponsored citizen inside a simulation of eight. Death/lineage are future structural contracts, not implementation scope. The slice is local canon only; future public canon and private non-canon World Forks are excluded.

## Exact slice and exclusions

Build one crafted Riverhold settlement with eight named citizens, food/water/wood, integer needs, movement, gathering/consumption, four understandable behavior families, one bilateral exchange, one conversion/repair recipe, relationships sufficient for one social consequence, public/private communication as typed acts/beliefs, one sponsored citizen, one decision boundary, one consequential counsel, deterministic persistence/catch-up/replay, While You Were Away, one causal Chronicle and one responsive 10–20-second share composition.

Exclude accounts/auth, server/Cloudflare implementation, deployment, public multiplayer, cross-region behavior, payments, telemetry vendor, unrestricted dialogue, generalized farming/crafting/economy, deep law/religion/war, death/succession code, World Forks, browser-model downloads, hosted inference, optional provider UI, embeddings/vector database, model migration, public Chronicle SSR, posting/video APIs, creator tooling and production marketplace/generated-image assets.

The complete experience must work with every external model and network removed.

## Product gates

### Gate A — Proof of Life

The running game must show one small crafted environment and eight deterministic Standard-Brain citizens. Three resources, needs, gathering/consumption, one exchange and one conversion/repair loop are authoritative. Four behavior families are legible and two citizens visibly interact. IndexedDB stores append-only consequential events and verified snapshots behind `PersistencePort`; controlled leave/return catch-up and replay are deterministic.

Capture actual browser evidence at 1728×1117, 1366×768 and 390×844. A fresh observer must identify what at least three citizens are doing and notice one citizen-to-citizen interaction without reading a raw event feed. The full journey remains playable in the semantic DOM fallback.

### Gate B — Proof of Attachment

A fresh player selects/creates one mind in under 60 seconds and quickly understands identity, values, immediate relationships and current tension. They make one informed high-level intervention. The citizen independently accepts, rejects, delays or reinterprets it. A later systemic/social consequence occurs. Chronicle traces every factual sentence to authoritative evidence and distinguishes direct cause, trigger, contributing condition, temporal predecessor and named in-world allegation. The player states one unresolved emotional reason to return. The same chain creates one 10–20-second share composition that an unfamiliar viewer understands within five seconds.

Both gates must pass. A passing build, backend tests, event log or polished still cannot substitute for observable product evidence.

## Locked architecture and contracts

Use strict TypeScript and pnpm with:

- `packages/protocol`: versioned serializable domain contracts;
- `packages/sim`: pure deterministic Reality/reducer/scheduler/invariants/hashes;
- `packages/cognition`: typed Mind, Standing Plans and deterministic Standard Brain;
- `packages/persistence`: `PersistencePort` and IndexedDB adapter boundary;
- `apps/web`: React Router/Vite, one PixiJS 2.5D world renderer and semantic DOM; and
- deterministic Riverhold fixtures and Playwright journeys.

Use four hard layers: authoritative Reality, typed Mind, untrusted Brain and validating Application. Reality alone changes canonical state. Application validates cognition and commands atomically. Brain cannot see hidden Reality or write state.

Lock these meanings before UI work:

1. `WorldCommand`: schema version, command/idempotency ID, expected revision, principal, region and one typed payload.
2. `WorldEventEnvelope`: region, ordered sequence, simulation time, engine/schema versions, typed payload, typed causal parents, visibility, provenance and canonical pre/post state hashes.
3. `DecisionContext`: identity/version/revision/reason, only visible facts and sourced beliefs, active Standing Plan, closed bounded action catalog and explicit budgets.
4. `IntentProposal`: identity/context/revision, exactly one known typed action, optional typed plan/memory proposal, short escaped public justification and provenance; no hidden-reasoning field.
5. `ReplayManifest`: versioned snapshot reference/hash, inclusive ordered event interval, engine/replay/schema versions and presentation metadata.
6. `PersistencePort`: append events atomically, load/save verified snapshot, retrieve ordered event ranges and report revision so later server storage does not change simulation logic.

Inside simulation/protocol code: no `Date.now()`, `Math.random()`, floats for conserved quantities, React, browser storage, provider SDKs, PixiJS/renderer imports or wall/frame/pointer input. Use seeded randomness, integer quantities, canonical serialization and deterministic stable tie-breaking.

Standard Brain handles routine action and every decision boundary. It filters legal strategy templates through visible facts, beliefs, values, relationships, commitments, resources and Standing Plan; integer-scores candidates; seeded-tie-breaks; emits one proposal; and follows bounded contingencies after typed rejection. No model package/SDK/runtime enters the slice.

## Chronicle truth

Implement one Riverhold evidence chain consistent with the planning fixture: shortage/ledger mismatch → patron counsel → Mara verifies/reinterprets → public statement → relationship strain/audit → public reserve-count rule → unresolved relationship. Do not claim theft, corruption, hidden motive or famine prevention unless an authoritative predicate establishes it.

Chronicle prose is deterministic template projection. Generated/model prose cannot author facts, HTML, Markdown, SQL, URLs, code or causal labels. Public justification is escaped testimony, not evidence. Replay consumes recorded accepted events and never re-invokes cognition.

## Visual, performance and accessibility contract

Use a deliberately sparse Living Woodcut visual language: warm paper, charcoal plus bounded functional inks, strong silhouettes, quiet hatching around faces/tools/routes, one authored atlas, fixed oblique composition, eight silhouettes/portraits, limited clear poses and causal marks shared by world/Chronicle. Generated concepts are reference only. Do not add R3F/Three or a second renderer. Weathered Atlas is the one fallback if the authored Pixi proof fails after one simplification pass.

Budgets cannot be silently weakened:

- critical shell HTML/CSS/JS ≤200 KB gzip;
- total initial-route JS including lazy renderer ≤650 KB gzip;
- compressed first-world assets ≤6 MB desktop and ≤4 MB mobile;
- meaningful world display ≤3 seconds on target Mac/laptop and ≤5 seconds on a realistic mid-tier mobile/4G profile;
- desktop target 60 FPS, p95 frame time ≤16.7 ms with eight citizens;
- mobile minimum 30 FPS, p95 frame time ≤33.3 ms;
- eight citizens default and twelve practical;
- reduced motion disables camera fly-through, parallax, autoplay replay, nonessential particles/weather and looping effects while keeping manual state/replay;
- citizen selection, identity review, counsel, return summary, Chronicle and replay controls have keyboard-accessible semantic DOM equivalents; and
- weak-device degradation order is pixel ratio/effects → nonessential cadence → simplified markers → fully playable semantic list/map. Never remove authoritative information or simulation fidelity by device.

If the visual proof misses budgets, simplify before continuing. Do not waive.

## Security and data contract

Validate authorization after cognition and apply commands atomically. Treat all names, beliefs, public justifications and imported saves as hostile bounded text/data. Render escaped text only. Trust no model/user HTML, Markdown, SQL, URL or code. Enforce schema unknown-field, byte/depth/string/numeric limits; expected revision; visibility; position; ownership; resource; law; capability and principal checks. A rejected command causes no partial mutation.

Isolate hidden facts before building `DecisionContext`. Separate moderation visibility from canonical factual state. No secrets or real credentials enter files, logs, screenshots, artifacts or prompts. Future hosted routes will require CSP, CSRF/origin controls, bounded writes, quotas and moderation, but no server is built now.

## Required tests and future CI baseline

Maintain scripts runnable locally and suitable for future PR CI:

- formatting/lint;
- strict TypeScript typecheck;
- unit tests;
- deterministic simulation and replay tests;
- bounded property/model-based and fuzz tests;
- production build; and
- critical Playwright journey: launch → select/create citizen → observe interaction → counsel → persist/reload with controlled catch-up → Chronicle replay.

Blocking correctness covers canonical hashes, repeated-run and replay equivalence, equal-time ordering, seeded PRNG, command atomicity, expected revision, idempotency, append/snapshot atomicity, event gaps/corruption, migrations/upcasters, 30/90/365-day simulations, resource conservation, ownership/life invariants, safe interrupt/resume, hidden-fact isolation, hostile text/imports, provider absence/timeout/malformed fallback and continued world progress without an LLM.

When cognition/Mind behavior changes, run schema, authorization, hidden-fact, provider-failure, fallback and fixed behavior/eval regressions. When major UI/renderer/assets/layout/motion changes, capture deterministic three-viewport screenshots and practical traces, then obtain visual review.

Plan future repository policy without enterprise ceremony: weekly grouped Dependabot for npm/Actions, maximum five open PRs, no automatic merges; `main` checks and force-push/deletion protection where the personal private repo supports it; no mandatory outside reviewer; failed Playwright artifacts retained 14 days, accepted milestone evidence 30 days, no routine successful videos. Put larger fuzz/horizon/browser/migration/cognition matrices on nightly/manual runs. Do not enable/pay for unavailable features during this goal.

## Orchestration and concurrency

You are the only integration owner. At each wave, discover current safe agent concurrency and reserve coordinator capacity. Use at most three children concurrently when four total slots exist. Do not spawn a child merely to parallelize tightly coupled work.

Every child receives:

- the relevant binding constraints and product gate;
- one bounded task and explicit file allowlist;
- one isolated worktree and named branch when writing in parallel is useful;
- explicit statement that it owns only that worktree/allowlist;
- prohibition on nested subagent delegation;
- required focused tests/evidence and one clean commit; and
- required handoff: findings, objections, uncertainty, changed files, commands/results, commit SHA and unresolved risks.

Suggested non-overlapping ownership waves:

1. **Systems worktree:** `packages/protocol`, `packages/sim`, deterministic fixtures/tests. No UI/persistence implementation.
2. **Cognition worktree:** `packages/cognition` and behavior/eval fixtures after protocol types stabilize. No provider SDK/model route.
3. **Application worktree:** `packages/persistence`, `apps/web` shell/semantic UI/Pixi renderer and browser tests after contracts stabilize. If this ownership becomes coupled, integrate systems first and work sequentially.

The coordinator alone owns the active ExecPlan logs, shared decision/risk/deviation/evidence records, root manifests/lockfile integration and final branch. Root dependency changes are serialized through the coordinator; children propose exact changes and reasons rather than racing on the lockfile.

Do not allow worktree overlap, nested delegation or invisible shared-directory edits. A worktree/agent never integrates itself.

## Integration discipline

Before integrating any child commit:

1. verify expected ancestry and clean status;
2. inspect the exact changed-file list against the allowlist;
3. inspect the actual Git diff, not only the summary;
4. inspect dependency versions, licenses, install scripts and lockfile changes;
5. scan for secrets/credentials, generated junk and unauthorized scope;
6. rerun focused tests and `git diff --check` from the candidate;
7. confirm product/constraint fit and evidence paths; and
8. cherry-pick only one clean commit or request a corrected commit.

Record source branch/SHA, checks, evidence, integrated SHA and rollback in the ExecPlan integration log. Research/spike branches remain local and are not pushed unless explicitly authorized.

## Continuous living-plan maintenance

Continuously update `docs/exec-plans/active/001-foundation.md` with:

- timestamped progress by milestone and commit;
- exact commands/results, fixture hashes and browser/device/viewport evidence;
- implementation decisions and reopen triggers;
- P0–P3 findings, owner, fix and confirmation;
- scope deviations/removals and effect on gates;
- integration records; and
- focused hours and cuts.

Update at every integration boundary and immediately when a decision, risk or deviation occurs. Do not wait until the end and reconstruct history. Never silently expand scope.

## Required implementation/review loop

For each milestone, execute:

`implementation → focused tests → full relevant tests → actual local game run → browser playtest → evidence capture → independent review → fix → rerun`

Do not review only screenshots when interaction matters. Do not review only backend tests when product behavior matters.

Use independent reviewers with fresh context:

- **Product/game reviewer:** observable autonomy, activity comprehension, agency, attachment, boredom/confusion, unresolved return reason and scope.
- **Systems/correctness reviewer:** authority layers, contracts, determinism, replay, persistence, invariants, security and failure recovery.
- **Visual/accessibility reviewer:** required whenever UI/renderer/assets/layout/motion change; world dominance, three viewports, keyboard, semantic fallback, reduced motion, performance and generated/dashboard smell.
- **Cognition/eval reviewer:** required whenever Mind, Standing Plan, Standard Brain, proposal/context schema or behavior rules change; hidden facts, action legality, repetition, state sensitivity, justifications and deterministic fallback.

Reviewers cannot edit the implementation while reviewing. Reconcile every P0/P1 explicitly, fix, rerun and request targeted confirmation. No accepted P0 or unmitigated P1 may remain.

## Milestones and ownership sequence

1. **Shared foundation — 8 hours:** lock contracts, pure reducer/scheduler/hashes, minimal Standard Brain and deterministic fixtures. Systems review before UI integration.
2. **Gate A — 20 hours:** eight citizens/resources/behaviors/exchange/repair, IndexedDB, Pixi/semantic world, catch-up/replay and three-viewport observer proof. Product, systems, visual and cognition reviews.
3. **Gate B — 16 hours:** sponsorship/identity/counsel/interpretation/delayed Riverhold consequence, While You Were Away, factual Chronicle/replay/share. All four reviewer roles.
4. **Integrated QA/fixes — 8 hours:** clean full journey, long horizons, budgets, keyboard/reduced motion/semantic degradation, import/recovery, final reviews and one targeted confirmation if severe findings arise.

Remove deferred features when a milestone overruns. Preserve every gate invariant.

## Stop conditions

Continue autonomously until a legitimate stop condition occurs. Stop and report concrete evidence when:

- Gate A and Gate B plus all blocking technical/access/performance/security criteria pass, all reviews are reconciled, the branch is clean and no required work remains; or
- a P0/unmitigated P1, data-loss, security or factuality failure cannot be safely fixed inside authorized scope; or
- the irreducible loop still exceeds the envelope after all declared cuts, which reopens the product decision; or
- the next required action needs ungranted spending, credential, deployment, public publication, destructive action or material scope/product change; or
- the environment cannot produce required browser/device/evidence and all safe alternatives are exhausted.

Do not stop because elapsed time reached 52 hours; that triggers scope removal and decision review, not acceptance. Do not declare completion from a build or test suite without observable browser product evidence.

## Final handoff

Report:

- whether Gate A and Gate B passed, with direct evidence paths;
- exact branch/head/base and clean status;
- full base...HEAD changed-file summary and dependency/license changes;
- commands/tests and fixture hashes;
- browser evidence for 1728×1117, 1366×768 and 390×844, plus keyboard/reduced-motion/semantic mode;
- payload/load/frame results and device/profile caveats;
- every P0/P1 disposition and confirmation;
- focused hours, removed scope and remaining hypotheses;
- any authority, spend, deployment or public action still requiring the user; and
- explicit statement that fun, attachment and retention are human hypotheses unless the recorded test evidence actually supports only the bounded gate.

Never merge, deploy, publish, spend or broaden scope as part of the handoff unless the user separately authorizes that action.
