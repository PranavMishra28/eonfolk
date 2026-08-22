# Mobile and weak-device design

**Purpose:** Define the portrait layout, semantic fallback, device degradation, and measured budgets that keep the first slice understandable and playable on mobile and weak devices.

**Status:** IMPLEMENTED CANDIDATE — 390×844 automation passes; real mid-tier device and unfamiliar-observer evidence remain required.

**Authority boundary:** This document owns mobile composition, touch behavior, weak-device degradation order, and device evidence. [Interaction](INTERACTION.md) owns cross-input action semantics; [design](DESIGN.md) owns visual grammar.

**Related documents:** [Art directions](ART_DIRECTIONS.md), [motion and sound](MOTION_SOUND.md), [visual-direction research](../research/DESIGN_RESEARCH.md).

## Owned decision

Mobile is a composed portrait version of the same world and Chronicle, not a compressed desktop sidebar layout. The living world occupies at least 55% of the initial 390 × 844 view. Focused information uses one bottom sheet at a time; every consequential action remains available through semantic DOM and through a fully playable list/map fallback.

The 390 × 844 R3F spike showed controls overflowing and a panel dominating the scene. That layout fails even though its measured frame time was inside the mobile ceiling. The implementation must prove composition as well as speed.

## Initial portrait composition

At first arrival, useful fact-safe semantic/static content paints before the lazy PlayCanvas world:

- world: top 55–70%, including well, bridge/entry vector, Mara, and one visible interaction;
- Mara's name/action appears by two seconds and **Follow Mara** is usable by three seconds without layout shift;
- orientation/action rail: compact semantic region that does not cover citizens;
- no open identity card, log, stats grid, or permanent relationship panel; and
- safe-area insets applied without shrinking touch targets.

When the player follows/opens Mara, the first peek is no taller than 35% of usable viewport. A deliberate Inspect may become the single reading surface. It has three states:

- **peek:** name, current action, current tension, autonomy line, local-save notice, and one primary action; no scroll;
- **inspect:** identity, Standing Plan, relationships, visible facts;
- **decide:** one counsel flow with cost and interpretation warning.

Only one state is open. Inspect owns one natural vertical scroll and a sticky 44 px Close control; Decide has sticky Back/Continue. There is no nested scroll. Browser Back closes one sheet level before leaving, and close/back retain Mara selection and scroll state.

Chronicle opens as a deliberate reading surface with a small present-world thumbnail/return action. Each beat fits independently; horizontal carousels are not required. A 9:16 share version reflows the same three authoritative beats and never relies on cropped 16:9 text.

## Locked initial budgets

| Budget | Provisional target | Enforcement |
|---|---:|---|
| Critical shell HTML/CSS/JS | ≤ 200 KB gzip | Blocking |
| Total initial-route JavaScript including lazy world renderer | ≤ 650 KB gzip | Blocking |
| First-world compressed assets | ≤ 6 MB desktop; ≤ 4 MB mobile | Blocking |
| Meaningful world display | ≤ 3 s target Mac/laptop; ≤ 5 s realistic mid-tier mobile/4G | Blocking |
| Desktop frame time with 8 citizens | p95 ≤ 16.7 ms; 60 FPS target | Blocking |
| Mobile frame time with 8 citizens | p95 ≤ 33.3 ms; 30 FPS minimum | Blocking |
| Population | 8 default; practical at 12 | Larger populations excluded |
| Pointer target | ≥ 44 × 44 CSS px | Blocking for consequential actions |

The disposable R3F spike (`4bdef56`) remains historical risk evidence. The later PlayCanvas spike rendered the embodied settlement below 10 ms headed p95 across three emulated profiles, but neither proves a meaningful world display on a real phone, native DPR thermals, battery use, or the integrated player journey [S-WP-014]. No budget is waived.

## Touch and keyboard behavior

- Primary touch targets are at least 44 × 44 CSS px and separated enough to avoid accidental counsel confirmation.
- World selection supports tap with enlarged screen-space hit thresholds and never gates play on pixel-perfect contact. The closest projected inhabitant wins before a place; ambiguous or inaccessible targets remain available through the named **People** and place controls. A pointer gesture is not treated as selection after drag/pinch movement.
- Pan/zoom is optional. No important citizen, fact, counsel, or replay control is reachable only by gesture.
- Bottom sheets provide explicit open/close buttons and do not require drag handles.
- The entire mobile flow remains keyboard-operable for switch devices and external keyboards.
- The on-screen keyboard must not obscure the confirmation action; the first slice should avoid free-form player input.
- Orientation change preserves selected citizen, sheet state, and Chronicle beat.

The implemented citizen/place selection sheet is capped at 35 svh/300 px with a quiet scrim so the world stays visible. The post-orientation decision rail is capped at 35% and scrolls rather than consuming the viewport. Reduced motion removes sheet entrance animation and makes follow-camera changes direct.

## Semantic list/map view

The fallback is a first-class playable representation, not an apology screen. It includes:

- settlement summary and current tension;
- ordered list of eight named citizens with current plain-language action;
- resource/place list with current visible state;
- explicit interaction pairs;
- sponsored-citizen identity, relationships, belief labels, and Standing Plan;
- the same bounded counsel actions and validation;
- leave/return summary; and
- Chronicle beats, evidence disclosures, causal relation labels, and replay stepping.

It does not need spatial animation, but it must preserve all information required to make the same decision. The player can choose it manually; automatic degradation never traps them there.

## Weak-device degradation order

Apply and measure these steps in order:

1. cap device pixel ratio; reduce shadows, weather, water detail, paper filters, and nonessential ambience;
2. reduce presentation cadence for background citizens while keeping simulation and focused interaction timing authoritative;
3. replace detailed sprites and causal effects with simplified silhouettes/markers and static state changes;
4. offer or automatically enter the fully playable semantic list/map view after a clear explanation.

At no stage may names, current action, counsel choices, decision outcome, causal category, or Chronicle facts exist only in the canvas. Rendering spike failure triggers simplification before implementation, not a budget waiver.

## Network and persistence behavior

The first slice is local-first. Mobile design assumes no account and no server sync.

- Cache only application-owned, noncredential assets needed for a repeat visit if implementation scope permits.
- Show **Progress stays on this device** in Mara's first peek and again before advice, with **Export save**. Do not imply cross-device continuity or restore/import support.
- Catch-up starts from the last valid local snapshot only after **Advance Riverhold** confirmation and stops at salient boundaries.
- If storage fails, keep the current session usable and disclose that leave/return cannot be guaranteed.
- Do not request notification, location, contacts, camera, microphone, or background permissions.

## Evidence matrix

Capture at 1728 × 1117, 1366 × 768, and 390 × 844:

- first arrival with world dominance;
- sponsored citizen selection and identity legibility;
- visible two-citizen interaction;
- counsel review and confirmation;
- decision outcome in world;
- leave/return summary;
- Chronicle causal chain and manual replay; and
- reduced-motion and semantic-fallback paths.

For mobile, also record:

- no horizontal document overflow;
- no control covered by safe area or bottom sheet; world remains at least 55% through peek;
- 200% text zoom/reflow where applicable;
- touch-target measurements;
- p95 frame time with eight and twelve rendered citizens;
- meaningful-world timing from a cold start under realistic network/CPU conditions; and
- an actual mid-tier mobile device result before claiming mobile performance;
- clustered-target chooser, browser Back, single-scroll ownership, and 100%/200% text journeys; and
- five silent-observer results: 4/5 find Follow Mara, 3/5 identify Mara/three actions/interaction, and 4/5 explain the local-device limit.

## Rejected alternatives

- **Desktop canvas plus permanent bottom dashboard:** Rejected by the spike; it makes the world decorative.
- **Portrait crop of the desktop camera:** Rejected because it hides relationships and wastes the vertical sequence.
- **Canvas-only accessibility overlay:** Rejected because text, focus, zoom, and action equivalence require real DOM.
- **Blocking unsupported-device screen:** Rejected while the semantic world can preserve complete play.
- **Lowering mobile population:** Rejected for the first slice; the same eight citizens are the product proof. Simplify presentation instead.
- **Automatic quality selection with no control:** Rejected; expose a simple quality/fallback choice and remember it locally.

## Evidence that reopens the decision

Reopen if the world cannot retain 55% of the initial portrait view while showing an interaction, if the counsel flow needs a full-screen multi-step wizard, if semantic fallback changes available knowledge or outcomes, or if real-device measurements miss a blocking budget after the full degradation order. A failure may reopen renderer/art density, but not action equivalence or factual access.

## Unproven assumptions

- Eight citizens and an interaction remain legible within the upper portrait field.
- A bottom-sheet inspect flow can expose enough information without feeling like a dashboard.
- PlayCanvas plus the final world assets stays within 4 MB and 33.3 ms p95 on a realistic mid-tier phone.
- A semantic list/map view still feels like the same game.

## Resulting implementation behavior

- Compose and test 390 × 844 from the first UI milestone.
- Build world and semantic representations from the same view model.
- Include real-device evidence before a mobile performance claim.
- Prefer deletion of effects and detail over population, action, Chronicle truth, or accessibility cuts.
- Do not add accounts, sync, push notifications, or deployment to solve local mobile limitations in the first slice.

## Constraint fit

- **Solo / 40–60 hours:** One responsive DOM system, one PlayCanvas world, one bottom sheet, and one semantic fallback avoid a separate mobile application.
- **M4 Pro / no GPU:** All development and emulation remain local; physical-device verification needs no owned GPU infrastructure.
- **Approximately $0:** Browser tooling and a personally available test phone are sufficient; no device farm or paid performance service is assumed.
- **Free V1 / no commercial scope:** Mobile requires no account, subscription, purchase, notification permission, or cross-device service.
- **No training:** Degradation, layout, and accessible output are deterministic application behavior.
