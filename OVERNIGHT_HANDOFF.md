# EONFOLK implementation handoff

**Purpose:** Give the operator one practical, evidence-backed summary of the consolidated Riverhold implementation and repository state.

**Status:** IMPLEMENTATION-COMPLETE UNDER OPERATOR OVERRIDE — automated/local and pushed-candidate CI green; human product gates not run

**Authority boundary:** This file summarizes implemented reality. Product and technical semantics remain owned by [docs/INDEX.md](docs/INDEX.md); execution evidence remains in the [001 ExecPlan](docs/exec-plans/active/001-foundation.md).

## 1. Implemented product

Riverhold is a local, account-free proof with eight autonomous citizens, four understandable behavior families, three resources, gathering/consumption, one bilateral exchange, one repair loop, relationships, and one authored Mara/Toma tension. The player follows Mara, investigates, advises or abstains, receives an independent accept/reject/delay/reinterpretation, sees a later systemic consequence, leaves/reloads, advances one bounded day, makes one non-repeatable response, and reads a factual three-beat Chronicle/Story Card.

## 2. Git identity

- Private repository: `PranavMishra28/eonfolk`; default branch `main`.
- Pushed technical candidate: `7d857a216cb9fbd76f2a0afd64418822a84b9a2e`.
- Final repaired implementation/evidence base: `4a677a743d4efcdc337c6ffc0c79d63edee69e8f`.
- A commit cannot contain its own SHA. Resolve the final documentation-only handoff commit with `git rev-parse origin/main`; the final operator delivery also reports it exactly.

## 3. Repository visibility and publication

The repository is private. There is no deployment, public release, domain purchase, hosted model, external service, paid action, credential, or product telemetry. V1 remains useful/free and local.

## 4. Preserved history

Twenty-six remote tags preserve planning, implementation, Gate 0 evidence, and every unique research/review/spike/overnight branch head. The main recovery anchors are `archive/planning-foundation-2026-08-20`, `archive/implementation-pre-overnight-2026-08-21`, `evidence/001-gate0-artifact-a`, `evidence/001-gate0-study-s`, `evidence/001-gate0-resume`, and 21 `archive/local-*-2026-08-21` tags.

## 5. Cleaned topology

The obsolete draft implementation PR #2 was closed without merge. Its remote `codex/eonfolk-001-foundation` and `plan/000-product-foundation` branches were deleted only after green `main` and remote-tag reachability were proven. Seven clean auxiliary worktrees and 23 obsolete local branches were removed. The only retained local worktree is the repository root; the only intentional open PRs are Dependabot #3 and #4, both unmerged.

## 6. Architecture

The authoritative reducer and scheduler are pure TypeScript in `packages/sim`; versioned types/canonical hashing are in `packages/protocol`; the deterministic Standard Brain and bounded decision records are in `packages/cognition`; IndexedDB atomic events/snapshots/fencing live behind `PersistencePort` in `packages/persistence`; experiment records remain separate in `packages/observatory`. A Web Worker owns the runtime. React renders semantic application UI and Pixi renders the Living Woodcut projection. There is no server, auth, multiplayer, Cloudflare adapter, cross-region world, or deployment.

## 7. Pinned implementation cohort

Node 22.23.1 and pnpm 11.15.1 are mandatory on arm64 macOS. The frozen cohort contains 195 packages. Key pinned versions are React 19.2.8, PixiJS 8.19.0, Vite 8.2.2, TypeScript 7.0.2, Vitest 4.1.11, Playwright 1.62.1, fast-check 4.9.0, and Biome 2.5.9. Dependabot updates are review-only; there is no automatic merge.

## 8. Cognition policy

Standard Brain performs the entire game loop deterministically and without inference. A model can only be a future optional `BrainPort` proposal source at explicit decision boundaries; typed validation and canonical Reality remain authoritative. No provider SDK, model download, training, fine-tuning, embedding store, vector database, continuous call, API key, or model-branded character class ships.

