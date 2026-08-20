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
| Compressed first-world 3D assets | **<=6 MB desktop; <=4 MB mobile** |
| Meaningful world display on target M4 Pro/laptop profile | **<=3 seconds** |
| Meaningful world display on realistic mid-tier mobile/4G profile | **<=5 seconds** |

“Meaningful world display” means the shell and world/fallback identify the settlement and sponsored citizen and accept a useful selection; it is not a blank canvas, spinner, or decorative splash. Measure cold and warm runs separately and disclose caching.

## Frame and population budgets

| Profile | Gate |
|---|---|
| Desktop/laptop | 60 FPS target; p95 frame time **<=16.7 ms** with eight citizens |
| Mobile | 30 FPS minimum; p95 frame time **<=33.3 ms** with eight citizens |
| Population | eight by default; twelve remains practical and legible; larger rendered populations out of scope |

Record p50/p95/worst frame time, long tasks, memory, dropped frames, worker advancement latency, and catch-up time with the browser version, viewport, device/profile, pixel ratio, quality tier, seed, and build commit. Avoid claiming physical-device performance from emulation alone.

## Disposable rendering evidence

**DIRECTIONAL LOCAL EVIDENCE:** R3F scratch `4bdef56` measured 291.39 KB gzip JavaScript, about 0.92–1.0 seconds local load, p95 17.1 ms at desktop/laptop viewports, and 17.3 ms at mobile, with twelve citizens and a representative scene/overlay.

Interpretation:

- the renderer candidate can fit inside the **650 KB** total-JS ceiling in a toy build;
- the spike did not isolate a **<=200 KB** critical shell, so that budget is unproven;
- local load does not establish 4G or production-asset display time;
- **17.1 ms fails** the desktop p95 budget by 0.4 ms and requires simplification/remeasurement;
- 17.3 ms is directionally inside the mobile frame gate, but the emulated profile and mobile overflow prevent a pass;
- no production simulation, Chronicle, full UI, texture payload, thermal soak, or physical mid-tier mobile was measured.

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

1. reduce device pixel ratio, shadows, weather, post-effects, and texture/mesh detail;
2. reduce nonessential animation cadence while keeping state changes legible;
3. switch distant/secondary citizens and props to simplified markers;
4. offer a fully playable semantic list/map view.

Do not remove citizens, facts, interaction results, counsel, Chronicle, or replay. Never substitute a lower simulation fidelity by device; authoritative results stay identical.

## Catch-up and cognition budgets

- Catch-up runs in the worker, yields progress, and commits resumable deterministic batches. Define event/time safety limits from 30/90/365-day measurements before release.
- The UI remains responsive during catch-up and can display the last committed world state.
- External cognition is absent in V1. A later local-model spike must disclose artifact bytes and separately measure cold/warm latency, memory, heat, battery, and renderer p95. It cannot run concurrently in a way that violates the frame gates; pause/degrade optional inference or fall back to Standard Brain.

## Resulting implementation behavior

The semantic shell arrives first, the renderer is lazy but inside the route ceiling, and eight citizens remain readable. Quality tiers reduce decoration before information or agency. A device that cannot sustain the canvas still receives the complete local game through the semantic world view.

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

- **UNRESOLVED:** the selected art assets fit 6/4 MB without losing the intended language. Reopen asset style/quantity after real GLB/KTX2 output.
- **UNRESOLVED:** a full R3F application can recover the 0.4 ms desktop p95 gap. Failure changes renderer/art scope, not the gate.
- **UNRESOLVED:** a physical mid-tier mobile meets display/frame/thermal targets. Reopen quality tiers after measured device evidence.
- **UNRESOLVED:** the semantic fallback preserves world dominance and attachment. Reopen layout after fresh accessibility/player review.
- **UNRESOLVED:** 90/365-day catch-up fits a humane wait. Set exact catch-up wall-time and event budgets only from the implementation benchmark.

## Constraint fit

Budgets cap the renderer and asset ambition to what one builder can author, debug, and ship on an M4 Pro. They preserve a no-GPU/no-model route and make weak-device access part of free V1. The measured spike is used to cut risk, not to justify scope expansion.
