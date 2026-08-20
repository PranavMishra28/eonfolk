# Performance and accessibility budgets

**Purpose:** define provisional payload, display, frame, population, motion, semantic-access, and weak-device budgets.

**Status:** PROVISIONAL BUDGETS ACCEPTED; IMPLEMENTATION MEASUREMENTS MAY TIGHTEN BUT NOT SILENTLY WEAKEN THEM

**Authority boundary:** owns numerical performance/accessibility budgets and degradation order. Renderer choice is owned by [frontend](../engineering/FRONTEND.md); evidence procedure by [visual QA](VISUAL_QA.md).

**Related documents:** [frontend](../engineering/FRONTEND.md), [visual QA](VISUAL_QA.md), [testing](TESTING.md), [architecture](../engineering/ARCHITECTURE.md), future `docs/design/MOBILE.md`

## Owned decision

The first slice targets eight rendered citizens and remains practical at twelve. It must meet the following initial budgets under the representative world, DOM overlay, worker simulation, and normal Chronicle projection. A spike can make a budget stricter. Weakening one requires a recorded decision, user impact, compensating scope reduction, and fresh review; a renderer miss first triggers simplification or renderer/art-direction change.

## Payload and display budgets

| Measure | Provisional gate |
|---|---:|
| Critical shell HTML/CSS/JavaScript | **<=200 KB gzip** |
| Total initial-route JavaScript, including lazy world renderer | **<=650 KB gzip** |
| Compressed first-world 2.5D atlas/assets | **<=6 MB desktop; <=4 MB mobile** |
| Meaningful world display on target M4 Pro/laptop profile | **<=3 seconds** |
| Meaningful world display on realistic mid-tier mobile/4G profile | **<=5 seconds** |

The stricter staged requirement is: useful semantic/static shell with Mara by **2 seconds**, operable **Follow Mara** by **3 seconds**, and meaningful world by the table limit without displacing a pressed target. “Meaningful” means Mara plus all eight citizen projections, their current activities, an interaction cue, and equivalent semantic rows are painted; it is not a spinner or partial scene.

The target desktop profile is the builder's M4 Pro on pinned Playwright Chromium with clean production preview, native DPR, foreground, plugged in, Low Power Mode off, heavy apps closed, and recorded OS/browser versions. The mobile laboratory profile is 390×844, DPR 3, four-times CPU slowdown, 1.6 Mbps down, 750 Kbps up, 150 ms RTT, cache disabled in the same engine; final physical-mobile claims also require one named iPhone 13/Pixel 7-class-or-weaker device and recorded local connection. Emulation alone is labeled emulation.

## Canonical measurement procedure

From a clean checkout run `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm preview --host 127.0.0.1 --port 4173`; record commit/lockfile, commands, power/device/profile, browser engine/version, seed/state, quality/motion/UI/focus state, and the single preview origin. Five cold repetitions each use a new browser context with HTTP cache, service workers, IndexedDB, and local storage cleared. The maximum of the five load results must pass. Instrument `shell`, `cta`, and `meaningful-world`; at each mark the browser assertion verifies the semantic/projection conditions above. HAR/request inspection permits only the recorded loopback or physical-device RFC1918 preview origin for committed app assets and fails all DNS/external egress.

After warm asset load and five stabilization seconds, collect 30 seconds of foreground `requestAnimationFrame` deltas for arrival, busy-market interaction, and Chronicle overlay. Pool samples and calculate nearest-rank p95 as `sorted[ceil(0.95*n)-1]`; record p50/p95/worst for each state and pooled. Every state and pooled p95 must pass.

Deterministic `gzip -9` counts emitted bytes: critical shell is HTML + CSS + JavaScript reachable before the renderer import; total initial route adds every JavaScript chunk requested through `meaningful-world`; asset payload is transferred compressed app-owned atlas/art/font bytes through that mark. Sourcemaps, preview headers, or browser cache never reduce counts. Cold and warm results are reported separately; only the five cold results decide display gates.

## Frame and population budgets

| Profile | Gate |
|---|---|
| Desktop/laptop | 60 FPS target; p95 frame time **<=16.7 ms** with eight citizens |
| Mobile | 30 FPS minimum; p95 frame time **<=33.3 ms** with eight citizens |
| Population | eight by default; twelve remains practical and legible in a measurement-only stress fixture; larger populations out of scope |

Record p50/p95/worst frame time, long tasks, memory, dropped frames, worker advancement latency, and catch-up time with the browser version, viewport, device/profile, pixel ratio, quality tier, seed, and build commit. Avoid claiming physical-device performance from emulation alone.

## Disposable rendering evidence

