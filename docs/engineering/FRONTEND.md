# Frontend, renderer, and asset pipeline

**Purpose:** lock one implementable presentation stack and its boundary from authoritative simulation.

**Status:** ACCEPTED AFTER RED TEAM — PixiJS 2.5D only

**Authority boundary:** this file owns renderer/UI libraries, projection boundary, asset pipeline, and first visual feasibility checkpoint. [DESIGN](../design/DESIGN.md) owns visual language; [PERFORMANCE](../quality/PERFORMANCE.md) owns budgets.

**Related documents:** [interaction](../design/INTERACTION.md), [mobile](../design/MOBILE.md), [visual QA](../quality/VISUAL_QA.md), [rendering research](../research/DESIGN_RESEARCH.md)

## Owned decision

Use React Router/Vite for the shell, one PixiJS renderer for the Living Woodcut world, and parallel semantic DOM for every fact and consequential action. Do not install or import React Three Fiber, Three.js, WebGL model loaders, Blender/glTF/GLB/KTX2 pipeline code, or a second renderer.

## Projection boundary

Reality emits immutable presentation projections. Pixi and DOM render the same versioned projection; neither reads mutable simulation objects or feeds wall time, frame time, camera, focus, pointer, or quality level back into Reality. Renderer crash or semantic-mode switch cannot alter canonical state.

The semantic view is fully playable: eight named citizens/actions, interaction pair, visible resources/places, Mara identity/tension/relationships/beliefs/plan, counsel options, interpretation receipt, catch-up confirmation, Chronicle beats, evidence details, and replay controls.

## First four-hour feasibility checkpoint

Before full simulation or persistence integration, build a disposable presentation fixture with:

- a useful static/semantic Riverhold shell by two seconds and operable **Follow Mara** by three seconds;
- eight citizens, three distinct actions, Mara/Toma, one interaction, one selected/peek state, and one Chronicle beat;
- the same authored projection at 1728×1117, 1366×768, and 390×844;
- reduced-motion and semantic modes; and
- measured payload, frame, overflow, 200% zoom, keyboard, and hit-target behavior.

Five silent unfamiliar observers review the named commit/seed/time. At least three of five identify Mara, three activities, and the interaction without a log; at least four of five find **Follow Mara** within ten seconds and understand “she acts for herself.” A miss triggers one simplification pass, then stripped Weathered Atlas or stop before expensive integration. It cannot be waived later by polish.

## UI/component policy

Use custom DOM UI with Tailwind, Base UI primitives where needed, Phosphor icons, and Motion only if measured. Avoid shadcn-default identity, GSAP, Storybook, component-marketplace code, 21st.dev items, and copied registry components without item-level license/source review. No dependency is required merely because planning considered it.

Arrival is one state machine: `orientation → Follow Mara → peek → inspect → investigate → decide`. The first CTA is **Follow Mara** with **She acts for herself**. Other citizens remain inspectable under **People**; there is no create, roster, candidate, mind picker, or ambiguous sponsorship step.

## Authored asset pipeline and ceiling

Use source SVG/PNG/Krita/Affinity files → texture atlas + metadata → optimized PNG/WebP/AVIF as supported → Pixi sprites/meshes. Generated concepts are references only.

First-slice authored inventory is capped at:

- Mara and Toma: two large portrait treatments;
- six secondary small identity marks;
- one modular body system with five action silhouettes/pose overlays;
- bridge, well, granary/market, water, wood, food, exchange, verify, and repair props/marks;
- five causal/relation marks shared by world and Chronicle; and
- one paper ground, bounded ink palette, focus/selection treatment, and responsive card layout.

No ambience-only illustration, cinematic panel, share-only art, 3D model, unique full portrait for all eight, or production reuse of generated pixels. Source creation, export, optimization, provenance, integration, and correction count against one art budget.

## Mobile interaction rules

The world stays at least 55% of usable portrait viewport until deliberate full Inspect. First tap opens a non-scrolling peek no taller than 35%, with name, one action, one tension, local-save notice, and one primary action. Inspect owns one natural scroll with sticky Close; Decide is separate with sticky Back/Continue. Browser Back closes one UI level before navigation.

Canvas targets are at least 44 CSS px but never resolve overlap silently: pointer-down freezes target ordering; the top visible target wins or a named chooser opens. A persistent **People** control is fallback. At 200% text zoom there is no horizontal overflow, nested scroll, hidden confirmation, or unexpected page exit.

## Rejected alternatives

R3F/Three, mixed renderers, a 3D asset pipeline, canvas-only actions, permanent dashboard, portrait-cropped desktop layout, production generated images, and a component marketplace as visual identity.

## Reopen evidence

Reopen Living Woodcut only if the early checkpoint misses legibility or budgets after one simplification pass. Reopen Pixi only for measured platform failure; fallback is simpler atlas/semantic presentation, not R3F.

## Constraint fit

One 2.5D atlas pipeline is materially smaller than 3D for a solo 52-hour plan, runs on the M4 and ordinary mobile hardware, costs $0, and needs no production asset license, GPU service, account, model, or deployment.
