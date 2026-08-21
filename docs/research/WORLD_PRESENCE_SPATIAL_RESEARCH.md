# World presence spatial architecture research

**Purpose:** Determine the smallest WorldPresentation/SpatialProjection architecture that can make Riverhold visibly inhabited without allowing rendering, navigation, animation, or diagnostics to become Reality.

**Status:** RECOMMENDATION FOR RELEASE-BLOCKING IMPLEMENTATION — researched 2026-08-21; renderer measurements and independent observer evidence remain required

**Authority boundary:** This document owns the research recommendation and proposed contracts for spatial semantics, navigation, presentation time, animation, and Living World evidence. It does not change the accepted protocol, simulation, frontend, diagnostics, performance, or release authorities. The coordinator must reconcile those authorities before implementation.

**Related documents:** [architecture](../engineering/ARCHITECTURE.md), [simulation](../engineering/SIMULATION.md), [frontend](../engineering/FRONTEND.md), [diagnostics](../engineering/DIAGNOSTICS.md), [interaction](../design/INTERACTION.md), [performance](../quality/PERFORMANCE.md), [testing](../quality/TESTING.md), [Founder Alpha plan](../exec-plans/active/002-founder-alpha.md).

**Owned decision:** Adopt PlayCanvas React as the preferred embodied-world renderer unless the bounded renderer spike finds a material blocker. Put a pure, renderer-neutral `WorldPresentation` projection between Reality and PlayCanvas/semantic DOM. For the first eight-citizen settlement, use a deterministic authored waypoint/slot graph behind a `PathPlanner` port; do not ship Recast/Detour merely to satisfy architectural fashion. Keep an offline-navmesh Recast adapter as the measured escalation path.

**Reopen evidence:** Reopen the waypoint decision if authored routes cannot prevent blocking/interpenetration, if the settlement needs arbitrary destinations or dynamic obstacles, if path authoring becomes slower than importing an offline navmesh, or if the measured Recast adapter meets all bundle/load/frame budgets with less implementation risk. Reopen PlayCanvas only for a measured material blocker in the renderer spike, not familiarity with Pixi.

## Executive recommendation

The smallest honest architecture is not “animate the current `x/y` dots.” It has three deliberate changes:

1. Reality gains a narrow canonical action-window contract for consequential citizen actions. It owns action identity, kind, actors, semantic origin/destination, target, start/resolve simulation times, carried resource/tool intent, and the resulting event. Exact meters, paths, poses, keyframes, and collision corrections remain non-authoritative.
2. A pure `WorldPresentationProjector` consumes a read-only Reality snapshot plus ordered events and an authored `SpatialSceneDefinition`. It emits a versioned `SpatialProjection` with source revision/sequence/hash, action-to-anchor bindings, routes, animation classes, props, semantic sentences, and explicit cosmetic-process flags. It cannot dispatch commands.
3. PlayCanvas and the parallel semantic DOM consume the same projection. A test-injectable fixed-step `PresentationClock` interpolates routes and animation; the renderer never writes canonical state. Mismatches go to the bounded Flight Recorder and, for impossible/contradictory states, the existing Sentinel safe-stop path protects Reality.

**INFERENCE (WP-E-01):** this is larger than a renderer swap because the current canonical model has places and completed events but no action interval. Pretending an atomic result is an ongoing physical act would create false visual claims. A small typed action-window addition is safer than reconstructing durations and targets from prose or renderer heuristics.

**INFERENCE (WP-E-02):** Recast/Detour is unnecessary for eight actors moving through one authored, mostly static settlement. An integer-authored route graph plus reserved activity slots is easier to test, smaller, and more reproducible. Recast remains credible when route freedom or crowd density grows; the adapter boundary prevents a second spatial rearchitecture.

## Current implementation audit

The audit is against base commit `fe7f1d071212c60d36cd936838ebce7a9bfeae41`.

