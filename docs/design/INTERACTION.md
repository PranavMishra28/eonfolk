# Interaction design

**Purpose:** Define how the player observes, investigates, counsels, returns, and verifies consequence without turning the world into a control dashboard.

**Status:** ACCEPTED FOR `001-foundation` — must pass keyboard, touch, browser, and fresh-observer evidence.

**Authority boundary:** This document owns interaction hierarchy, control states, semantic alternatives, and Chronicle/replay manipulation. [Design](DESIGN.md) owns appearance; [mobile](MOBILE.md) owns narrow-screen adaptation.

**Related documents:** [Art directions](ART_DIRECTIONS.md), [motion and sound](MOTION_SOUND.md), [visual-direction research](../research/DESIGN_RESEARCH.md).

## Owned decision

Use a world-first interaction model with three deliberate modes—**observe**, **inspect**, and **decide/replay**—rather than omnipresent panels. All consequential actions exist in semantic DOM and remain usable without precision pointing, animation, sound, or WebGL/canvas visibility.

The player never directly puppets movement or routine labor. They gather enough information to issue one high-level counsel, then observe acceptance, refusal, delay, or reinterpretation.

## Interaction contract

### Observe

Default state. The world fills the view, citizens act, and no card blocks the settlement.

Available actions:

- cycle citizen focus;
- open the sponsored citizen;
- inspect a salient world change;
- open the return summary when present; and
- enter Chronicle.

The cursor, focus ring, and touch target must identify selectable citizens and event marks without permanently outlining everything.

### Inspect

Opens a compact identity lens while preserving world context.

The lens shows, in order:

1. name and portrait;
2. current action in plain language;
3. immediate need or tension;
4. current Standing Plan;
5. one or two relevant relationships; and
6. visible facts that justify available counsel.

Beliefs are labeled as that citizen’s belief, not as world truth. Hidden facts never leak through disabled choices, ordering, tooltips, or causal previews.

### Decide

Counsel is a short, staged commitment:

1. choose one typed counsel from the bounded catalog;
2. review known information, cost, and possible interpretations;
3. confirm once; and
4. return to the world to observe the citizen’s independent decision boundary.

The confirmation does not promise compliance. It says explicitly that the citizen may accept, refuse, delay, or reinterpret. Once authoritative, the command cannot be silently edited; any undo during development is a debug reset outside the player contract.

### Replay

Chronicle begins with a causal story, not a time scrubber. The player can:

- move among three causal beats;
- play or pause a 10–20 second presentation;
- step backward or forward;
- inspect the source event for a factual sentence;
- distinguish direct cause, trigger, contributing condition, predecessor, and allegation; and
- return to the present world at any time.

Replay controls do not change authoritative state.

## Input equivalence

| Important action | Pointer/touch | Keyboard/semantic equivalent |
|---|---|---|
| Select citizen | Tap visible citizen/marker | Navigate named citizen list; `Enter` selects |
| Review identity | Tap portrait/lens | Focus “Open identity”; heading and sections follow DOM order |
| Inspect relationship | Tap carved edge/portrait | Activate named relationship link |
| Give counsel | Tap counsel action | Tab/radio/confirm flow with explicit cost and uncertainty |
| Read return summary | Tap salient beat | Landmark with three ordered beat buttons |
| Navigate Chronicle | Tap frame or edge | Previous/next beat, list of causal links, source-event disclosure |
| Control replay | Tap play/pause/step | Labeled buttons; Space only when the control owns focus |
| Return to present | Tap world/back | “Return to present world” button and predictable focus restoration |

No consequential action depends on hover, drag, double-click, long press, pinch, right-click, key chord, gamepad, or color alone. Optional pan/zoom never gates selection or comprehension.

## Focus and state rules

- Focus order follows: world summary → sponsored citizen → salient change → supporting citizens → primary action → Chronicle/secondary navigation.
- Opening a sheet moves focus to its heading; closing restores focus to the invoking control.
- Selection is not focus. Both can coexist and have visibly different shapes.
- Status announcements use a polite live region for nonurgent changes and an explicit focused alert for command validation failure.
- Ongoing citizen chatter and event streams never flood a live region.
- A rejected counsel is presented as an outcome, not an error toast.
- Loading and catch-up announce phase and completion without exposing raw event counts as the primary story.
- Escape closes a transient popover/sheet, but never discards a staged command without confirmation.

