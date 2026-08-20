# Visual and browser QA

**Purpose:** define deterministic browser evidence, manual interaction review, observer walkthroughs, and the visual fix loop.

**Status:** ACCEPTED FUTURE IMPLEMENTATION CONTRACT

**Authority boundary:** owns viewport/browser evidence and visual review process. Visual language is owned by future `docs/design/DESIGN.md`; numerical limits by [performance](PERFORMANCE.md); CI retention by [testing](TESTING.md).

**Related documents:** [quality bar](QUALITY_BAR.md), [performance](PERFORMANCE.md), [testing](TESTING.md), [frontend](../engineering/FRONTEND.md), [tool inventory](../research/PROPOSED_TOOLS.md)

## Owned decision

Use the active Browser for exploratory/manual local play and a pinned project Playwright dependency for reproducible implementation journeys and screenshots. Every major UI milestone is inspected at **1728×1117**, **1366×768**, and **390×844**. Canvas screenshots are necessary but insufficient; reviewers also operate the product and inspect semantic DOM, keyboard, console, layout, and factual state.

## Required evidence sequence

For a named commit, seed, browser version, and clean local build:

1. launch with no account/key/model/download;
2. inspect first 5 and 30 seconds before reading instructions;
3. create/select the sponsored citizen within 60 seconds;
4. identify three citizen activities and one interaction;
5. inspect identity, values, relationships, and tension;
6. give one consequential counsel action by pointer and keyboard;
7. observe acceptance, rejection, delay, or reinterpretation and a later consequence;
8. persist/reload, run controlled catch-up, and inspect While You Were Away;
9. step the Chronicle/replay and compare its facts/causal wording with authoritative events;
10. inspect the 10–20 second share artifact for five-second comprehension;
11. repeat consequential controls with reduced motion and semantic list/map fallback.

At each viewport capture arrival, active world/citizen selection, counsel/tension, absence return/Chronicle, and one weak-device/fallback state. Screenshots must not rely on transient random animation: freeze simulation seed/time and presentation motion/camera where practical.

## Reviewer questions

### Gate A observer

Without a raw feed or developer narration:

- What are at least three citizens doing?
- Which two citizens interacted, and what visibly changed?
- Does the settlement dominate the screen, or does UI chrome feel like a dashboard?
- Can the same facts/actions be found when canvas interaction is unavailable?

Failure on the first two is a Gate A P1, even if automation locates DOM nodes.

### Gate B observer

- Who is the sponsored citizen, what do they value, and what tension matters now?
- What did the player ask, how did the citizen interpret it, and what happened later?
- Which causal claims are direct/trigger/contributing versus merely earlier or alleged?
- What unresolved question creates a reason to return?
- Can an unfamiliar viewer understand the share consequence within five seconds?

Vague answers reopen product/Chronicle presentation; a screenshot cannot pass them.

## Visual inspection checklist

- world dominance and citizen readability at all viewports;
- no clipping, horizontal overflow, inaccessible occlusion, tiny target, or unreadable text;
- focus order/ring, semantic name/state, keyboard escape/return, and non-pointer action path;
- reduced-motion removes camera fly-through, nonessential particles, parallax, and autoplay cinematic movement; replay remains manually stepable;
- text contrast, zoom/reflow, status not encoded by color alone, and meaningful empty/loading/error states;
- renderer errors/weak mode leave a usable semantic world;
- Chronicle copy matches event IDs and causal edge types;
- no secret, local path, debug panel, raw provider text, or unrelated browser/account state appears in evidence;
- no shadcn/template/AI-generated visual smell overrides the selected art direction.

## Rendering-spike finding

Disposable R3F spike `4bdef56` exposed a mobile overflow at 390×844 despite acceptable local load and mobile frame-time direction. This is a useful failure, not a waived defect. The implementation must reproduce the mobile viewport early, fix containment/information hierarchy, and capture keyboard/semantic fallback. Desktop p95 was also 17.1 ms, slightly outside the target, so visual QA pairs screenshots with performance traces.

## Fix and rerun loop

Every P0/P1 finding records viewport/device, state/seed, steps, screenshot/trace, expected behavior, affected authority, and owner. After a fix, rerun the smallest targeted reproduction and the complete relevant Gate A/B journey. A visual fix that changes domain behavior triggers simulation/replay tests; a performance simplification triggers the visual review again.

## Resulting implementation behavior

The world is reviewed as a game, not as a component sheet. Automation proves repeatability; fresh humans prove comprehension. Mobile, keyboard, reduced-motion, and renderer-loss paths are exercised before the final milestone rather than added after desktop polish.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Screenshot approval only | Cannot prove interaction, comprehension, focus, or causality |
| Pixel diff as design authority | Environment variance and semantically wrong-but-stable output |
| Manual review only | Poor regression reproducibility |
| Desktop first, mobile after Gate B | The spike already found mobile overflow; late repair can change hierarchy |
| Raw event feed for observer context | Hides whether world behavior and Chronicle are legible |
| Capture all videos forever | Artifact cost/privacy noise; accepted retention is bounded |

## Unproven assumptions and reopen evidence

- **UNRESOLVED:** Playwright/WebGL screenshots are stable in the selected CI environment. Reopen thresholds/capture technique from measured variance, not by dropping inspection.
- **UNRESOLVED:** viewport emulation predicts a physical mobile device. Reopen on real-device touch, thermal, safe-area, or browser-chrome differences.
- **PRODUCT HYPOTHESIS:** an unfamiliar viewer comprehends the share artifact in five seconds. Reopen artifact structure after timed tests.
- **UNRESOLVED:** semantic list/map view remains emotionally compelling. Reopen visual hierarchy if it becomes a debug table.

## Constraint fit

Three viewports, one critical journey, and targeted evidence are feasible for one builder. The process uses available browser capability now and a pinned OSS test dependency later, requires no external service or paid device farm, and makes mobile/accessibility part of the minimal slice.
