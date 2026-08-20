# EONFOLK design red team

**Purpose:** Hostilely test whether the frozen visual and product-interface synthesis can guide a solo, approximately 52-hour implementation without losing world dominance, citizen attachment, Chronicle truth, mobile access, or the selected renderer boundary.

**Status:** FROZEN-SYNTHESIS REVIEW COMPLETE — NOT READY; eight P1 findings require reconciliation before implementation.

**Authority boundary:** This review owns objections and recommendations against frozen commit `4f47eae8fe785f3994e053d01c184e9e3dddb401`. It changes no product, design, engineering, quality, decision, risk, question, source-ledger, or execution-plan authority.

**Related documents:** [authority index](../INDEX.md), [design](../design/DESIGN.md), [art directions](../design/ART_DIRECTIONS.md), [interaction](../design/INTERACTION.md), [mobile](../design/MOBILE.md), [motion and sound](../design/MOTION_SOUND.md), [visual research](../research/DESIGN_RESEARCH.md), [frontend](../engineering/FRONTEND.md), [performance](../quality/PERFORMANCE.md), [visual QA](../quality/VISUAL_QA.md), [decisions](../decisions/DECISIONS.md), [first ExecPlan](../exec-plans/active/001-foundation.md).

## Review scope and method

This review inspected only frozen commit `4f47eae8fe785f3994e053d01c184e9e3dddb401`. It did not inspect later branch state or any other discipline red-team artifact.

The review read the frozen authority index; all five design authorities; the concept provenance manifest; all fifteen concept PNGs; visual-direction research; frontend; performance; visual QA; interaction; human loop; Chronicle; decisions; risks; open questions; quality bar; testing; and the complete `001-foundation` plan. The fifteen copied PNG hashes match their manifest rows. No external claim or new source-ledger row is needed for these findings: their evidence is the frozen repository and the images themselves.

Concept inspection treated every image as a planning proposition, never implementation proof. In the selected set, Living Woodcut's arrival, social, crisis, Chronicle, and mobile images were inspected both as a group and at native size. Hearthscale and Weathered Atlas were inspected across the same five scenes.

## Verdict

**INFERENCE — NOT READY.** Living Woodcut remains the best direction, PixiJS-only 2.5D remains the correct implementation choice, and the semantic-DOM boundary is unusually strong. The frozen synthesis still cannot safely hand off to implementation because its owning frontend authority points at R3F and a 3D asset pipeline; its first-minute sponsor state is contradictory; its visual fallback decision is scheduled too late; its authored asset inventory is not credible inside eight hours; and its Gate A, attachment, and Chronicle evidence contracts can pass weaker tests than the decisions require.

There is no P0 in the frozen documentation. There are eight P1s, four P2s, and one P3. A P1 here means the current plan can produce a locally polished build that still fails a binding product, access, performance, scope, or comprehension gate.

| Severity | Findings | Readiness effect |
|---|---:|---|
| P0 | 0 | None found |
| P1 | 8 | Reconcile and verify before implementation |
| P2 | 4 | Bound before or during the named early visual checkpoint |
| P3 | 1 | Clean up during reconciliation |

## P1 findings

### DR-001 — P1: the renderer-owning authority still authorizes the rejected renderer and pipeline

**VERIFIED FACT — location and evidence.** [D-008](../decisions/DECISIONS.md) selects one PixiJS 2.5D renderer and explicitly rejects R3F/Three and a 3D asset pipeline. The [ExecPlan](../exec-plans/active/001-foundation.md) repeats that binding constraint and names a Pixi world. [Art directions](../design/ART_DIRECTIONS.md) requires editable SVG/layered raster sources and a small PNG/WebP atlas. In direct conflict, the authority-owning [frontend document](../engineering/FRONTEND.md) calls R3F provisional, says PixiJS only replaces it conditionally, mandates Blender to GLB/KTX2 production art, and retains unresolved R3F questions. [Performance](../quality/PERFORMANCE.md) likewise budgets “3D assets” and reopens after GLB/KTX2 output. The only renderer measured was R3F, and it missed desktop p95 and overflowed mobile [S-SPIKE-002].

