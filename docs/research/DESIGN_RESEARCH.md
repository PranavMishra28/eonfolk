# Visual-direction research

**Purpose:** Preserve the independent, branding-removed comparison of the fifteen generated concepts and the measured rendering evidence that informs the visual decision.

**Status:** COMPLETE FOR PLANNING — all fifteen review images inspected on 2026-08-20; implementation and real-device validation remain outstanding.

**Authority boundary:** This document owns comparative visual evidence and review methodology. [Art directions](../design/ART_DIRECTIONS.md) owns the selected direction; [design](../design/DESIGN.md) owns production-facing visual rules.

**Related documents:** [Concept provenance](../design/concepts/README.md), [interaction](../design/INTERACTION.md), [motion and sound](../design/MOTION_SOUND.md), [mobile](../design/MOBILE.md).

## Owned research conclusion

**INFERENCE:** Living Woodcut is the strongest visual foundation because it makes the simulated world, relationships, causal notation, and Chronicle look like one product rather than a game view with a reporting layer attached. Weathered Atlas is the runner-up. Hearthscale is rejected as the foundation despite superior immediate facial warmth.

The evidence would reopen this conclusion if a small authored Living Woodcut scene fails either of these tests:

- three of five unfamiliar observers cannot identify three citizen activities and one interaction at laptop and mobile sizes; or
- a PixiJS proof with eight citizens cannot meet the locked payload, display-time, frame-time, and semantic-access budgets after the prescribed simplifications.

## Method

The reviewer inspected all five scenes for each direction without names, logos, or marketing copy as decision inputs:

1. first arrival;
2. selected citizen amid market and social activity;
3. political crisis at a blocked well;
4. return from absence flowing into Chronicle causality; and
5. portrait mobile adaptation.

Each criterion is scored from 1 to 5, where 5 is best. For asset burden, dashboard smell, and AI-generated smell, 5 means the least burden or smell. Scores compare these concepts, not finished products. The images are generated planning references, so polish, incidental pseudo-text, facial consistency, and impossible detail were treated as risks rather than production evidence.

## Scorecard

| Criterion | Hearthscale | Living Woodcut | Weathered Atlas |
|---|---:|---:|---:|
| World dominance | 5.0 | 5.0 | 4.5 |
| Character readability | 5.0 | 3.5 | 4.0 |
| Distinctiveness | 2.5 | 5.0 | 3.5 |
| Chronicle integration | 3.5 | 5.0 | 4.5 |
| Mobile viability | 3.0 | 3.5 | 4.0 |
| Low solo asset burden | 1.5 | 3.0 | 2.5 |
| Performance headroom | 2.5 | 4.0 | 4.0 |
| Low dashboard smell | 3.0 | 4.5 | 3.5 |
| Low AI-generated smell | 2.0 | 3.5 | 2.5 |
| **Total / 45** | **28.0** | **38.0** | **33.0** |

Equal weighting is appropriate at this gate: a direction that fails any single criterion can still be disqualified by the product, accessibility, performance, or solo-authoring gates. The five-point gap between Living Woodcut and Weathered Atlas is not statistical evidence; the scene-level observations below are the decision basis.

## Scene findings

### Hearthscale

- **Arrival:** The settlement dominates immediately and daily work is unusually legible. Warm lighting and tangible materials create invitation. The highly detailed miniature construction implies an asset load and lighting burden that a 52-hour slice cannot reproduce honestly.
- **Social:** Selection, relationship, well, market, woodcutting, and gardening can coexist without a raw log. The glowing relationship line and portrait panel feel superimposed instead of native to the world material.
- **Crisis:** Faces and conflict read in one glance. The close cinematic composition stops proving that the autonomous settlement remains active around the conflict.
- **Chronicle:** Physical causal plaques are attractive, but the world and explanation occupy visibly different halves. That reinforces “game plus dashboard.”
- **Mobile:** The world remains charming, but the large identity card and three chunky action tiles consume most of the screen. Rounded faces and uniformly polished surfaces produce the strongest generic mobile-game and generated-image smell in the set.

**Objection:** Hearthscale could maximize early attachment because people, emotions, and occupations are immediately readable. Rejecting it risks trading warmth for graphic distinction.

### Living Woodcut

- **Arrival:** The bounded settlement reads as one authored print, with the bridge creating a strong entry vector. Eight people and their activities are present, but dense hatch lines reduce small-scale character readability.
- **Social:** Limited color, silhouette, scale, and a carved relationship line make selection part of the same visual grammar. The world stays dominant and the relationship clue remains inspectable.
- **Crisis:** The blocked well, diverted water, disagreement, and broken covenant are understandable without a card grid. Citizens look emotionally specific even with a restricted palette.
- **Chronicle:** Branches grow from the same carved ground into three event frames. It is the only concept in which causal explanation feels like the world recording itself.
- **Mobile:** The living world occupies the upper field and the identity/causal material follows as one printed page. Line density and small faces remain the central risks, but the composition avoids a floating analytics dashboard.

**Objection:** Authentic carved linework is labor-intensive. A literal reproduction would fail the solo-builder budget. The selection is therefore a grammar—limited ink, rough contour, paper ground, cut-shaped transitions—not a requirement for hand-engraved detail on every asset.

### Weathered Atlas

- **Arrival:** Geography, settlement boundary, portraits, and the bridge are unusually coherent. Border portraits compete with the living scene before a player has reason to care about them.
- **Social:** Relationship structure and resources are legible, but inset maps, a side graph, compass, crests, and portraits approach a strategy dashboard.
- **Crisis:** It gives the clearest overview of river diversion, farmland, shortage, citizens, and allegations. Generated pseudo-text is conspicuous and would be unacceptable in production.
- **Chronicle:** Colored causal paths and inset scenes work well, although causal notation feels placed on a map rather than emerging from the simulation view.
- **Mobile:** This is the clearest portrait composition in the set. Its painterly environment and portraiture still imply significant authored illustration work, while citizen movement risks resembling counters on a map.

