# Founder Alpha product and game review

**Purpose:** Record a fresh independent review of the complete Founder Alpha
product/game journey and its likely boredom, confusion, mistrust, and abandonment
points before unfamiliar-human testing.

**Status:** FROZEN-SHA REVIEW COMPLETE — TECHNICAL LOCAL JOURNEYS RUN; HUMAN
PRODUCT GATES NOT RUN; NOT READY WITH FOUR P1 FINDINGS

**Authority boundary:** This review owns findings against the frozen target only.
It does not change product, game, design, engineering, quality, planning, or release
authority; claim and repair disposition remain with the authorities mapped by
[INDEX](../INDEX.md).

**Related documents:** [product definition](../product/PRODUCT.md), [human
loop](../product/HUMAN_LOOP.md), [Chronicle](../product/CHRONICLE.md),
[distribution](../product/DISTRIBUTION.md), [interaction](../design/INTERACTION.md),
[mobile](../design/MOBILE.md), [quality bar](../quality/QUALITY_BAR.md), [Founder
Alpha release boundary](../engineering/FOUNDER_ALPHA_RELEASE.md), and [Founder
Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

## Frozen target and independence boundary

| Item | Frozen value |
|---|---|
| Commit | `7319d59260555ffbe4eb2f4d58beb61d3f8a11ee` |
| Tree | `476c381034ab3601746a7e11235fe693d793782c` |
| Commit time | `2026-08-21T12:47:27-07:00` |
| Review branch | `review/fa-product` |
| Comparison base / local `main` | `74a8a7e07d0743f467dd9547ebf4193eb53d6029` |
| Diff | 114 files; 12,150 insertions; 177 deletions |
| Worktree | `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/002-review-product` |

This review did not read or request another Founder Alpha review output. It
inspected the named authorities, the complete `main...7319d5` diff, relevant
runtime/UI/test code, and the frozen build itself. Older review titles visible in
the authority index were not opened or used as evidence.

## Verdict

**VERIFIED FACT:** The frozen build has a complete and technically coherent path:
Follow Mara, trigger the investigation, advise or abstain, receive a durable
decision receipt, checkpoint, reload/return, explicitly advance, take a
branch-legal second action, inspect a three-beat Chronicle and evidence, copy a
Story Card, and save sanitized feedback locally. The production build, unit
suite, and browser suite pass under the pinned runtime.

**INFERENCE:** It is not ready for an unfamiliar Founder Alpha cohort. The first
mobile action is below the initial viewport, the decision surface withholds exact
state the Gate B clock requires, the fixed scenario maps each offered advice to
the same action while merely asserting Mara's independence afterward, and two
of three first outcomes stop at belief/non-change instead of the required delayed
relationship/resource/institution consequence. Those are gate and core-promise
risks, not optional polish.

**PRODUCT HYPOTHESIS:** The strong opening art direction and clear Mara/Toma
tension may earn initial curiosity. The subsequent sequence may still feel like
a labeled compliance demonstration rather than a living systemic game because
world progression occurs only when the player presses the next proof-step button
and much of the primary copy speaks in implementation terminology.

**UNRESOLVED:** No unfamiliar human supplied evidence about boredom, confusion,
trust, abandonment, attachment, contingency, desire to continue, Story Card
comprehension, or voluntary return. This review therefore reports predicted
hostile-perspective risks, never simulated participant results.

Severity count: **P0: none; P1: four open; P2: three open.** The P0 absence means
the tested local journey was playable and did not fabricate visible authority. It
does not override the open P1 findings or the `NOT RUN` human gates.

## Method and local evidence

1. Read `docs/INDEX.md` first, then the product, human-loop, Chronicle,
   distribution, interaction, mobile, quality, release, and active ExecPlan
   authorities.
2. Inspected the entire `main...7319d5` name/status and size diff, then read the
   actual React flow, projection/runtime, Standard Brain selection, Chronicle,
   Story Card, semantic world, feedback, CSS, and browser tests.
3. Built and exercised the production preview at loopback only. Walked the verify
   path through receipt, the abstention path through reload/return/second
   action/Chronicle/Story Card, and inspected the tested accuse path and all three
   deterministic runtime branches.
4. Inspected desktop at 1425×900 and portrait at 390×844, including accessibility
   snapshots with element bounds and local screenshots. Expanded the feedback
   surface. Checked browser console errors and non-static requests.
5. Applied five hostile readings: nontechnical stranger, systemic-game player,
   AI-native skeptic, 45-second mobile visitor, and creator/streamer.

### Commands and results

| Check | Result |
|---|---|
| Runtime guard under shell-default Node 25.2.1 x64 | Expected precondition stop: pinned Node 22.23.1 arm64 required. Not counted as a frozen-product failure. |
| `pnpm verify:fast` under Node 22.23.1 arm64 / pnpm 11.15.1 | **PASS** — dependency cohort, boundaries, docs, format, lint, 12 typecheck graphs, 20 test files and 124 tests. |
| `pnpm build` | **PASS** — Vite production build; main JS 423.17 kB / 126.48 kB gzip. |
| `pnpm test:e2e` | **PASS** — 9/9 headed browser tests. Network validators recorded 360 routed requests and 39,693 netlog events with zero external attempts. |
| Manual production browser, desktop and 390×844 | **PARTIAL** — journey completes, zero console errors/warnings and no non-static request; P1/P2 observations below. |

The first dependency installation inherited the shell's x64 architecture, so its
generated `node_modules` could not load arm64 Biome/Rolldown bindings. That
generated directory was moved aside and reinstalled from the frozen lock under
the required arm64 runtime before the reported passes. No tracked dependency or
product file changed.

## Journey evidence

| Contract | Technical local result | Human status |
|---|---|---|
| Follow Mara | Desktop CTA is dominant and autonomy copy is explicit. At 390×844 the CTA begins near y=1024, below the initial viewport. | `NOT RUN`; P1-001. |
| Investigate | Clicking **Check why Mara doubts the count** advances 60 simulated seconds, commits state, distinguishes observed/belief/unknown, and exposes an Iven–Toma exchange. | Comprehension and 60-second unprompted completion `NOT RUN`. |
| Advise / abstain | Two intents plus abstain are focusable and dispatch durable commands. Verify and abstention were walked in production; accuse is covered by headed E2E. | Choice comprehension `NOT RUN`; P1-002. |
| Independent interpretation | A typed decision record and receipt exist. Both advice paths in the fixed playable snapshot resolve to the matching action with `accepted`; abstention is `not-applicable`. | Perceived independence/contingency `NOT RUN`; P1-003. |
| Consequence | Accuse changes trust and petition state. Verify changes a sourced belief while trust/public count hold; abstain preserves the plan/trust and leaves uncertainty. | Later-change recall `NOT RUN`; P1-004. |
| Leave / return | Checkpoint is explicit. Reload after leaving recovers directly into changed-world-first return; same-session return has an explicit button. Catch-up requires **Advance Riverhold**. | Voluntary return `NOT RUN`. |
| Chronicle | Three deterministic beats, manual stepping, typed evidence, and allegation boundaries render from authorized events. | Five-second comprehension `NOT RUN`; P2-002. |
| Second action | Each branch exposes only its legal return choices; an illegal cross-branch action is rejected by tests. | Unprompted second-action initiation/motive `NOT RUN`. |
| Story Card | All branches produce card copy; 16:9/9:16 composition toggles and clipboard text work, including a failure fallback. | Context-free comprehension and share intent `NOT RUN`; P2-002. |
| Feedback | Sanitization, redaction, optional diagnostics, image preview, local queue, expiry/delete, and no-relay state are explicit and tested. Nothing reaches the founder in the default build. | Feedback usability and live delivery `NOT RUN`; P2-003. |

## Hostile perspectives

### Nontechnical stranger

The opening answers “who, what tension, what can I do?” unusually well. After the
first click, copy such as **AUTHORITATIVE INVESTIGATION**, **MARA'S DECISION
RECEIPT**, **contributing input**, **typed mechanisms**, **canonical Reality**,
**projection**, and **Standing Plan** makes the interface sound like its test
specification. The stranger is asked to trust taxonomy instead of seeing a plain
human reason and consequence. This is a comprehension/mistrust risk, not evidence
that a person actually became confused.

### Systemic-game player

The eight citizens and resource ledger are present, and one canonical bilateral
exchange occurs. The Pixi scene intentionally has no running presentation loop;
visible systemic progress happens when the player presses the next phase button.
Two of three first branches show no relationship/resource/institution transition.
The systemic player can reasonably read the citizens as a static diagram around
a branching vignette. Whether the bounded vignette is compelling enough remains
human `NOT RUN`.

### AI-native skeptic

The build correctly avoids provider branding, hosted inference, and consciousness
claims. The harder skepticism is behavioral: from the same fixed snapshot,
**Verify privately** yields verify/accepted and **Raise publicly** yields
accuse/accepted; abstention follows the existing plan. A generic post-hoc sentence
then says the suggestion “matched my judgment.” That is technically a Standard
Brain decision, but the player-facing experiment resembles the exact three-row
lookup Gate B is intended to beat. Perceived contingency remains `NOT RUN`.

### 45-second mobile visitor

At 390×844, the world correctly occupies 55% of the portrait, but the two stacked
arrival facts push **Follow Mara** to approximately y=1024. The first viewport
shows the world, headline, and tension but not the only progression action. The
existing browser assertion checks DOM visibility rather than viewport
intersection. This creates an immediate scroll-discovery abandonment risk.

### Creator / streamer

The scene has a distinctive visual identity, the Story Card has responsive ratios,
and the causal beats are compact. The Chronicle labels render as `00:0`, `01:6`,
and `02:12`, which looks broken on capture. There is also no exposed disposable
rehearsal/reset path: after one canonical branch, a creator must know how to clear
IndexedDB or open another browser profile to capture another branch. Copying the
card copies text, while visual sharing relies on manual OS capture as explicitly
scoped. Creator comprehension and willingness to share remain `NOT RUN`.

## P0 findings

None in the tested scope. The local production journey remained playable; no
visible nonauthoritative world/Chronicle state, external request, credential,
account, payment, deployment, or destructive save behavior was observed.

## P1 findings

### FA-PRODUCT-P1-001 — The mobile first action is below the initial viewport

**Evidence:** At 390×844 after authoritative readiness, the world spans y=68–532,
the arrival rail starts at y=518, and **Follow Mara** starts near y=1024. The
mobile screenshot shows only the headline/tension and the beginning of the first
fact at the fold. `tests/e2e/riverhold.spec.ts` uses `toBeVisible()`, which does
not assert initial viewport intersection. This conflicts with the three-second
usable action and ten-second findability contracts.

**Affected files:** `apps/web/src/RiverholdApp.tsx`,
`apps/web/src/styles.css`, `tests/e2e/riverhold.spec.ts`.

**Acceptance / falsification:** In a fresh 390×844 production context, after the
authority-ready mark and without scrolling, the CTA's bounding box intersects the
initial viewport and is focusable/clickable while the illustrated world still
occupies at least 55% of the view. Add a bounding-box regression at 100% and 200%
text. Then run the required unfamiliar-observer findability test; the automated
repair does not constitute that human pass.

### FA-PRODUCT-P1-002 — The counsel frame withholds required decision grounding

**Evidence:** The following frame shows Mara's dossier, exact values,
relationship, belief, and Standing Plan. **Reach the counsel boundary** replaces
that dossier with three choices and only the generic sentences “She trusts Toma”
and “her own values and plan.” Exact values, exact plan, sourced belief, and the
local-save limitation are not present alongside the choices. Gate B starts its
clock only when facts, values, relationships, choices, and equivalent semantic
rows are painted together; the fair-refusal contract also requires relevant
known reasons before confirmation.

**Affected files:** `apps/web/src/RiverholdApp.tsx`,
`apps/web/src/styles.css`, `tests/e2e/riverhold.spec.ts`.

**Acceptance / falsification:** The counsel-ready desktop and mobile frame must
show, in plain language, the observed mismatch, Mara's relevant value(s), exact
Standing Plan, Toma relationship, uncertainty, all three choices/stakes, and the
browser-local limitation without requiring a sheet or losing the primary action.
An automated test must assert those items are simultaneously visible/focusable;
Gate B comprehension remains `NOT RUN` until unfamiliar humans run it.

### FA-PRODUCT-P1-003 — The fixed journey asserts independence while advice maps one-to-one to action

**Evidence:** `standard-brain.ts` adds a 2,700-point counsel-affinity term and
marks matching selection `accepted`. In the fixed runtime, verify counsel chooses
verify, accuse counsel chooses accuse, and abstention continues the plan. The
production verify receipt says “matched my judgment”; the source and browser
tests establish no playable rejection/reinterpretation from the shared snapshot.
The player therefore sees their menu choice execute after a short delay, followed
by an explanation that it was Mara's choice.

**Affected files:** `packages/cognition/src/standard-brain.ts`,
`apps/web/src/authoritative-runtime.ts`, `apps/web/src/RiverholdApp.tsx`,
`apps/web/src/authoritative-runtime.test.ts`, and
`tests/e2e/riverhold.spec.ts`.

**Acceptance / falsification:** Preserve three legal material histories while
making at least one reachable, state-grounded case visibly reject, delay, or
reinterpret counsel for reasons shown before confirmation; do not use randomness
as the reason. Add a production-browser regression that proves requested counsel
and chosen action can differ with the visible state named in the receipt. Only
the randomized unfamiliar-human real-versus-lookup Gate B comparison can
falsify the player-facing mistrust risk.

### FA-PRODUCT-P1-004 — Two branches lack the required delayed world consequence

**Evidence:** Accuse changes Toma trust and petition state. Verify immediately
records a sourced belief while saying trust held and the public count remains
unresolved. Abstain keeps the Standing Plan and trust while uncertainty remains.
The first-session contract requires a delayed relationship, resource, or
institution consequence; a belief change or preserved non-change is not one of
those categories. The resulting verify and abstain cards therefore summarize a
choice and unresolved state more than a consequence.

**Affected files:** `packages/sim/src/transition.ts`,
`packages/sim/src/chronicle.ts`, `apps/web/src/authoritative-runtime.ts`,
`apps/web/src/RiverholdApp.tsx`, `apps/web/src/authoritative-runtime.test.ts`,
and `tests/e2e/riverhold.spec.ts`.

**Acceptance / falsification:** Before checkpoint or at the bounded delayed
resolution, every advice/abstention history must commit and visibly present at
least one branch-specific relationship, resource, or institution transition.
Abstention must still assign the player no causal credit. Tests must assert the
typed pre/post change per branch, and unfamiliar humans must identify the later
change under Gate B.

## P2 findings

### FA-PRODUCT-P2-001 — Proof vocabulary competes with the human story

**Evidence:** Primary-path headings and explanations expose “authoritative,”
“decision receipt,” “contributing input,” “typed mechanisms,” “canonical
Reality,” “projection,” and “Standing Plan.” Technical evidence belongs in the
expandable provenance surface, but this language appears before or around the
main choice/consequence.

**Affected files:** `apps/web/src/RiverholdApp.tsx`,
`apps/web/src/components/SemanticWorld.tsx`,
`apps/web/src/components/Chronicle.tsx`, and
`apps/web/src/authoritative-runtime.ts`.

**Acceptance / falsification:** Rewrite the primary route in ordinary story/game
language while retaining exact technical terms under **Evidence**. No factual or
causal distinction may be lost. Falsify with the Gate B visible-reason/ownership/
later-change questions, not internal approval.

### FA-PRODUCT-P2-002 — The creator artifact has malformed timing and no exposed rehearsal path

**Evidence:** `authoritative-runtime.ts` formats beat time with a zero-prefixed
index and the unpadded product `index * 6`, producing `00:0`, `01:6`, and
`02:12`. The app has no reset/rehearsal control or documented disposable creator
flow; the only tested
way to revisit another canonical branch is a separate profile or direct storage
clearing. Story Card copy and aspect-ratio rendering otherwise work.

**Affected files:** `apps/web/src/authoritative-runtime.ts`,
`apps/web/src/components/Chronicle.tsx`,
`apps/web/src/components/StoryCard.tsx`, `apps/web/src/RiverholdApp.tsx`, and
`tests/e2e/riverhold.spec.ts`.

**Acceptance / falsification:** Render canonical `MM:SS` labels (`00:00`,
`00:06`, `00:12`) with a regression test. Provide a clearly noncanonical,
disposable rehearsal path or an operator-level one-command isolated-profile
procedure that cannot overwrite the canonical save, and prove all three cards at
16:9 and 9:16. Creator usefulness remains `NOT RUN`.

### FA-PRODUCT-P2-003 — The closed feedback action says “Send” when sending is unavailable

**Evidence:** The collapsed CTA is **Report issue / Send feedback**. Opening it
honestly states `Upload: unavailable`, and saving produces an unsent local queue
that the tester can delete but cannot deliver to the founder from the default
build. The privacy boundary is sound; the initial action label creates the trust
risk.

**Affected files:** `apps/web/src/components/FeedbackPanel.tsx`,
`apps/web/src/feedback.test.ts`, and `tests/e2e/riverhold.spec.ts`.

**Acceptance / falsification:** When no relay is configured, label the closed
action and success state as local saving rather than sending, and give the local
operator an explicit safe retrieval/triage procedure if local reports are meant
to inform the alpha. If a relay is ever enabled, retain exact delivery status and
run the separately authorized live provider/usability evidence; it is currently
`NOT RUN`.

## Human evidence boundary

The following remain explicitly `NOT RUN` and cannot be inferred from this local
review:

- Gate 0 desirability/ranking and five-observer visual rubric;
- Gate A activity/interaction/follow/autonomy comprehension;
- Gate B unprompted counsel, visible reason, ownership, later consequence,
  local-save understanding, second-action motive, contingency, and desire to
  continue;
- five-viewer Story Card comprehension;
- nontechnical, systemic-player, AI-skeptic, mobile-visitor, and creator
  abandonment or boredom rates;
- voluntary delayed return, attachment, fun, retention, and share behavior;
- physical mid-tier mobile performance and touch discovery; and
- feedback usability or live relay/provider delivery.

The local production walkthrough is technical reviewer evidence only. It cannot
be entered into any unfamiliar-participant denominator or used to claim a human
gate pass.

## Release recommendation

Do not call the frozen target Founder Alpha ready. Repair and independently
confirm all four P1 findings, retain the three P2 risks or fix them with targeted
tests, rerun the pinned production/browser checks on the repaired exact commit,
and keep every human claim `NOT RUN` until the authorized protocols actually run.