**INFERENCE — failure mechanism.** The index tells an implementer that frontend owns renderer and asset delivery. Following that authority can legitimately scaffold R3F, Three, Blender, GLB, KTX2, shadows, and instancing even though the decision log and ExecPlan prohibit them. That spends bundle, toolchain, asset, and testing budget on a rejected path and destroys the one-renderer handoff.

**Recommendation — minimum fix.** Make frontend final rather than provisional: PixiJS is selected; R3F is historical spike evidence only; production sources are SVG/layered raster and outputs are a small PNG/WebP atlas; no Blender, GLB, KTX2, mesh, material, shadow, fog, or true-3D question remains active. Replace the 3D terms in performance with renderer-neutral first-world atlas/assets. Preserve the R3F numbers only as dated negative evidence.

**Observable browser/visual test.** From a clean implementation checkout, inspect the dependency tree and bundle manifest: no `three`, R3F, GLB, KTX2, or second renderer is present. The three named viewports render the same authored Pixi projection; forced renderer failure leaves the semantic game playable. Record shell/route/atlas bytes and p95 for the Pixi build, not the R3F scratch.

**Affected authorities.** `FRONTEND.md`, `PERFORMANCE.md`, D-008 reconciliation, R-004, Q-005, and `001-foundation.md` evidence wording.

### DR-002 — P1: the first minute has no single sponsor state machine

**VERIFIED FACT — location and evidence.** [Product](../product/PRODUCT.md), [quality bar](../quality/QUALITY_BAR.md), [visual QA](../quality/VISUAL_QA.md), and the [ExecPlan](../exec-plans/active/001-foundation.md) say the player creates/selects or sponsors a focal mind in under 60 seconds. The same ExecPlan specifically says the player sponsors Mara. [Human loop](../product/HUMAN_LOOP.md) opens with Mara already marked by name, desire, and tension. [Interaction](../design/INTERACTION.md) makes “open the sponsored citizen” an Observe action before defining sponsorship. [Design](../design/DESIGN.md) allows either a sponsored candidate or a creation entry point. The concept prompt and all arrival concepts already depict a sponsored citizen.

**INFERENCE — failure mechanism.** “Already sponsored,” “choose one of eight,” “create a mind,” and “sponsor fixed Mara” are different products. They require different copy, events, persistence state, focus order, semantic controls, and art. An implementer can pass the 60-second timer by starting after the decision or waste the slice on character creation that the authored Riverhold fixture does not support.

**Recommendation — minimum fix.** For the 52-hour slice, choose the narrow path: Mara is the fixed authored covenant candidate, not sponsored at fresh launch. The player may inspect the settlement, then activates one clearly labeled semantic `Sponsor Mara` action. That action creates the authoritative covenant and persists it. Remove “create mind” and generic “sponsored citizen” pre-state language from the slice. If choice among eight is retained instead, the authorities must specify why the Mara-only Gate B fixture still applies; no character creator should ship.

**Observable browser/visual test.** In a fresh save at 1728×1117, 1366×768, and 390×844, assert that no covenant exists before input; Mara is labeled as a candidate without implying ownership; pointer and keyboard can inspect and sponsor her; focus and status update after the authoritative event; sponsorship completes in under 60 seconds; reload preserves it; renderer loss permits the identical action.

**Affected authorities.** `PRODUCT.md`, `HUMAN_LOOP.md`, `DESIGN.md`, `INTERACTION.md`, `MOBILE.md`, `QUALITY_BAR.md`, `VISUAL_QA.md`, `TESTING.md`, D-001/D-002 reconciliation, and `001-foundation.md`.

### DR-003 — P1: the decision-changing visual proof is scheduled after expensive implementation work

**VERIFIED FACT — location and evidence.** [Art directions](../design/ART_DIRECTIONS.md) is provisional until authored readability and renderer proof, and D-008/Q-005/R-004 say one authored Pixi scene decides whether Living Woodcut survives. [Milestone 0](../exec-plans/active/001-foundation.md) requires no browser/visual evidence beyond a starting shell. Milestone 1 then spends 20 hours on the complete simulation, persistence adapter, Pixi world, semantic fallback, and browser proof before its rollback switches to Weathered Atlas.

