# Generated repository inventory

**Purpose:** Deterministically report the repository file topology used by V1 CI.

**Status:** GENERATED — `pnpm inventory:check` fails when this file differs from the repository file set.

**Authority boundary:** This file inventories paths; it does not decide product readiness. [GOAL.md](../../GOAL.md) owns required-state decisions.

**File-set identity:** 483 files excluding this generated file; SHA-256 `a7a5bd33d38f61683391a3f2d6ac2b63a5ed22e65c3c0f8d313f781b4bda8dae`.

## Tracked topology

| Area | Files |
|---|---:|
| Application code | 52 |
| Documentation | 78 |
| Frozen execution evidence | 35 |
| GitHub automation | 9 |
| Other tracked assets | 9 |
| Packages | 95 |
| Repository tooling | 31 |
| Research and reviews | 54 |
| Root controls and configuration | 27 |
| Tests and fixtures | 93 |

## Workspaces

| Directory | Package | Source files |
|---|---|---:|
| `apps/web` | `@eonfolk/web` | 41 |
| `packages/civilization` | `@eonfolk/civilization` | 10 |
| `packages/cognition` | `@eonfolk/cognition` | 15 |
| `packages/diagnostics` | `@eonfolk/diagnostics` | 10 |
| `packages/persistence` | `@eonfolk/persistence` | 12 |
| `packages/protocol` | `@eonfolk/protocol` | 9 |
| `packages/sim` | `@eonfolk/sim` | 10 |
| `packages/world-presentation` | `@eonfolk/world-presentation` | 11 |
| `packages/worldgen` | `@eonfolk/worldgen` | 1 |

## Test cohorts

| Cohort | Files |
|---|---:|
| `tests/e2e` | 7 |
| `tests/fixtures` | 2 |
| `tests/manual` | 2 |
| `tests/property` | 18 |
| `tests/timing` | 1 |
| `tests/tsconfig.json` | 1 |
| `tests/unit` | 62 |

## Root controls and configuration

- `.env.example`
- `.gitignore`
- `.gitleaks.toml`
- `.markdownlint-cli2.jsonc`
- `.npmrc`
- `.nvmrc`
- `AGENTS.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `FOUNDER_ALPHA_HANDOFF.md`
- `GOAL.md`
- `LICENSE`
- `NOTICE`
- `PLAN.md`
- `README.md`
- `RESUME.md`
- `ROADMAP.md`
- `SECURITY.md`
- `SUPPORT.md`
- `THIRD_PARTY_NOTICES.md`
- `biome.json`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `references.bib`
- `tsconfig.base.json`

## Historical naming boundary

The private tree contains 3 path names containing `Riverhold` or `Founder Alpha`. Current application paths may use Riverhold as the canonical settlement name; Founder Alpha review records are historical evidence and cannot satisfy a current V1 row in [GOAL.md](../../GOAL.md).

The removed Founder Alpha browser application is preserved only in the private archive tag and external bundle; no production route or CI capture executes it.

## Regeneration contract

- Run `pnpm inventory:generate` after adding, removing, or moving repository files.
- Run `pnpm inventory:check` in CI and before integration.
- The generator sorts all paths and emits no wall-clock value or mutable branch label.
- A clean check proves this inventory matches the repository file set; it does not prove any implementation requirement.
