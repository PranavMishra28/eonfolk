# Generated repository inventory

**Purpose:** Deterministically report the repository file topology used by V1 CI.

**Status:** GENERATED — `pnpm inventory:check` fails when this file differs from the repository file set.

**Authority boundary:** This file inventories paths; it does not decide product readiness. [GOAL.md](../../GOAL.md) owns required-state decisions.

**File-set identity:** 487 files excluding this generated file; SHA-256 `9a90cc3f3e08aa39a2f3ea1be1a98ffc0d4280c79ebac0da3df1f8a45f5a50e8`.

## Tracked topology

| Area | Files |
|---|---:|
| Application code | 65 |
| Documentation | 62 |
| Frozen execution evidence | 33 |
| GitHub automation | 4 |
| Other tracked assets | 3 |
| Packages | 95 |
| Repository tooling | 33 |
| Research and reviews | 48 |
| Root controls and configuration | 25 |
| Tests and fixtures | 119 |

## Workspaces

| Directory | Package | Source files |
|---|---|---:|
| `apps/feedback-worker` | `@eonfolk/feedback-worker` | 8 |
| `apps/web` | `@eonfolk/web` | 42 |
| `packages/civilization` | `@eonfolk/civilization` | 9 |
| `packages/cognition` | `@eonfolk/cognition` | 15 |
| `packages/diagnostics` | `@eonfolk/diagnostics` | 10 |
| `packages/observatory` | `@eonfolk/observatory` | 1 |
| `packages/persistence` | `@eonfolk/persistence` | 11 |
| `packages/protocol` | `@eonfolk/protocol` | 9 |
| `packages/sim` | `@eonfolk/sim` | 9 |
| `packages/world-presentation` | `@eonfolk/world-presentation` | 11 |
| `packages/worldgen` | `@eonfolk/worldgen` | 1 |

## Test cohorts

| Cohort | Files |
|---|---:|
| `tests/e2e` | 4 |
| `tests/fixtures` | 2 |
| `tests/manual` | 2 |
| `tests/property` | 18 |
| `tests/prototypes` | 26 |
| `tests/timing` | 1 |
| `tests/unit` | 66 |

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
- `package.json`
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
