# EONFOLK

![EONFOLK mark](apps/web/public/eonfolk-mark.svg)

EONFOLK is a local-first civilization game in development. Its V1 thesis is to follow one autonomous life inside a generated, persistent society: understand what that person can know, make rare consequential interventions they may reinterpret or reject, and return to a factual Chronicle of what followed.

The current `main` branch contains the completed Founder Alpha/Riverhold proof. V1 work is consolidated in the private draft mega PR from `feat/v1-civilization`. That PR is intentionally labeled **V1 INCOMPLETE** until every required software row in [GOAL.md](GOAL.md) is verified by exact-candidate evidence.

## Current executable state

Founder Alpha is the playable regression surface today:

- one authored 250 × 210 metre PlayCanvas/WebGL2 settlement;
- eight embodied citizens with deterministic, model-free behavior;
- typed Reality and Mind boundaries, event sourcing, IndexedDB snapshots, catch-up, and replay;
- travel, gathering, exchange, repair, social interaction, counsel, Chronicle, and Story Card paths; and
- keyboard access, reduced motion, mobile reflow, renderer degradation, diagnostics, and zero-egress checks.

The V1 branch additionally contains generalized Release Genesis/protocol contracts, deterministic generated geography, immutable overview/local presentation projections, a pure civilization resource/project kernel, bounded planners, a closed model-choice adapter, and V1-specific CI readiness controls. These pieces are not yet an integrated playable civilization. Migration scheduling, founding materialization, long-horizon experiments, generated-world persistence, the V1 browser experience, and final evidence remain incomplete.

## Run locally

Requirements are macOS on Apple Silicon, Node 22.23.1, and pnpm 11.15.1. Java 21 is also required for the full formal-verification tiers.

```sh
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm dev
```

Open the loopback URL printed by Vite. Development diagnostics remain local. To build and serve the production bundle on loopback only:

```sh
corepack pnpm prod
```

No command deploys, publishes, buys a service, downloads a model, or requires an account.

## Verify changes

```sh
corepack pnpm verify:fast
corepack pnpm exec playwright install chromium
TLA2TOOLS_JAR=/absolute/path/to/verified/tla2tools.jar corepack pnpm verify:pr
TLA2TOOLS_JAR=/absolute/path/to/verified/tla2tools.jar corepack pnpm verify:deep
```

`verify:fast` is the normal edit loop. `verify:pr` is the portable protected baseline. `verify:deep` is the target-Apple-Silicon release lattice. `pnpm test:mutation`, `pnpm test:property:deep`, and the manual portable-extended CI lane provide additional bounded depth.

GitHub Actions also run a full-history secret scan and the pinned formal model. Legacy Riverhold screenshots are explicitly labeled Founder Alpha regression evidence and are ineligible for V1 readiness. Moving the draft mega PR to ready fails closed unless all required `GOAL.md` rows are `VERIFIED` and one clean verification manifest matches the exact checked-out HEAD.

## Read order

1. [V1 execution ledger](GOAL.md)
2. [Operational restart](RESUME.md)
3. [Authority index](docs/INDEX.md)
4. [V1 civilization ExecPlan](docs/exec-plans/active/003-v1-civilization.md)
5. [Architecture](docs/engineering/ARCHITECTURE.md)
6. [Testing and CI](docs/quality/TESTING.md)

[AGENTS.md](AGENTS.md) controls repository-agent behavior. [docs/INDEX.md](docs/INDEX.md) is the sole document-authority map. The [completed Founder Alpha plan](docs/exec-plans/completed/002-founder-alpha.md) remains historical and regression evidence; it is not the current execution contract.
