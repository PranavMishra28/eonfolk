# World-as-product product and game review

**Purpose:** Record an independent product/game/world-presence review of the
frozen World-as-Product release candidate.

**Status:** COMPLETE — exact answer `NO`; three P1 findings block release and
two P2 findings remain bounded polish work.

**Authority boundary:** This review records observations and objections against
one frozen implementation. It does not change Reality, product, design,
engineering, quality, planning, or release authority. The coordinator owns
disposition and repair in the authorities mapped by [INDEX](../INDEX.md).

**Related documents:** [product](../product/PRODUCT.md),
[human loop](../product/HUMAN_LOOP.md), [Chronicle](../product/CHRONICLE.md),
[design](../design/DESIGN.md), [interaction](../design/INTERACTION.md),
[mobile](../design/MOBILE.md), [frontend](../engineering/FRONTEND.md),
[visual QA](../quality/VISUAL_QA.md), [Founder Alpha
ExecPlan](../exec-plans/active/002-founder-alpha.md), and [hostile
baseline](WORLD_AS_PRODUCT_BASELINE.md).

## Exact release question

> Does this feel like watching real inhabitants of a place, rather than looking
> at a visualization of a simulation?

NO

Riverhold now has a coherent landscape scale, controllable camera, direct
selection, Reality-linked task slots, and genuinely useful semantic parity. It
still reads primarily as a sparse systems visualization: tiny primitive figures
pose on a mostly empty market disk while labels explain what the poses mean.
The return and Chronicle sequence can then show a building-sized occluder or
three visually identical spatial beats rather than the people and consequence
the story describes. Under the binding rule, this answer is P1 and the frozen
candidate is not ready to merge.

## Frozen target and independence boundary

| Item | Recorded value |
|---|---|
| Frozen source | `afdc6e0e68afb54a79445324cd473e9f2a434cda` |
| Frozen tag | `world-as-product-review-candidate-afdc6e0` |
| Review branch | `review/world-product-release-afdc6e0` |
| Review worktree | `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/world-product-release-review` |
| Comparison base | local `main` at review start |
| Reviewed World-as-Product delta | 18 commits after frozen baseline `ceb58ee0703749375454db894645ecae1022ff82` |
| Source edits by reviewer | none |

The reviewer received no other final release review and did not delegate. The
historical baseline was read only after the new viewport walkthroughs, so its
old failure list did not determine the exact answer.

## Method and evidence boundary

- Installed the lockfile strictly from the local pnpm store and ran the frozen
  application on loopback at `http://127.0.0.1:5173/`.
- Observed fresh arrival at 10 and 30 seconds at 1728×1117, 1366×768, and
  390×844. The initial probes reported PlayCanvas ready, three moving citizens,
  one interaction, `carry,exchange,inspect,repair`, zero teleports, zero
  contradictions, no horizontal document overflow, and no browser console or
  page errors.
- Followed Mara through investigation, private-verification counsel, independent
  acceptance, later consequence, leave, return, controlled advance, second
  action, Chronicle, Story Card, and all three **Show in Riverhold** beats.
- Exercised direct citizen picking, detail dismissal, keyboard zoom and Home
  overview, and list view on desktop and mobile. Both probes selected Sela from
  the world, moved 18 m → 14 m → 118 m, opened the semantic world, and reported
  no browser errors.
- Inspected the actual `main...afdc6e0` diff, all 18 World-as-Product commits,
  relevant camera/spatial/presentation source, and `git diff --check`.
- `pnpm build` passed. It warned that the shell used Node `v25.2.1` rather than
  the declared `22.23.1`, externalized PlayCanvas worker-thread imports, and
  emitted a greater-than-500 kB lazy world chunk. This review does not replace
  coordinator-owned pinned-runtime, performance, deep-verification, or egress
  evidence.

Temporary PNGs were used only for this review and are not durable release
artifacts. Representative hashes are:

| Capture | SHA-256 |
|---|---|
| 1728×1117 arrival at 10 seconds | `003c2b8a4444a709f45c8b95c9ebdf8ded1ee425df1a9d6ba7482dc97b49ae7c` |
| 1728×1117 arrival at 30 seconds | `c8bc5766ff0bc0a2d2c4fe7b022f2a70e3db45ed7ada7f4308aff4b8851c7d11` |
| 1366×768 arrival at 10 seconds | `3c885553d940b789c2a9e0cd7d9041c871a30d797d9d93e0f614d68b08c265eb` |
| 1366×768 arrival at 30 seconds | `55bd0fae2dca5464079aba77f6dd085b2c9da1321e9bbc49619226c46be1ff13` |
| 390×844 arrival at 10 seconds | `25fdb0233e24d1f4c563d5c84f35d2748e021c28dbc7ed911797de8f18d5e131` |
| 390×844 arrival at 30 seconds | `4acf6896e12af75ef6fcf5f4b7a347ab6a8dbbabc10635eff56d6088c952d6cc` |
| 1366×768 return before Chronicle | `a97dd76155f5ce48c5110d3014821a4431dc42756e37f134f6154e6501a25aae` |
| 1366×768 Chronicle transition | `85ca98de0417329bc42c4253a100d0a1a9d203f31b892e9a77374fd0820dd931` |

