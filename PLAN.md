# EONFOLK V1 integration plan

**Purpose:** Track the current V1 integration sequence, evidence gates, integration history, frozen candidate, and exit status.

**Status:** V1 IN PROGRESS — draft mega PR #9; Founder Alpha retained as regression evidence

**Authority boundary:** [GOAL.md](GOAL.md) owns every required software state. [RESUME.md](RESUME.md) owns the exact restart. This file owns integration sequencing and checkpoints. [docs/INDEX.md](docs/INDEX.md) owns document authority.

**Related documents:** [V1 ExecPlan](docs/exec-plans/active/003-v1-civilization.md), [source ledger](docs/research/SOURCE_LEDGER.md), [decisions](docs/decisions/DECISIONS.md), [risks](docs/decisions/RISKS.md), and [completed Founder Alpha plan](docs/exec-plans/completed/002-founder-alpha.md).

## Binding constraints

- One solo builder; preserve a compelling 40–60-hour proof shape even while constructing the larger internal V1 benchmark.
- Target approximately $0 spend. No deployment, paid action, credentials, model download, or public publication without separate approval.
- Apple M4 Max with 48 GB unified memory is the measured development machine. No owned GPU infrastructure and no model training or fine-tuning.
- V1 remains useful/free and complete without external inference. Payments, revenue operations, regulated data, proprietary datasets, partnerships, and enterprise sales are excluded.
- Typed Reality is sole authority. Mind is actor-bounded. Brain is untrusted. Application validates. Chronicle and Observatory cannot mutate Reality.
- One integration branch, `feat/v1-civilization`, and one private draft mega PR target `main`.

## Current sequence

| Phase | Status | Exit evidence |
|---|---|---|
| 1. Exact base, V1 ledger, repository archaeology | Complete | Base `8eb6afa`; archive tag; `GOAL.md`; `RESUME.md`; generated inventory |
| 2. Release Genesis, generalized protocol, deterministic world generator | Complete for pure contracts | Versioned identities; three differentiated seeds; 160-seed deep properties; golden world hash |
| 3. Civilization kernel and long-horizon emergence | In progress | Deterministic 30/90/365 harness integrated; scheduler, demographic pressure, rule-triggered expansion, route traversal, and founding materialization pending |
| 4. Cognition and experiment treatments | In progress | Standard Brain gateway, planners, Standing Plan lifecycle, closed model choice and local lab integrated; executable isolated model host and memory pending |
| 5. Persistence, replay, recovery, diagnostics | Not complete | Founder Alpha regression exists; generalized V1 adapter/migrations/catch-up evidence pending |
| 6. Generated-world product presentation | In progress | `/genesis` and `/world` expose immutable generated projections with semantic fallback; browser audit still shows an abstract map, so living citizens, temporal world, default-entry migration, and performance/visual evidence remain pending |
| 7. CI, security, documentation and developer experience | In progress | Readiness guard, inventory freshness, 14-mutant gate, secret/formal checks, and supplementary portable-extended manifest integrated; V1 evidence lanes pending |
| 8. Exact-candidate DEEP, frozen reviews, fixes, merge | Not started | No V1 frozen SHA or release verdict exists |

## Integration history

| Cohort | Integrated commits | Evidence boundary |
|---|---|---|
| V1 controls and archaeology | `e37f5ff`, `5f86232`, `165b0a3` | Ledger, restart, exact repository inventory; no implementation claim |
| Protocol and Release Genesis | `6a32bea` | Generalized typed contracts and identity only |
| Baseline repair | `2540bd4`, `3aebddf` | Test-oracle repair; all pre-authority suppression retained |
| Cognition authority and local lab | `7bfc080`, `3eecc82`, `ebd1829`, `b75f33b` | Validated fallback gateway; cached local model measured but not promoted |
| Deterministic planners and model choice | `2756643`, `e542b5d`, `8fbfdb9`, `5309b87`, `87b54c1` | Actor-visible bounded planning, lifecycle, closed proposal/provenance, deep arbitrary properties; no host process treatment |
| Generated world | `07d8cc8`, `2d78cc8`, `6a7cf76`, `1991816` | Pure generator, workspace registration, canonical places/routes, deep properties |
| Civilization kernel and horizon harness | `37bc3ee`, `0c45a7c`, `e1bf6b9`, `0fb9a23` | Immutable stocks/transfers/recipes/projects and replayable 30/90/365 experiments; fixed-day scheduling and record-only founding are not acceptance evidence |
| Generalized presentation | `cd06797`, `35091bb` | Immutable semantic projections; no renderer/browser acceptance |
| Genesis browser checkpoint | `939079b`, `fce9646` | Fixed-seed account-free entry, generated region/settlement views, semantic fallback, reduced motion, and six focused browser journeys; visual audit fails the World Presence bar |
| CI hardening | `60e6c61`, `76b2389`, `b53f884`, `bb84028`, `3cbc40d` | 14/14 targeted mutants, fail-closed V1 readiness, legacy artifact boundary, deterministic inventory, and separately bounded portable-extended evidence |

Every integration was required to have bounded ownership, an actual diff inspection, focused verification, a clean commit, and coordinator reconciliation. Detailed limitations and the next exact commands live in `RESUME.md`.

## Evidence gates

1. **Pure-system gate:** deterministic identity, hashes, invariants, conservation, actor-visible cognition, and replay properties.
2. **Civilization gate:** normal rules produce both a viable second settlement and a legitimate stagnant/failing seed across 30/90/365-day experiments without elapsed-time or seed-name triggers.
3. **Product gate:** the generated civilization is legible and compelling in the browser at desktop, laptop, and mobile viewports; a passing backend suite cannot substitute.
4. **Reliability gate:** exact-candidate persistence, crash, catch-up, no-model, renderer, network, security, and diagnostics failures recover without corrupting authority.
5. **Review gate:** six independent frozen-SHA reviews, every accepted P0/P1 repaired, and one fresh confirmation.
6. **Release gate:** every required `GOAL.md` row is `VERIFIED`; exact clean PR and target-Mac DEEP manifests bind the candidate; protected checks are green.

## Frozen candidate

No V1 candidate is frozen. The draft PR must not be marked ready or merged while this remains true.

## Exit checklist

- [ ] Every required software row in `GOAL.md` is `VERIFIED`.
- [ ] The active ExecPlan records final behavior, deviations, evidence, and honest limitations.
- [ ] V1-specific browser and long-horizon artifacts—not Founder Alpha regression artifacts—bind the exact candidate SHA.
- [ ] Exact-candidate FAST, PR, DEEP, formal, security, mutation, property, build, browser, accessibility, and performance gates pass.
- [ ] Six frozen-SHA reviews and the permitted confirmation report no unresolved P0/P1.
- [ ] The mega PR is moved from draft only after the readiness checker passes.
- [ ] Protected GitHub checks pass on that unchanged head.
- [ ] Merge authorization is still valid; `main` is merged, fetched, and verified; stale merged branches/worktrees are safely pruned without deleting unique history.

Human fun, attachment, return, sharing, and session-20 studies may remain explicitly **NOT RUN**. Public deployment may remain **NOT DEPLOYED**. Neither permits unfinished required software.