| Current seam | What exists | Release-blocking gap | Proposed owner |
|---|---|---|---|
| `packages/protocol/src/types.ts` | Typed `CitizenMoved`, gather, consume, exchange, repair, statements, relationships, causal parents, event `simulationTime`, and pre/post hashes | Events are atomic; there is no typed semantic action ID, interval, origin/target contract shared by every consequential citizen action | Protocol: canonical `CitizenActionWindow` and source/result linkage |
| `packages/sim/src/state.ts` | Canonical `placeId`, place adjacency, current behavior, inventory, needs, resources, mill state | No active action, semantic target, start/resolve time, or carried-action intent | Reality: bounded `activeActions`, not coordinates or animation |
| `packages/sim/src/genesis.ts` | Six named places, adjacency, three resource sites, mill, eight citizens | Default state cannot truthfully project several ongoing physical tasks | Seed a small set of canonical action windows with stable IDs/times |
| `packages/sim/src/scheduler.ts` | Deterministic action ordering and typed result payloads | Scheduler emits completed actions at one time; movement changes place immediately | Start/resolve at scheduler boundaries; existing result events remain effects |
| `packages/sim/src/reducer.ts` | Enforces place adjacency, co-location, inventory and conservation before effects | No active-action lifecycle or result/action binding | Validate start, exclusivity, timing, target and exact completion linkage |
| `apps/web/src/authoritative-runtime.ts` | Projects canonical state and Chronicle; hard-codes one `x/y` per citizen slug | Coordinates never change with place/action; activity text comes from coarse `currentBehavior`; no source event/action ID | Remove `citizenPositions`; call pure presentation projector with exact source head |
| `apps/web/src/projection.ts` | One `RiverholdProjection` shared by Pixi and semantic DOM | Citizen view has only percent `x/y`, activity and place | Compose product projection with a distinct versioned `SpatialProjection` |
| `apps/web/src/components/RiverholdWorld.tsx` | Pixi draws static landmarks/humanoid-like marks and stops the ticker after one render | No physical world, route, locomotion, duration, animation graph, prop transfer, or persistent process | Replace with a PlayCanvas scene consuming projection + clock; no sim imports |
| `apps/web/src/components/SemanticWorld.tsx` | Keyboard-operable citizen list and equivalent facts | No action progress, origin/destination/target/result or visible-process equivalence | Preserve and expand from the same `SpatialProjection` |
| `packages/diagnostics` and `apps/web/src/diagnostics.ts` | Bounded Flight Recorder, redaction allowlists, performance marks and Sentinel | No spatial category/fields or canonical-versus-display mismatch taxonomy | Add bounded presentation-transition and mismatch records; never per-frame dumps |
| `tests/e2e/riverhold.spec.ts` | Product, fallback, accessibility, failure, viewport and evidence journeys | Tests accept a static canvas and cannot prove temporal life | Add deterministic clock/test probe plus temporal route/action/event assertions |

**VERIFIED FACT (WP-E-03):** `RiverholdWorld.tsx` redraws only when its React effect dependencies change, explicitly stops the Pixi ticker, and places citizens at fixed percentage coordinates supplied by `citizenPositions` in `authoritative-runtime.ts`.

**VERIFIED FACT (WP-E-04):** Reality already has the correct high-level authority base: place adjacency, co-location validation, typed effect events, ordered simulation time, causal provenance, and state hashes. The spatial rearchitecture need not move meshes, floats, frame state, or renderer data into `packages/sim`.

## Authority split

### Canonical Reality/protocol

Reality must own only facts whose alteration could change the meaning or outcome of play:

- stable `actionId`, action kind and participating citizen IDs;
- semantic `originPlaceId` and `destinationPlaceId` (the same place is valid for work, talk, exchange and repair);
- typed target: citizen, place, resource site, mill/object, inventory resource, or none;
- `startSimulationTime` and `resolveSimulationTime`, expressed as safe integer simulation seconds;
- carried semantic resource/tool when it is required by the action;
- action lifecycle (`scheduled | active`) and the exact result event/action link;
- cancellation/exception reason when a canonical action is interrupted;
- place graph and legality, inventory ownership, result, causality, visibility and provenance.

