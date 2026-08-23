# EONFOLK

![EONFOLK mark](apps/web/public/eonfolk-mark.svg)

EONFOLK is a local-first civilization game about following one autonomous life inside a persistent settlement. You investigate what a citizen can know, offer rare counsel they may reinterpret or reject, watch consequences unfold in the world, and return to a factual Chronicle.

Founder Alpha is free, account-free, and complete without an external model or network service. It is a bounded product proof, not a public deployment or a claim that human fun, attachment, and retention gates have passed.

## Quick start

Runtime requirements: macOS on Apple Silicon, Node 22.23.1, and pnpm 11.15.1. Full PR/DEEP verification additionally requires Java 21. From a fresh clone:

```sh
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm dev
```

Open the loopback URL printed by Vite. `dev` enables local diagnostics and hot reload without sending world, cognition, or feedback data off the device.

To build the production bundle and serve it locally:

```sh
corepack pnpm prod
```

The production preview listens only on `127.0.0.1:4174`. It does not deploy or publish the game.

## What is implemented

- One 250 × 210 metre PlayCanvas/WebGL2 settlement with eight embodied citizens.
- Deterministic Reality, Standard Brain autonomy, typed Mind state, event sourcing, IndexedDB snapshots, catch-up, and replay.
- Visible travel, gathering, exchange, repair, social interaction, direct world selection, semantic zoom, and an equivalent list view.
- One consequential Mara counsel path with acceptance, rejection, delay, Chronicle evidence, and Story Card attribution.
- Keyboard operation, reduced motion, mobile reflow, renderer degradation, diagnostics, local feedback, and zero-egress browser checks.

Generated continents, a second settlement, hosted public worlds, required LLM inference, payments, accounts, and deployment are not Founder Alpha features.

## Verification

Use the smallest useful tier while working:

```sh
corepack pnpm verify:fast
corepack pnpm exec playwright install chromium
TLA2TOOLS_JAR=/absolute/path/to/verified/tla2tools.jar corepack pnpm verify:pr
TLA2TOOLS_JAR=/absolute/path/to/verified/tla2tools.jar corepack pnpm verify:deep
```

`verify:pr` is the merge baseline. It covers formatting, lint, strict types, unit/property tests, IndexedDB, deterministic simulation and replay, fault recovery, production build and payload budgets, browser journeys, dependency audit, zero network egress, and the bounded formal model. Read the pinned TLC URL and SHA-256 with `node scripts/formal-toolchain.mjs --url` and `--sha256`; never substitute an unverified jar.

`verify:deep` is the target-Apple-Silicon release lattice. It additionally verifies the exact Playwright browser cohort, mutation/fuzz depth, persistence, diagnostics, and repeated three-viewport performance. Run `corepack pnpm browser-cohort:check` before committing to the longer tier; a different OS/browser cohort is not equivalent release evidence.

The GitHub workflow repeats the protected PR baseline, full-history secret scan, formal model, and conditional three-viewport renderer evidence. A manual **extended** Linux workflow-dispatch tier adds the portable mutation gate and expanded deterministic properties without pretending to be the target-Mac DEEP/performance run. It is not scheduled, so a solo private repository does not consume hosted minutes without intent. Continuous deployment remains deliberately disabled pending a separate, concrete approval for account, origin, credentials, cost, retention, and rollback.

## Architecture and developer guide

Typed Reality is the only game-state authority. Mind holds visible facts, sourced beliefs, plans, and bounded budgets. Brain may propose only known typed actions; Application validates them atomically before Reality changes. Chronicle projects factual causal records without inventing causality. Diagnostics, feedback, experiments, and the Observatory cannot mutate Reality.

Start with:

1. [Authority index](docs/INDEX.md)
2. [Product](docs/product/PRODUCT.md)
3. [Human loop](docs/product/HUMAN_LOOP.md)
4. [Architecture](docs/engineering/ARCHITECTURE.md)
5. [Simulation](docs/engineering/SIMULATION.md)
6. [Founder Alpha ExecPlan](docs/exec-plans/active/002-founder-alpha.md)
7. [Testing and CI](docs/quality/TESTING.md)
8. [Local release boundary](docs/engineering/FOUNDER_ALPHA_RELEASE.md)

Repository process and non-negotiable constraints are in [AGENTS.md](AGENTS.md). `docs/INDEX.md` is the sole authority map; new root-level architecture, goal, roadmap, or ADR files should not duplicate its canonical owners.
