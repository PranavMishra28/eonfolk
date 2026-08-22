# Performance and accessibility budgets

**Purpose:** define provisional payload, display, frame, population, motion, semantic-access, and weak-device budgets.

**Status:** BUDGETS BINDING; CLEAN 15-RUN PLAYCANVAS BATTERY PASSED

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

The stricter staged requirement is: a fact-free authority-loading shell by **2 seconds**, operable **Follow Mara** after authoritative replay by **3 seconds**, and meaningful world by the table limit without displacing a pressed target. The loading shell must never invent Mara/world facts while Worker/storage authority is unresolved. “Meaningful” means Mara plus all eight citizen projections, their current activities, an interaction cue, and equivalent semantic rows are painted; it is not a spinner or partial scene.

The sole blocking browser runtime is `@playwright/test` **1.62.1** driving the preinstalled headed Chromium revision **1234**, Chrome for Testing **151.0.7922.34** [S-TOOL-17] [S-TOOL-19]. Before work and every cohort, its exact local app root, executable path/version/launcher hash, and complete no-follow file/symlink manifest must match the Goal prompt's 326-file/five-symlink/372,002,382-byte frozen identity; both Node and Ruby reproduce the 62,239-byte manifest hash. Configure that `executablePath`, freeze the cohort, and stop rather than download on mismatch. The desktop profile is the builder's M4 Pro with clean production preview, native DPR, foreground, macOS normal power mode (`powermode 0`), and recorded OS/browser/power identity. The source must stay stable for the run: AC is accepted, or battery is accepted at **>=50%** at both boundaries. No numerical budget changes by power source. Mobile lab is 390×844, DPR 3, four-times CPU slowdown, 1.6 Mbps down, 750 Kbps up, 150 ms RTT, cache disabled in that same runtime. Physical iPhone 13/Pixel 7-class-or-weaker evidence is optional diagnostic evidence, never substitutes for numerical gates, and does not block if a device is unavailable.

**Recorded implementation decision DEV-M5-004:** the pre-run Goal prompt preferred AC for repeatability, but the operator's binding overnight acceptance requires measured budgets or a justified corrective action and explicitly discourages routine questions. Normal-mode battery >=50% is an objectively recorded, non-weaker execution profile: it changes no payload/display/frame threshold, and the harness fails source changes, low-power mode, low battery, dirty source, or any numerical miss. Reopen if paired measurements show the accepted battery profile is less demanding or materially more variable than AC.

## Canonical measurement procedure

From a clean checkout run `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm preview --host 127.0.0.1 --port 4173`; record commit/lockfile, commands, power/device/profile, frozen browser identity, seed/state, quality/motion/UI/focus state, and preview origin. Launch with background networking/component updates/domain reliability disabled, deny-all host resolver except loopback, nonproxied WebRTC UDP disabled, and Chromium netlog; block service workers and route-log/abort every non-origin request. Route log plus netlog must show zero attempted external DNS/HTTP/WebSocket/WebTransport/beacon/worker/navigation/prefetch/UDP egress. Five cold repetitions use a newly launched pinned browser, dedicated netlog, and new context with cache/service workers/IndexedDB/storage cleared; every run passes. A failed browser is never reused, and no partial repetition enters the aggregate. Time from that navigation's required-zero `PerformanceNavigationTiming.startTime`; one-shot marks record the first qualifying animation frame. Instrument `shell`, `cta`, and `meaningful-world`, assert semantic/projection conditions at marks, assert the arrival phase/control immediately before and after its full sample, then set offline and complete the journey without another request.

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

The scratch result is historical feasibility evidence, not permission to reserve all remaining bundle/frame budget.

The later bounded PlayCanvas spike [S-WP-014] rendered eight articulated citizens, six action classes, interaction pairs, and a recognizable primitive settlement under 10 ms headed p95 across the three emulated profiles. Its standalone renderer was 568,064 bytes gzip and the conservative integration estimate narrowly exceeded the total-JS ceiling, so adoption required real code splitting and an integrated build rather than a waiver.

## Integrated implementation evidence

**HISTORICAL PIXI EVIDENCE — RELEASE INVALIDATED BY WORLD PRESENCE OVERRIDE:** the prior repaired production build measured **123,027 bytes gzip** for the classified critical shell, **250,885 bytes gzip** for all emitted JavaScript, and zero external world-asset bytes. The [bundle record](../exec-plans/evidence/001/implementation/bundle.json) preserves that old renderer result; it is not evidence for the PlayCanvas candidate.

The headed harness ran five fresh browser/context/netlog triples for each required profile. Every context disabled cache/service workers, loaded authoritative Worker/IndexedDB state, marked shell/CTA/meaningful world, proved the arrival control stable across its long sample, went network-offline, completed the full arrival → investigation → counsel → return/catch-up → Chronicle journey, and sampled arrival, busy market, and Chronicle for 30 seconds after a 5-second warmup.

