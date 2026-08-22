# Motion and sound

**Purpose:** Define a restrained motion and sound language that communicates autonomous life, decision boundaries, and factual consequence without obscuring state or exceeding scope.

**Status:** AMENDED FOR WORLD PRESENCE — embodied motion implemented; sound remains deferred.

**Authority boundary:** This document owns motion priorities, reduced-motion behavior, auditory roles, and implementation ceilings. [Design](DESIGN.md) owns visual appearance; [interaction](INTERACTION.md) owns controls and state transitions.

**Related documents:** [Art directions](ART_DIRECTIONS.md), [mobile](MOBILE.md), [visual-direction research](../research/DESIGN_RESEARCH.md).

## Owned decision

Animate embodied Riverhold with clear locomotion, carried props, paired interactions, and action-specific full-limb poses; retain restrained registration/causal reveals in Chronicle. Use no player-controlled or cinematic camera system. Sound, if included, is a bounded local ambience and feedback layer; no voice, generative audio, adaptive score system, or required headphones.

Motion proves autonomy and consequence. It does not decorate inactivity.

## Motion priority

When frame budget or attention is constrained, preserve motion in this order:

1. citizen movement required to understand current action;
2. a two-citizen exchange or disagreement;
3. the sponsored citizen’s decision-boundary response;
4. changed resource/world state;
5. causal-edge reveal during Chronicle;
6. water, weather, smoke, vegetation, particles, paper grain, and other ambience.

Lower-priority motion stops before cadence or clarity of higher-priority motion is weakened.

## Motion grammar

- **Routine action:** the renderer-neutral state graph selects one of eleven named full-limb classes and a visible prop/state at a calm cadence.
- **Locomotion:** fixed-step authored-path translation plus walk/carry gait; foot placement is presentational and never authoritative.
- **Interaction:** both participants orient, pause, and exchange one visible prop/gesture so the event reads without a feed.
- **Selection:** immediate cut-ring and hatch quieting; no looping pulse.
- **Decision boundary:** a brief held pose, then a distinct acceptance, refusal, delay, or reinterpretation mark. Do not use a generic success animation.
- **World consequence:** change the authoritative object/state first; use a short registration snap only to guide attention.
- **Chronicle:** reveal one causal beat at a time, with manual advance always available.
- **View transitions:** short crossfade or cut-shaped wipe. No camera fly-through, parallax tour, or zoom tunnel.

Motion duration is subordinate to response: selection feedback begins within 100 ms; ordinary surface transitions target 120–220 ms; Chronicle emphasis may use up to 400 ms but is skippable.

## Reduced motion

When `prefers-reduced-motion: reduce` is active, or the player enables reduced motion:

- disable camera movement, parallax, autoplay replay, weather movement, nonessential particles, paper shimmer, and looping selection animation;
- slow pose cadence, stop cosmetic river motion, and retain the same route/state; list view provides a no-motion equivalent;
- retain authoritative before/after state and manually stepable Chronicle frames;
- show acceptance/refusal/delay/reinterpretation through text, pose, and static marks;
- do not remove time, state, or consequence information; and
- preserve pause/play/step controls even when autoplay is disabled.

Reduced motion is not a low-quality mode and must be included in browser evidence.

## Sound roles and ceiling

Sound is optional for Gate A and may only enter Gate B if it does not displace product evidence. The maximum first-slice set is:

- one low settlement ambience loop;
- one water loop or local layer;
- up to four quiet action cues shared across behavior families;
- one counsel-commit cue;
- four restrained decision-result cues with no positive/negative moral scoring; and
- one Chronicle page/registration cue.

Use locally owned or clearly licensed files only after item-level provenance review. Do not add a sound marketplace, subscription, synthesized voice, paid library, or online runtime dependency.

Audio rules:

- muted by default only if browser policy requires it; otherwise remember a local volume setting;
- no sudden loudness, startle cue, or critical off-screen-only warning;
- every cue has a visual/text equivalent;
- pause and mute remain available from semantic controls;
- absence return does not autoplay a cinematic sound sequence; and
- allegation, belief, and authoritative fact never receive misleading “truth” stingers.

## Performance rules

- Do not run animation logic faster than visible need; distant/background citizens may update at a reduced visual cadence without reducing simulation cadence.
- Pool transient marks and cap ambience instances.
- Pause nonessential rendering when the page is hidden; simulation catch-up remains authoritative and separate.
- Avoid runtime blur, full-screen displacement, layered noise, and continuous filters until measured headroom exists.
- If p95 misses budget, remove particles/weather, lower visual cadence, and simplify markers before weakening citizen/intervention motion.

## Rejected alternatives

- **Cinematic arrival and crisis cameras:** Rejected for scope, motion access, and because they trade observable systemic space for authored spectacle.
- **Imported full animation library by default:** Rejected because binding/pruning/asset payload would consume the proof budget; the procedural rig covers the gate.
- **Constant ambient movement:** Rejected because it makes consequential change harder to notice and wastes mobile frame time.
- **Voice acting or generated dialogue:** Rejected for cost, provenance, latency, safety, accessibility, and scope.
- **Dynamic generative score:** Rejected; it adds a runtime/model system without proving attachment.

## Evidence that reopens the decision

Reopen if fresh observers cannot notice a two-citizen interaction without reading text, if decision outcomes are mistaken for generic success/failure feedback, or if reduced-motion users cannot understand the same sequence. A frame-budget miss does not reopen the accessibility rules; it forces removal of lower-priority motion.

## Unproven assumptions

- Procedural full-limb poses can make eight citizens feel intentional rather than mechanical.
- Quiet or absent sound will not undermine initial attachment.
- A cut-shaped Chronicle reveal communicates sequence without suggesting unsupported causality.

## Resulting implementation behavior

- Implement meaningful poses before ambience.
- Keep simulation timing independent from render interpolation and reduced-motion state.
- Make Chronicle manual stepping the canonical accessible path; autoplay is a convenience.
- Treat sound as deletable scope until both product gates have working visual evidence.

## Constraint fit

- **Solo / 40–60 hours:** One reusable procedural rig and eleven pose classes avoid imported rigging/retargeting, cinematics, voice, and adaptive scoring.
- **M4 Pro / no GPU:** No offline render pipeline or audio generation is required.
- **Approximately $0:** Silence is a valid shipping state; any sound requires locally verifiable rights and no spend.
- **Free V1 / no commercial scope:** Audio does not gate play or form a purchasable content system.
- **No training:** All motion and sound selection is deterministic and authored.
