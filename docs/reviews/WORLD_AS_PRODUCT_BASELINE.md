# World-as-product hostile baseline review

**Purpose:** Record an independent hostile baseline of the frozen Founder Alpha
world against the World-as-Product steering override before corrective work.

**Status:** COMPLETE — `NO`; release-blocking World Presence gate failure with
seven P1 findings and one P2 finding.

**Authority boundary:** This review records observations and objections against
one frozen implementation. It does not change Reality, product, design,
engineering, quality, planning, or release authority. Disposition and repair
ownership remain with the coordinator and the authorities mapped by
[INDEX](../INDEX.md).

**Related documents:** [authority index](../INDEX.md), [product](../product/PRODUCT.md),
[human loop](../product/HUMAN_LOOP.md), [Chronicle](../product/CHRONICLE.md),
[design](../design/DESIGN.md), [interaction](../design/INTERACTION.md),
[mobile](../design/MOBILE.md), [motion and sound](../design/MOTION_SOUND.md),
[frontend](../engineering/FRONTEND.md), [performance](../quality/PERFORMANCE.md),
[visual QA](../quality/VISUAL_QA.md), [quality bar](../quality/QUALITY_BAR.md), and
[Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

## Frozen target and independence boundary

| Item | Frozen value |
|---|---|
| Source commit | `ceb58ee0703749375454db894645ecae1022ff82` |
| Source tree | `a40f5ca855685634f3ae3e0f995edd80c04af78f` |
| Commit time | `2026-08-21T18:59:44-07:00` |
| Review branch | `review/world-product-baseline` |
| Review worktree | `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/world-product-baseline` |
| Comparison base | local `main` at `74a8a7e07d0743f467dd9547ebf4193eb53d6029` |
| Compared change | 186 files; 24,248 insertions; 1,459 deletions |

This review read the active repository instructions and the complete
World-as-Product steering override. It did not read another World-as-Product
review. Existing review titles appeared in the authority index, but their
contents did not determine this verdict.

## Method and observed evidence

- Built the exact source commit with `pnpm build`, then served its production
  bundle only on loopback at `http://127.0.0.1:4199/`.
- Opened fresh arrival pages and inspected requested capture sizes 1728×1117,
  1366×768, and 390×844 with the in-app Chromium browser. The browser surface
  applied display scaling: observed CSS viewports were approximately 1920×1241,
  1422×800, and 433×938 respectively. Temporary captures are retained only in
  `/tmp/eonfolk-world-product-*.png`; they are not release evidence.
- Observed the arrival for ten seconds and thirty seconds, followed Mara,
  investigated, offered public counsel, observed Mara reject it, left, returned,
  advanced the world, chose the second action, inspected the three-beat
  Chronicle, and tested a replay-beat selection.
- Inspected the visible accessibility tree, the manual list view, citizen detail
  dialog, rendered canvas geometry, browser console, and relevant presentation,
  camera, spatial, Chronicle, React, and CSS source.
- Browser console warnings and errors were empty in the inspected desktop,
  laptop, and mobile pages.
- The shell runtime was Node `v25.2.1`, while the repository declares Node
  `22.23.1`. The build passed with PlayCanvas worker-thread externalization and
  large-chunk warnings. This review does not convert that unpinned local build
  into release verification.

The reviewer is the unfamiliar observer for this hostile baseline, not a proxy
for the required independent human cohort. Automated semantic labels were used
only to diagnose what the picture failed to communicate; they did not earn a
visual pass.

## Exact World Presence answer

> Does this feel like watching real inhabitants of a place, rather than looking
> at a visualization of a simulation?

**NO.** It feels like a technically faithful visualization of eight simulated
actors on a small model board. The strongest first impression is “a map with
figures,” followed by “a product page beside a diorama.” The figures move and
pose, and one pair passes a parcel, but the fixed view, exposed slab, distorted
building scale, permanent decision rail, repeated micro-routines, and text-led
consequences prevent the scene from reading as a continuous inhabited place.

Under the steering override, anything other than **YES** is P1 and release
blocking. The source commit is therefore **not ready to merge**.

## Ten- and thirty-second hostile read

### Ten seconds

Recognizable immediately:

- a stylized settlement model;
- eight humanoid figures;
- a river strip, several houses, a market-like platform, a mill, and props;
- limb motion and a parcel moving between two central figures.

Not recognizable without text:

- who is walking to which destination;
- which person is gathering water, wood, or grain;
- whether the central pair is trading, arguing, or merely looping an animation;
- what the mill worker is changing;
- why any visible motion matters to Mara's discrepancy.

The settlement and figures pass literal recognition. “Several people doing
different things” and “one meaningful social/economic/world activity” do not
pass as unprompted visual understanding. The black notice supplies the meaning
the choreography should carry.

### Thirty seconds

The scene remains compositionally almost unchanged. Cyclic arm and leg poses,
short travel loops, and the repeating parcel transfer create motion, but not a
legible sequence of intentions, work, results, and resumed plans. A hostile
observer can say “some figures move around,” not reliably “she walked to the
market,” “someone carried wood to storage,” or “the repair changed the mill.”

After counsel, the meaningful result—Mara rejected the advice and one citizen
later endorsed a petition—appears in the notice and decision copy. No visible
gathering, endorsement, avoidance, relationship response, object change, or
institutional activity makes that consequence discoverable in the world.

## Severity summary

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 0 | No authority corruption, destructive action, or false committed result observed |
| P1 | 7 | World-as-Product acceptance blockers |
| P2 | 1 | Valuable presence work that need not block the bounded first repair |

## P1 findings

### WAP-BL-P1-001 — Riverhold is visibly a board, and its physical scale is incoherent

The camera exposes a rectangular `24×25` ground slab, a river terminating at the
slab, empty sky around it, and un-authored edges. Six trees and four tiny houses
do not establish forest, surrounding terrain, unused land, natural boundaries,
a civic place, storage, or distant context. The strongest silhouette is the
edge of the model.

Source dimensions confirm the perceptual mismatch. The citizen rig is scaled
to about 2.5 world units from ground to hat, while a normal house wall is only
1.7 units tall and its door is about 1.14 units tall. Citizens appear nearly as
large as houses and too large for their doors. The river and paths read as flat
strips rather than geography. This fails coherent metre-scale space before art
style is considered.

**Bounded repair:** establish a documented metre convention; correct humanoid,
door, house, road, tree, prop, and workplace occupancy scale; place the existing
core settlement inside a larger authored terrain context; conceal every finite
boundary with water, forest, hills, haze, cliffs, or another plausible edge. Do
not add population or gameplay systems to solve composition.

**Acceptance observations:**

1. A scale audit lists measured world-unit dimensions for a citizen, door,
   house, road, tree, market, mill, and interaction spacing, with ratios visibly
   credible in close and town views.
2. From every allowed overview/orbit extreme at all three target sizes, no
   accidental board edge, cut-off river, void, or flat rectangular slab is
   visible.
3. In an unlabelled ten-second capture, an independent observer says “settlement”
   or “town in a landscape,” not “board,” “map,” “model,” or “diorama.”

### WAP-BL-P1-002 — The fixed camera has no player control, semantic zoom, or fidelity hierarchy

`RiverholdWorld.tsx` creates one camera at `[14,14,18]` with a fixed 41° field of
view. The illustrated canvas exposes no click focus, follow, overview, pan,
orbit, pinch, scroll-zoom, or camera reset behavior. Pointer-wheel and drag
probes did not produce a controllable or repeatable camera state. The source
contains no camera controller.

There is also no semantic zoom. The same houses, citizens, limbs, labels, props,
and scene graph render at every distance because distance cannot change. No
World→Region→Chunk→Place hierarchy, LOD0–LOD3 contract, distance/importance
residency, runtime loading, instancing, or explicit culling policy is exercised.
PlayCanvas frustum culling alone is not the required product system.

**Bounded repair:** add one camera rig with pointer/touch and keyboard-equivalent
pan, zoom, optional constrained orbit, select/focus, Follow Mara, and Return to
Riverhold. Define three tested semantic scale bands and four fidelity classes.
Use a small authored spatial-cell registry for this settlement; no streaming
backend or new region is required.

**Acceptance observations:**

1. At each target size, a player can continuously move from settlement overview
   to normal activity view to Mara follow view and back without losing Riverhold.
2. The three bands visibly change useful information and representation, not
   merely camera distance: far locators/flows, town action readability, close
   pose/prop/reaction detail.
3. LOD0–LOD3 and cell residency are inspectable diagnostics, while changing
   camera or residency leaves canonical hashes, events, and simulation outcomes
   identical.
4. Controls work with mouse, trackpad, pinch/touch-equivalent input, and semantic
   keyboard controls; reduced motion removes camera flight but preserves direct
   navigation.

### WAP-BL-P1-003 — Humanoids exist, but their identity and action grammar do not yet read as people

The switch from markers to full-limbed PlayCanvas figures is real progress:
heads, torsos, arms, legs, body direction, ground contact, color variation, props,
and articulated poses are present. Mara has a teal body, rust scarf, and hat.

At the actual town and mobile views, however, citizens still read as large block
mannequins. Their face-less spherical heads, identical box bodies, identical dark
legs, overscale, and weak silhouettes make most named citizens
indistinguishable. Mara's distinguishing pieces are too small to identify her
without copy. There is no selected highlight because the world cannot select a
citizen. Harsh shadows obscure legs and hand/prop contact.

The eleven required animation class names exist, but classes are mostly four
limb-angle functions without blending, grounded step timing, purposeful speed,
pickup/deposit transitions, rest location, expressive reaction timing, or clear
contact with tools and targets. Merely having a `repair` enum does not make the
mill repair visually understandable.

**Bounded repair:** keep the low-poly approach and improve proportions,
silhouettes, head/hair/outfit/prop distinctions, grounded locomotion, facing,
hand contact, and selected/followed presentation. Author only the animation
transitions needed by the accepted slice; do not seek high-fidelity characters.

**Acceptance observations:**

1. At town scale an independent observer can locate Mara without a giant label,
   distinguish at least four named silhouettes after a short introduction, and
   recognize walk, carry, gather, converse/exchange, and repair from pose plus
   place plus prop.
2. Close follow shows stable foot contact, no visible sliding, correct facing,
   aligned carried/tool props, and an understandable emotional reaction tied to
   the accepted scenario.
3. At 390×844, the normal town scale still exposes recognizable human bodies and
   at least one readable task; it does not reduce everyone to moving specks.

### WAP-BL-P1-004 — Presentation loops demonstrate classes, not physical task choreography

The current projector gives each citizen a fixed start/end pair and a 360-tick
out-and-back routine. A citizen travels for 120 ticks, performs one pose, then
reverses. Props are associated with the routine rather than canonical pickup,
carry, result, and deposit phases. Toma and Iven receive an endlessly cycling
parcel whenever close; the parcel moves between their positions every 90 ticks.

The implementation correctly labels an unsourced arrival exchange as “in
progress; no result claimed” and later links a committed exchange event. That
protects truth semantics. It does not make the activity believable. There is no
physical wood chain, water chain, grain chain, storage transition, queue/slot
occupation, full ledger encounter, or complete repair chain. Blocked volumes
cover only two buildings; authored paths are sparse point edges rather than a
navigation/collision solution for doors, props, bodies, and occupancy.

**Bounded repair:** choose one complete resource task, one exchange, Mara's
ledger inspection, and one repair/consequence. Project explicit semantic phases
from actual task state: travel, approach, wait/slot, work or converse, canonical
result, pickup/change, depart/resume. Keep footsteps and interpolation outside
Reality. Add occupancy, stuck, collision, and action/animation mismatch probes
only for the accepted places.

**Acceptance observations:**

1. In one deterministic capture, an observer can narrate a worker approaching a
   valid point, doing the task, receiving its authoritative result, moving the
   resulting prop, and depositing or using it.
2. Exchange requires both actors to arrive independently, occupy facing slots,
   communicate, transfer exactly one prop at the canonical result boundary,
   react, and separate; the prop cannot loop before or after that result.
3. Repair requires the tool/material, correct work point, repair pose, canonical
   result, and a visible mill state response.
4. Ten-second diagnostics prove meaningful movement, distinct classes, one
   interaction, canonical linkage, prop-phase agreement, no teleport, no blocked
   traversal, no overlap/stuck actor, and recovery after zoom/pause/reload.

### WAP-BL-P1-005 — Text still carries the consequential meaning the world must show

The black world notice tells the observer that Mara and Toma compare a tally,
that Iven exchanged one wood for one food, that Mara continued her plan, and
that an audit petition gained an endorsement. The decision rail explains why.
The scene itself does not visibly communicate the ledger comparison, rejection,
petition endorsement, or relationship/institutional response.

The mill has a canonical repaired-state mesh/color change, which is a valid
projection seam, but the reviewed branch does not make the first consequential
Mara chain spatially legible. The unchanged resource ribbon and generic routines
make “what changed?” a reading task. This reverses the override's Level 1/Level 2
order: human explanation arrives before a visible consequence.

**Bounded repair:** make the accepted Mara scenario produce one visible chain in
the existing world: Mara travels to the tally, inspects the ledger, faces the
relevant person, reacts to the independent decision, and later encounters the
physical petition/institutional consequence. Use a changed prop, participant
congregation, route, avoidance/approach, or place state only where Reality
supports it. Retain the notice as a caption, not the primary evidence.

**Acceptance observations:**

1. With notices and the decision rail temporarily hidden, an observer can point
   to Mara's destination, task, interaction partner, and a later changed object,
   grouping, or behavior.
2. Every consequential visible change names its canonical source in diagnostics;
   in-progress atmosphere cannot imply a committed result.
3. A before/after capture of the chosen scenario visibly differs in the world,
   and Chronicle then explains that already-seen difference.

### WAP-BL-P1-006 — Normal play remains a website beside the world, and selection starts in a list

At desktop and laptop arrival, the world receives about 69% of the horizontal
layout while the permanent decision rail takes the rest. Clicking **Follow Mara**
replaces marketing copy with a full dossier but does not collapse the rail or
let the world expand toward the required 80–90% perceptual emphasis. Large
caption and notice overlays further cover the world.

The canvas is explicitly `aria-hidden` and has no citizen/building raycast or
selection callbacks. Citizen detail is available only by scrolling to
**Riverhold, in words** and selecting a list row. There is no world-first Mara
card, building card, place/resource card, Follow control in world context, or
player-facing Lens model. **People & resources** is a summary sheet, not spatial
selection or an optional world overlay.

On narrow screens the world and complete rail become a long stacked page. After
following Mara, focus/scroll can leave the world mostly or wholly offscreen while
the dossier and semantic list dominate. This is responsive, but not a
world-dominant mobile game with contextual bottom sheets.

**Bounded repair:** after onboarding, collapse the rail into a compact contextual
drawer/bottom sheet and let the world fill the play surface. Add world selection
for citizens and accepted buildings/places, with semantic DOM equivalents and a
compact card. Keep the complete list as a manual/failure fallback. Add only the
People/Activity player lens required for the slice and one deliberate Research
Lens entry point; avoid a generalized overlay framework.

**Acceptance observations:**

1. After **Follow Mara**, world pixels and attention dominate at least 80% of the
   normal desktop/laptop play composition; no permanent marketing/dossier rail
   shrinks Riverhold.
2. Clicking Mara in the world opens a compact card with identity, current task,
   destination, concern, **Follow**, knowledge, and recent life; keyboard/list
   selection opens the same information.
3. Building/place selection exposes only relevant people/state/work; dismissing
   it restores the world with focus preserved.
4. At 390×844, the default world remains visible behind a <=35%-height peek
   sheet, expands/collapses deliberately, respects safe areas, and never requires
   a long webpage scroll for the core loop.
5. Player mode contains no hash, sequence, reducer, protocol, receipt, or event-ID
   detail. One explicit Research Lens reveals evidence without replacing play.

### WAP-BL-P1-007 — Chronicle replay is detached from place and accessibility parity stops at text

The Chronicle's three beats, manual controls, evidence sheet, causality warning,
and reduced-motion behavior are solid semantic foundations. Selecting a replay
beat changes only the Chronicle card. It does not focus the relevant place,
highlight participants, show the affected object, move the camera, or enter a
bounded spatial replay. The world headline and camera remain unchanged.

The manual list view and full `SemanticWorld` provide meaningful text parity,
and the citizen dialog is keyboard reachable from that list. Those are passes.
But the primary world offers no semantic camera controls or canvas selection,
and therefore no keyboard-equivalent focus/follow/overview journey. On mobile,
the text fallback is a long section below the game rather than a compact,
fully-playable list/map mode.

**Bounded repair:** give each retained Chronicle beat a presentation target
(place, participants, affected object, and allowed replay interval). Beat
selection should focus/highlight that target without changing Reality. Provide
semantic controls for overview, zoom scale, next/previous visible citizen,
select, follow Mara, and return; keep reduced-motion replay manually stepable.

**Acceptance observations:**

1. Selecting each Chronicle beat visibly focuses the correct place and people,
   highlights the relevant object, and shows only canonically supported before,
   action, and after states.
2. The complete first journey—including selection, follow, investigation,
   counsel, leave/return, Chronicle navigation, and spatial replay—works by
   keyboard and in list/map mode without information loss.
3. Screen-reader output identifies current semantic camera scale, focus target,
   selected citizen/place, visible consequence, and replay step without
   narrating raw presentation diagnostics.

## P2 finding

### WAP-BL-P2-001 — Sound and Living Woodcut specificity are too weak to support presence

The earthy palette, warm paper UI, strong editorial typography, and crisp graphic
composition are promising. The world itself still resembles generic primitives:
flat untextured boxes, cone trees, harsh near-black shadows, identical materials,
and little authored signage or line/woodcut treatment. No river, footsteps,
work, mill, wind, market, or conversation audio was heard or exposed as a
control.

**Bounded repair:** after P1 composition and interaction are stable, use a small
cohesive material/sign/prop pass and soften shadow behavior. If time permits, add
restrained spatial river plus activity-linked work sounds with mute/volume
controls. Do not add runtime generated art, an asset pack aesthetic, or audio
that implies nonexistent canonical activity.

**Acceptance observations:** branding-off captures are identifiable as the same
Living Woodcut world at all three semantic scales; world sounds correspond to
visible activity, can be independently muted, do not autoplay oppressively, and
remain separate from reduced-motion preference.

## Explicit passes, failures, and uncertainties

### Passes retained

- PlayCanvas/WebGL2 starts successfully and the inspected pages log no browser
  warnings or errors.
- Eight complete humanoid rigs, ground contact, articulated limbs, props, facing
  for the central pair, a moving exchange parcel, and a canonical mill visual
  state seam exist.
- Authoritative action references, event linkage, typed source hashes,
  deterministic presentation ticks, blocked-volume checks, teleport and
  contradiction diagnostics, and the renderer/Reality mutation boundary are
  materially present.
- Manual illustrated/list switching, a full text representation, keyboard
  citizen detail from that representation, reduced-motion control, Chronicle
  stepping, evidence inspection, and semantic decision controls exist.
- Default player copy mostly avoids hashes and reducer/protocol language;
  technical evidence is deliberately deeper than the initial decision.

### Failures

- Physical scale and board-edge concealment: **FAIL**.
- Continuous controllable camera and three semantic scales: **FAIL**.
- LOD/cell/loading hierarchy: **FAIL**.
- Unlabelled character identity and task comprehension: **FAIL**.
- Complete canonical task choreography: **FAIL**.
- Visible first consequence: **FAIL**.
- Post-onboarding world dominance and world selection: **FAIL**.
- Chronicle-to-space linkage: **FAIL**.
- Exact World Presence question: **NO / FAIL**.

### Not run or unresolved

- No separate unfamiliar human performed the required ten-second,
  thirty-second, or Mara tests; those gates remain `NOT_RUN`, not inferred from
  automation.
- Physical mobile touch, pinch, safe-area, thermal, and sustained frame behavior
  remain `NOT_RUN`.
- Screen-reader, forced-colors, and actual 200% browser-zoom journeys remain
  `NOT_RUN`.
- Display scaling prevented exact CSS viewport equality in this browser surface.
  Findings use requested capture sizes, measured CSS geometry, source inspection,
  and visible behavior; they do not pretend the scaled captures are exact
  physical-device evidence.
- The production build passed under Node 25 rather than the pinned Node 22.23.1.
  Pinned-runtime verification remains coordinator-owned.

## Prioritized bounded repair sequence

1. **World frame:** metre-scale audit, larger terrain, natural boundary
   reconciliation, and three authored camera compositions.
2. **World control:** pan/zoom/focus/follow/overview, semantic bands, and minimal
   cell/LOD residency diagnostics without changing Reality.
3. **People and tasks:** correct proportions and silhouettes, then one complete
   resource chain, exchange, Mara inspection, and repair/consequence choreography.
4. **World-first product:** collapse the rail after onboarding, add world
   selection/context cards and one player lens, and convert mobile to contextual
   sheets.
5. **Causal space:** bind Chronicle beats and the first consequence to places,
   participants, objects, and bounded replay.
6. **Parity and polish:** semantic camera/select/replay controls, then targeted
   Living Woodcut material, lighting, and optional sound polish.

Each step should preserve existing protocol, persistence, cognition, Chronicle,
diagnostics, formal, and test work. The repair does not require more citizens, a
new simulation domain, hosted inference, training, deployment, credentials,
payment, or spend. If the complete P1 sequence cannot fit the accepted Founder
Alpha envelope, reduce visual breadth and task count; do not waive the World
Presence question or fake consequential activity.

## Re-review gate

Freeze a new source commit only after every accepted P1 has a targeted temporal
or browser regression. A fresh independent reviewer must use all three target
sizes, observe unlabelled ten- and thirty-second windows, follow Mara through a
real action/consequence sequence, exercise camera and semantic zoom, inspect
mobile/list/keyboard parity, and answer the exact question **YES**. Passing unit,
backend, deterministic, or renderer-start tests cannot substitute for that
observable product evidence.
