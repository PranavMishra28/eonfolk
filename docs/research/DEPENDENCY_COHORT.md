# Frozen dependency cohort

**Purpose:** Preserve the complete exact external package graph authorized for the future local implementation proof.

**Status:** VERIFIED IMPLEMENTATION EVIDENCE — regenerated from the exact pnpm 11.15.1 resolution and official npm registry metadata on 2026-08-21 after the World Presence renderer decision.

**Authority boundary:** This document owns the frozen cohort evidence and validation rule. Architecture owns whether a dependency is needed; the Goal prompt owns future execution.

**Related documents:** [tool inventory](PROPOSED_TOOLS.md), [architecture](../engineering/ARCHITECTURE.md), [Goal prompt](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md), [source ledger](SOURCE_LEDGER.md)

## Recorded cohort

The Founder Alpha uses the exact direct versions accepted under D-007 plus `@playcanvas/react@0.11.5` and `playcanvas@2.21.4`, and the complete 199-package external graph recorded here [S-TOOL-20] [S-WP-013]. Pixi remains a development-only dependency solely for immutable Gate 0 evidence; the production web app imports PlayCanvas, not Pixi. This avoids a live resolver silently changing transitive versions, integrity, licenses, or lifecycle scripts.

The evidence files are documentation with inert `.txt`/`.json` paths, not an installed application manifest:

| Evidence | Raw bytes | SHA-256 | Meaning |
|---|---:|---|---|
| [package.json.txt](dependency-cohort/package.json.txt) | 785 | `1c0b91954799e37a87d63942d59d828989d07ad006101d0d07a03cd23741ee3e` | Exact direct dependencies and package-manager pin after renderer adoption |
| [pnpm-lock.yaml.txt](dependency-cohort/pnpm-lock.yaml.txt) | 67,376 | `4a5ab93a8d9d87923ba01901a1c582585a2b214b91451655690ce39d7f6a32bc` | Exact pnpm 11.15.1 external resolution/integrity graph |
| [licenses.jcs.json](dependency-cohort/licenses.jcs.json) | 40,011 | `8eff2fa6802e8693c53326aa142a278a27770101b16d54dbe6222eb031fc989e` | Canonical name/version/integrity/license/lifecycle record for all 199 packages |

The license inventory is 128 MIT, 26 Apache-2.0, 24 MPL-2.0, nine MIT OR Apache-2.0, six BSD-3-Clause, five ISC, and one 0BSD. The only lifecycle metadata is `install: node-gyp rebuild` on optional `fsevents@2.3.2` and `fsevents@2.3.3`; installation suppresses all lifecycle scripts. PlayCanvas and its React wrapper are MIT. MPL-2.0 packages remain unmodified dependencies and require notice/source-offer review before public distribution.

## Validation behavior

Before installation or an approved dependency change, the coordinator must:

1. read all three files from the exact approved plan-base commit;
2. match byte counts and SHA-256 values above;
3. keep dependency/devDependency objects byte-equivalent to the frozen manifest;
4. allow workspace importers only when empty or local-only;
5. prove the implementation lock's complete external `packages` map is deep-equal to the frozen map and every cohort record matches; and
6. install with the frozen lock and lifecycle scripts disabled.

Any external key addition/deletion, integrity/license mismatch, required lifecycle script, or inability to build is a stop/replan condition. Live registry metadata can verify or report advisories; it never selects a different resolution.

## Reopen evidence, rejected alternatives, uncertainty, constraint fit

Reopen only for a blocking install/build defect, a security advisory without an in-scope mitigation, or an operator-approved dependency change. The committed `cohort:freeze` command regenerates evidence only after such approval; it reads exact lock versions and accepts metadata solely when npm registry integrity matches the lock. Floating direct ranges and unreviewed resolution are rejected because they are not reproducible. Vendoring tarballs is rejected as unnecessary repository weight and a license/security burden.

This adds no installed package, production code, network service, fee, credential, or deployment. The graph is larger than ideal because build tools include platform-option packages; implementation should not broaden it. A public release still needs a fresh attribution/license/security audit.