**INFERENCE — failure mechanism.** The first decisive test of line density, citizen size, mobile composition, authored effort, atlas bytes, and Pixi frame time occurs only after the style has been integrated with the whole Gate A surface. A failure then causes re-authoring, layout change, screenshot-fixture change, and possibly renderer integration change inside the same fixed 52 hours. This is precisely the risk the disposable R3F spike was meant to expose early.

**Recommendation — minimum fix.** Add a named Visual Feasibility Checkpoint as the first four hours of the existing Gate A allocation, not extra time. It uses the production source/export path, one representative Riverhold composition, eight rendered citizens plus a twelve-marker stress state, three simultaneous readable activities, one interaction, Mara/Toma identity continuity, the semantic selection path, and the three viewports. Allow one simplification pass, then make the Living Woodcut/stripped-Atlas decision before the rest of Gate A. Count all proof assets and integration time toward the eight-hour art ceiling.

**Observable browser/visual test.** Capture the authored proof at the three named viewports with commit, seed, simulation time, DPR, and quality mode. Five silent observers receive the same 30-second capture with no raw feed or narration. At least three name three activities and the interaction, identify Mara's occupation/tension, and do not call the view a static map. Pixi payload/frame/display measurements pass after no more than one simplification pass, and the hour log supports completing the retained asset set within eight hours.

**Affected authorities.** `ART_DIRECTIONS.md`, `DESIGN_RESEARCH.md`, `PERFORMANCE.md`, `VISUAL_QA.md`, D-002/D-008 reconciliation, R-004/R-005, Q-005, and `001-foundation.md`.

### DR-004 — P1: the frozen observer and screenshot gates can accept a direction that fails its own reopen threshold

**VERIFIED FACT — location and evidence.** D-008, Q-005, [design](../design/DESIGN.md), and [art directions](../design/ART_DIRECTIONS.md) use a three-of-five threshold for Living Woodcut legibility or emotional readability. [Quality bar](../quality/QUALITY_BAR.md) requires only “a fresh observer,” explicitly calls one observer per integration round an unresolved assumption, and Gate B requires only one fresh player's causal account. [Milestone 1](../exec-plans/active/001-foundation.md) records “a silent 30-second observer result” and its done condition is singular. [Visual QA](../quality/VISUAL_QA.md) names states and viewports but does not define a durable screenshot manifest or make raw-feed hiding mandatory.

**INFERENCE — failure mechanism.** One favorable observer can close Gate A even if four of five fail the D-008 decision rule. Screenshots can be cherry-picked at different simulation moments, motion states, DPRs, panel states, or debug visibility. The result is repeatable image capture without repeatable comprehension evidence.

**Recommendation — minimum fix.** Separate cheap iteration from final acceptance: one fresh observer may guide each intermediate pass, but the Visual Feasibility Checkpoint and final Gate A use five silent unfamiliar observers and the declared three-of-five threshold. Require the raw feed and developer narration to be absent, not merely optional. Define an evidence manifest per image with commit, seed, simulation time/event interval, viewport, DPR, browser/device, quality tier, motion mode, UI state, focused element, expected visible actors/action, capture path, and observer protocol/result.

**Observable browser/visual test.** Re-run the same deterministic capture manifest on a clean build; screenshots reproduce the same actors and state. Five randomized, silent viewers answer the fixed Gate A questions before seeing labels beyond ordinary UI. At least three correctly name three activities and one interaction on both laptop and 390×844 presentations. Report all five answers, including failures.

**Affected authorities.** `DESIGN.md`, `ART_DIRECTIONS.md`, `VISUAL_QA.md`, `QUALITY_BAR.md`, `TESTING.md`, D-008 reconciliation, Q-005, and `001-foundation.md`.

### DR-005 — P1: the authored asset ceiling describes more work than its eight-hour abandon trigger permits

