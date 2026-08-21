# Founder Alpha handoff

**Purpose:** give a zero-context operator the exact local run, diagnosis, verification, recovery, and evidence boundaries for Founder Alpha.

**Status:** RELEASE CANDIDATE — seven confirmation P1 mechanisms repaired; clean local DEEP passed; targeted confirmation, remote CI, merge, and cleanup pending

**Authority boundary:** this file is an operational summary. [docs/INDEX.md](docs/INDEX.md) maps product and technical authority; [002-founder-alpha.md](docs/exec-plans/active/002-founder-alpha.md) owns execution status; [FOUNDER_ALPHA_RELEASE.md](docs/engineering/FOUNDER_ALPHA_RELEASE.md) owns release boundaries.

## What works

Founder Alpha is an account-free local Riverhold build. Eight citizens act without a model. The player can follow Mara, inspect the reserve mismatch and her visible reasons, offer one of two counsels or abstain, see Mara accept/reject/reinterpret independently, advance through a typed six-hour consequence, leave/reload through controlled catch-up, inspect the factual Chronicle and provenance, take the branch-specific second action, create a Story Card, switch to the semantic words view, and save bounded feedback locally.

Authoritative Reality, cognition records, experiments, diagnostics, feedback, Chronicle, and Observatory projections remain separate. Standard Brain completes the loop. No model, Planner candidate, provider SDK, hosted inference, training, embedding/vector store, account, server, relay composition, deployment, public URL, credential, payment, or paid action ships.

## Exact setup and local run

Use the pinned arm64 runtime from the repository root:

```sh
export PATH=/Users/pranav/.nvm/versions/node/v22.23.1/bin:$PATH
pnpm install --frozen-lockfile --ignore-scripts
pnpm runtime:check
pnpm --filter @eonfolk/web dev
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

Feedback is local-only in this build. It retains at most three reports for seven days within 4 MiB, sanitizes text/images, reconstructs incident prose from a closed codebook, previews attachments, and supports deletion. Upload is disabled. The relay core is inert and uncomposed: Cloudflare D1, Turnstile, GitHub App delivery, live quotas, credentials, public abuse, and deployment are **NOT RUN**.

## Verification commands

The exact acceptance commands are:

```sh
pnpm verify:fast
TLA2TOOLS_JAR=/absolute/path/to/verified/tla2tools.jar pnpm verify:pr
TLA2TOOLS_JAR=/absolute/path/to/verified/tla2tools.jar pnpm verify:deep
gitleaks git --no-banner --redact --exit-code 1 --config .gitleaks.toml --log-opts=--all .
GITLEAKS_BIN="$(command -v gitleaks)" node scripts/check-gitleaks-neighbor.mjs
```

The accepted TLC JAR SHA-256 is `eabd140a70f49eb9305a3bd3f3df944eddf87e5a90d329789085f8953a80533a`; missing or wrong bytes fail before Java. PR verification records nineteen executed constituents individually. It runs two explicitly test-only crash journeys, rebuilds production, checks the 200/650 KiB gzip budgets, runs fourteen production journeys against that unchanged `dist`, proves both suites attempted no external request, audits production dependencies, and runs the bounded formal model. The final PR manifest may hash only production `apps/web/dist`; DEEP adds its four named benchmark artifacts.

DEEP adds targeted mutations, the 500/320 property profile, exact browser-cohort validation, fail-closed persistence measurement, source and browser OFF/LOCAL/ALPHA comparisons, and the repeated canonical browser performance battery. Acceptance requires a clean, unchanged source tree; dirty success exits nonzero as `SMOKE_ONLY`.

The accepted local DEEP evidence currently binds clean commit `59edef3c768d9a3fe9409f07d77d49fded4b9554`: 26/26 ordered rows passed, start/end source and lockfile matched, crash markers were absent from production `dist`, and the manifest output SHA-256 is `b4bb47f0395b8c122678416aee62db632575b16e05729f3d64a9a3b3af9a83d2`. Canonical performance used fifteen fresh-browser journeys; worst per-state p95 was 10.0 ms, maximum throttled-mobile meaningful display was 2,354 ms, and route/netlog external attempts were zero. Re-run DEEP after any executable or dependency change.

## Product and browser smoke

Use a fresh browser profile. Confirm:

1. Follow Mara and identify at least three citizen activities plus the Toma–Iven exchange.
2. Inspect Mara's identity, values, plan, relationship, uncertainty, and the exact 48-versus-36 mismatch.
3. Run verify, public-accusation, and abstain branches separately. Public accusation must be rejected by grounded visible reasons in the default fixture.
4. Leave/reload, advance the bounded return, inspect the branch consequence, Chronicle, replay/provenance, second action, Story Card, and local feedback.
5. Repeat with keyboard only, reduced motion, and the remembered semantic view.
6. Check 1728×1117, 1366×768, and 390×844. Automated 200%-equivalent reflow exists; direct browser-UI zoom remains **NOT RUN**.

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
- A future relay must be independently disableable while local feedback and the game continue.

## Git and release boundary

Repository `PranavMishra28/eonfolk` is private with default branch `main`. The release branch is `feat/002-founder-alpha`; the one permitted PR title is `Founder Alpha: observability, feedback, cognition, polish, and release hardening`. Merge is authorized only after targeted confirmation reports zero P0/P1 and protected `Verify`, `Formal model`, and `Secret scan` checks are green. After merge, verify `main == origin/main`, preserve immutable evidence tags, remove merged/stale Founder Alpha branches and external worktrees, and leave unrelated Dependabot PRs unmerged.