This is an independent automated agent walkthrough, not an unfamiliar human
playtest. It can falsify an obvious presentation pass but cannot satisfy Human
Gate 0, Gate A, Gate B, attachment, fun, or retention evidence. Physical touch,
native mobile thermals, screen reader behavior, sound, and a real 200% browser
zoom journey were not run.

## Ten- and thirty-second hostile read

### Ten seconds

The page clearly communicates a stylized town, a market, houses, roads, Mara's
stakes, and a primary action. The scene contains six on-screen citizen targets
at the sampled overview, but their bodies are small enough that activity is
mostly inferred from the black notice and the panel. The central pair can be
seen as a cluster around props, yet “bilateral exchange” comes from the caption,
not from an unmistakable approach → meeting → transfer → separation sequence.
The other visible figures read as scattered moving pieces, not workers with
understandable destinations and results.

### Thirty seconds

The three activity captures change positions, proving continuity, but the
product read does not become richer. The same large empty market surface,
stalls, figures, and overlays dominate. Without the task labels, the reviewer
could not reliably name gathering, ledger work, exchange, and repair from body,
place, prop, and result alone. This fails the required “several visible tasks”
read even though the diagnostic attributes correctly report four classes.

## Severity summary

| Severity | Count | Release meaning |
|---|---:|---|
| P0 | 0 | No authority corruption, fabricated commit, or destructive behavior observed |
| P1 | 3 | Exact-NO and observable World Presence release blockers |
| P2 | 2 | Bounded presentation debt after the release blockers |

## P1 findings

### WAPR-PROD-P1-001 — The exact World Presence question remains NO

**Evidence:** At all three target viewports, Riverhold is recognizable as a
settlement, but the inhabitants remain small procedural mannequins on a sparse
stage. At the overview, only six of eight citizen pick targets were inside the
world viewport; three were moving and one interaction was reported. The
interaction and task classes are technically present, yet the visual scene does
not make several different intentions, work processes, or outcomes legible
without the caption, decision panel, or semantic list. At 390×844 the same
figures become tiny marks below two persistent camera/control rows.

**Reproduction:** Clear local storage; open the frozen build at each requested
viewport; watch for 10 seconds and then 30 seconds without opening **People**,
**Resources**, **Research lens**, or list view; hide or deliberately do not read
the black world notice. Ask what each visible person is doing and what changed.
The reliable answer is “small figures are moving around a market,” not several
specific tasks plus one consequential process.

**Disposition recommendation:** **ACCEPT / BLOCK.** Preserve the authoritative
task and camera work, but run one bounded visual choreography pass before
another release review. Make three distinct tasks readable through route,
workpoint, tool/prop contact, result, and departure at normal town scale; make
the exchange a one-time visible transfer with clear arrival and separation; and
validate with a fresh unlabelled observer. Do not add systems, citizens, text,
or diagnostic labels to compensate.

### WAPR-PROD-P1-002 — The consequence is still explained beside the world rather than witnessed in it

**Evidence:** After private-verification counsel, the close world shows Mara and
several block figures in action poses, while the panel supplies “She accepted
your counsel,” the recount, and the trust increase. The reviewer did not see an
unambiguous recount, relational response, changed object, changed route, or
grouping that independently communicated the later consequence. The black
notice changes to **Sourced reserve belief recorded**, but this is exactly the
text-first behavior the override intended to reverse. The Reality-linked
exchange transfer is a genuine correctness improvement; it is not the focal
Mara consequence.

**Reproduction:** Follow Mara → check the mismatch → review choices → verify
privately → offer counsel. Cover the right panel and bottom-left notice. Compare
the world before and after the command at 1728×1117 and 1366×768. The resulting
trust/belief change cannot be reliably identified from people, props, places, or
movement.

**Disposition recommendation:** **ACCEPT / BLOCK.** Choose one already
authoritative, branch-specific consequence and stage it physically: Mara and
Iven at a sourced recount with a visible ledger/reserve object, followed by a
different Mara/Toma proximity, posture, or route only where Reality supports
that relationship state. Keep explanatory text as Level 2 evidence after the
visible Level 1 change.

### WAPR-PROD-P1-003 — Return and Chronicle spatial presentation loses or repeats the world