Use a closed union, not optional fields spread across unrelated payloads. A minimal shape is:

```ts
type CitizenActionKind =
	| "move" | "gather" | "inspect" | "communicate" | "exchange"
	| "repair" | "consume" | "rest" | "react";

interface CitizenActionWindow {
	readonly actionId: string;
	readonly kind: CitizenActionKind;
	readonly actorIds: readonly CitizenId[];
	readonly originPlaceIds: readonly string[];
	readonly destinationPlaceId: string;
	readonly target: CitizenActionTarget;
	readonly startSimulationTime: number;
	readonly resolveSimulationTime: number;
	readonly carried: null | { readonly kind: "resource" | "tool"; readonly ref: string };
	readonly sourceEventId: EventId | null;
}
```

Add `activeActions` to `WorldState`, an `ActionStarted` event, and `actionId` to applicable existing result payloads. The reducer changes citizen `placeId`, inventory, relationship, knowledge, or mill state only on the existing result event. A movement action therefore leaves the citizen canonically at the origin until `CitizenMoved` resolves. An exchange reserves two participants but transfers inventory only at `ExchangeCompleted`. One citizen cannot hold incompatible overlapping actions. Protocol/schema/determinism versions must change together; old data continues to fail closed under the current no-upcaster policy.

This contract is intentionally not a generalized job/economy system. It is just enough to project the current move, gather, inspect, exchange, communication, repair, consume/rest and reaction families.

### Non-authoritative spatial presentation

Presentation owns everything that answers “how is the fact shown?”:

- meter-space coordinates and orientation;
- place anchors, entrances, route nodes/edges, lane offsets and blocked volumes;
- interaction/work/rendezvous slots and hand/prop attachment sockets;
- path choice between legal semantic endpoints;
- continuous interpolation, avoidance offsets and visual facing;
- animation clips, blending, normalized clip phase, foot placement and IK;
- camera, light, quality level, LOD, shadows and environmental effects;
- transient visual prop pose; and
- selection/hover/focus presentation.

`SpatialSceneDefinition` is an authored, versioned asset keyed by canonical place/object IDs. It must include `placeAnchors`, `entrances`, `workPoints`, `interactionSlots`, `rendezvousSlots`, `waypoints`, `edges`, `blockedVolumes`, `propSockets`, and `cosmeticProcesses`. Its checksum and version enter diagnostic/build evidence, not state hashes. Invalid or incomplete binding fails the renderer into the semantic view; it never invents a destination.

### Forbidden flows

- PlayCanvas, Recast, animation callbacks, collision contacts, frame time and camera input cannot import or invoke the simulation transition API.
- No position, animation end callback or prop handoff can declare an authoritative action complete.
- No renderer-side obstacle may make a legal canonical action fail. A missing visual path is a presentation incident and semantic fallback, not a Reality rejection.
- No visual activity may be inferred from role prose alone. It must bind to an active canonical action or a clearly tagged cosmetic process that makes no consequential claim.
- Cosmetic smoke cannot imply active production; mill rotation cannot imply repair/operation unless gated by canonical mill state. River flow and vegetation motion may remain explicitly cosmetic.

## Projection and clock contracts

Create a pure package such as `packages/world-presentation` with no React, PlayCanvas, DOM, persistence, diagnostics or cognition imports. Its public output should be immutable:

```ts
interface SpatialProjection {
	readonly schemaVersion: "eonfolk-spatial-projection-v1";
	readonly sceneVersion: string;
	readonly source: {
		readonly runId: string;
		readonly revision: number;
		readonly throughSequence: number;
		readonly stateHash: string;
	};
	readonly actors: readonly SpatialActorProjection[];
	readonly objects: readonly SpatialObjectProjection[];
	readonly processes: readonly SpatialProcessProjection[];
	readonly semanticActions: readonly SemanticActionProjection[];
}
```

