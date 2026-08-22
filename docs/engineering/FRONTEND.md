# Frontend, renderer, and spatial presentation

**Purpose:** lock the Founder Alpha presentation stack, WorldPresentation/SpatialProjection contract, navigation choice, asset boundary, and semantic fallback.

**Status:** REOPENED — World-as-Product scale, camera, semantic zoom/LOD, and world-first UI are release-blocking

**Authority boundary:** this file owns renderer/UI libraries, the spatial presentation boundary, navigation policy, and runtime asset delivery. [ART_DIRECTIONS](../design/ART_DIRECTIONS.md) owns visual production rules; [DESIGN](../design/DESIGN.md) owns applied composition; [PERFORMANCE](../quality/PERFORMANCE.md) owns budgets.

**Related documents:** [spatial research](../research/WORLD_PRESENCE_SPATIAL_RESEARCH.md), [renderer spike](../research/WORLD_PRESENCE_RENDERER_SPIKE.md), [asset research](../research/WORLD_PRESENCE_ASSET_RESEARCH.md), [interaction](../design/INTERACTION.md), [mobile](../design/MOBILE.md), [visual QA](../quality/VISUAL_QA.md)

## Steering correction

The content-addressed World-as-Product override (`21ca7da6f308cbd01510409707760bc7f36fd9e3c08c0a7a681044601e49a863`) preserves PlayCanvas and the pure presentation boundary but invalidates the fixed-camera 24×25 m diorama and permanent decision rail as a release target. Founder Alpha now requires a coherent metre-scale region context, three semantic camera scales, LOD0–LOD3 residency, selection-first contextual surfaces, and Chronicle-to-space focus. Rendering residency remains non-authoritative.

## Owned decision

Use React Router/Vite for the shell, one lazy `@playcanvas/react`/PlayCanvas renderer with WebGL2 as the compatibility baseline, and parallel semantic DOM for every fact and consequential action [S-WP-001] [S-WP-002] [S-WP-003]. Do not add Three/R3F, a second production renderer, WebGPU-only behavior, Recast, or runtime model/asset loaders unless a recorded reopen trigger passes.

Pixi is a root development dependency only because frozen Gate 0 evidence still imports it. `apps/web` does not depend on or import Pixi.

## WorldPresentation / SpatialProjection boundary

Reality and presentation are separated by the pure `packages/world-presentation` package:

- Reality supplies immutable citizen identity/place/activity and `CanonicalActionRef` with source kind, action/event identity, status, semantic kind, origin, destination, target, simulation start/end, and result event.
- `CanonicalPresentationSource` binds every projection to run, region, revision, sequence, and state hash.
- `SpatialProjection` adds scene version, integer-millimetre positions, authored route nodes, facing, animation class, prop, semantic labels, interactions, and bounded counters.
- the renderer advances a clamped deterministic 30 Hz presentation clock, reprojects from immutable inputs, and applies interpolation/pose only to PlayCanvas entities.
- frame time, wall time, camera, pointer, quality, and PlayCanvas state never enter Reality or canonical hashes.

Committed events are factual results. Current-behavior actions are explicitly in progress and claim no result. A renderer crash or list-view switch cannot change world state.

## Spatial scene and navigation

Founder Alpha uses a versioned authored waypoint/interaction-slot graph for Market Green, Low Spring, Alder Woods, North Fields, River Mill, and Granary. Stable path selection and integer coordinates are deterministic. Tests sample every tick across a full cycle, reject blocked-volume entry, and cap ordinary displacement.

Recast/navigation-js was evaluated and deferred. Its navmesh/crowd path is capable, but adds a material WASM/loader payload plus a custom fixed-step interpolation adapter [S-WP-006] [S-WP-007] [S-WP-008] [S-WP-009] [S-WP-010]. Adopt it only if a required gate action cannot be represented by the authored graph after one bounded graph revision. It may never make navigation authoritative or allow ordinary teleport.

## Embodied action presentation

Every citizen has a head, torso, two arms, and two legs. The renderer-neutral state graph covers:

- idle, walk, and carry;
- gather, inspect, talk, listen, exchange, and repair;
- eat/rest and emotional reaction.

Toma and Iven begin at paired market slots, face one another, use talk/listen poses, and pass a visible trade prop so an unfamiliar observer sees an exchange immediately; a linked committed exchange uses the same pair with event provenance. Citizens carry visible water, grain, logs, trade goods, or tools where appropriate. Odo reaches the mill with a tool, and the mill's brace/blade presentation changes only when canonical `mill.repaired` is true. Mara is identifiable by teal clothing, rust scarf, and distinct headwear without a giant marker. River stripes are cosmetic motion and are labeled as such in instrumentation; they make no production or repair claim.

## Flight Recorder and contradiction checks

The renderer reports one bounded `presentation` diagnostic per source head and one per distinct mismatch, never per frame. Allowed fields include projection/scene versions, source sequence, actor/interaction counts, clock tick, mismatch code, action/display class, and integer distance. It records no coordinates, free text, hidden reasoning, URLs, or world mutation.

`inspectSpatialProjection` detects blocked-volume occupancy, invalid/missing event links, events beyond the source head, missing interaction participants, action/animation contradictions, and speed-impossible displacement. Browser probes expose only aggregate test attributes: tick, moving count, class set, interaction count, canonical-link count, teleport count, contradiction count, engine/device, pixel ratio, and cosmetic-process name.

## UI and semantic parity

The world occupies the larger desktop/laptop column and 55% of the initial mobile viewport. DOM UI is contextual support. The semantic view remains fully playable and names all eight citizens, resources, places, current action, action provenance/status, interaction/process, Mara facts, counsel, return confirmation, Chronicle, evidence, and replay controls.

The PlayCanvas chunk is dynamically imported after the critical shell. Failure switches to the remembered semantic view without a page error. A `ResizeObserver` keeps the canvas inside its host and caps rendered pixel ratio at 1.5. Reduced motion keeps deterministic spatial facts while slowing pose cadence and stopping cosmetic river motion.

## Runtime assets

Founder Alpha ships repository-authored procedural primitives and zero external production art bytes. This proved embodied presence without committing a conversion/rigging pipeline or violating the 4/6 MB limits. Generated concepts remain references only.

If procedural readability fails the independent gate, the only pre-reviewed escalation is a pruned, optimized KayKit CC0 subset with exact archive/license hashes and renewed traversal/script/external-URI checks [S-WP-015] [S-WP-016] [S-WP-017] [S-WP-018] [S-WP-021]. The measured unoptimized subset exceeds the runtime budget, so no archive may be copied wholesale.

## Rejected alternatives and remaining uncertainty

Rejected: sparse Pixi markers, mixed renderers, WebGPU-only execution, renderer-owned world logic, canvas-only actions, permanent dashboard, ordinary teleport, generalized Recast crowd work, unreviewed marketplace assets, and production generated images.

Unproven: physical mid-tier mobile thermals/battery, long-session GPU behavior, and unaided human recognition of several tasks. The independent reviewer must still answer YES to “Does Riverhold visibly feel inhabited and alive?”

## Reopen evidence and constraint fit

Reopen the renderer only for a blocking three-viewport payload/frame/display miss after the defined degradation pass, or a failed independent World Presence review after one bounded composition/readability correction. Reopen navigation only for a concrete gate route the authored graph cannot express. Reopen assets only for a documented recognition failure.

This path is local, account-free, model-free, training-free, and $0. One renderer, one pure projection package, authored paths, procedural art, and four net external packages remain proportionate for a solo builder and do not broaden Gate A/B mechanics.
