# Founder Alpha handoff

> **Historical record.** Founder Alpha is superseded by the merged V1 product.
> Current public entry is [README](../../../README.md).

**Purpose:** give a zero-context operator the exact local run, diagnosis, verification, recovery, and evidence boundaries for Founder Alpha.

**Status:** HISTORICAL FOUNDER ALPHA HANDOFF — integrated and retained for regression; V1 supersedes current operations

**Authority boundary:** this file is a historical operational summary. [docs/INDEX.md](../../INDEX.md) maps current authority; [completed 002](002-founder-alpha.md) preserves Founder Alpha execution status; [FOUNDER_ALPHA_RELEASE.md](../../engineering/FOUNDER_ALPHA_RELEASE.md) preserves its release boundary.

## What works

Founder Alpha is an account-free local Riverhold build. Eight full-limbed citizens move along authored paths through a stylized low-poly settlement, visibly carry/work with props, and interact without a model. The opening market exchange remains authoritative through the accepted mobile world-paint window, settles once, releases both participants, and gives way to later movement. The player can follow Mara, inspect the reserve mismatch and her visible reasons, offer one of two counsels or abstain, see Mara accept/reject/reinterpret independently, advance through a typed six-hour consequence, leave/reload through controlled catch-up, inspect the factual Chronicle and provenance, take the branch-specific second action, create a Story Card, switch to the semantic words view, and save bounded feedback locally. PlayCanvas consumes a pure WorldPresentation projection and never mutates Reality.

Authoritative Reality, cognition records, experiments, diagnostics, feedback, Chronicle, and Observatory projections remain separate. Standard Brain completes the loop. No model, Planner candidate, provider SDK, hosted inference, training, embedding/vector store, account, server, relay composition, deployment, public URL, credential, payment, or paid action ships.

## Exact setup and local run

Use the pinned Node runtime from `.nvmrc` at the repository root:

```sh
# Use Node 22.23.1 from `.nvmrc` and pnpm 11.15.1 through Corepack.
corepack enable
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm runtime:check
corepack pnpm --filter @eonfolk/web dev
```

Open the printed loopback URL. For the exact production bundle:

```sh
pnpm build
pnpm --filter @eonfolk/web preview --host 127.0.0.1 --port 4174 --strictPort
```

No environment variable is required. The preview is local-only; clearing the browser profile can remove local world, diagnostic, and feedback data.

## Diagnostics and local feedback

Start the local observer and query its bounded projection from a second terminal:

```sh
pnpm dev:observe
pnpm diagnose http://127.0.0.1:5173/
```

Modes are OFF, LOCAL, and ALPHA. Diagnostics are non-authoritative, source-redacted, bounded, and optional. The observer returns identity, health, incidents, typed trace/performance/network summaries, reproduction range, artifacts, and a bounded world head; it exposes no raw Reality, hidden cognition, arbitrary files, shell, or mutation command.

Feedback is local-only. It retains at most three reports for seven days within 4 MiB, sanitizes text/images, reconstructs incident prose from a closed codebook, previews attachments, and supports deletion. Upload is disabled. Founder Alpha historically carried an inert relay prototype; V1 removed that unreachable Cloudflare/D1/Turnstile/GitHub code and retained its review record only as history.

## Verification commands

The exact acceptance commands are:

```sh
pnpm verify:fast
TLA2TOOLS_JAR=/absolute/path/to/verified/tla2tools.jar pnpm verify:pr
TLA2TOOLS_JAR=/absolute/path/to/verified/tla2tools.jar pnpm verify:deep
gitleaks git --no-banner --redact --exit-code 1 --config .gitleaks.toml --log-opts=--all .
GITLEAKS_BIN="$(command -v gitleaks)" node scripts/check-gitleaks-neighbor.mjs
```

The accepted TLC JAR SHA-256 is `eabd140a70f49eb9305a3bd3f3df944eddf87e5a90d329789085f8953a80533a`; missing or wrong bytes fail before Java. PR verification records its executed constituents individually. Linux CI runs two explicitly test-only crash journeys and fourteen production journeys through the semantic world, rebuilds production, checks the 200/650 KiB gzip budgets, then runs a blocking trace-free real PlayCanvas/WebGL2 smoke at all three required viewports. This is an explicit SwiftShader/tracing throughput partition, not a claim that Linux exercised every illustrated journey. Target-Mac PR/DEEP runs all sixteen illustrated journeys, including cadence and spatial picking. Both prove zero external attempts, audit production dependencies, and run the bounded formal model. The final PR manifest may hash only production `apps/web/dist`; DEEP adds its four named benchmark artifacts.

DEEP adds targeted mutations, the 500/320 property profile, exact browser-cohort validation, fail-closed persistence measurement, source and browser OFF/LOCAL/ALPHA comparisons, and the repeated canonical browser performance battery. Acceptance requires a clean, unchanged source tree; dirty success exits nonzero as `SMOKE_ONLY`.

