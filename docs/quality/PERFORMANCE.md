# Performance and accessibility budgets

**Purpose:** define provisional payload, display, frame, population, motion, semantic-access, and weak-device budgets.

**Status:** PROVISIONAL BUDGETS ACCEPTED; CANONICAL 15-RUN CLEAN-COMMIT LAB PASSES ALL NUMERICAL AND EGRESS GATES

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

The stricter staged requirement is: a fact-free authority-loading shell by **2 seconds**, operable **Follow Mara** after authoritative replay by **3 seconds**, and meaningful world by the table limit without displacing a pressed target. The loading shell must never invent Mara/world facts while Worker/storage authority is unresolved. “Meaningful” means Mara plus all eight citizen projections, their current activities, an interaction cue, and equivalent semantic rows are painted; it is not a spinner or partial scene.

The sole blocking browser runtime is `@playwright/test` **1.62.1** driving the preinstalled headed Chromium revision **1234**, Chrome for Testing **151.0.7922.34** [S-TOOL-17] [S-TOOL-19]. Before work and every cohort, its exact local app root, executable path/version/launcher hash, and complete no-follow file/symlink manifest must match the Goal prompt's 326-file/five-symlink/372,002,382-byte frozen identity; both Node and Ruby reproduce the 62,239-byte manifest hash. Configure that `executablePath`, freeze the cohort, and stop rather than download on mismatch. The desktop profile is the builder's M4 Pro with clean production preview, native DPR, foreground, macOS normal power mode (`powermode 0`), and recorded OS/browser/power identity. The source must stay stable for the run: AC is accepted, or battery is accepted at **>=50%** at both boundaries. No numerical budget changes by power source. Mobile lab is 390×844, DPR 3, four-times CPU slowdown, 1.6 Mbps down, 750 Kbps up, 150 ms RTT, cache disabled in that same runtime. Physical iPhone 13/Pixel 7-class-or-weaker evidence is optional diagnostic evidence, never substitutes for numerical gates, and does not block if a device is unavailable.

**Recorded implementation decision DEV-M5-004:** the pre-run Goal prompt preferred AC for repeatability, but the operator's binding overnight acceptance requires measured budgets or a justified corrective action and explicitly discourages routine questions. Normal-mode battery >=50% is an objectively recorded, non-weaker execution profile: it changes no payload/display/frame threshold, and the harness fails source changes, low-power mode, low battery, dirty source, or any numerical miss. Reopen if paired measurements show the accepted battery profile is less demanding or materially more variable than AC.

## Canonical measurement procedure

From a clean checkout run `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm preview --host 127.0.0.1 --port 4173`; record commit/lockfile, commands, power/device/profile, frozen browser identity, seed/state, quality/motion/UI/focus state, and preview origin. Launch with background networking/component updates/domain reliability disabled, deny-all host resolver except loopback, nonproxied WebRTC UDP disabled, and Chromium netlog; block service workers and route-log/abort every non-origin request. Route log plus netlog must show zero attempted external DNS/HTTP/WebSocket/WebTransport/beacon/worker/navigation/prefetch/UDP egress. Five cold repetitions use a new context with cache/service workers/IndexedDB/storage cleared; every run passes. Time from that navigation's required-zero `PerformanceNavigationTiming.startTime`; one-shot marks record the first qualifying animation frame. Instrument `shell`, `cta`, and `meaningful-world`, assert semantic/projection conditions at marks, then set offline and complete the journey without another request.

Physical evidence separately runs `pnpm preview --host 0.0.0.0 --port 4173` on one recorded RFC1918 origin with host firewall restricted to the trusted device/LAN and inspected preview logs, then stops the server. It is not pooled with canonical lab results.

After warm asset load and five stabilization seconds, collect 30 seconds of foreground `requestAnimationFrame` deltas for arrival, busy-market interaction, and Chronicle overlay. Pool samples and calculate nearest-rank p95 as `sorted[ceil(0.95*n)-1]`; record p50/p95/worst for each state and pooled. Every state and pooled p95 must pass.

For each lexically sorted emitted HTML/CSS/JavaScript file, deterministic `LC_ALL=C gzip -9 -n < file | wc -c` counts bytes; sum the integer results. Critical shell is files reachable before renderer import; total initial route adds JavaScript through `meaningful-world`; asset payload is actual transferred compressed app-owned atlas/art/font bytes through that mark. Sourcemaps, headers, or cache never reduce counts. Cold/warm results are separate; all five cold runs pass, and a failure requires a changed commit plus five wholly new runs.

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

## Integrated implementation evidence

**AUTOMATED TECHNICAL MEASUREMENT — NOT A MEASURED HUMAN PASS:** the repaired production build measures **122,964 bytes gzip** for the classified critical shell, **250,133 bytes gzip** for all emitted JavaScript, and zero external world-asset bytes. The [bundle record](../exec-plans/evidence/001/implementation/bundle.json) lists every emitted file and fixed limit.

The headed harness ran five cold contexts for each required profile. Every context disabled cache/service workers, loaded authoritative Worker/IndexedDB state, marked shell/CTA/meaningful world, went network-offline, completed the full arrival → investigation → counsel → return/catch-up → Chronicle journey, and sampled arrival, busy market, and Chronicle for 30 seconds after a 5-second warmup.

- Desktop 1728×1117 DPR 2: meaningful world worst **177.6 ms**; pooled p95 **10.0 ms**; worst state p95 **10.1 ms**; worst frame **10.5 ms**; zero dropped frames.
- Laptop 1366×768 DPR 1: meaningful world worst **151.7 ms**; pooled and worst state p95 **10.0 ms**; worst frame **10.4 ms**; zero dropped frames.
- Mobile 390×844 DPR 3, 4× CPU, 1.6 Mbps down/750 Kbps up/150 ms RTT: shell worst **1,603.3 ms**, meaningful world worst **2,266.5 ms**, pooled and worst state p95 **10.0 ms**, worst frame **10.4 ms**, zero dropped frames.
- The route oracle recorded **210** allowed local requests and zero external attempts; the independent Chromium netlog also recorded zero external DNS/host/protocol attempts.

The first earlier smoke exposed a real miss: a decorative continuous Pixi ticker produced **25.1 ms desktop p95**. That loop was removed, and the authoritative projection-driven renderer now passes the numerical gates without a budget waiver. Exact per-run marks, distributions, diagnostics, procedure, browser path, and limitations are in the [performance record](../exec-plans/evidence/001/implementation/performance.json).

This canonical run used clean source `c44f05c2935cd8e6c5bba783d9275818fa57fbe5`, lockfile SHA-256 `2ea20c761a7534b3cf2a4490e1ff7eb7422dd469bb360c4e22b21ac98ebf5fc6`, headed Chrome for Testing 151, and normal power mode. Battery boundaries were 82% and 78%, both accepted under DEV-M5-004. The report records per-run and pooled nearest-rank distributions, long tasks, heap where exposed, investigation latency, catch-up latency, and source/power/network provenance. The earlier 15-run artifact remains superseded diagnostic history; the linked record is the new canonical acceptance artifact.

The mobile profile is canonical emulation on the target M4 Pro, not a physical phone. Physical mid-tier mobile, twelve-citizen stress, thermal behavior, and field percentiles remain unmeasured; none is promoted to a claim.

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
