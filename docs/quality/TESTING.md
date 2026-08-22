# Testing and CI contract

**Purpose:** define blocking test layers, PR/nightly CI, dependency updates, repository protections, security-feature probes, and artifact retention.

**Status:** IMPLEMENTED — World-as-Product exact-YES confirmation passed; fresh clean DEEP and protected mega-PR CI pending

**Authority boundary:** owns when checks run and what CI/repository policy must enforce. Exact product outcomes are owned by [quality bar](QUALITY_BAR.md); model rubrics by [evals](EVALS.md); screenshots by [visual QA](VISUAL_QA.md).

**Related documents:** [quality bar](QUALITY_BAR.md), [evals](EVALS.md), [visual QA](VISUAL_QA.md), [simulation](../engineering/SIMULATION.md), [persistence](../engineering/PERSISTENCE.md), [security](../engineering/SECURITY.md)

## Owned decision

Every relevant implementation PR runs a short, blocking baseline. Expensive horizons and matrices run nightly/manual. The repository uses a PR-based solo-maintainer workflow with no automatic merges and no invented enterprise ceremony. `.github/workflows/ci.yml` now implements Verify, Formal model, and Secret scan jobs with actions pinned by commit SHA.

The exact local baseline is `pnpm verify`. At `4a677a743d4efcdc337c6ffc0c79d63edee69e8f` it passed 63 unit tests, two property tests, a real Chromium IndexedDB reload test, the fixed 20-warmup/200-cycle decision-trace timing analyzer, build/bundle checks, production dependency audit, eight Playwright journeys, 334 routed requests and 36,489 Chromium-netlog events with zero external attempts, and bounded TLC model checking (3,480 generated/350 distinct states, depth 10, five invariants). Gitleaks 8.30.1 separately scanned all then-existing local history with no leaks. Pushed candidate `7d857a216cb9fbd76f2a0afd64418822a84b9a2e` passed GitHub Verify, Formal model, and full-history Secret scan in [run 32481390293](https://github.com/PranavMishra28/eonfolk/actions/runs/32481390293). The [review reconciliation](../reviews/IMPLEMENTATION_FINAL_REVIEW.md) states what this does not prove.

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

If a real provider/model adapter is later added, additionally run hung/late/cancel/process-kill, timeout/429/revoke/malformed/absence, and exact adapter/model/runtime/prompt regressions. No executable optional adapter or provider-specific route exists in Founder Alpha.

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

A nightly failure blocks milestone acceptance even if it does not retroactively block an unrelated documentation PR.

## Founder Alpha verification lattice

- **FAST:** runtime/cohort/architecture/docs/format/lint/typecheck plus focused unit/contract tests for changed packages.
- **PR:** FAST plus all unit/property tests, deterministic replay, fail-closed real IndexedDB evidence, timing, production build/budgets/audit, critical headed player journeys, zero-egress validation, diagnostic/feedback security tests, and the exact-digest bounded formal model.
- **DEEP:** 500-run/320-command deterministic property/fuzz profile; 30/90/365-day horizons; fail-closed persistence evidence; repeated source and browser OFF/LOCAL/ALPHA comparisons; full browser/accessibility/failure matrix; targeted mutation of Reality validation/reducer/persistence/redaction/Sentinel/feedback authorization; and cognition/ontology experiments when their code changes.

Each tier is a maintained command. A named but unimplemented or rejected check is removed from the promised surface. Results bind commit, environment, inputs, command, duration, pass/fail/not-run, and artifact hashes where material. A build or backend suite cannot substitute for a local game run and browser-visible evidence.

The PR browser stage separates **two explicitly test-only crash-injection journeys** from **sixteen production acceptance journeys**. It runs and zero-egress-checks the fault suite first, rebuilds with the exact production configuration, measures that production bundle, then previews the existing `dist` without another build for all sixteen acceptance journeys. The verification wrapper fails closed if that final `dist` is empty or retains either crash-injection marker; its PR artifact manifest hashes only those inspected production files. DEEP manifests additionally admit only the four benchmark outputs produced by that tier. Stale DEEP files in `tmp` therefore cannot enter a PR manifest.

The comparative browser diagnostics benchmark uses the current `Review Mara's choices` accessible control and runs the same arrival -> follow -> investigate -> counsel -> leave/return -> Chronicle path in OFF, LOCAL, and ALPHA builds. A dirty-tree `--smoke-only` run may prove path execution but cannot satisfy DEEP acceptance; only the clean-tree command can return `PASS`.

The v2 tier manifest is produced by the same declared step list that executes acceptance. PR records nineteen ordered constituent results; DEEP is that exact ordered prefix plus seven DEEP-only results. Every row contains a stable ID, the executed command, duration, exit code, and PASS/FAIL status. Execution stops at the first failure and records no result for work it did not run. `verify:pr:checks` and `verify:deep:checks` remain convenient check-only entry points, but delegate to these runner-owned lists so the executable sequence and evidence schema cannot drift.

The clean local DEEP run at `59edef3c768d9a3fe9409f07d77d49fded4b9554` passed all 26 ordered rows with identical start/end commit and lockfile, a clean tree, production `dist` present, crash markers absent, and manifest output SHA-256 `b4bb47f0395b8c122678416aee62db632575b16e05729f3d64a9a3b3af9a83d2`. That invalidated historical Pixi candidate included 165 unit tests in 21 files, 8/8 targeted mutants, the 500-run/320-command property profile, two fault journeys, fourteen unchanged-production journeys, bounded TLC (3,480 generated/350 distinct states, depth 10, five invariants), exact browser-cohort validation, persistence/diagnostic measurements, and fifteen canonical performance journeys. The World Presence candidate adds a fifteenth production journey and must produce fresh clean evidence; the historical run cannot release it.

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
