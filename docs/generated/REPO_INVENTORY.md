# Generated repository inventory

**Purpose:** Deterministically report the repository file topology used by V1 CI.

**Status:** GENERATED — `pnpm inventory:check` fails when this file differs from the repository file set.

**Authority boundary:** This file inventories paths; it does not decide product readiness. [GOAL.md](../../GOAL.md) owns required-state decisions.

**File-set identity:** 431 files excluding this generated file; SHA-256 `7549a3d4f1b01fd25b38893f3ee6fe658b7b968deb5e9f0567dd843c2feec35d`.

## Tracked topology

| Area | Files |
|---|---:|
| Application code | 45 |
| Documentation | 62 |
| Frozen execution evidence | 32 |
| GitHub automation | 3 |
| Other tracked assets | 3 |
| Packages | 92 |
| Repository tooling | 28 |
| Research and reviews | 48 |
| Root controls and configuration | 23 |
| Tests and fixtures | 95 |

## Workspaces

| Directory | Package | Source files |
|---|---|---:|
| `apps/feedback-worker` | `@eonfolk/feedback-worker` | 8 |
| `apps/web` | `@eonfolk/web` | 25 |
| `packages/civilization` | `@eonfolk/civilization` | 8 |
| `packages/cognition` | `@eonfolk/cognition` | 14 |
| `packages/diagnostics` | `@eonfolk/diagnostics` | 10 |
| `packages/observatory` | `@eonfolk/observatory` | 1 |
| `packages/persistence` | `@eonfolk/persistence` | 11 |
| `packages/protocol` | `@eonfolk/protocol` | 9 |
| `packages/sim` | `@eonfolk/sim` | 9 |
| `packages/world-presentation` | `@eonfolk/world-presentation` | 10 |
| `packages/worldgen` | `@eonfolk/worldgen` | 1 |

## Test cohorts

| Cohort | Files |
|---|---:|
| `tests/e2e` | 2 |
| `tests/fixtures` | 2 |
| `tests/property` | 12 |
| `tests/prototypes` | 26 |
| `tests/timing` | 1 |
| `tests/unit` | 52 |

## Root controls and configuration

- `.env.example`
- `.gitignore`
- `.gitleaks.toml`
- `.markdownlint-cli2.jsonc`
- `.npmrc`
- `.nvmrc`
- `AGENTS.md`
- `FOUNDER_ALPHA_HANDOFF.md`
- `GOAL.md`
- `OVERNIGHT_HANDOFF.md`
- `PLAN.md`
- `README.md`
- `RESUME.md`
- `biome.json`
- `package.json`
- `playwright.gate0.config.ts`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `references.bib`
- `tsconfig.base.json`
- `tsconfig.gate0.json`
- `vite.gate0.config.ts`
- `vitest.gate0.config.ts`

## Founder Alpha regression boundary

The tree contains 6 path names containing `Riverhold` or `Founder Alpha`. They are compatibility, historical, or Founder Alpha regression material. Their browser screenshots, traces, renderer probes, and verification artifacts are **INELIGIBLE FOR V1 READINESS** and cannot satisfy a V1 row in [GOAL.md](../../GOAL.md).

CI labels the retained visual artifact `founder-alpha-regression-only-*` and writes it under `tmp/founder-alpha-regression-evidence`. The selectors may remain Riverhold-specific until the V1 presentation exists; passing them proves only that the legacy regression surface was not broken.

## Regeneration contract

- Run `pnpm inventory:generate` after adding, removing, or moving repository files.
- Run `pnpm inventory:check` in CI and before integration.
- The generator sorts all paths and emits no wall-clock value or mutable branch label.
- A clean check proves this inventory matches the repository file set; it does not prove any implementation requirement.
