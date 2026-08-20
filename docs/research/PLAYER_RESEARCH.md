# Player attachment and return evidence

**Status:** RESEARCH SNAPSHOT — evidence accessed 2026-08-20

**Authority:** external player-motivation evidence, observed failure modes, attachment hypotheses, and falsification measures; the human loop and progression authorities own product decisions

**Owned evidence question:** What makes a consumer care about an autonomous citizen, understand their own influence, and choose to return without coercive timers, paid stakes, or an always-on social obligation?

**Related:** [authority index](../INDEX.md), [competitor research](COMPETITORS.md), [distribution research](DISTRIBUTION_RESEARCH.md), [source ledger](SOURCE_LEDGER.md)

## Conclusion

**INFERENCE:** The best-supported attachment design is a repeated relationship of *distinct identity + partial autonomy + meaningful player influence + remembered consequence*. The citizen must neither be a puppet nor an opaque chatbot. Return should answer an unresolved human question—“what became of them and what can I still change?”—rather than protect a streak or stop need decay.

This is grounded in evidence for autonomy, competence, relatedness, shared agency, responsibility, and consequential choice. It is not evidence that EONFOLK itself will retain players. [S-PLAYER-001] [S-PLAYER-002] [S-PLAYER-003] [S-PLAYER-004] [S-PLAYER-005]

## Evidence hierarchy and limits

- Academic studies support psychological constructs, not an exact EONFOLK loop or retention rate.
- Store review counts show demand for a category, not why a specific individual returned.
- SEED hands-on reports and AI Society reviews reveal concrete failure modes, not representative community sentiment.
- Most named AI worlds publish agent behavior, repository adoption, or observer activity rather than human attachment and return data.
- Self-determination theory is useful but not a complete game-design recipe; a recent review criticizes perfunctory use of it in HCI-games research. [S-PLAYER-006]

## Supported principles

### 1. The player needs agency, but the citizen needs separateness

**VERIFIED FACT:** Across four studies, perceived in-game autonomy and competence were associated with game enjoyment, preference, and post-play well-being; relatedness also independently predicted enjoyment in parts of the research. The studies measure perceptions, not a feature checklist. [S-PLAYER-001]

**VERIFIED FACT:** Interviews with World of Warcraft players identified multiple player-avatar relationships, including a fully social form characterized by self-differentiation, emotional intimacy, and shared agency. In that form the avatar is experienced neither merely as object nor self-representation. [S-PLAYER-002]

**INFERENCE:** EONFOLK should let a citizen refuse, reinterpret, or imperfectly execute advice for a state-grounded reason, while still making the player's intervention materially effective. Full control collapses the citizen into a tool; unexplained refusal collapses the player into a spectator.

**Implementation behavior:** show the citizen's current desire, the intervention, the rule-grounded response, and the consequence. One sentence of causal explanation is more valuable than unrestricted dialogue.

### 2. Meaningful choice must forecast difference and later prove it

**VERIFIED FACT:** In an experiment with 88 participants, choices that appeared likely to lead to meaningfully different story states produced a higher reported sense of agency than choices whose situational content did not differ. [S-PLAYER-003]

**VERIFIED FACT:** A mixed-method CHI study found that moral, social, and consequential characteristics made game choices feel meaningful and that meaningful choices positively affected appreciation. [S-PLAYER-004]

**INFERENCE:** An EONFOLK intervention menu needs distinct stakes before selection and an attributable echo afterward. Cosmetic phrasing around the same result is worse than only two truly different actions.

**Implementation behavior:** each intervention preview names its tension, not its numeric result; the Chronicle later marks the chosen branch and at least one counterfactual difference.

### 3. Responsibility and identification support appreciation, not necessarily moment-to-moment fun

**VERIFIED FACT:** A survey study found recalled control over an avatar associated with enjoyment, while identification with and responsibility for a character were independently associated with appreciation. These are associations from recalled experiences, not causal retention proof. [S-PLAYER-005]

