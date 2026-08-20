# Design system

**Purpose:** Define the player-facing visual hierarchy and Living Woodcut grammar that the first implementation must exhibit.

**Status:** ACCEPTED FOR `001-foundation` — subject to measured browser and fresh-observer gates.

**Authority boundary:** This document owns visual hierarchy, palette roles, typography behavior, and world/Chronicle continuity. [Art directions](ART_DIRECTIONS.md) owns selection and asset production; [interaction](INTERACTION.md) owns controls and information behavior.

**Related documents:** [Visual-direction research](../research/DESIGN_RESEARCH.md), [motion and sound](MOTION_SOUND.md), [mobile](MOBILE.md), [concept provenance](concepts/README.md).

## Owned decision

EONFOLK should look like a living print making and revising its own historical record. The world remains the primary surface; UI is a temporary interpretive lens. Selection, intervention, causality, and return-from-absence all use the same carved marks, paper ground, citizen portraits, and limited inks.

The visual goal is not “old book.” It is **legible life becoming evidence**.

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

Show a useful semantic/static Riverhold shell immediately, then bridge, well, eight citizens, and three readable actions as Pixi loads. Mara is the single authored focal person. The only opening action is **Follow Mara** with **She acts for herself**; there is no candidate, creation, or roster suggestion.

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
| Wood | forked-stick bundle plus woodpile route; carry/repair pose | “carrying wood” / “repairing well”; prop icon and count |
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
- **Cinematic 3D camera:** Rejected for the first slice because it complicates composition, mobile controls, assets, performance, and evidence replay.
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

- A deliberately sparse print can feel alive with limited motion.
- One larger portrait plus world pose creates enough emotional attachment.
- Players understand carved causal marks after one plain-language example.
- The selected palette remains distinguishable under common color-vision deficiencies and low-quality displays.

## Resulting implementation behavior

- Run the four-hour visual feasibility checkpoint before full simulation/persistence integration; five silent observers use the same manifest and a declared three-of-five legibility threshold.
- Build one world-dominant layout before secondary surfaces.
- Author all factual text in semantic DOM and keep the canvas reproducible from state.
- Treat focus, reduced motion, contrast, zoom, and canvas loss as first-class states.
- Capture browser evidence at 1728 × 1117, 1366 × 768, and 390 × 844 for arrival, selection, crisis, return, and Chronicle.
- If the style misses a budget, remove line density, effects, atlas resolution, and motion before weakening performance or access gates.

## Constraint fit

- **Solo / 40–60 hours:** One grammar serves world, UI, Chronicle, and share output; the system forbids parallel 3D, dashboard, and cinematic treatments.
- **M4 Pro / no GPU:** The 2.5D scene and DOM surfaces are locally authorable and testable.
- **Approximately $0:** No paid font, marketplace UI, asset subscription, or hosted image generation is required.
- **Free V1 / no commercial scope:** The hierarchy serves observation and consequence, with no store, pricing, currency-purchase, or account pressure.
- **No training:** All visible state is authored or deterministically composed from simulation evidence.