**VERIFIED FACT — location and evidence.** [Art directions](../design/ART_DIRECTIONS.md) asks for one ground/water treatment, three buildings plus bridge and well, three resources, eight silhouettes, eight portrait vignettes, four behavior pose pairs, two bespoke action compositions, selection/relationship marks, four causal treatments, texture/hatch families, and ambience. [Visual research](../research/DESIGN_RESEARCH.md) separately asks each citizen to have idle and work poses. D-008/Q-005/R-004 reopen or switch directions if bounded assets exceed eight focused hours. Milestone 1's 20 hours must also implement simulation behavior, persistence, the renderer, semantic fallback, and browser tests.

**INFERENCE — failure mechanism.** The inventory contains at least sixteen identity illustrations before poses, structures, props, states, export, provenance, compression, integration, responsive tuning, and fixes. The generated references make that inventory look deceptively complete. Under the binding clock, the likely outcomes are copied/generated pixels, generic asset-pack substitution, missing states, or an unrecorded hour overrun.

**Recommendation — minimum fix.** Adopt the cut list below as the default inventory, with Mara/Toma as the only large portraits, modular citizen bodies/props rather than eight bespoke work cycles, action compositions assembled from reusable parts, one paper tile, no ambience, and no share-only illustration. Make source authoring, export, atlas build, provenance, integration, and one correction pass all count toward the same eight hours.

**Observable browser/visual test.** Start the art-hour log at the first source mark. From empty authored sources, produce and integrate the retained atlas in at most eight focused hours; record source-to-atlas rows and bytes. The same parts render eight visually distinguishable named citizens, three simultaneous activities, one interaction, Mara/Toma recognition across world/lens/Chronicle, and the 390×844 view without production use of concept pixels.

**Affected authorities.** `ART_DIRECTIONS.md`, `DESIGN.md`, `MOTION_SOUND.md`, D-002/D-008 reconciliation, R-004/R-005, Q-005, and `001-foundation.md`.

### DR-006 — P1: Chronicle has conflicting duration, beat-count, and causal-mark contracts

**VERIFIED FACT — location and evidence.** D-009, [quality bar](../quality/QUALITY_BAR.md), [interaction](../design/INTERACTION.md), Q-004, and the [ExecPlan](../exec-plans/active/001-foundation.md) define a 10–20-second artifact/presentation and three causal beats. [Chronicle](../product/CHRONICLE.md), which owns the Riverhold presentations, specifies a 15–30-second replay whose fixed table runs to 25 seconds across seven visual segments, and its resulting behavior repeats 15–30 seconds. [Design](../design/DESIGN.md) defines five causal categories, while the art inventory budgets only four causal-edge treatments. The generated Chronicle concepts mainly show three attractive panels, not the five-category discrimination test.

**INFERENCE — failure mechanism.** An implementer cannot know whether `next` advances three beats or seven segments, whether the accepted replay may last 25 seconds, or which causal category has no authored treatment. Automation can pass one interpretation while the D-009 five-second artifact test judges another. A visually attractive Chronicle can therefore hide missing taxonomy or become a separate illustrated dashboard.

**Recommendation — minimum fix.** Use one primary three-beat, at-most-20-second presentation across return, replay, and share. Map the twelve Riverhold events into three named beat groups; expose individual event evidence inside each beat rather than promoting seven montage panels. Define five shape-plus-text causal treatments—direct, trigger, contributing, predecessor, allegation—or explicitly define allegation as a separate speech object while still budgeting and testing it. Keep the same `citizenId`, portrait/silhouette keys, place anchors, palette roles, and recorded scene crop across world, beat, and share.

**Observable browser/visual test.** At all three viewports, play from start and assert completion within 20 seconds and exactly three primary focus stops; previous/next/manual controls traverse the same three beats in reduced motion. Expand evidence to reach all underlying RV events. In a monochrome test plate with labels visible, five unfamiliar viewers classify all five relation examples after one explanation; allegation is never mistaken for authoritative fact. The 9:16 output uses the same beat identities without cropping text from 16:9.

**Affected authorities.** `CHRONICLE.md`, `DESIGN.md`, `ART_DIRECTIONS.md`, `INTERACTION.md`, `MOBILE.md`, `VISUAL_QA.md`, `QUALITY_BAR.md`, D-004/D-009 reconciliation, Q-004, and `001-foundation.md`.

