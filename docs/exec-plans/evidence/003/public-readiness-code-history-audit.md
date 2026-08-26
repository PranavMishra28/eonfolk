# Public-readiness code, history, license, and asset audit

**Purpose:** Determine whether the EONFOLK source tree and Git history at the
named candidate can be published, and define a safe, reproducible public-export
boundary.

**Status:** COMPLETE FOR CANDIDATE
`8b06022d4bfb6a803a7d6f54abd39e21c3bd4f2f`; publication remains blocked until
the findings below are implemented and rerun against the final accepted `main`.

**Authority boundary:** This audit owns publication-readiness findings about Git
history, dependency licenses, tracked assets, scripts, and configuration. It does
not authorize changing repository visibility, rewriting history, deleting private
evidence, choosing a final license on the owner's behalf, deploying, spending,
adding credentials, or changing product authority.

**Related documents:** [repository front door](../../../../README.md),
[authority index](../../../INDEX.md), [V1 plan](../../active/003-v1-civilization.md),
[dependency cohort](../../../research/DEPENDENCY_COHORT.md), and
[asset research](../../../research/WORLD_PRESENCE_ASSET_RESEARCH.md).

**Audit date:** 2026-08-24 Pacific.

## Executive decision

Do **not** make the existing private repository or its existing history public.
Keep it as the engineering/evidence archive and produce a deterministic,
allowlisted, single-root sanitized export from the final accepted `main` tree.
The export must start with new public history and must not have a remote until a
separate publication action is explicitly authorized.

This is a publication-boundary finding, not a secret incident:

- Gitleaks 8.30.1 found zero leaks in the candidate working tree and zero leaks
  in the candidate's reachable Git history. Synthetic secret-looking values in
  tests remain test data and were not reported by Gitleaks.
- The candidate's 430 reachable commits nevertheless include workstation paths,
  Codex attachment paths and hashes, internal execution ledgers, review and
  evidence machinery, a large Goal-mode prompt, old screenshots, and personal
  author email metadata. Deleting those files from the tip would not remove them
  from history.
- The repository has no project `LICENSE`, `NOTICE`, or
  `THIRD_PARTY_NOTICES.md`. The production dependency graph is permissively
  licensed, but the built web output contains bundled third-party code without a
  colocated notice file or retained license banner.
- The generated humanoid proxy has strong repository-local provenance, but its
  manifest currently says that no standalone asset license is granted. The
  EONFOLK mark has commit provenance but no explicit asset-rights record. The 15
  concept images are generated planning references whose own manifest excludes
  production use.

Apache-2.0 is a viable license for repository-original source code **if** the
owner confirms that they hold or can license all contributions and implements
the separate documentation, asset, media, and trademark treatment below. Commit
metadata is useful provenance, not legal proof or legal clearance.

## Findings

### PRA-HIST-001 — Existing history is not a public-release history

**Disposition: PUBLICATION BLOCKER; use a sanitized export, not a history
rewrite.**

Evidence from the exact candidate:

| Check | Result |
|---|---:|
| Candidate | `8b06022d4bfb6a803a7d6f54abd39e21c3bd4f2f` |
| Commits reachable from candidate | 430 |
| Candidate-reachable author emails | 429 personal-email commits; 1 Dependabot noreply commit |
| Unique paths ever present in candidate history | 515 |
| Historical paths matching execution/evidence/review/prompt categories | 74 |
| Current tracked files containing an absolute workstation or Codex attachment path | 22 |
| Commits adding/removing `/Users/pranav` | 29 |
| Commits adding/removing `.codex/attachments` | 2 |
| Commits adding/removing `pasted-text` | 2 |
| Commits adding/removing `Mega PR` | 8 |
| Commits adding/removing `GOAL.md` | 12 |
| Current tracked bytes | 51,633,113 |
| Packed shared-object-store size observed during audit | 48.48 MiB |

The private-path hits include `FOUNDER_ALPHA_HANDOFF.md`, `RESUME.md`, the Goal
prompt, completed plans, operator overrides, implementation evidence, research,
and review records. Two content-addressed operator records name exact Codex
attachment paths and attachment hashes. `docs/exec-plans/IMPLEMENTATION_GOAL_PROMPT.md`
is a 153,845-byte internal orchestration prompt. Candidate history also retains
deleted `OVERNIGHT_HANDOFF.md`, `.github/workflows/v1-evidence.yml`, and `spike/`
screenshots. The current tree contains 43 Markdown files with one or more of the
internal markers `Mega PR`, `GOAL.md`, `RESUME.md`, `Codex`, `subagent`,
`worktree`, operator override, evidence SHA, or frozen SHA.