- Desktop 1728×1117 DPR 2: shell worst **90.9 ms**; meaningful world worst **187.8 ms**; pooled p95 **9.2 ms** and worst state p95 **9.3 ms**; worst frame **25.1 ms**; six frames exceeded the profile budget among 54,012 pooled samples.
- Laptop 1366×768 DPR 1: shell worst **87.8 ms**; meaningful world worst **202.1 ms**; pooled and worst state p95 **9.2 ms**; worst frame **42.0 ms**; 24 frames exceeded the profile budget among 53,968 pooled samples.
- Mobile 390×844 DPR 3, 4× CPU, 1.6 Mbps down/750 Kbps up/150 ms RTT: shell worst **1,581.6 ms**, meaningful world worst **2,266.6 ms**, pooled and worst state p95 **9.2 ms**, worst frame **174.8 ms**; ten frames exceeded the profile budget among 53,937 pooled samples.
- The route oracle recorded **210** allowed local requests and zero external attempts; all **15** independent Chromium netlogs recorded zero external DNS/host/protocol attempts.

The first earlier smoke exposed a real miss: a decorative continuous Pixi ticker produced **25.1 ms desktop p95**. That loop was removed, and the authoritative projection-driven renderer now passes the numerical gates without a budget waiver. Exact per-run marks, distributions, diagnostics, procedure, browser path, and limitations are in the [performance record](../exec-plans/evidence/001/implementation/performance.json).

This canonical run used clean source `adf71c841066e1ead961493fa98394c206ca26d3`, lockfile SHA-256 `2ea20c761a7534b3cf2a4490e1ff7eb7422dd469bb360c4e22b21ac98ebf5fc6`, headed Chrome for Testing 151, AC power, and normal power mode. Power boundaries were AC at 72% charging and AC at 85% charging. The harness itself ran the production build and retained the identical start/end 15-file dist-manifest SHA-256 `789a8e7d7d6974599162f001b74a312820c0e1e9561337f0dce88246e001cbc2`. Independent Node/Ruby validators matched the complete frozen browser cohort, and each painted mark retains fact-free shell, operable CTA, eight activities, one Mara, a named Mara–Toma interaction, and semantic/illustrated parity evidence. The report also records every before/after arrival invariant, 15 per-run netlog results, per-run and pooled nearest-rank distributions, long tasks, heap where exposed, investigation latency, catch-up latency, and source/power/network provenance.

Two AC attempts were discarded in full before this acceptance: one exposed an opaque missing-control timeout after a long arrival sample, and the next exposed a localhost navigation timeout in the thirteenth context of a long-lived browser. No partial samples were retained. The harness changed commits to bind before/after arrival integrity and then give every repetition a fresh browser/netlog; a wholly new 15-run battery at `adf71c8` passed. Numerical gates, throttling, state durations, and source/build/browser/egress requirements were unchanged.

The mobile profile is canonical emulation on the target M4 Pro, not a physical phone. Physical mid-tier mobile, twelve-citizen stress, thermal behavior, and field percentiles remain unmeasured; none is promoted to a claim.

## Reduced motion

When `prefers-reduced-motion` is set or the in-product control is enabled:

- disable camera fly-throughs, nonessential particles, parallax, weather sway that conveys no state, and autoplay cinematic motion;
- preserve essential path locomotion at a steady bounded rate while removing camera travel, cosmetic river motion, and high-amplitude pose cadence; equivalent status text names the same action/result;
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

## Diagnostics mode budgets