Each actor projection contains canonical `citizenId/actionId`, semantic origin/destination/target/result status, a route of authored node IDs, current `AnimationClass`, carried prop kind, and a human-readable equivalent. It must not contain a mutable PlayCanvas entity.

The projector operates at a specified display simulation time. Foreground progression uses fixed canonical `Advance` boundaries in the worker; browser scheduling only requests the next fixed advance and never supplies wall time as Reality input. The presentation loop uses an injected monotonic clock, a fixed `1/30 s` presentation step, a clamped accumulator and interpolation alpha. Automated tests supply exact ticks. Production may render at 60 FPS while navigation/animation state advances at 30 Hz. When the tab is hidden, stop foreground scheduling; absence progression remains the existing explicit catch-up contract.

Presentation may intentionally lag the latest committed head while playing an action, but it must expose both `availableThroughSequence` and `displayedThroughSequence`, advance in order, and never display beyond the committed ledger. The semantic DOM labels this brief “showing what just happened” state when material. Dropped frames may skip intermediate poses but may not skip the semantic completion or teleport an actor to an unrelated anchor.

## Navigation decision

### First implementation: authored waypoint and slot graph

Use deterministic A* over a small authored graph:

- coordinates are authored integer millimeters and converted to render floats only at the adapter;
- stable node/edge IDs, sorted neighbor order and stable tie-breaking make route selection reproducible;
- edges are prevalidated against simplified blocked polygons/capsules;
- entrances connect place-level topology to physical routes;
- work/rendezvous slots reserve distinct final positions and facings;
- two narrow lane offsets plus stable citizen-ID priority provide separation;
- a bounded local steering offset may prevent overlap but cannot change the chosen semantic destination;
- no path permits crossing a blocked volume, and no ordinary update may call a teleport operation.

This is enough for six places, eight citizens, a fixed environment and scripted semantic destinations. It also creates better automated evidence: path membership, maximum speed, continuous displacement, slot occupancy and blocked-volume intersection are direct assertions rather than engine observations.

### Recast/Detour evaluation

**VERIFIED FACT (WP-E-05):** recast-navigation-js is an ESM browser/Node WebAssembly port that supports runtime or offline navmesh generation, `NavMeshQuery`, crowd simulation, temporary obstacles, export/import, and a maintained `@recast-navigation/playcanvas` integration package. Its documentation recommends a solo navmesh for small environments and offline generation when the environment is largely static. [S-WP-006][S-WP-007]

**VERIFIED FACT (WP-E-06):** `Crowd` exposes agent radius, acceleration, speed, collision query range, separation weight and obstacle-avoidance configuration. `crowd.update(dt, elapsed, maxSubSteps)` performs fixed steps and writes `agent.interpolatedPosition`; variable stepping is documented as non-deterministic. [S-WP-007][S-WP-008]

**VERIFIED FACT (WP-E-07):** at inspected upstream commit `8769e8b9995f127033af9f6e6eeac3fad7d66201`, the PlayCanvas package supplies mesh extraction, navmesh/debug helpers and a debug `CrowdHelper`. It is not a React character/navigation controller. The helper currently reads raw `agent.position()` rather than `interpolatedPosition`, so production code would need its own adapter. [S-WP-009][S-WP-010]

**INFERENCE (WP-E-08):** those capabilities are useful but disproportionate for the first eight actors. WASM initialization, asset/navmesh generation, adapter ownership, bundle/load cost and a second moving-state implementation add failure surfaces without enabling a user requirement that the authored graph cannot meet.

If the reopen trigger fires, use Recast this way:

1. Generate one solo navmesh offline from simplified collision geometry; commit the reviewed binary/checksum and generator configuration. Do not generate it on startup.
2. Import only `@recast-navigation/core` plus the narrow PlayCanvas mesh utilities actually measured; do not render debug helpers in production.
3. Use `Crowd` as presentation-only navigation with a fixed `1/30 s` step, bounded substeps and `interpolatedPosition`; set radius, speed, collision query and separation explicitly.
4. Snap only initial spawn/recovery to a nearest polygon. An ordinary path failure falls back to semantic mode and records an incident; it does not teleport.
5. Repeat bundle, meaningful-world, desktop/laptop/mobile frame, path-continuity and deterministic-tick measurements. Adoption fails if any accepted performance budget is weakened rather than met.

`PathPlanner` should make this substitution local:

```ts
interface PathPlanner {
	plan(input: {
		readonly actorId: string;
		readonly fromAnchorId: string;
		readonly toAnchorId: string;
		readonly occupiedSlotIds: readonly string[];
	}): Readonly<{ status: "ok"; nodeIds: readonly string[] } | { status: "blocked" }>;
}
```

## Humanoid animation and props

**VERIFIED FACT (WP-E-09):** PlayCanvas React is an official thin React wrapper over the engine ECS with declarative `Application`, `Entity`, glTF loading, components and lifecycle hooks. Its `Anim` component accepts animation assets/state graphs and the engine supports animation state graphs, transitions, blending, parameters and layer masks. [S-WP-001][S-WP-002][S-WP-004]

Use one shared humanoid state graph driven only by `SpatialActorProjection`. Required public animation classes are:

| Class | Physical evidence | Allowed source |
|---|---|---|
| `idle` | breathing/weight shift | no active physical action |
| `walk` | route displacement and facing | movement phase of any action |
| `carry` | locomotion with attached resource/tool | canonical `carried` field |
| `gather` | arrive, face site, repeated work motion | active gather at work slot |
| `inspect` | arrive, lean/look/write | active inspect with target |
| `talk` / `listen` | paired facing, complementary gestures | same communication action ID |
| `exchange` | paired rendezvous and one visible prop handoff | same exchange action ID and typed resources |
| `repair` | tool motion at mill/object; object changes only at result | active repair + result event |
| `eat-rest` | food/rest pose at valid slot | consume/rest action |
| `react` | short bounded emotional response | typed relationship/counsel/result event |

Layer locomotion and upper-body actions where the reviewed assets support compatible rigs; otherwise use one state per class and short blends. Animation events may attach/detach a visual prop, but canonical ownership changes only at the result event. Logs, water container, food/grain container, tool and trade object are distinct low-poly props. Mara uses a persistent silhouette/outfit/colorway variant and recognizable hair/headwear; focal identity is not dependent on a billboard, glow or giant marker.

Environmental motion has an explicit source classification:

- `canonical-gated`: repaired/operating mill, task smoke, resource depletion/object change;
- `cosmetic`: river surface, restrained vegetation and ambient birds/particles;
- `forbidden`: any loop that makes inactive production, trade, repair, conversation or resource transfer appear to be happening.

Reduced motion keeps semantic task changes and necessary actor displacement, but removes camera fly-through, bobbing, decorative particles, parallax and exaggerated reactions. Walking can become a low-amplitude pose blend; the semantic DOM remains fully playable.

## Flight Recorder and mismatch instrumentation

Add a `presentation` diagnostic category rather than overloading generic `ui`. Extend the redaction allowlist only with closed, non-prose values such as `actionKind`, `animationClass`, `pathStatus`, `mismatchCode`, `projectionVersion`, `sceneVersion`, `sourceSequence`, `displayedSequence`, `distanceMm`, `speedMmPerSecond`, `clockTick`, `actorCount` and `interactionCount`. Citizen/action IDs should be hashed or represented by bounded stable ordinal in exported diagnostics; raw coordinates and per-frame samples are unnecessary.

Record transitions, not frames:

- `spatial-projection-accepted` with source head and counts;
- `action-presentation-started/completed` with action kind and source sequence;
- `animation-class-changed` with from/to class;
- `path-plan-failed`, `blocked-geometry-crossing`, `teleport-detected`, `action-animation-mismatch`, `target-binding-mismatch`, `prop-ownership-mismatch`, `displayed-ahead-of-reality` and `semantic-spatial-divergence`;
- p50/p95 update/render duration through the existing bounded performance summary.

