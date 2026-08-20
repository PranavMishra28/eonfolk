# Frontend and renderer

**Purpose:** define the future browser stack, renderer decision rule, UI boundary, and asset path.

**Status:** PROVISIONAL STACK ACCEPTED; FINAL RENDERER DEPENDS ON THE SELECTED ART DIRECTION AND A PASSING SPIKE

**Authority boundary:** owns browser application technology, renderer exclusivity, UI libraries, route rendering, asset pipeline, and component provenance. Visual language is owned by future `docs/design/DESIGN.md`; numerical budgets are owned by [performance](../quality/PERFORMANCE.md).

**Related documents:** [architecture](ARCHITECTURE.md), [performance](../quality/PERFORMANCE.md), [visual QA](../quality/VISUAL_QA.md), [security](SECURITY.md), future `docs/research/DESIGN_RESEARCH.md`, [tool inventory](../research/PROPOSED_TOOLS.md)

## Owned decision

Use React Router with Vite, custom semantic DOM UI styled with Tailwind, Base UI primitives where they save accessibility work, Phosphor icons, and Motion only for bounded interface transitions that pass reduced-motion and frame-time gates. Do not adopt a shadcn-default visual identity, component-marketplace code, GSAP, or Storybook for the first slice.

Use exactly one world renderer:

- **React Three Fiber/WebGL2** is the provisional choice for a genuinely three-dimensional diorama.
- **PixiJS** replaces it before implementation if the selected direction is inherently 2.5D or if a simplified R3F scene cannot meet the budget.
- Never ship or scaffold both renderers.

The visual-direction authority chooses whether depth is essential; the implementation spike proves whether the matching renderer meets the performance and mobile gates. Renderer loyalty cannot waive a budget.

## Rendering-spike evidence

**DIRECTIONAL LOCAL EVIDENCE:** disposable rendering spike `4bdef56` built a representative R3F/Vite scene with twelve citizens, instanced props, houses, shadows, fog, and a DOM overlay. It measured:

- initial JavaScript: **291.39 KB gzip**;
- observed load: approximately **0.92–1.0 seconds** in the controlled local profiles;
- p95 frame time: **17.1 ms** at the desktop and laptop viewports and **17.3 ms** at the mobile viewport;
- a **mobile overflow defect**.

This is not product proof. It did not use production assets, a complete application, representative 4G delivery, a range of physical mobile devices, or full simulation/catch-up load. It supports keeping R3F as a candidate because payload and mobile frame time were within provisional ceilings. It does **not** pass the 16.7 ms desktop p95 gate, and overflow blocks mobile acceptance. The implementation renderer must simplify shadows, pixel ratio, effects, geometry, or art direction and then remeasure.

## Application/rendering boundary

- The client-only renderer reads an immutable or double-buffered presentation projection from the simulation worker.
- It may interpolate movement for appearance but cannot commit positions, resource changes, relationships, or time.
- Selection, counsel, Chronicle navigation, replay controls, and every consequential action also exist in semantic DOM.
- Important labels and state are text outside WebGL. Canvas hit testing is an enhancement, never the only control.
- Renderer loss or a weak-device mode leaves a fully playable list/map view.

The first slice is local-only. After the hosted gate, public Chronicle/share routes are server-rendered for fast, accessible, linkable content; the live world renderer remains client-only. SSR must not attempt to reproduce WebGL.

## UI and component policy

- Build a small authored UI vocabulary: buttons, disclosure, tabs, dialog/sheet, tooltip, meter, timeline step, and toast/status.
- Use Base UI only for named primitives with clear accessibility benefit.
- Treat Tailwind as a styling mechanism, not a design system.
- Use Motion only for state transitions that are hard to express clearly in CSS. Reduced motion disables or replaces them.
- shadcn guidance may inform composition, but copied registry code requires an exact item need, source URL, revision, author, item license, dependencies, modifications, and visual restyling.
- 21st.dev and component marketplaces are rejected for V1 unless a named blocker survives review and item-level terms are approved.
- No marketplace or generated component may introduce provider SDKs, analytics, auth, payments, or remote fonts silently.

## Asset pipeline

Production art follows authored Blender -> glTF/GLB -> optimized meshes/instancing -> KTX2 textures. Concept-generation images are composition and language references only; they are not textures, final citizens, or a production asset pipeline.

Each shipped asset records source/author, license, revision/hash, optimization settings, compressed bytes, and intended use. The first slice uses a tiny authored set, shared materials, instancing, and a fixed camera envelope. Runtime-downloaded marketplace assets are out of scope.

## Resulting implementation behavior

- The shell and semantic controls appear before the renderer is ready.
- A loading or renderer error still exposes identity, counsel, return summary, and Chronicle controls.
- The canvas never contains the sole copy of a fact or action.
- Weak devices degrade in the order defined by [performance](../quality/PERFORMANCE.md), ending in the semantic view rather than a blocked experience.
- Public-share SSR and a hosted region remain later adapters, not first-slice work.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Mix R3F and PixiJS | Doubles rendering knowledge, bundles, testing, and asset paths for one builder |
| Canvas-only UI | Fails semantic access, keyboard operation, text extraction, and graceful degradation |
| DOM dashboard as the dominant world | Undermines the world-dominant product promise |
| Generated images as production assets | Inconsistent provenance, perspective, animation, and implementation feasibility |
| Heavy post-processing and cinematic camera system | Consumes payload/frame budget and conflicts with reduced motion |
| Storybook in the first 52 hours | Separate harness and maintenance without enough component breadth to justify it |
| Unreviewed component marketplaces | License, dependency, remote-code, and generic-identity risk |

## Unproven assumptions and reopen evidence

- **UNRESOLVED:** the selected art direction needs true 3D. A 2.5D design decision switches to PixiJS before dependencies land.
- **UNRESOLVED:** a simplified R3F scene can reach desktop p95 <=16.7 ms under full application load. Failure triggers PixiJS or art simplification, not a waiver.
- **UNRESOLVED:** Base UI and Tailwind save more time than a smaller custom CSS set. Reopen if installation/bundle/license work exceeds the primitive value.
- **UNRESOLVED:** SSR public Chronicle routes are worth their hosted complexity. Reopen only after sharing/return evidence and the server gate.

## Constraint fit

The stack is mainstream for one TypeScript builder and reuses one language across protocol, sim, and UI. The first route works locally and free, uses no account or credential, and targets eight citizens. The one-renderer rule and tiny asset vocabulary protect the 40–60-hour ceiling. No generated asset, hosted UI service, paid component, or runtime download is required.