**Evidence:** The automated return journey retained citizen-follow camera state
and produced a frame dominated by one house and its near-black shadow; no
inhabitant or changed process was visible. The initial Chronicle transition did
the same. Clicking **Show in Riverhold** repaired the occlusion by focusing the
market, but all three Chronicle beats then produced visually identical frames,
the same `18.0` m camera distance, and the same `0.0,0.0` target. No selected
participant, affected object, before/action/after state, or beat-specific
highlight distinguished advice, independent choice, and consequence.

**Reproduction:** Complete the private-verification path; leave; return; advance;
ask Mara to publish the verified count; inspect the initial return and Chronicle
frames. Then select beats 1, 2, and 3 and press **Show in Riverhold** for each.
The return begins behind/against a house and the three explicit spatial views
are indistinguishable.

**Disposition recommendation:** **ACCEPT / BLOCK.** Reset or validate camera
visibility at the return boundary, then give each existing typed spatial focus a
distinct bounded composition and visual state: advice participants/place,
Mara's independent decision/action, and the later trust/belief consequence.
Add an occlusion/subject-visible browser assertion and a three-beat visual
nonidentity assertion. Do not invent replayed world state or make Chronicle
authoritative.

## P2 findings

### WAPR-PROD-P2-001 — Persistent control chrome retains dashboard smell

**Evidence:** The world is larger than the baseline and the dossier is now
contextual, but normal play permanently exposes **World pulse**, two boxed rows
of camera/lens controls, **People**, **Resources**, **Routes**, **Research lens**,
**Use list view**, and a bottom-left status block. On 390×844 these controls take
a large fraction of the upper world field before the arrival/follow sheet. The
result feels instrumented before it feels inhabited.

**Reproduction:** Compare the 1728×1117, 1366×768, and 390×844 arrival frames
with branding ignored. Count controls and text blocks before identifying one
citizen task from the world itself.

**Disposition recommendation:** **ACCEPT / BOUNDED POLISH.** Keep keyboard and
semantic parity, but collapse secondary pan/route/research controls behind one
clear world-navigation affordance after onboarding. Preserve **Town overview**,
**Follow Mara**, and list fallback without making the player operate an
observability console.

### WAPR-PROD-P2-002 — World material and character specificity remain prototype-grade

**Evidence:** Corrected proportions and full limbs are real improvements, but
flat primitive buildings, a large uniform market disk, severe near-black
shadows, repeated body topology, and weak facial/role silhouettes keep the
scene generic. At citizen scale, poses can resemble seated or collapsed blocks;
at town scale, identity depends on color and labels. No sound evidence was
reviewed.

**Reproduction:** Follow Mara at 1728×1117 and 1366×768, then compare Mara, Iven,
Toma, and the two nearest figures with their names hidden. Inspect the exchange
and the outcome pose at 18 m.

**Disposition recommendation:** **ACCEPT / DEFER AFTER P1.** Soften shadow
occlusion, break up the market ground, improve four key silhouettes and
hand/prop contact, and add only authored Living Woodcut material/sign cues that
support the retained tasks. Do not import a broad asset pack or expand the
animation inventory.

## Material passes retained

- The finite-board failure is repaired: the overview reads as a town in a wider
  terrain context, and citizen/door/house ratios are credible.
- Direct world picking works on desktop and mobile; selecting Sela opens her
  contextual detail. Keyboard zoom and Home overview move through 18 m, 14 m,
  and 118 m states, and list view remains functional.
- The world is continuous and does not visibly pause behind decision copy. The
  sampled diagnostics report Reality-linked actions, one interaction, zero
  teleports, and zero contradictions.
- Follow makes Mara readable and keeps the world visible behind a compact sheet.
  The local-save and autonomy boundaries are clear without AI branding.
- The counsel, refusal/acceptance contract, causal wording, evidence boundary,
  semantic alternative, and manual Chronicle controls are understandable.
- No browser console/page errors or horizontal overflow appeared in the fresh
  initial probes.

## Release recommendation and limitations

Do not merge `afdc6e0e68afb54a79445324cd473e9f2a434cda` as the World-as-Product
release candidate. Accept all three P1 findings, fix them as one bounded
presentation/camera pass, add the specified observable regressions, freeze a
new SHA, and run one fresh targeted product/visual confirmation with the exact
question. The next review should begin with unlabelled 10/30-second observation
and complete return/three-beat spatial replay before reading diagnostics.

Even after an exact **YES**, the repository must continue to state that human
Gate 0/A/B, real-device mobile, fun, attachment, voluntary return, and retention
remain `NOT RUN` until their actual protocols are completed. An automated
reviewer answer must not be relabeled as human evidence.