The history is also needlessly heavy for a public clone. Fifteen generated
planning concepts account for roughly 44.7 MB of current tracked bytes; the
largest individual blob is 3,692,230 bytes. They are not production assets.

The personal author email may be intentionally public, but no such intent is
recorded. A new public root should use an owner-approved GitHub noreply identity.
Do not fabricate signatures or rewrite the private evidence repository merely to
change this metadata.

### PRA-HIST-002 — Secret scan is green but cannot clear publication metadata

**Disposition: PASS FOR CREDENTIAL LEAKS; NOT A PUBLICATION PASS.**

`gitleaks git --redact --log-opts HEAD` scanned 422 non-merge commits / about
7.80 MB and reported no leaks. `gitleaks dir --redact` scanned about 5.37 MB of
the candidate worktree and reported no leaks. A separate `--all` probe over the
live private repository also reported zero leaks; its ref count is intentionally
not treated as stable because other isolated implementation worktrees were active
during this audit.

Gitleaks detects credential patterns. It does not classify personal email,
absolute local paths, operator attachment identifiers, private planning text,
or internal evidence as publication-safe. Preserve both scans in the private
audit record and rerun tree and history scans on the sanitized export.

### PRA-LIC-001 — Project license and attribution files are absent

**Disposition: PUBLICATION BLOCKER.**

There is no tracked project `LICENSE`, `NOTICE`, or third-party notice file, and
the root/workspace package manifests do not declare a project license. The
candidate build contains React, React DOM, Scheduler, PlayCanvas, and PlayCanvas
React code. A text scan of `apps/web/dist` found no license/notice file and no
retained `Copyright`, `MIT License`, or `Apache License` banner in its emitted
HTML/CSS/JavaScript.

Before public distribution:

1. Add the complete Apache License 2.0 text as `LICENSE` after owner approval.
2. Add a concise `NOTICE` naming the project's copyright owner and explicitly
   excluding the EONFOLK name and marks from the patent/copyright license.
3. Add `license: "Apache-2.0"` to the root and each public workspace manifest.
4. Add `THIRD_PARTY_NOTICES.md` generated from the exact final lock and exact
   packaged production cohort. Include full required notices in release
   artifacts, not only a link to package metadata.
5. Add the complete CC BY 4.0 legal text under `LICENSES/` if the recommended
   documentation treatment is accepted. State all path-specific documentation,
   media, asset, and trademark rules in the public README and notices. Do not
   rely on an ambiguous blanket-license statement.

Recommended rights split:

| Material | Recommended treatment |
|---|---|
| Repository-original application, package, test, script, workflow, and formal-model source | Apache-2.0 |
| Public Markdown documentation | CC BY 4.0 after including its full terms and an attribution rule; this keeps documentation treatment explicit and separate from code |
| Generated humanoid proxy GLTF/GLB | Include under Apache-2.0 after changing the manifest's contradictory “no standalone asset license granted” sentence |
| EONFOLK name, wordmark, and mark | Reserved trademark/brand rights; not licensed for confusing project identity by the source license |
| Current-game screenshots and recordings | Explicit public-documentation/media grant or reserved-rights statement selected by the owner; record source build, capture method, date, and hash |
| Fifteen generated planning concepts and old Gate 0 screenshots | Exclude from the public export |
| Third-party dependencies | Their own licenses; reproduce applicable notices and do not imply they are Apache-2.0 project code |

This is a provenance recommendation, not legal advice or trademark clearance.

### PRA-LIC-002 — Dependency cohort is compatible but needs notices

**Disposition: COMPATIBLE WITH CONDITIONS.**

The exact lock validator passed and confirmed 224 external package records with
no drift. The frozen complete cohort records:

| License expression | Packages |
|---|---:|
| MIT | 164 |
| Apache-2.0 | 26 |
| MPL-2.0 | 12 |
| MIT OR Apache-2.0 | 9 |
| BSD-3-Clause | 6 |
| ISC | 5 |
| Python-2.0 | 1 |
| BSD-2-Clause | 1 |

No GPL, AGPL, LGPL, SSPL, Business Source License, Elastic License, or Commons
Clause expression appears in the frozen ledger. The only declared lifecycle
scripts are `node-gyp rebuild` for optional `fsevents@2.3.2` and `2.3.3`; the
repository installs with lifecycle scripts disabled.

