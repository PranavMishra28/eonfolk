# Founder Alpha visual, accessibility, and responsive review

**Purpose:** Independently review the frozen Founder Alpha candidate's visual hierarchy, accessibility, responsive behavior, semantic fallback, Chronicle, Story Card, and feedback experience.

**Status:** COMPLETE — NOT READY; no P0 found, seven P1 findings and one P2 finding remain. Human comprehension, physical-device, and actual 200% browser-zoom claims are `NOT_RUN`.

**Authority boundary:** This review records evidence and objections against one frozen implementation. It does not change product, design, engineering, quality, planning, or release authority; accept/reject/repair dispositions remain coordinator-owned.

**Related documents:** [authority index](../INDEX.md), [Founder Alpha plan](../exec-plans/active/002-founder-alpha.md), [design](../design/DESIGN.md), [interaction](../design/INTERACTION.md), [mobile](../design/MOBILE.md), [motion and sound](../design/MOTION_SOUND.md), [visual QA](../quality/VISUAL_QA.md), [quality bar](../quality/QUALITY_BAR.md), [performance](../quality/PERFORMANCE.md), [Founder Alpha release](../engineering/FOUNDER_ALPHA_RELEASE.md), and [feedback](../engineering/FEEDBACK.md).

## Frozen candidate and method

- Commit: `7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`.
- Tree: `476c381034ab3601746a7e11235fe693d793782c`.
- Review worktree: `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/002-review-visual` on `review/fa-visual`; it was clean before this document.
- The actual `main...7319d59260555ffbe4eb2f4d58beb61d3f8a11ee` diff and affected web source were inspected. No other Founder Alpha review output was read.
- `pnpm build` produced the production bundle, followed by a loopback-only `vite preview` at `http://127.0.0.1:4183/`. The installed runtime was Node `v25.2.1`, not the repository-pinned `22.23.1`; build still passed. Browser evidence used the production preview, not the development server.
- The in-app Chromium browser inspected arrival, counsel, consequence, leave/return, Chronicle, evidence dialog, 16:9 and 9:16 Story Cards, semantic DOM, reduced motion, and open feedback at the required desktop/laptop/mobile sizes. Because the browser surface applied display scaling, CSS viewport dimensions were verified from `innerWidth`/`innerHeight`; the laptop measured `1365x768` rather than `1366x768`, while mobile measured exactly `390x844`.
- Browser DOM/accessibility snapshots, computed layout/style measurements, visible screenshots, console logs, and the observed page-asset inventory were inspected. The asset inventory contained 12 scripts and one stylesheet, all from `127.0.0.1:4183`; console errors/warnings were empty.
- `pnpm test:e2e` passed 9/9 tests in 30.0 seconds. Its independent route/netlog oracle recorded 360 routed requests and 39,751 netlog events with zero external attempts.
- Contrast ratios below use WCAG relative luminance against the authored palette. The 200%-equivalent probe halved available CSS width to expose browser-zoom reflow behavior; actual browser zoom could not be set through this browser surface and therefore remains `NOT_RUN`.
- No unfamiliar person performed the journey. Gate 0, Gate A, Gate B, Story Card five-second comprehension, character/action comprehension, attachment, and feedback usability are `NOT_RUN`, not failed and not passed.

## Verdict

`NOT READY`. The world dominates the desktop and laptop composition and occupies about 60% of the usable initial mobile height; the complete pointer journey, reduced-motion replay stepping, Chronicle evidence dialog, Story Card controls, semantic DOM, and local feedback form are present. Base mobile containment and local-only network behavior pass the inspected probes. Those strengths do not close the blocking access and responsive mismatches below.

### Severity summary

| Severity | Count | Disposition |
|---|---:|---|
| P0 | 0 | Explicitly none found |
| P1 | 7 | Must be repaired and directly regressed before readiness |
| P2 | 1 | Bounded touch friction; repair with the access pass |

## P1 findings

### FA-VA-P1-001 — The mobile arrival hides the only opening action below the first viewport

At `390x844`, the top bar ended at `y=68`, the world occupied `y=68..532` (`464px`, about 59.8% of the remaining viewport), and document width did not overflow (`scrollWidth=clientWidth=373`). However, **Follow Mara** began at `y=1022.7` and ended at `y=1084.7`; it required roughly 179px of scrolling past the viewport before any part of the action appeared. The screenshot showed the world, headline, and only part of the arrival prose, not the opening action. The same action ended at `y=719.9` in the `1365x768` laptop viewport and was visible there.

The narrow layout is also a stacked page, not the contracted one-bottom-sheet composition: `.world-stage` remains `55svh`, then the complete `.decision-rail` follows in normal flow. Following Mara exposes a long dossier rather than a no-scroll peek no taller than 35% of usable height.

