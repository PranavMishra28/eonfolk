# Visual and browser QA

**Purpose:** define deterministic browser evidence, manual interaction review, observer walkthroughs, and the visual fix loop.

**Status:** V1 PROCEDURE BINDING — Founder Alpha automated exact-YES gate is historical; V1 uses generated-world journeys; unfamiliar-human gates remain NOT RUN

**Authority boundary:** owns viewport/browser evidence and visual review process. Visual language is owned by future `docs/design/DESIGN.md`; numerical limits by [performance](PERFORMANCE.md); CI retention by [testing](TESTING.md).

**Related documents:** [quality bar](QUALITY_BAR.md), [performance](PERFORMANCE.md), [testing](TESTING.md), [frontend](../engineering/FRONTEND.md), [tool inventory](../research/PROPOSED_TOOLS.md)

## Owned decision

Use the active Browser for exploratory/manual local play and a pinned project Playwright dependency for reproducible implementation journeys and screenshots. Every major UI milestone is inspected at **1728×1117**, **1366×768**, and **390×844**. Canvas screenshots are necessary but insufficient; reviewers also operate the product and inspect semantic DOM, keyboard, console, layout, and factual state.

## Required evidence sequence

For a named commit, seed, browser version, and clean local build:

1. launch with no account/key/model/download;
2. inspect first 5, 10, and 30 seconds before reading instructions;
3. find **Follow Mara** within 10 seconds and state that she acts for herself;
4. within 10 seconds identify a physical settlement, recognizable humans, multiple activities, and an interaction/process; within 30 seconds describe several tasks;
5. inspect identity, value, relationship, tension, local-device notice, and complete state-changing investigation by 60 seconds;
6. give one of two advice intents or abstain by pointer and keyboard;
7. observe acceptance, rejection, delay, or reinterpretation and a later consequence;
8. explicitly leave, reload, confirm catch-up, inspect Chronicle, and take the outcome-dependent next world focus;
9. step the Chronicle/replay and compare its facts/causal wording with authoritative events;
10. inspect the ≤20-second three-beat **Copy story card** for five-second comprehension without a dead link;
11. repeat consequential controls with reduced motion and semantic list/map fallback.

At each viewport capture arrival, Follow/peek, authoritative interaction, advice/tension, branch consequence, absence return/Chronicle/second action, and one weak-device/fallback state. Each manifest includes commit, seed, simulation time, viewport, DPR, physical/emulated device, browser/profile, quality tier, motion mode, UI/focus state, expected action/result, and participant result. Freeze presentation where practical.

## Reviewer questions

### Gate A observers

Without a raw feed or developer narration:

- What are at least three citizens doing?
- Which two citizens interacted, and what visibly changed?
- Are the actors recognizably human, with locomotion/action rather than marker drift?
- Does the settlement dominate the screen, or does UI chrome feel like a dashboard?
- Can the same facts/actions be found when canvas interaction is unavailable?
- Does Riverhold visibly feel inhabited and alive? The release answer must be **YES**.

Five silent unfamiliar observers use the identical manifest; at least three identify the three actions and authoritative interaction. At least four find Follow Mara/understand no direct control. Failure is P1 even if automation locates DOM nodes.

### Gate B participants

- Who is Mara, what does she value, and what tension matters now?
- What did the player ask, how did the citizen interpret it, and what happened later?
- Which causal claims are direct/trigger/contributing versus merely earlier or alleged?
- Which second action is available because of the first outcome, and do you want to take it?
- Does concern/warmth follow Mara across world, portrait, consequence, return, and Chronicle—not just factual recall?
- Can an unfamiliar viewer distinguish advice, Mara's choice, and what followed within five seconds?

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

## Rendering-spike and automated findings

Rejected R3F spike `4bdef56` remains historical risk evidence. The bounded PlayCanvas spike passed the architectural feasibility threshold with eight articulated citizens, six action classes, interactions, WebGL2, and sub-10-ms headed p95 across three emulated profiles [S-WP-014].

The integrated candidate now automates continuous clock advance, three-or-more moving citizens, four-or-more observed classes, an initial interaction, canonical-event linkage after consequential play, WebGL2, ≤1.51 pixel ratio, canvas/host containment, zero teleports, and zero contradictions. It also preserves keyboard, reduced-motion, semantic, renderer-failure, 200% reflow, mobile-first-viewport, and complete player-journey tests. A fresh independent reviewer inspected frozen repaired candidate `90c0ad2` and answered the binding inhabited-place question exactly **YES** with zero P0/P1. Exact implementation head `f818d10` then passed the complete target-Mac three-profile fifteen-run battery and all sixteen illustrated journeys. GitHub Linux [run 32559456985](https://github.com/PranavMishra28/eonfolk/actions/runs/32559456985) separately passed fourteen semantic product journeys plus a blocking trace-free real PlayCanvas/WebGL2 smoke at all three required viewports; screenshots retained in `founder-alpha-ui-32559456985` show eight projected/semantic citizens, active work, exact canvas containment, pixel ratio 1, and zero browser errors/egress. The Linux split is not described as full illustrated-journey coverage, and none of this substitutes for unfamiliar-human or physical-device evidence.

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
