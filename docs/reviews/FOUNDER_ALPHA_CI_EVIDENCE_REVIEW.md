# Founder Alpha CI, release, and evidence review

**Purpose:** independently test whether the frozen Founder Alpha candidate's CI, release boundary, and retained evidence are reproducible, fail closed, and maintainable by one builder.

**Status:** COMPLETE — REJECT FROZEN CANDIDATE PENDING ONE P0 AND THREE P1 REPAIRS

**Authority boundary:** this review records objections against one frozen tree. It does not change product or engineering authority, reconcile findings, authorize GitHub mutations, or authorize deployment, credentials, or spend. The coordinator owns disposition and repair.

**Related documents:** [authority index](../INDEX.md), [Founder Alpha plan](../exec-plans/active/002-founder-alpha.md), [testing contract](../quality/TESTING.md), [performance contract](../quality/PERFORMANCE.md), [release boundary](../engineering/FOUNDER_ALPHA_RELEASE.md), [persistence authority](../engineering/PERSISTENCE.md), and [Founder Alpha evidence protocol](../exec-plans/evidence/002/README.md).

## Frozen subject and method

- Commit: `7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`.
- Tree: `476c381034ab3601746a7e11235fe693d793782c`.
- Merge base with local `main`: `74a8a7e07d0743f467dd9547ebf4193eb53d6029`.
- Immutable local tag observed: `founder-alpha-review-candidate-1`.
- Review worktree/branch: `002-review-ci` / `review/fa-ci`; the subject tree was clean before checks.

I inspected `main...7319d59`, the complete workflow and package-script graph, conditional path classifiers, action pins and permissions, artifact policy, formal/persistence/browser/performance harnesses, checked-in evidence envelopes, release/relay documentation, local Git topology, and deploy/config file absence. I did not read any other Founder Alpha review output, perform a live GitHub/API probe, mutate GitHub, use credentials, deploy, or run a paid service.

## Verdict

The candidate is not merge- or release-acceptable at the frozen SHA. The required `Secret scan` deterministically fails on a benign test fixture in committed Founder Alpha history. Even after that P0 is repaired, the named PR/DEEP commands do not provide the lattice promised by the testing and execution authorities, the local formal command does not enforce its pinned TLC identity, and DEEP can treat an unavailable IndexedDB benchmark as success.

The surrounding controls are materially sound: every workflow action is commit-SHA pinned; top-level permissions are `contents: read`; checkout credentials are not persisted; accepted/failing artifacts use 30/14-day retention; Playwright retries and video are disabled; the physical-device record remains explicit `NOT_RUN`; the diagnostics microbenchmark binds clean source, commit, lockfile, source hashes, runtime, workload, and mode; and the canonical browser harness binds clean/stable source, built-output hashes, exact browser identity, power boundaries, fresh browsers, and route/netlog egress. The release authority also matches the implementation: credential-free Turnstile/GitHub/D1 ports exist, while Wrangler composition, resource identifiers, public route, deployment script, credentials, and deploy-on-push do not.

## Executed evidence

| Check | Result at frozen SHA | Interpretation |
|---|---|---|
| Pinned Node 22.23.1 arm64 and pnpm 11.15.1 | PASS | Required local runtime reproduced. |
| `pnpm verify:pr` | PASS | 124 unit tests, two property tests, real Chromium IndexedDB reload, fixed 20-warmup/200-cycle timing check, build/budget/audit, nine Playwright journeys, 360 routed requests and 39,644 netlog events with zero external attempts. It did not invoke TLC. |
| `pnpm test:mutation` | PASS | Eight of eight configured mutants killed; restored targets then passed 58 tests. |
| `pnpm benchmark:diagnostics -- --output /tmp/eonfolk-review-ci-diagnostics.json` | PASS | Clean, source-bound OFF/LOCAL/ALPHA source workload passed; browser-mode overhead remains explicitly unsupported. |
| `node scripts/benchmark-persistence.mjs` | PASS in the available local browser | Five Memory and five IndexedDB samples completed; the command has no acceptance threshold or fail-closed unavailable path. |
| `pnpm test:formal` | Command returned PASS with the wrong JAR | It auto-discovered `/tmp/eonfolk-tla.4Pe579/tla2tools.jar`, SHA-256 `ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f`, rather than the pinned `eabd140a70f49eb9305a3bd3f3df944eddf87e5a90d329789085f8953a80533a`. TLC still reported 3,480 generated / 350 distinct states and depth 10. |
| Exact workflow Gitleaks command with local Gitleaks 8.30.1 | FAIL | 145 commits scanned; one `generic-api-key` finding. The redacted report identifies the synthetic fixture described in FA-CI-001. |
| `git diff --check` before review writing | PASS | No implementation drift from checks. |