- Affected files: `apps/web/src/styles.css`, `apps/web/src/RiverholdApp.tsx`.
- Acceptance tests: at `390x844`, cold arrival shows the complete enabled **Follow Mara** control without scroll while the world retains at least 55% of usable height and no horizontal overflow; following opens one explicit peek at no more than 35% of usable height with Mara, action, tension, autonomy, local-save notice, and primary action; deliberate inspect/decide owns one scroll and explicit close/back behavior.

### FA-VA-P1-002 — Factual text is materially below the repository's 14/16px floor, and 200% coverage is not real browser zoom

Computed arrival text included 8.8px resource labels, 9.92px header/semantic metadata, 10.4px citizen roles, 10.56px eyebrows, 11.52px citizen/action text, and 12px autonomy/semantic facts. Chronicle timing labels measured 9.92–10.88px. On the mobile 9:16 Story Card, place/mark text measured 8.8px, factual beat text 13.6px, and unresolved tension 12px. These are not isolated ornament: citizen activity, causal timing, resource meaning, autonomy, and Story Card facts fall below the design authority's 16px body and 14px secondary targets.

The e2e test named “200% text” sets only `document.documentElement.style.fontSize = "200%"`; many critical declarations are fixed `px`, so that test does not exercise actual browser page zoom. A browser-zoom-equivalent narrow CSS viewport already produced horizontal overflow (`scrollWidth=320`, `clientWidth=250`) because `html` and `body` enforce `min-width:320px`. Actual 200% browser zoom remains `NOT_RUN`.

- Affected files: `apps/web/src/styles.css`, `tests/e2e/riverhold.spec.ts`.
- Acceptance tests: all required factual/body text computes to at least 16px and secondary metadata to at least 14px at default scale; actual 200% browser zoom at every required viewport has no document or component horizontal overflow, clipping, overlap, or lost action; the regression records browser zoom, viewport, and before/after screenshots rather than substituting root-font mutation.

### FA-VA-P1-003 — The critical keyboard journey lacks a visible, distinct counsel focus state and the dialog violates the owned focus contract

Counsel radios are `opacity:0` and `width:0`. The global `:focus-visible` rule targets the hidden input, while no `label:has(input:focus-visible)` or equivalent paints focus on the visible card. The inspected selected radio had width `0`, no visible outline, and focus was represented only by the same card styling used for selection, contrary to the rule that selection and focus have visibly different shapes. The existing “keyboard” e2e covers one initial Tab/Enter and modal trapping, not sponsor → inspect → counsel → return → Chronicle.

Opening evidence details focused **Close details**, not the dialog heading as required. The accessibility snapshot continued to expose the entire page before the modal; background content was neither `inert` nor `aria-hidden`, and body scrolling remained unlocked. Closing did restore the invoking control, and the close-only trap worked.

- Affected files: `apps/web/src/RiverholdApp.tsx`, `apps/web/src/styles.css`, `tests/e2e/riverhold.spec.ts`.
- Acceptance tests: complete the entire critical journey keyboard-only with a captured focus sequence; every counsel option has a >=3px visible card-level focus indicator distinct from checked/selected state; opening each sheet focuses its heading (with the close control next), removes background content from sequential and accessibility navigation, prevents background scroll, Escape closes, and close/Back restores the invoker.

### FA-VA-P1-004 — The semantic representation is present but no selectable or renderer-failure fallback exists

`SemanticWorld` is an always-present region far below the illustrated world. There is no manual “semantic/list view” control, quality/fallback choice, or automatic transition with explanation. **People & resources** opens a compact detail sheet, not the required playable list/map alternative. `RiverholdWorld` starts an async Pixi initialization without a UI error boundary or fallback signal; a renderer initialization failure cannot intentionally promote the semantic representation. The DOM decision rail and Chronicle remain semantic, which is useful, but the owned manual/automatic fallback behavior is absent.

- Affected files: `apps/web/src/RiverholdApp.tsx`, `apps/web/src/components/RiverholdWorld.tsx`, `apps/web/src/components/SemanticWorld.tsx`, `apps/web/src/styles.css`, `tests/e2e/riverhold.spec.ts`.
- Acceptance tests: expose a remembered manual semantic/list-map choice; inject canvas/WebGL initialization failure and show a calm explanation plus the complete semantic world immediately; complete the same counsel, return, Chronicle, evidence, Story Card, and feedback journey without canvas; verify identical available facts/actions and no renderer error in the player-facing live region.

### FA-VA-P1-005 — The illustrated world does not implement the authored character/action and two-person interaction lexicon

The world is spatially dominant (about 69% of laptop width and 60% of initial mobile usable height), but every citizen is composed from the same circle/triangle body with a very small prop and 10/13px Pixi label. Citizens do not orient toward one another, hold distinct readable action poses, or pass a prop between hands. The claimed interaction is communicated primarily by the overlaid world-notice sentence and semantic text; the Mara/Toma line is a generic straight edge without a visible exchange or state-change mark. Source inspection shows no animation loop or authoritative before/after pose; projection changes redraw static generic marks.

