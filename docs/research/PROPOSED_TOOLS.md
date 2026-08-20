# Tool, skill, plugin, and MCP inventory

**Purpose:** Record live availability, official source, capability, permissions, cost, security risk and required/optional status for every requested tool surface.

**Status:** VERIFIED CURRENT-SESSION INVENTORY — 2026-08-20; reopen before execution

**Authority boundary:** This file owns active-availability, permissions, cost, security and REQUIRED/OPTIONAL classification. The current session manifest and executable probes determine availability; a package found in a cache or an upstream repository does not.

**Related documents:** [source ledger](SOURCE_LEDGER.md), [architecture](../engineering/ARCHITECTURE.md), [testing](../quality/TESTING.md), [cost model](../engineering/COST_MODEL.md).

**Owned evidence question:** Which requested Codex/tooling capabilities are actually callable in this session, what authority and cost could each carry, and which are required for EONFOLK versus merely helpful?

**Inventory date:** 2026-08-20

The coordinator verified and copied the `S-TOOL-*` and `S-SPIKE-*` rows into [SOURCE_LEDGER.md](SOURCE_LEDGER.md); the appendix preserves the detailed local evidence handoff.

## Evidence language and availability rules

- **VERIFIED FACT:** supported by the active session manifest, a read-only local executable/auth probe, or an opened primary source.
- **INFERENCE:** an operational conclusion from those facts and the binding constraints.
- **PRODUCT HYPOTHESIS:** a proposition that requires actual use evidence.
- **UNRESOLVED:** missing availability, pricing, permission, authentication, or license evidence.

Status meanings:

- **AVAILABLE:** present in the active skills/tools list or confirmed executable now. Authentication is stated separately.
- **NOT AVAILABLE:** absent from the active skills/tools list and executable probes. Upstream existence or an install recommendation does not change this.
- **REQUIRED:** the capability is required for the relevant planning/implementation gate. A particular vendor plugin is required only if no active substitute satisfies that gate.
- **OPTIONAL:** absence must not block planning or the first slice.

No optional tool was installed, connected or purchased. Existing Browser, Image Generation and authenticated GitHub capabilities were used only within the authorized planning run. Read-only probes did not print tokens.

## Executive recommendation

Proceed with the active Browser capability, built-in Image Generation, and authenticated GitHub CLI/skills when their corresponding work is authorized. Add Playwright as a pinned project dependency during implementation because repeatable browser E2E and screenshots are a required capability, even though no `playwright` executable is currently present.

Do not install Codex Game Studio, Build Web Apps, the Cloudflare connector, Promptfoo, shadcn MCP, Motion AI Kit/MCP, or 21st MCP during planning. None is necessary to settle the architecture. Reconsider Game Studio for a later renderer/gameplay implementation pass, Cloudflare only at the hosted-region gate, and Promptfoo only after a real model adapter exists. shadcn guidance is already active; Motion and 21st are default-reject optional accelerators because they add remote/code/provenance surfaces without first-slice necessity.

## Current environment observations

**VERIFIED FACT (S-TOOL-01):** the active session lists:

- `browser:control-in-app-browser`, `vercel:agent-browser`, and `vercel:agent-browser-verify` skills;
- the built-in `image_gen__imagegen` tool and `imagegen` skill;
- `github:github` and `github:gh-address-comments` skills;
- `vercel:shadcn` guidance;
- `sites:sites-building`, which is a Sites-specific builder and is not the named Build Web Apps plugin.

It does not list Codex Game Studio, Build Web Apps, Cloudflare, Promptfoo, a shadcn MCP server, Motion tooling/MCP, or 21st tooling/MCP.

**VERIFIED FACT (S-TOOL-02):** read-only executable probes found `gh`, `node`, `pnpm`, `npx`; did not find `wrangler`, `promptfoo`, `playwright`, `agent-browser`, `shadcn`, or `motion-ai`. `gh auth status` confirmed one active GitHub login from the system keyring with `gist`, `read:org`, `read:packages`, `repo`, and `workflow` scopes. This is broad write authority, not evidence that every write is authorized.

## Complete requested inventory

