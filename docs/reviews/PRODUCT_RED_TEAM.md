# EONFOLK product red team

**Purpose:** Aggressively test whether the frozen EONFOLK synthesis is a compelling, differentiated consumer product before implementation begins.

**Status:** COMPLETE — frozen-state hostile review; verdict **NOT READY**

**Authority boundary:** This file owns product objections and proposed acceptance tests against frozen commit `4f47eae8fe785f3994e053d01c184e9e3dddb401`. It does not accept decisions, edit shared authorities, authorize implementation, or claim player evidence.

**Related documents:** [authority index](../INDEX.md), [product](../product/PRODUCT.md), [human loop](../product/HUMAN_LOOP.md), [distribution](../product/DISTRIBUTION.md), [Chronicle](../product/CHRONICLE.md), [game-design tournament](../research/GAME_DESIGN_RESEARCH.md), [decisions](../decisions/DECISIONS.md), [risks](../decisions/RISKS.md), [open questions](../decisions/OPEN_QUESTIONS.md), [quality bar](../quality/QUALITY_BAR.md), [first ExecPlan](../exec-plans/completed/001-foundation.md), and [zero-anchor challenge](ZERO_ANCHOR_CHALLENGE.md).

## Review basis

This review assumes one solo builder, 40–60 focused hours, an M4 Pro with no owned GPU, approximately $0 and no spend, and a free useful V1 requiring no account, key, external model, or model download. Training, proprietary datasets, regulated data, payments/revenue operations, partnerships, and enterprise dependencies remain out of scope.

The hostile question is not whether the architecture can produce a correct replay. It is whether a stranger will understand the fantasy, enjoy the waiting and intervention cadence, care about Mara, believe their constrained action mattered, return for another playable decision, and share something that can acquire another player. Scores in the tournament are planning judgments, not consumer evidence. No external sources were opened for this review and no source-ledger rows are proposed.

## Executive verdict

**NOT READY.** The synthesis has no P0 in the planning artifact, but it has eight unmitigated P1 product failures. Most seriously, Gate B can pass on one person's factual recall, the immutable Riverhold story can masquerade as autonomous agency without a counterfactual, and the advertised return action does not exist in the first-slice scope. The plan also spends roughly 28 of 52 hours before testing its defining sponsor interaction.

| ID | Severity | Finding | Consumer failure |
|---|---|---|---|
| PR-001 | P1 | “Proof of Attachment” does not test attachment | A comprehensible demo can pass while most players do not care or return |
| PR-002 | P1 | The opening risks ten minutes of watching an accounting vignette | The player leaves before rare counsel becomes meaningful |
| PR-003 | P1 | The fixed Riverhold chain can fake agency | Reinterpretation reads as a scripted cutscene or random denial |
| PR-004 | P1 | The return promise ends at an unimplemented choice | The Chronicle manufactures a cliffhanger with nothing to do next |
| PR-005 | P1 | “Sponsor” is a label, not yet a legible fantasy or relationship | Players do not know who they are, why Mara listens, or what their limits mean |
| PR-006 | P1 | Differentiation from SEED and substitutes is defensive and untested | The product reads as a smaller, offline, indirect agent-town demo |
| PR-007 | P1 | The 52-hour slice launders a platform-sized proof into “one chain” | The builder reaches the product test late or ships a technically correct non-game |
| PR-008 | P1 | A copyable card/seed without a playable route is not distribution | “Share” can pass without acquiring or activating anyone |
| PR-009 | P2 | Fixed Mara contradicts create/select language | The proof overclaims a reusable sponsorship system |
| PR-010 | P2 | Riverhold hides governance depth in a supposedly bounded fixture | Either the law is hard-coded theater or the slice contains an undeclared subsystem |
| PR-011 | P2 | Chronicle factuality may become emotionally sterile exposition | Players remember the audit but not the person |
| PR-012 | P2 | Five primary-test audiences prevent a useful first-ten signal | Failure cannot be attributed to product, framing, or cohort |

## P1 findings and minimum fixes

### PR-001 — “Proof of Attachment” does not test attachment

