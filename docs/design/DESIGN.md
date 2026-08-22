# Design system

**Purpose:** Define the player-facing hierarchy and embodied Living Woodcut grammar that Founder Alpha must exhibit.

**Status:** IMPLEMENTED CANDIDATE — exact frozen-candidate review and human observer evidence pending.

**Authority boundary:** This document owns visual hierarchy, palette roles, typography behavior, and world/Chronicle continuity. [Art directions](ART_DIRECTIONS.md) owns selection and asset production; [interaction](INTERACTION.md) owns controls and information behavior.

**Related documents:** [Visual-direction research](../research/DESIGN_RESEARCH.md), [motion and sound](MOTION_SOUND.md), [mobile](MOBILE.md), [concept provenance](concepts/README.md).

## Owned decision

EONFOLK should feel like an embodied low-poly settlement whose record is cut into a living print. The world remains the primary surface; UI is a temporary interpretive lens. Physical activity, selection, intervention, causality, and return-from-absence share one restrained earth/ink/river palette and one factual Chronicle grammar.

The visual goal is not “old book.” It is **legible life becoming evidence**.

The higher-priority World-as-Product correction (`21ca7da6f308cbd01510409707760bc7f36fd9e3c08c0a7a681044601e49a863`) rejects the current small-board/fixed-camera/permanent-rail composition. After onboarding, the continuous world must carry roughly 80–90% or more of perceptual emphasis; contextual decisions, selections, lenses, and Chronicle detail overlay it rather than shrinking it.

## Information hierarchy

At any moment, priority is:

1. what citizens are doing and where;
2. what changed or is under tension;
3. who the sponsored citizen is attending to;
4. what the player can knowingly decide;
5. what authoritative evidence supports a consequence; and
6. world ambience and decoration.

World state must remain visible while inspecting one citizen, except on the smallest portrait viewport where the world can yield to a deliberate bottom sheet. The raw event feed is diagnostic evidence, never the primary player experience.

## Visual grammar

### Surface and palette

| Role | Treatment | Meaning rule |
|---|---|---|
| Paper | Warm light ground, quiet grain | Neutral world and reading surface |
| Charcoal | Primary contour and text | Structure; never implies valence |
| River blue | Water, verified flow, direct causal edge | Not used for generic selection |
| Moss | Living production, accepted plans, sponsored accent at low intensity | Never the only acceptance cue |
| Rust | Shortage, refusal, conflict, destructive change | Never used as an unlabeled “bad” score |
| Gold registration mark | Current focus or interactive affordance | Sparing; no persistent glowing outline forest |

All semantic states require shape or text in addition to color. Use solid, double, dotted, and broken edges for causal category; hue may reinforce but never define the category.

### Scale and density

- At default laptop framing, each citizen must retain a recognizable outer silhouette, carried object, and pose.
- Quiet paper replaces hatch marks immediately around faces, hands, resource nodes, interaction points, and selected routes.
- Do not hatch every surface. Dense linework is a focal tool, not an authenticity tax.
- One selected relationship can be drawn in the world. Broader networks belong in a focused relationship lens.
- One event callout may inhabit the world at a time; additional events queue for the Chronicle or return summary.

### Typography

Use a readable system or locally bundled open font with ordinary letterforms for all factual content. Decorative hand-lettering is limited to nonessential section marks if it survives accessibility review. No image-generated text, faux manuscript body copy, or text baked into the canvas.

Minimum targets:

- 16 CSS px body on desktop and mobile;
- 14 CSS px only for secondary metadata with adequate contrast;
- 44 × 44 CSS px minimum pointer target on touch surfaces; and
- line lengths of roughly 45–75 characters for Chronicle prose.

Names, dates, causal types, acceptance/refusal, costs, uncertainty, and actions are always actual DOM text.

## World composition

### First five seconds

Show a useful fact-safe shell immediately, then lazy-load the PlayCanvas/WebGL2 settlement. Within ten seconds an unfamiliar observer must recognize a settlement, several full-limbed people, multiple activities, and an interaction/process without opening a dashboard. Mara is the single authored focal person. The only opening action is **Follow Mara** with **She acts for herself**; there is no candidate, creation, or roster suggestion.

The implementation opens at the primary town/activity scale rather than the distant region scale, with every optional lens closed. Market stalls, carried props, a Reality-owned exchange pair, three travellers, repair/inspect work, and the one event callout establish activity without a feed. Settlement Overview moves outward; Follow Mara moves inward. The authored river, fields, roads, homes, market, mill, well, forest edge, unused land, and boundary hills prevent an accidental exposed board edge.

### Selection

Selection uses four reinforcing cues:

- a gold cut-ring underfoot;
- local hatch quieting;
- one short relationship or attention edge when relevant; and
- a portrait/name/status lens in DOM.

Selection never pauses ordinary world activity by default. It may slow nonessential presentational motion only when reduced motion or reading state requires it.

### Crisis

A crisis is expressed first in the world: barricade, queues, rerouted water, empty resource mark, changed routes, gathering citizens. Red panels and warning banners are insufficient. The player must see the consequence before reading the explanation.