| Requested capability | Active status | Official/current source | Capability | Permissions / external effects | Cost posture | Principal security/provenance risk | Class |
|---|---|---|---|---|---|---|---|
| Codex Game Studio | **NOT AVAILABLE** | OpenAI's archived plugin manifest/repository reference [S-TOOL-03] | Browser-game architecture, 2D/3D paths, UI, assets, playtesting | Upstream manifest declares Interactive + Write; if installed it can guide/create project files and run game workflows | MIT upstream reference; installation/product access not established | Write-capable plugin, scripts/assets/dependency suggestions; current upstream archive means provenance/version must be re-established | **OPTIONAL** |
| Build Web Apps | **NOT AVAILABLE** as named plugin; Sites skill is not equivalent | OpenAI upstream manifest/reference [S-TOOL-04] | Frontend design/build, generated assets, browser testing, shadcn/payment/database guidance | Upstream manifest declares Interactive + Read + Write; some coordinated skills can use external services | MIT upstream reference; service/provider costs separate | Broad app writes, generated assets, optional payment/database/credential routes, plugin source now not active | **OPTIONAL** |
| Browser / Playwright | **AVAILABLE:** in-app Browser exposes a Playwright interaction facade; no global CLI is installed | Active manifest and successful localhost browser run [S-TOOL-01]; Playwright docs [S-TOOL-05]; rendering spike [S-SPIKE-002] | Navigate/interact/capture screenshots now; pinned project Playwright later provides reproducible E2E and visual comparison | Browser control can access visible pages and possibly signed-in sessions; a project dependency launches browsers and writes test artifacts/screenshots | Active Browser cost not separately exposed; Playwright OSS/local compute, browser downloads | Signed-in session exposure, unintended web actions, screenshot data, hostile pages, flaky visual baselines | **REQUIRED** |
| Image Generation | **AVAILABLE** built-in tool + skill | Active manifest [S-TOOL-01]; OpenAI image docs [S-TOOL-06] | Generate/edit visual concepts and raster assets | Sends prompt and selected reference images to hosted generation; returns generated image | No separate price/limit exposed by current tool manifest; do not assume unlimited or API-equivalent pricing | Copyright/style/reference provenance, hidden text/errors, unsafe or inconsistent production assets, user-image privacy | **REQUIRED for visual-concept gate; OPTIONAL for systems slice** |
| GitHub | **AVAILABLE and authenticated** via active skills + `gh` | Active/local probe [S-TOOL-01][S-TOOL-02]; official CLI [S-TOOL-07] | Inspect repos/PRs/issues/CI; branch, commit, push, and review workflows when authorized | Current token scopes include broad repository and workflow authority; local git can write branches/commits | GitHub CLI is MIT/free; account plan, Actions, security features, and storage costs are separate and unverified | Accidental push/merge/comment, secret exposure in logs, broad token scope, untrusted Actions/PR code | **REQUIRED** |
| Cloudflare connector/plugin | **NOT AVAILABLE**; shown only as a recommended install; `wrangler` absent | Current recommended-plugin manifest [S-TOOL-08]; Cloudflare docs for service terms [S-TOOL-09] | Potential account/project/deploy/log/Worker resource management; exact connector tools unknown until install | **UNRESOLVED:** inspect install permission screen and callable tool list before connection; deployment mutates public infrastructure | Workers/DO/AI have Free and paid limits; connector cost not separately established | Credential/account access, deployment/state mutation, logs/secrets, denial-of-wallet; installability is not authorization | **OPTIONAL until hosted-region gate** |
| Promptfoo | **NOT AVAILABLE**; CLI absent | Promptfoo docs/repository [S-TOOL-10][S-TOOL-11] | Model regression evals, assertions, red-team tests, reports, optional MCP | Local runner and MCP execute with user permissions; can call providers, read fixtures/config, write reports | OSS runner is available upstream; provider calls and Cloud features can cost; no project install exists | Official security model says configs/custom scripts/providers/transforms can execute unsandboxed trusted code; prompts/outputs/secrets can leave through configured providers/cloud | **OPTIONAL after model adapter exists** |
| shadcn tooling / MCP | **AVAILABLE** as an active guidance skill; dedicated CLI/MCP **NOT AVAILABLE** | Active manifest [S-TOOL-01]; official shadcn MCP docs [S-TOOL-12] | Component composition guidance now; MCP can search/read configured registries and help add component source | MCP/CLI would access registries/network and write copied component/config files; registry code executes in the app once adopted | No project-specific tool charge is established; registry items may have distinct licenses/costs | Remote registry trust, arbitrary copied code/dependencies, style/component soup, item-level license/provenance | **OPTIONAL** |
| Motion tooling / MCP | **NOT AVAILABLE**; `motion-ai` absent | Motion AI Kit install/docs/terms [S-TOOL-13][S-TOOL-14] | Current docs search, examples, CSS spring generation, performance audit, transition editor | Hosted MCP can read/search Motion content; audit/profile features may read local source and a running site; installation rewrites agent/MCP config | Core Motion has a free path; AI Kit/premium examples are tied to Motion+ in current docs; exact purchase price was not reliably exposed | Hosted MCP/auth, local code/site inspection, premium-code license/seat terms, unnecessary animation dependency | **OPTIONAL; default reject for V1** |
| 21st.dev tooling / MCP | **NOT AVAILABLE**; no active skill/MCP/CLI | Official repository and current Terms [S-TOOL-15][S-TOOL-16] | Remote component/theme/template search, code retrieval, generation, bookmarks/team libraries | Current MCP setup requires a 21st API key and sends requests to a hosted MCP; generated/retrieved code would enter the repo | Paid plans/AI credits exist; exact current plan price/allowance must be reopened | API key, hosted generation/data transfer, remote code/supply-chain risk, marketplace media/metadata restrictions and item-level ownership/license | **OPTIONAL; default reject** |

