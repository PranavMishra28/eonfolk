# 002 — Founder Alpha

**Purpose:** turn the verified local Riverhold proof into a polished, diagnosable, shareable Founder Alpha without weakening Reality authority or inventing human evidence.

**Status:** ACTIVE — baseline frozen; implementation not yet accepted

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

- primary-source review of current Codex orchestration, GitHub private-repository controls, Cloudflare Worker/D1/R2/Turnstile, rrweb 2.x scoped packages, MCP security, PixiJS, MLX, llama.cpp, RDF 1.2/JSON-LD/PROV-O/SHACL, TLC, and every changed dependency;
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

Preserve Living Woodcut unless measured evidence requires simplification. Improve hierarchy, authored world marks, citizen/action readability, relationship change, Chronicle flow, return tension, second-action clarity, Story Card framing, safe provenance display, mobile composition, empty/loading/failure states, focus, copy feedback, and reduced-motion behavior. Avoid dashboard smell and generic AI styling.

Browser-visible acceptance covers:

- first launch and **Follow Mara** in under 60 seconds;
- investigation and visible two-citizen interaction;
- each of verify privately, accuse now, and abstain;
- visibly distinct interpretation/consequence/return options;
- controlled leave, reload, catch-up, Chronicle, replay, second action, evidence/provenance, Story Card, and feedback;
- desktop 1728×1117, laptop 1366×768, mobile 390×844, 200% text, keyboard only, reduced motion, and semantic fallback;
- multi-tab fencing, worker/persistence failure, no-Worker failure, offline/network outage, denied clipboard, and unavailable diagnostics/feedback.

A passing build or backend suite cannot substitute for actual local play and visual evidence.

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

## Decision, risk, and deviation log

| ID | State | Record |
|---|---|---|
| FA-D-001 | ACCEPT | Correct GitHub privacy immediately; public state is a P0 regardless of prior handoff prose. |
| FA-D-002 | ACCEPT | Keep Standard Brain and canonical Reality untouched by diagnostics, feedback, experiments, and ontology projection. |
| FA-D-003 | OPEN | Retain rrweb only if source masking, bounded history, measured overhead, and license/dependency review pass. |
| FA-D-004 | OPEN | Implement Cloudflare relay as deploy-ready only unless credentials and deployment approval already exist; never fabricate availability. |
| FA-D-005 | OPEN | Planner Brain must earn inclusion against the frozen Standard Brain benchmark; search sophistication is not a deliverable by itself. |
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
| Diagnostics/Sentinel | NOT RUN | recorded after M1 |
| Feedback/observer | NOT RUN | recorded after M2 |
| Founder Alpha browser matrix | NOT RUN | recorded after M3/M5 |
| Cognition experiments | NOT RUN | recorded after M4 |
| Performance OFF/LOCAL/ALPHA | NOT RUN | recorded after M5 |
| Security/privacy review | NOT RUN | recorded after M6 |
| Human Gate 0/A/B/Story Card | NOT RUN | no claim permitted |

## Definition of done

Founder Alpha is complete only when the full account-free loop, diagnostics modes, Sentinel, read-only observer, safe feedback, provenance, Story Card, Standard Brain fallback, accepted cognition/ontology seams, verification lattice, browser/access/performance/security evidence, six frozen reviews, repairs, and fresh confirmation are present and reproducible; every P0 is closed; every P1 is closed or explicitly mitigated without false claims; the mega PR is green and merged; remote/local branch cleanup is verified; and `FOUNDER_ALPHA_HANDOFF.md` tells a zero-context operator exactly what works, what is not run, and how to reproduce the evidence.