`pnpm licenses list --prod --json` on the exact installed candidate reported the
eight packaged production packages: seven MIT packages (`@playcanvas/react`,
`@types/webxr`, `dedent`, `playcanvas`, `react`, `react-dom`, and `scheduler`) and
one BSD-3-Clause package (`@webgpu/types`). Direct metadata and installed license
files confirmed:

| Package | Version | Metadata license | Installed license-file SHA-256 |
|---|---:|---|---|
| React | 19.2.8 | MIT | `da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93` |
| React DOM | 19.2.8 | MIT | `da6d3703ed11cbe42bd212c725957c98da23cbff1998c05fa4b3d976d1a58e93` |
| PlayCanvas | 2.21.4 | MIT | `42fa51ddd556be151a29f381fb97ee975825dcc454e805ea3ea9c079cca04d34` |
| PlayCanvas React | 0.11.5 | MIT | `44716a2a1040df078772702d677d46f7d97f40c2375bf8221d4b3b741143f823` |
| Playwright test | 1.62.1 | Apache-2.0 | `45873d00a0dd243596deb4aa23b2493b3d1f0671921bf2538ea431d7380220eb` |
| Vite | 8.2.2 | MIT | `387dd7baa307083401a27c58c362c30832f5ba1dba84f10cc22c33401523f45c` |
| Vitest | 4.1.11 | MIT | `881d660c26831481b697e39724d4a35c9f86e07b67156d4aeb693a0b39910435` |
| TypeScript | 7.0.2 | Apache-2.0 | `a7d00bfd54525bc694b6e32f64c7ebcf5e6b7ae3657be5cc12767bce74654a47` |
| fast-check | 4.9.0 | MIT | `b2bd24f5c975f659433271170b17e0a769b12ef8065bbca6dcd5511d57e94ce0` |
| markdownlint-cli2 | 0.23.2 | MIT | `319fa64eff9e8658eb8883857516b3d2c8439f3d042c6e5270734eb33b0749aa` |

Playwright and TypeScript also ship `NOTICE` text. The installed Mac subset has
some metadata-only packages without a package-local license file, including the
Biome wrapper/native binary and the Rolldown native binding. Therefore a final
notice generator must use exact registry tarballs or canonical upstream license
texts with hashes when an installed package omits the text; metadata alone is
not a complete notice artifact.

The 12 MPL-2.0 cohort entries are `lightningcss` plus its optional platform
packages. They are unmodified build-tool dependencies, not claimed project code.
Preserve their MPL notice and exact version/source location in the dependency
notice. Re-audit if any MPL source is copied, modified, vendored, or shipped in a
binary artifact.

### PRA-ASSET-001 — Runtime proxy provenance is strong but rights text must change

**Disposition: RETAIN CONDITIONALLY.**

`node scripts/validate-generated-assets.mjs` passed. It proved a 3,929-byte
embedded-data GLTF and deterministic 3,152-byte GLB with no external dependency,
the closed seven-part humanoid schema, and exact hashes:

| Asset | SHA-256 |
|---|---|
| `eonfolk-folk-proxy.gltf` | `a639294bb1ae71731265f510089d72bef0677ed5de64c98c70724ad5fce64179` |
| `eonfolk-folk-proxy.glb` | `198d0d7ec6e37f7a43fae872cfff0f3ba8e010c50a3cc7c29af21a2358120549` |
| `ASSET_MANIFEST.json` | `69519819b59ddf72b8786a412e08145c3c235aaf6fe9ca932540821a20558392` |

The source and validator both state repository-authored deterministic geometry,
no third-party material, and no external downloads. Git history attributes the
asset creation and corrections to the same repository owner. This is sufficient
technical provenance for an owner-approved Apache-2.0 grant, but the manifest's
current “no standalone asset license granted” text conflicts with such a grant
and must be changed atomically with the license.

### PRA-ASSET-002 — Mark and generated concepts need separate treatment

**Disposition: MARK REQUIRES OWNER DECLARATION; CONCEPTS EXCLUDED.**

The 48×48 EONFOLK SVG mark has one repository creation commit and hash
`8c4e42ba92645fb1605dec95da472ed135a11c1b2f7c39bd3b964f00617b6434`.
No tracked mark manifest states source inputs, authoring method, or rights. Before
including it in a public export, add an owner declaration that it is original
and identify its separate trademark/brand treatment. If that declaration cannot
be made, publish with a plain-text project name until replacement art is cleared.