## Per-tool decisions and gates

### Codex Game Studio

**VERIFIED FACT:** the upstream OpenAI manifest describes Game Studio as an Interactive/Write browser-game plugin, and its skills separate simulation from rendering and include React Three Fiber/Three.js, asset, UI, and playtest paths [S-TOOL-03]. The upstream repository page was archived on 2026-08-16, and the plugin is not in this active session.

**INFERENCE:** it is aligned with EONFOLK's eventual game implementation, but absence is not a planning blocker. Do not treat upstream cache/repository files as active instructions. Reopen only when implementation needs renderer/gameplay scaffolding, then install through a current official marketplace if available and inspect the actual version/permissions first.

### Build Web Apps

**VERIFIED FACT:** the upstream OpenAI manifest describes Interactive/Read/Write frontend-building capabilities [S-TOOL-04]. It is not active here. The active Sites builder is scoped to Sites projects and does not make the named plugin available.

**INFERENCE:** a skilled implementation agent plus the required Browser/Playwright loop can build the slice without it. Its breadth also invites irrelevant payment/database/provider work. Keep optional.

### Browser and Playwright

**VERIFIED FACT:** Browser-related skills are active; the in-app Browser successfully opened, inspected, and captured the owned localhost rendering spike through its Playwright facade. The ordinary global `playwright` and `agent-browser` executables remain absent. A disposable worktree installed a pinned `playwright-core` package and ran the installed local Chrome at all three target viewports [S-SPIKE-002]. Playwright supports screenshot comparisons and warns that rendering varies with OS, browser, hardware, settings, and headless state [S-TOOL-05].

**INFERENCE:** use the active Browser for authorized exploratory/manual QA. During implementation, add `@playwright/test` **1.62.1** through the project lockfile rather than relying on a global command. Its official package metadata pins Chromium revision **1234**, Chrome for Testing **151.0.7922.34**; acceptance also verifies the installed executable hash [S-TOOL-17]. Generate visual baselines in that controlled browser cohort and still do real M4 Pro/browser/device inspection for canvas/WebGL states.

**VERIFIED FACT (S-TOOL-18):** read-only local/runtime and official npm registry probes froze the complete direct dependency cohort in the Goal prompt, including Node `22.23.1`, pnpm `11.15.1`, and exact UI/build/test package versions. Implementation must still verify lockfile integrity, license, install scripts, and mutual build compatibility; this evidence is not an authorization to install during planning.

**VERIFIED FACT (S-TOOL-19):** the exact required headed Chromium 1234 / Chrome for Testing 151.0.7922.34 executable is already present locally; its version output and binary SHA-256 match the Goal-prompt precondition. Goal mode must use that path and stop rather than downloading on mismatch.

**VERIFIED FACT (S-TOOL-20):** the exact direct cohort was resolved with pnpm 11.15.1 to 195 external packages; every lock integrity matched official npm version metadata, and complete license/lifecycle records are frozen in [DEPENDENCY_COHORT.md](DEPENDENCY_COHORT.md). Goal mode validates those bytes rather than resolving a new transitive graph.

Required permission discipline:

- bind only to the intended local URL/tab;
- avoid using unrelated signed-in tabs;
- do not submit purchases, publish, deploy, or send messages without scope authorization;
- treat screenshots/traces as potentially sensitive artifacts;
- pin browsers/package and keep visual thresholds narrow and explained.

### Image Generation

**VERIFIED FACT:** the generation/edit tool and skill are callable in this session [S-TOOL-01].

**INFERENCE:** use it for matched visual concepts and isolated raster assets, not for UI text, simulation truth, licenses, or architectural diagrams that are clearer in documents. Record prompt, source references, generation date, edit lineage, intended use, and human approval. Generated appearance is not proof that the experience can be implemented in the time/performance budget.

### GitHub

**VERIFIED FACT:** the official GitHub CLI is installed/authenticated and the GitHub skills are active [S-TOOL-01][S-TOOL-02][S-TOOL-07].

**INFERENCE:** GitHub is required for the requested branch/commit/review process. Use local git for bounded file changes and `gh` only for explicitly authorized remote operations. The broad existing scopes are an upper bound, not a grant to push/open/merge/comment. Before a remote action, resolve repository, branch, visibility, target, and diff.

### Cloudflare

**VERIFIED FACT:** Cloudflare appears in the current recommended-but-not-installed plugin list; there is no active Cloudflare skill/tool and no `wrangler` executable [S-TOOL-02][S-TOOL-08].

**INFERENCE:** do not install/connect it until the hosted-region gate passes. At that gate, prefer a least-privileged token/account, preview/local test first, explicit resource names, a cost cap, and separate approval for deployment or destructive resource changes. The plugin's exact capability/permissions are **UNRESOLVED** until its current manifest and install dialog are visible.

### Promptfoo

**VERIFIED FACT:** Promptfoo documents CI/eval workflows, but its security policy says configs, scripts, assertions, providers, transforms, hooks, plugins, and local MCP execute with the user's permissions and are not a sandbox [S-TOOL-10][S-TOOL-11]. It is not active/installed.

**INFERENCE:** ordinary deterministic fixtures should own V1 cognition tests. If a model adapter later exists, pin Promptfoo as a dev dependency, commit only trusted config, disable unnecessary hosted/sharing/telemetry routes, use scoped canary credentials, and never run secret-bearing evals from untrusted fork PRs. Its MCP is unnecessary.

### shadcn tooling/MCP

**VERIFIED FACT:** shadcn guidance is active; the official MCP can connect compatible registries, but no MCP/CLI is active locally [S-TOOL-01][S-TOOL-12].

**INFERENCE:** use guidance only if chosen UI primitives call for it. EONFOLK must own/restyle copied code and record each component's registry URL, revision, author, license, dependencies, and modifications. Do not add MCP merely to browse fashionable components.

### Motion tooling/MCP

**VERIFIED FACT:** the current Motion AI Kit installer can configure hosted MCP/skills, and official docs tie premium examples/audits to Motion+ while retiring an older token-in-local-command flow [S-TOOL-13]. No Motion tooling is active here.

**INFERENCE:** core Motion as a normal library may later be selected independently. The MCP/AI Kit is not needed for the first slice. Animation requirements should first be expressed in CSS/Motion primitives and verified with reduced-motion/performance tests. Reopen only if motion implementation is a measured bottleneck; inspect exact price, seat/license terms, hosted data, and Codex support that day.

### 21st.dev tooling/MCP

**VERIFIED FACT:** the current official repository says the hosted MCP requires an API key and supports search, paid code retrieval, and generation [S-TOOL-15]. Current Terms restrict scraping, training, redistribution, and reuse of Marketplace media/structured metadata while leaving underlying component rights with respective authors [S-TOOL-16].

**INFERENCE:** this is the worst first-slice trade: credentials, remote code, variable item licenses, provenance work, and strong temptation toward generic component composition. Default reject. If later reconsidered, require a specific named component need, item-level license verification, code review, no preview-media reuse, attribution/link compliance, and explicit key/paid-plan approval.

## Permission and cost tiers

| Tier | Examples | Rule |
|---|---|---|
| Local/read-only | local git inspection, active docs/guidance, screenshots of owned localhost | Proceed only within task scope; do not expose secrets |
| Local/write | git commits, Playwright artifacts, copied components, generated assets | Require implementation authorization and a bounded file target; review diff/provenance |
| External/read | docs, public GitHub inspection, hosted MCP search | Minimize shared data; treat responses/code as untrusted |
| External/write/mutate | GitHub push/PR/comment, Cloudflare deploy/resource change, hosted generation account actions | Require explicit task authorization, resolved target, and least privilege |
| Credential/payment | provider keys, Cloudflare/GitHub OAuth, Motion+/21st plan | Never infer approval; reopen cost/terms and ask before action |