**INFERENCE:** “I am responsible for what happened to this person” may make EONFOLK meaningful even when the interaction is quiet. But the slice still needs an immediately enjoyable verb; appreciation cannot be used to excuse a passive first session.

**Implementation behavior:** give the player one reversible low-stakes intervention in the first minutes, then one socially consequential intervention. Do not begin with irreversible death or a wall of biography.

### 4. Loss becomes meaningful through relationship and story, but can also drive exit

**VERIFIED FACT:** A qualitative study of game decisions reported that attachment shaped sadness around permanent character loss and that such loss was experienced narratively, not simply as lost resources. [S-PLAYER-007]

**VERIFIED FACT:** SEED's month-long hands-on described both attachment-generating social history and anxiety-producing consequences: real-time need decay, emergency alerts during an outage, finite lives, and the possibility of losing progress. The author enjoyed the game; they also explicitly identified the structure as disincentivizing for some players. [S-PLAYER-008]

**INFERENCE:** Death can establish stakes only after the game has earned care and if the relationship continues through a lineage, institution, memorial, or inherited consequence. Surprise loss during absence is coercion risk, not attachment evidence.

**Implementation behavior:** no first-session citizen death; no wall-clock death; warn before an irreversible branch; preserve an obituary, causal record, relationships, and successor state.

### 5. Respectful stopping protects autonomy

**VERIFIED FACT:** A two-stage study of disengaging from games argues that players value being able to exit sessions in a self-determined way and analyzes constructive stopping rather than treating exit only as churn. [S-PLAYER-009]

**INFERENCE:** A clean “leave the world in their hands” moment can strengthen the fantasy. The game should make the next return question explicit, then let the player close without penalty.

**Implementation behavior:** save at a stable boundary, state the maximum bounded absence advance, preview the citizen's intended next action, and never use streak loss, expiring energy, or push-notification emergencies.

### 6. Generated language must remain subordinate to state

**VERIFIED FACT:** One SEED reviewer found that personality types came through in conversation but that repeated filler language and weak conversational coherence damaged immersion. [S-PLAYER-010]

**VERIFIED FACT:** In the very small AI Society negative-review sample, a player reported that customized roles and intervention powers did not change observed behavior; another wanted clearer interaction. [S-PLAYER-011]

**INFERENCE:** Believability comes from consistent cause, memory, and action before verbal breadth. A citizen who says less but acts from known needs and history is a better fit for this slice and its constraints.

## Return loop proposed for falsification

The sequence below is a **PRODUCT HYPOTHESIS**, not a selected decision:

1. **Recognize:** return opens on one citizen and one concrete change, not a dashboard.
2. **Understand:** a three-event causal chain explains what occurred and what remains uncertain.
3. **Care:** the citizen expresses a state-grounded desire or conflict involving someone the player knows.
4. **Intervene:** the player chooses one of two or three materially different actions, or deliberately abstains.
5. **Witness:** an immediate response confirms agency without resolving the whole situation.
6. **Release:** the world advances only to a safe checkpoint after exit.
7. **Anticipate:** the close state names one unresolved question that can change next time.

```text
citizen change -> causal account -> meaningful choice -> visible response
       ^                                                   |
       |--------- bounded absence + unresolved question ---|
```

The diagram is a test loop, not evidence that a loop alone creates retention.

## What a player should be able to say

After one session:

- “I know who this citizen is and what they currently want.”
- “I can explain why they did that.”
- “My choice changed something I can point to.”
- “I am curious which of two plausible outcomes happens next.”

After five sessions:

- “They have changed in a way that follows from their history.”
- “Another citizen or institution remembers what I did.”
- “I can name a consequence I regret, accept, or want to repair.”

After twenty sessions:

- “The world has an era I helped shape, not only accumulated stats.”
- “A death, succession, office, law, or relationship changed what later choices meant.”
- “I can show someone else a concise artifact that explains why this history is mine.”

Each statement is a **PRODUCT HYPOTHESIS** and should become an interview prompt, not marketing copy.