### DR-007 — P1: there is no Riverhold action/interaction/relationship lexicon behind the readability gate

**VERIFIED FACT — location and evidence.** [Design](../design/DESIGN.md) requires three readable work silhouettes and allows one selected relationship edge; [motion](../design/MOTION_SOUND.md) gives generic two-pose and interaction grammar; and [art directions](../design/ART_DIRECTIONS.md) budgets behavior-family pose pairs plus one relationship edge. The [ExecPlan](../exec-plans/active/001-foundation.md) names four abstract behavior families—urgent need, role work, exchange/help, and Standing Plan—but no visual authority maps actual Riverhold actions, props, destinations, before/after states, or close-to-strained relationship change to those marks. The Living Woodcut arrival concept shows carrying, market, wood, and crops, but its small repeated silhouettes do not prove the mapping survives sparse authored assets or mobile scale.

**INFERENCE — failure mechanism.** Eight figures may move and still read as undifferentiated wandering. “Urgent need” and “pursue a plan” are not visible poses. A text label can rescue the observer answer while the Gate A premise—life readable without a raw feed—has failed. A generic edge can likewise show that Mara and Toma are linked without showing attention direction, exchange/help, disagreement, or their close-to-strained transition.

**Recommendation — minimum fix.** Add a bounded lexicon for the actual fixture, not every abstract family: draw/carry water; carry/deposit wood; exchange/help with a visible transferred prop; repair/convert with tool plus authoritative object change; verify/review with actor, source, and destination; and Mara/Toma close-to-strained change with participant orientation, one static edge change, and matching DOM text. Every entry defines pose, prop, orientation, place anchor, motion, before/after world mark, concise DOM phrase, reduced-motion state, and mobile marker. Compose these from the cut-list assets; do not add bespoke animation cycles or a general relationship graph.

**Observable browser/visual test.** Freeze deterministic Gate A states that show three different actions simultaneously and a complete two-citizen interaction, then capture laptop and mobile. Freeze Gate B immediately before and after Mara/Toma changes from close to strained. Five silent observers must name the concrete acts, participants, and visible change without a raw feed; at least three pass, and they do not infer a positive/negative moral score from color. Keyboard/semantic mode exposes the same actions, pair, and relationship state from the same presentation projection, not a richer debug model.

**Affected authorities.** `DESIGN.md`, `ART_DIRECTIONS.md`, `MOTION_SOUND.md`, `INTERACTION.md`, `VISUAL_QA.md`, Q-005, R-004, and `001-foundation.md`; the game authority should supply state names but not own presentation.

### DR-008 — P1: “Proof of Attachment” can pass on factual recall without warmth, care, or cross-surface identity

**VERIFIED FACT — location and evidence.** [Product](../product/PRODUCT.md) names responsible curiosity as the desired emotion. Visual research scores Living Woodcut only 3.5/5 for character readability against Hearthscale's 5/5 and explicitly identifies warmth as the selection's main sacrifice. [Art directions](../design/ART_DIRECTIONS.md) assumes larger portraits recover warmth and reopens if observers call the style impersonal, while Q-001/Q-005 ask for identity/tension/occupation recall. The actual [quality bar](../quality/QUALITY_BAR.md) and [ExecPlan](../exec-plans/active/001-foundation.md) can close Gate B when one fresh player recites decision, interpretation, later change, and next concern. None of those requires caring about Mara rather than appreciating the mechanism.

**INFERENCE — failure mechanism.** A sterile token-plus-ledger interface can pass causal comprehension. Generated Living Woodcut references worsen this risk: the focal figure changes apparent sex, coat, and face between arrival, social, mobile, and Chronicle scenes, while the dense line treatment gives buildings more visual identity than citizens. Production could preserve the grammar and still fail the emotional premise.

