# Frozen dependency cohort

**Purpose:** Preserve the complete exact external package graph authorized for the future local implementation proof.

**Status:** VERIFIED PLANNING EVIDENCE — generated from exact pnpm 11.15.1 resolution and official npm registry metadata on 2026-08-20; implementation must verify raw hashes before use.

**Authority boundary:** This document owns the frozen cohort evidence and validation rule. Architecture owns whether a dependency is needed; the Goal prompt owns future execution.

**Related documents:** [tool inventory](PROPOSED_TOOLS.md), [architecture](../engineering/ARCHITECTURE.md), [Goal prompt](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md), [source ledger](SOURCE_LEDGER.md)

## Recorded cohort

The first implementation proof uses the exact direct versions accepted under D-007 and the complete 195-package external graph recorded here [S-TOOL-20]. This avoids a live resolver silently changing transitive versions, integrity, licenses, or lifecycle scripts.

The evidence files are documentation with inert `.txt`/`.json` paths, not an installed application manifest:

| Evidence | Raw bytes | SHA-256 | Meaning |
|---|---:|---|---|
| [package.json.txt](dependency-cohort/package.json.txt) | 722 | `0592b0e14c95a31b15525970725f626148b3d4c6ba373ba70029bca784100e37` | Exact initial direct dependencies and package-manager pin |
| [pnpm-lock.yaml.txt](dependency-cohort/pnpm-lock.yaml.txt) | 63,206 | `27272cdfbb3410698469edd9bfa3af39ce4f5bb77942671440bd486f1975be74` | Exact pnpm 11.15.1 external resolution/integrity graph |
| [licenses.jcs.json](dependency-cohort/licenses.jcs.json) | 39,251 | `19872aa10aed85c959d35349eac424bf267e3ef8be07675c1d5c7ff89dbf28a2` | Canonical name/version/integrity/license/lifecycle record for all 195 packages |

The license inventory is 124 MIT, 26 Apache-2.0, 24 MPL-2.0, nine MIT OR Apache-2.0, six BSD-3-Clause, five ISC, and one 0BSD. The only lifecycle metadata is `install: node-gyp rebuild` on optional `fsevents@2.3.2` and `fsevents@2.3.3`; implementation suppresses all lifecycle scripts. MPL-2.0 packages remain unmodified dependencies and require notice/source-offer review before public distribution.

## Validation behavior

Before installation, future implementation must:

1. read all three files from the exact approved plan-base commit;
2. match byte counts and SHA-256 values above;
3. copy the first two byte-for-byte to the implementation root before adding only nondependency root metadata/scripts;
4. allow workspace importers only when empty or local-only;
5. prove the implementation lock's complete external `packages` map is deep-equal to the frozen map and every cohort record matches; and
6. install with the frozen lock and lifecycle scripts disabled.

Any external key addition/deletion, integrity/license mismatch, required lifecycle script, or inability to build is a stop/replan condition. Live registry metadata can verify or report advisories; it never selects a different resolution.

## Reopen evidence, rejected alternatives, uncertainty, constraint fit

Reopen only for a blocking install/build defect, a security advisory without an in-scope mitigation, or an operator-approved dependency change. Regenerating from floating direct ranges and resolving at implementation time are rejected because they are not reproducible. Vendoring tarballs is rejected as unnecessary repository weight and a license/security burden.

This adds no installed package, production code, network service, fee, credential, or deployment. The graph is larger than ideal because build tools include platform-option packages; implementation should not broaden it. A public release still needs a fresh attribution/license/security audit.
