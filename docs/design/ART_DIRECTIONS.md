# Art directions

**Purpose:** own the applied visual direction, production-asset boundary, fallback, and reopen criteria.

**Status:** AMENDED BY WORLD PRESENCE OVERRIDE — embodied procedural candidate under review

**Authority boundary:** this document owns visual-direction translation and art-production constraints. [FRONTEND](../engineering/FRONTEND.md) owns renderer/spatial implementation; [DESIGN](DESIGN.md) owns UI composition; [visual research](../research/DESIGN_RESEARCH.md) preserves the original comparison.

**Related documents:** [concept provenance](concepts/README.md), [asset research](../research/WORLD_PRESENCE_ASSET_RESEARCH.md), [renderer spike](../research/WORLD_PRESENCE_RENDERER_SPIKE.md), [visual QA](../quality/VISUAL_QA.md)

## Owned decision

Retain **Living Woodcut** as the material, typography, causality, Chronicle, and share grammar, but replace its sparse flat-world implementation with an **embodied low-poly settlement**. Borrow Hearthscale's warmth, readable bodies/tools, and tactile miniature clarity without adopting high-detail assets. Weathered Atlas remains the semantic/low-power fallback, not the normal world.

The World Presence override supersedes the old conclusion that Living Woodcut was inherently Pixi/2.5D. The product requirement is now recognizable full-limbed people moving through a physical settlement and visibly performing simulated actions.

## Applied grammar

- Warm earth, linen, charcoal, rust, moss, and river-blue materials; restrained rather than photoreal.
- Oblique settlement camera with SimCity-like overview and human/action scale large enough to read.
- Blocky low-poly houses, paths, river, fields, mill, trees, work points, and market interaction slots.
- Every citizen has head, torso, two arms, and two legs. Clothing color, carried prop, posture, and action distinguish roles.
- Mara uses a teal body block, rust scarf, and headwear silhouette.
- Logs, water container, grain, trade good, and tool props appear in-world.
- Paired traders face one another and visibly pass a trade prop; the mill gains an unambiguous repaired brace only from canonical repaired state.
- Chronicle and DOM retain the woodcut/paper typography, causal marks, and factual restraint.
- Cosmetic motion is limited and named. River flow may move; it cannot imply production or canonical consequence.

This is neither Minecraft imitation nor high-fidelity character art. Minecraft-like block readability and SimCity-like overview are references for legibility, not copied assets or branding.

## Founder Alpha production path

The accepted candidate uses repository-authored PlayCanvas primitives and no external art payload. Procedural bodies share one rig topology; `humanoidPose` defines all required action classes. Buildings/resources are composed from boxes, cylinders, cones, spheres, and planes. This is deliberately replaceable presentation code, not canonical logic.

Generated planning concepts remain references only. No generated pixel is a production asset.

## Conditional asset escalation

Only escalate if a fresh World Presence reviewer cannot recognize people/tasks after one bounded camera/scale/prop pass. The first escalation is a tightly pruned KayKit Adventurers/Animations/environment subset, because the author-distributed sources are CC0-marked and semantically cover the required actions [S-WP-015] [S-WP-016] [S-WP-017] [S-WP-018].

Before any asset enters the tree:

1. reacquire the exact archive and match the recorded hash;
2. rerun traversal, executable/script, external-URI, and license checks;
3. retain only needed meshes/materials/animations;
4. bind and inspect every retained action in PlayCanvas;
5. optimize and measure desktop/mobile transfer and frame budgets; and
6. commit a provenance manifest beside the asset.

The unoptimized reviewed KayKit subset was about 6.68 MiB and already exceeds the mobile/desktop first-world ceiling before runtime overhead, so whole-pack copying is prohibited [S-WP-021]. Quaternius is rejected for conversion/triangle/source burden; Kenney is the smaller but semantically weaker fallback [S-WP-019] [S-WP-020].

## Inventory ceiling

Founder Alpha permits exactly one settlement composition, eight reusable humanoid rigs, five carried-prop families, eleven animation classes, one Mara identity treatment, and one cosmetic river treatment. Additions must directly repair a failed Gate A/B or World Presence observation and displace comparable work.

No ambience-only illustration, unique full model for each citizen, generalized character creator, animation retargeting pipeline, terrain editor, shader suite, post-processing stack, or asset marketplace is in scope.

## Rejected alternatives

- Sparse abstract markers or static scene dressing: release-blocking presence failure.
- Returning to flat Pixi for the production world: preserves the failed presentation thesis.
- R3F/Three or a dual renderer: unnecessary second stack after the PlayCanvas spike passed.
- Recast/crowd as an art feature: navigation remains an engineering escalation, not visual polish.
- Shipping generated concepts: inconsistent, non-editable, and not provenance-safe.
- Wholesale CC0 packs: license permission does not solve payload, quality, or scope.

## Remaining uncertainty and reopen evidence

Procedural primitives may still read as a prototype, not an inhabited world. Physical mid-tier mobile behavior and independent human task recognition remain unproven.

Reopen after one bounded correction if an unfamiliar reviewer cannot identify settlement, humans, multiple activities, and one interaction/process in ten seconds, or cannot describe several tasks in thirty seconds. Reopen the asset path—not the Reality boundary—if the reviewer answers NO to “Does Riverhold visibly feel inhabited and alive?”

## Resulting implementation behavior and constraint fit

World readability wins over decorative fidelity. The world dominates the screen; contextual DOM explains rather than substitutes for embodied action. No fact depends only on color, motion, camera, or WebGL.

Procedural art, one renderer, no purchased asset, no Blender requirement, no training, no model, and no hosted GPU keep the candidate at $0 and proportionate for a solo builder. The conditional CC0 path is explicitly bounded so it cannot silently turn Founder Alpha into an asset-production project.
