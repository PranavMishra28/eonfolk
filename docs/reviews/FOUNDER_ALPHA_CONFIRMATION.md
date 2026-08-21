# Founder Alpha confirmation

**Purpose:** independently confirm or falsify the reconciled Founder Alpha P0/P1 dispositions at one immutable target.

**Status:** **FAIL — zero residual/new P0; seven residual/new P1 failure mechanisms.** The target does not satisfy the rule that PASS requires zero residual/new P0 and zero unmitigated P1.

**Authority boundary:** this file records confirmation evidence and objections only. It changes no product, game, Reality, cognition, privacy, release, execution, decision, or research authority.

**Related documents:** [authority index](../INDEX.md), [reconciliation](../decisions/DECISIONS.md#founder-alpha-frozen-review-reconciliation), [active Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md), [CI review](FOUNDER_ALPHA_CI_EVIDENCE_REVIEW.md), [systems review](FOUNDER_ALPHA_SYSTEMS_CORRECTNESS_REVIEW.md), [diagnostics/privacy review](FOUNDER_ALPHA_DIAGNOSTICS_PRIVACY_REVIEW.md), [cognition/research review](FOUNDER_ALPHA_COGNITION_RESEARCH_REVIEW.md), [product/game review](FOUNDER_ALPHA_PRODUCT_GAME_REVIEW.md), [visual/accessibility review](FOUNDER_ALPHA_VISUAL_ACCESSIBILITY_REVIEW.md)

## Verdict first

No P0 survived or was newly found. Canonical Reality remained typed, durable-before-visible, replay-validated, and separate from cognition, diagnostics, feedback, experiments, and Observatory output in the inspected application path.

The confirmation nevertheless **fails**. Seven distinct P1 mechanisms remain:

| Confirmation ID | Severity | Frozen disposition affected | Result |
|---|---|---|---|
| FA-CONF-001 | P1 | FA-CI-003 | The promised DEEP browser diagnostics comparison cannot complete against the repaired UI. |
| FA-CONF-002 | P1 | FA-CI-003 | PR verification budgets one production bundle, then tests and records a different crash-instrumented bundle. |
| FA-CONF-003 | P1 | FA-COG-R-005; escalates FA-SYS-006 | The alleged opaque Observatory authorization artifact is reflectable and forgeable in the same JavaScript realm. |
| FA-CONF-004 | P1 | FA-DP-001 and FA-DP-005; escalates FA-SYS-007 | Hostile browser storage can inject a credential-pattern incident summary that the local queue preserves and rewrites. |
| FA-CONF-005 | P1 | FA-COG-R-001 | The named control/ablation acceptance matrix remains non-proving; one control is not the behavior its name claims. |
| FA-CONF-006 | P1 | FA-COG-R-002 | The active ExecPlan still publishes the self-attested “52 scenario goals” claim that the repair says was removed. |
| FA-CONF-007 | P1 | FA-COG-R-004 | Experiment results do not preserve or enforce context/seed/repetition identity or run completeness. |

These are release-evidence, privacy-boundary, and research-integrity failures. The dormant Observatory and experiment surfaces do not currently write Reality, the default browser has no relay, and no optional brain ships; those facts bound impact but do not convert false P1 closure claims into PASS.

## Hostile residual and new P1 findings

### FA-CONF-001 — the maintained DEEP lattice has a stale, non-runnable browser constituent

**VERIFIED FACT:** `package.json:38` includes `benchmark:diagnostics:browser` in `verify:deep:checks`. Under Node 22.23.1 arm64, the direct gating command validated the exact 326-file/five-link browser cohort, built the OFF-mode app, and then timed out at `scripts/benchmark-diagnostics-browser.mjs:132-134` waiting for a button matching **Reach the counsel boundary**. The repaired UI and the passing Playwright suite use **Review Mara's choices**. The command exited nonzero before LOCAL or ALPHA ran and emitted no accepted comparison artifact.

**INFERENCE:** failure is fail-closed, but FA-CI-003 is not closed: the named DEEP command cannot provide the comparison it claims to maintain. A PR-only PASS cannot stand in for a broken milestone tier.

**Required closure:** align the harness with the authoritative journey, add a selector/phase contract regression, run the direct OFF/LOCAL/ALPHA comparison, then run the complete `pnpm verify:deep` wrapper from one clean unchanged source and retain its FAIL/PASS manifest.

### FA-CONF-002 — PR evidence binds the wrong build variant

**VERIFIED FACT:** `verify:pr:checks` runs `pnpm build`, budget measurement, and then `pnpm test:e2e` (`package.json:36`). The production build produced `assets/index-BCgmadFP.js` and `assets/runtime.worker-QhYUT21O.js`, with neither E2E crash-hook marker present. The Playwright web server then rebuilt with `EONFOLK_E2E_CRASH_HOOKS=1` (`apps/web/playwright.config.ts:41-46`). The completed tier manifest recorded the later `assets/index-9zaZn4mg.js` and `assets/runtime.worker-MrE93ydg.js`; both contained the session-storage crash trigger or injected-crash text. `scripts/run-verification-tier.mjs:18-24,100-120` hashes artifacts only after every subcommand completes.

**INFERENCE:** the production artifact measured by the bundle gate is not the artifact exercised by the 16 browser journeys or retained in the PR manifest. The manifest is source-bound but not production-artifact-bound, so it cannot support the exact-candidate browser claim required by FA-CI-003.

**Required closure:** build the production artifact once, hash it before and after, and run the ordinary release journey against that unchanged artifact. If crash-barrier tests need a separately instrumented build, identify and hash it as test-only evidence without overwriting the production artifact or presenting it as the release bundle. Enumerate actual constituent commands/results in the tier manifest rather than only the outer `pnpm verify:pr:checks` wrapper.

### FA-CONF-003 — Observatory's opaque authorization can be forged

**VERIFIED FACT:** `packages/observatory/src/index.ts:29-44` uses a module-local `Symbol` as the authorization brand. Symbols on an object are discoverable through `Object.getOwnPropertySymbols`; object spread preserves this enumerable symbol. `assertAuthorizedArtifact` (`:169-205`) checks the copied brand and field shapes, but neither verifies object identity in a private `WeakSet` nor recomputes `sourceDigest` from viewer, purpose, policy, evidence, and Chronicle bytes. The projector at `:333-369` therefore trusts a cloned artifact's relabelled fields.

The focused falsification minted a legitimate participant-private artifact containing `PRIVATE_CANARY`, reflected its brand symbol, cloned it, relabelled it `public` / `chronicle-public`, supplied an arbitrary syntactically valid digest, and projected it. Exact result:

```json
{"brandReflectable":true,"forgedPublicAccepted":true,"error":null,"privateCanaryExposed":true,"publicLabel":true}
```

**INFERENCE:** the public/private boundary promised by FA-COG-R-005 remains a caller assertion for any same-realm holder of a legitimate artifact. No current application call site was found, so this is not evidence of a present browser disclosure; it is a blocking defect in the named authorization seam and its research-facing claim.

**Required closure:** make minted identity genuinely unforgeable, such as by private `WeakSet` membership plus immutable trusted metadata, and validate/recompute the binding before projection. Add clone, reflected-symbol, relabelled-viewer, altered-purpose, altered-digest, wrong-viewer, revoked, and missing-source negative tests.

### FA-CONF-004 — hostile local diagnostics preserve arbitrary incident prose

**VERIFIED FACT:** canonical diagnostic creation maps a closed `summaryCode` to repository-owned prose. On browser-storage ingress, however, `cloneLocalDiagnostics` accepts any string up to 240 bytes as `safeSummary` (`apps/web/src/feedback.ts:259-297`). `cloneReport` sanitizes `text` but passes diagnostics only through that structural clone (`:440-488`). `LocalFeedbackQueue.list` then rewrites accepted records to storage (`:500-524`).

The focused falsification created a valid local report, changed only the stored incident's `safeSummary` to a synthetic credential-pattern canary, and listed the hostile queue. Exact result:

```json
{"accepted":true,"canaryRetained":true,"rewrittenStorageRetainsCanary":true}
```

**INFERENCE:** FA-DP-001 is closed at trusted recorder creation but reopened at the explicitly untrusted browser-storage boundary, and FA-DP-005 is not closed. The default UI has no upload route, which bounds immediate exposure, but it promises that included diagnostics never contain credentials and preserves the hostile bytes for any future local preview/export/relay composition.

**Required closure:** derive `safeSummary` again from the accepted `summaryCode`, or reject/drop any noncanonical pair; do not trust stored summary prose. Add credential/contact/private-state canaries in every allowed diagnostics string field and prove queue listing removes the entire hostile record or emits only canonical text.

### FA-CONF-005 — the Standard Brain comparison matrix remains non-proving

**VERIFIED FACT:** `reactive-nearest-need` never reads needs. Its implementation explicitly matches `counselAffinity` first and otherwise selects the lowest-risk action (`packages/cognition/src/standard-brain-controls.ts:62-72`). In the frozen verify context it selected the counsel-matching verify action, while canonical trajectory selected follow-plan and seeded random selected accuse.

`tests/unit/systems/cognition.test.ts:137-207` exercises only one context. It asserts the policy-name list, at least two aggregate action kinds, five ablation objects, and that every ablated action is legal. It does not assert the predeclared perturbation matrix, control independence, expected action/explanation differences, or post-command terminal vectors. A focused probe showed all five ablations selected `VerifyReserve` with disposition `accepted`; the standing-plan ablation removed no selected term in that context.

**INFERENCE:** the core Standard Brain is deterministic, state-grounded in tested cases, transfers to a Sela-owned fixture, and can change action under other perturbations. Those affirmative facts do not establish the authority's required comparison against a real nearest-need control and five causal ablations. FA-COG-R-001 remains P1 research/acceptance overclaim, not a canonical-authority defect.

**Required closure:** implement a control that actually responds to the actor's nearest urgent need, freeze a multi-context control/ablation matrix, assert predeclared action and explanation differences, apply accepted actions through the normal command path, and compare at least three terminal world-head/state vectors. A test that only proves legality cannot close this finding.

### FA-CONF-006 — fail-closed Planner deferral is contradicted by a retained completion claim

**VERIFIED FACT:** the repaired evaluator always returns `eligible:false`, with `defer-no-candidate` when no candidate exists and `reject-candidate` when caller-supplied candidate observations exist. `docs/engineering/COGNITION.md` correctly says the smoke corpus does not derive goal completion or hidden equivalence from terminal state and makes no scenario-goal-completion claim.

The active ExecPlan nevertheless says Standard Brain “completed 52 scenario goals” at `docs/exec-plans/active/002-founder-alpha.md:223`, and its evidence index says self-attested claims were removed at `:259`. The benchmark test still manufactures `goalCompleted` from the case kind, although the repaired evaluator correctly excludes the value from eligibility and reports null completion totals.

**INFERENCE:** the executable deferral itself is fail-closed and no Planner/model ships, but the disposition's claim that self-attested completion claims were removed is false in an active release authority. FA-COG-R-002 therefore remains a P1 evidence-integrity defect.

**Required closure:** remove or explicitly retract the 52-goal sentence and keep only the supported legality, byte-repeatability, hidden-pair byte equality, and promotion-disabled results. Do not restore a completion count until a trusted runner applies actions and derives terminal predicates.

### FA-CONF-007 — experiment results do not prove the run declared by the manifest

**VERIFIED FACT:** `ExperimentManifestV2` and `ExperimentResultV2` are now separate, hash-checked records, and the journal enforces manifest-before-result, sequence, ID collision, tamper, and retry behavior. However, the manifest sorts context hashes and seeds rather than preserving declared execution order (`packages/cognition/src/experiment.ts:486-515`). A result contains only one aggregate output hash, aggregate invocation count, latency array, and invariant list (`:141-165,539-624`); it has no context, seed, repetition, proposal, or terminal-vector identity. The journal checks only result hash, committed manifest hash, result ID, and sequence (`:643-680`).

The repository's own fixture declares two contexts, two seeds, and five repetitions (20 planned combinations), then accepts one `completed` result with 640 adapter invocations and two latency samples (`tests/unit/cognition/experiment.test.ts:141-216`). An independent probe reproduced that acceptance:

```json
{"plannedCombinations":20,"acceptedCompletedRecords":1,"adapterInvocations":640,"latencySamples":2,"contextOrderAfterCreate":["bbbb…","cccc…"],"seedOrderAfterCreate":[3,7]}
```

**INFERENCE:** the split fixes the original post-run-manifest conflation, and the journal remains noncanonical with no reducer path. It does not close the original requirement to preserve exact ordered context/seed/repetition identity, bind measured proposal/output/invariant evidence, reject incomplete runs, and prove a complete corpus run. FA-COG-R-004 remains P1 research integrity debt.

**Required closure:** give every planned execution a stable manifest-bound ordinal and exact context/seed/repetition identity; record per-execution proposal/output/terminal/invariant/latency evidence; derive actual invocation and completion counts; and reject missing, duplicate, reordered, or extraneous executions. Add incomplete and exact complete-run tests.

## Frozen identity, ancestry, and change surface

| Item | Confirmed value |
|---|---|
| Reviewed commit | `d9f7c20ce2d7439c0886adfd7603f4eab5af1fcb` |
| Reviewed tree | `1b281f9a1b57c6da2583900ffa3f1ffd6d8f6efa` |
| Annotated tag | `founder-alpha-confirmation-candidate-1` |
| Annotated tag object | `c465b964702c0d02966326a6bee458de96dd3e97` |
| Tag target | exact reviewed commit and tree above |
| Parent | `cb535f417f88c7748df9ba43f020f6df977b2825` |
| Original six-review target | `7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`, tree `476c381034ab3601746a7e11235fe693d793782c` |
| Ancestry | original six-review target is an ancestor; merge base equals that exact commit |
| Confirmation branch/worktree | `review/fa-confirmation`; `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/002-confirmation` |
| Runtime | Node `v22.23.1`, `arm64`; pnpm `11.15.1`; host `darwin 25.6.0 arm64` |

**VERIFIED FACT:** the original-to-confirmation range changes 80 files with 6,777 insertions and 1,056 deletions. The inspected repair sequence was:

| Commit | Intended change surface |
|---|---|
| `a0c6d03` | stale/idempotent publish, unsupported replay versions, and related-event correctness |
| `2166d37` | Gitleaks, formal identity, PR/DEEP lattice, and persistence evidence |
| `d3915bc` | relay lease/quota/retention, diagnostic summaries, safe-stop, and hostile local storage |
| `b64531f` | Standard Brain controls, Planner deferral, adapter removal, experiment split, and Observatory authorization |
| `7a1ba77` | authority alignment |
| `2d5f511` | mobile, focus, semantic fallback, visual lexicon, motion, text, contrast, and touch |
| `ab6e420` | default accuse rejection and delayed typed consequences |
| `cb535f4` | browser regression for independent counsel |
| `d9f7c20` | shared disposition table and final candidate freeze |

All product/code inspection and execution occurred at the exact reviewed commit before this report was added. No product, test, workflow, shared authority, credential, provider, deployment, or remote state was edited.

## Method

1. Read `docs/INDEX.md`, then all six frozen review files in full.
2. Read every P0/P1 row in the Founder Alpha reconciliation and the related authority text.
3. Verified the annotated tag object, commit/tree, original-review ancestry, ordered repair commits, and complete name/status/stat change surface.
4. Inspected the actual transition/replay/runtime, persistence, diagnostics, feedback/relay, cognition/evaluation/experiment, Observatory, React/CSS/fallback, CI, formal, secret-scan, and evidence code plus the direct tests.
5. Ran the complete PR tier and focused fail-closed/falsification probes under pinned Node 22.23.1 arm64.
6. Kept human, physical-device, actual browser-UI zoom, screen-reader, live-provider, model, deployment, and remote-CI evidence out of technical PASS claims.

## Every frozen P0/P1 disposition

“Closed” below means the P0/P1 mechanism and its direct acceptance were confirmed in the inspected scope. A closed automated mechanism does not imply a human or live-system result.

| Frozen finding | Confirmation status | Evidence boundary |
|---|---|---|
| FA-CI-001 (P0) | **CLOSED** | Gitleaks 8.30.1 scanned all 162 commits with the exact path-and-fingerprint exception; adjacent synthetic credential probe still failed as required. |
| FA-CI-002 (P1) | **CLOSED** | Correct digest ran TLC; wrong and missing JARs exited nonzero before Java/model acceptance. |
| FA-CI-003 (P1) | **REOPENED** | FA-CONF-001 and FA-CONF-002: DEEP browser comparison is stale; PR browser/artifact identity is split. |
| FA-CI-004 (P1) | **CLOSED** | Real Memory/IndexedDB benchmark passed pinned cohort; forced IndexedDB failure emitted `FAIL` and exited nonzero. |
| FA-SYS-001 (P1) | **CLOSED** | Atomic expired-incident/global-lease takeover and live-lease exclusion are implemented and directly tested. |
| FA-SYS-002 (P1) | **CLOSED IN TESTED CORE** | HMAC source quotas, global/fingerprint caps, seven-/30-day cleanup, live-lease exclusion, and cleanup outage fail-closure passed fake-D1 tests. Live D1 is `NOT_RUN`. |
| FA-SYS-003 (P1) | **CLOSED** | Application compares durable commit result to prepared head/receipt and safe-stops divergence; runtime crash/idempotency tests passed. |
| FA-SYS-004 (P1) | **CLOSED** | Snapshot/manifest/header/event/engine/schema and outer/data identity validate before replay/fence; unsupported versions reject. |
| FA-SYS-005 (P1) | **CLOSED** | Return response requires same run/region, prior cognition event, exact branch kind/reason; transition and replay reject bad/dangling references. |
| FA-DP-001 (P1) | **REOPENED AT STORAGE INGRESS** | Trusted recorder summaries are closed, but FA-CONF-004 admits arbitrary stored `safeSummary` prose. |
| FA-DP-002 (P1) | **CLOSED** | Injected raw worker failure renders only safe stop copy plus incident ID and local report action; credential/private-state canaries were absent from DOM. |
| FA-DP-003 (P1) | **CLOSED IN TESTED CORE** | Relay staging/counter/dedup cleanup and live-lease protection are implemented; live provider/D1 retention is `NOT_RUN`. |
| FA-DP-004 (P1) | **CLOSED IN TESTED CORE** | HMAC-keyed source-hour/day quotas enforce 5/10; missing source/HMAC capability fails closed; no raw source is stored in tested repository rows. |
| FA-DP-005 (P1) | **REOPENED** | Count/date/total-byte/attachment/schema bounds work, but FA-CONF-004 proves an allowed nested diagnostics field remains hostile. |
| FA-VA-P1-001 | **CLOSED AUTOMATICALLY** | 390×844 CTA intersects initial viewport, world remains at least 55%, peek stays within 35%, and no horizontal overflow. Human findability is `NOT_RUN`. |
| FA-VA-P1-002 | **MITIGATED AS DECLARED** | 16/14 px tested floors and deterministic equivalent reflow pass. Actual browser-UI 200% zoom remains `NOT_RUN`, not PASS. |
| FA-VA-P1-003 | **CLOSED AUTOMATICALLY** | Complete keyboard path, distinct counsel focus, heading-first modal focus, inert background, scroll lock, trap, Escape, and invoker restore pass. Screen reader is `NOT_RUN`. |
| FA-VA-P1-004 | **CLOSED** | Remembered manual words view and injected renderer-failure fallback complete the full loop without canvas. |
| FA-VA-P1-005 | **CLOSED TECHNICALLY** | Eight differentiated stable silhouettes/props and named Toma–Iven exchange plus semantic rows exist. Unfamiliar-human recognition is `NOT_RUN`. |
| FA-VA-P1-006 | **CLOSED** | Manual reduced motion persists and sets root scroll behavior to `auto`; critical manual navigation remains available. |
| FA-VA-P1-007 | **CLOSED IN TESTED PALETTE** | Fact/belief/claim badges compute at least 4.5:1 and forced-colors focus remains visible. Full forced-colors journey is `NOT_RUN`. |
| FA-COG-R-001 | **REOPENED** | FA-CONF-005: named nearest-need behavior and the required control/ablation/terminal matrix are not established. |
| FA-COG-R-002 | **REOPENED AS CLAIM** | Promotion code fails closed, but FA-CONF-006 leaves the unsupported 52-goal claim in the active ExecPlan. |
| FA-COG-R-003 | **CLOSED BY REMOVAL** | Only type-level `BrainPort`/local-process descriptor remains; no executable adapter/deadline/fallback/model path exists. Future adapter behavior is `NOT_RUN`. |
| FA-COG-R-004 | **REOPENED** | FA-CONF-007: split/journal mechanics exist, but declared execution identity and completeness are not enforced. |
| FA-COG-R-005 | **REOPENED** | FA-CONF-003: symbol-branded artifact is forgeable and digest binding is not revalidated. |
| FA-PRODUCT-P1-001 | **CLOSED AUTOMATICALLY** | Same mobile geometry result as VA-P1-001; unfamiliar-human action discovery remains `NOT_RUN`. |
| FA-PRODUCT-P1-002 | **CLOSED TECHNICALLY** | Same counsel frame contains exact mismatch, values, plan, relationship, uncertainty, local-save boundary, three choices, and stakes. Human comprehension is `NOT_RUN`. |
| FA-PRODUCT-P1-003 | **CLOSED TECHNICALLY** | Default accuse counsel deterministically selects `FollowStandingPlan`, disposition `rejected`, from visible plan/commitment/trust/evidence terms without a tie or random draw; browser requested/chosen actions differ. Player-perceived independence remains `NOT_RUN`. |
| FA-PRODUCT-P1-004 | **CLOSED** | Every counsel resolution advances six hours. Verify causes sourced belief then trust/strain change; accuse causes allegation then trust/petition change; follow-plan adds one causally independent petition endorsement with temporal-only relations. |

## P2 and disposition cross-check

| Frozen P2 area | Confirmation |
|---|---|
| FA-CI-005 | Duplicate conditional cognition rerun was removed, but FAST remains the full unit suite while current testing prose calls it focused; retain as P2 maintenance/evidence granularity. |
| FA-SYS-006 | **Escalated through FA-CONF-003** because the new authorization brand can be forged, not merely caller-mislabelled before minting. |
| FA-SYS-007 | **Escalated through FA-CONF-004** because hostile stored diagnostics retain a credential-pattern canary despite other queue bounds. |
| FA-DP-006 / FA-DP-007 | Build/schema-bound fingerprints and explicit capability states are present and tested. |
| FA-VA-P2-001 | Tested 44×44 minimum includes the mobile brand/home link and named controls. Physical touch remains `NOT_RUN`. |
| FA-PRODUCT-P2-001 | Plain-language copy improved, but unfamiliar-human competition between story and proof vocabulary remains `NOT_RUN`. |
| FA-PRODUCT-P2-002 | Exact `00:00` / `00:06` / `00:12` Story Card timing is repaired; disposable rehearsal remains an operational procedure, not a product claim. |
| FA-PRODUCT-P2-003 | Default action says save locally; upload is visibly unavailable and disabled. |

## Affirmative authority and boundary results

### Reality, default accuse, consequence, and causality

- **VERIFIED FACT:** the application invokes Standard Brain directly and validates/commits its known action; experiments and Observatory are not application write dependencies.
- **VERIFIED FACT:** default public-accusation counsel is genuinely rejected from the frozen visible state. Plan continuation contributes 2,000, visible commitment 800, relationship/trust and plan evidence contribute additional grounded terms, and counsel contributes 2,000; `FollowStandingPlan` wins without tie-breaking.
- **VERIFIED FACT:** `ResolveCounsel` emits `TimeAdvanced(21_600)` before each later consequence. The verify relationship event has the sourced belief as a direct causal parent; accuse relationship/petition events point to the public statement; follow-plan's independent petition has zero causal parents and only temporal predecessors.
- **VERIFIED FACT:** runtime presentation reads committed events/state, and return actions resolve only an exact prior branch consequence. Canonical replay consumes preserved typed batches/events and does not invoke cognition.

### CI, formal, secrets, and persistence

- **VERIFIED FACT:** full-history Gitleaks and its neighbor probe pass, so the original P0 is closed.
- **VERIFIED FACT:** the repository-pinned TLC SHA-256 is enforced before execution. The accepted JAR produced 3,480 generated / 350 distinct states, depth 10, and all five named invariants; missing and wrong bytes fail closed.
- **VERIFIED FACT:** the real persistence benchmark bound the exact commit, clean source, lockfile/source manifest, Chrome 151 launcher hash, five Memory samples, and five IndexedDB samples and returned PASS. Forced IndexedDB failure returned FAIL/nonzero.
- **VERIFIED FACT:** `pnpm verify:pr` returned PASS from one clean unchanged source state, but FA-CONF-002 limits what its artifact/browser evidence proves. The DEEP tier is not green because FA-CONF-001 is directly reproducible.

### Privacy, relay, and Observatory

- **VERIFIED FACT:** the default browser says feedback is local-only, has no upload route, and the 16-journey network oracle recorded zero external attempts.
- **VERIFIED FACT:** the relay core has exact origin/method/content-type/schema/byte checks, Turnstile verification port, fixed repository, HMAC source buckets, atomic D1 quotas/leases/dedup, staged-payload cleanup, and safe outage behavior in fakes.
- **VERIFIED FACT:** no Worker binding, deployment manifest/script, credential, public URL, provider call, or composed relay entered this confirmation. Live behavior is `NOT_RUN`.
- **VERIFIED FACT:** Observatory has no reducer import/write path and its JSON-LD validator fails closed on remote context, duplicate ID, dangling references, bytes, nodes, and closed shapes. FA-CONF-003 is specifically the preceding authorization-mint boundary.

### Mobile, accessibility, and semantic fallback

- **VERIFIED FACT:** 16 Playwright journeys passed the required mobile geometry, text floors, counsel grounding, contrast, forced-color focus check, keyboard/dialog behavior, semantic/list fallback, renderer-failure completion, reduced motion, touch targets, persistence/recovery, feedback, and zero-egress assertions.
- **VERIFIED FACT:** the retained headful evidence honestly calls CDP metrics a 200%-equivalent reflow and marks direct browser-UI zoom, screen reader, physical device, and human comprehension `NOT_RUN`.
- **INFERENCE:** automated layout/accessibility acceptance is materially stronger than the frozen review state, but it is not human recognition, assistive-technology, or physical-device evidence.

## Executed commands and exact results

All commands below used `PATH=/Users/pranav/.nvm/versions/node/v22.23.1/bin:$PATH` unless the binary is named explicitly.

| Command or probe | Result at frozen target |
|---|---|
| `node scripts/check-runtime.mjs` | PASS — Node 22.23.1 arm64, pnpm 11.15.1. |
| `TLA2TOOLS_JAR=/tmp/.../tla2tools.jar pnpm verify:pr` | PASS — clean/unchanged exact source; 152 unit tests, two PR property tests, real Chromium IndexedDB reload, one 20/200 timing test, production build/budgets, zero production audit findings, 16 Playwright journeys, 633 routed requests, 69,695 netlog events, zero external attempts, and bounded TLC. Tier output SHA-256 `1f8b73b1beedc45f89843f6f319a41d160bd1b891edf38485cce28b1eb8b33f8`. FA-CONF-002 limits artifact identity. |
| `pnpm test:property:deep` | PASS — two deep-profile properties, 500/320 deterministic profile. |
| `pnpm test:mutation` | PASS — 64 tests; all 8/8 targeted mutants killed. |
| `node scripts/benchmark-diagnostics.mjs --output /tmp/eonfolk-fa-diagnostics-source.json` | PASS — seven repetitions per OFF/LOCAL/ALPHA source workload; explicitly not an integrated browser/physical result. |
| `node scripts/benchmark-diagnostics-browser.mjs --output /tmp/eonfolk-fa-diagnostics-browser.json` | **FAIL** — timeout waiting for stale **Reach the counsel boundary** selector before completing OFF, LOCAL, ALPHA. |
| `node scripts/benchmark-persistence.mjs --output /tmp/eonfolk-fa-persistence.json` | PASS — clean/stable source, pinned browser accepted, 5 Memory and 5 IndexedDB samples, output SHA-256 `02ce24efcedd3df80dc98f65dacd7de34c26d190dcf56dd8bdb09a65c1420d1c`. |
| `node scripts/benchmark-persistence.mjs --force-indexeddb-failure --output /tmp/eonfolk-fa-persistence-forced-fail.json` | Expected FAIL/nonzero — `indexedDbAvailable:false`, `indexedDbSamples:false`. |
| `/opt/homebrew/bin/gitleaks git --no-banner --redact --exit-code 1 --config .gitleaks.toml --log-opts=--all .` | PASS — 162 commits, no leak. |
| `GITLEAKS_BIN=/opt/homebrew/bin/gitleaks node scripts/check-gitleaks-neighbor.mjs` | PASS — `GITLEAKS_NEIGHBOR_SECRET_REJECTED`. |
| Correct pinned `pnpm test:formal` | PASS — accepted SHA-256 `eabd140a70f49eb9305a3bd3f3df944eddf87e5a90d329789085f8953a80533a`; 3,480/350 states; depth 10. |
| `TLA2TOOLS_JAR=package.json pnpm test:formal` | Expected FAIL/nonzero — `TOOL_IDENTITY_MISMATCH` before Java. |
| `env -u TLA2TOOLS_JAR pnpm test:formal` | Expected FAIL/nonzero — `TOOL_UNAVAILABLE`. |
| Focused runtime/systems/persistence Vitest group | PASS — 50 tests in 5 files. |
| Focused diagnostics/web-feedback/worker/D1 Vitest group | PASS — 51 tests in 7 files. |
| Focused cognition/experiment/Observatory Vitest group | PASS — 23 tests in 4 files. |
| Focused CI/evidence-script Vitest group | PASS — 10 tests in 2 files. |
| `pnpm test:e2e` plus `node scripts/validate-web-network.mjs` | PASS — 16/16 journeys; 633 routed requests; 69,732 events in the standalone netlog run; zero external attempts. |
| Observatory reflected-brand Vite-SSR probe | **FALSIFIED** — forged public artifact accepted and `PRIVATE_CANARY` emitted. |
| Hostile local-storage Vite-SSR probe | **FALSIFIED** — credential-pattern `safeSummary` accepted, returned, and rewritten. |
| Control/ablation Vite-SSR probe | **FALSIFIED acceptance claim** — named reactive control followed counsel, not needs; five ablations kept the same action/disposition in the only tested matrix context. |
| Experiment-completeness Vite-SSR probe | **FALSIFIED acceptance claim** — one completed result accepted for a 20-combination manifest with arbitrary 640 invocations/two samples. |
| Production/test-bundle comparison (`pnpm build`, marker scan, PR manifest inspection) | **FALSIFIED exact artifact claim** — production and E2E bundle filenames/bytes differ; only the latter contains crash hooks and is recorded after PR. |

The focused Vitest commands were:

```text
pnpm exec vitest run apps/web/src/authoritative-runtime.test.ts tests/unit/systems/branches.test.ts tests/unit/systems/simulation.test.ts tests/unit/systems/properties.test.ts tests/unit/persistence --reporter=verbose

pnpm exec vitest run apps/web/src/diagnostics.test.ts apps/web/src/feedback.test.ts tests/unit/diagnostics tests/unit/feedback-worker --reporter=verbose

pnpm exec vitest run tests/unit/systems/cognition.test.ts tests/unit/cognition tests/unit/observatory --reporter=verbose

pnpm exec vitest run tests/unit/scripts/ci-evidence.test.ts tests/unit/scripts/evidence-scripts.test.ts --reporter=verbose
```

## Explicit NOT_RUN and non-inference boundary

- Complete `pnpm verify:deep`: **NOT_RUN AS A WHOLE** after its direct gating browser-comparison constituent failed. No DEEP PASS is inferred from PR, deep property, mutation, source diagnostics, or persistence parts.
- Canonical headed 15-run performance battery: **NOT_RUN** in this confirmation.
- GitHub-hosted Actions at the target, branch protection/rulesets/security features, artifact rerun/retention, and remote repository state: **NOT_RUN**.
- Actual browser-UI 200% zoom shortcut/control: **NOT_RUN**; CDP equivalent reflow is not relabelled.
- Screen-reader journey, full forced-colors journey, physical mobile device, safe areas, touch behavior, thermal/power behavior, and real weak-device renderer fallback: **NOT_RUN**.
- Gate 0/A/B, Story Card comprehension, action findability, character/action recognition, perceived independence, attachment, return intent, fun, and all unfamiliar-human judgments: **NOT_RUN**.
- Live Cloudflare Worker/D1/Turnstile/GitHub App composition, real quotas/retention/log defaults, public abuse, provider reliability, credential flow, deployment, publication, and spend: **NOT_RUN**.
- Planner candidate, local model, provider model, weights, subprocess execution, model timeout/cancellation/fallback, model quality, model zero-egress, training, and inference cost: **NOT_RUN**.
- External Observatory consumer, full PROV-O/SHACL interoperability, RDF round-trip, and real research inquiry: **NOT_RUN**.

No human, device, provider, model, deployment, or remote-CI result was inferred from source, unit tests, browser emulation, or local fakes.

## Final disposition

**FAIL.** The immutable target has zero confirmed residual/new P0, but FA-CONF-001 through FA-CONF-007 are unmitigated P1 findings. Founder Alpha is therefore not technically confirmed and this report supplies no merge, deployment, publication, spend, credential, provider, or human-gate authorization.