This is a technical mismatch with the accepted Riverhold lexicon, not a claim that unfamiliar observers failed. The required human identification and attachment results remain `NOT_RUN`.

- Affected files: `apps/web/src/components/RiverholdWorld.tsx`, with projection fixtures/tests where needed.
- Acceptance tests: frozen screenshots at all three viewports show eight distinguishable silhouettes, readable action pose/prop/place cues, Mara's selection cues, and an explicit named two-citizen exchange/repair with both participants oriented and a transferred or changed authoritative object; then run the already-owned unfamiliar-observer protocol without converting this review into a human result.

### FA-VA-P1-006 — Manual reduced motion leaves root smooth scrolling enabled

The manual toggle correctly adds `reduced-motion`, shortens descendant transitions/animations to `0.001ms`, and disables replay autoplay while preserving Previous/Next. At laptop width, however, the toggled state still computed `html { scroll-behavior: smooth; }`. The selector `.reduced-motion *` cannot reach the root `html` element because the class is on `.app-shell`; only the OS media query fixes root scrolling. A player who uses the in-product control but not the OS preference still receives smooth hash/skip-link scrolling.

- Affected files: `apps/web/src/RiverholdApp.tsx`, `apps/web/src/styles.css`.
- Acceptance tests: with OS preference `no-preference`, enable the in-product control and assert root scroll behavior is `auto`, all nonessential transitions/animations are removed, Chronicle does not autoplay, and manual stepping plus authoritative before/after state remain available; repeat with OS `reduce` and after reload.

### FA-VA-P1-007 — The UNKNOWN fact badge misses normal-text contrast

The `.claim-badge` uses white text on `#837767`, a calculated contrast ratio of approximately `4.38:1`, below the WCAG AA `4.5:1` requirement for its very small 0.52rem text. The badge also violates the repository's text-size floor, but contrast remains independently blocking. Other checked authored pairs passed or narrowly passed: white on river `4.56:1`, white on moss `5.28:1`, and footer soft text on the dark ground `5.04:1`.

- Affected file: `apps/web/src/styles.css`.
- Acceptance tests: automated and manual contrast audit every factual badge, causal relation label, focus ring, disabled state, feedback status, and text/background pair at default and forced-colors modes; all normal text is >=4.5:1 and important non-text/focus boundaries are >=3:1 without relying on color alone.

## P2 finding

### FA-VA-P2-001 — The mobile brand/home link is shorter than the touch-target floor

At `390x844`, the **EONFOLK Riverhold home** link measured about `123x27px`; buttons inherited a roughly 44px minimum height, but the brand link did not. It is not a consequential world action and has a large horizontal target, so this is bounded touch friction rather than a journey blocker.

- Affected file: `apps/web/src/styles.css`.
- Acceptance tests: all interactive targets, including brand/home, Story Card aspect controls, feedback toggle, checkboxes through their labels, and sheet close, expose a measured target of at least `44x44` CSS px at `390x844`, with visible separation and safe-area clearance.

## Explicit passes and uncertainties

- `PASS`: production build; base desktop/laptop/mobile document containment; world spatial dominance at inspected arrival sizes; pointer-driven complete verify branch; Chronicle three-beat navigation and typed evidence dialog; 16:9/9:16 Story Card controls and copy fallback state; reduced-motion replay manual controls; feedback local/upload/offline copy, native labels, responsive single-column form, and no base horizontal overflow; empty console; observed/local network-only assets; project e2e and zero-egress oracle.
- `NOT_RUN`: all unfamiliar-human comprehension, character/action recognition, emotional attachment, five-second Story Card comprehension, feedback usability, physical mobile/touch/safe-area/thermal behavior, screen-reader journey, forced-colors browser journey, and actual 200% browser zoom.
- `UNRESOLVED`: the in-app browser's display scaling made raster screenshots larger than their CSS viewport, so findings use verified CSS geometry plus visual inspection rather than pixel dimensions from the emitted image file. The `1366x768` target measured `1365x768`; this one-pixel width difference is immaterial to the recorded failures but is not represented as exact.
- `UNRESOLVED`: keyboard event injection in the in-app surface could not drive the zero-width radios directly. The focus finding rests on authored CSS/DOM, computed zero-width/no-label-focus state, accessibility snapshots, and the incomplete existing keyboard test; the repair acceptance test requires a genuine end-to-end keyboard and screen-reader rerun.

## Reopen and constraint fit

Reopen this review only against a new frozen commit after each accepted P1 has a targeted regression and the complete relevant journey has rerun at all three viewports. Do not convert automation, screenshots, or this reviewer's visual judgment into Gate 0/A/B/Card evidence. The recommended repairs are local UI/CSS/test changes: they require no deployment, credential, spend, model, new dependency, or change to authoritative Reality.