I did not run the approximately 22.5-minute canonical 15-run browser performance battery, a physical-device protocol, live provider/deployment checks, or the entire `verify:deep` wrapper. The relevant DEEP constituents and command graph were inspected; PR, mutation, formal, diagnostics-source, and persistence checks were executed individually. Human, physical-device, provider, deployment, and public-reliability claims remain `NOT_RUN`.

## Findings

### P0 — FA-CI-001: the required full-history Secret scan fails on the candidate

`gitleaks git --no-banner --redact --exit-code 1 --log-opts=--all .`, using the workflow-pinned Gitleaks 8.30.1, exits 1. Its fully redacted JSON identifies rule `generic-api-key`, file `tests/unit/feedback-worker/providers.test.ts`, line 58, commit `20c4fd8873600879a65ee00540603ac6f0a4741a`, and fingerprint `20c4fd8873600879a65ee00540603ac6f0a4741a:tests/unit/feedback-worker/providers.test.ts:generic-api-key:58`. Inspection shows the match is the synthetic UUID-shaped `idempotencyKey`, not an observed credential. Nevertheless, `Secret scan` is a strict protected check, so the exact candidate cannot go green.

Because the workflow scans `--all`, changing only the current fixture does not remove the historical match. Do not rewrite protected history to fix a false positive.

**Affected files:** `.github/workflows/ci.yml`, a new narrowly scoped Gitleaks configuration if accepted, and `tests/unit/feedback-worker/providers.test.ts` for a regression/fixture clarification.

**Direct acceptance:** add a reviewed allowlist that requires the exact benign match and exact path together (not a whole-rule, whole-path, or whole-commit exemption); keep redaction and full-history scanning; add a test or documented probe proving a neighboring realistic secret still fails; then run the exact workflow command with Gitleaks 8.30.1 and obtain exit 0 against the complete candidate history.

### P1 — FA-CI-002: local formal verification accepts an unpinned TLC binary

CI downloads a checksum-verified TLA+ 1.8.0 JAR, but `scripts/check-formal.mjs` itself accepts `TLA2TOOLS_JAR`, a hard-coded temporary path, or the first readable `/tmp/eonfolk-tla.*/tla2tools.jar` without comparing its digest to the authority's pinned hash. The executed local command therefore returned `BOUNDED_MODEL_CHECK_PASSED` with SHA-256 `ab323b…`, while `.github/workflows/ci.yml`, `formal/README.md`, and `docs/engineering/FRONTIER_TECH.md` require `eabd14…`. Printing the unexpected digest after execution is not identity enforcement.

This makes `pnpm verify` host-state-dependent and allows stale, substituted, or different TLC bytes to produce accepted local formal evidence. It also contradicts the claim that every blocking command is pinned and locally reproducible.

**Affected files:** `scripts/check-formal.mjs`, `.github/workflows/ci.yml`, `formal/README.md`, and any direct script tests added for tool identity.

**Direct acceptance:** place the expected full SHA-256 in one reviewed repository constant; make `check-formal.mjs` hash and reject every discovered or explicitly supplied JAR before Java execution unless it exactly matches; remove the one-off hard-coded temp path; test correct, wrong, and unavailable JAR cases; and prove both `pnpm test:formal` and the CI job report the same tool digest and bounded result.

### P1 — FA-CI-003: the named PR/DEEP commands do not implement the promised lattice

The authorities say PR includes the bounded formal model and DEEP adds larger property/fuzz seeds plus repeated OFF/LOCAL/ALPHA performance profiles. The scripts instead define:

- `verify:pr` as FAST/property/IndexedDB/timing/build/budget/audit/e2e, with no formal check;
- `verify:deep` as ordinary `verify`, eight targeted mutants, browser-cohort validation, the persistence benchmark, and one canonical web benchmark;
- `benchmark-web.mjs` as one default build mode (`off` unless externally overridden), not a same-build OFF/LOCAL/ALPHA comparison; and
- the same fixed Fast-check runs in FAST/PR/DEEP, with no DEEP-specific larger corpus. The 30/90/365-day unit cases do run, but they already run in FAST and are not a distinct DEEP horizon.