`displayed-ahead-of-reality`, wrong actor/target/result, or a renderer attempt to dispatch Reality is critical: stop the renderer, preserve the durable world, freeze the bounded incident and show semantic mode. A cosmetic animation miss is warning/degraded. Diagnostics are observation only and cannot repair or mutate Reality.

## Automated temporal Living World contract

Add a deterministic test probe only in test/local-observer builds. It returns immutable, bounded samples: presentation tick, source/displayed sequence, actor stable ordinal, quantized position, route node, animation class, action kind, target kind, prop kind and mismatch codes. It exposes no mutation methods.

Blocking tests should cover:

1. **Projection purity:** same state/events/scene/time produces byte-identical projection; input remains frozen; PlayCanvas is absent from the package graph.
2. **Authority closure:** every non-idle consequential visual action binds to an active action or result event; actor, origin, destination, target, timing, carried prop and result match Reality.
3. **Temporal life:** during a fixed ten-presentation-second fixture, at least three citizens change quantized position, `walk` plus at least three meaningful non-idle classes execute, and at least one paired interaction shares one canonical action ID.
4. **Continuity:** successive ordinary positions stay under the configured speed/displacement limit, lie on a route corridor, never intersect blocked geometry, and never use teleport. The only teleport fixture is an explicit modeled exceptional transition with a disclosed semantic equivalent.
5. **Rendezvous:** exchange/talk participants reach distinct compatible slots, face one another, and no visual prop transfers before the projection's result boundary.
6. **Object truth:** mill/object state changes only when the exact result event enters `displayedThroughSequence`; resource props agree with the action and canonical ownership boundary.
7. **Lag discipline:** presentation never displays a sequence beyond the available committed head and catches up in exact order after dropped frames.
8. **Semantic parity:** DOM and 3D projections have identical citizen action, place, target, progress/result and interaction labels; renderer failure leaves all important actions operable in DOM.
9. **Clock control:** identical injected tick sequences produce identical quantized paths/classes; a long/clamped frame cannot tunnel through blocked geometry or skip a result.
10. **Diagnostics:** each injected mismatch produces one bounded, redacted event and correct severity; no mismatch diagnostic changes state, ledger, hash, persistence or cognition.
11. **Accessibility:** reduced-motion and semantic modes still communicate motion destination, task, interaction and result; keyboard focus/selection does not alter action progression.
12. **Performance:** run the existing desktop, laptop and mobile profiles with the embodied scene, eight default/twelve stress citizens, p95 frame budgets, payload budgets and meaningful-world deadline unchanged.

The qualitative World Presence Gate remains independent evidence: an unfamiliar observer must recognize a physical settlement, humanoid citizens, multiple ongoing activities and at least one meaningful interaction/process in ten seconds, then describe several tasks within thirty seconds without opening a dashboard. Automated counts cannot answer “does it feel inhabited and alive?”

## Proposed implementation seams and sequence

Keep ownership narrow and integrate in dependency order:

1. `packages/protocol/src/types.ts`, `packages/sim/src/state.ts`, `genesis.ts`, `scheduler.ts`, `reducer.ts`, `transition.ts`, invariants and protocol/simulation/property tests: canonical action-window lifecycle.
2. New `packages/world-presentation/`: scene schema/validator, pure projector, authored-graph planner, deterministic presentation clock model, animation mapping, mismatch detector and unit/property tests.
3. `apps/web/src/authoritative-runtime.ts` and `projection.ts`: remove slug coordinates; attach source head/events and spatial projection. Keep runtime the only composition seam.
4. `apps/web/src/components/RiverholdWorld.tsx`: replace Pixi with a PlayCanvas React scene, GLB humanoids/environment, adapter-local entity refs and animation parameters. Do not let React reconciliation own per-frame movement; update preallocated engine transforms from the clock adapter.
5. `SemanticWorld.tsx` and shell/CSS: preserve parity and make the world dominant with contextual DOM support.
6. `packages/diagnostics` and browser diagnostics: bounded spatial transition/mismatch instrumentation.
7. Playwright, property, performance and evidence scripts: temporal probe, profile runs, zero-egress/assets, reduced motion, semantic fallback and observer gate.

