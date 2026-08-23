# EONFOLK

![EONFOLK mark](apps/web/public/eonfolk-mark.svg)

EONFOLK is a local-first civilization game in development. Its V1 thesis is to follow one autonomous life inside a generated, persistent society: understand what that person can know, make rare consequential interventions they may reinterpret or reject, and return to a factual Chronicle of what followed.

The current `main` branch contains the completed Founder Alpha/Riverhold proof. V1 work is consolidated in the private draft mega PR from `feat/v1-civilization`. That PR is intentionally labeled **V1 INCOMPLETE** until every required software row in [GOAL.md](GOAL.md) is verified by exact-candidate evidence.

## Current executable state

On the V1 branch, `/` is the Release Genesis entry and `/world` is the generated
PlayCanvas/WebGL2 civilization. It currently provides:

- one deterministic generated region advanced through 1/7/30/90/365-day checkpoints;
- eight canonical citizens across an origin and one physically founded settlement;
- typed resources, projects, population, relationships, needs, institutions, agreements, and a model-free daily scheduler;
- versioned IndexedDB events, receipts, snapshots, fencing, replay, and bounded catch-up;
- renderer-neutral spatial projections with keyboard and semantic equivalents; and
- a bounded optional local-model treatment that never becomes Reality authority or a runtime requirement.

This is still an internal incomplete V1. The generated product now has the complete
sponsor loop, deliberate Research mode, contextual world selection, Chronicle
handoff, local feedback, and the complete injected-fault matrix. It has not yet
passed the exact-candidate DEEP, frozen-review, confirmation, or release gates.
Founder Alpha remains available only
at `/legacy` as regression evidence; it cannot satisfy V1 readiness. `/research`
and `/developer` deliberately separate evidence and implementation detail from
normal play. The [research map](docs/RESEARCH.md) and
[BibTeX catalog](references.bib) preserve primary sources behind durable technical
choices.

## Run locally

Requirements are macOS on Apple Silicon, Node 22.23.1, and pnpm 11.15.1. Java 21 is also required for the full formal-verification tiers.

```sh
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm dev
```

Open the loopback URL printed by Vite. Enter the current world at `/world`; use
`/legacy` only for Founder Alpha regression checks. Development diagnostics remain
local. To inspect the generated-world observer:

```sh
corepack pnpm diagnose
```

To build and serve the production bundle on loopback only:

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