The canonical OFF/LOCAL/ALPHA ceilings are owned by [Diagnostics](../engineering/DIAGNOSTICS.md#modes-and-hard-budgets). The integrated browser benchmark runs the same build, seed, journey, viewports, warmup, sample duration, and power/network conditions for all three modes. It records p50/p95 frame time, long tasks, input latency, meaningful-display time, heap where supported, serialized bytes/minute, ring/queue bounds, freeze latency, and player-route gzip. Unsupported browser signals are reported as unsupported rather than zero.

OFF may regress p95 frame time by at most 1%; LOCAL and ALPHA by at most 3%. A miss removes or coalesces optional diagnostic detail before any visual/gameplay budget changes. ALPHA serialization/upload work cannot run in animation-critical slices.

The short `pnpm benchmark:diagnostics` workload is a fail-fast source-level check, not that integrated browser measurement. It deterministically applies the same call sequence to OFF, LOCAL, and ALPHA over seven repetitions; binds commit, lockfile, runtime, source hashes, mode/schema/redaction identity, and workload hash; and enforces the **0.5 ms OFF / 1 ms LOCAL** record-call ceilings plus all live ring ceilings. ALPHA uses the stricter LOCAL 1 ms call threshold for this harness because its authoritative budget does not grant a slower record call. Modeled serialization at 60 calls/minute is reported but not called a gate because no bytes/minute authority ceiling exists. Browser frame regression, long tasks, input latency, meaningful display, heap, upload, and physical-device results remain explicitly unsupported or not run. The protocol and current `NOT_RUN` physical record are under [Founder Alpha performance evidence](../exec-plans/evidence/002/README.md).

## Invalidated pre-override Founder Alpha measurement

At clean commit `59edef3c768d9a3fe9409f07d77d49fded4b9554`, the canonical headed harness ran five fresh browsers for each profile and passed the then-current Pixi build. The 2026-08-21 World Presence override invalidated it as a release candidate without deleting the evidence. None of its renderer payload/frame/display results may be used to release the PlayCanvas candidate.

## Current PlayCanvas integration checkpoint

**VERIFIED CLEAN INTEGRATION CHECKPOINT — CANONICAL BATTERY STILL PENDING:** at exact clean commit `593e5ab8bbf0bbe0f5977bc016b6c520a4877bf8`, the integrated production build reports **95,581 bytes gzip** critical shell, **632,154 bytes gzip** total JavaScript, and zero external world-asset bytes. The lazy PlayCanvas world chunk is **512,155 bytes gzip**. All fifteen unchanged-production journeys, the frozen 199-package cohort, and the production dependency audit pass; 202 routed requests and 31,446 netlog events contain zero external attempt [S-WP-022]. This closes the clean integration checkpoint, not the fresh five-repetition-per-profile performance battery or human inhabited/alive gate.

The production browser journey currently passes an automated temporal probe that samples the 30 Hz projection clock, observes at least three moving citizens, at least four animation classes and one interaction, requires WebGL2, enforces a ≤1.51 canvas pixel ratio, confirms canvas/host containment, and reports zero teleports/contradictions. Unit tests cover the complete eleven-class pose graph, tick-by-tick route continuity, blocked geometry, canonical exchange linkage, and injected mismatch detection. These prove instrumentation and deterministic behavior, not human aliveness or physical-device thermals.

The frozen `17b2a3d` confirmation then exposed a real throttled-mobile failure: canonical cadence settled the sole illustrated exchange before meaningful world paint. Repair `4c205e2` keeps that Reality-owned reservation through simulation time 180 and settles it exactly once at 240 without reading renderer state. The one permitted post-fix confirmation measured the unchanged 390×844/4× CPU/4G predicate at **4,439.5 ms** with eight activities, two named exchange participants, illustrated interaction count one, semantic parity, and zero egress. Its one-repetition short run is diagnostic closure of the mechanism, not the required five-repetition canonical battery.

## Release-valid PlayCanvas measurement

**VERIFIED CLEAN DEEP PASS:** exact final implementation head `f818d1069401a1f8e14d2ca6badec29841afbd81` completed five fresh-browser repetitions for each desktop, laptop, and throttled 390×844 mobile profile on the plugged-in target Mac. Source commit and lockfile were identical at both boundaries and the tree remained clean. Verification output SHA-256 is `21e85a3e875ca79d0d6e31b25d4ba19f1c871bb6c22c780cf777ba877cfb689d`; artifact-manifest SHA-256 is `cc54184974c05e69e9be0c18d98ebd5d07769bac55bf96fcc1b650bf68dedddd`; canonical performance artifact SHA-256 is `d1a8fb491d58bd1dedd2cbfade3af08b7191220f3930afcc50e4c2bb1446278e`.

Payload was **99,896 bytes gzip** critical shell, **644,464 bytes gzip** total JavaScript, and **0 bytes** external world assets. Maximum meaningful-world display was **445.0 ms desktop**, **455.4 ms laptop**, and **4,433.4 ms mobile**. Desktop pooled p95 was **9.1 ms**, laptop **8.9 ms**, and mobile **9.2 ms**. One isolated laptop arrival frame reached **50.1 ms** and counted as one dropped frame; desktop and mobile recorded none. The declared aggregate/p95 gate passed without weakening a limit. Every meaningful mark retained the required eight-citizen activity and interaction evidence. All 75 routed requests and fifteen independent browser netlogs reported zero external attempts. This is canonical automated emulation evidence, not physical-phone, thermal, screen-reader, or unfamiliar-human evidence.

## Resulting implementation behavior

The semantic shell arrives first, the PlayCanvas renderer is lazy and must remain inside the route ceiling, and eight citizens are projected from one immutable spatial boundary. Quality tiers reduce pixel ratio, shadows, cosmetic motion, geometry, and distant detail before information or agency. A device that cannot sustain WebGL receives the complete local game through semantic view.

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

- **VERIFIED FACT:** the procedural PlayCanvas candidate ships zero external world-asset bytes and fits the unchanged payload budgets at exact clean commit `593e5ab` [S-WP-022].
- **VERIFIED FACT:** the selected PlayCanvas application passed the fresh full fifteen-run display/frame/egress battery at exact final implementation head `f818d10`; reopen on any renderer, choreography, meaningful-world predicate, payload, browser-cohort, or quality-tier change.
- **UNRESOLVED:** a physical mid-tier mobile meets display/frame/thermal targets. Reopen quality tiers after measured device evidence.
- **UNRESOLVED:** the semantic fallback preserves world dominance and attachment. Reopen layout after fresh accessibility/player review.
- **UNRESOLVED:** 90/365-day catch-up fits a humane wait. Set exact catch-up wall-time and event budgets only from the implementation benchmark.

## Constraint fit

Budgets cap the renderer and asset ambition to what one builder can author, debug, and ship on an M4 Pro. They preserve a no-GPU/no-model route and make weak-device access part of free V1. The measured spike is used to cut risk, not to justify scope expansion.