**Recommendation — minimum fix.** Make attachment evidence distinct from comprehension evidence. Key every citizen's world silhouette, DOM portrait, Chronicle crop, name, coat block, and accessibility description to one identity manifest. At final Gate B, use five fresh sessions: require at least three to recognize Mara across world/lens/return/Chronicle, accurately name her tension and one relationship, and express a person-directed unresolved curiosity or responsibility without being prompted with those words. Record “counter/token/map” descriptions as failure evidence; do not claim retention validation.

**Observable browser/visual test.** Randomize screenshots of Mara and Toma across arrival, identity lens, changed world, Chronicle, and 9:16 share; at least three of five unfamiliar viewers match each person and state the changed relationship. After the complete journey, separately ask factual-chain questions and “what or whom do you want to check next?” The attachment gate fails if responses concern only winning, resource totals, or presentation polish.

**Affected authorities.** `PRODUCT.md`, `ART_DIRECTIONS.md`, `DESIGN.md`, `VISUAL_QA.md`, `QUALITY_BAR.md`, D-001/D-008 reconciliation, Q-001/Q-005, R-001/R-004, and `001-foundation.md`.

## P2 findings

### DR-009 — P2: 390×844 is specified for arrival, not resolved for dense inspect/decide/zoom states

[Mobile](../design/MOBILE.md) strongly reserves 55–70% of initial portrait height for the world and limits selection to one 35–45% bottom sheet, but inspect must contain identity, plan, relationships, and facts, while decide adds cost and interpretation warning. At 200% text zoom this likely becomes a nested-scroll or occlusion problem, and the evidence list does not state which sheet geometry is accepted. Define one scrolling owner, maximum peek height, explicit expand/close buttons, safe-area padding, focus containment/return, and whether inspect may deliberately replace the world at 200% zoom. Add automated geometry assertions for initial, peek, inspect, decide, Chronicle, orientation change, and semantic mode at 390×844.

### DR-010 — P2: accessibility is architecturally strong but its visual pass criteria remain qualitative

Semantic alternatives, keyboard equivalence, focus restoration, live-region restraint, reduced motion, canvas loss, 200% zoom, and 44-pixel touch targets are unusually well specified across [interaction](../design/INTERACTION.md), [mobile](../design/MOBILE.md), [motion](../design/MOTION_SOUND.md), and [performance](../quality/PERFORMANCE.md). The plan still says only “adequate contrast,” “visible focus,” and “accessibility scan,” with no selected contrast/focus standard, forced-colors state, screen-reader/browser pair, or accessibility-tree assertions. Name the implementation standard and test matrix, then capture focus, error, selected, accepted/refused, allegation, and disabled states in normal, reduced-motion, 200% zoom, forced-color/high-contrast, and renderer-loss modes.

### DR-011 — P2: concept hashes are sound, but the claimed exact prompt provenance is not present

The [concept manifest](../design/concepts/README.md) records tool labels, version, output IDs, shared brief, direction clauses, scene clauses, filenames, and hashes; all fifteen file hashes verify. However, it describes a prompt contract rather than preserving each exact prompt string, and the “tool-managed provenance directory” is not identified. This conflicts with `PLAN.md`'s claim that exact prompts were recorded. Because generated pixels are excluded from production, this does not block the renderer, but the planning provenance claim should be narrowed or the exact retrievable prompt/output record should be added. The selected Living Woodcut concepts also violate their own continuity brief in visible ways, reinforcing that hashes prove identity of the references, not truth of their contents.

### DR-012 — P2: the selected reduction can collapse into generic “AI woodcut” or a Chronicle dashboard

Living Woodcut's distinction currently comes from generated density, fluent historical illustration, and dramatic multi-scene composition—the least reproducible parts. The implementable reduction lists paper, contour, limited inks, hatch masks, and cut transitions, which can read as a generic filter. Meanwhile the mobile and Chronicle references use a large identity card plus three equal panels, close to the dashboard grammar the documents reject. Define three product-specific signature motifs that encode simulation rather than period decoration: local hatch quieting around active hands/objects, registration seams that trace typed consequence, and persistent citizen/place marks that survive world-to-Chronicle recomposition. Reject ornamental borders, pseudo-text, portrait medallion walls, and equal-priority stat tiles in the early visual checkpoint.

## P3 finding

