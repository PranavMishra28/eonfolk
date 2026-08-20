# Final cross-discipline red team

**Purpose:** Independently test whether the reconciled EONFOLK foundation is internally consistent, executable inside the binding constraints, and safe to hand to Goal mode.

**Status:** COMPLETE — **NOT READY FOR GOAL MODE**; five P1 findings remain and one P2 repository-QA defect remains.

**Authority boundary:** This file owns the final objections and verdict against review commit `6850b699221fb5c79f247e03b1b4955c2c96b44b`. It does not change product, technical, quality, decision, risk, question, source-ledger, or execution authority.

**Related documents:** [authority index](../INDEX.md), [review reconciliation](../decisions/DECISIONS.md#review-reconciliation), [first ExecPlan](../exec-plans/active/001-foundation.md), [Goal prompt](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md), [final-readiness candidate](FINAL_READINESS.md), [quality bar](../quality/QUALITY_BAR.md).

## Review basis and verdict

This review used only exact commit **`6850b699221fb5c79f247e03b1b4955c2c96b44b`** in isolated worktree `review-final` on branch `review/final`. It did not inspect later branch state or refresh external claims. It read the authority map, reconciliation, all four frozen discipline reviews, all five player perspectives, the required product/game/design/engineering/quality authorities, `001-foundation`, the ExecPlan contract, the Goal prompt, `FINAL_READINESS`, `PLAN`, risks, questions, and the source ledger.

**Verdict: NOT READY FOR GOAL MODE.** No live P0 remains. The two engineering P0s are genuinely mitigated by commit-before-publish durability and export-only recovery, and the three persona P0s are genuinely mitigated by anti-script evidence and honest scope. Five P1s still require the implementer to invent protocol, authorization, experiment, scope, or fixture authority. One P2 duplicate-ID defect also fails final repository QA.

| Severity | Count | Readiness effect |
|---|---:|---|
| P0 | 0 | No surviving stop-level corruption, unauthorized-write, or factual-fabrication condition found in the plan |
| P1 | 5 | Goal mode would begin from unresolved determinism, visibility, product-gate, timebox, or scenario authority |
| P2 | 1 | Final source-ID QA fails, although the duplicated rows are identical |
| P3 | 0 | No polish-only finding is material to readiness |

## Finding index

| ID | Severity | Finding | Primary consequence |
|---|---|---|---|
| FR-001 | P1 | The byte-level determinism profile still has ambiguous/circularly underspecified encodings | Distinct logical inputs can share an ID preimage, and independent implementations can disagree on PRNG/batch bytes |
| FR-002 | P1 | Visibility labels and noninterference tests have no authorization-policy oracle | Hidden-state isolation cannot be implemented or judged without inventing who may read what for each purpose |
| FR-003 | P1 | The 52+8-hour plan is a milestone allocation, not a credible bottom-up estimate | Required implementation, human evidence, reviews, and failure drills can overrun before any declared cut is available |
| FR-004 | P1 | Gate 0 does not define an executable matched-comparison design | The foundational one-citizen decision can pass or reopen under reviewer-invented exposure and scoring rules |
| FR-005 | P1 | Riverhold repairs a mill in some authorities and a well in the resource/visual authorities | The supposedly story-relevant exchange/repair can become an unrelated mechanic or falsify Chronicle presentation |
| FR-006 | P2 | `S-DET-001` and `S-DET-002` are each defined twice | Stable source-ID uniqueness and final source-ledger QA fail |

## P1 findings

### FR-001 — The determinism profile is not byte-closed

**Exact location.** The historical review targeted the then-current SIMULATION determinism profile; the [current profile](../engineering/SIMULATION.md#determinism-profile-eonfolk-determinism-v2) supersedes it. The Goal prompt repeats the current summary under [Byte-level determinism profile](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md#byte-level-determinism-profile).

**Why material.** The stable-ID preimage is `type + worldSeed + creationSequence` with no length framing or separators. For one type, seed/sequence pairs such as `("1", 23)` and `("12", 3)` have the same concatenated text. The lowercase-base32 alphabet, padding and output length are not selected. PRNG seeding likewise permits delimiter ambiguity unless seed/stream grammars exclude NUL, and the all-zero replacement vector is only promised in a future fixture. `batchId` is present in every event, `eventHash` covers the envelope including `batchId`, and the batch hash consumes event hashes, but `batchId` derivation is absent; treating it as the batch hash would be circular. ER-003 was therefore only partially reconciled. Golden tests cannot resolve an authority gap if the implementer first invents the expected vectors.

**Minimum bounded fix.** In `SIMULATION`, define canonical length-prefixed UTF-8 tuples for every hash/seed/ID preimage; fix the base32 alphabet, no-padding rule and digest length; give the exact xoshiro128** transition/constants, seed state encoding and literal all-zero replacement; constrain or frame stream IDs; and define an acyclic order for `batchId`, event hashes and batch/head hash. Mirror only the final names in `001` and the Goal prompt.

**Confirmation test.** A fresh reviewer independently computes the committed seed, PRNG, stable-ID, event and batch vectors from the prose and obtains the checked-in bytes. Collision fixtures for ambiguous seed/sequence and seed/stream pairs produce different IDs/states. A dependency graph of hash inputs is acyclic, and Node plus the supported browser match byte-for-byte.

### FR-002 — Hidden-fact isolation has no policy oracle

**Exact location.** [WORLD_MODEL, facts/beliefs/allegations/secrets](../game/WORLD_MODEL.md#facts-beliefs-allegations-and-secrets) lists six visibility labels at line 32. [COGNITION, DecisionContext](../engineering/COGNITION.md#decisioncontext) requires byte-identical noninterference at lines 17–26. [EVALS](../quality/EVALS.md#hard-assertions) and [SECURITY](../engineering/SECURITY.md#required-abusesecurity-tests) require tests, but no owner defines the viewer/subject/purpose/revision rules that determine the expected result.

**Why material.** `participant-private`, `citizen-private`, and `patron-visible-through-covenant` do not identify their subject sets, start/end revision, revocation behavior, or purpose-specific access. No rule says how a public child event with a private causal parent is projected, whether target/catalog existence is secret, or which rejection codes coalesce. An implementation can make its own projection and then make its own tests pass. That does not mitigate ER-007; hidden facts can still leak through catalogs, targets, errors, explanations, or Chronicle evidence while the test suite agrees with the same invented policy.

**Minimum bounded fix.** Add one pure, versioned policy table to the visibility owner: `canRead(viewer, purpose, record, atRevision)`. Define viewer identities and membership for every label, covenant grant/revocation, derived-event/private-parent behavior, Brain-safe error coalescing, and the allowed purposes for DecisionContext, semantic UI, patron view, public Chronicle, replay, export, and implementation diagnostics. V1 can keep the table small and scenario-specific.

**Confirmation test.** Two independent implementers derive the same allow/deny matrix from the document. Metamorphic world pairs then prove byte-identical context, catalog/targets, Brain-visible error, explanation, semantic/patron/public projection and timing class until one typed observation/disclosure event changes permission. A public child with a private parent exposes neither parent existence nor content.

### FR-003 — The 52+8-hour claim is not a credible estimate

**Exact location.** [001 hour and scope budget](../exec-plans/active/001-foundation.md#hour-and-scope-budget) assigns only milestone totals at lines 29–40. [M0](../exec-plans/active/001-foundation.md#m0--product-and-visual-kill-gates-4-hours) gives four hours to six product variants, a Pixi/semantic fixture, three-viewport/access/performance checks, ten participant/observer sessions and two independent reviews. [M1](../exec-plans/active/001-foundation.md#m1--deterministic-durable-kernel-8-hours) gives eight hours to workspace setup, byte contracts, reducer/scheduler, IndexedDB receipts/snapshots/fencing/export, cross-runtime vectors and crash injection. [M4](../exec-plans/active/001-foundation.md#m4--gate-b-proof-of-agency-and-bounded-attachment-12-hours) gives twelve hours to remaining branch/Chronicle/return work, full tests, eight real-versus-yoked sessions, five separate card viewers and four independent review disciplines.

**Why material.** No task/dependency/three-point estimate shows those outcomes fit. Recruitment, scheduling, facilitation, analysis, dependency setup, artifact authoring, physical-device access, integration/rework, and reviewer turnaround have no owned hours. The Goal prompt permits up to three child agents but never defines whether “focused hours” means coordinator wall time or total labor, so concurrency can silently multiply a solo 60-hour ceiling. The cut list removes presentation extras; it cannot remove the kernel, three histories, semantic game, human denominators, 30/90/365-day tests, access paths, or failure drills creating the estimate pressure. PR-007 and ER-009 are therefore not fully mitigated by reordering alone.

**Minimum bounded fix.** Replace milestone-only totals with a bottom-up work breakdown mapping every blocking criterion to one implementation task, prerequisite, evidence task, owner, expected/low/high hours and declared cut. Define focused hours as summed productive labor across coordinator and child agents, while separately recording elapsed wall time. Include participant/reviewer/device logistics. If the expected case exceeds 52 or leaves no realistic fix reserve, cut a blocking claim with its authority reopened or reduce the product proof; do not relabel work as parallelism.

**Confirmation test.** A fresh estimator can map every Quality Bar bullet exactly once to the work breakdown, reproduce the total, and find at least eight unallocated fix/review hours. A timed M0 rehearsal, including evidence processing rather than only prototype authoring, fits its allocation; otherwise the whole plan is re-estimated before M1.

### FR-004 — Gate 0 has no reproducible comparison protocol

**Exact location.** [QUALITY_BAR, Gate 0](../quality/QUALITY_BAR.md#gate-0--product-kill-gate), [001 M0](../exec-plans/active/001-foundation.md#m0--product-and-visual-kill-gates-4-hours), and [Goal prompt, Gate 0](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md#gate-0--cheap-product-and-visual-kill-tests).

**Why material.** Six variants are assigned to five participants, but the documents never say whether each person sees all variants or one subset, how order/carryover is controlled, which facts/actions/delay/presentation are held constant, how “wins overall” combines the recorded measures, how a tie works, or how the 20-percentage-point rule is computed for nonbinary responses. Two compliant coordinators can reach opposite D-001 decisions from the same observations. That leaves PR-006 and GR-008 only partially mitigated and makes the fastest product kill gate non-falsifiable as written.

**Minimum bounded fix.** Precommit one no-expansion protocol: exposure schedule and counterbalancing; invariant Riverhold facts, intervention count, consequence delay and presentation time; exact questions/scales; abandonment treatment; per-participant and aggregate score; “overall winner,” tie and 20-point calculations; and the D-001 decision rule. If five participants all see all six variants, say so explicitly and mitigate order effects; otherwise specify a balanced assignment with enough observations per condition.

**Confirmation test.** Give two fresh reviewers one mocked complete result table. Without discussion, both compute the same per-condition result, threshold outcome and keep/reopen decision. Reordering the presentation manifest does not change the scoring algorithm.

### FR-005 — The focal repair object still contradicts its authorities

**Exact location.** [ECONOMY](../game/ECONOMY.md#owned-decision) line 19 says `2 wood + work` repairs the **well**. [DESIGN, Riverhold visual lexicon](../design/DESIGN.md#riverhold-visual-lexicon) line 106 renders “repairing well.” [GAME_SYSTEMS](../game/GAME_SYSTEMS.md#owned-decision) line 20, [001 exact scope](../exec-plans/active/001-foundation.md#exact-included-scope), the Goal prompt, and [CHRONICLE RV-009](../product/CHRONICLE.md#riverhold-oracle-chain) instead make it a **mill** repair. `ECONOMY` is the sole owner of resource/exchange semantics, while `GAME_SYSTEMS` owns visible mechanics.

**Why material.** The red teams already required exchange/repair to feed Riverhold rather than run beside it. Following the economy owner builds a well mechanic; following the plan builds a mill mechanic. The reserve work order and Chronicle name the mill, so a well conversion becomes unrelated Gate A activity or makes presentation disagree with authoritative state. This is a gate/factuality/scope conflict, not a cosmetic noun mismatch.

**Minimum bounded fix.** Select one object—current product/Chronicle intent points to the mill—and align `ECONOMY`, `GAME_SYSTEMS`, `DESIGN`, `ART_DIRECTIONS`, `001`, Goal, fixtures and copy. Make the well only a water site if mill is selected. Change `ECONOMY` and `GOVERNANCE` from “DECISION PROPOSED” to the reconciled scenario-scoped status or explicitly reopen them.

**Confirmation test.** One typed fixture uses the same object ID for wood exchange, work/repair mutation, reserve work order, before/after visual cue and Chronicle sentence. Repository search finds no conflicting well/mill repair assertion, and the sentence-to-event test resolves RV-009 to that object.

## P2 finding

### FR-006 — Duplicate source-ledger IDs

[SOURCE_LEDGER](../research/SOURCE_LEDGER.md) lines 135–138 defines `S-DET-001` and `S-DET-002` twice. The duplicate rows are byte-equivalent in meaning, so there is no present provenance ambiguity; stable IDs nevertheless require one definition and the source-ID uniqueness check fails. Delete the second pair and rerun the uniqueness/reference audit.

## Frozen P0/P1 disposition audit

| Review family | Result at review SHA |
|---|---|
| Product `PR-*` | Timing, covenant, branch divergence, return action, attachment denominator and private-card scope are reflected. PR-006 remains partial through FR-004; PR-007 remains partial through FR-003. |
| Game `GR-*` | Three histories, early investigation, state-sensitive people, fair refusal, explicit advance, return action, long-horizon deferral and multi-person thresholds are reflected. GR-008 remains partial through FR-004. |
| Engineering `ER-*` | ER-001/002 and receipt/range/causal/fencing/provider/renderer/explanation fixes are present. ER-003, ER-007 and ER-009 remain partial through FR-001, FR-002 and FR-003. |
| Design `DR-*` | Pixi-only ownership, first-minute state machine, early checkpoint, observer manifest, asset cuts, three-beat Chronicle, action lexicon and attachment evidence are present. The action lexicon still inherits FR-005. |
| Player perspectives `PP-*` | All three P0s and the P1 timing, mobile, local-save, causal-credit, care, screen-share and cohort objections are reflected. No public recipient, session-20, succession, newcomer or delayed-retention claim leaked back into V1. |

## Contradiction audit

| Concern | Result | Audit conclusion |
|---|---|---|
| Local-first crash safety | **PASS** | Pure prepare → atomic events/head/receipt/fence → install → publish is explicit; crash barriers and receipt retry cover both commit sides. |
| Import/replacement | **PASS** | V1 is export-only; no import, replacement or upcaster route is authorized. |
| Three-branch agency | **PASS** | Verify privately, accuse now and abstain must reach three terminal vectors; perturbation, transfer, baselines, ablations and yoked control block one lookup path. |
| Explicit return choice | **PASS** | Leave/confirm advance/changed world/branch-legal second command is required; the command must mutate state. |
| Chronicle/distribution claims | **PASS** | Three beats, ≤20 seconds, typed causality and honest private `Copy story card` comprehension are aligned; no recipient/activation claim ships. |
| Session 5/20, succession, newcomer, retention | **PASS** | These are consistently labeled post-V1 hypotheses. Same-session reload is not called retention. |
| Renderer/mobile/access | **PASS with implementation risk** | Pixi/atlas/semantic DOM, three viewports, numeric payload/frame/display budgets, mobile layout, keyboard, reduced motion and physical-device caveat are aligned. They add to FR-003 but do not contradict one another. |
| CI/tools/security claims | **PASS with dated caveat** | The private-repository probe is explicitly dated and not called enforcement; provider checks are conditional; no workflow or remote setting is claimed present. Execution-day reprobe remains required. |
| Determinism | **FAIL** | FR-001. |
| Visibility/noninterference | **FAIL** | FR-002. |
| Scope/time | **FAIL** | FR-003. |
| Gate 0 decision rule | **FAIL** | FR-004. |
| Riverhold repair object | **FAIL** | FR-005. |

## Goal-prompt zero-context review

The Goal prompt successfully embeds the product promise, exclusions, contract set, persistence choreography, anti-script suite, Chronicle rules, budgets, integration discipline, evidence loop, authority pauses and honest final claim. It correctly requires a pause rather than silently contacting participants, acquiring a device, spending, deploying or publishing.

It does **not** yet pass zero-context review. A coordinator must invent the deterministic byte details in FR-001, the authorization oracle in FR-002, the Gate 0 method in FR-004, and which repair object is authoritative in FR-005. Its 60-hour stop rule also cannot be applied consistently until FR-003 defines total labor. Those are repository-context gaps as well as prompt gaps; copying more prose into the prompt is not the fix until the owners decide.

## Readiness checklist

- [x] Review pinned to exact SHA and isolated from later state.
- [x] No live P0 found; durable commit and export-only scope close the historical P0 paths.
- [x] Fixed Mara, three branches, fair counsel, explicit return choice and honest long-horizon/card claims agree.
- [x] Pixi/mobile/access budgets and CI/security caveats are concrete enough to test.
- [ ] All P1 dispositions are actually closed: FR-001 through FR-005 remain.
- [ ] Goal prompt passes fresh zero-context execution review.
- [ ] Source IDs are unique: FR-006 remains.
- [x] `PLAN` and `FINAL_READINESS` use honest candidate/pending semantics and do not claim observed fun, retention or distribution.
- [x] Internal Markdown links/fragments, Markdown lint, secret/code/license/deployment scans and `git diff --check` pass at this review commit plus this review file.

Because P1s remain, the correct declaration is **NOT READY FOR GOAL MODE**. After the bounded fixes, one targeted cross-discipline confirmation should rerun the five P1 tests and final repository QA; no new concept or architecture round is indicated.

## Repository QA

Commands were run from the isolated review worktree:

- `git diff --check` — pass.
- `npx --no-install markdownlint-cli2` — pass, zero issues.
- `lychee --offline --include-fragments=full --format detailed '**/*.md'` — pass, zero broken local links/fragments.
- source-ID definition/reference audit — no undefined referenced IDs; **fail** on duplicate `S-DET-001` and `S-DET-002` (FR-006).
- unfinished-marker scan — one sourced competitor row contains an external launch-status phrase; no actual repository unfinished-work marker.
- credential-pattern scan — no credential/private-key match.
- production/deployment/code/license-shaped file scan — no application code, package/lock manifest, workflow, deployment config or license file on the planning branch.

## Strongest surviving choices

- **Commit-before-publish plus durable receipts and fencing** is a real crash-safety contract rather than persistence aspiration.
- **Export-only, one-version local V1** removes the unsafe import/replacement/migration surface without pretending recovery is complete.
- **Standard Brain as the complete game** plus perturbation, transfer, baselines, ablations and yoked comparison directly attacks scripted autonomy.
- **Fixed Mara, early state-changing investigation and an outcome-dependent second command** form an honest minimum loop.
- **Typed Chronicle causality and attributed allegation** preserve trust while the three branch histories prevent the oracle from becoming the product.
- **Pixi-only Living Woodcut plus complete semantic DOM** aligns visual distinction with mobile, reduced-motion, keyboard and renderer-loss access.
- **Private card and long-horizon deferral** keep distribution, retention, succession and session-20 claims honest.
- **The Goal prompt's stop/authority discipline** is strong; it needs bounded contract and estimate closure, not broader autonomy.