## 9. Persistence decision

IndexedDB won the local slice. Commands and events are atomic, idempotent, revision-checked, run-scoped, fenced across tabs, replayed and hash-checked before world facts render. Crash tests cover genesis, catch-up, both counsel commit barriers, response recovery, stale writers, corruption, and collision. Backup/export/restore/import are deliberately unavailable; the server replacement boundary is `PersistencePort`.

## 10. Setup

```bash
export PATH=/Users/pranav/.nvm/versions/node/v22.23.1/bin:$PATH
corepack pnpm install --frozen-lockfile
corepack pnpm runtime:check
```

## 11. Canonical verification

`pnpm verify` passed at `4a677a7`: runtime/cohort/architecture/docs/format/lint/typecheck; 63 unit tests; two property tests; a real Chromium IndexedDB reload; the fixed 20-warmup/200-cycle timing analyzer; production build and bundle budgets; zero known production advisories; eight Playwright journeys; 334 allowed local routes and 36,489 netlog events with zero external attempts; and TLA+ with 3,480 generated/350 distinct states, depth 10, and five invariants. Gitleaks 8.30.1 scanned all local history with no leaks. GitHub run [32481390293](https://github.com/PranavMishra28/eonfolk/actions/runs/32481390293) passed Verify, Formal model, and Secret scan at pushed candidate `7d857a2`.

## 12. Performance and accessibility

The canonical 15-run lab stayed within every unchanged gate: critical shell 123,027 bytes gzip; total route JavaScript 250,885 bytes gzip; zero authored world-asset bytes; worst meaningful display 2,250.9 ms in throttled mobile; every pooled and per-state p95 frame time at or below 10.0 ms; worst frame 10.5 ms. Reduced motion, keyboard/focus behavior, semantic parity, 200% text, mobile layout, and weak-device semantic fallback are browser-tested. This is M4 Pro emulation, not a physical mid-tier-device result.

## 13. Size

The repository has 254 tracked files. Product packages/apps contain 46 TypeScript/TSX files and 11,973 lines; 35 tracked test files contain 6,430 lines. Five compact implementation evidence artifacts are retained. Counts describe the final technical candidate, not engineering hours.

## 14. Honest limitations

Human Gate 0, Gate A, Gate B, and Story Card studies are **NOT RUN**. Fun, unfamiliar-observer legibility, attachment, delayed return, story comprehension/conversion, session-20 depth, physical mobile/4G behavior, production scale, backup/recovery, server authority, and public distribution remain unvalidated. M1–M5 focused-time records are unavailable, so actual compliance with the 40–60-hour labor ceiling is **UNKNOWN**. The one allowed final targeted confirmation failed at `32808e1`; its three P1s are repaired, but no second confirmation pass is claimed.

## 15. Evidence paths

- [Execution and gate status](docs/exec-plans/active/001-foundation.md)
- [Final review reconciliation](docs/reviews/IMPLEMENTATION_FINAL_REVIEW.md)
- [Performance evidence](docs/exec-plans/evidence/001/implementation/performance.json)
- [Bundle evidence](docs/exec-plans/evidence/001/implementation/bundle.json)
- [Decision-trace timing evidence](docs/exec-plans/evidence/001/implementation/decision-trace-timing.json)
- [Persistence benchmark](docs/exec-plans/evidence/001/implementation/persistence.json)
- [Repository/testing contract](docs/quality/TESTING.md)

## 16. First manual test

Run `pnpm --filter @eonfolk/web dev`, open the printed local URL, and use a fresh browser profile. Confirm that no Riverhold facts appear before authoritative loading, follow Mara, investigate the market tally, choose one counsel branch, observe Mara's independent interpretation and consequence, leave/reload, advance one day, make the offered response once, and inspect the Chronicle/Story Card evidence disclosure. Then repeat in semantic view with keyboard only and reduced motion. Treat this as an operator smoke test, not a human Gate A/B result.