### Return and Chronicle

The absence-return state starts with the changed world and one comprehensible consequence. It then offers exactly three salient beats, each tied to a visible participant/place and a typed causal relation. Opening Chronicle expands those beats into replayable evidence without changing visual language.

Distinguish:

- **direct cause:** solid channeled edge with arrow and “direct” label;
- **trigger:** double-start edge and “trigger” label;
- **contributing condition:** dotted edge and “contributed” label;
- **temporal predecessor:** thin neutral line and “before” label; and
- **in-world allegation:** broken speech-edged line, named speaker, and “alleged” label.

No style may make allegation look authoritative. Replay crops must be generated from recorded state/event presentation, not hallucinated scenes.

### Riverhold visual lexicon

| Meaning | World cue | DOM/reduced/mobile equivalent |
|---|---|---|
| Water | blue bucket/jug plus well route; drink/gather pose | “fetching water” / “drinking”; static before/after count |
| Wood | forked-stick bundle plus woodpile route; carry/repair pose | “carrying wood” / “repairing mill”; prop icon and count |
| Exchange | two citizens face each other; item crosses between hands | named pair, item, and ownership before/after |
| Verify | Mara faces source/artifact; eye-and-tally mark; short pause then changed belief mark | “checking Iven's count”; fact/belief label and receipt |
| Relationship strain/repair | Mara/Toma orientation and distance change; broken or joined carved edge | named band change, rule/event reference, never color alone |

The same pose, prop, orientation, place, motion, before/after mark, and plain-language label repeat across world, return, Chronicle, semantic view, reduced motion, and mobile. Background cadence may slow during reading, but the authoritative action remains visible.

## Component character

Controls are custom DOM components with quiet square or cut-corner geometry, visible focus, and restrained paper/ink surfaces. Use depth only to distinguish a transient sheet from the world. Avoid:

- rows of equal-priority statistic cards;
- pill proliferation;
- gradient glass panels;
- generic fantasy ornament;
- achievement confetti;
- shadcn-default visual identity; and
- texture behind dense reading text.

Icons are supplemental. Every unfamiliar icon has a visible label until the player has learned it through repeated, low-risk use.

## Rejected alternatives

- **Persistent command dashboard:** Rejected because the product asks for rare, consequential intervention, not continuous optimization.
- **Unbounded cinematic camera:** Rejected for the first slice. A bounded player-controlled multiscale camera is required: pan/drag, wheel/pinch zoom, bounded orbit, select/focus, Follow Mara, and return to overview, with region/town/citizen semantic detail rather than one scaled shot.
- **Full-screen character sheet on selection:** Rejected because it erases the autonomous world the player is meant to observe.
- **Logs as Chronicle:** Rejected because sequence alone cannot communicate consequence, causality, uncertainty, or changed relationships.
- **Decorative authenticity over legibility:** Rejected; paper/ink texture must recede anywhere the player reads or acts.

## Evidence that reopens the decision

Reopen the applied grammar if:

- fewer than three of five fresh observers can identify three citizen activities and one social interaction in 30 seconds;
- fewer than three of five can distinguish authoritative causality from allegation after a short Chronicle example;
- the selected citizen’s identity and current tension are not legible within 60 seconds;
- mobile world area falls below 55% before the player deliberately opens a sheet; or
- payload, meaningful-display, or frame budgets require abandoning the paper/ink effects rather than merely simplifying them.
- fewer than four of eight Gate B participants recognize Mara across arrival, decision, return, and Chronicle, or fewer than four express concern/curiosity about her outcome rather than only recall facts.

## Unproven assumptions

- Procedural low-poly bodies and props can feel intentionally alive rather than like an engine prototype.
- One larger portrait plus world pose creates enough emotional attachment.
- Players understand carved causal marks after one plain-language example.
- The selected palette remains distinguishable under common color-vision deficiencies and low-quality displays.

## Resulting implementation behavior

- Run the independent World Presence review on the exact candidate; the reviewer must answer YES that Riverhold visibly feels inhabited and alive.
- Build one world-dominant layout before secondary surfaces.
- Author all factual text in semantic DOM and keep the canvas reproducible from state.
- Treat focus, reduced motion, contrast, zoom, and canvas loss as first-class states.
- Capture browser evidence at 1728 × 1117, 1366 × 768, and 390 × 844 for arrival, selection, crisis, return, and Chronicle.
- If the style misses a budget, reduce pixel ratio, shadows, cosmetic motion, geometry, and distant detail before weakening performance or access gates.

## Constraint fit

- **Solo / 40–60 hours:** One renderer and procedural kit serve world and action proof; the system forbids a parallel renderer, dashboard, character creator, and cinematic treatment.
- **M4 Pro / no GPU:** The PlayCanvas scene and DOM surfaces are locally authorable and testable.
- **Approximately $0:** No paid font, marketplace UI, asset subscription, or hosted image generation is required.
- **Free V1 / no commercial scope:** The hierarchy serves observation and consequence, with no store, pricing, currency-purchase, or account pressure.
- **No training:** All visible state is authored or deterministically composed from simulation evidence.
