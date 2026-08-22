# World-as-product implementation research

**Purpose:** Extract transferable implementation principles from official city-simulation, settlement-simulation, navigation, rendering, and animation materials for the Founder Alpha World-as-Product correction.

**Status:** RESEARCH COMPLETE — primary/official materials opened 2026-08-21; coordinator reconciliation, implementation, measurement, and independent human review remain required

**Authority boundary:** This document owns research findings and recommendations only. It does not change Reality, product, frontend, performance, testing, dependency, or release authority. Only the coordinator may add the proposed source rows to the shared ledger or reconcile authoritative decisions.

**Related documents:** [World Presence spatial research](WORLD_PRESENCE_SPATIAL_RESEARCH.md), [renderer spike](WORLD_PRESENCE_RENDERER_SPIKE.md), [frontend](../engineering/FRONTEND.md), [design](../design/DESIGN.md), [interaction](../design/INTERACTION.md), [performance](../quality/PERFORMANCE.md), [testing](../quality/TESTING.md), and [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

**Owned recommendation:** Treat the embodied world as the default explanatory surface. Implement a coherent metre-scale Riverhold, continuous multiscale camera, selection-first detail, optional spatial lenses, truthful physical task choreography, and bounded render residency. Keep simulation authority independent of rendering and use current PlayCanvas capabilities selectively rather than copying another game's scale, visual identity, or management model.

**Reopen evidence:** Reopen individual recommendations when measured Riverhold evidence shows that they breach the locked payload/frame/accessibility budgets, fail the unfamiliar-observer gate, conflict with Reality determinism, or require more content and systems scope than a solo builder can sustain. Engine documentation proves capability, not product quality or local performance.

## Executive conclusion

The references do not recommend “more visual activity.” They recommend a tighter explanatory chain:

> canonical cause → physical process in a place → visible result → selected human explanation → optional evidence

Five principles survive transfer to EONFOLK:

1. **Visible claims must be simulation claims.** SimCity's GlassBox pitch tied what players saw to what the simulation was doing. For EONFOLK, every consequential visible action needs a typed Reality source; animation is evidence presentation, never authority. [S-WAP-001]
2. **Overview belongs in the world; detail belongs to selection.** SimCity data maps and Cities: Skylines II infoviews reveal spatial patterns, while selected panels and selected route overlays answer local questions. Normal play should not reserve a permanent third of the screen for every system. [S-WAP-002][S-WAP-004][S-WAP-005][S-WAP-006]
3. **Ordinary life is structured, not decorative.** Foundation's villagers alternate work and free time and physically visit need-satisfying places. A small deterministic routine vocabulary can make quiet citizens legible without fake crowds or LLM calls. [S-WAP-007][S-WAP-008][S-WAP-009]
4. **Navigation, occupancy, carried objects, animation, save/load, and game speed are one reliability problem.** Manor Lords' official patch history repeatedly couples stuck workers, occupied action points, carts, animation loops, collision, loading, and frame-rate-dependent queues. Riverhold cannot treat pathfinding as a cosmetic tween. [S-WAP-010][S-WAP-011]
5. **PlayCanvas supplies the mechanisms, not the architecture.** Its current camera, culling, loading, batching, instancing, and animation systems can support the override. EONFOLK must still own semantic zoom policy, chunk residency, projection truth, performance evidence, and state-graph bindings. [S-WAP-012][S-WAP-013][S-WAP-014][S-WAP-015][S-WAP-016]

The bounded recommendation is not to imitate the population scale of a city builder. Make the existing eight people convincingly inhabit one larger place. Add content breadth only after scale, camera, task truth, occupancy, selection, and the independent World Presence verdict pass.

## Method and evidence limits

- Every external factual claim below uses a primary or official publisher, developer, engine, or upstream repository source opened on 2026-08-21.
- Marketing and developer diaries establish intended system behavior, not independent proof of shipped quality, performance, or player comprehension.
- Official wikis establish documented game rules but do not expose complete implementation internals.
- Patch notes are especially useful as failure taxonomies; they do not prove the same architecture or defect exists in EONFOLK.
- No reference is evidence that Riverhold meets its gate. Only deterministic local tests, measured browser evidence, and a fresh observer can establish that.

## Audit of the frozen source state

The local audit is against exact source commit `ceb58ee0703749375454db894645ecae1022ff82`.

| Surface | Existing strength | Gap against the override | Severity |
|---|---|---|---|
| Reality/presentation boundary | `packages/world-presentation` projects typed actors, paths, interactions, action sources, props, and mismatch codes without renderer authority | Current behavior-derived routines can look busy without the richer canonical action/affordance lifecycle required for every consequential process | P1 |
| Physical scale | Scene coordinates use millimetres in the pure spatial package and convert to metres at rendering | Rendered ground is about `24 × 25` units, houses are roughly `2.45–3.2` units wide and `1.7` units high, while citizen rigs reach roughly `2.16` units before Mara's additional scale; the result is a compact board, not a credible settlement context | P1 |
| World context | River, field, four homes, market, mill, well, props, and trees are visible | Six boundary trees and a rectangular ground plane do not conceal the end of the board or provide forest, roads, storage, civic space, unused land, or distant terrain | P1 |
| Camera | One perspective PlayCanvas camera renders the scene | It is fixed at `[14,14,18]`; there is no player pan, zoom, orbit, focus, follow, return-to-overview, or semantic scale policy | P1 |
| World hierarchy | Pure scene nodes and semantic places already exist | There is no explicit region/chunk/cell residency or LOD0–LOD3 presentation contract | P1 |
| Citizens/actions | Eight full-limbed procedural humanoids move, face, pose, carry props, and show an exchange | Primitive limb posing is not a reusable authored animation state graph with clip blending, ground contact, sockets, reactions, and close-view fidelity | P1 |
| Interaction spaces | Authored work, exchange, entry, and path nodes exist | There is no general entrance/slot type, occupancy queue, reservation recovery, or collision-aware multi-actor controller | P1 |
| Information design | Semantic DOM parity and progressive phase panels exist | Desktop remains a two-column `1.72fr/0.78fr` composition, selection does not drive compact citizen/building cards, and there is no coherent player/research lens model | P1 |
| Chronicle | Chronicle preserves causal explanation | Beats cannot focus a place/citizen/object or enter a bounded spatial replay | P1 |
| Performance | The integrated PlayCanvas candidate is inside existing payload budgets and has passing production automation at an earlier checkpoint | A larger controllable world, GLBs, animation, LOD, culling, and overlays have not been measured; current success cannot be extrapolated | P1 |

This is not a request to discard working boundaries. It identifies why the current scene can pass technical tests yet still fail “these people live here.”

## What the references actually teach

### 1. SimCity: truth first, then optional explanatory maps

**VERIFIED FACT:** Maxis described GlassBox with “What You See Is What You Sim,” saying visible aspects report to the underlying simulation. The official manual separates broad category information from optional data maps that show information over buildings and infrastructure. [S-WAP-001][S-WAP-002]

**Transferable principle:** the default world should present causal evidence at the same spatial location as the process. Optional overlays should answer one question at a time: where resources move, who is active, or where a route fails.

**Do not copy:** the literal “everything is an agent” implementation claim, city scale, colored heat-map aesthetic, or the assumption that every displayed decorative object needs canonical state. EONFOLK's stricter rule is: every *consequential claim* is sourced; cosmetic life is explicitly non-claiming.

**Implementation implication:** define a closed `PresentationTruthClass` such as `canonical-action`, `canonical-state`, `canonical-result`, and `cosmetic`. Renderer code cannot display work, exchange, repair, accusation, or production from the cosmetic class. A selected lens declares its source head and remains a read-only projection.

### 2. Cities: Skylines II: overview, selection, route, and lifepath form one information ladder

**VERIFIED FACT:** official Cities: Skylines II material describes citizens taking ordinary and rare actions with simulation effects, a followable Lifepath Journal, and Chirper messages tied to actual events. Its traffic model uses network, time, money, comfort, and preferences in path cost. Traffic infoviews show citywide flow/volume, Selected Info Panels expose local needs, and selected route overlays can be toggled for a person, vehicle, road, or building. [S-WAP-003][S-WAP-004][S-WAP-005][S-WAP-006]

**Transferable principle:** use a three-step disclosure ladder:

1. watch a spatially legible process;
2. select the citizen/place to understand current activity, destination, concern, and route;
3. ask for human explanation or evidence.

The Lifepath lesson is not “add a journal.” It is continuity between a visible person, their current place/activity, and a persistent record. Chronicle beats should focus the same person/place/object that made the beat.

**Do not copy:** mayoral direct control, metropolitan-scale optimization, opaque aggregate happiness, social-feed chatter, or route cost dimensions that the current Reality does not model. EONFOLK's player sponsors a person and counsels; it does not optimize every commute.

**Implementation implication:** selection is the common key across world, route, contextual card, Chronicle, and research evidence. One `SelectionTarget` union should cover citizen, building/place, resource, interaction, and Chronicle beat. It is UI state only and never changes Reality.

### 3. Foundation: routines become readable because needs have places

**VERIFIED FACT:** Foundation's official wiki says villagers follow work/free-time periods. During free time they visit wells, markets, churches, taverns, or homes to satisfy needs; after needs are filled they return home. Documented need satisfaction occurs through access to specific resources, housing, and services. Its logistics guidance makes travel distance and worker free time relevant to keeping distribution stocked. [S-WAP-007][S-WAP-008][S-WAP-009]

**Transferable principle:** a routine should have a reason, destination, physical affordance, duration, and result—even when it is not a plot event. “Idle” is a legitimate brief state, not a citizen's default life.

**Do not copy:** a generalized need ladder, promotions, immigration, production chains, or workforce assignment UI. Those would expand Founder Alpha into a management game.

**Implementation implication:** keep four bounded routine families and map each to existing slice facts:

| Routine family | Reason | Required place/affordance | Visible completion |
|---|---|---|---|
| sustain | current food/water need | well, market/storage, rest point | drink/eat/rest pose and exact canonical need/resource result |
| contribute | current plan/work need | field, woods, mill, market work point | gather/carry/deposit/repair sequence and exact result |
| verify | tension, plan, or belief need | ledger, stock, mill, resource inspection point | inspect/compare followed by an observation/claim only if recorded |
| relate | active relationship/message/coordination need | paired rendezvous slots | greet/talk/listen/exchange/reaction tied to message/claim/exchange state |

The Standard Brain chooses among these families. Presentation makes the chosen routine physical; it does not invent the reason or result.

### 4. Manor Lords: action slots and recovery are product work

**VERIFIED FACT:** current official Manor Lords announcements describe pathfinding and collision refactors, enclosed-zone rejection, substepped locomotion, waiting/action-point failures at a well, path relinking after topology changes, task queues clogging at low frame rates, handcart/capsule coupling, wrong carried-tool animations, and endless animation loops after loading. [S-WAP-010][S-WAP-011]

**Transferable principle:** believable work requires a transaction across navigation, reservation, animation, prop, canonical result, and recovery. Testing any one in isolation is insufficient.

**Do not copy:** dynamic town construction, thousands of agents, military formations, complex collision physics, or an assumption that adopting a navmesh eliminates orchestration defects.

**Implementation implication:** every physical task controller needs explicit phases:

`requested → route-valid → slot-reserved → approaching → aligned → acting → result-observed → departing → slot-released`

It also needs bounded recovery:

- route unavailable: record mismatch and show semantic fallback; do not teleport;
- occupied slot: use a typed waiting point and stable priority;
- actor removed/reassigned: release reservations deterministically;
- reload/zoom/LOD change: reconstruct phase from the projection, not a stale animation callback;
- animation event missed: canonical result still stands, diagnostics record degraded presentation;
- canonical result absent: no visible transfer, production, repaired state, or factual utterance.

### 5. PlayCanvas: use the engine's strengths without hiding residency mistakes

**VERIFIED FACT:** current PlayCanvas documentation provides orbit/pan/zoom/focus-capable camera controls with mouse, touch, keyboard, and gamepad support; perspective/orthographic cameras and frustum culling; runtime asset load/unload; batching; WebGL2 hardware instancing; and state-graph animation with transitions, parameters, blending, layers, masks, and React bindings. [S-WAP-012][S-WAP-013][S-WAP-014][S-WAP-015][S-WAP-016]

**VERIFIED FACT:** official guidance warns that hardware-instanced meshes are all submitted without per-instance frustum culling, large batches reduce culling precision, skinned-mesh bounds cost CPU unless bounded, and device pixel ratio, shadows, materials, shaders, and dynamic lights require measurement. [S-WAP-014][S-WAP-015]

**Transferable principle:** culling, instancing, and batching are different tools:

- frustum culling removes out-of-view mesh instances;
- chunk residency removes resources that should not occupy memory;
- batching reduces draw calls but makes the batch's bounding box coarser;
- instancing is good for repeated terrain/trees/props inside bounded visible cells, not a substitute for chunk culling;
- actor LOD should reduce rig/animation/material cost without changing the citizen's canonical existence.

**Implementation implication:** make world residency explicit rather than relying on an engine default:

```text
WorldPresentation
└─ Riverhold region
   ├─ cell IDs + authored bounds + neighbors
   ├─ place IDs + entrances + interaction/work/storage points
   ├─ static residency: terrain, buildings, vegetation, props
   └─ dynamic projections: citizens, carried resources, interactions
```

Each cell has `resident`, `visible`, and `fidelity` presentation states. The projector emits all canonical entities needed by semantic UI; the renderer adapter chooses residency and LOD from camera/selection/hardware policy. Loading or unloading never dispatches a command or changes a world hash.

### 6. recast-navigation-js: credible escalation, not a truth source

**VERIFIED FACT:** current upstream recast-navigation-js provides browser/Node WASM navmesh generation, path queries, crowd simulation, temporary obstacles, PlayCanvas integration, and fixed-step crowd updates with interpolated positions; its documentation says variable stepping is non-deterministic. [S-WAP-017]

**Transferable principle:** if Riverhold outgrows the authored graph, Recast can own presentation path calculation and local avoidance, but not destinations, task legality, timing, resource results, or canonical movement completion.

**Recommendation:** retain the existing authored deterministic graph for the first bounded world while adding the missing typed affordances, slots, waiting points, blocked-space audit, and recovery tests. Adopt Recast only if one of these measured triggers fires:

- camera-scale expansion makes route authoring materially slower than reviewed navmesh generation;
- arbitrary destinations are required for the gate;
- authored lane offsets cannot prevent visible collision/stuck behavior;
- dynamic obstacles become a real accepted requirement; or
- a pinned offline-navmesh adapter reduces code/risk while staying inside bundle, load, and frame budgets.

If adopted, generate the static navmesh offline, record config/hash, import it at runtime, fixed-step it in presentation, and keep a semantic fallback. Runtime navmesh generation and crowd results must never enter Reality hashes.

### 7. Animation tooling: one reusable graph, not clip calls scattered through React

**VERIFIED FACT:** PlayCanvas state graphs define states, transitions, exit times, offsets, interruption rules, typed parameters, multiple layers, additive/override blending, and bone masks. The React `Anim` component exposes animation assets, a state graph, parameters, playback, speed, and root bone. [S-WAP-016]

**Transferable principle:** use the engine-native state graph as the rendering mechanism and keep the authoritative mapping in the pure presentation package.

Recommended split:

- pure `ActionPresentationState` owns semantic phase, action class, target, carried prop, facing requirement, and expected result boundary;
- PlayCanvas graph owns clip, transition duration, blend weights, masks, and playback phase;
- one adapter maps the closed semantic state to graph parameters;
- animation events may move a visual prop between sockets but never transfer canonical ownership;
- reload/LOD/follow changes reconstruct graph parameters from projection state.

Use one shared humanoid graph and compatible rig cohort before character-specific variants. Do not add XState or another runtime state-machine dependency unless PlayCanvas graph limitations are demonstrated in a spike. Another state-machine library would duplicate rather than clarify authority.

## Recommended Founder Alpha presentation contract

### Coherent physical scale and bounded geography

Keep `1 render unit = 1 metre`. Add a checked scale manifest for every authored class:

| Class | Provisional review range | Gate assertion |
|---|---:|---|
| adult citizen | 1.6–1.9 m | rig bounds and feet-to-ground are measured |
| door | 1.9–2.2 m | citizen clears opening without clipping |
| one-storey home wall/eave | 2.4–3.4 m | a citizen does not visually rival the building |
| normal path | 1.5–3.0 m | two citizens can pass or use authored priority |
| mature tree | 5–12 m | provides scale and boundary concealment |
| market/work area | occupancy-derived | every active slot has human clearance |

Expand the visible context enough that town view reads as a settlement inside geography, not a slab. The exact dimensions are an art/performance decision, but the settlement core, river/bridge or crossing, resource edges, unused land, and concealing terrain must fit inside the overview without exposing a rectangular boundary. Distant hills/forest/water may be low-detail contextual cells.

### Three semantic camera bands

Implement one continuous perspective camera with explicit bands; do not swap to three unrelated scenes.

| Band | Player question | World presentation | Information policy |
|---|---|---|---|
| region/settlement | “How is Riverhold organized?” | terrain, river, roads, districts/places, landmarks, locatable low-detail citizens | one optional aggregate lens; sparse labels/incidents |
| town/activity | “What are people doing?” | full nearby routes, actions, props, meetings, building state | primary play band; hover/select affordance only |
| citizen/follow | “What is Mara doing and why?” | selected LOD0 rig, facing, tool/prop, partner, work point, local sound | compact contextual card; human explanation on request |

Scroll/pinch zoom, drag pan, restrained orbit, click focus, follow, and return-to-overview must work with mouse, touch, and keyboard equivalents. Follow tracks a presentation target with smoothing; it does not move or prioritize the canonical citizen.

### Selection and lenses

Use one compact contextual overlay that changes with the selected target. Default desktop world emphasis should exceed 80% after onboarding; mobile uses a dismissible bottom sheet.

Player lenses should remain few and spatial:

- activity: current action/destination and task category;
- resources: existing three-resource quantities/flows only;
- relationships: selected citizen's supported ties only;
- routes: selected citizen or place paths only.

Research evidence is a distinct deliberate lens one interaction deeper. It may show fact/belief/claim distinctions, event/source/causal provenance, and cognition/experiment identity. It never changes Reality and should not share default-player labels such as hashes or sequence IDs.

### LOD and residency

Define four fidelity classes now even if the first implementation uses only two asset variants:

| LOD | Trigger | Citizen policy | Environment policy |
|---|---|---|---|
| LOD0 | selected/followed or close | full rig, graph, props, reactions | local interaction detail and authored audio |
| LOD1 | normal town range | normal rig/actions/props | normal buildings and task affordances |
| LOD2 | distant settlement | reduced update cadence and simplified silhouette | simplified materials/geometry; flows remain readable |
| LOD3 | far context | locator/very simple resident representation only | instanced or batched contextual terrain/vegetation |

Selection/importance may promote one entity above distance policy. LOD transitions preserve ID, action phase, destination, target, and result. Semantic DOM never loses an entity because its render cell unloaded.

## Release-blocking tests derived from the research

Add these to the existing Living World and World Presence contracts rather than creating a parallel gate:

1. **Scale audit:** automated bounds assertions plus three reviewed camera captures; no citizen/building/door/path ratio violates the manifest.
2. **Boundary audit:** every permitted overview camera pose shows authored geography, never an accidental board edge or unstyled void.
3. **Camera journey:** mouse and touch zoom/pan, selection focus, Mara follow during actual travel/action, and smooth overview return. Keyboard has equivalent focus/select/follow/return actions.
4. **Semantic zoom:** the same citizen keeps identity and action truth across all bands while labels, rig detail, cadence, and props change according to policy.
5. **Residency independence:** unload/reload a cell and prove identical Reality hash, projection semantics, citizen state, and result; the reloaded presentation catches up without teleport or wrong animation.
6. **Slot reliability:** occupied well/market/work slots produce waiting or alternate-slot behavior, stable release, no overlap, and no permanent queue.
7. **Task transactions:** gather/carry/deposit, exchange, inspect/converse, and repair each traverse route, slot, facing, animation, prop, result, and departure phases; absent canonical results never create visible consequential change.
8. **Animation recovery:** pause, low frame rate, dropped update, zoom/LOD switch, renderer remount, and persisted reload cannot leave a wrong prop, endless clip, sliding pose, or stale partner facing.
9. **Lens truth:** every overlay value traces to the same projection head; changing lenses/selection never changes Reality or foreground simulation cadence.
10. **Chronicle focus:** each material beat focuses existing participants/place/object and its bounded replay cannot display ahead of the committed event range.
11. **Performance:** repeat desktop/laptop/mobile evidence with camera movement, LOD transitions, eight citizens, twelve-citizen stress, and the largest selected/research overlay. Engine capability is not a waiver.
12. **Human gate:** a fresh reviewer answers exactly YES to “Does this feel like watching real inhabitants of a place, rather than looking at a visualization of a simulation?” Anything else remains P1.

## Implementation order under the solo-builder constraint

The override is broad; implement the smallest dependency order that can falsify it early:

1. **Scale/world/camera proof:** scale manifest, larger bounded geography, camera controller, three semantic bands, target focus/follow/overview, keyboard parity. Use procedural/temporary reviewed assets first.
2. **Selection/world-first shell:** collapse onboarding after follow, world-dominant layout, one target card, player/research separation, and selection projection. Do not build every lens yet.
3. **Physical task reliability:** typed affordances/slots/waiting, phase controller, four required task transactions, prop sockets, canonical-result gates, mismatch diagnostics.
4. **Reusable humanoid graph:** one compatible rig, shared graph, blending/masks, Mara identity, LOD0/LOD1; replace scattered procedural limb posing only after graph binding works.
5. **Residency/LOD:** authored cells, visibility/residency policy, static batching/instancing where measured, dynamic citizen fidelity, reload/LOD recovery.
6. **Chronicle spatial linkage and bounded audio:** focus/replay links first; sound only after visible source truth and volume controls are stable.
7. **Full temporal/performance/human gate:** deterministic automation, three viewports, independent reviewer, then fix loop.

Scope cuts occur from the bottom of this list: decorative variety, extra lenses, additional sounds, close-view reactions, and LOD3 artistry can reduce. Do not cut truthful action sourcing, camera usability, scale, occupancy reliability, semantic parity, or the independent verdict.

## Objections and rejected interpretations

| Interpretation | Objection | Recommendation |
|---|---|---|
| “GlassBox means every leaf must be simulated.” | It confuses consequential truth with rendering detail and would explode scope | Canonical-source consequential claims; label ambient life cosmetic |
| “City builders prove many agents are needed.” | None of the sources proves eight deep inhabitants cannot pass EONFOLK's gate | Keep eight; improve scale, routine legibility, task truth, and camera first |
| “Foundation's needs should become a full economy.” | It would change the product and exceed the accepted slice | Use only existing needs/resources to motivate four routine families |
| “Manor Lords proves we need Recast now.” | Its patch history proves integration complexity, not a specific library choice | Keep the planner port; escalate only on measured authored-graph failure |
| “Frustum culling is world streaming.” | Culling can still leave assets resident and CPU work active | Track cell residency separately from visibility and fidelity |
| “Instancing solves a large world.” | PlayCanvas submits all instances in an instanced call without per-instance culling | Instance bounded visible cell groups; unload distant groups |
| “A state graph makes animations correct.” | It cannot create compatible clips, sockets, phase truth, recovery, or canonical linkage | Pure semantic state + one graph adapter + task transaction tests |
| “Semantic zoom means scaling icons.” | The requirement is different useful information and fidelity at different distances | Define band-specific render, label, cadence, prop, and interaction policies |
| “Selection cards can keep the current dashboard layout.” | Permanent wide panels still make the website the primary interface | Contextual overlay/sheet after onboarding; world remains perceptually dominant |

## Remaining uncertainties and risks

- **WAP-R-01 — P1, UNRESOLVED:** the larger scene, camera movement, rigged characters, and state graphs may exceed payload or mobile frame budgets. Only integrated measurements can close it.
- **WAP-R-02 — P1, PRODUCT HYPOTHESIS:** eight inhabitants with richer routines are enough to make the larger world feel populated. The ten-/thirty-second unfamiliar-observer gate decides; do not pre-emptively add residents.
- **WAP-R-03 — P1, UNRESOLVED:** the current atomic Reality/event model may not expose enough in-progress semantic phases to source every choreographed action honestly. Add the narrowest action/phase contract; never infer results from animation.
- **WAP-R-04 — P1, UNRESOLVED:** current procedural rigs may not meet close-follow animation quality, while imported GLBs may breach size, compatibility, or provenance constraints. Use one measured cohort and exact asset review.
- **WAP-R-05 — P1, UNRESOLVED:** authored waypoint routes may fail after the world expands in scale. Apply the explicit Recast trigger; do not let path failures become routine teleport recovery.
- **WAP-R-06 — P1, PRODUCT HYPOTHESIS:** collapsing the current panel into contextual surfaces preserves onboarding clarity. Browser evidence must cover the first arrival and the post-follow world emphasis separately.
- **WAP-R-07 — P1, UNRESOLVED:** Chronicle-to-world focus may reveal that stored beats lack stable place/object references. Missing linkage should reopen the beat projection contract, not use text parsing.
- **WAP-R-08 — P1, UNRESOLVED:** occupancy, remount, low-frame-rate, and reload recovery are common integration failure modes per official patch evidence; deterministic adversarial fixtures are required before the human gate.
- **WAP-R-09 — P2, UNRESOLVED:** authored sound could improve presence but adds asset provenance, accessibility, mixing, and source-truth work. It is the first major feature to defer.

There is no research-derived P0. The open P1s are release blocking because they directly determine whether the override is true, performant, accessible, and honest.

## Constraint fit

This recommendation preserves local browser execution, deterministic Standard Brain routines, no model training, no hosted inference requirement, no server/deployment/account work, and approximately-$0 operation. It adds no required paid assets or service. It uses current PlayCanvas and the existing pure presentation boundary.

The main constraint risk is solo-builder scope. The mitigation is strict reuse: one region, eight citizens, one shared rig/state graph, four task transactions, three camera bands, one selection card, a few lenses, and coarse authored cells. Do not add population, construction, a generalized economy, weather simulation, dynamic terrain, or city-builder control verbs to make the world look larger.

No official source supports a new commercial requirement, proprietary dataset, partnership, GPU service, or model dependency.

## Proposed source-ledger rows

These rows are proposals only. The coordinator owns `SOURCE_LEDGER.md`, may rename IDs, and must inspect the opened sources before integration. All were accessed **2026-08-21**.

| Proposed ID | Claim | Direct primary/official source | Class | Confidence | Suggested consumers | Reopen rule |
|---|---|---|---:|---|---|---|
| S-WAP-001 | Maxis presented GlassBox through the principle that visible game activity reports to the underlying simulation | [EA: SimCity announced for 2013](https://www.ea.com/en-au/news/simcity-announced) | A | High for the stated design principle; not independent quality evidence | This research; design; frontend | Reopen only if used to justify a literal architecture beyond the source |
| S-WAP-002 | SimCity separated category summaries from optional data maps showing spatial infrastructure/building information | [Official SimCity 2013 manual, pp. 10–11](https://akamai.cdn.ea.com/eadownloads/u/f/manuals/GAME-SIMCITY/SimCity_2013.pdf) | A | High | This research; information design | Reverify only if making a claim about a different version |
| S-WAP-003 | Cities: Skylines II describes citizen activities with simulation effects, followed lifepaths, and Chirper posts tied to actual events | [Paradox: Citizen Simulation & Lifepath](https://www.paradoxinteractive.com/zh-CN/games/cities-skylines-ii/features/citizen-simulation-lifepath) | A | High for documented design; medium for shipped comprehension | This research; human loop; Chronicle | Reverify on material product-system change |
| S-WAP-004 | Cities: Skylines II pathfinding uses multiple costs/preferences and its traffic infoview spatially exposes flow/volume | [Paradox: Traffic AI](https://www.paradoxinteractive.com/zh-CN/games/cities-skylines-ii/features/traffic-ai) | A | High for documented design | This research; routes/lenses | Reverify on material product-system change |
| S-WAP-005 | Cities: Skylines II exposes individual household needs through the selected information panel | [Paradox: City Services](https://www.paradoxinteractive.com/games/cities-skylines-ii/features/city-services-districts-policies) | A | High | This research; selection UI | Reverify on material UI change |
| S-WAP-006 | Cities: Skylines II can toggle spatial routes from a selected pedestrian, vehicle, road, or building | [Paradox: Detailer's Patch #2](https://www.paradoxinteractive.com/games/cities-skylines-ii/news/detailers-patch-2) | A | High | This research; selected route lens | Reverify on material UI change |
| S-WAP-007 | Foundation villagers alternate work/free time and visit need-satisfying places, returning home after needs are met | [Official Foundation Wiki: Villagers](https://wiki.polymorph.games/foundation/Villagers) | A | High for documented game rules | This research; routine design | Reverify on material rules change |
| S-WAP-008 | Foundation needs are satisfied through access to specific resources, housing, and service locations | [Official Foundation Wiki: Needs](https://wiki.polymorph.games/foundation/Needs) | A | High for documented game rules | This research; routine/affordance design | Reverify on material rules change |
| S-WAP-009 | Foundation logistics makes distance and worker free-time availability relevant to resource distribution | [Official Foundation Wiki: Resource Logistics](https://wiki.polymorph.games/foundation/Resource_Logistics) | A | High for documented game rules | This research; physical task design | Reverify on material rules change |
| S-WAP-010 | Manor Lords' official beta 0.8.078 notes couple pathfinding, collision, substeps, stuck recovery, task behavior, and carried-animation defects | [Official Manor Lords Steam news: beta 0.8.078](https://store.steampowered.com/news/app/1363080/view/690885345687896988) | A | High for recorded fixes; low for transfer to a different architecture | This research; navigation/tests | Reverify against the exact announcement if quoting details |
| S-WAP-011 | Current Manor Lords official announcements document occupied-action waiting, path relinking, task-queue, cart/capsule, tool, and animation-loop defects | [Official Manor Lords announcements](https://steamcommunity.com/app/1363080/announcements/?l=english) | A | High for recorded fixes; medium for the current rolling page | This research; navigation/animation tests | Replace rolling URL with exact announcement permalinks during ledger integration where available |
| S-WAP-012 | Current PlayCanvas camera controls support orbit, pan, zoom, focus smoothing, touch, keyboard, and gamepad inputs | [PlayCanvas camera controls](https://developer.playcanvas.com/user-manual/graphics/cameras/camera-controls/) | A | High | This research; frontend/accessibility | Reverify on selected engine cohort change |
| S-WAP-013 | PlayCanvas supports perspective/orthographic cameras and frustum culling of mesh-instance bounds | [PlayCanvas projection and culling](https://developer.playcanvas.com/user-manual/graphics/cameras/projection/) | A | High | This research; camera/LOD | Reverify on selected engine cohort change |
| S-WAP-014 | PlayCanvas supports runtime asset loading and unloading for explicit memory control and streaming | [PlayCanvas loading and unloading](https://developer.playcanvas.com/user-manual/assets/loading-unloading/) | A | High | This research; residency architecture | Reverify on selected engine cohort change |
| S-WAP-015 | PlayCanvas batching and instancing reduce draw calls but impose culling/bounds tradeoffs; optimization guidance calls for measured draw calls, DPR, shadows, materials, and skinned bounds | [Batching](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/batching/), [hardware instancing](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/), and [optimization guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/) | A | High for engine behavior; Riverhold benefit unmeasured | This research; performance; asset pipeline | Replace generic guidance with integrated measurements before changing budgets |
| S-WAP-016 | PlayCanvas provides reusable animation state graphs with transitions, parameters, blending, layers/masks, plus a React Anim binding | [State graph assets](https://developer.playcanvas.com/user-manual/animation/anim-state-graph-assets/) and [React Anim API](https://developer.playcanvas.com/user-manual/react/api/anim/) | A | High for capabilities; asset/graph quality unproven | This research; animation implementation | Reverify on selected wrapper/engine cohort change |
| S-WAP-017 | recast-navigation-js provides WASM navmesh queries/crowds/PlayCanvas integration and documents fixed-step interpolation versus non-deterministic variable stepping | [Upstream recast-navigation-js repository](https://github.com/isaac-mason/recast-navigation-js) | B | High for upstream documented capabilities; local fit unmeasured | This research; navigation decision | Pin and inspect an exact release/commit before adoption |
