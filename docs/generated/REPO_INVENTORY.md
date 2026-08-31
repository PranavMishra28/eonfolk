# Generated repository inventory

**Purpose:** Deterministically report the repository file topology used by V1 CI.

**Status:** GENERATED — `pnpm inventory:check` fails when this file differs from the repository file set.

**Authority boundary:** This file inventories paths; it does not decide product readiness. [GOAL.md](../exec-plans/completed/GOAL.md) owns required-state decisions as a historical V1 ledger.

**File-set identity:** 558 files excluding this generated file; SHA-256 `25c66a8a8db8b647f63b054e84cb7cd626ecc11a63b54a15ba67929676519201`.

## Tracked topology

| Area | Files |
|---|---:|
| Application code | 56 |
| Documentation | 104 |
| Frozen execution evidence | 67 |
| GitHub automation | 9 |
| Other tracked assets | 9 |
| Packages | 98 |
| Repository tooling | 33 |
| Research and reviews | 55 |
| Root controls and configuration | 24 |
| Tests and fixtures | 103 |

## Workspaces

| Directory | Package | Source files |
|---|---|---:|
| `apps/web` | `@eonfolk/web` | 44 |
| `packages/civilization` | `@eonfolk/civilization` | 11 |
| `packages/cognition` | `@eonfolk/cognition` | 16 |
| `packages/diagnostics` | `@eonfolk/diagnostics` | 10 |
| `packages/persistence` | `@eonfolk/persistence` | 12 |
| `packages/protocol` | `@eonfolk/protocol` | 9 |
| `packages/sim` | `@eonfolk/sim` | 10 |
| `packages/world-presentation` | `@eonfolk/world-presentation` | 12 |
| `packages/worldgen` | `@eonfolk/worldgen` | 1 |

## Test cohorts

| Cohort | Files |
|---|---:|
| `tests/e2e` | 15 |
| `tests/fixtures` | 2 |
| `tests/manual` | 2 |
| `tests/property` | 18 |
| `tests/timing` | 1 |
| `tests/tsconfig.json` | 1 |
| `tests/unit` | 64 |

## Root controls and configuration

- `.env.example`
- `.gitattributes`
- `.gitignore`
- `.gitleaks.toml`
- `.markdownlint-cli2.jsonc`
- `.npmrc`
- `.nvmrc`
- `AGENTS.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `NOTICE`
- `README.md`
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

The repository contains 3 path names containing `Riverhold` or `Founder Alpha`. Current application paths may use Riverhold as the canonical settlement name; Founder Alpha review records are historical evidence and cannot satisfy a current V1 row in [GOAL.md](../exec-plans/completed/GOAL.md).

The removed Founder Alpha browser application is preserved only in the private archive tag and external bundle; no production route or CI capture executes it.

## Regeneration contract

- Run `pnpm inventory:generate` after adding, removing, or moving repository files.
- Run `pnpm inventory:check` in CI and before integration.
- The generator sorts all paths and emits no wall-clock value or mutable branch label.
- A clean check proves this inventory matches the repository file set; it does not prove any implementation requirement.
