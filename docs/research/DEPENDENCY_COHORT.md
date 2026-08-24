# Frozen dependency cohort

**Purpose:** Preserve the complete exact external package graph authorized for the future local implementation proof.

**Status:** VERIFIED IMPLEMENTATION EVIDENCE — executable validation reconfirmed the reduced exact pnpm 11.15.1 resolution on 2026-08-23 after World Presence integration and dead workspace/dependency removal.

**Authority boundary:** This document owns the frozen cohort evidence and validation rule. Architecture owns whether a dependency is needed; the Goal prompt owns future execution.

**Related documents:** [tool inventory](PROPOSED_TOOLS.md), [architecture](../engineering/ARCHITECTURE.md), [Goal prompt](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md), [source ledger](SOURCE_LEDGER.md)

## Recorded cohort

Release Genesis uses four direct production dependencies: exact React 19.2.8, React DOM 19.2.8, `@playcanvas/react@0.11.5`, and `playcanvas@2.21.4`. The complete 224-package external lock graph is recorded here [S-TOOL-20] [S-WP-013]. The obsolete Gate 0/Pixi harness, unused Observatory package, feedback-relay workspace, and six previously approved but unreachable UI dependencies were removed after repository-wide reachability inspection. Immutable tags and historical evidence preserve what ran without keeping those old execution surfaces active. This avoids dead production/security surface and prevents a live resolver from silently changing transitive versions, integrity, licenses, or lifecycle scripts.

The evidence files are documentation with inert `.txt`/`.json` paths, not an installed application manifest:

| Evidence | Raw bytes | SHA-256 | Meaning |
|---|---:|---|---|
| [package.json.txt](dependency-cohort/package.json.txt) | 573 | `32c813843cfed796fc3526e322acdefb7d35c0e013e50cd5cbba4e2a15764196` | Exact direct dependencies and package-manager pin after obsolete harness removal |
| [pnpm-lock.yaml.txt](dependency-cohort/pnpm-lock.yaml.txt) | 71,707 | `dec8e86d7ca019df1343633f70e4ed93dc219b29a80e918b1e4228a59ccc8c01` | Exact pnpm 11.15.1 external resolution/integrity graph for the ten current workspaces |
| [licenses.jcs.json](dependency-cohort/licenses.jcs.json) | 44,616 | `1bedbaa5a7af5bf542f551c1925c76b2cb8f698b5ceba255ea0f526608a53ba1` | Canonical name/version/integrity/license/lifecycle record for all 224 packages |

The license inventory is 164 MIT, 26 Apache-2.0, 12 MPL-2.0, nine MIT OR Apache-2.0, six BSD-3-Clause, five ISC, and one each of Python-2.0 and BSD-2-Clause. The only lifecycle metadata is `install: node-gyp rebuild` on optional `fsevents@2.3.2` and `fsevents@2.3.3`; installation suppresses all lifecycle scripts. PlayCanvas and its React wrapper are MIT. MPL-2.0 packages remain unmodified dependencies and require notice/source-offer review before public distribution.

## Validation behavior

Before installation or an approved dependency change, the coordinator and CI must:

1. read all three files from the exact approved plan-base commit;
2. match byte counts and SHA-256 values above;
3. keep dependency/devDependency objects byte-equivalent to the frozen manifest;
4. allow workspace importers only when empty or local-only;
5. prove the implementation lock's complete external `packages` map is deep-equal to the frozen map and every cohort record matches; and
6. install with the frozen lock and lifecycle scripts disabled.

CI executes the dependency-cohort validator immediately after checkout, before setting up or fetching package dependencies, and again as an early constituent of the PR verification runner after installation. The first pass blocks an unauthorized graph before package fetch; the second proves the installed-tool verification path still sees the same frozen inputs.

Any external key addition/deletion, integrity/license mismatch, required lifecycle script, or inability to build is a stop/replan condition. Live registry metadata can verify or report advisories; it never selects a different resolution.

## Reopen evidence, rejected alternatives, uncertainty, constraint fit

Reopen only for a blocking install/build defect, a security advisory without an in-scope mitigation, or an operator-approved dependency change. The committed `cohort:freeze` command regenerates evidence only after such approval; it reads exact lock versions and accepts metadata solely when npm registry integrity matches the lock. Floating direct ranges and unreviewed resolution are rejected because they are not reproducible. Vendoring tarballs is rejected as unnecessary repository weight and a license/security burden.

This adds no installed package, production code, network service, fee, credential, or deployment. The graph is larger than ideal because build tools include platform-option packages; implementation should not broaden it. A public release still needs a fresh attribution/license/security audit.