The 15 planning PNGs are 1672×941 or 853×1844 and carry exact hashes/tool output
IDs in `docs/design/concepts/README.md`. That manifest says they were generated
without reference images, lacks the byte-for-byte tool invocation, and forbids
production use. They add roughly 44.7 MB and do not explain the executable V1.
Exclude them from the public export and use only fresh captures of the actual
accepted product. Old Gate 0 viewport screenshots are also private evidence, not
public product media.

### PRA-SCRIPT-001 — No zero-caller script; four surfaces are private-release only

**Disposition: REMOVE OR REPLACE ONLY IN THE SANITIZED EXPORT AFTER FINAL PRIVATE
ATTESTATION.**

All 29 current top-level scripts have a package command, workflow caller, import,
or test caller. None is provably dead at this candidate. Four surfaces are tied
to the private release/evidence process rather than maintainable public CI:

| Script | Actual callers | Public-export action |
|---|---|---|
| `scripts/check-v1-readiness.mjs` | `v1:readiness:*`, `v1-github-evidence.mjs`, readiness unit tests, current CI | Exclude after final private use; replace with ordinary release/checklist policy |
| `scripts/v1-github-evidence.mjs` | current CI, GitHub-evidence unit tests | Exclude after final private use |
| `scripts/record-physical-device-evidence.mjs` | `evidence:physical`, evidence-script unit test | Exclude; retain final results only in the private archive |
| `scripts/generate-repo-inventory.mjs` | `docs:check`, inventory commands, readiness unit test | Exclude or rewrite to generate only a reader-facing source map; current output is an internal authority/evidence inventory |

`scripts/evidence-integrity.mjs` is not dead despite its release-oriented name.
The DEEP runner and diagnostics/persistence benchmarks import its canonical JSON
and content-hash functions. Retain it under a neutral name such as
`content-hash.mjs`, update actual imports, and keep focused tests.

The remaining scripts have real product, quality, or maintainer responsibilities:

| Responsibility | Scripts and callers |
|---|---|
| Runtime and architecture | `check-runtime` (`runtime:check`); `check-boundaries` (`architecture:check`); `typecheck` (`typecheck`); `check-diff` (`diff:check`) |
| Documentation | `check-doc-links` and `check-bibliography` (`docs:check`); retain only if the public bibliography remains |
| Tests and formal proof | `check-targeted-mutations` (`test:mutation`); `check-formal` plus `formal-toolchain` (`test:formal`, CI) |
| Build and assets | `measure-bundle` (`budget:check`); `validate-generated-assets` (`assets:*`, unit tests) |
| Browser/security | `validate-web-network` (E2E and tier runner); `check-gitleaks-neighbor` (secret CI); `diagnose` (`diagnose`) |
| Deep benchmarks | `benchmark-web`, both diagnostics benchmarks, and `benchmark-persistence` (DEEP runner and package commands) |
| Reproducible cohorts | `validate-dependency-cohort` (`cohort:check`, CI); `freeze-dependency-cohort` (`cohort:freeze`, maintainer-only) |
| Optional local cognition | `ollama-bounded-adapter` (local-model benchmark and loopback tests); it remains optional and no-model operation remains complete |
| Tier orchestration | `run-verification-tier` (`verify:*`, CI, tooling tests); simplify private release-claim fields but preserve PR/DEEP constituents |
| Target-Mac browser identity | JS and Ruby `validate-browser-cohort` pair (`browser-cohort:check`, benchmark callers); preserve through final evidence, then replace the absolute-version pair with one documented portable validator unless independent cross-language comparison remains an explicit public invariant |

Every retained public script should gain one line in `docs/TESTING.md` naming its
responsibility, normal caller, network behavior, generated files, and whether it
is PR, conditional, nightly, manual, or maintainer-only.

### PRA-CONFIG-001 — Current configuration mixes durable controls with private release machinery

**Disposition: REPLACE SELECTIVELY IN THE PUBLIC EXPORT.**

