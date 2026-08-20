# Art directions

**Purpose:** Select the visual direction, preserve the runner-up and rejection reasons, and define the art-production boundary for the first slice.

**Status:** ACCEPTED FOR `001-foundation` — provisional until an authored readability and renderer proof passes.

**Authority boundary:** This document owns direction selection and art-pipeline constraints. [Visual-direction research](../research/DESIGN_RESEARCH.md) owns the comparative evidence; [design](DESIGN.md) owns the applied visual grammar.

**Related documents:** [Concept provenance](concepts/README.md), [interaction](INTERACTION.md), [motion and sound](MOTION_SOUND.md), [mobile](MOBILE.md).

## Owned decision

Use **Living Woodcut** for the first slice: a sparse animated print whose settlement, citizen marks, relationship cues, and Chronicle share one limited-ink visual language.

Use **Weathered Atlas** as runner-up and explicit fallback. Retain **Hearthscale** only as a reference for human warmth, face size, occupation readability, and inviting light; do not retain its 3D miniature pipeline.

The name of the direction is an internal art brief, not player-facing branding.

## Selection evidence

The independent review scored the fifteen matched concepts as follows:

| Rank | Direction | Score / 45 | Why it occupies this rank |
|---:|---|---:|---|
| 1 | Living Woodcut | 38.0 | Most distinctive and the only direction with one grammar for world, intervention, Chronicle, and sharing |
| 2 | Weathered Atlas | 33.0 | Strong geography, causality, mobile composition, and performance potential; weaker moment-to-moment aliveness and more dashboard ornament |
| 3 | Hearthscale | 28.0 | Strongest warmth and activity legibility; highest asset/performance burden and strongest generic/generated miniature smell |

The full observations and score definitions are in [visual-direction research](../research/DESIGN_RESEARCH.md).

## Living Woodcut production grammar

### What is essential

- A warm paper ground with visible, restrained grain.
- Charcoal primary ink; rust, moss, and river-blue functional inks; one brighter sponsored-citizen accent.
- Bold outer silhouettes and quiet interiors. Hatching describes material and weather but yields around faces, hands, tools, and walk paths.
- An oblique composed settlement view that fills the available field. The world is never a thumbnail behind cards.
- Citizen identity through silhouette, coat block, carried tool, posture, and a larger portrait vignette—not facial micro-detail at world scale.
- Causal edges that resemble carved channels or printed registration marks and remain distinguishable without color.
- Chronicle frames that feel cut from the same world. A replay may recompose event evidence; it may not invent picturesque action.

### What is not essential

- Literal engraving-level detail.
- Unique hatch work for every object.
- Simulated paper folds, ink bleed, misregistration, or film grain at all times.
- Faux-old readable body copy.
- Decorative borders around routine controls.
- A modeled wooden tabletop, book, or diorama frame.

These exclusions prevent the style from consuming the product budget.

## First-slice asset pipeline

1. Author source shapes as editable SVG or layered raster files with repository-visible provenance.
2. Keep paper, silhouettes, props, buildings, work marks, portraits, icons, and hatch masks as separate reusable sources.
3. Export a small WebP/PNG atlas with deterministic settings; keep the source-to-atlas mapping inspectable.
4. Render one PixiJS canvas with flat layers: ground, structures, resources, citizens, effects, selection/causal marks.
5. Put names, state, actions, causal sentences, tooltips, and accessibility content in semantic DOM, not baked into textures.
6. Build Chronicle compositions from event-bound scene crops, authored icons, portraits, and typed causal edges.

The first slice does not require Blender, glTF, bones, dynamic lights, post-processing, or an asset marketplace. Generated concept images are never production inputs. If later regions require a 3D source pipeline, that is a post-gate architecture decision rather than a hidden requirement here.

## First-slice inventory ceiling

The complete authored set should fit within:

- one settlement/paper ground, bridge, well, granary/market, and mill-repair silhouette set;
- food, water, wood, exchange, verify, and repair props/marks;
- one modular body system with five action overlays, plus six secondary identity marks;
- two large portrait treatments: Mara and Toma;
- one selection mark, one relationship edge, and five shared relation meanings: direct, trigger, contributing, temporal-before, and allegation; response-to appears only in evidence detail;
- one bounded ink/hatch treatment and one responsive card composition; and
- no ambience-only illustration, cinematic panel, share-only art, or unique full portrait for all eight.