## Ordered tooling workflow

### Gate T0 — planning

Use active web/docs, local git, and GitHub read-only inspection. Do not install optional tools. Deliver source-backed architecture and provenance requirements.

### Gate T1 — first implementation setup

Required deliverables:

- pinned runtime/package manager and lockfile;
- pinned Playwright dev dependency and browser version;
- active Browser plus local E2E/screenshot workflow;
- GitHub branch/CI workflow under existing authorization;
- dependency license report.

Game Studio/Build Web Apps remain optional. Use only if they are active through a current official source and save more effort than their permission/provenance overhead.

### Gate T2 — visual concept/asset pass

Use built-in Image Generation under a prompt/reference/provenance ledger. Verify generated files visually and in-browser. No generated asset becomes canonical without license/safety/human review.

### Gate T3 — model evaluation

Open only after a real model adapter exists. Start with normal test fixtures. Consider pinned Promptfoo CLI only if it adds reproducible provider/model regression value. Do not add its MCP or Cloud features by default.

### Gate T4 — hosted region

Re-inventory the session. If Cloudflare remains selected, inspect the current official plugin manifest/permissions and actual account; install/connect only with approval. Pin Wrangler in the project, use least-privileged credentials, local/preview test, named resources, cost controls, and a rollback/export plan.

### Gate T5 — optional UI accelerators

shadcn guidance is sufficient initially. Consider Motion AI Kit or 21st MCP only for a concrete unresolved need after item-level license, cost, credential, hosted-data, and code-review gates. Missing optional MCPs never block release.

## Strongest objections

1. **"Official" does not mean active or harmless.** Game Studio/Build Web Apps upstream references exist, but the active session lacks them and the upstream page is archived. Installation/version provenance must be re-established.
2. **The active GitHub token is broad.** It enables high-impact remote mutations. Capability is not authorization; use least scope and resolve every target.
3. **Browser automation may touch signed-in state.** A convenient active browser can expose unrelated accounts or submit real actions. Keep QA on owned localhost/test accounts.
4. **Promptfoo runs trusted code, not sandboxed data.** Untrusted configs/PRs plus credentials are unsafe by its own model [S-TOOL-10].
5. **MCPs increase hidden surface area.** Hosted search/generation can send code/context externally and return unreviewed code. Each server needs permissions, provenance, and data-flow review.
6. **Component marketplaces can erase visual identity.** shadcn/21st/Motion examples are inputs, not the EONFOLK design language.
7. **Tool cost is not only subscription price.** Review time, dependency churn, credentials, CI minutes, provider calls, generated asset cleanup, and license tracking matter for a solo builder.

## Rejected options

| Option | Decision | Reason |
|---|---|---|
| Treat cached plugin files as AVAILABLE | Reject | Current active manifest is the availability authority |
| Install every official/recommended plugin now | Reject | Adds permissions/credentials/surface without planning value |
| Use `npx ...@latest` in committed CI | Reject | Unpinned supply-chain and behavior drift |
| Use global Playwright as project test contract | Reject | Not installed and not reproducible; pin project dependency |
| Expose Promptfoo local UI/MCP to a network | Reject | Not a multi-user security boundary [S-TOOL-10] |
| Use 21st preview media/metadata as product assets | Reject | Current terms restrict reuse [S-TOOL-16] |
| Adopt marketplace component code without provenance | Reject | Item ownership/license/dependencies vary |
| Make Motion+/21st purchase part of first slice | Reject | Nonessential and no spending authorization |
| Connect Cloudflare during research | Reject | Hosted architecture gate has not passed |

## Unproven assumptions and evidence that reopens this inventory