The separate CI `Formal model` job makes the workflow's combined PR result stronger than the local `verify:pr` command, but the release procedure explicitly tells an operator to run that local command. The current names therefore cannot support the plan's “one command per lattice tier” or an exact-candidate DEEP claim.

**Affected files:** `package.json`, `.github/workflows/ci.yml`, `scripts/benchmark-web.mjs` or a dedicated diagnostics-mode browser harness, `docs/quality/TESTING.md`, `docs/quality/PERFORMANCE.md`, `docs/engineering/FOUNDER_ALPHA_RELEASE.md`, and `docs/exec-plans/active/002-founder-alpha.md`.

**Direct acceptance:** choose and document one exact contract, then make commands match it. At minimum, local PR acceptance must include the pinned formal check (or be explicitly defined as the union of named commands); DEEP must have demonstrably larger deterministic property/fuzz inputs; and one acceptance command must measure the same build/journey across OFF, LOCAL, and ALPHA with explicit comparative gates. Emit a machine-readable tier manifest listing commit, environment, subcommands, inputs, durations, result, and artifact hashes. If any promised item is intentionally deferred, remove it from the release claim and mark it `NOT_RUN` rather than retaining the DEEP label.

### P1 — FA-CI-004: DEEP can soft-pass unavailable or broken IndexedDB benchmarking

`scripts/benchmark-persistence.mjs` catches every IndexedDB/browser/harness exception, emits `indexedDb.available: false`, and still exits 0. It also lacks commit/clean-tree/lockfile/browser-hash binding, start/end source stability, an overall status, and acceptance thresholds. Because `verify:deep` chains this script with `&&`, an unavailable or broken real adapter is indistinguishable from successful DEEP completion at the process level.

The ordinary PR suite does have a fail-closed IndexedDB reload test, so this is not evidence that persistence is broken. It is evidence that the named DEEP benchmark can silently omit the very measurement it purports to add.

**Affected files:** `scripts/benchmark-persistence.mjs`, `package.json`, direct benchmark-script tests, and persistence evidence documentation.

**Direct acceptance:** make acceptance mode reject IndexedDB unavailability/harness errors with a nonzero exit; reserve soft failure for an explicit `--smoke-only` mode that cannot emit `PASS`; bind commit, clean start/end source, lockfile, exact browser cohort/hash, workload, and output hash; add an overall status and declared informational/gating fields; and add a regression that forces browser launch or harness failure and asserts the DEEP subcommand fails.

### P2 — FA-CI-005: FAST and conditional cognition CI duplicate broad work instead of staying focused

`verify:fast` runs the entire 124-test unit suite, not focused changed-package tests. The conditional cognition step then reruns four tests already included in that same `test:unit` invocation. Its classifier therefore adds runtime but no distinct coverage for the current graph. This is safe but works against the documented short solo-maintainer feedback loop, and it makes path-classification maintenance easy to mistake for added assurance.

**Affected files:** `package.json`, `.github/workflows/ci.yml`, and `docs/quality/TESTING.md`.

**Direct acceptance:** either implement a deterministic changed-path-to-focused-test map for FAST with an all-tests fail-closed fallback, leaving PR as the complete suite, or document FAST as the full unit baseline and remove the duplicate conditional cognition rerun. Add classifier fixtures for base-missing, cognition/protocol/Observatory, web/e2e, shared configuration, and unrelated documentation paths.

## Uncertainties and retained limits

- I did not live-query repository privacy, protection, rulesets, required checks, Actions allowance, Dependabot, or native security features. Local evidence shows the expected GitHub origin, `main` equal to the local `origin/main` ref at `74a8a7e`, and the Founder Alpha integration branch/tag at the frozen SHA; dated remote-capability claims remain coordinator evidence, not independently reverified here.
- Artifact upload behavior on a GitHub rerun and actual 14/30-day storage consumption were not exercised. The policy remains explicitly unresolved in the authorities.
- The accepted UI capture step proves page load and canvas visibility but still requires human inspection; the workflow does not and should not turn screenshots into a human product-gate claim.
- No real credential was observed in the Gitleaks finding. The P0 is a deterministic protected-check failure and allowlist-quality problem, not evidence of credential compromise.

No additional P0, P1, or P2 finding is recorded from this review.