**Evidence and location.** [QUALITY_BAR § Gate B](../quality/QUALITY_BAR.md#gate-b--proof-of-agency-and-bounded-attachment) passes when “at least one fresh player” can restate the decision, interpretation, consequence, and next question. [001-foundation § Milestone 2](../exec-plans/completed/001-foundation.md#m4--gate-b-proof-of-agency-and-bounded-attachment-12-hours) repeats that one-person threshold. [OPEN_QUESTIONS Q-001](../decisions/OPEN_QUESTIONS.md#q-001--does-one-sponsored-citizen-create-attachment) requires three of five to recall identity/value/tension but only one to volunteer a return reason. The materially stronger first-ten return threshold exists in [DISTRIBUTION](../product/DISTRIBUTION.md#first-10--100--1000), outside Gate B.

**Why this is fatal/material.** Recall and causal comprehension are necessary trust checks, not attachment. One enthusiastic observer can let a majority of bored or indifferent players disappear from the evidence. The build could therefore be declared a “proof of attachment” while proving only that its tutorial and Chronicle are intelligible.

**Concrete minimum fix.** Rename the current checks “causal comprehension,” then add one unified five-person directional attachment gate. Count every abandonment. Require the player to choose to continue toward a specific unresolved risk before any share prompt, and record whether that interest concerns Mara/world state rather than the presentation. Preserve the first-ten seven-day return test as the first retention claim; do not call attachment or return validated before it runs.

**Acceptance test.** In five fresh, unfacilitated sessions: at least four complete the core intervention; at least three correctly name Mara, her stake, their own contribution, and one specific future risk and voluntarily choose to continue before the Chronicle/share prompt; no abandoned session is removed. Then report the existing first-ten `4/10` unreminded seven-day-return threshold separately. A pass remains directional proof, not market validation.

**Affected authorities.** `PRODUCT`, `HUMAN_LOOP`, `QUALITY_BAR`, `001-foundation`, Q-001, Q-008, R-001, R-008, D-001, and D-002.

### PR-002 — The opening risks ten minutes of watching an accounting vignette

**Evidence and location.** [HUMAN_LOOP § Time contract](../product/HUMAN_LOOP.md#first-session-and-return-timing) allocates up to three minutes to watching/inspection and up to ten minutes before the single decision resolves. Its own remaining uncertainty asks whether one decision in ten minutes feels active enough. The sole [Chronicle fixture](../product/CHRONICLE.md#riverhold-oracle-chain) is a 12-unit ledger mismatch, recount, audit, petition threshold, rule vote, and allocation checkpoint. [RISKS R-001](../decisions/RISKS.md#top-5-abandon-or-change-triggers) already says the chosen structure trades immediate drama for continuity, but there is no blocking pace, boredom, or abandonment test before implementation.

**Why this is fatal/material.** “Observe autonomous citizens” is not automatically play. The first meaningful intervention arrives after setup, and the conflict is public accounting rather than an immediately personal scarcity. If the player experiences the first minutes as waiting for the prompt, factuality and persistence only make a boring experience more trustworthy.

**Concrete minimum fix.** Before code foundations, run the exact Riverhold opening as cards or a clickable DOM mock. Give the player one meaningful investigate/attention choice in the first minute, move the counsel/abstain boundary no later than minute five, and measure inactive time and abandonment. If the ledger dispute does not create personal anticipation, rewrite the conflict before building simulation breadth; do not cover it with faster animation or prose.

**Acceptance test.** Across five fresh target-cohort sessions, median time to a meaningful investigate choice is at most 60 seconds, all core counsel/abstain decisions occur by minute five, at least four reach the consequence without facilitator rescue, and at least three ask to inspect or take the next action before seeing the polished Chronicle. More than one “I was waiting for the game to let me do something” response fails.

**Affected authorities.** `PRODUCT`, `HUMAN_LOOP`, `CHRONICLE`, `GAME_DESIGN_RESEARCH`, `QUALITY_BAR`, `001-foundation`, Q-001, Q-004, R-001, and D-002.

### PR-003 — The fixed Riverhold chain can fake agency

**Evidence and location.** [HUMAN_LOOP § Decision-boundary requirements](../product/HUMAN_LOOP.md#fair-refusal-contract) promises two or three materially distinct intents plus abstain. The immutable [Riverhold chain](../product/CHRONICLE.md#riverhold-oracle-chain) records only one counsel—“Expose the shortage”—and one interpretation—“verify, then disclose”—before the same audit, relationship break, vote, and law. [001-foundation](../exec-plans/completed/001-foundation.md#exact-included-scope) includes one typed decision boundary; its tests enumerate accept/reject/delay/reinterpret branches but do not require same-state counterfactuals or materially different downstream state. Gate B accepts one observed outcome.

**Why this is fatal/material.** A branch test can prove that four labels render without proving that Mara's values, beliefs, and relationships change what she does. A handcrafted success chain can look autonomous while being a cutscene with an advice menu. Conversely, refusal without forecastable rules will feel like the game discarded the player's only action. Both destroy the thesis and the claimed behavioral difference.

**Concrete minimum fix.** Specify the exact visible stakes and authoritative state deltas for at least three Riverhold inputs, including abstention. At least two must produce materially different relationship/resource/institution states from the identical pre-decision seed. Mara's Mind state must alter selection or interpretation in a blinded counterfactual; no outcome may be selected only to preserve the authored Chronicle.

**Acceptance test.** Run identical pre-decision states with each input and with one relevant Mind variable changed. Deterministic replay must show distinct state hashes and at least one distinct later consequence for every advertised materially different intent. In five blind sessions, at least three players forecast different state directions before committing and later explain both why Mara interpreted the input and how their contribution differs from command. Cosmetic text changes or branch labels with the same state fail.

**Affected authorities.** `PRODUCT`, `HUMAN_LOOP`, `CHRONICLE`, `GAME_DESIGN_RESEARCH`, `QUALITY_BAR`, `001-foundation`, Q-002, Q-003, R-001, R-002, R-003, D-003, D-004, D-005, and D-007.

### PR-004 — The return promise ends at an unimplemented choice

**Evidence and location.** [PRODUCT § Why return](../product/PRODUCT.md#first-session-contract) says the player comes back to repair, escalate, investigate, commit standing, or trust Mara. [HUMAN_LOOP § Time contract](../product/HUMAN_LOOP.md#first-session-and-return-timing) promises a day-return choice and a session-five regret/repair. Yet [HUMAN_LOOP § Resulting implementation behavior](../product/HUMAN_LOOP.md#constraint-fit) implements only Observe, one Investigate, Counsel, and Abstain; Commit and succession are deferred. [001-foundation § Milestone 2](../exec-plans/completed/001-foundation.md#m4--gate-b-proof-of-agency-and-bounded-attachment-12-hours) contains one decision boundary and ends on a While You Were Away summary, replay, and share composition. The share hook asks “repair the friendship or enforce the precedent?” without implementing either follow-up.

**Why this is fatal/material.** Persistence plus a cliffhanger is not a return loop. The first reload can demonstrate IndexedDB and catch-up while offering no new playable consequence. Asking players what they want to do next measures demand for a feature the proof withholds, so the plan can manufacture a retention signal from an unavailable action.

**Concrete minimum fix.** Either add one bounded post-return decision whose legal options depend on the first outcome, or narrow V1 to a one-session vignette and remove day/week/session-five return claims. The recommended minimum is one follow-up repair/escalate/abstain boundary using the same relationship and rule state; it needs no generalized progression system.

**Acceptance test.** A fresh player can leave at the stable checkpoint, reload into visibly changed state, identify a new choice that exists in the running build, take it, and observe one state-backed response. At least three of five then identify a further unresolved concern. The later first-ten test must still meet the existing unreminded `4/10` seven-day-return threshold before claiming retention.

**Affected authorities.** `PRODUCT`, `HUMAN_LOOP`, `CHRONICLE`, `PROGRESSION`, `QUALITY_BAR`, `001-foundation`, Q-001, Q-007, Q-008, R-001, R-008, D-001, D-003, and D-009.

### PR-005 — “Sponsor” is a label, not yet a legible fantasy or relationship

**Evidence and location.** [PRODUCT § Owned decision](../product/PRODUCT.md#owned-decision) calls the human a patron/witness rather than mayor, chatbot operator, or god. [HUMAN_LOOP § Time contract](../product/HUMAN_LOOP.md#first-session-and-return-timing) opens with Mara's desire/tension and “The town lives by its own plans,” but never states why the player has privileged access, why Mara accepts the covenant, what sponsorship obliges, or why counsel is scarce. Counsel's only first-slice “cost” is one intervention at a boundary; the concrete `Commit` stake that could make sponsorship reciprocal is deferred.

**Why this is fatal/material.** The consumer fantasy is relational, so the relationship cannot be an unexplained UI permission. Without consent, obligation, and a visible limit, sponsorship may read as a tutorial camera plus a menu that an NPC can ignore. Players cannot feel responsibility if they do not understand what they promised or risked.

**Concrete minimum fix.** Define a two-sentence covenant premise and one authoritative first-slice rule for how it begins, what access it grants, what it costs/limits, and how Mara may refuse. Surface this through the opening situation, not lore. Do not add a currency or progression system; one named reciprocal obligation is sufficient.

**Acceptance test.** After 30 seconds, at least four of five fresh players can answer in their own words: who they are to Mara, why they may counsel her, what they cannot command, and what either side risks. Their answers must derive from the running experience, not a facilitator or product sentence.

**Affected authorities.** `PRODUCT`, `HUMAN_LOOP`, `AGENT_LIFE`, `QUALITY_BAR`, `001-foundation`, Q-001, Q-002, R-001, D-001, and D-003.

### PR-006 — Differentiation from SEED and substitutes is defensive and untested

**Evidence and location.** [PRODUCT § Behavioral difference](../product/PRODUCT.md#why-the-current-proof-is-not-seed-or-ai-town) differentiates through one sponsored citizen, checkpoint catch-up, rarer advice, factual history, and free local operation. The [tournament](../research/GAME_DESIGN_RESEARCH.md#base-result) gives H strong desirability/retention scores but explicitly labels all scores planning judgments; much of H's advantage comes from lineage, institutions, mature-world history, and session-20 depth excluded from the slice. H loses first-session drama to ECHOHOUSE. The proposed audience spans five cohorts, so a first-ten test cannot establish a beachhead or a substitute preference.

**Why this is fatal/material.** “Smaller, offline, less demanding, and more factual than SEED” is a constraint fit, not a must-play fantasy. With no model novelty and only one authored chain, the visible product can collapse into an indirect colony-sim vignette or agent-town demo. The tournament cannot validate its own subjective scores, especially using deferred systems as retention credit.

**Concrete minimum fix.** Choose one first-ten beachhead cohort. Before the 52-hour build, run randomized, equally polished low-fidelity Riverhold flows for H and the strongest substitutes: direct possession, family/trio stewardship, and the bounded ECHOHOUSE interaction. Include a SEED-like multi-worker management framing as a message control. Ask immediate continuation preference, causal comprehension, perceived novelty, and why.

**Acceptance test.** With ten fresh people from the declared cohort, H must not lose the strongest substitute by 20 percentage points on both immediate continuation and causal comprehension—the synthesis's existing reopen rule. At least six of ten must describe the sponsor/refusal/factual-memory behavior without “AI agents,” “offline,” “free,” or other implementation words. Otherwise reopen D-001 instead of adding simulation, art, or marketing.

**Affected authorities.** `PRODUCT`, `GAME_DESIGN_RESEARCH`, `DISTRIBUTION`, `DECISIONS` D-001/D-003/D-009, `OPEN_QUESTIONS` Q-001/Q-007/Q-008, and `RISKS` R-001/R-008.

### PR-007 — The 52-hour slice launders a platform-sized proof into “one chain”

**Evidence and location.** [001-foundation § Hour and cut budget](../exec-plans/completed/001-foundation.md#hour-and-scope-budget) spends 8 hours on contracts and 20 on Proof of Life before the defining sponsor loop. Its “never cut” list retains eight citizens, three resources, movement, four behavior families, exchange, repair, Standard Brain, event sourcing, hashes, IndexedDB, catch-up, replay, Chronicle, three viewports, semantic interaction, and delayed consequence. The plan additionally blocks on migrations, corruption, multi-tab, 30/90/365-day runs, import abuse, multiple branch outcomes, responsive share formats, and provider-failure fixtures even though providers do not ship. No hours are assigned to recruitment, observed tests, iteration, or the post-return action demanded by PR-004.

**Why this is fatal/material.** The scope can meet 52 hours only by treating complex systems as line items without integration variance. Worse, more than half of the budget passes before the core fantasy is put in a player's hands. That optimizes for a robust simulation substrate, exactly the zero-anchor failure mode, and makes a late product failure expensive to accept.

**Concrete minimum fix.** Reorder the plan around evidence: a 2–4-hour paper/click sponsor test, then a DOM-only counterfactual Riverhold loop by hour 12, both with stop rules, before Pixi, generalized resource simulation, or production persistence. Put recruitment/observation/fix time in the budget. Defer 90/365-day proof, migration/multi-tab breadth, provider-failure branches, and responsive share composition until the sponsor loop survives. Keep one save/reload, deterministic replay, factuality, semantic access, and the post-return choice.

**Acceptance test.** A revised hour table totals at most 60 hours including setup, five observed sessions, fixes, and integration reserve; the first product kill gate occurs by hour four and the first playable counsel-to-consequence counterfactual by hour 12. Every retained task names the product gate it falsifies. The cut list removes at least the deferred items above and explicitly forbids restoring them before PR-001 through PR-004 pass.

**Affected authorities.** `001-foundation`, `QUALITY_BAR`, `PRODUCT`, `HUMAN_LOOP`, `DISTRIBUTION`, D-002, D-006, D-007, D-009, R-005, R-006, R-007, and Q-009/Q-010.

### PR-008 — A copyable card/seed without a playable route is not distribution

**Evidence and location.** [DISTRIBUTION § Owned decision](../product/DISTRIBUTION.md#owned-decision) defines an activated user as one who resolves the intervention. Its first-100 path requires a free playable page, but [DISTRIBUTION § Resulting implementation behavior](../product/DISTRIBUTION.md#constraint-fit) and [001-foundation](../exec-plans/completed/001-foundation.md#exact-included-scope) explicitly exclude deployment, public routes, accounts, and posting integration while building `Copy Chronicle`, `Copy seed`, and two share layouts. A recipient without the unpublished local build cannot use the seed. Gate B nevertheless calls artifact comprehension part of the product proof.

**Why this is fatal/material.** Copying is not sharing, and sharing is not activation. The slice can optimize a polished artifact and record a “share” while creating no path for its recipient to play. That hides the hardest distribution question behind a later authorization and consumes scarce product hours now.

**Concrete minimum fix.** Reclassify the first-slice deliverable as an artifact-comprehension test only. Keep copyable factual text or one OS-screenshot-ready card; defer responsive formats and seed-copy product work. Do not call distribution validated until a separately authorized free playable route exists and an unaffiliated share produces an activated user.

**Acceptance test.** Before hosting, five unfamiliar viewers can identify actor, intervention, consequence, and unresolved tension within five seconds; this earns only “message comprehensible.” After separate hosting authorization, at least one unaffiliated share must lead to a recipient who opens the playable route and resolves the intervention, matching the existing first-100 gate. No copy event substitutes for activation.

**Affected authorities.** `DISTRIBUTION`, `PRODUCT`, `CHRONICLE`, `QUALITY_BAR`, `001-foundation`, Q-004, Q-008, R-008, D-009, and D-010.

## P2 findings

### PR-009 — Fixed Mara contradicts create/select language

`PRODUCT` and `QUALITY_BAR` promise creation/selection of a focal mind, while `001-foundation` and Riverhold implement Mara as the only authored anchor. Creating a name or selecting a nonviable citizen does not prove portable sponsorship. For this slice, explicitly say “sponsor Mara” everywhere and defer selection. Reopen general focal-citizen selection only after at least two citizens have complete, materially different decision contexts.

### PR-010 — Riverhold hides governance depth in a supposedly bounded fixture

`PRODUCT` excludes governance depth, but the proof requires an audit, three endorsements, petition threshold, council vote, new law, and later allocation rule. If these are special-case scripted events, “systemic institutional consequence” is overstated; if generalized, the hours are understated. Define one typed Riverhold-only threshold/rule transition and label its boundary honestly. No generalized office, petition, voting, or law authoring system belongs in the slice.

### PR-011 — Chronicle factuality may become emotionally sterile exposition

The causal taxonomy is excellent for trust, but the 12-event fixture asks a first-session player to care about bins, ledger counts, a work order, audit status, petition eligibility, and rule wording. The plan tests factual recall more rigorously than emotional salience. Keep the evidence expandable, compress the default to three beats centered on Mara and Toma, and separately ask what the player feels—not only what they can reconstruct. Factuality must not be weakened.

### PR-012 — Five primary-test audiences prevent a useful first-ten signal

The first-ten recruitment matrix spans systemic-game players, life-sim/god-game players, AI-native skeptics, nontechnical observers, and creators. With roughly two people per group, a failure has no interpretable owner and a pass has no beachhead. Choose one primary cohort for the first ten; use the other groups later as adversarial transfer tests.

## Cross-document contradictions

- The product says `create/select` a mind; the implementation says sponsor Mara. PR-009 recommends the honest narrower claim.
- The return surface promises repair, escalation, commitment, and trust; the slice implements one Investigate, Counsel, and Abstain boundary. PR-004 is blocking.
- The first-slice exclusions reject governance depth; the fixed proof culminates in an audit, petition, vote, law, and future allocation. PR-010 requires a named special-case boundary.
- Chronicle specifies a 15–30-second replay while Product/Distribution/Gate B require a 10–20-second artifact. These may be separate views, but the acceptance oracle does not consistently say which duration is tested.
- Standard Brain is the only V1 cognition path and providers are excluded, yet Milestone 2 budgets provider timeout/malformed-output branch tests. That is deferred architecture work disguised as product readiness.
- The plan says the Chronicle is not the game, yet the post-return and share journeys end in summaries/replay because the next playable decision is absent.

## Strongest surviving choices

1. **Model-free completeness is correct.** The Standard Brain, no-key onboarding, and no-download rule protect the actual free V1 instead of using “AI” to excuse friction or cost.
2. **Factual Chronicle semantics are unusually disciplined.** Direct cause, trigger, contributing condition, predecessor, and allegation prevent the product from inventing agency after the fact.
3. **One focal citizen is a strong camera choice.** It avoids the obvious drift into worker scheduling and gives responsibility a name, provided the covenant and counterfactual agency become real.
4. **Non-punitive absence is consumer-friendly.** Stable checkpoints, bounded catch-up, no streaks, and no emergency obligation remove the worst always-on-society anxiety.
5. **Deferred infrastructure is genuinely deferred.** No server, account, payment, model, public canon, or World Fork contaminates the proof.
6. **The documents name their own failure modes.** R-001 through R-005 and the Chronicle-laundering warning are strong stop rules; the remaining work is to make their tests early and binding.

## Required scope cuts

Cut or defer these before implementation handoff, in this order:

1. Responsive 16:9/9:16 share compositions and seed-copy product work; retain one factual text/card comprehension proof.
2. Provider timeout/malformed-output fixtures in a build where providers cannot exist; retain a no-network/no-provider assertion.
3. 90/365-day horizons, migration breadth, and multi-tab hardening; retain deterministic session, save/reload, 24-hour/seven-day catch-up, and recoverable export only as needed by the return proof.
4. Focal-mind creation/selection; make Mara the explicit proof anchor.
5. Generalized governance; keep one typed Riverhold rule transition with no extensible council/petition authoring system.
6. Pixi/Living Woodcut production work until a DOM/cards counsel-to-consequence counterfactual passes PR-001 through PR-003.
7. Any background resource/exchange/repair behavior that does not become visible evidence in Riverhold. Preserve only the minimum autonomous behavior needed to make the town, social consequence, and changed return tableau legible.

Do **not** cut the first-minute meaningful action, materially distinct counterfactuals, Mara's forecastable independence, a playable post-return choice, factual causality, semantic access, abandonment accounting, or observed player tests. Those are the product.

## Objections and uncertainties

- This is a plan review, not a playtest. Boredom, attachment, and share pull remain hypotheses; the findings identify where the current gates could falsely pass them.
- The frozen documents do not establish whether the Riverhold engine was intended to generate multiple outcomes or merely replay the immutable acceptance fixture. PR-003 assumes the fixture is currently the only demonstrated path because no other authoritative chain is specified.
- A one-scenario proof can validly test a crafted protagonist, but it cannot support claims about player-created or freely selected focal minds. PR-009 narrows the claim rather than demanding more scope.
- Organic acquisition cannot be tested without a playable route. That later action still requires separate authorization; this review does not authorize deployment or outreach.
- The strongest alternative may not be ECHOHOUSE. Its model-first form violates the binding no-download product path, but its early paper test, concentrated stakes, and immediate replay criteria remain useful pressure tests.

## Final verdict

**NOT READY.** Reconcile PR-001 through PR-008 in the owning authorities and rewrite `001-foundation` so the sponsor/counsel fantasy is tested before simulation breadth. The synthesis can become **READY WITH FIXES** once the gate definitions cannot pass boredom, scripted agency, an empty return cliffhanger, or non-playable “sharing.” No production implementation should begin from this frozen plan.
