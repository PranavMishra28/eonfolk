# Accessibility

The world renderer is one view of EONFOLK, not the only way to play it. Every
consequential action and fact has a parallel semantic DOM representation.

## Required interaction parity

Keyboard and assistive-technology users can:

- enter the world and select a citizen or place;
- inspect identity, current activity, relationships, facts, and beliefs;
- sponsor or release a citizen;
- counsel or abstain;
- read the return summary and Chronicle;
- step replay controls and navigate back to the relevant world subject; and
- use local feedback and deletion controls.

Focus remains visible, modal focus is contained and restored, and unavailable
actions retain a consistent explanation. No important information exists only
as color, hover state, animation, or pixels inside WebGL.

## Motion and display

Reduced motion disables camera fly-throughs, parallax, nonessential particles,
autoplay cinematic motion, and root smooth scrolling. Chronicle replay remains
manually stepable. The manual preference persists locally even if the operating
system setting is unchanged.

The interface supports narrow portrait layouts, keyboard-only use, forced
colors, normal-text contrast, 200% zoom-equivalent reflow, and at least 44×44 CSS
pixel touch targets for primary actions.

## Weak-device fallback

Degradation is ordered:

1. lower render resolution, shadows, weather, and effects;
2. lower nonessential animation cadence;
3. replace detailed inhabitants with simplified markers; and
4. offer a fully playable semantic list/map view.

Authoritative simulation, counsel, persistence, and Chronicle continue through
every level. Renderer failure is recoverable and cannot corrupt or hide the
world record.

## Reporting problems

Use the accessibility/performance issue form and include the browser, operating
system, input method, viewport, zoom, and reduced-motion/contrast settings when
safe. Do not include private world content without choosing to share it.