Do not add Recast in step 2. Implement the `PathPlanner` port and authored graph first. The renderer spike may build a disposable Recast adapter for measurement, but only its evidence—not spike code—should determine adoption.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Keep fixed percent coordinates and add tween loops | Cannot truthfully bind origins, destinations, targets, durations or results; preserves teleport disguised as easing |
| Put world-space coordinates and animation states in Reality | Makes asset layout, floats, frame behavior and renderer migration canonical; violates deterministic simulation boundary |
| Infer actions from role/current-behavior prose | Produces attractive but unsupported activity and cannot diagnose event mismatch |
| Let animation completion dispatch result commands | Frame rate/assets would control Reality and make headless replay impossible |
| Use PlayCanvas rigid-body physics for citizen locomotion | Unnecessary for eight authored actors; collision outcomes would be difficult to reproduce and test as presentation |
| Adopt Recast crowd immediately | Credible technology, but WASM/init/adapter/load cost is unearned for six places and eight fixed-route actors |
| Runtime Recast navmesh generation | Static settlement should use reviewed authored/offline data; startup work and device variance add no player value |
| Treat every ambient loop as harmless | Smoke, trade, work and mill motion can assert false consequential state |
| Canvas-only evidence | Excludes keyboard/semantic users and leaves renderer failure without an equivalent game |

## Risks and uncertainties

- **WP-R-01 — P1, UNRESOLVED:** the PlayCanvas React renderer and embodied GLBs may breach existing payload or mobile frame budgets. The bounded renderer spike decides; budgets do not silently weaken.
- **WP-R-02 — P1, PRODUCT HYPOTHESIS:** the action-window lifecycle is sufficient to make default play feel continuous without turning the simulation into a tick-everything loop. Test with the fixed ten-/thirty-second observer fixtures.
- **WP-R-03 — P1, INFERENCE:** action-window schema/version work is broader than cosmetic polish but required for honest physical projection. Scope stays bounded by the existing action union.
- **WP-R-04 — P1, UNRESOLVED:** reviewed humanoid/environment assets may have incompatible rigs, clips, sockets, licenses or payload. Preserve exact provenance and use one compatible cohort.
- **WP-R-05 — P2, UNRESOLVED:** authored lane/slot separation may look mechanical. Reopen Recast only after a visible collision/authoring failure or favorable measured adapter.
- **WP-R-06 — P1, UNRESOLVED:** background/foreground timing could accidentally reintroduce wall-clock authority. Only fixed typed `Advance` commands reach Reality; hidden tabs stop rather than infer time.
- **WP-R-07 — P1, PRODUCT HYPOTHESIS:** a world-dominant 3D scene plus contextual DOM will pass the unfamiliar-observer gate. A green build cannot substitute for the independent YES/NO review.
- **WP-R-08 — P2, VERIFIED FACT:** `@playcanvas/react` is currently a pre-1.0 package and has a smaller maturity surface than the engine. Pin the spike cohort, inspect releases/issues, and keep engine access behind one adapter. [S-WP-011]

## Constraint fit

The recommendation uses CPU/local browser execution on the owned M4 Pro, no training, model, server, deployment, account or paid service. It protects the approximately-$0/free-V1 posture. The waypoint graph, one settlement, eight actors, one shared humanoid rig/state graph and a handful of props minimize solo-authoring and runtime complexity. Recast and dynamic navigation are explicitly deferred unless evidence shows they reduce rather than add work. The action contract expands only existing Founder Alpha verbs; it does not add economy, governance, multiplayer or content scope.