| Assumption | Status | Reopen evidence |
|---|---|---|
| Active Browser skill is sufficient for manual QA | **VERIFIED for the rendering spike** | Reopen if the implementation requires unavailable viewport, trace, input, or canvas inspection behavior |
| Playwright can be added within implementation budget | **INFERENCE** | Dependency/browser install or CI environment proves incompatible |
| Image Generation has no incremental user-visible charge in this session | **UNRESOLVED** | Current plan/usage UI or official product terms show limits/charges |
| GitHub current authentication is appropriate | **UNRESOLVED** | Target repo/organization policy or required operation needs narrower/different auth |
| Official Game Studio/Build Web Apps have a current supported install channel | **UNRESOLVED** | Current marketplace manifest/install UI confirms or denies availability |
| Cloudflare plugin can be least-privileged | **UNRESOLVED** | Current install permission/tool manifest and token model |
| Motion AI Kit exact Codex support/price/hosted-data path fits | **UNRESOLVED** | Execution-day docs, terms, install preview, and purchase screen |
| 21st item licenses can be made reliable enough | **UNRESOLVED** | Named component has clear license/provenance and survives review |

## Implementation implications

- `AGENTS.md`/execution plans should require active-tool re-inventory before each wave; no cache-based availability claims.
- `quality/VISUAL_QA.md` should require active Browser plus pinned Playwright, stable baselines, screenshot inspection, and real-device review.
- `quality/TESTING.md` should keep model-free cognition fixtures primary; Promptfoo becomes conditional.
- `engineering/FRONTEND.md` should record provenance for all copied components and allow shadcn/Motion/marketplace code only by named need.
- `engineering/SECURITY.md` should list browser signed-in state, GitHub token, MCP servers, provider credentials, generated assets, and dependency install scripts as trust boundaries.
- `engineering/COST_MODEL.md` should include tool/provider/account costs separately from runtime infrastructure.
- `docs/exec-plans/*` should mark every external write, credential, purchase, install, and deploy gate explicitly.

## Reopen and execution-day checklist

1. Read the current active skills/tools manifest. Do not infer from filesystem caches.
2. Probe required executables with `command -v` and record exact versions; do not auto-download via `npx` during the probe.
3. For any plugin, inspect current publisher, manifest, capabilities, skills, MCP/app configuration, install permissions, authentication, privacy, terms, version, and source repository status.
4. For any MCP, enumerate its actual `tools/list` and resources after connection; compare with the approved minimum.
5. Inspect current pricing/plan screens before any paid or quota-bearing use.
6. Pin packages by lockfile; never put `@latest` in CI. Review install scripts, transitive licenses, advisories, and provenance.
7. Produce a production dependency license artifact. Reject GPL/AGPL, noncommercial, source-available, or custom terms unless explicitly reviewed/approved.
8. For copied component/example code, record source URL, publisher/author, exact revision, item license, dependencies, attribution, modifications, and date.
9. For generated assets, record prompt/reference/edit lineage and intended use; inspect content and metadata.
10. Recheck GitHub scopes and target before remote writes; recheck Cloudflare resource/account/environment before deploy.
11. Use scoped test credentials and sanitized fixtures; never expose owner/provider secrets to Browser traces, screenshots, model prompts, reports, commits, or MCP context.

## Source-ledger appendix — canonical rows

