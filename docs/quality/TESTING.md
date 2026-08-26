# Testing and CI contract

**Purpose:** define blocking test layers, PR/nightly CI, dependency updates, repository protections, security-feature probes, and artifact retention.

**Status:** V1 LATTICE BINDING — Founder Alpha mega PR #7 is historical; current identity and CI hardening must pass this protected lattice before V1 mega-PR integration

**Authority boundary:** owns when checks run and what CI/repository policy must enforce. Exact product outcomes are owned by [quality bar](QUALITY_BAR.md); model rubrics by [evals](EVALS.md); screenshots by [visual QA](VISUAL_QA.md).

**Related documents:** [quality bar](QUALITY_BAR.md), [evals](EVALS.md), [visual QA](VISUAL_QA.md), [simulation](../engineering/SIMULATION.md), [persistence](../engineering/PERSISTENCE.md), [security](../engineering/SECURITY.md)

## Owned decision

Every relevant implementation PR runs a short, blocking baseline. Expensive horizons and matrices run manually at milestones. The repository uses a PR-based solo-maintainer workflow with no automatic merges and no invented enterprise ceremony. `.github/workflows/ci.yml` implements Verify, Formal model, and Secret scan jobs with actions pinned by commit SHA. Verify also downloads checksum-pinned actionlint 1.7.12 and rejects invalid workflow expressions or shell contracts before the product lattice starts [S-FA-PLATFORM-024].