**Objection:** Weathered Atlas may outperform Living Woodcut on weak devices and factual explanation. It remains the fallback if woodcut readability fails, with its parchment dashboard ornament removed.

## Rendering spike evidence

The disposable R3F spike at commit `4bdef56` rendered a representative scene with twelve citizens, eighty instanced props, three houses, selection, and a DOM overlay. It was run at the three required viewport classes. The implementation was intentionally disposable and is not part of the planning branch.

| Evidence | Desktop | Laptop | Mobile viewport |
|---|---:|---:|---:|
| Browser-reported load | 978 ms | 996 ms | 915 ms |
| `requestAnimationFrame` p95 | 17.1 ms | 17.1 ms | 17.3 ms |

- Initial JavaScript was 291.39 KB gzip, within the 650 KB total-route ceiling.
- No application errors appeared; one favicon request returned 404.
- At 390 × 844, controls overflowed and the panel dominated the world.
- The desktop p95 narrowly missed the locked 16.7 ms frame-time target. Mobile viewport timing was comfortably inside the 33.3 ms ceiling, but this was a browser/headless viewport, not a physical mid-tier phone or GPU-throttled result.
- The load numbers are directional, not proof of a meaningful-world display on a real device or 4G connection.

**INFERENCE:** The spike makes 3D plausible, but does not pass the full rendering gate and directly exposes the mobile composition problem. Living Woodcut is inherently 2.5D, so the implementation plan should select PixiJS before application work and must not ship both PixiJS and R3F. This is a renderer implication, not evidence that PixiJS will automatically meet the budgets.

## Implementable reduction

The first slice should prove the direction with:

- one fixed oblique camera and a composed settlement silhouette;
- flat layered sprites on a paper ground, not modeled buildings or dynamic 3D lights;
- a four-ink palette plus paper and a single selection accent;
- reusable contour and hatch masks rather than unique engraving detail;
- eight distinct citizen silhouettes, each with an idle and one clear work pose;
- two-frame locomotion or a restrained cut-paper drift, not skeletal animation;
- DOM text and controls, with the canvas carrying no authoritative text;
- Chronicle frames assembled from recorded event participants, locations, icons, and causal edges rather than generated illustrations; and
- one small authored atlas containing the full first-settlement kit.

Generated concepts must not become production sprites. Authored primitives, icons, silhouettes, and hatch masks are the production source; compression and atlas generation are mechanical build steps.

## Rejected alternatives

- Reject interpreting concept polish as proof that any direction is feasible. None of the images measures authored production effort, input access, real-device behavior, or runtime payload.
- Reject preserving Hearthscale merely because it produces the warmest still frames; its modeled-detail implication contradicts the first-slice budget.
- Reject selecting Weathered Atlas merely because its static causal page is clearest; the product also needs moving citizen life to dominate before explanation.
- Reject averaging all three into a hybrid. That would conceal the tradeoff and create three visual/asset systems for one solo builder.
- Reject treating the R3F spike as a renderer endorsement. It is directional feasibility evidence and a recorded desktop-frame/mobile-layout warning.

## Uncertainties and fastest tests

| Uncertainty | Fast test | Failure response |
|---|---|---|
| Linework hides behavior at laptop/mobile scale | Show a silent 30-second capture to five unfamiliar observers | Enlarge citizens, remove local hatching, raise pose contrast, then retest |
| Woodcut feels cold beside Hearthscale | Ask observers to describe the selected citizen’s emotion and occupation | Add larger portrait vignette and warmer paper/ink contrast without adding 3D |
| PixiJS still exceeds payload or frame budgets | Measure one authored settlement with 8 and 12 citizens | Reduce atlas resolution, weather, cadence, and masks in the locked order |
| Chronicle edges are mistaken for certainty | Test direct, contributing, preceding, and alleged edge styles without labels, then with labels | Simplify styles; never rely on color alone |
| Two-frame motion feels cheap | Compare still-pose interpolation against two-frame cut-paper cycles | Prefer deliberate stillness; do not add a large animation pipeline |

## Resulting recommendation

Adopt Living Woodcut as a deliberately sparse 2.5D visual grammar, Weathered Atlas as the fallback/runner-up, and Hearthscale only as a reference for warmth and facial legibility. Reuse none of the generated pixels in production. The first implementation must earn the style through world readability and causal storytelling, not through volume of texture or animation.

## Resulting implementation behavior

The plan should use one PixiJS world renderer, an authored bounded atlas, semantic DOM for factual content and actions, Chronicle frames reconstructed from authoritative events, and the locked simplification order when measurements miss. It should not carry R3F, generated sprites, 3D assets, painterly scene production, or decorative dashboards into the first slice.

## Constraint fit

- **Solo builder / 40–60 hours:** The direction is reduced to a small atlas, fixed view, eight citizens, limited poses, and DOM explanations. Painterly scenes, modeled dioramas, custom character rigs, and dynamic camera systems are excluded.
- **M4 Pro / no GPU infrastructure:** Authored 2D assets and browser rendering need no training, render farm, or owned GPU service.
- **Approximately $0 / no unapproved spend:** The pipeline uses repository-owned authored assets and local build tools. No marketplace pack, commissioned art, hosted generation, or paid font is required.
- **Free V1 / no commercial dependencies:** Visual behavior is product value, not a monetization surface. No proprietary dataset, partnership, licensing business, payment, or regulated data enters the direction.
- **No training or fine-tuning:** Generated concepts are planning evidence only; production rendering and Chronicle composition are deterministic.