### DR-013 — P3: stale “future” labels advertise incomplete synthesis

`FRONTEND.md`, `PERFORMANCE.md`, `VISUAL_QA.md`, and `QUALITY_BAR.md` refer to already-present design, mobile, research, or ExecPlan files as “future.” These labels do not change behavior, but they reinforce the renderer contradiction and make the authority graph look less frozen than `INDEX.md` claims. Remove them during reconciliation and keep ordinary links.

## Contradiction matrix

| Concern | Frozen statement A | Frozen statement B | Failure if unresolved | Required resolution |
|---|---|---|---|---|
| Renderer | D-008 and `001-foundation`: PixiJS-only 2.5D; R3F/Three rejected | `FRONTEND.md`: R3F provisional, Pixi conditional, R3F still unresolved | Wrong dependency and renderer can be scaffolded by following the owner | Make frontend unambiguously PixiJS; keep R3F only as failed historical evidence |
| Asset pipeline | `ART_DIRECTIONS.md`: SVG/layered raster to PNG/WebP atlas | `FRONTEND.md`: Blender to GLB/KTX2; `PERFORMANCE.md`: 3D/GLB/KTX2 budget language | Two toolchains, formats, payload models, and provenance paths | One editable 2D source-to-atlas path and renderer-neutral asset budgets |
| Fresh-launch sponsor | Product/quality/ExecPlan: create/select/sponsor in under 60 seconds | Human loop/interaction/concepts: sponsored Mara already marked/openable | Timer, state, copy, event, and onboarding screenshots test different products | Fixed candidate Mara, explicit sponsorship event, no character creator |
| Visual decision timing | D-008/Q-005/R-004: authored Pixi proof decides direction | ExecPlan: no visual evidence in M0; complete Gate A before fallback rollback | Expensive rework after 20-hour milestone integration | Four-hour early checkpoint inside Gate A, then lock direction |
| Observer threshold | D-008/Q-005/art: three of five | Quality bar/ExecPlan: one fresh observer/result can close the gate | Cherry-picked observer can pass a failed direction | One per iteration; five and three-of-five at checkpoint/final Gate A |
| Replay duration | D-009/interaction/quality/ExecPlan: 10–20 seconds | Chronicle: 15–30 seconds and a fixed 25-second table | Playwright, viewer, and share evidence judge different artifacts | One primary three-beat replay/share presentation at most 20 seconds |
| Replay density | Design/return/interaction: exactly three salient causal beats | Chronicle: seven visual segments across twelve events | Chronicle becomes montage/dashboard; `next` semantics ambiguous | Three beat groups with expandable event-level evidence |
| Causal marks | Design/Chronicle: five causal categories | Art inventory: four causal-edge treatments; concepts emphasize only three | One truth category is visually missing or overloaded | Budget and test five shape-plus-text treatments, including allegation |
| Citizen art count | Art inventory: eight portraits plus eight silhouettes and pose pairs | D-008/Q-005/R-004: total bounded art/integration at most eight hours | Generated/stock substitution, missing states, or silent time overrun | Apply the reduced modular cut list and start an inclusive hour log |
| Attachment | Product: responsible curiosity and Proof of Attachment | Quality/ExecPlan: one player's factual reconstruction/next concern can pass | Sterile token/dashboard interface passes the emotional gate | Five-session identity, relationship, and person-directed curiosity evidence |

## Asset cut list for the first eight-hour art/integration budget

This is the minimum credible default. An item returns only when a failed Gate A/B observation identifies it as the smallest fix; adding it removes comparable work.