## Player groups worth testing

These segments are behavior hypotheses, not market-size claims.

| Hypothesized player | Existing proof of appetite | Needed first-slice promise | Likely rejection |
|---|---|---|---|
| **Colony-story reader** | RimWorld/Dwarf Fortress demand for stories generated by systems [S-PLAYER-012] | A readable citizen-scale causal story in under ten minutes | Too few management verbs; outcomes feel authored |
| **God-game observer** | WorldBox demand for create/observe/intervene spectacle [S-PLAYER-013] | A visible world reaction within seconds | Too much reading; changes are visually weak |
| **Life-sim caregiver** | SEED's social/Seedling attachment evidence, plus the broader life-sim frame [S-PLAYER-008] | A distinct citizen who remembers and needs bounded help | Death/anxiety; insufficient customization |
| **AI-world curious** | Agent-world launches and repository attention in competitor research | Behavior that is surprising but auditable | No unrestricted chat or model novelty |
| **Systems skeptic** | Complaints about opaque behavior and filler language [S-PLAYER-010] [S-PLAYER-011] | “Show me why” provenance and replay | Simulation too shallow to surprise |

**INFERENCE:** Recruit across all five in the first 10–20 tests. Recruiting only AI enthusiasts would overstate the value of autonomy and under-test game quality.

## Proof-of-Attachment test, not analytics theater

No industry benchmark was found that maps cleanly to this product. The following gates are deliberately labeled **PRODUCT HYPOTHESIS** and use small-sample evidence only to decide whether to continue:

### First 10 completed sessions

- At least 8/10 can name their focal citizen and one motive without reopening the UI.
- At least 7/10 correctly reconstruct one cause → action → consequence chain.
- At least 6/10 say what they expect or hope happens next without being prompted with options.
- At least 4/10 voluntarily return to the same saved world within seven days.
- Zero report that closing the game risks punishment or that absence mechanics feel manipulative.

### First 100 completed sessions

- At least 60% reach the first consequential intervention.
- At least 50% correctly distinguish citizen autonomy from random output.
- At least 30% return to the same world within seven days.
- At least 15% voluntarily export/copy the Chronicle or seed without a reward.
- Fewer than 10% report that explanations are missing or contradict visible behavior.

The percentages are decision thresholds, not forecasts. If results are materially worse, simplify the loop or abandon the attachment claim before adding systems.

### Evidence collection compatible with the constraints

- Use observer notes and a five-question exit interview for the first 10.
- Store local event logs and an optional user-initiated “export test record”; collect no account, credential, or regulated data.
- For 100, use aggregate counts that can be entered manually from itch.io page analytics plus voluntary form responses only if approved; otherwise retain session observation and local exports.
- Do not add a telemetry vendor, identity system, notification service, or paid analytics product to prove the slice.

## Strongest objections

1. **Attachment research often studies avatars or authored characters.** An autonomous non-avatar citizen may produce a different relationship entirely.
2. **Meaningful choice research often uses narrative games.** A simulation's delayed and probabilistic consequences may be harder to forecast or attribute.
3. **Small-sample return can be politeness.** Friends and invited testers over-report interest; voluntary unsupervised return matters more than interview enthusiasm.
4. **A Chronicle can fabricate meaning after the fact.** If the underlying state transition was trivial, elegant prose is misdirection.
5. **Permadeath can be ethically and commercially risky.** Care may convert into avoidance, especially when absence is involved.
6. **Rule explanations can kill mystery.** The UI must expose relevant causes without reducing citizens to spreadsheets.

## Recommendation under binding constraints

**Recommendation:** Optimize the first slice for shared agency and causal care, not simulated intelligence. Use one focal citizen, a small social network, two or three consequential interventions, state-grounded dialogue, a factual Chronicle, and bounded absence. Let the player stop cleanly. Test whether they remember, explain, anticipate, and return before implementing lineage depth, multiple institutions, governance, economies, or any model-backed conversation.

