# World Presence clean integration checkpoint

**Purpose:** bind the first clean, exact-commit production integration evidence for the PlayCanvas World Presence candidate.

**Status:** VERIFIED CLEAN CHECKPOINT; CANONICAL 15-RUN PERFORMANCE AND INDEPENDENT HUMAN REVIEW PENDING

**Authority boundary:** this record reports one local command sequence. Numerical budgets remain owned by [Performance](../../../quality/PERFORMANCE.md), release status by the [Founder Alpha plan](../../active/002-founder-alpha.md), and the inhabited/alive verdict by [Visual QA](../../../quality/VISUAL_QA.md).

**Related documents:** [evidence index](README.md), [source ledger](../../../research/SOURCE_LEDGER.md), [D-008](../../../decisions/DECISIONS.md#d-008--continuous-living-woodcut-world-on-playcanvas), and [Founder Alpha handoff](../../../../FOUNDER_ALPHA_HANDOFF.md).

## Bound source

- Commit: `593e5ab8bbf0bbe0f5977bc016b6c520a4877bf8`
- Tree: `2f25be227d255fb51ac132d4522bc8b52fa570e6`
- Branch: `feat/002-founder-alpha`
- Source status before and after: clean
- Lockfile SHA-256: `4a5ab93a8d9d87923ba01901a1c582585a2b214b91451655690ce39d7f6a32bc`
- Root package manifest SHA-256: `ef1bb94bd48fa4b4f7bb0910fbd170141927a1ebe652d24cec8c0aea03d86978`
- Dependency-cohort record SHA-256: `816be8fb5c0099048848eb8a513ea53dfc834b8694edea10a1f1e20bdf5d8b4b`

## Exact command

```sh
pnpm build && \
  pnpm budget:check && \
  pnpm test:e2e:production && \
  pnpm cohort:check && \
  pnpm security:audit && \
  git status --short
```

## Results

| Check | Result |
|---|---|
| Production build | PASS; 1,307 modules transformed |
| Critical shell | 95,581 bytes gzip; PASS against 204,800-byte limit |
| Total initial-route JavaScript | 632,154 bytes gzip; PASS against 665,600-byte limit |
| Lazy `RiverholdWorld` chunk | 512,155 bytes gzip; recorded subset of the total route |
| First-world assets | 0 bytes; PASS against 6 MiB desktop / 4 MiB mobile limits |
| Unchanged-production journeys | 15/15 PASS |
| Network oracle | 202 routed requests and 31,446 netlog events; zero external attempts |
| Frozen dependency cohort | PASS; 199 packages, no drift |
| Production dependency audit | PASS; no known vulnerabilities |
| Final source status | clean; `git status --short` emitted no output |

The browser matrix includes the World Presence temporal journey in the same unchanged production build as the fourteen existing player, accessibility, persistence, diagnostic, and failure journeys. This checkpoint proves integration and fail-fast gates at the named commit. It does not replace the canonical repeated performance procedure.

## Honest limits

- **NOT RUN at this checkpoint:** five cold repetitions for each of the three required profiles and the associated frame/display distributions.
- **NOT RUN at this checkpoint:** independent ten-/thirty-second human World Presence review and the required inhabited/alive answer.
- **NOT RUN:** physical mobile performance, thermal, touch, reduced-motion, or semantic-fallback journey.
- Build warnings from optional PlayCanvas Draco/GSplat paths externalizing `node:worker_threads` remain review input; no such decoder or runtime world asset is used by this candidate.

Release readiness remains open until the fresh canonical DEEP run and independent review close their separate gates.