| Baseline item | Keep now | Cut or defer | Reason |
|---|---|---|---|
| Settlement | One fixed ground/water plate with bridge, well, market, bins, woodpile, and three simple structure silhouettes | Separate painterly backgrounds, day/night plates, roof/material variants, modeled frame | One composition must prove life, not regional art breadth |
| World state | Small overlays for water level, bin count/state, barricade, repair, council notice | Weather, smoke, vegetation motion, paper fold, ink bleed, misregistration simulation | State change is essential; ambience is first in the cut order |
| Citizens | Four modular body bases plus eight coat/tool/posture combinations that produce eight distinct outer silhouettes | Eight bespoke full character illustration sets or rigs | Distinction can come from combinable silhouette cues |
| Portraits | One large Mara portrait and one supporting Toma portrait, both keyed to their world silhouettes | Six secondary large portrait vignettes | Gate B centers one relationship; names and small modular busts cover others |
| Action motion | One locomotion pose plus modular carry/work/orient states; prop/state swaps | A separate idle/work pair for every citizen and behavior family | Preserve readable actions without 16-plus custom cycles |
| Interaction | Recompose exchange/help and repair/convert from two actors, prop transfer, tool, and object before/after | Bespoke bilateral-exchange and repair “compositions” | Unique tableaux duplicate reusable parts |
| Resources | Water vessel/drop, wood bundle, food/grain mark | Decorative resource variants and inventory art | Three legible resources are binding; variety is not |
| Selection/relationship | One selection ring, hatch-quiet mask, one relationship/attention edge | Persistent network graph, portrait medallion wall, ambient halos | Selection and one relationship remain readable without dashboard takeover |
| Chronicle causality | Five tiny shape-plus-label marks and three beat frames built from scene crops | Share-only illustration, seven bespoke replay panels, ornamental borders | One evidence language must serve replay and share |
| Texture | One small paper tile and at most two reusable hatch masks | Texture families, continuous filters, full-screen grain animation | Distinction must not depend on expensive density or frame cost |
| Sound/ambience | None for the visual proof and Gate A | Entire optional sound set and four ambience marks | Silence is already an accepted state and the first cut |
| Delivery | One atlas, one deterministic export recipe, one source/provenance table | 3D conversions, dual-resolution art families before measurement | One inspectable pipeline protects time, bytes, and authorship |

## Strongest surviving choices

- **Living Woodcut still wins.** Of the three concept families, it alone makes the world and Chronicle feel like one authored system. Weathered Atlas remains the correct fallback; Hearthscale remains a reference for face size, tool clarity, and warmth, not a production pipeline.
- **The world-first hierarchy is right.** Bridge, well, bounded settlement, citizens before tutorial, one event callout, and no permanent dashboard all support the actual product promise.
- **PixiJS-only 2.5D is the disciplined response to the spike.** The R3F miss is used as a warning rather than waived, and the ExecPlan already prohibits a dual renderer.
- **Semantic DOM is not treated as an overlay afterthought.** Consequential controls, facts, keyboard operation, renderer loss, weak-device fallback, and reduced-motion replay are consistently designed as complete paths.
- **Chronicle factuality is unusually strong.** Typed causal roles, allegation separation, event IDs, hashes, manual replay, and the fixed Riverhold chain give the visual layer a truth contract worth protecting.
- **The generated-image boundary is correct.** The concepts are plainly labeled planning references; production pixels must be authored, editable, attributable, compressible, and deterministic.
- **Mobile is a composition, not a shrunk sidebar.** The 55% initial-world floor, single bottom sheet, no gesture-only action, explicit controls, safe-area check, and semantic fallback are the right starting rules once dense states are resolved.
- **The cut order is directionally sound.** Sound, weather, particles, decorative hatching, transitions, and secondary poses should disappear before citizens, actions, truth, population, or access.

## Required disposition before readiness

1. Resolve DR-001, DR-002, and DR-006 in the owning authorities so there is one renderer, asset pipeline, sponsor flow, and Chronicle contract.
2. Insert the bounded Visual Feasibility Checkpoint from DR-003 without increasing the 52-hour total.
3. Apply or replace the DR-005 cut list with an equally explicit inventory whose complete art/integration work fits eight hours.
4. Make the five-observer, deterministic evidence manifest in DR-004 the final Living Woodcut and Gate A acceptance rule.
5. Add the action lexicon and the separate attachment/identity evidence from DR-007 and DR-008.
6. Re-run contradiction, link, Markdown, and frozen-scope checks. Do not declare Goal-mode readiness until the affected authorities and D/R/Q dispositions point at the same observable tests.

Living Woodcut does not need another concept-generation round. It needs one small authored proof and a coherent contract.