The override does threaten the historical 40–60-hour slice estimate. **UNRESOLVED:** the coordinator must re-estimate the remaining release plan after the renderer and action-window spikes. If the estimate fails, remove decorative environment variety, camera polish and nonessential clip variants before removing embodied action truth, semantic parity, diagnostics or the World Presence Gate.

## Opened primary sources and proposed ledger rows

All sources were opened/read on **2026-08-21**. These are proposed `SOURCE_LEDGER.md` rows; only the coordinator should add or rename them.

| Proposed ID | Class | Claim supported | Direct URL | Confidence | Consumers |
|---|---:|---|---|---|---|
| S-WP-001 | A | PlayCanvas React is the official React/ECS wrapper and exposes asset loading, pointer events and engine hooks | [PlayCanvas React manual](https://developer.playcanvas.com/user-manual/react/) | High | Frontend, architecture, this research |
| S-WP-002 | A | The React API exposes Application, Entity, glTF, Anim, Camera, Collision, Render and lifecycle hooks | [PlayCanvas React API](https://developer.playcanvas.com/user-manual/react/api/) | High | Frontend, renderer implementation |
| S-WP-003 | A | PlayCanvas requires WebGL2; current browsers may additionally use WebGPU | [Supported browsers](https://developer.playcanvas.com/user-manual/engine/supported-browsers/) | High | Frontend, performance |
| S-WP-004 | A | PlayCanvas supports state-graph animation, blending and reusable humanoid animation organization | [Animation system](https://developer.playcanvas.com/user-manual/animation/) and [state graph assets](https://developer.playcanvas.com/user-manual/animation/anim-state-graph-assets/) | High | Animation implementation |
| S-WP-005 | A | Mobile guidance emphasizes low draw calls/material/shader count, bounded DPR, few dynamic lights/shadows and custom skinned AABBs | [Optimization guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/) | High | Performance, asset pipeline |
| S-WP-006 | A | recast-navigation-js supports runtime/offline navmesh generation, queries, crowds, import/export and a PlayCanvas package; offline generation is recommended for largely static worlds | [Upstream README](https://github.com/isaac-mason/recast-navigation-js) | High | Navigation decision |
| S-WP-007 | A | Recast `Crowd` exposes fixed-step/interpolated updates, agent movement, collision-query and separation parameters | [Core crowd source at inspected commit](https://github.com/isaac-mason/recast-navigation-js/blob/8769e8b9995f127033af9f6e6eeac3fad7d66201/packages/recast-navigation-core/src/crowd.ts) | High | Navigation adapter/tests |
| S-WP-008 | A | Variable crowd time stepping is non-deterministic; fixed stepping with interpolation writes `interpolatedPosition` | [Upstream crowd documentation](https://github.com/isaac-mason/recast-navigation-js#crowds-and-agents) | High | Clock/navigation decision |
| S-WP-009 | A | PlayCanvas integration extracts mesh geometry and provides navmesh/crowd debug helpers | [PlayCanvas integration package](https://github.com/isaac-mason/recast-navigation-js/tree/8769e8b9995f127033af9f6e6eeac3fad7d66201/packages/recast-navigation-playcanvas/src) | High | Renderer/navigation adapter |
| S-WP-010 | A | Current PlayCanvas `CrowdHelper` reads raw agent positions, so production interpolation needs a custom adapter | [Crowd helper source at inspected commit](https://github.com/isaac-mason/recast-navigation-js/blob/8769e8b9995f127033af9f6e6eeac3fad7d66201/packages/recast-navigation-playcanvas/src/helpers/crowd-helper.ts) | High | Navigation risk |
| S-WP-011 | A | The current official React package release line is `0.11.x`, requiring pinned-cohort spike validation | [Official PlayCanvas React releases](https://github.com/playcanvas/react/releases) | High | Dependency risk, renderer spike |

No source establishes EONFOLK-specific performance, visual quality or observer comprehension. Those remain measured product evidence, not an inference from engine features.