**DIRECTIONAL LOCAL EVIDENCE:** rejected R3F scratch `4bdef56` measured 291.39 KB gzip JavaScript, about 0.92–1.0 seconds local load, p95 17.1 ms at desktop/laptop viewports, and 17.3 ms at mobile, with twelve citizens and a representative scene/overlay. It exposed the risk; it does not authorize R3F.

Interpretation:

- a toy world renderer can fit inside the **650 KB** total-JS ceiling;
- the spike did not isolate a **<=200 KB** critical shell, so that budget is unproven;
- local load does not establish 4G or production-asset display time;
- **17.1 ms fails** the desktop p95 budget by 0.4 ms and requires simplification/remeasurement;
- 17.3 ms is directionally inside the mobile frame gate, but the emulated profile and mobile overflow prevent a pass;
- no Pixi implementation, production simulation, Chronicle, full UI, atlas payload, thermal soak, or physical mid-tier mobile was measured.

The scratch result is feasibility evidence, not permission to reserve all remaining bundle/frame budget.

## Reduced motion

When `prefers-reduced-motion` is set or the in-product control is enabled:

- disable camera fly-throughs, nonessential particles, parallax, weather sway that conveys no state, and autoplay cinematic motion;
- replace animated spatial transitions with immediate state plus focus management/status text;
- keep Chronicle/replay manually stepable with previous/next/play-pause controls; default to paused when motion would be substantial;
- preserve authoritative time and outcomes—only presentation motion changes;
- do not use flashing or rapid motion as the only urgency signal.

Reduced motion is a functional test mode, not a CSS afterthought.

## Semantic and keyboard alternative

Every consequential action has a parallel semantic DOM path:

- citizen selection;
- identity/values/relationships/tension review;
- counsel and confirmation/cancellation;
- While You Were Away summary;
- Chronicle navigation and causal-detail inspection;
- replay previous/next/play/pause/speed controls.

Controls expose names, roles, states, focus, and live status without relying on WebGL coordinates. No important fact exists only in color, hover, particle, animation, sound, or canvas pixels. A keyboard-only player completes the critical journey without a timing trap.

## Weak-device degradation order

Apply and test in this order:

1. reduce device pixel ratio, shadows, weather, filters, and texture detail;
2. reduce nonessential animation cadence while keeping state changes legible;
3. switch distant/secondary citizens and props to simplified markers;
4. offer a fully playable semantic list/map view.

Do not remove citizens, facts, interaction results, counsel, Chronicle, or replay. Never substitute a lower simulation fidelity by device; authoritative results stay identical.

## Catch-up and cognition budgets

- Catch-up runs in the worker, yields progress, and commits resumable deterministic batches. Define event/time safety limits from 30/90/365-day measurements before release.
- The UI remains responsive during catch-up and can display the last committed world state.
- External cognition is absent in V1. A later local-model spike must disclose artifact bytes and separately measure cold/warm latency, memory, heat, battery, and renderer p95. It cannot run concurrently in a way that violates the frame gates; pause/degrade optional inference or fall back to Standard Brain.

## Resulting implementation behavior

The semantic shell arrives first, the Pixi renderer is lazy but inside the route ceiling, and eight citizens remain readable. Quality tiers reduce decoration before information or agency. A device that cannot sustain canvas receives the complete local game through semantic view.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| “Mobile compatible” without numbers | Not falsifiable and already contradicted by an overflow spike |
| Waive desktop p95 because the miss is small | Budgets need a clear gate; simplify and remeasure |
| Increase payload for generated/marketplace art | Conflicts with first display, provenance, and solo asset burden |
| Reduce simulation fidelity on weak devices | Would create different authoritative worlds/replays |
| Require WebGPU or model download | Excludes devices and violates onboarding constraints |
| Canvas-only fallback message | Does not preserve a playable product |

## Unproven assumptions and reopen evidence

- **UNRESOLVED:** the selected atlas fits 6/4 MB without losing the intended language. Reopen asset style/quantity after real optimized atlas output.
- **UNRESOLVED:** the selected Pixi application passes the early feasibility and full-load budgets. Failure changes art density or uses the semantic/Weathered Atlas fallback, not R3F.
- **UNRESOLVED:** a physical mid-tier mobile meets display/frame/thermal targets. Reopen quality tiers after measured device evidence.
- **UNRESOLVED:** the semantic fallback preserves world dominance and attachment. Reopen layout after fresh accessibility/player review.
- **UNRESOLVED:** 90/365-day catch-up fits a humane wait. Set exact catch-up wall-time and event budgets only from the implementation benchmark.

## Constraint fit

Budgets cap the renderer and asset ambition to what one builder can author, debug, and ship on an M4 Pro. They preserve a no-GPU/no-model route and make weak-device access part of free V1. The measured spike is used to cut risk, not to justify scope expansion.
