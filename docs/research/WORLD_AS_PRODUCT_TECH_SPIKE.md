# World-as-product technical delta

**Purpose:** audit the frozen Founder Alpha world implementation and define the
smallest credible technical delta that can satisfy the World-as-Product steering
override without weakening Reality, replay, accessibility, or the solo-builder
budget.

**Status:** DISPOSABLE SOURCE AUDIT AND IMPLEMENTATION RECOMMENDATION — no
production change was made; all findings bind to commit
`ceb58ee0703749375454db894645ecae1022ff82`.

**Authority boundary:** this report owns its frozen-source observations, risk
classification, and proposed implementation sequence. It does not change the
product, architecture, performance, protocol, navigation, or release decisions.
Those remain with the coordinator-owned authorities.

**Related documents:** [Frontend](../engineering/FRONTEND.md),
[Architecture](../engineering/ARCHITECTURE.md),
[Performance](../quality/PERFORMANCE.md),
[Diagnostics](../engineering/DIAGNOSTICS.md),
[spatial research](WORLD_PRESENCE_SPATIAL_RESEARCH.md),
[renderer spike](WORLD_PRESENCE_RENDERER_SPIKE.md), and the
[Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

## Recommendation

Keep PlayCanvas, the pure `world-presentation` boundary, the semantic fallback,
the deterministic 30 Hz presentation clock, and the existing Reality/event
architecture. Replace the small authored diorama and presentation-only citizen
routines with one versioned Riverhold spatial catalog plus canonical semantic
travel/activity state. Add a camera/view-state controller, chunk residency, four
fidelity classes, affordance reservations, and spatial Chronicle targets outside
Reality. Do not add a second renderer, physics engine, audio system, population
tier, generalized streaming framework, imported art cohort, or runtime Recast in
this correction.

The target is a bounded **180 m × 140 m contextual terrain**, with a roughly
**70 m × 55 m active settlement**, human-scale buildings, six current Places,
eight current citizens, and no new game mechanics. The larger world is an authored
composition and presentation hierarchy, not a claim of a larger simulated
population.

The decisive technical change is this:

```text
Reality: semantic place, task, reservation, travel start/arrival, carried inventory
                         |
                         v
immutable WorldPresentation / SpatialProjection
                         |
       +-----------------+------------------+
       v                 v                  v
path + choreography   camera/LOD       semantic DOM
       |                 |                  |
       +-----------------+------------------+
                         v
                 PlayCanvas entities
```

Camera position, loaded chunks, animation time, interpolation, LOD, pointer input,
and frame timing never feed back into Reality. A hidden or unloaded citizen keeps
exactly the same canonical task and outcome.

## Frozen audit method

The audit read the full steering override and inspected the exact files under
`packages/protocol`, `packages/sim`, `packages/world-presentation`, and
`apps/web/src` at the frozen SHA. It also inspected the current unit tests,
boundary checker, current package cohort, performance authority, and prior
PlayCanvas/navigation spikes. A source-only scale probe calculated primitive
extents from the authored transforms. No server, browser, dependency install,
generated asset, or production edit was used.

Current primary documentation was opened on 2026-08-21 for PlayCanvas camera
culling, asset loading/unloading, batching/instancing, React camera/input support,
and `recast-navigation-js`. Those sources support engine capability, not a claim
that the current application has implemented it.

## Release blockers at the frozen SHA

| ID | Severity | Finding | Why it blocks the override |
|---|---|---|---|
| WAPT-P0-001 | P0 | `projector.ts` invents cyclic walk/carry/gather/inspect/repair/talk/listen presentation from citizen slug profiles when the supplied canonical action is idle. | Consequential-looking work and resource carrying can occur without a matching semantic task. This violates “what you see should correspond to what the world is doing.” |
| WAPT-P0-002 | P0 | Reality commits `CitizenMoved` atomically and stores only the destination `placeId`; presentation then restarts a route from the old event. | Arrival is already authoritative while the actor is shown travelling. There is no canonical in-transit state, expected arrival, or carried-resource contract. |
| WAPT-P1-001 | P1 | Source dimensions produce an approximately **2.59 m** Mara rig, approximately **1.99 m** house ridge, and **1.14 m** door. | Humans are visibly larger than houses and doors are not human scale. |
| WAPT-P1-002 | P1 | The terrain primitive is only **24 m × 25 m**, route content spans roughly 20 m × 19.6 m, and the camera is fixed at `[14,14,18]`. | This is a board/diorama, exposes finite edges under camera expansion, and cannot provide overview/town/follow scales. |
| WAPT-P1-003 | P1 | There is no World → Region → Chunk → Place residency hierarchy, LOD policy, semantic zoom, pan/orbit/follow controller, click picking, or return-to-overview action. | Required world navigation and scalable rendering are absent. |
| WAPT-P1-004 | P1 | Node names imply work/exchange positions, but node type has no affordance kind, capacity, orientation, occupancy, queue, radius, or compatible action. | Interaction choreography cannot reserve valid physical space or distinguish legitimate waiting from stuck navigation. |
| WAPT-P1-005 | P1 | Only two blocked boxes exist; there is no swept actor clearance, actor/actor overlap check, ground-contact check, slot collision, or stuck-progress diagnostic. | The existing point-at-tick test cannot establish serious navigation/collision behavior. |
| WAPT-P1-006 | P1 | Chronicle beats have evidence but no spatial focus target and the Chronicle is rendered below the world as a detached report. | A beat cannot focus its citizen, place, prop, or affected process. |
| WAPT-P1-007 | P1 | Canvas is correctly `aria-hidden`, but its illustrated world has no citizen/place selection, camera controls, or follow mode; only a separate post-world semantic list opens citizen detail. | Current DOM parity covers the old static world, not the new world actions. |
| WAPT-P1-008 | P1 | The desktop layout permanently allocates at least 370 px to the decision rail and the default world is one fixed shot. | Normal play still reads as world plus website/dashboard, not world-first contextual UI. |

These findings do not invalidate the reducer, event hashes, epistemic separation,
cognition boundary, persistence, Chronicle causality, diagnostics privacy, or
existing semantic fallback. They identify presentation and the minimum Reality
semantics needed to present it truthfully.

## Scale audit and bounded terrain target

### Current source extents

PlayCanvas primitives use metre-like scene coordinates, and the spatial package
converts integer millimetres to engine units by dividing by 1,000. That convention
is sound. The authored values are not.

| Element | Frozen source result | Correction target |
|---|---:|---:|
| Humanoid, including Mara headwear | about 2.59 m | 1.68–1.84 m; Mara about 1.74 m |
| Narrow house footprint | about 2.45 m × 2.40 m | 6–8 m × 5–7 m |
| House ridge | about 1.99 m | 5–7 m |
| Door | about 0.55 m × 1.14 m | at least 0.9 m × 2.0 m |
| Current terrain | 24 m × 25 m | 180 m × 140 m contextual terrain |
| Active settlement | effectively the terrain | about 70 m × 55 m |
| Main walking path | about 4.2 m wide | 2.5–4 m by purpose |
| Trees | about 2.7 m tall at scale 1 | 5–12 m by species/age |

The correction should preserve `1 engine unit = 1 metre` and integer millimetres
at the pure projection boundary. It should rebuild transforms from a small scale
token table rather than hand-scale every JSX primitive. A source test must reject
humanoid, door, building, road, tree, slot-clearance, and terrain values outside
the accepted bands.

### Terrain composition

Use five presentation chunks across and four down, each 40 m square, with the
active Riverhold Places occupying the central three-by-two area. The outer ring is
context, not fake population: river continuation, alder forest, fields, unused
land, hills, and two authored road exits. Conceal finite boundaries with:

- an opaque forest and hill belt on the north/east;
- river bends plus banks/cliffs on the west/south-west;
- distance haze and a terrain skirt below the horizon;
- camera constraints that keep the frustum footprint inside the contextual ring.

No camera angle may expose a rectangular terrain edge, clear color below the
terrain plane, or empty void. A deterministic camera-boundary test should sample
all four overview corners and the three required viewports.

## Spatial hierarchy and contract delta

### Presentation catalog

Add a versioned renderer-neutral catalog in `packages/world-presentation`:

```ts
interface WorldSpatialDefinition {
  worldId: string;
  regionIds: readonly string[];
}

interface RegionSpatialDefinition {
  regionId: string;
  boundsMm: BoundsMm;
  chunkIds: readonly string[];
  placeIds: readonly string[];
}

interface SpatialChunkDefinition {
  chunkId: string;
  regionId: string;
  boundsMm: BoundsMm;
  placeIds: readonly string[];
  neighborChunkIds: readonly string[];
  contextKind: "active" | "boundary-context";
}

interface PlaceSpatialDefinition {
  placeId: string;
  chunkId: string;
  footprintMm: readonly WorldPositionMm[];
  entranceIds: readonly string[];
  affordanceIds: readonly string[];
}

interface AffordancePointDefinition {
  affordanceId: string;
  placeId: string;
  kind:
    | "entrance" | "interaction" | "work" | "storage"
    | "rendezvous" | "resource" | "queue" | "rest";
  positionMm: WorldPositionMm;
  facingDegrees: number;
  capacity: 1 | 2;
  queuePointIds: readonly string[];
  compatibleActivities: readonly ActivityKind[];
}
```

`World`, `Region`, `Chunk`, and authored geometry belong to presentation. Stable
`placeId`, `affordanceId`, `routeId`, compatible task kinds, and capacity are
shared semantic IDs. Reality does not import PlayCanvas or ask which chunk is
loaded. Cross-package tests require a one-to-one mapping for every authoritative
Place, route endpoint, task affordance, and resource site.

For Founder Alpha, define only the current six Places:

| Place | Minimum affordances |
|---|---|
| Market | two entrances; two trader slots; two customer slots; exchange pair; ledger inspection point; three conversation pairs; two waiting points |
| Mill | entrance; material drop; repair point; work point; input/output storage |
| Spring/well | approach; draw-water point; two waiting points |
| Woods | entrance; two resource work points; carry pickup point |
| Fields | entrance; two work points; grain pickup point |
| Granary/home-civic cluster | entrance; desk/ledger point; storage point; rest point; two conversation points |

No interiors, arbitrary prop placement editor, procedural town generator, or
cross-region route system is included.

### Canonical semantic location

Replace destination-already-committed presentation with two semantic boundaries.
The names are proposals; protocol authority may choose equivalents.

```ts
interface CarriedResourceRef {
  resource: ResourceKind;
  quantity: number;
  inventoryOwnerId: CitizenId;
  sourceEventId: EventId;
}

interface TravelState {
  travelId: string;
  originPlaceId: string;
  originAffordanceId: string;
  destinationPlaceId: string;
  destinationAffordanceId: string;
  routeId: string;
  departureSimulationTime: number;
  expectedArrivalSimulationTime: number;
  taskId: string;
  carried: readonly CarriedResourceRef[];
}

type CitizenLocation =
  | { kind: "at-place"; placeId: string; affordanceId: string | null }
  | { kind: "travelling"; travel: TravelState };
```

Emit `TravelStarted` and `TravelArrived` (or equivalent typed payloads).
`TravelStarted` validates origin, route, destination, expected duration, and that
each carried reference is backed by existing inventory; it transfers no resource.
`TravelArrived` validates the same `travelId`, time boundary, destination, and
reservation before replacing the location. No footstep, animation-frame, camera,
or interpolated position enters Reality.

Keep decoding historical `CitizenMoved` events and migrate v1 state to
`at-place`; stop emitting `CitizenMoved` in the new schema. A clean-history test
and a v1 snapshot/event migration test are required. Deleting old event support
to simplify the change is rejected.

### Canonical activity and occupancy

Add one bounded active-task record per citizen and one shared reservation table:

```ts
interface SemanticActivityState {
  taskId: string;
  kind: "gather" | "inspect" | "exchange" | "repair" | "consume" | "rest" | "talk";
  placeId: string;
  affordanceId: string;
  targetId: string | null;
  participantIds: readonly CitizenId[];
  startedSimulationTime: number;
  expectedCompletionSimulationTime: number;
  status: "approaching" | "waiting" | "active";
}

interface AffordanceReservation {
  reservationId: string;
  affordanceId: string;
  taskId: string;
  occupantIds: readonly CitizenId[];
  startsAt: number;
  expiresAt: number;
}
```

Reservations are semantic scheduling facts, not collision physics. Validation
enforces capacity and deterministic queue order `(requestedAt, citizenId,
taskId)`. A citizen at a queue affordance is visibly waiting and cannot be flagged
as stuck. Presentation may apply sub-20 cm cosmetic separation, but it may not
select a different slot or determine who acts first.

Result events (`ResourceGathered`, `ExchangeCompleted`, `MillRepaired`, and
`ResourceConsumed`) must name or causally link the active task. Resource quantity
changes only in existing result reducers. A carried prop is shown only when a
`CarriedResourceRef` is still backed by canonical inventory. This prevents a
second visual/canonical resource ledger.

## Presentation time and physical choreography

The application may use monotonic time to request deterministic advancement, but
wall time remains outside the reducer. An in-progress `TravelState` or activity
can be interpolated between its canonical start and expected boundary. Reaching
the visual destination early enters a waiting pose; it does not claim arrival.
Application then submits a bounded `Advance` at the semantic boundary, Reality
validates and commits arrivals/results, and the projection reconciles from the new
state. Tab hiding, pause, renderer failure, or chunk unload cannot skip the same
boundary.

Seed or schedule legitimate current activities for all eight citizens. Remove the
slug-based `routines` table as an action source. Visual state is derived only from
`CitizenLocation`, `SemanticActivityState`, reservation state, canonical inventory,
and committed result events.

Minimum phase graphs:

```text
GATHER
travel -> queue/approach -> work -> ResourceGathered -> pickup -> carry/deposit

EXCHANGE
independent travel -> paired reservations -> face/greet -> transfer cue
-> ExchangeCompleted -> reactions -> release slots

INSPECT
travel -> ledger reservation -> inspect -> recorded observation/message
-> reaction -> release

REPAIR
travel with canonical wood/tool ref -> repair reservation -> repair animation
-> MillRepaired -> visible wheel/brace change -> release
```

The transfer cue crosses hands only inside the exchange active window. A repair
animation cannot play unless the active task is repair at the mill repair point.
The repaired wheel cannot start until `MillRepaired` is committed. Talk/utterance
UI appears only for an authorized recorded message/claim; atmospheric gestures
remain visually distinct and carry no speech bubble.

The existing procedural humanoids are acceptable for this correction if resized,
grounded, given per-citizen silhouette tokens, and driven by phase-aware pose
blending. Do not add a GLB/rigging pipeline before the truth, scale, camera, and
choreography gates pass.

## Navigation decision and strict Recast trigger

### Decision for this correction

Retain a versioned authored route/corridor graph. Expand it from place-default
nodes to entrances, lanes, queue points, and affordances; interpolate along the
entire polyline, not a direct endpoint chord. Give every edge width, clearance,
allowed travel modes, and stable length in millimetres. Use a deterministic A*
or Dijkstra tie-break, reserve narrow segments where necessary, and use authored
paired lanes on busy market paths.

This is proportionate for six Places and eight citizens, preserves reproducible
route identity/duration, adds no initial-route dependency, and makes failures easy
to diagnose. It is not a general claim that waypoint graphs scale to later worlds.

### Recast evaluation

The current `recast-navigation-js` project supports runtime and offline navmesh
generation, Detour path queries, crowd simulation, a PlayCanvas helper, and fixed
step crowd updates with interpolation. Its own documentation recommends an
offline/custom path when environments are static or bundle size is important.
The prior repository spike measured approximately **130,775 B gzip WASM** plus
**60,047 B gzip loader** before integration. The frozen production route has only
**33,446 B gzip** headroom under the 650 KiB limit. Runtime Recast therefore cannot
enter the initial path without displacing the world or breaking the budget.

Recast is reopened only if **one** of these measurable triggers occurs after the
single authored-graph implementation pass:

1. exhaustive valid-affordance-pair tests cannot find blocker-clear routes at a
   0.35 m actor radius without exceeding 64 nodes and 160 directed edges;
2. the eight-citizen canonical ten-/thirty-second fixture or twelve-citizen stress
   fixture produces an unresolved route deadlock, blocker crossing, or routine
   overlap after deterministic slot/edge reservations are implemented;
3. a required Place introduces non-planar/multi-level walkable surfaces or a
   dynamic obstacle whose valid route cannot be encoded without changing Reality
   task semantics; or
4. maintaining an authored route after one documented terrain revision causes a
   released route ID to change incompatibly or the all-pairs fixture to fail.

If triggered, first spike **offline-generated** navmesh plus a lazy query adapter.
Do not use runtime generation or a variable-timestep crowd. Canonical Reality
still owns route ID, duration, start, expected arrival, and result boundaries;
Detour supplies a presentation path and local avoidance only. A path mismatch
stops the projection and records evidence rather than changing the destination or
arrival. The spike must fit the unchanged payload/display/frame budgets before
adoption.

## Multiscale camera and semantic zoom

Add a pure application `WorldViewState`, independent of `WorldState`:

```ts
type SemanticScale = "region" | "town" | "citizen";
type CameraIntent =
  | { kind: "pan"; screenDelta: readonly [number, number] }
  | { kind: "zoom"; delta: number; anchor: readonly [number, number] }
  | { kind: "orbit"; delta: readonly [number, number] }
  | { kind: "focus"; targetId: string }
  | { kind: "follow"; citizenId: string }
  | { kind: "overview" };
```

Use one damped perspective camera with a constrained pitch. Pointer wheel/pinch,
drag/pan, bounded orbit, click selection, Follow Mara, and Return to overview are
presentation intents. Keyboard provides zoom in/out, pan, focus selected, follow,
and overview. Camera transitions stop immediately under reduced motion and land
at the same destination.

Use view-span thresholds with hysteresis rather than scaling the same scene:

| Scale | Approximate visible span | Presentation behavior |
|---|---:|---|
| Region | >90 m | terrain/river/roads/landmarks; LOD2 citizens remain locatable; major process and selected-person cues only |
| Town | 25–100 m | primary play; LOD1 citizens/buildings; routes, carried props, work, exchange, repair, and selective activity labels |
| Citizen | <30 m or follow | selected citizen LOD0; full pose/prop/facing; partner and immediate Place detail; compact contextual card |

The overlaps are deliberate hysteresis bands. Selection and follow pin the target
chunk and the target to LOD0/1 as appropriate. A lost/dead target exits follow with
a human explanation and returns to the town view; it never leaves the camera
tracking a stale renderer entity.

PlayCanvas React already exposes orbit controls and pointer events, and the engine
exposes camera transforms/frustum. Use those primitives behind an EONFOLK-owned
controller; do not let a generic orbit-control default expose the board edge or
make mobile gestures fight the page.

## Residency, LOD, culling, and loading

Add a pure `deriveWorldResidency(catalog, viewState, selectedIds,
hardwareProfile)` function. Its result is disposable presentation state:

```ts
interface WorldResidencyProjection {
  residentChunkIds: readonly string[];
  visibleChunkIds: readonly string[];
  entityFidelity: Readonly<Record<string, "LOD0" | "LOD1" | "LOD2" | "LOD3">>;
  pinnedEntityIds: readonly string[];
}
```

Minimum policy:

- **LOD0:** selected/followed citizen and close landmark; full limbs, prop,
  reaction, shadow, and contextual highlight.
- **LOD1:** nearby town citizens/buildings; normal articulated pose, prop, facing,
  and selective shadows.
- **LOD2:** distant settlement; simplified human silhouette and building mesh,
  reduced pose cadence, no small props/shadows, but current activity remains
  semantically available.
- **LOD3:** far terrain/context; terrain, tree/hill/river masses and landmark
  silhouettes only. No fake citizen activity.

Keep the camera chunk plus one-chunk margin resident; pin selected/followed and
Chronicle-target chunks. Delay unload briefly to prevent boundary thrash. For the
current procedural cohort, residency mounts/disables chunk roots and LOD roots;
there are no asset downloads. If GLBs arrive later, a renderer-local ref-counted
asset adapter may call PlayCanvas AssetRegistry load/unload. Asset state never
becomes a world fact.

PlayCanvas frustum culling is enabled by default and can be inspected after cull.
Use chunk-sized static batch groups so culling remains useful. Hardware instancing
is appropriate for trees/field props only when grouped by chunk and LOD: the
engine documentation warns that a hardware-instanced cohort is submitted as a
whole rather than culling each instance. Do not place the entire 180 m forest in
one instance buffer or one giant batch.

## Diagnostics and temporal tests

Extend the pure inspector and bounded Flight Recorder; never emit per-frame
coordinates or feed diagnostics back into Reality.

New closed mismatch codes:

- `unknown-affordance`, `route-missing`, `route-blocked`, and
  `route-duration-mismatch`;
- `slot-double-booked`, `actor-overlap`, and `feet-off-ground`;
- `stuck-progress`, `late-arrival`, and `routine-teleport`;
- `carried-resource-unbacked`, `task-animation-contradiction`, and
  `prop-phase-contradiction`;
- `lod-semantic-loss` and `chronicle-focus-missing`.

For a travelling actor, retain only bounded diagnostic state: citizen/action/route
IDs, destination affordance, route segment index, integer remaining distance,
animation class, interaction target ID, prop kind, reservation status, and last
progress tick. Define stuck as no forward progress of at least 50 mm for 60
presentation ticks while more than 750 mm remains and the canonical state is not
`waiting`. Queue wait, paused/reduced-motion camera, chunk unload, and committed
arrival are explicit exclusions.

Required deterministic tests:

1. scale-token and all-affordance catalog validation;
2. all reachable affordance pairs return stable, blocker-clear routes;
3. swept 0.35 m actor capsule never crosses building/prop blockers;
4. eight-citizen 30-second fixture has no overlap, deadlock, teleport, unbacked
   prop, or task/animation contradiction;
5. at least three citizens traverse meaningful distance, at least four legitimate
   action classes occur, and one canonical interaction completes in ten seconds;
6. exchange/repair/gather phase order cannot skip, repeat a result, or mutate a
   resource before the canonical completion event;
7. pause, tab-resume, reduced motion, projection reset, reload, and chunk
   unload/reload reconcile to the same canonical task and route;
8. v1 `CitizenMoved` history migrates/replays; new travel start/arrival replay has
   identical final hashes;
9. camera boundary sampling at all semantic scales never exposes a terrain edge;
10. LOD changes and chunk unload produce zero command/event/hash differences;
11. a Chronicle beat focuses the same typed participants/place/target in canvas
    and DOM; and
12. twelve-citizen measurement-only stress remains within frame and collision
    gates without becoming production population.

Browser tests must exercise pointer and keyboard zoom/pan/focus/follow/overview at
1728×1117, 1366×768, and 390×844. They must inspect fresh temporal behavior, not
approve static screenshots.

## Chronicle-to-world focus and semantic DOM parity

Extend `ChronicleBeatProjection` with an application-derived spatial target:

```ts
interface ChronicleSpatialFocus {
  placeId: string;
  participantIds: readonly string[];
  targetIds: readonly string[];
  sourceEventIds: readonly string[];
}
```

Derive it from the beat's already-authorized evidence events through one typed
event-to-space mapper. A beat button gets a second action, “Show in Riverhold,”
which opens/focuses the world, pins the relevant chunk, highlights participants
and target, and announces the human explanation. It is a presentation intent,
not `WorldCommand`. Evidence remains a deliberate deeper action.

The semantic DOM must expose every new important world action:

- town overview and current semantic scale;
- citizen/place selection with current activity, destination, concern, and
  participant/target where visible;
- Follow Mara and Return to overview;
- zoom in/out and directional pan controls;
- route/activity status and carried resource in words;
- the same Chronicle spatial focus and highlight summary; and
- list/map fallback that remains fully playable when WebGL or a chunk asset fails.

Canvas pointer selection and DOM selection update the same `WorldViewState`.
Canvas remains `aria-hidden`; it is never the only control or fact source. On
mobile, onboarding collapses after Follow Mara and decision/context surfaces use
bottom sheets over a world that retains primary visual area. On desktop, the
permanent rail becomes an onboarding/context drawer after the first action.

## File and package plan

No new runtime package is recommended.

| Owner | Concrete delta |
|---|---|
| `packages/protocol/src/types.ts` or new `spatial.ts` | Versioned `CitizenLocation`, `TravelState`, carried-resource reference, activity/reservation types, and typed travel/activity events. |
| `packages/sim/src/state.ts` | Store semantic location, one active task, and reservations; no frame positions. |
| `packages/sim/src/genesis.ts` | Human-scale semantic Place/affordance IDs and legitimate initial tasks for eight citizens. |
| `packages/sim/src/scheduler.ts` | Deterministic travel/task boundary scheduling and queue order. |
| `packages/sim/src/transition.ts` / `reducer.ts` | Validate start/arrival/activity/result boundaries and inventory-backed carrying; retain v1 decode/migration. |
| `packages/sim/src/invariants.ts` | Location exclusivity, reservation capacity, carried-inventory, route/time, participant, and task/result invariants. |
| `packages/world-presentation/src/types.ts` | World/region/chunk/place/affordance catalog, action phases, residency/LOD, and focus types. |
| `packages/world-presentation/src/scene.ts` | Replace the 24×25 m scene with versioned 180×140 m catalog, scale tokens, paths, blockers, affordances, and chunks. |
| `packages/world-presentation/src/planner.ts` | Stable corridor-aware all-pairs pathing and route metadata; authored graph remains default. |
| `packages/world-presentation/src/projector.ts` | Remove slug routines; derive paths, phases, facing, props, interactions, and world changes from semantic state/events only. |
| `packages/world-presentation/src/inspection.ts` | Swept blockers, occupancy/overlap/stuck/ground/prop/LOD/focus mismatch checks. |
| new `packages/world-presentation/src/residency.ts` | Pure chunk/LOD derivation from camera-independent view inputs. |
| `apps/web/src/authoritative-runtime.ts` | Project semantic location/activity/reservations and typed Chronicle focus; no renderer import. |
| new `apps/web/src/world-view.ts` | Application-only camera/selection/follow/semantic-scale reducer. |
| split `apps/web/src/components/RiverholdWorld.tsx` | `WorldCamera`, `WorldChunks`, `CitizenActors`, `ActionChoreography`, `WorldSelection`, and `WorldProbe`; keep renderer-only code here. |
| `RiverholdApp.tsx`, `Chronicle.tsx`, `SemanticWorld.tsx`, `styles.css` | Context drawer/bottom sheet, shared selection/follow/overview, Chronicle spatial action, and full keyboard/list parity. |
| `tests/unit/world-presentation` and sim/protocol tests | Catalog, route, temporal, migration, invariant, LOD-independence, and mismatch injection coverage. |
| `tests/e2e` and `scripts/benchmark-web.mjs` | Temporal camera/selection/follow/Chronicle journey, world-edge oracle, fresh performance and no-egress evidence. |

Splitting the 865-line renderer component is a maintainability correction, not a
new framework. Keep pure calculations out of TSX and PlayCanvas imports out of
`world-presentation`.

## Bounded implementation sequence

This is an incremental estimate from the frozen implementation, not permission to
weaken acceptance criteria or evidence that prior total work fits 60 hours.

| Milestone | Focused hours | Stop condition |
|---|---:|---|
| 1. Truthful semantic motion | 6 | No slug routine can generate a consequential animation; travel/activity/reservation replay and migration tests pass. |
| 2. Scale/catalog/terrain | 5 | Scale audit, affordance catalog, all-pairs paths, blocker clearance, and no-edge source/browser probes pass. |
| 3. Camera/selection/world-first shell | 5 | Three semantic scales, pointer/keyboard controls, Follow Mara, overview, and contextual desktop/mobile UI pass. |
| 4. Choreography and diagnostics | 7 | Gather/exchange/inspect/repair fixtures show correct phases/props/results with zero stuck/collision/contradiction findings. |
| 5. LOD/residency/Chronicle parity | 3 | LOD0–3, chunk pin/unload, Chronicle focus, and DOM parity tests pass without Reality diffs. |
| 6. Full browser/performance/review fix loop | 6 | Three viewports, unchanged budgets, fresh temporal evidence, and independent World Presence YES pass. |
| **Bounded delta** | **32** | Remove deferred polish before exceeding the bound; never fake the missing behavior. |

The 32-hour correction is plausible only because renderer, protocol, simulation,
persistence, tests, and eight citizens already exist. The coordinator should mark
the 40–60-hour product constraint **UNRESOLVED** until actual prior plus remaining
focused hours are reconciled. It must not call the scope compliant merely because
this delta fits 32 hours.

## Performance and payload impact

The clean integrated checkpoint reports **95,581 B gzip** critical shell,
**632,154 B gzip** initial-route JavaScript, **512,155 B gzip** lazy world chunk,
and zero world-asset bytes. Only **33,446 B gzip** remains below the 650 KiB route
gate. Therefore:

- added camera/catalog/residency/choreography code targets **≤20 KiB gzip**, leaving
  at least about 13 KiB measurement margin;
- no Recast, physics, audio, imported animation, state-machine, or asset-loader
  dependency enters the route;
- retain the ≤200 KiB critical shell, ≤650 KiB total JS, ≤3/5 s meaningful world,
  ≤16.7/33.3 ms p95 frame, and 4/6 MB asset gates unchanged;
- initial external world assets remain zero; procedural terrain/LOD is the first
  proof;
- one shadow-casting directional light only; LOD2/3 citizens/context cast no
  dynamic shadows;
- provisional visible draw-call ceilings are 160 desktop/laptop and 100 mobile,
  with no more than 16 material variants; measure and tighten rather than treating
  them as a waiver;
- static batching is chunk-bounded; instancing is chunk/LOD-bounded so one far
  cohort cannot defeat frustum culling; and
- performance evidence records semantic scale, resident chunks, visible LOD
  counts, draw calls, triangles, pixel ratio, and selected/followed state.

If the route exceeds 650 KiB, first simplify camera utilities, collapse duplicated
catalog data at build time, and remove optional polish. If frame time misses, first
reduce shadows, LOD distances, tree/field density, pixel ratio, and cosmetic pose
cadence. Do not remove canonical citizens, task truth, semantic parity, or camera
actions.

## Scope cuts and rejected alternatives

Cut from this correction:

- audio, day/night, weather, doors/interiors, animals, and ambient population;
- generalized world streaming, multiple regions, cross-region travel, terrain
  editor, procedural generation, and dynamic construction;
- runtime/offline Recast integration unless the strict trigger fires;
- physics/rigid bodies and full collision response;
- GLB character/animation conversion and downloaded production assets;
- more citizens, additional resources, generalized economy, new institutions, or
  new narrative branches;
- arbitrary Research Lens overlays; preserve existing evidence access and add only
  the Chronicle spatial link required by the override.

Rejected approaches:

| Alternative | Objection |
|---|---|
| Stretch the existing 24 m board and widen the camera | Scale relationships, edge concealment, route semantics, and interaction space remain wrong. |
| Keep slug routines but relabel them “ambient” | Gather, repair, exchange, and carrying communicate consequential claims and cannot be made harmless by copy. |
| Put continuous positions/footsteps in events | Event volume and renderer timing contaminate Reality without adding product truth. |
| Let Recast/crowd own arrival | Presentation timing would determine canonical location/outcome and threaten replay. |
| Add Recast now | Prior measured payload is several times the available route headroom; the six-Place graph has not failed its bounded pass. |
| One giant instanced forest | PlayCanvas submits the whole instance cohort without per-tree frustum culling; chunk groups are needed. |
| Renderer-owned slot choice/local avoidance | Camera/residency/frame order could alter who acts; Reality must allocate semantic slots. |
| Imported animated characters first | Adds asset, rig, license, payload, and performance risk before truth/scale/camera are fixed. |
| Static screenshots as acceptance | They cannot prove travel, interaction sequencing, stuck recovery, or camera/LOD continuity. |

## Objections, uncertainties, and reopen evidence

- **UNRESOLVED:** a semantic travel/activity scheduler that feels continuous while
  retaining the explicit checkpoint/advance product contract. Prototype the
  monotonic application driver and tab-resume behavior before broad choreography.
- **UNRESOLVED:** actual total implementation hours already spent. The repository
  has no source of truth for focused hours, so total 40–60-hour fit cannot be
  verified by this audit.
- **UNRESOLVED:** 180×140 m is large enough to remove the board impression without
  making eight citizens feel sparse. Reopen dimensions/density after the fresh
  ten-/thirty-second observer, not from a static beauty shot.
- **UNRESOLVED:** procedural rigs at correct scale remain recognizable in region
  and mobile views. Reopen only the already-reviewed asset escalation after one
  composition/silhouette correction fails.
- **UNRESOLVED:** the PlayCanvas route remains below 650 KiB after camera/input and
  choreography. No budget waiver is implied.
- **UNRESOLVED:** authored reservations handle all eight citizens without visibly
  robotic queues. The 30-second fixture plus human review decides.
- **OBJECTION:** the current explicit `Advance` model and a continuously living
  world are in tension. Presentation-only looping is not an acceptable shortcut;
  the authority docs must decide how application monotonic time requests semantic
  boundaries while preserving user-confirmed catch-up.
- **OBJECTION:** requiring runtime asset unloading when the current world has zero
  external assets would create empty abstraction. Chunk root residency and LOD are
  the real Founder Alpha proof; implement AssetRegistry ref-counting only when an
  actual asset exists.

Reopen PlayCanvas only after one bounded implementation/degradation pass still
fails payload, frame, accessibility, or independent World Presence gates. Reopen
the world size if camera edge tests or human density recognition fail. Reopen the
canonical travel design if replay/migration or resource conservation cannot pass;
never paper over it in presentation.

## Proposed source-ledger rows

Only the coordinator may add these rows to the shared ledger.

| Proposed ID | Label / class / confidence | Claim | Direct source | Accessed | Consuming documents |
|---|---|---|---|---|---|
| S-WAPT-001 | VERIFIED FACT / A / high | PlayCanvas camera frustum culling is enabled by default and its frustum is queryable for custom visibility logic. | https://developer.playcanvas.com/user-manual/graphics/cameras/projection/ | 2026-08-21 | Frontend, Performance, ExecPlan |
| S-WAPT-002 | VERIFIED FACT / A / high | PlayCanvas supports runtime asset load and unload through its AssetRegistry lifecycle. | https://developer.playcanvas.com/user-manual/assets/loading-unloading/ | 2026-08-21 | Frontend, ExecPlan |
| S-WAPT-003 | VERIFIED FACT / A / high | PlayCanvas hardware instancing reduces draw calls but does not frustum-cull individual instances; chunk-bounded cohorts are required. | https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/ | 2026-08-21 | Frontend, Performance |
| S-WAPT-004 | VERIFIED FACT / A / high | PlayCanvas batching trades draw calls against culling granularity through maximum batch AABB size. | https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/batching/ | 2026-08-21 | Frontend, Performance |
| S-WAPT-005 | VERIFIED FACT / A / high | PlayCanvas React exposes orbit controls, pointer events, asset Suspense, and full engine access sufficient for an owned camera/selection controller. | https://developer.playcanvas.com/user-manual/react/ | 2026-08-21 | Frontend, Interaction |
| S-WAPT-006 | VERIFIED FACT / B / high | `recast-navigation-js` supports runtime/offline navmesh generation, path queries, crowd simulation, fixed-step interpolation, and a PlayCanvas helper; its own documentation presents offline/custom output when bundle size matters. | https://github.com/isaac-mason/recast-navigation-js | 2026-08-21 | Frontend, Architecture, ExecPlan |
| S-WAPT-007 | VERIFIED FACT / A / high | Frozen source `ceb58ee` uses a fixed camera, 24×25 m terrain, approximately 2.59 m humanoids, approximately 1.99 m houses, slug-driven cyclic routines, and no camera/LOD/residency/occupancy/Chronicle-focus contract. | local repository commit `ceb58ee0703749375454db894645ecae1022ff82` and this audit | 2026-08-21 | Decisions, Frontend, Design, ExecPlan |

## Constraint fit

| Binding constraint | Fit check |
|---|---|
| Solo builder | One existing renderer, six Places, eight citizens, one catalog, and four choreographies; no generalized engine, art pipeline, physics, audio, or Recast. |
| 40–60 focused hours | The incremental delta is bounded at 32 hours, but total prior-plus-delta time is unverified and must remain an explicit planning risk. |
| M4 Pro / no owned GPU | Procedural low-poly WebGL2, CPU-cheap authored pathing, and existing browser tooling; no training or offline render farm. |
| Approximately $0 / no spend | No purchase, service, model, deployment, or new paid asset. |
| Free/useful V1 | Same account-free local world and semantic fallback; camera and world actions remain available without inference. |
| No model training/fine-tuning | No cognition change or model dependency. |
| No proprietary data/partnership | Authored fictional fixture and repository-owned primitives only. |
| No commercial/regulated scope | No payment, identity, telemetry expansion, custody, or regulated data. |

## Handoff conclusion

At the frozen commit, PlayCanvas is not the blocker. The blocker is the semantic
gap between an instantaneous Place-based Reality and a renderer that invents the
appearance of continuous work. Close that gap first, then enlarge and navigate the
world. An independent release reviewer should not be invited until the slug routine
source is gone, the scale test passes, the camera traverses all three semantic
scales, at least gather/exchange/inspect/repair follow canonical phase order, and
the temporal inspector reports no stuck/collision/prop/task contradiction.