This requires no spend, model training, proprietary data, enterprise buyer, payment, partnership, or always-on compute. It can run on the M4 Pro and distribute as a free local/browser experience.

## What would change the conclusion

- Controlled tests showing open-ended dialogue produces greater attachment and return than state-grounded behavior at acceptable cost and consistency.
- Players preferring direct control to advisory shared agency.
- Players reporting that causal explanations remove rather than support mystery, with no comprehension cost.
- Literal real-time absence producing higher voluntary return without anxiety, obligation, or support incidents.
- First-slice tests showing players care about world/institution outcomes but not individual citizens.

## Rejected interpretations

- **Rejected:** Self-determination theory guarantees retention. It identifies relevant perceived needs, not a retention formula.
- **Rejected:** Surprise equals autonomy. Surprise without consistent state or cause can be randomness.
- **Rejected:** Grief after a death proves good design. It may prove investment, coercion, unfairness, or simple loss aversion.
- **Rejected:** More generated dialogue creates a deeper relationship. Current review evidence supplies a counterexample.
- **Rejected:** A positive interview means a player will return. Only unsupervised behavior tests return.
- **Rejected:** Offline persistence must use real wall-clock simulation. Successful consumer substitutes preserve history without running while closed.

## Unproven assumptions

- **UNRESOLVED:** Whether the focal relationship is best framed as sponsor, ancestor, steward, witness, or friend.
- **UNRESOLVED:** The minimum visual expressiveness needed for care.
- **UNRESOLVED:** Whether two clearly different interventions feel more meaningful than a broader verb set.
- **UNRESOLVED:** Whether a factual Chronicle can be concise without sounding mechanical.
- **UNRESOLVED:** Whether succession maintains attachment or resets it.
- **UNRESOLVED:** Whether 30% seven-day return and 15% voluntary sharing are realistic gates for this audience and acquisition mix.

## Implementation implications

- Model citizen behavior as inspectable needs, beliefs, relationships, intentions, and commitments.
- Record both why an action was eligible and why it won; surface only the few causes relevant to the player.
- Make the immediate result of an intervention visible within the first session and its delayed echo visible later.
- Keep absence bounded and deterministic; freeze at safe checkpoints, never run punitive timers.
- Preserve identity through name, portrait/silhouette, one desire, one relationship, and accumulated factual memories.
- Treat dialogue as a rendering of state, not the source of state.
- Make abstention a valid intervention when consequences are explicit.
- Keep death late, attributable, memorialized, and connected to continuation.

## Appendix: proposed source-ledger rows