| Path | Current caller/purpose | Public-export action |
|---|---|---|
| `.github/workflows/ci.yml` | GitHub PR/push/dispatch; ordinary checks plus six private evidence jobs and exact runner receipts | Replace with a small public PR/push CI and separate nightly/manual deep workflow; do not copy the evidence dispatch API |
| `.github/actionlint.yaml` | actionlint custom label for `eonfolk-ephemeral-deep` | Remove if the public workflow has no such label; otherwise document it |
| `.github/dependabot.yml` | GitHub native weekly grouped npm/Actions updates, maximum five | Retain; no auto-merge |
| `.github/pull_request_template.md` | GitHub PR UI; references private authorities and evidence tiers | Rewrite for public scope, tests, screenshots, access, security, and license/provenance impact |
| `.gitleaks.toml` | Gitleaks and neighbor test | Retain default rules but remove the deleted feedback-provider allowlist and any allowlist made unnecessary by excluding internal research |
| `.markdownlint-cli2.jsonc` | `markdown:lint` | Retain, then tighten only with an intentional docs pass |
| `.npmrc` | pnpm installation | Retain `ignore-scripts=true` and document approved exceptions |
| `.nvmrc`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json` | runtime/workspace/type/format tools | Retain |
| Playwright/Vite/Vitest configs | package commands and test suites | Retain, removing private-release wording while preserving no-egress, fault, trace, screenshot, and semantic-access behavior |

The public CI still needs the current pinned-action and least-permission posture,
format/lint/type/unit/deterministic/property/build/critical Playwright/docs/license
and secret checks, conditional UI/cognition/access checks, and nightly/manual
formal/mutation/deep-property/long-horizon/performance work. Do not make the
public PR workflow depend on a private Mac account, V1 evidence variables, review
receipts, or private branch names.

## Sanitized public-export boundary

Create the export only after the final candidate is merged and re-attested. The
private repository remains the source archive and mapping authority.

### Include by allowlist

1. `apps/web/**`, `packages/**`, and `formal/**` after final reachability cleanup.
   Keep intentionally supported migration and legacy compatibility code only when
   an executable route, persisted format, or test still calls it.
2. Product/system tests under `tests/fixtures`, `tests/unit`, `tests/property`,
   `tests/timing`, `tests/manual`, and `tests/e2e`, excluding or rewriting the
   private release-evidence tests named above. Preserve deterministic simulation,
   replay, migration, property/fuzz, formal, mutation, browser, accessibility,
   performance, security, and provider-failure checks.
3. The retained scripts in PRA-SCRIPT-001 and the exact package/lock/workspace,
   TypeScript, Biome, Markdown, npm, Node, ignore, and safe environment-example
   configuration they require.
4. New public `README.md`, `ROADMAP.md`, `CONTRIBUTING.md`,
   `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `CHANGELOG.md`, `LICENSE`,
   `NOTICE`, `THIRD_PARTY_NOTICES.md`, reader-facing `docs/INDEX.md`, and the
   accepted concise architecture/gameplay/development/testing/accessibility/
   performance documentation.
5. A rewritten public GitHub workflow, Dependabot policy, issue forms/config,
   and public PR template.
6. The generated humanoid proxy only after its explicit asset license is aligned.
   Include the EONFOLK mark only after its owner declaration and trademark
   boundary. Include only fresh current-product screenshots/video/GIF with a
   capture manifest and meaningful alternative text.

### Exclude by denylist

- The existing `.git` directory, all existing commits, tags, branches, PR
  metadata, reflogs, unreachable objects, and worktree metadata.
- `AGENTS.md`, `GOAL.md`, `PLAN.md`, `RESUME.md`,
  `FOUNDER_ALPHA_HANDOFF.md`, all `docs/exec-plans/**`, all `docs/reviews/**`,
  `docs/decisions/**`, `docs/generated/**`, and raw operator/agent/tool/evidence
  material.
- Planning-era research and authority prose after its durable public conclusions
  have been consolidated. If `docs/RESEARCH.md` and `references.bib` remain,
  include only claims that are still useful to contributors and contain no
  orchestration or private-environment material.
- `docs/design/concepts/**`, Gate 0 screenshots and study files, release receipts,
  private performance JSON, local-model treatment receipts, physical-device
  evidence, and attachment hashes.
- `check-v1-readiness.mjs`, `v1-github-evidence.mjs`,
  `record-physical-device-evidence.mjs`, their private tests, and the current
  release-evidence workflow after they have completed their final private duty.
- `node_modules`, `dist`, coverage, Playwright results, traces, netlogs, temporary
  worktrees, model caches/weights, credentials, deployment state, and machine
  absolute paths.

### Reproducible export sequence

1. Freeze and record the accepted `main` SHA. Create a private annotated archive
   tag and an all-ref Git bundle plus SHA-256 outside the prospective public tree.
   Verify the bundle. Do not delete the private remote or rewrite its history.
2. From that exact SHA, run a repository-owned export script with a versioned
   explicit allowlist, denylist, path mappings for public docs/workflows, and a
   closed file-manifest hash. The script must reject unclassified tracked paths,
   symlinks escaping the export, absolute workstation paths, internal markers,
   credentials, and generated files not in the asset/media manifests.
3. Initialize the exported directory as a new repository with one clean public
   root commit using an owner-approved noreply identity. Do not add a remote or
   change the existing repository's visibility during preparation.
4. From a fresh clone of that local export, run frozen install, license/notice
   validation, format, lint, typecheck, unit, deterministic/property tests,
   production build, critical Playwright journey, docs/links, Gitleaks tree and
   full-history scans, generated-asset validation, and package/export-manifest
   comparison. Run the applicable deep/manual gates before any public release.
5. Compare the public export's runtime source and built product against the
   accepted private `main` using the export manifest. The sanitized tree may omit
   private material; it may not silently alter game behavior.
6. Store the private mapping of accepted SHA to export-manifest hash, public root
   SHA, license audit, and verification results. Publication, a new remote, topics,
   release creation, or visibility change remains a separate explicit action.

## Commands and observed output

The audit used read-only commands except for this report and its commit:

```sh
git rev-parse HEAD
git rev-list --count HEAD
git log HEAD --format='%ae' | sort | uniq -c
git log HEAD -S'/Users/pranav' --format='%H' | sort -u
git log HEAD --name-only --format= | sort -u
git ls-files
git count-objects -vH
gitleaks git --no-banner --redact --exit-code 0 --log-opts HEAD .
gitleaks dir --no-banner --redact --exit-code 0 .
node scripts/validate-dependency-cohort.mjs
pnpm licenses list --json
pnpm licenses list --prod --json
node scripts/validate-generated-assets.mjs
rg -l -F 'scripts/<name>' .
rg -n 'pnpm |node scripts/|ruby scripts/' package.json .github/workflows/ci.yml scripts
git fsck --full --no-reflogs --unreachable
```

Results: candidate identity matched; dependency cohort passed at 224 packages;
generated assets passed with zero external dependencies; Gitleaks found zero
leaks; every current script had at least one caller. `git fsck` reported
unreachable stale objects in the shared private object store but no missing or
corrupt reachable object. Do not garbage-collect the shared repository while
active worktrees or final archive work remain.

## Objections, uncertainty, and reopen conditions

### Objections

- Removing private files in a normal commit is insufficient because current Git
  history retains them.
- Rewriting the private repository would destroy or destabilize evidence lineage
  and is unnecessary. A sanitized export gives the public project a clean root
  while preserving the private archive.
- A blanket Apache-2.0 statement would contradict the proxy manifest and leave
  mark/media rights unclear. Rights must be path-explicit.
- The current 816-line CI workflow is rigorous for private release attestation
  but is not an understandable public contribution workflow.
- Passing a secret scan does not make internal prompts, attachment fingerprints,
  personal metadata, or review deliberations appropriate for publication.

### Remaining uncertainty

- Commit metadata does not prove ownership of every line or the absence of a
  copied fragment. No foreign copyright header, vendored/minified source,
  font, audio file, WASM, or third-party runtime model was found, but the owner
  must affirm contribution rights before licensing.
- The EONFOLK mark lacks a dedicated creation/rights declaration.
- Image-generation service terms were not preserved with the concept outputs;
  excluding them avoids relying on an unsupported grant.
- A final release artifact and final dependency lock do not exist at this
  candidate. Notices and scans must be regenerated from the final accepted SHA.
- A clean export can establish safe public history; it does not clear the EONFOLK
  name or mark for trademark use.

### Reopen this audit when

1. the final accepted `main` differs from the candidate;
2. any dependency, generated asset, public media item, contribution, or workflow
   changes;
3. an asset cannot receive the proposed path-specific license;
4. the export manifest has an unclassified file or changes runtime behavior;
5. Gitleaks, license validation, fresh-clone build, public CI, or browser tests
   fail; or
6. publication scope changes from source repository to hosted game, downloadable
   bundle, app store, model distribution, or paid/commercial release.

## Resulting implementation behavior and constraint fit

The coordinator should keep the existing repository private, finish the one Mega
PR and its evidence controls, then generate and verify the sanitized export. This
preserves all product correctness and testing while giving readers a small,
ordinary repository without exposing internal process. It does not require a
second remote during preparation, a deployment, a paid service, a model, a GPU,
training, a partnership, or a credential. The audit incurred no cost, performed
no deployment, created no credential, changed no remote setting, and pushed
nothing.