| Provisional ID | Claim supported | Primary/local source | Accessed | Type | Confidence | Reopen note |
|---|---|---|---|---|---|---|
| S-TOOL-01 | Exact active skills/tools availability for this session | Codex session skills/tools manifest supplied to the agent | 2026-08-20 | A, environment | High for this session | Re-list every execution session |
| S-TOOL-02 | `gh` authenticated with stated scopes; `wrangler`, `promptfoo`, `playwright`, `agent-browser`, `shadcn`, `motion-ai` absent from PATH | Read-only local `command -v`, version, and redacted `gh auth status` probes | 2026-08-20 | A, local | High for this worktree/session | Re-probe after environment change |
| S-TOOL-03 | Game Studio upstream manifest/capabilities/license and game skill scope | [OpenAI Game Studio manifest](https://github.com/openai/plugins/blob/main/plugins/game-studio/.codex-plugin/plugin.json), [Game Studio skill](https://github.com/openai/plugins/blob/main/plugins/game-studio/skills/game-studio/SKILL.md) | 2026-08-20 | B, archived upstream reference | High for archived manifest | Does not prove current installability |
| S-TOOL-04 | Build Web Apps upstream scope, capabilities, and MIT manifest | [OpenAI Build Web Apps manifest](https://github.com/openai/plugins/blob/main/plugins/build-web-apps/.codex-plugin/plugin.json) | 2026-08-20 | B, upstream reference | High for referenced manifest | Does not prove active availability |
| S-TOOL-05 | Playwright screenshot comparisons exist and baselines vary by environment | [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) | 2026-08-20 | B | High | Pin package/browser in execution |
| S-TOOL-06 | OpenAI supports image generation/editing APIs; current Codex built-in is separately evidenced by S-TOOL-01 | [OpenAI image generation guide](https://platform.openai.com/docs/guides/image-generation) | 2026-08-20 | A | High for API capability | Built-in tool pricing/limits remain separate |
| S-TOOL-07 | `gh` is GitHub's official MIT CLI for repos/PRs/issues workflows | [GitHub CLI repository](https://github.com/cli/cli) | 2026-08-20 | B | High | Account plan/scopes separate |
| S-TOOL-08 | Cloudflare is recommended but not installed in the current session | Codex recommended-plugins manifest supplied to the agent | 2026-08-20 | A, environment | High for this session | Inspect install dialog/manifest before connection |
| S-TOOL-09 | Cloudflare runtime has Free/Paid usage and cost dimensions | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) | 2026-08-20 | A | High on access date | Reopen on any execution/deploy day |
| S-TOOL-10 | Promptfoo intentionally executes configured code unsandboxed with user permissions and warns against secrets on untrusted PRs | [Promptfoo security policy](https://github.com/promptfoo/promptfoo/blob/main/SECURITY.md) | 2026-08-20 | B | High | Pin current supported release |
| S-TOOL-11 | Promptfoo documents local/CI eval execution | [Promptfoo CI/CD integration](https://www.promptfoo.dev/docs/integrations/ci-cd/) | 2026-08-20 | B | High | Provider/Cloud costs separate |
| S-TOOL-12 | shadcn provides an MCP server for compatible registries | [shadcn MCP documentation](https://ui.shadcn.com/docs/registry/mcp) | 2026-08-20 | B | High | Registry/item trust remains project responsibility |
| S-TOOL-13 | Motion AI Kit installer configures hosted MCP/skills; current docs describe premium Motion+ access and retired older token flow | [Motion AI Kit install](https://motion.dev/docs/ai-kit-install), [Motion AI Kit](https://motion.dev/docs/studio) | 2026-08-20 | A | Medium-high | Reopen exact Codex path, hosted data, and price |
| S-TOOL-14 | Motion+ terms/pricing distinguish free core and premium assets/license | [Motion terms](https://motion.dev/terms), [Motion pricing](https://motion.dev/pricing) | 2026-08-20 | A | Medium-high | Purchase screen is cost truth |
| S-TOOL-15 | Current 21st MCP uses hosted endpoint/API key and exposes search/generation/code-retrieval tools | [21st MCP official repository](https://github.com/21st-dev/magic-mcp) | 2026-08-20 | B | High on access date | Enumerate actual tools after any approved connection |
| S-TOOL-16 | Current 21st Terms restrict scraping/training/redistribution/media/metadata reuse and state paid plans/AI credits | [21st Terms](https://21st.dev/terms) | 2026-08-20 | A | High on access date | Verify item license and current terms separately |
| S-TOOL-17 | Official npm metadata identifies `@playwright/test` 1.62.1 and its registry integrity; matching `playwright-core` pins Chromium revision 1234, Chrome for Testing 151.0.7922.34 | [npm registry metadata](https://registry.npmjs.org/@playwright/test/1.62.1), [official package tarball](https://registry.npmjs.org/playwright-core/-/playwright-core-1.62.1.tgz) | 2026-08-20 | A, exact package release | High | Reopen only as a recorded browser-cohort migration |
| S-TOOL-18 | Local Node/pnpm versions and official npm registry metadata returned the exact direct dependency cohort frozen in the Goal prompt | Read-only local version and `npm view <package> version` probes | 2026-08-20 | A, local + official registry | High on access date | Revalidate installability/license/integrity before implementation |
| S-TOOL-19 | Local Playwright Chromium revision 1234 / Chrome for Testing 151.0.7922.34 executable matches the frozen path, version and SHA-256 | Read-only local `--version` and `shasum -a 256` | 2026-08-20 | A, local | High for this machine/session | Reverify at invocation; stop instead of downloading on mismatch |
| S-TOOL-20 | pnpm 11.15.1 produced the frozen 195-package graph; npm version metadata matched lock integrity and supplied complete license/lifecycle records | [Official npm registry](https://registry.npmjs.org/); [frozen evidence](DEPENDENCY_COHORT.md) | 2026-08-20 | A, exact local + official registry | High for exact recorded bytes | Reopen only on approved cohort change, blocking build failure, or advisory |