The clean DEEP evidence at `59edef3c768d9a3fe9409f07d77d49fded4b9554` remains historical and release-invalid because it measured sparse Pixi. Release-valid PlayCanvas evidence is exact clean final implementation head `f818d1069401a1f8e14d2ca6badec29841afbd81`. Protected GitHub Actions [run 32559456985](https://github.com/PranavMishra28/eonfolk/actions/runs/32559456985) passed `Verify`, `Formal model`, and full-history `Secret scan`, including the real three-viewport renderer smoke. The plugged-in target Mac then passed all 26 DEEP rows, including 191 tests in 23 files, all sixteen illustrated production journeys, the canonical fifteen-run performance/egress battery, and every deep-only constituent. Source and lockfile stayed unchanged; output SHA-256 is `21e85a3e875ca79d0d6e31b25d4ba19f1c871bb6c22c780cf777ba877cfb689d`; artifact-manifest SHA-256 is `cc54184974c05e69e9be0c18d98ebd5d07769bac55bf96fcc1b650bf68dedddd`. Maximum meaningful-world display was 445.0 ms desktop, 455.4 ms laptop, and 4,433.4 ms mobile; pooled p95 was 9.1 ms, 8.9 ms, and 9.2 ms. One isolated 50.1 ms laptop-arrival frame counted as one dropped frame; every declared aggregate/p95 gate passed, and all route/netlog external-attempt sets were empty.

## Product and browser smoke

Use a fresh browser profile. Confirm:

1. In ten seconds identify the physical settlement, recognizable humans, several tasks, one interaction, and one production/social process; within 30 seconds describe several citizen activities without a raw feed. The automated independent verdict to “Does this feel like watching real inhabitants of a place, rather than looking at a visualization of a simulation?” is exact **YES** at frozen `90c0ad2`; unfamiliar-human confirmation remains `NOT RUN`.
2. Inspect Mara's identity, values, plan, relationship, uncertainty, and the exact 48-versus-36 mismatch.
3. Run verify, public-accusation, and abstain branches separately. Public accusation must be rejected by grounded visible reasons in the default fixture.
4. Leave/reload, advance the bounded return, inspect the branch consequence, Chronicle, replay/provenance, second action, Story Card, and local feedback.
5. Repeat with keyboard only, reduced motion, and the remembered semantic view.
6. Check 1728×1117, 1366×768, and 390×844 for world dominance, canvas containment, WebGL2, continuous movement, semantic parity, and the fixed weak-device fallback. Automated 200%-equivalent reflow exists; direct browser-UI zoom remains **NOT RUN**.

A passing build or backend suite is never a substitute for this observable flow. Automated browser evidence is not a human Gate result.

## Evidence and honest limits

Automated evidence covers deterministic simulation/replay, atomic/idempotent persistence, hostile storage, hidden-fact isolation, Standard Brain-only progress, closed proposal validation, source-bound experiments, unforgeable Observatory artifacts, feedback privacy, keyboard/focus/reduced-motion/semantic fallbacks, three viewports, bundle budgets, zero egress, production audit, and bounded TLA+ invariants.

These remain **NOT RUN**: unfamiliar-human Gate 0/A/B and Story Card studies; fun, attachment, return intent, and session-20 retention; physical mobile/4G/thermal/touch; screen-reader use; direct browser-UI 200% zoom; live Cloudflare/D1/Turnstile/GitHub provider behavior; model/Planner execution; public distribution; production scale; and deployment. The focused-hour record is incomplete, so actual compliance with the 40–60-hour labor estimate is **UNKNOWN**.

## Recovery and rollback

- A runtime invariant failure safe-stops before presenting speculative Reality and gives a bounded incident ID.
- A stale tab yields write authority without rewriting canonical history.
- Replay/version/hash/reference disagreement fails closed before rendering world facts.
- Local feedback/diagnostics/renderer failure does not prevent the semantic game path.
- Revert a merged regression with a reviewed `git revert`, then rerun PR and relevant DEEP checks; never rewrite protected `main`.
- Any future collection service requires a new design and explicit approval; V1 contains no relay to disable.

## Git and release boundary

When written, repository `PranavMishra28/eonfolk` was private with default branch `main`. The release branch is `feat/002-founder-alpha`; the one permitted PR title is `Founder Alpha: observability, feedback, cognition, polish, and release hardening`. Merge is authorized only after targeted confirmation reports zero P0/P1 and protected `Verify`, `Formal model`, and `Secret scan` checks are green. After merge, verify `main == origin/main`, preserve immutable evidence tags, remove merged/stale Founder Alpha branches and external worktrees, and leave unrelated Dependabot PRs unmerged.
