# World-presence renderer architecture spike

**Purpose:** compare the implemented Pixi presentation with a bounded PlayCanvas React/WebGL2 settlement prototype before the Founder Alpha renderer is rearchitected.

**Status:** MEASURED DIRECTIONAL EVIDENCE — ADOPT PLAYCANVAS REACT; INTEGRATED BUDGET AND WORLD-PRESENCE GATES REMAIN OPEN

**Authority boundary:** this report owns the disposable spike method, observations, and recommendation. It does not change the renderer decision, performance budgets, product gate, spatial contract, or implementation scope; those belong to [Frontend](../engineering/FRONTEND.md), [Performance](../quality/PERFORMANCE.md), [Visual QA](../quality/VISUAL_QA.md), and the [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

**Related documents:** [Design research](DESIGN_RESEARCH.md), [Frontend](../engineering/FRONTEND.md), [Architecture](../engineering/ARCHITECTURE.md), [Performance](../quality/PERFORMANCE.md), [Diagnostics](../engineering/DIAGNOSTICS.md), [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

## Recommendation

**INFERENCE — adopt PlayCanvas React as the sole world renderer.** This spike found no material engine, React/Vite, WebGL2, frame-time, or observability blocker. Even a 259-line primitive prototype produced a recognizable physical settlement, articulated human silhouettes, moving citizens, carried/work props, and visible co-located activity that the retained Pixi evidence does not provide. The official React API exposes declarative entities/components, GLB loading, animation, and imperative update-loop hooks without replacing the existing React/Vite shell ([PlayCanvas React API](https://developer.playcanvas.com/user-manual/react/api/), accessed 2026-08-21; [Script component](https://developer.playcanvas.com/user-manual/react/api/script/), accessed 2026-08-21).

This is an architecture selection, not a release pass. The integrated implementation must still pass all of the following without a waiver:

1. replace Pixi rather than ship two renderers;
2. preserve semantic DOM parity and the immutable Reality-to-presentation boundary;
3. pass the existing `650 KiB` initial-route JavaScript ceiling after the real shell, Worker, renderer, animation, navigation, and asset loaders are combined;
4. pass the existing headed desktop/laptop/mobile profiles, including an explicitly observed pixel ratio and a physical-device diagnostic when available;
5. pass an independent World Presence review; this spike author cannot supply that verdict.

**No material PlayCanvas blocker was found.** Bundle headroom is the strongest release risk: the standalone prototype consumes most of the route ceiling, and a deliberately conservative integration estimate is slightly over it. The first implementation milestone must integrate and measure the renderer before asset breadth or visual polish.

## Constraint fit

| Binding constraint | Spike result |
|---|---|
| Solo builder | React composition and imperative per-frame entity refs worked in the existing language/framework. The prototype is 259 source lines versus 326 lines in the current procedural Pixi component. An asset/nav pipeline remains additional work. |
| 40–60 focused hours | A recognizable primitive settlement was assembled within the bounded spike. The target remains feasible only if the implementation reuses reviewed assets, limits the map and action graph, and replaces Pixi instead of maintaining both paths. |
| M4 Pro target; no owned GPU | **UNRESOLVED:** the measured machine reported an Apple M4 Max, not the binding M4 Pro target. Results are directional and cannot be promoted to M4 Pro or mid-tier mobile claims. WebGL2 alone was required. |
| Approximately $0 | Engine, React wrapper, Pixi, and evaluated navigation packages report MIT licenses in installed package metadata. No paid service, editor account, hosted asset, API, credential, or deployment was used. License/provenance review remains required for production assets. |
| No training/fine-tuning or required inference | The prototype is deterministic local presentation and uses no model, network inference, training, or GPU compute outside rendering. |
| Useful/free V1 | The runtime is browser-native and account-free in the spike. The production path must retain complete semantic fallback and no WebGPU requirement. |

## Exact environment and package cohort

The scratch worktree was created from `fe7f1d071212c60d36cd936838ebce7a9bfeae41` at `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/world-presence-renderer-spike` on local branch `spike/world-presence-renderer`. Disposable source, lockfile, builds, JSON, and screenshots lived under ignored `tmp/world-presence-spike/`; none is part of this commit.

| Item | Exact observed value |
|---|---|
| OS / architecture | macOS 26.6.2 build 25G83, arm64 |
| Host | MacBook Pro Mac16,5; Apple M4 Max; 16 CPU cores; 48 GB memory |
| Node / pnpm | Node 22.23.1; pnpm 11.15.1 |
| Browser driver | `@playwright/test` 1.62.1 |
| Browser | Chrome for Testing 151.0.7922.34, bundled Chromium revision 1234 |
| Existing renderer | `pixi.js` 8.19.0 |
| Candidate renderer | `playcanvas` 2.21.4; `@playcanvas/react` 0.11.5 |
| Navigation metadata check | `recast-navigation` 0.43.1; `@recast-navigation/playcanvas` 0.43.1 |
| Compatibility baseline | `deviceTypes={[DEVICETYPE_WEBGL2]}`; WebGPU neither requested nor used |

**VERIFIED FACT — installed package metadata.** `@playcanvas/react` 0.11.5 declares React `^18.3.1 || ^19.1.0` and PlayCanvas `^2.11.8` peers, so it accepts this repository's React 19.2.8 and the measured PlayCanvas 2.21.4. The package remains a `0.x` API and therefore carries migration risk despite this compatibility. The engine and wrapper both declare MIT licenses and link to the official PlayCanvas repositories ([engine package](https://www.npmjs.com/package/playcanvas/v/2.21.4), accessed 2026-08-21; [React package](https://www.npmjs.com/package/@playcanvas/react/v/0.11.5), accessed 2026-08-21).

## Prototype scope

The PlayCanvas scene deliberately used no downloaded art so renderer capability could be separated from asset weight and provenance. It contained:

- a physical terrain tile, river, roads, four buildings, a market, a windmill, and trees;
- eight low-poly human proxies, each with a head, torso, two arms, and two legs;
- per-frame walking paths, facing, and opposing arm/leg motion outside React render churn;
- visually distinct carry, gather, talk, and exchange roles; water, wood/tool, grain, and market props;
- a distinct Mara color and hat silhouette;
- a semantic DOM summary alongside the canvas;
- instrumentation for graphics-device type, first meaningful render, post-render frame deltas, citizen movement count, animation classes, and visible interaction count.

This is not a skeletal-animation, GLB, navmesh, collision, Chronicle, Reality projection, Flight Recorder, reduced-motion, or asset-pipeline proof. The movement paths cross no modeled blockers and therefore cannot establish no-teleport or route correctness.

## Method

### Existing Pixi baseline

From the exact worktree base, the pinned runtime executed:

```text
corepack pnpm install --frozen-lockfile
pnpm build
pnpm budget:check
```

The build transformed 753 modules. Deterministic level-9 gzip used by the repository measured the full application, including shell, Worker, and the then-current Pixi path. The comparable headed result is retained only as [invalidated pre-override evidence](../quality/PERFORMANCE.md#invalidated-pre-override-founder-alpha-measurement); this spike did not rerun the 15-run canonical suite.

### PlayCanvas build and browser sample

The ignored scratch package pinned the versions above and executed:

```text
corepack pnpm install --ignore-workspace
pnpm exec tsc --noEmit
pnpm build
pnpm preview --host 127.0.0.1 --port 4178
pnpm exec node measure.mjs http://127.0.0.1:4178 native-dpr headful
```

Vite 8.2.2 targeted ES2022 and transformed 1,273 modules. Three fresh browser contexts per profile loaded the production preview. Each context waited for the first PlayCanvas post-render mark, waited until all eight citizens had changed position, discarded the first 30 post-render intervals, and sampled approximately five seconds. Nearest-rank p95 used the sorted retained intervals. Mobile emulation used the required 390×844 viewport and four-times CPU slowdown; network throughput/RTT was not throttled in this bounded spike.

The runner also retained two diagnostic cohorts:

- headful rendering with `maxPixelRatio = 1`; results were materially the same as the default because the observed backing-store ratio was already 1;
- headless rendering, which settled at roughly 30–50 FPS depending on viewport and contradicted the headful/canonical behavior. It is retained as a harness artifact, not used for the decision.

No service-worker, external-egress, power-boundary, long-task, heap, thermal, 30-second state, or physical-device oracle ran. Local loopback display time is not a 4G result.

## Measurements

### Load and production build

| Measure | Current Pixi application | PlayCanvas primitive spike | Interpretation |
|---|---:|---:|---|
| Production JavaScript, deterministic gzip | 265,055 B | 568,064 B | PlayCanvas standalone is +303,009 B versus the whole current app. |
| Critical shell, deterministic gzip | 136,273 B | Not isolated in candidate build | Candidate build is a standalone scene, not the staged EONFOLK shell. |
| React-only scratch shell | Not applicable | 59,114 B | Subtracting this gives an approximate 508,950 B candidate renderer/wrapper increment. |
| App-owned world assets | 0 B | 0 B | No production asset conclusion is possible. |
| Browser transfer observed | Canonical report owns baseline | 573,621–573,921 B | Loopback transfer includes candidate JavaScript/CSS; no network throttle. |

Vite's default compressed-size reporter printed `575.76 kB` for the large candidate chunk; deterministic `gzip -9 -n`, matching repository evidence semantics, measured `567,935 B` for that chunk and `568,064 B` for all JavaScript.

**INFERENCE — integration estimate, not a measured build.** Adding the approximate `508,950 B` PlayCanvas increment to the existing `136,273 B` critical app and `29,320 B` Worker gives about `674,543 B`, roughly `8,943 B` above the `665,600 B` route ceiling. This arithmetic is intentionally conservative: real integration will share React code and remove Pixi, while PlayCanvas may tree-shake differently. It proves that the budget is tight, not that it fails. Only the actual replacement build can decide the gate.

The candidate build emitted Vite warnings that PlayCanvas's Draco and Gaussian-splat worker modules reference `node:worker_threads`, which Vite externalized for browser compatibility. Neither unused feature caused a runtime error. The integrated build must either prove these paths absent/safe or configure narrower imports; warning suppression is not evidence.

### Headful frame and display sample

| Profile | First meaningful mark across 3 contexts | Post-render p95 range | Worst retained interval | Gate comparison |
|---|---:|---:|---:|---|
| Desktop 1728×1117 | 154.5–169.7 ms | 9.4–9.7 ms | 145.7 ms outlier | p95 below 16.7 ms; one isolated worst interval retained |
| Laptop 1366×768 | 153.5–159.8 ms | 9.2–9.6 ms | 13.2 ms | p95 below 16.7 ms |
| Mobile emulation 390×844, 4× CPU | 393.6–409.2 ms | 9.4–9.5 ms | 11.5 ms | p95 below 33.3 ms; not a phone claim |

All nine contexts reported `webgl2`, eight citizens, eight changed positions, six declared animation classes (`idle`, `walk`, `carry`, `gather`, `talk`, `exchange`), and two declared visible interactions. The backing canvas equaled CSS pixels in every stable sample, so requested DPR 2/3 was not realized. This is valid evidence for a ratio-1 quality tier only; full native-DPR performance remains **UNRESOLVED**.

The current Pixi candidate's retained canonical headed run reports worst per-state p95 of 9.6 ms desktop, 9.5 ms laptop, and 10.0 ms mobile emulation, with maximum meaningful-world marks of 203.3 ms, 194.6 ms, and 2,354 ms respectively. The PlayCanvas sample is directionally comparable in frame time and materially smaller in local-loopback mobile display time, but the procedures differ: the Pixi run uses five fresh browsers, controlled 4G, 30-second states, full product journey, egress oracles, and source/power controls. Therefore the PlayCanvas result cannot supersede it.

### Headless diagnostic

Headless p95 ranges were 32.2–36.4 ms desktop, 19.2–19.6 ms laptop, and 12.9–13.9 ms mobile emulation. Headful results on the same build were stable near 9.5 ms and match the existing canonical headed cadence. Headless PlayCanvas timing must not be used as a release oracle without first explaining this scheduling difference.

## World presence and product readability

**OBSERVATION — local visual inspection, not an independent gate.** The retained current Pixi laptop screenshot depicts citizens primarily as dots with labels and resource glyphs on a sparse abstract map. It is factually legible but does not visually establish buildings, humanoid bodies, locomotion, physical work, or an inhabited settlement without text.

The PlayCanvas laptop screenshot immediately depicts houses, river, paths, market, mill, trees, human forms, walking poses, tools/containers, and clustered exchange participants. The mobile composition still shows a dominant physical world and human silhouettes, although the static camera crops context and the large header/summary consume too much vertical space. This is a material world-presence advantage and a concrete mobile-layout task.

The prototype likely satisfies the recognition intent of “settlement + human citizens + ongoing processes,” but it does **not** pass the World Presence Gate because:

- no unfamiliar independent observer performed the ten-/thirty-second test;
- proxy citizens orbit rather than follow authoritative spatial routes;
- action labels/classes are instrumentation claims, not canonical-event links;
- talk/exchange is co-location and props, not a complete rendezvous/transfer state machine;
- only six of the required animation classes were represented;
- no persistent simulation, Chronicle, absence return, or intervention ran.

## React/Vite integration and observability

| Concern | Evidence | Assessment |
|---|---|---|
| React composition | `Application`, `Entity`, `Camera`, `Light`, and `Render` composed directly in TSX. | Low conceptual integration cost. |
| Per-frame movement | `useAppEvent("update", ...)` changed PlayCanvas entities imperatively through refs, without React state updates. | Suitable for interpolated presentation owned outside Reality. |
| WebGL2 baseline | Explicit WebGL2 device selection succeeded in all nine headful contexts. | No baseline blocker on the measured browser. |
| Renderer failure boundary | React application lifecycle creates/destroys the PlayCanvas application; existing error-boundary/fallback pattern remains applicable. | Requires an integration test, not a new architecture. |
| Flight Recorder | Engine/app/device and stable entity names are observable; frame/action/spatial state can be projected into diagnostic events. | Feasible if IDs and semantic action contracts are explicit. |
| Reality isolation | Prototype movement was presentation-only and had no simulation import or mutation path. | Fits the boundary; production code must consume immutable `WorldPresentation`/`SpatialProjection` data. |
| Vite build | Typecheck and production build passed, but Vite externalized three Node worker imports in unused engine features. | Bounded warning/risk; inspect final chunks and exercise asset decode. |

PlayCanvas React is a thin official wrapper over the full engine and exposes animation, GLB, collision, and hooks needed by this direction ([PlayCanvas React overview](https://developer.playcanvas.com/user-manual/react/), accessed 2026-08-21). Its declarative wrapper does not remove the need for an imperative presentation controller: React should mount stable entities while fixed-step/interpolated spatial state updates transforms and animation parameters through engine refs.

## Navigation note

**VERIFIED FACT — package/source inspection.** `recast-navigation-js` describes runtime/offline navmesh generation, path queries, crowd simulation, worker generation, and a PlayCanvas helper package ([official repository](https://github.com/isaac-mason/recast-navigation-js), accessed 2026-08-21). Installed 0.43.1 metadata is MIT. The PlayCanvas adapter is small on disk, but its required WASM cohort contains a `338,824 B` raw `.wasm` artifact (`130,775 B` deterministic gzip) plus a `559,543 B` JavaScript loader (`60,047 B` gzip); the compatibility loader is larger. These are package-file measurements, not an integrated Vite result.

This does not block PlayCanvas. It does mean runtime Recast generation/crowd code cannot be assumed free inside an already tight initial route. The implementation should measure offline-authored navmesh plus lazy runtime query/crowd loading against runtime generation, preserve deterministic fixed-step targets and presentation interpolation, and avoid claiming collision/no-teleport correctness until a blocked-geometry temporal test passes. The renderer decision does not require settling that navigation trade-off in this report.

## Material-blocker test

| Candidate blocker | Result |
|---|---|
| Cannot run in existing React/Vite/TypeScript cohort | Falsified by typecheck, production build, and browser run. |
| Requires WebGPU | Falsified; WebGL2 was explicitly selected and observed. |
| Eight low-poly humanoids cannot meet frame budgets | Not observed at ratio 1; headful p95 was below both gates. Native high-DPR, real assets, navigation, UI, and full simulation remain open. |
| Cannot expose diagnostic state | Falsified at architecture level through app hooks, stable entity refs/names, graphics-device state, and frame/action instrumentation. |
| Cannot create materially stronger world presence than current Pixi path | Falsified by matched local visual inspection, subject to independent review. |
| Browser payload is inherently over the route ceiling | Not proven. Standalone fit; conservative integration estimate narrowly missed. Exact replacement build is the release gate. |
| Solo-builder integration is intractable | Not observed in the primitive scene. Asset, nav, animation, and action-projection breadth remain the real schedule risks. |

## Required next implementation checkpoint

Before art polish or broad mechanics, replace the Pixi component on the integration branch with one minimal PlayCanvas slice that:

1. lazy-loads exactly one renderer while preserving the semantic world;
2. consumes a typed immutable spatial presentation projection for eight citizens and one authoritative exchange;
3. includes one optimized humanoid/animation cohort and minimum settlement/prop cohort with exact licenses;
4. implements idle, walk, carry, gather, inspect, talk/listen, exchange, repair, eat/rest, and reaction state coverage, while Reality owns semantic timing/result and presentation owns interpolation;
5. records entity/action/position/animation/target mappings through diagnostics;
6. runs the real production bundle and canonical headed browser suite, including recorded backing pixel ratio, controlled mobile network, no-egress, and semantic parity;
7. runs an independent ten-/thirty-second World Presence review.

If the integrated JavaScript gate misses, first remove Pixi and unused PlayCanvas subsystems, split fact-free shell from renderer initialization, inspect tree-shaking, defer editor/debug/physics/Draco/GSplat/Recast generation paths, and lower only cosmetic quality. A budget change requires the existing decision process and a compensating scope reduction; this report grants no waiver.

## Rejected alternatives

| Alternative | Reason |
|---|---|
| Retain current Pixi world and add decorative polish | The retained evidence lacks embodied settlement/humanoid/action presence; this is structural, not a color/texture issue. |
| Ship Pixi and PlayCanvas together | Violates the one-renderer boundary and makes the already tight payload/maintenance problem worse. |
| Reject PlayCanvas because standalone gzip exceeds the current whole app | That comparison ignores replacement, code sharing, and tree-shaking; the correct test is an integrated replacement build. |
| Declare PlayCanvas passed because the primitive scene is fast | Real assets, navigation, canonical action projection, native DPR, controlled mobile network, physical device, and independent recognition are unmeasured. |
| Require WebGPU | Conflicts with compatibility and free-V1 access; WebGL2 met the architecture spike. |

## Uncertainties and reopen evidence

- **UNRESOLVED:** exact integrated replacement gzip. Reopen adoption only if one measured removal/tree-shaking/splitting pass still misses the locked route ceiling materially.
- **UNRESOLVED:** M4 Pro, physical mid-tier mobile, native DPR 2/3, thermal, and 30-second state performance. Reopen quality tiers or scene density on measured failure.
- **UNRESOLVED:** production GLB, animation textures, navmesh, and environment payload. Reopen asset breadth before weakening budgets.
- **UNRESOLVED:** Recast/Detour runtime versus offline cost and deterministic crowd/path behavior. Reopen navigation choice after an integrated blocked-geometry spike.
- **UNRESOLVED:** independent player recognition and action readability. Reopen camera, silhouettes, animation, and prop language after World Presence review.
- **UNRESOLVED:** PlayCanvas React `0.x` API stability over Founder Alpha maintenance. Reopen wrapper use if upgrade churn or missing lifecycle control materially exceeds direct-engine integration.

## Scratch evidence identity

The following ignored files were retained locally for coordinator inspection and are not repository evidence:

| Scratch artifact | SHA-256 |
|---|---|
| `playcanvas-measurements-headful-native.json` | `84c912134b32a215e98dc6f524f2609be6a0529761eed4bbd992fc33b8ef1946` |
| `playcanvas-measurements-headful.json` | `f656b6b15e84aa18c9235911c1308a7673dc41a2cf607b3b1bf9f799d15fd5ca` |
| `playcanvas-measurements.json` (headless) | `4896fd415be7471c571825df7b65b9d8caf3be9a29a0691df25748150bb99d48` |
| `playcanvas-desktop.png` | `d2b2b7b9b05602cbd82c75a1cf6f3f83f4e335e432043c5e55d730a15f1c2036` |
| `playcanvas-laptop.png` | `ac37715222e4c68902fd2a8dd769d27c8773e38f5b94be848b5d1157fb2856be` |
| `playcanvas-mobile-emulation.png` | `ca7db1cd95535b6264d4fa44aa41bf1e0b0fdb2b2b23913f3108ab6100ad13e1` |

These hashes permit local inspection but do not make ignored evidence durable. Any implementation decision that depends on pixels or raw distributions must regenerate them on the exact integrated commit or explicitly promote reviewed, non-sensitive evidence through the repository evidence protocol.

## Proposed source-ledger rows

The coordinator alone may add these rows to the shared ledger.

| Proposed ID | Claim supported | Direct URL | Accessed | Class | Confidence | Suggested consumers |
|---|---|---|---|---|---|---|
| S-WP-001 | PlayCanvas React provides the official declarative React API over PlayCanvas entities/components/hooks. | <https://developer.playcanvas.com/user-manual/react/> | 2026-08-21 | A | High | Frontend, architecture, this report |
| S-WP-002 | The React API includes Application, Entity, GLB, animation, render, collision, and lifecycle hooks. | <https://developer.playcanvas.com/user-manual/react/api/> | 2026-08-21 | A | High | Frontend, implementation plan |
| S-WP-012 | Script/update-loop integration supports imperative performance-sensitive behavior outside React rerenders. | <https://developer.playcanvas.com/user-manual/react/api/script/> | 2026-08-21 | A | High | Frontend, diagnostics |
| S-WP-006 | Recast Navigation JS supports generation, queries, crowds, workers, and a PlayCanvas integration. | <https://github.com/isaac-mason/recast-navigation-js> | 2026-08-21 | A | High | Frontend, simulation research |

## Resulting implementation behavior

Use PlayCanvas React with WebGL2 as the mandatory baseline and WebGPU only as an optional later capability. Mount stable scene/entity structure through React; drive fixed-step/interpolated transforms and animation imperatively from immutable spatial projections. Keep Reality, protocol, cognition, persistence, Chronicle, experiments, and diagnostics authority unchanged. Remove Pixi from production imports while retaining it development-only for immutable historical evidence. Treat bundle, native-DPR/mobile performance, navigation correctness, semantic parity, and independent world-presence recognition as blocking evidence gates—not polish.