| ID | Claim | Source | Accessed | Type | Confidence | Consuming documents |
|---|---|---|---|---|---|---|
| S-PLAYER-001 | Across four studies, perceived in-game autonomy and competence were associated with enjoyment/preferences; relatedness also predicted enjoyment in parts of the work. | [Ryan, Rigby & Przybylski, “The Motivational Pull of Video Games,” 2006](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2006_RyanRigbyPrzybylski_MandE.pdf) | 2026-08-20 | C | High for study findings; Medium for design transfer | PLAYER_RESEARCH.md |
| S-PLAYER-002 | Player-avatar relationships can involve self-differentiation, emotional intimacy, and shared agency rather than only control or identification. | [Banks, “Object, Me, Symbiote, Other,” 2015](https://firstmonday.org/ojs/index.php/fm/article/view/5433) | 2026-08-20 | C | High for qualitative finding; Medium for autonomous citizens | PLAYER_RESEARCH.md |
| S-PLAYER-003 | In an n=88 experiment, choices forecast to produce meaningfully different situational states increased reported agency. | [Cardona-Rivera et al., “Foreseeing Meaningful Choices,” 2014](https://ojs.aaai.org/index.php/AIIDE/article/view/12716) | 2026-08-20 | C | High | PLAYER_RESEARCH.md |
| S-PLAYER-004 | Moral, social, and consequential characteristics supported perceived choice meaningfulness and appreciation in a mixed-method game study. | [Iten et al., “Choosing to Help Monsters,” CHI 2018](https://edoc.unibas.ch/entities/publication/c0880d6c-7f2a-4a68-ac0d-7e3127770f38) | 2026-08-20 | C | High | PLAYER_RESEARCH.md |
| S-PLAYER-005 | Recalled avatar control associated with enjoyment; identification and responsibility associated with appreciation. | [Bowman et al., “In control or in their shoes?”, 2016](https://intellectdiscover.com/content/journals/10.1386/jgvw.8.1.83_1) | 2026-08-20 | C | Medium-High | PLAYER_RESEARCH.md |
| S-PLAYER-006 | A 2024 systematic critique argues HCI-games research often applies self-determination theory perfunctorily and without enough theoretical depth. | [Tyack & Mekler, “Self-Determination Theory and HCI Games Research,” 2024](https://arxiv.org/abs/2405.12639) | 2026-08-20 | C | Medium-High | PLAYER_RESEARCH.md |
| S-PLAYER-007 | Qualitative game-decision research reports that attachment shaped emotional responses to permanent character loss and that loss could be narrative rather than purely economic. | [Toh, “The Economics of Decision-Making in Video Games,” 2021](https://gamestudies.org/2103/articles/toh) | 2026-08-20 | C | Medium | PLAYER_RESEARCH.md |
| S-PLAYER-008 | A month-long SEED hands-on documents strong social/managerial return desire alongside absence anxiety, outage consequences, schedule burden, finite-life concern, and pricing friction. | [TechRadar, 2026-08-15](https://www.techradar.com/gaming/pc-gaming/i-think-seed-is-the-dawn-of-a-new-age-for-mmos-after-spending-one-month-building-a-metropolis-with-strangers-this-imperfect-yet-addictive-life-sim-feels-like-the-next-big-thing) | 2026-08-20 | C | Medium; one reviewer | PLAYER_RESEARCH.md, COMPETITORS.md |
| S-PLAYER-009 | Interview and survey research characterizes constructive, self-determined exit from play sessions as a design concern. | [Alexandrovsky et al., “Disengagement From Games,” 2024](https://arxiv.org/abs/2406.00189) | 2026-08-20 | C | Medium-High | PLAYER_RESEARCH.md |
| S-PLAYER-010 | One SEED reviewer found recognizable personality but repetitive, padded and weakly coherent AI dialogue that reduced immersion. | [PC Gamer, 2026-07-24](https://www.pcgamer.com/games/sim/mmo-life-sim-seeds-ai-powered-avatars-prove-once-again-that-nothing-shatters-immersion-quicker-than-crappy-chatbot-dialogue/) | 2026-08-20 | C | Medium; one reviewer | PLAYER_RESEARCH.md, COMPETITORS.md |
| S-PLAYER-011 | AI Society's tiny negative-review sample included reports of customized roles/powers not affecting behavior and insufficient visible interaction. | [Steam review API](https://store.steampowered.com/appreviews/4468180?json=1&language=english&review_type=negative&purchase_type=all&num_per_page=100) | 2026-08-20 | D | High for quotes' existence; Low for general sentiment | PLAYER_RESEARCH.md, COMPETITORS.md |
| S-PLAYER-012 | RimWorld and Dwarf Fortress have large review corpora and active users while selling rule-driven story, relationships, generated history and failure rather than open-ended dialogue. | [RimWorld](https://store.steampowered.com/app/294100/RimWorld/) and [Dwarf Fortress](https://store.steampowered.com/app/975370/Dwarf_Fortress/) on Steam | 2026-08-20 | A | High for product facts; Medium for inferred appetite | PLAYER_RESEARCH.md |
| S-PLAYER-013 | WorldBox has a large positive review corpus and active users around low-friction civilization creation, observation, intervention and destruction. | [WorldBox on Steam](https://store.steampowered.com/app/1206560/WorldBox__God_Simulator/) | 2026-08-20 | A | High for product facts; Medium for inferred appetite | PLAYER_RESEARCH.md |
