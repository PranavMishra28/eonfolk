# Testing and CI contract

**Purpose:** define blocking test layers, PR/nightly CI, dependency updates, repository protections, security-feature probes, and artifact retention.

**Status:** ACCEPTED FUTURE IMPLEMENTATION CONTRACT; NO WORKFLOW IS ADDED DURING PLANNING

**Authority boundary:** owns when checks run and what CI/repository policy must enforce. Exact product outcomes are owned by [quality bar](QUALITY_BAR.md); model rubrics by [evals](EVALS.md); screenshots by [visual QA](VISUAL_QA.md).

**Related documents:** [quality bar](QUALITY_BAR.md), [evals](EVALS.md), [visual QA](VISUAL_QA.md), [simulation](../engineering/SIMULATION.md), [persistence](../engineering/PERSISTENCE.md), [security](../engineering/SECURITY.md)

## Owned decision

Every relevant implementation PR runs a short, blocking baseline. Expensive horizons and matrices run nightly/manual. The repository uses a PR-based solo-maintainer workflow with no automatic merges and no invented enterprise ceremony.

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
- missing/throwing/timed-out/malformed fake `BrainPort` and deterministic fallback;
- perturbation, transfer, baseline, ablation, hidden-fact noninterference, and fixed behavior regressions.

If a real provider/model adapter is later added, additionally run provider timeout/429/revoke/malformed/absence and exact adapter/model/runtime/prompt regressions. No provider-specific route is required in V1.

When a major UI, renderer, asset, layout, motion, or design-token change occurs, capture deterministic desktop, laptop, and mobile screenshots, inspect them, and retain failing traces where practical. Screenshot pixel comparison is a diagnostic, not the sole visual reviewer.

## Test layers

| Layer | Blocking evidence |
|---|---|
| Protocol/schema | round-trip, unknown/version failure, byte/depth/range bounds |
| Reducer/unit | one event transition, no partial mutation, invariant checks |
| Determinism | repeated seed/commands, canonical bytes/hash, PRNG and equal-time ordering |
| Replay/persistence | half-open range/genesis/snapshot convergence, zero-event range, event gaps, corrupt hash, durable-before-visible crash barriers, accepted/rejected receipts, ID collision, quota abort, stale fencing |
| Property/model/fuzz | random legal/illegal command sequences preserve resources, ownership, life, visibility, and revision rules |
| Version policy | current version identity load; unknown/old version fails closed without mutation; no V1 upcaster/import route |
| Long horizon | 30/90/365-day worlds reach exact target under declared caps; conservation, bounded events/storage, interrupt/resume equivalence, no LLM |
| Browser journey | account-free Follow Mara, investigation, interaction, three advice branches, leave/confirmed catch-up, Chronicle/replay, second action |
| Accessibility | keyboard-only path, semantic names/states, focus, reduced motion, text equivalents, fallback view |
| Security | static `riverhold-visibility-v1` oracle versus separate production function across every viewer/purpose/label/grant/revoke boundary; private-parent/disclosure metamorphs; identical hidden/missing/revoked surfaces plus shared constant-work path and frozen 20-warmup/200-cycle/50 ms/≤5 ms/no-selective-rerun timing analyzer; hostile text/oversize; duplicate/stale/fenced writes; fake BrainPort; secret/import absence; deny-by-default local preview with independent route log + Chromium netlog and zero attempted external egress |

Snapshot replay is exercised from every persisted snapshot in golden scenarios. Chunk boundaries vary. The test oracle never calls a model or depends on current date/locale/network.

## PR versus nightly/manual

Keep PR CI short enough for a solo loop. Use small seed sets and bounded fuzzing on PRs. Run these nightly or manually before a milestone:

- larger fuzz/model-based seed corpus;
- 30/90/365-day matrix and event/storage profiling;
- current/unknown version policy and future migration rehearsal only if an upcaster is later added;
- extended browser/device/browser matrix;
- capped cognition suite with any real optional provider;
- dependency/license/security scan and non-destructive export drill;
- repeated performance profiles to identify variance.

A nightly failure blocks milestone acceptance even if it does not retroactively block an unrelated documentation PR.

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

These observations satisfy the planning probe, not the future configuration. Re-run immediately before implementing repository policy because account features and API behavior can change.

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