Adding an asset requires removing or deferring one of comparable effort unless it is necessary to pass Gate A or Gate B.

## Renderer implication

Living Woodcut is inherently 2.5D. Choose **PixiJS** before implementation and use one renderer. Do not include React Three Fiber or Three.js as a second world path “for later.” The disposable R3F spike (`4bdef56`) was useful evidence but narrowly missed the desktop p95 frame target and exposed mobile panel domination; it does not obligate a 3D product.

The PixiJS path must still prove:

- critical shell at or below 200 KB gzip;
- total initial-route JavaScript, including the lazy world renderer, at or below 650 KB gzip;
- compressed first-world assets at or below 6 MB desktop and 4 MB mobile;
- meaningful world display within 3 seconds on target Mac/laptop and 5 seconds on realistic mid-tier mobile/4G;
- desktop p95 frame time at or below 16.7 ms with eight citizens;
- mobile p95 frame time at or below 33.3 ms;
- eight citizens by default and practical rendering at twelve; and
- a full semantic alternative for all consequential information and actions.

Failure invokes simplification, not a waiver.

## Rejected alternatives

### Hearthscale as foundation

Rejected because reproducing the concepts’ warmth requires modeled assets, materials, lighting, animation, and camera polish outside the 52-hour proof. A cheap substitute would drift toward generic cozy-mobile presentation. Keep its lessons—large expressive portraits, readable tools, warm arrival—not its production burden.

### Weathered Atlas as foundation

Rejected for now because it emphasizes territory, border portraits, symbols, and inset explanation before the player has formed attachment to a moving citizen. It also invites a strategy-dashboard structure. It becomes the fallback if Living Woodcut fails a measured readability gate after one simplification pass.

### Mixing directions

Rejected. “Woodcut world, Hearthscale portraits, atlas Chronicle” would create three asset languages and make causal evidence feel detachable. Warmth and map clarity must be translated into the woodcut grammar.

### Generated images as shippable assets

Rejected. The concepts contain inconsistent counts, pseudo-text, unproven detail, and uncertain repeatability. Production assets must be authored, editable, attributable, compressible, and deterministic.

## Evidence that reopens the decision

Reopen only if one of these occurs:

- after enlarging citizens and removing local hatching, three of five fresh observers still cannot identify three activities and one interaction;
- a measured PixiJS scene cannot meet payload/display/frame budgets after the locked degradation steps;
- three of five fresh observers describe the style as an event log, static illustration, or impersonal map and cannot report the sponsored citizen’s emotion or tension; or
- producing the bounded first-slice inventory takes more than eight focused art/integration hours, forcing a Gate A or Gate B mechanic out of scope.

If reopened, test the simplified Weathered Atlas fallback—without ornamental margins or a persistent map dashboard—against the same scenarios and gates.

## Unproven assumptions

- A sparse woodcut implementation will retain the concepts’ distinction without their impossible density.
- Larger portrait vignettes can supply Hearthscale-level warmth.
- Two-pose citizens will feel intentionally animated rather than unfinished.
- Typed causal edges can be understood quickly in this decorative idiom.
- PixiJS offers sufficient measured headroom on real mobile devices.

## Resulting implementation behavior

- World content gets screen priority; information opens as a focused lens, sheet, or replay, then gets out of the way.
- Citizen readability is solved through pose, carried object, route, local animation, portrait, and concise status—not through more world-scale detail.
- Every causal share frame is reconstructable from authoritative events and authored parts.
- No important state is represented by texture, hue, motion, or canvas-only hover alone.
- If style and legibility conflict, legibility wins.

## Constraint fit

- **Solo / 40–60 hours:** One atlas, one camera, limited poses, no 3D stack, and an inventory ceiling keep art subordinate to the two product proofs.
- **M4 Pro / no GPU:** The workflow runs locally and requires no training, render farm, or hosted inference.
- **Approximately $0:** Open local authoring tools and repository-owned source art are sufficient; no purchase is authorized.
- **Free V1 and noncommercial scope:** Art creates product identity without ads, paid cosmetics, marketplace licensing, partnerships, or commercial operations.
- **No training/fine-tuning:** The style is encoded in authored rules and deterministic rendering, not in a model.