## First-session sequence

### First 5 seconds

World, bridge, well, citizens, and motion. One concise orientation line. No terms wall, model choice, account prompt, dashboard tour, or modal tutorial.

### First 30 seconds

The player can focus a citizen and read a plain-language action. At least one pair visibly interacts. A short prompt invites choosing the person whose tension is most interesting, not optimizing stats.

### By 3 minutes

The sponsored citizen’s identity, values, current plan, two relationships, and one tension are legible. Investigation reveals facts relevant to one bounded counsel.

### By 10 minutes

The player has given one informed counsel, seen the citizen independently interpret it, and observed or anticipated a delayed systemic consequence. The session ends on an unresolved tension with a return affordance, not a checklist of routine chores.

## Chronicle evidence behavior

Every factual sentence has an “evidence” disclosure tied to authoritative event identifiers and participants. Presentation distinguishes:

- simulated fact;
- citizen belief;
- in-world allegation; and
- system inference used only to organize already-authoritative facts.

The player-facing surface uses clear prose first. Identifiers and hashes may appear in an evidence disclosure, never as required reading. The replay can omit unsalient events for pacing but must not reverse, fabricate, or overstate the recorded chain.

## Error and interruption behavior

- Stale command: explain what changed, return to inspection, preserve the player’s uncommitted text-free selection where safe.
- Invalid command: show the violated world rule in plain language; do not send it to cognition or partially apply it.
- Persistence unavailable: keep the current session playable, state that return progress cannot be guaranteed, and offer retry/export only if implemented within scope.
- Catch-up boundary: stop at death, shortage, ownership change, Standing Plan expiry, or other player-relevant shock and invite review.
- Canvas unavailable: switch to the semantic list/map view with identical counsel and Chronicle functions.

## Rejected alternatives

- **Direct unit control:** Rejected because it destroys autonomous interpretation and creates routine micromanagement.
- **Chat-first intervention:** Rejected because unrestricted dialogue is unaffordable, hard to validate, inaccessible to deterministic fallback, and out of first-slice scope.
- **Always-open sidebars:** Rejected because the world must dominate and the mobile spike showed panel takeover.
- **Gesture-first camera:** Rejected because it weakens keyboard access and adds learning before attachment.
- **Undoing disliked consequences:** Rejected as a default because consequence and factual Chronicle are the product; private forks remain future scope.
- **Autoplay-only replay:** Rejected because reduced-motion users and evidence inspection require manual stepping.

## Evidence that reopens the decision

Reopen if:

- fresh observers cannot find the sponsored citizen or a meaningful inspect action in 30 seconds;
- keyboard-only players cannot complete sponsor → inspect → counsel → return → Chronicle without a trap;
- the staged counsel flow takes more than three focused actions after the player has chosen a verb;
- the semantic alternative omits any fact or action needed to make the same consequential choice; or
- player tests treat refusal as a broken command rather than the citizen’s legible decision.

## Unproven assumptions

- Three modes are discoverable without tutorial ceremony.
- A bounded counsel catalog still feels expressive.
- Players tolerate waiting for delayed consequence when the tension is legible.
- Evidence disclosures increase trust without turning play into audit work.

## Resulting implementation behavior

- Build and test semantic controls in parallel with the canvas, not after it.
- Keep one primary action per focused surface and avoid card grids.
- Record browser evidence for pointer, keyboard, reduced-motion, and canvas-degraded paths.
- Treat refusal, delay, and reinterpretation as authored product states with Chronicle traces.
- A passing backend or screenshot cannot substitute for a full observable player journey.

## Constraint fit

- **Solo / 40–60 hours:** Three modes, one counsel flow, one return summary, and one replay avoid a general command system or dialogue interface.
- **M4 Pro / no GPU:** DOM-equivalent interaction remains complete if rendering is reduced or unavailable.
- **Approximately $0:** No account, analytics vendor, hosted model, or paid UI kit is required.
- **Free V1 / no commercial scope:** The flow has no monetization gate or recurring engagement manipulation.
- **No training:** Interpretation is a validated simulation/cognition outcome; interaction never depends on a trained UI model.