The exact local baseline is `pnpm verify`. At `4a677a743d4efcdc337c6ffc0c79d63edee69e8f` it passed 63 unit tests, two property tests, a real Chromium IndexedDB reload test, the fixed 20-warmup/200-cycle decision-trace timing analyzer, build/bundle checks, production dependency audit, eight Playwright journeys, 334 routed requests and 36,489 Chromium-netlog events with zero external attempts, and bounded TLC model checking (3,480 generated/350 distinct states, depth 10, five invariants). Gitleaks 8.30.1 separately scanned all then-existing local history with no leaks. Pushed candidate `7d857a216cb9fbd76f2a0afd64418822a84b9a2e` passed GitHub Verify, Formal model, and full-history Secret scan in [run 32481390293](https://github.com/PranavMishra28/eonfolk/actions/runs/32481390293). The [review reconciliation](../reviews/IMPLEMENTATION_FINAL_REVIEW.md) states what this does not prove.

Final implementation head `f818d1069401a1f8e14d2ca6badec29841afbd81` passed protected GitHub `Verify`, `Formal model`, and full-history `Secret scan` in [run 32559456985](https://github.com/PranavMishra28/eonfolk/actions/runs/32559456985). Its Linux PR manifest recorded nineteen passing constituents, including two semantic injected-fault journeys, fourteen semantic product journeys, and a real trace-free PlayCanvas/WebGL2 renderer smoke at all three required viewports. The same exact clean source then completed target-Mac `pnpm verify:deep`: **26/26** ordered constituents passed with unchanged source/lockfile, **191 tests in 23 files**, all sixteen illustrated production journeys, all deep-only profiles, and output SHA-256 `21e85a3e875ca79d0d6e31b25d4ba19f1c871bb6c22c780cf777ba877cfb689d`. This closes historical implementation-head local and remote verification. The current identity, browser-cohort portability, run-surface, and CI-workflow candidate must receive fresh exact-head local and protected remote evidence before merge.

## Blocking PR baseline

Run, in order where fail-fast saves time:

1. formatting and lint;
2. strict TypeScript typecheck;
3. unit tests;
4. deterministic simulation and replay tests;
5. property/model-based smoke tests and bounded fuzzing;
6. production build;
7. critical Playwright journey: first launch -> Follow Mara -> state-changing investigation -> observe interaction -> advise/abstain -> branch consequence -> leave/reload/confirm catch-up -> Chronicle -> outcome-dependent second action.

All commands are pinned in the implementation repository and runnable locally. CI cannot use `@latest` or an unpinned global Playwright. Test fixtures specify seed, engine/schema versions, browser, expected hashes, and time budget.

## Conditional checks

When cognition, Mind schemas, proposal validators, or Standard Brain change, run:

- proposal schema and unknown-field bounds;
- authorization, stale revision, hidden-fact, injection, and partial-mutation fixtures;
- observation/knowledge/belief/memory/message-claim separation and provenance closure;
- raw cognitive decision-record hash/context/plan/proposal/validation/receipt/event link integrity plus filtered trace authorization/nonexposure;
- recursive proposal closure, byte/depth/count bounds, reference authorization, authored-template/hash checks, and Standard Brain-only liveness;
- perturbation, transfer, baseline, ablation, hidden-fact noninterference, and fixed behavior regressions.

The V1 macOS local-process host now makes hung/late/cancel/process-kill, malformed/absence, exact contract/artifact/runtime/prompt binding, child-process egress denial, and deterministic fallback mandatory on the target Mac. Linux CI compiles and property-tests the provider-neutral boundary but cannot substitute for the native sandbox subprocess tests. Provider-specific 429/revocation checks remain conditional on a hosted provider, which V1 does not require. The bounded Ollama adapter and promoted local technical treatment are executable only on the target Mac; neither is a browser route, onboarding dependency, or canonical authority. The exact 100-decision evidence is [retained here](../exec-plans/evidence/002/local-model-treatment.json).

When a major UI, renderer, asset, layout, motion, or design-token change occurs, capture deterministic desktop, laptop, and mobile screenshots, inspect them, and retain failing traces where practical. Screenshot pixel comparison is a diagnostic, not the sole visual reviewer.

## Test layers

| Layer | Blocking evidence |
|---|---|
| Protocol/schema | run-scoped world/batch/cognitive/experiment record round-trip, manifest/context/catalog/proposal/decision hash domains, unknown/version failure, byte/depth/range bounds |
| Reducer/unit | one event transition, no partial mutation, invariant checks |
| Determinism | repeated seed/commands, canonical bytes/hash, PRNG and equal-time ordering |
| Replay/persistence | atomic genesis/collision; half-open batch+event range/snapshot convergence with cognition disabled; zero-event range; batch/event gaps; corrupt state/world-head/hash; durable-before-visible world/decision crash barriers; first and second counsel commit-barrier recovery with exactly one issued counsel and hash-bound visible receipt; accepted 1–32-event state chain with prior revision on non-final states and one final increment; event command/intervention/decision/proposal provenance binding; rejected unchanged state/head/PRNG; accepted/rejected receipts; immutable Experiment Manifest; raw decision trace closure and filtered projection; ID/hash collision; closed catch-up parent receipt plus idempotent begin/exact-next atomic chapter-progress resume; quota abort; typed stale fencing without canonical-head change |
| Property/model/fuzz | random legal/illegal run-scoped command sequences preserve resources, ownership, life, visibility, epistemic separation, decision/world-ledger authority, batch/event state chaining, and revision rules |
| Version policy | current version identity load; unknown/old version fails closed without mutation; no V1 upcaster/import route |
| Long horizon | 30/90/365-day worlds reach exact target under declared caps; conservation, bounded events/storage, interrupt/resume equivalence, no LLM |
| Browser journey | account-free Follow Mara, investigation, interaction, three advice branches, leave/confirmed catch-up, Chronicle/replay, second action |
| Accessibility | keyboard-only path, semantic names/states, focus, reduced motion, text equivalents, fallback view |
| Security | static `riverhold-visibility-v1` oracle versus separate production function across every viewer/purpose/label/grant/revoke boundary; private-parent/disclosure metamorphs; raw decision/full-preimage-hash nonexposure and filtered trace checks; identical hidden/missing/revoked surfaces plus shared constant-work path and frozen 20-warmup/200-cycle/50 ms/≤5 ms/no-selective-rerun timing analyzer; hostile text/oversize; wrong-run/duplicate/stale/fenced writes; fake BrainPort; secret/backup/export/import absence; deny-by-default local preview with independent route log + Chromium netlog and zero attempted external egress |

Snapshot replay is exercised from every persisted snapshot in golden scenarios. Chunk boundaries vary. The test oracle never calls a model/Standard Brain or depends on current date/locale/network. It verifies the original structured proposal separately as audit evidence rather than regenerating it.

## PR versus nightly/manual

Keep PR CI short enough for a solo loop. Use small seed sets and bounded fuzzing on PRs. Run these nightly or manually before a milestone:

- larger fuzz/model-based seed corpus;
- 30/90/365-day matrix and event/storage profiling;
- current/unknown version policy and future migration rehearsal only if an upcaster is later added;
- extended browser/device/browser matrix;
- capped cognition suite with any real optional provider;
- dependency/license/security scan and explicit no-backup/export/import route check;
- repeated independent-run/manifest analysis only after a real model or Observatory experiment is authorized;
- repeated performance profiles to identify variance.

A failed target-Mac DEEP run or manually requested portable Linux extended run blocks milestone acceptance even if it does not retroactively block an unrelated documentation PR. GitHub workflow dispatch exposes `pr` and `extended` tiers; the canonical browser-cohort/performance DEEP remains a local target-Mac command. Remote extended evidence is intentional rather than scheduled so the private solo repository does not consume hosted minutes without a milestone decision.

## Founder Alpha verification lattice

- **FAST:** runtime/cohort/architecture/docs/format/lint/typecheck plus focused unit/contract tests for changed packages.
- **PR:** FAST plus all unit/property tests, deterministic replay, fail-closed real IndexedDB evidence, timing, production build/budgets/audit, critical headed player journeys, zero-egress validation, diagnostic/feedback security tests, and the exact-digest bounded formal model.
- **DEEP:** 500-run/320-command deterministic property/fuzz profile; 30/90/365-day horizons; fail-closed persistence evidence; repeated source and browser OFF/LOCAL/ALPHA comparisons; full browser/accessibility/failure matrix; targeted mutation of Reality validation/reducer/persistence/redaction/Sentinel/feedback authorization; and cognition/ontology experiments when their code changes.

Each tier is a maintained command. A named but unimplemented or rejected check is removed from the promised surface. Results bind commit, environment, inputs, command, duration, pass/fail/not-run, and artifact hashes where material. A build or backend suite cannot substitute for a local game run and browser-visible evidence.

The browser stage separates **two explicitly test-only crash-injection journeys** from production acceptance. On Linux CI it runs the two faults and fourteen product journeys through the fully playable semantic world, then requires a trace-free production PlayCanvas/WebGL2 renderer smoke at 1728×1117, 1366×768, and 390×844. This split responds to measured SwiftShader-plus-tracing stalls; it does not claim the semantic suite visually exercised the renderer. The smoke proves real renderer readiness, containment, pixel ratio, eight-citizen projection/semantic parity, visible active work, desktop keyboard camera movement, and zero browser errors/egress. Target-Mac PR/DEEP keeps all **sixteen illustrated production journeys**, including cadence and spatial picking. Both environments rebuild with the exact production configuration and inspect the existing `dist`; the wrapper fails closed if `dist` is empty or retains either crash-injection marker. PR artifacts hash only inspected production files. DEEP manifests additionally admit only the four benchmark outputs produced by that tier, so stale files cannot enter acceptance.

The comparative browser diagnostics benchmark uses the current `Review Mara's choices` accessible control and runs the same arrival -> follow -> investigate -> counsel -> leave/return -> Chronicle path in OFF, LOCAL, and ALPHA builds. A dirty-tree `--smoke-only` run may prove path execution but cannot satisfy DEEP acceptance; only the clean-tree command can return `PASS`.

The v2 tier manifest is produced by the same declared step list that executes acceptance. PR records nineteen ordered constituent results; DEEP is that exact ordered prefix plus seven target-Mac DEEP-only results. The supplementary `portable-extended` tier is the same PR prefix plus targeted mutation and deep deterministic properties. It writes `tmp/eonfolk-verification-portable-extended.json` and states that it is neither target-Mac DEEP evidence nor V1 readiness evidence. Every row contains a stable ID, the executed command, duration, exit code, and PASS/FAIL status. Execution stops at the first failure and records no result for work it did not run. The check-only scripts delegate to these runner-owned lists so the executable sequence and evidence schema cannot drift.

The clean local DEEP run at `59edef3c768d9a3fe9409f07d77d49fded4b9554` passed all 26 ordered rows, but that invalidated historical Pixi candidate cannot release the PlayCanvas world. Release-valid exact final implementation head `f818d1069401a1f8e14d2ca6badec29841afbd81` passed the same 26-row lattice with 191 unit tests in 23 files, 8/8 targeted mutants, the 500-run/320-command property profile, two fault journeys, all sixteen illustrated production journeys, bounded TLC (3,480 generated/350 distinct states, depth 10, five invariants), exact browser-cohort validation, persistence/diagnostic measurements, and fifteen canonical performance journeys. Its protected remote run passed all three required jobs and retained accepted UI/manifest artifacts under the declared 30-day policy.

Cognition changes additionally prove schema/authorization, hidden-fact noninterference, Standard Brain-only liveness, replay without cognition, control/ablation/transfer behavior, planner-promotion fail-closure, pre-run experiment identity/result-journal isolation, and authorized Chronicle-to-Observatory projection. Provider timeout/malformed/fallback checks become mandatory only when an executable adapter exists. Major UI changes capture deterministic 1728×1117, 1366×768, and 390×844 evidence plus actual 200% browser zoom, keyboard/dialog focus, reduced motion, selectable semantic fallback, and failing traces where practical.

## Dependabot and updates

- Enable weekly grouped updates for npm and GitHub Actions.
- Maximum five open dependency PRs.
- No automatic merge.
- Separate security updates when urgent; inspect changelog, licenses, install scripts, lockfile, tests, and renderer/cognition effects.
- Major runtime/renderer/storage/model updates require their conditional suites and evidence refresh.
- Do not create an enterprise-style dependency committee or release train for one maintainer.

## Branch and ruleset strategy

Protect `main` with required blocking checks and prevent force-push/deletion where the personal private-repository/account capabilities permit. Do not require an external reviewer for the solo maintainer. Work through focused branches and PRs, inspect actual diffs, and never merge a red build.

Implementation may commit workflow/Dependabot files and document recommended settings, but does not enable features, call GitHub APIs, change protection/rulesets, push, or open a PR without separate explicit operator authorization. Capability is not mutation authority.

If private rulesets/branch protection are unavailable, record that exact capability result. Enforce the same PR-based workflow, evidence checklist, and local/CI commands as repository policy rather than claiming a protection exists.

## Repository security-feature probe

After repository creation and again before implementation, perform read-only probes against the exact private repo and record **available/enabled/unavailable/plan-gated** for:

- Actions allowance and permitted actions;
- rulesets and `main` branch protection;
- Dependabot alerts, security updates, and version updates;
- private-repository secret scanning and push protection;
- code scanning/default setup and security advisories.

Use the GitHub UI or scoped `gh api` reads for `repos/PranavMishra28/eonfolk`, its `rulesets`, `branches/main/protection`, Actions permissions, vulnerability alerts/automated security fixes, and code-security configuration. A 404/403 is evidence to record, not permission to assume absence or enable a paid feature.

If native secret scanning is unavailable, add one lightweight open-source secret scan during implementation only after its exact license, provenance, install behavior, baseline handling, and pinned version are reviewed. It must scan committed/PR changes without printing secrets.

### Actual private-repository probe — 2026-08-20

Read-only `gh api` requests against `PranavMishra28/eonfolk` produced this access-date state. “Disabled” is not upgraded to “unavailable” without an account-plan/settings check, and no setting was changed during planning.

| Capability | Observed API result | Planning consequence |
|---|---|---|
| Repository/privacy/default branch | Private; default branch `main` | Required baseline verified |
| Actions permissions | 200; enabled, all actions allowed, SHA pinning not required | Future CI is possible; pin actions explicitly and revisit allowed-actions scope during implementation |
| Repository rulesets | 200 with an empty list | API is accessible; no ruleset is configured. Probe an actual proposed ruleset before claiming enforcement |
| `main` branch protection | 404 `Branch not protected` | No protection exists today; future implementation must configure where allowed or document policy-only enforcement |
| Dependabot alerts | 403 with `Dependabot alerts are disabled` | Disabled; weekly version-update configuration and alerts require an implementation-time capability/settings check |
| Automated security fixes | 200; `enabled: false`, `paused: false` | Disabled; no automatic merge is desired, and security-update enablement remains a later explicit configuration |
| Secret scanning | 404 with `Secret scanning is disabled on this repository` | No native scanning protection may be claimed; recheck settings/plan, then use a reviewed pinned open-source CI scan if still unavailable/disabled |
| Push protection | No separate enabled state exposed; secret scanning is disabled and `security_and_analysis` was absent | Treat as not evidenced/disabled for planning; do not claim protection |
| Code scanning default setup | 403 with `Code scanning is not enabled` | Disabled; not required for the slice, and any later setup must be intentionally scoped |
| Private vulnerability reporting / advisories probe | 404; no enabled configuration established | Do not rely on it for V1 |

These observations satisfied the planning probe. A final read-only probe and any authorized best-effort protection mutation must be recorded after the repaired candidate is pushed; until then, local/CI policy—not a nonexistent protection—is the enforcement claim.

### Final private-repository probe and hardening — 2026-08-21

The operator override authorized best-effort repository hardening. The coordinator first pushed `7d857a2` and required all three Actions jobs to pass, then mutated only `main` protection. The post-mutation probe produced:

| Capability | Final observed state | Enforcement consequence |
|---|---|---|
| Repository/privacy/default branch | Private; default `main` | No public publication occurred |
| Actions permissions | Enabled; all actions allowed; platform SHA-pinning requirement false | Workflow actions remain repository-pinned; broader account allowance is not mistaken for pinning |
| Repository rulesets | API accessible; zero rulesets | Classic branch protection, not a ruleset, carries the controls |
| `main` protection | Enabled; strict `Verify`, `Formal model`, and `Secret scan`; administrator enforcement enabled | Stale or red required checks cannot satisfy protected `main` |
| Force-push/deletion | Both disabled | Main history and the branch ref cannot be rewritten/deleted through ordinary pushes |
| Dependabot version updates | Weekly grouped configuration active; PRs #3/#4 open; no automerge | Updates remain explicit review work |
| Vulnerability alerts | 404 disabled | No native alert coverage is claimed |
| Automated security fixes | Disabled/not paused | No automatic security merge is claimed |
| Secret scanning/push protection | Native secret scanning disabled; push protection not evidenced | Pinned Gitleaks 8.30.1 full-history CI is the active compensating control |
| Code scanning default setup | 403 not enabled | No CodeQL/default-setup coverage is claimed |
| Action maintenance | CI emitted Node-20 runtime and `setup-java` v4 deprecation notices | Non-blocking dependency-maintenance debt; Dependabot #3 is left for explicit diff/test review |

The obsolete implementation PR and its branches were cleaned only after green pushed-candidate CI and remote archive-tag verification. The two Dependabot PRs remain open/unmerged; no paid or plan-gated security feature was enabled.

### Current repository probe and CI hardening — 2026-08-22

A live REST, GraphQL, and `gh repo view` probe briefly found the repository public at 19:02 Pacific despite the private requirement. The coordinator immediately restored private visibility after verifying there was no Pages site and no fork, then re-probed the resulting state. This is a corrected privacy incident, not evidence that the repository remained private continuously.

The current repository is private with default `main`; no remote feature branch, open PR, deployment, environment, release, fork, or Pages site exists. Classic `main` protection requires strict `Verify`, `Formal model`, and `Secret scan`, enforces the rules for administrators, blocks force-push/deletion, and requires no outside approval. Actions are enabled with a read-only default token and repository-level SHA pinning required. Vulnerability alerts, Dependabot security updates, and automated security fixes are enabled; native private-repository secret scanning/push protection and code scanning remain disabled or unavailable, so checksum-pinned full-history Gitleaks remains the active secret control. Rulesets remain empty because classic protection supplies the required controls [S-FA-PLATFORM-025].

The workflow now classifies changes under the web app, every runtime package, end-to-end tests, the CI workflow itself, root dependency manifests, and Vite/Playwright configuration as renderer-relevant. Those changes receive the three-viewport evidence step. Workflow dispatch offers a manual `extended` Linux tier with a 45-minute fail-safe and 30-day accepted evidence / 14-day failure evidence; it reruns the protected PR baseline plus the portable mutation gate and expanded deterministic properties. Target-Mac persistence, diagnostics-browser, browser-cohort, and canonical performance measurements remain exclusively in local DEEP. The remote lane does not claim them and is not scheduled. Checksum-pinned actionlint runs inside protected `Verify`, so no extra required-status context or enterprise control is needed.

A fresh read-only probe after V1 checkpoint `5c7a497` reconfirmed: private/default `main`; zero rulesets; classic protection with strict `Verify`, `Formal model`, and `Secret scan`, administrator enforcement, and force-push/deletion disabled; Actions enabled with read-only default workflow permissions and repository SHA pinning required; vulnerability alerts reachable with zero open Dependabot alerts; native secret scanning still disabled; code scanning still not enabled. Full-history Gitleaks 8.30.1 and its neighboring-secret rejection both passed locally after one commit-and-path-specific bibliography false-positive classification. No security feature, ruleset, deployment, or paid capability was enabled by this probe.

### V1 frozen-candidate evidence operating procedure

All producer lanes are manual dispatches in the already registered `.github/workflows/ci.yml`; no second workflow or protected-main bootstrap is required. Evidence uses three pairwise-distinct commits: `initialReviewSha` is the source inspected by six reviewers, `frozenCandidateSha` is the reconciled software and immutable control, and the evidence commit adds only allowed evidence and structured review bytes. No tracked file embeds or predicts its own commit SHA. The evidence commit is derived from the immutable dispatch tag's live `GITHUB_SHA`, the checkout's actual `HEAD`, and—during premerge ready verification—the live PR head. Structured review and confirmation payloads bind the initial or frozen source SHA they actually inspected. The frozen control manifest binds exact Git blob IDs and mode `100644` for CI, evidence hashing/verifying/readiness, the 32-step DEEP runner and its hashed benchmark producers, dependency validation, and formal tooling. Finalizers freshly check out frozen control and the dispatch-tag target, reject changed control blobs or modes before reading inert evidence bytes, and never execute evidence-checkout code.

The repository variable `V1_EVIDENCE_RUN_IDS_JSON` may enumerate exactly eight final run IDs under `eonfolk-v1-evidence-run-ids-v1`; it is an index, never a trust assertion. Premerge ready CI derives the expected evidence commit from the exact PR head. A protected-main push derives that same commit as the non-main parent of the exact two-parent merge commit; it never reads a self-reference from repository bytes. The verifier queries GitHub and downloads artifacts into `RUNNER_TEMP`. It verifies owner/operator identity, merge-only settings, `delete_branch_on_merge=false`, immutable tag targets, successful manual producers, attempt-specific artifacts, CI workflow identity/path, source ancestry, hosted finalizers, archive and exact payload bytes, the purpose roster, immutable control blobs, reviewer payload hashes, and seven unique reviewer agent/session pairs. The workflow token uses only `actions: read` and `contents: read`; it never calls the administration-only repository-runners endpoint. Merge-method and delete-branch-on-merge policy is read from GraphQL (`mergeCommitAllowed`, `squashMergeAllowed`, `rebaseMergeAllowed`, `deleteBranchOnMerge`) because REST `GET /repos/{owner}/{repo}` omits those fields for this read-only token. A rerun leaves multiple attempt-specific evidence artifacts and therefore fails closed; use a fresh dispatch instead.

Pre-merge receipts are explicitly **candidate-controlled bootstrap evidence** (`PREMERGE_CANDIDATE_CONTROL`), not protected-main evidence. They can satisfy the one mega PR only because the final hosted job runs the freshly checked frozen control, the evidence checkout is inert, every later-consumed control blob is immutable and reverified live, and the frozen reviews include the CI/security design. This does not cryptographically establish reviewer cognition or protect against an already-malicious frozen workflow; exact human diff review remains a trust root. GitHub also cannot prove branch protection was continuously enabled at historical run time.

Target-Mac production is two-stage. First, an authorized administrator uses **System Settings → Users & Groups → Add User → Standard** to create a temporary `eonfolk-ci` account; the current interactive account is an administrator and noninteractive `sudo` is unavailable, so Codex cannot silently create this boundary. Enter that account either by GUI login or by an operator-authenticated interactive `sudo -u eonfolk-ci -i` login shell; both yield the account's real UID and real group membership, and neither is `sandbox-exec`. Confirm `id -u` is nonzero and that `dseditgroup -o checkmember -m "$(id -un)" admin` returns exactly `no <user> is NOT a member of admin` (macOS 26 and later) or `no <user> is NOT a member of group admin` (earlier releases); the check binds the exact runner user, so a bare suffix match is not sufficient. Download the GitHub-hosted runner and verify its published SHA-256 before extraction. Choose a unique 8–64 character nonce. Obtain the one-hour registration token either from the repository's **Settings → Actions → Runners → New self-hosted runner** page or from an authenticated `gh api -X POST repos/PranavMishra28/eonfolk/actions/runners/registration-token`, and pass it only to `./config.sh --url https://github.com/PranavMishra28/eonfolk --token <one-hour-token> --ephemeral --unattended --name eonfolk-deep-<nonce> --labels eonfolk-ephemeral-deep-<nonce>`, then run `./run.sh` as that standard user. Do not install a service or write the token to a file.

Before registration, the coordinator must run `gh api repos/PranavMishra28/eonfolk/actions/runners --jq '.total_count'` and observe zero. The first self-hosted step—before checkout or any action—requires the exact nonce-derived runner name, nonroot UID, an explicit `dseditgroup` query, and its exact nonmembership result. The command's exit status is not itself evidence: macOS 26 returns nonzero for a valid negative membership query, so the gate accepts only the exact user-bound output described above and rejects every other result. GitHub's actions-read jobs API later binds the successful job's positive runner ID, exact name, and exact sorted label set `ARM64`, `macOS`, `self-hosted`, and `eonfolk-ephemeral-deep-<nonce>`. No workflow step lists repository runners.

After the intermediate run, the coordinator repeats the external `gh` runner query and observes that the exact runner ID/name is absent. The canonical JSON is supplied to each target-Mac final producer through the bounded `runner_probe_json_base64` workflow input; it is not committed at the evidence SHA and cannot create another self-reference. The finalizer rejects noncanonical base64 or decoded bytes outside 96–8,192 bytes, validates the closed schema and canonical self-hash, and emits the exact bytes as a separate `mac-external-probe.json` artifact entry. Its receipt binds path, byte count, and raw SHA-256. Live verification downloads those independent bytes, validates their digest, and cross-checks repository, intermediate run/attempt, exact runner ID/name/nonce, zero-runner before-registration and absent-after-run observations, owner/operator, job metadata, and timestamp order. The boundary remains `COORDINATOR_RECORDED_GH_API_OBSERVATION_NOT_CRYPTOGRAPHIC`: this is procedural evidence, not a cryptographic claim that GitHub had no other runners. Delete the runner directory and temporary Standard account only after recording the second observation. `sandbox-exec` is not a substitute for OS-user separation.

Never dispatch by raw SHA. Create and push a lightweight `eonfolk-evidence-<nonce>` tag at `frozenCandidateSha`, then dispatch `target-mac-intermediate` with `gh workflow run ci.yml --ref eonfolk-evidence-<nonce> ...`; the hosted control preflight and later API verification require the tag target to equal `run.head_sha`. The Mac runs the exact 32-step DEEP and a clean hosted finalizer binds its exact raw payload bytes to actions-read job metadata. Commit reviews, reconciliation, confirmation, and allowed evidence without an evidence-SHA field, then create a new lightweight evidence tag at that actual commit and dispatch the eight final purposes from it. Supply the separately observed runner probe only as canonical base64 input to the target-Mac final dispatch. Evidence concurrency is grouped by purpose with cancellation disabled; dispatch each purpose sequentially and use fresh runs, not reruns. Retain both tags until the associated ready verification passes.

Each accepted P0/P1 disposition records rationale, affected scope, remediation or falsification, and validating evidence. The GitHub actor identifies the operator; `reviewerAgentId` and `reviewerSessionId` are separately recorded and seven-way unique but remain self-reported, non-cryptographic identity claims. Six fresh agents review `initialReviewSha`; a seventh reviews the reconciled frozen candidate and the DEEP hash before its confirmation is committed.

Live repository policy must retain `delete_branch_on_merge=false`, and the verifier rejects any drift before integration. Use a merge commit that preserves the mega-branch evidence commit as one parent; squash or rebase cannot satisfy this protocol. Premerge readiness ends at `PREMERGE_CANDIDATE_CONTROL`. The mandatory postmerge phase is a separate push-to-`main` verification run: the live run must have event `push`, branch `main`, and `head_sha` equal to the protected two-parent merge commit, and its start time must be at or after that commit's GitHub committer timestamp. That new run re-downloads and revalidates the original eight receipts; ancestry alone can never reclassify them. This yields `POSTMERGE_PROTECTED_MAIN` only for the separate postmerge registry/run. Keep the branch and tags until it passes, then perform cleanup. Manual evidence dispatches remain capped; do not use paid minutes without approval.

The exact raw-byte hash and internal content hash are intentionally different contracts. Every receipt hashes the downloaded payload bytes exactly, including whitespace and trailing newline. Every internal `outputSha256` uses the shared recursively key-sorted canonical JSON serialization with `outputSha256` excluded. The DEEP producer, hosted receipt verifier, and readiness checker share this implementation; a bridge test formats real producer bytes, carries their raw digest through the trusted registry, and proves that substituting the canonical content digest for the raw-byte digest fails closed.

## Artifact retention

- Failed Playwright screenshots, traces, and videos: **14 days**.
- Accepted milestone screenshots and compact evidence: **30 days** in CI; durable selected evidence may be checked into an approved planning/evidence path if small and non-sensitive.
- Do not record routine successful-run videos.
- Logs use the shortest retention consistent with debugging and contain no secrets, provider traces, private text, or exported worlds.
- Dependency/license reports and deterministic hash summaries are small text artifacts and may follow milestone retention.

## Resulting implementation behavior

A contributor can reproduce every blocking command locally. A PR proves both pure-domain correctness and one player journey. Conditional changes trigger their specific risk suites. Expensive tests do not make routine PR feedback unusable, and missing GitHub paid capabilities are documented honestly.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Only unit tests | Misses replay, persistence, browser journey, and observable product failure |
| Full long-horizon/browser matrix on every edit | Slow and wasteful for one builder |
| Auto-merge dependency PRs | Renderer/build/schema updates require human diff and evidence review |
| Required outside approval | Incompatible with a solo maintainer without adding safety proportional to cost |
| Pretend branch/security features exist | Creates false assurance; capability must be probed |
| Store every successful trace/video | Cost, privacy, and artifact-noise burden |
| Promptfoo required in V1 | No model adapter exists; trusted ordinary fixtures are sufficient |

## Unproven assumptions and reopen evidence

- **UNRESOLVED:** the complete PR baseline meets the solo feedback-time budget. Reopen test partitioning after measured CI p50/p95.
- **UNRESOLVED:** current personal private-repository rulesets/security features are available. Record the real probes before enabling policy.
- **UNRESOLVED:** bounded PR fuzz seeds detect enough regressions. Reopen based on nightly-only failures.
- **UNRESOLVED:** 14/30-day artifact retention fits current Actions storage and debugging needs. Reopen from actual storage/incident evidence.

## Constraint fit

The contract favors fast local/PR feedback and targeted expensive runs. It uses no paid enterprise control, does not require a second maintainer, and adds model CI only when model code exists. The critical journey directly tests the local, free, accountless slice.
