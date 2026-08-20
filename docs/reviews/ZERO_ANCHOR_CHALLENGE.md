# Zero-anchor product challenge: keep the people, throw away the world

**Purpose:** Challenge the persistent-civilization thesis from a fresh constraint-only brief and propose the strongest replacement.

**Status:** COMPLETE — independent blind challenge, 2026-08-20

**Authority boundary:** This file owns the challenger argument and ECHOHOUSE proposal; the tournament and [decisions](../decisions/DECISIONS.md) own comparison and acceptance.

**Related documents:** [tournament](../research/GAME_DESIGN_RESEARCH.md), [product](../product/PRODUCT.md), [risks](../decisions/RISKS.md).

**Review date:** 2026-08-20

**Decision under challenge:** whether the strongest 40–60-hour first browser slice is one persistent civilization

**Recommendation:** do **not** build a persistent civilization first. Build **EONFOLK: ECHOHOUSE**, a recurring four-person cast living through disposable, eight-to-twelve-minute social pressure cookers. The player can whisper one sentence to one person per beat; autonomous characters act under private goals; deterministic rules make the consequence legible; one bounded “echo” survives into the next timeline.

This is a product recommendation, not a verified market result. Its central proposition is a **PRODUCT HYPOTHESIS** until players demonstrate that the loop produces agency, attachment, replay, and voluntary sharing.

## Executive verdict

The civilization premise mistakes a technically impressive substrate for a game structure.

A persistent town is good at producing *events somewhere*. A consumer game needs to make the player anticipate an event, cause it, understand why it happened, care about the people it changed, and have a compact reason to try again. Persistence helps attachment and consequence, but a whole civilization also diffuses attention, obscures causality, expands the memory problem, encourages passive watching, and creates infrastructure and content obligations that are disproportionate for one builder.

The better first structure is:

> **Four persistent souls. Disposable worlds. Six consequential beats. One echo carried forward.**

Each chapter is an authored crisis grammar, not an authored plot. The four characters have conflicting needs, secrets, relationships, and a small legal action set. The player whispers natural language to one character. A local language model interprets that intervention and chooses a role-consistent legal intention for the active character; deterministic simulation code resolves the action and exposes state changes. At the end, the game reveals the causal braid and lets the player preserve one bounded consequence as an echo in a later alternate life.

This structure is stronger because it concentrates the things AI is unusually good at—semantic interpretation, counterfactual reaction, character voice, and surprising social tactics—inside rules that keep outcomes playable and explainable.

## Evidence, separated by epistemic status

### Verified facts

- **VERIFIED FACT:** The 2023 *Generative Agents* study instantiated a small town of 25 language-model agents with natural-language memory, reflection, and planning. A single seeded intent propagated into invitations, new relationships, dates, and coordinated attendance; the authors' ablation found observation, planning, and reflection important to perceived believability. This verifies that bounded language-agent populations can produce socially legible emergence. It does **not** verify that watching a persistent town is a durable consumer game. [S-ZA-01](#s-za-01)

- **VERIFIED FACT:** In SOTOPIA's multi-turn social scenarios, the tested models were vulnerable to divulging secrets and violating social rules; humans significantly outperformed GPT-4 on difficult social goals, and the paper reports humans behaving more strategically and persistently. This is direct evidence against trusting a model to be the rules engine, judge, or sole keeper of dramatic coherence. [S-ZA-02](#s-za-02)

- **VERIFIED FACT:** LIFELONG-SOTOPIA reports declining goal achievement and believability across multi-episode interaction for all tested language models. Even an advanced memory method remained below humans on scenarios requiring explicit use of interaction history; reported failures included confusing identities and current goals with prior ones. This is evidence that unbounded “lifetime” memory is a current product risk, not a free source of depth. [S-ZA-03](#s-za-03)

- **VERIFIED FACT:** WebLLM provides in-browser language-model inference using WebGPU and WebAssembly, without server-side inference. Its current project documentation includes structured JSON generation and seeding. This makes a no-key, no-inference-bill browser proof technically plausible. It does not establish acceptable load time, latency, thermals, or output quality for this game on the target Mac. [S-ZA-04](#s-za-04) [S-ZA-05](#s-za-05)

- **VERIFIED FACT:** The Qwen2.5-1.5B-Instruct model card describes a 1.54-billion-parameter instruction model, labels it Apache-2.0, and claims improvements in structured JSON and role-play conditioning. Those capability statements are the model publisher's claims, not independent evidence that this model is good enough for ECHOHOUSE. It is a benchmark candidate, not a committed dependency. [S-ZA-06](#s-za-06)

- **VERIFIED FACT:** MDN marked WebGPU “Limited availability” and secure-context-only in its 2026-05-05 update, even though implementations had expanded across major browser families. A local-WebGPU-only V1 therefore has a real compatibility funnel. [S-ZA-07](#s-za-07)

- **VERIFIED FACT:** Civilization/town-shaped agent work is already a visible pattern: AI Town describes a virtual town where characters “live, chat and socialize”; Project Sid reports simulations of 10 to 1,000+ agents in Minecraft societies; Emergence World describes a continuously running shared spatial world with persistent memory and governance. This establishes adjacent product/research density, not market saturation or consumer demand. [S-ZA-08](#s-za-08) [S-ZA-09](#s-za-09) [S-ZA-10](#s-za-10)

### Inferences

- **INFERENCE:** The town/civilization pattern has validated an agent demonstration format more strongly than a player loop. “Agents did something while I was away” creates curiosity, but it does not automatically create player agency, mastery, or a satisfying session boundary.

- **INFERENCE:** Long-horizon persistence multiplies three risks at once: more state to summarize, more time for character drift, and more causal distance between a player's action and its outcome. Those are precisely the weaknesses documented by the social-agent evidence above.

- **INFERENCE:** A repeated cast across explicitly alternate lives can retain attachment while bounded episodes reset world complexity. The multiverse fiction makes memory compression a mechanic—an “echo”—instead of pretending the model remembers a coherent lifetime.

- **INFERENCE:** A one-room crisis makes AI surprise easier to perceive. A betrayal over six visible beats is a story; an agent changing jobs on day nine inside a large map is often telemetry.

- **INFERENCE:** Client-side inference is the only presently evidenced route in this review that can satisfy no keys, no inference bill, and a browser surface simultaneously. Its consumer viability remains contingent on an actual target-device benchmark.

### Product hypotheses

- **PRODUCT HYPOTHESIS H-ZA-01:** One natural-language whisper per beat gives players more felt authorship than direct unit control because the character may reinterpret, resist, or weaponize it.

- **PRODUCT HYPOTHESIS H-ZA-02:** Players will attach to four recurring characters across alternate crises even though the shared world resets.

- **PRODUCT HYPOTHESIS H-ZA-03:** A visible causal braid will convert stochastic AI behavior from “random chatbot output” into understandable consequence.

- **PRODUCT HYPOTHESIS H-ZA-04:** Choosing one mechanically bounded echo after a chapter will create enough persistence to motivate the next chapter without reintroducing unbounded memory.

- **PRODUCT HYPOTHESIS H-ZA-05:** A 1.5B-or-smaller local model can choose coherent legal actions and write sharp short dialogue quickly enough on a MacBook M4 Pro.

- **PRODUCT HYPOTHESIS H-ZA-06:** A share card that exposes the player's whisper and the resulting betrayal/rescue is interesting without requiring the recipient to know the game.

- **PRODUCT HYPOTHESIS H-ZA-07:** Two well-authored crisis grammars are enough to test the core loop before creating a content treadmill.

### Unresolved issues

- **UNRESOLVED U-ZA-01:** Cold model download, compilation, cached start, and per-beat latency on the exact target Mac/browser/network.

- **UNRESOLVED U-ZA-02:** Whether any no-key local model is socially strategic enough while staying concise, role-consistent, and schema-valid.

- **UNRESOLVED U-ZA-03:** Exact license and redistribution obligations for the chosen quantized WebLLM artifact, its tokenizer, and every bundled asset—not merely the upstream base model.

- **UNRESOLVED U-ZA-04:** Compatibility and memory limits outside the target Mac, especially mobile and unsupported WebGPU configurations.

- **UNRESOLVED U-ZA-05:** Prompt-injection, abusive-input, and unsafe-output handling for free-text whispers in a wholly local game.

- **UNRESOLVED U-ZA-06:** Whether “echoes across lives” feel emotionally cumulative or like a continuity gimmick.

- **UNRESOLVED U-ZA-07:** Whether a static PNG plus challenge code creates actual distribution without a hosted replay page.

- **UNRESOLVED U-ZA-08:** Whether a two-scenario proof predicts session-20 value; it can validate the interaction but not the long-term content curve.

## Attempt to kill the persistent-civilization premise

The premise should be presumed dead for the first slice unless it survives all five attacks below.

| Civilization promise | First-slice failure mode | Why ECHOHOUSE is stronger |
|---|---|---|
| “The world lives without you.” | The most interesting event may occur off-screen or involve strangers. The player becomes an observer of logs. | Only four known people and six beats; every autonomous act is staged in the player's current causal field. |
| “History creates attachment.” | Current agent research documents degradation and identity/goal confusion over longer interaction. More history can reduce believability. | Each episode has a short exact transcript. Only three typed echoes per character can persist; old echoes must be replaced. |
| “Emergence creates endless content.” | Emergence is not pacing. Most simulated activity is ordinary, and a solo builder must still surface, explain, and art-direct the exceptional moments. | Authored crisis grammars guarantee stakes and deadlines; AI varies tactics and language inside them. |
| “Many citizens create social depth.” | More agents dilute screen time, increase inference work, and make causal attribution harder. | Four characters are enough for alliance, rivalry, exclusion, secrets, and changing coalitions. |
| “Persistence creates reasons to return.” | A return obligation can become homework: inspect changes, reconstruct context, repair damage. | Each return starts with a fresh dilemma and a familiar cast; the carried echo is visible in one sentence. |
| “A shared civilization is inherently social.” | Multiplayer state, identity, moderation, synchronization, and hosting violate the proof's time and cost shape. | Social storytelling happens through exported causal cards and challenge codes; simulation remains local and single-player. |

**INFERENCE:** A civilization could become a later metagame if the compact loop proves that players care about these people. It should not be the first bet. Building the wide world first would spend the evidence budget on infrastructure before proving that a single autonomous decision is fun.

## Strongest alternative: EONFOLK: ECHOHOUSE

### Product sentence

**ECHOHOUSE is a social butterfly-effect game in which the same four autonomous people relive different eight-minute crises, and the player may whisper one sentence to one person before each irreversible beat.**

The fantasy is not “manage an AI civilization.” It is “learn who these people become when you place one idea in the wrong mind.”

### Structure

- **Persistent object:** four named characters, their base temperaments, the player's discovered dossiers, and at most three typed echoes per character.
- **Disposable object:** location, crisis, roles, objects, immediate memories, clock, and ending.
- **Chapter:** one location, one deadline, one scarce outcome, four characters, six beats, eight to twelve minutes.
- **Player verb:** whisper a sentence of at most 120 characters to one character, or remain silent.
- **Agent verbs:** choose one legal action such as accuse, promise, reveal, give, take, protect, withdraw, or vote; select a target/object; speak one short line.
- **World authority:** deterministic code owns legal actions, object possession, trust deltas, promises, clocks, votes, and ending conditions. The model never invents an item, changes a score, or declares the winner.
- **AI authority:** interpret the whisper in context; rank currently legal intentions for the active character; choose one based on that character's goal, belief, secret, relationship, and echoes; generate a short public line and a private reason for the end reveal.
- **Persistence bound:** an echo is a typed modifier selected from consequences the rules actually observed—for example, `Mara distrusts promises from Ivo: -1` or `Ivo protects Ren when cornered: +1`. No raw lifetime transcript is carried across chapters.

The first proof scenario should be **The Last Boat**: a storm will erase the island at dawn; the boat has two seats; four lifelong friends share one damaged radio, one hidden injury, and contradictory beliefs about who sabotaged the rescue. This supplies a scarce outcome, a deadline, objects, secrets, coalitions, and a mechanically clear ending without a world map.

### Exact player loop

1. **Read the pressure:** see the crisis, public facts, clock, current object locations, and a compact relationship graph. One private fact is learned by listening to the active character.
2. **Choose a mind:** target one of the four characters. The interface previews what that character currently believes, but not their secret goal.
3. **Whisper or abstain:** type one sentence, select one of three suggested whispers, or choose silence. Suggested whispers preserve accessibility; free text tests the AI-native value.
4. **Commit:** the whisper becomes a private memory attributed to “the Echo.” It is not automatically believed.
5. **Watch an autonomous act:** the active character chooses one legal intention. The deterministic resolver applies the action and visible state deltas. Other characters show short reactions; the clock advances.
6. **Read consequence:** the game highlights exactly what changed—object, promise, trust edge, public belief, or eligibility—and why the chosen action was legal.
7. **Repeat for six beats:** initiative rotates or is seized by a character under pressure. The player's prior whispers remain in the chapter memory.
8. **Resolve:** rules determine the outcome: who leaves, who stays, what truth becomes public, and which relationship breaks or strengthens.
9. **Reveal the causal braid:** show private goals and a three-link explanation: `your whisper → interpreted belief → autonomous choice → mechanical consequence`.
10. **Keep one echo:** choose one of up to three state-backed consequences to carry. If that character already has three echoes, replace one.
11. **Export or continue:** save a causal card/challenge code, retry the same setup, or send the cast into a different crisis.

### The first ten minutes

The clock begins at navigation, not after the model is conveniently ready.

- **0:00–0:20 — compatibility gate:** WebGPU and memory check. If unsupported, the proof fails closed with a clear message; it does not request a key or silently call a server.
- **0:20–1:30 — model warm-up under a cold open:** while the worker loads the cached or downloaded model, the player sees the storm, the two-seat boat, four illustrated dossiers, and the line: “At dawn, two leave. The others remember why.” The player picks the person they most want to save.
- **Hard target by 2:00:** the first autonomous act must be ready. An uncached download exceeding two minutes on the agreed test network is a failed distribution gate, not loading-screen polish work.
- **1:30–2:15 — proof of autonomy:** Ren hides the radio or reveals the injury without a player command. Visible rules explain the change.
- **2:15–2:45 — first whisper:** the UI asks, “Whose mind do you enter?” Three suggestions and free text are offered. The player commits one sentence.
- **2:45–7:15 — four more beats:** each takes roughly 45–70 seconds: pressure, whisper/silence, act, state delta. At least one action must surprise the player without violating a rule.
- **7:15–8:00 — final beat and resolution:** seats lock; the outcome is irreversible.
- **8:00–9:00 — backstage reveal:** secret goals and the causal braid appear. The player can scrub each beat and see the exact state before and after.
- **9:00–9:30 — persistence choice:** keep one echo in a character's three-slot soul ledger.
- **9:30–10:00 — distribution/return fork:** export the causal card, copy the compact challenge code, replay the same setup with a different first whisper, or preview the same cast in the second crisis.

The first-session promise is complete by minute ten: one intervention mattered, one character disobeyed or reinterpreted the player, one irreversible ending occurred, one hidden motive became clear, and one consequence persisted.

### Return loop

No always-on server and no simulated chores are required.

1. Open to a ten-second **“since last life”** card showing the selected echo and the next crisis it will affect.
2. Choose one of three hooks: continue the cast's next life, retry an unresolved ending, or enter a friend's challenge code.
3. Play one eight-to-twelve-minute crisis.
4. Add one ending tile to the local **Book of Lives** and replace/retain one echo.
5. Reveal one dossier fragment only when the player causes a character to act against their apparent interest.
6. Tease a reachable counterfactual: “Mara never learned who broke the radio” or “0/1 endings found where nobody boards.”

A same-for-everyone daily setup can be calculated locally from date plus bundled scenario data. It must not require accounts, analytics, a hosted simulation, or a proprietary content feed.

### Session-20 value

By session 20, the value should be mastery of people rather than accumulation of land.

The player has:

- a recognizable mental model of four temperaments and how each distorts a whisper;
- a unique twelve-slot echo configuration, with explicit tradeoffs because new scars displace old ones;
- a Book of Lives showing discovered endings, unresolved motives, and three-link causal braids;
- the ability to pursue rare outcomes deliberately, such as saving everyone without exposing the saboteur;
- counterfactual comparisons across the same crisis, including imported friend setups;
- a personal folklore vocabulary: “my Mara always protects Ren, even when I try to turn her.”

This is a **PRODUCT HYPOTHESIS**, not something a one-scenario slice can prove. Before authoring more than two crisis grammars, players must demonstrate curiosity about a fourth session and remember at least two characters after 48 hours.

### Distribution object

The distribution unit is a **causal braid card**, exported locally as a 1080×1350 PNG plus a short challenge code.

The card contains:

- a one-line outcome: **“I told Mara the boat was sabotaged. She gave her seat to the saboteur.”**
- four character portraits with the final two-seat arrangement;
- three panels: **WHISPER → CHOICE → CONSEQUENCE**;
- one unresolved hook with spoiler masking;
- scenario ID and compact challenge code.

The challenge code contains only authored IDs, setup seed, typed echo IDs, and rule-version ID. It does not embed arbitrary generated dialogue, personal data, or a promise of deterministic replay. The recipient receives the same premise, not necessarily the same model output, and tries to produce a different ending.

Canvas rendering, local download, and clipboard copy require no model call, backend, account, or payment. A hosted click-through replay could improve distribution later, but it is not part of the proof.

## Why modern AI is essential—and where it is forbidden

### Essential uses

- **Semantic intervention:** understand “Make Ren think Mara already knows” and paraphrases without a hand-authored dialogue tree.
- **Character-specific resistance:** the same whisper can be doubted, obeyed, reframed, or weaponized according to private goals and relationships.
- **Counterfactual tactics:** choose among legal actions in a state the author did not enumerate sentence by sentence.
- **Short expressive language:** turn a structured intention into a distinctive line that reflects what the character knows.
- **Causal explanation draft:** restate the rules-engine trace in plain language, always backed by the exact machine-readable state deltas.

Remove the language model and free-text whispers collapse into keyword matching, characters repeat a small authored reaction library, and unexpected but semantically appropriate manipulation disappears. That is the irreducible AI value.

### Forbidden uses in V1

- deciding whether an action is legal;
- inventing objects, locations, scores, or relationship values;
- resolving simultaneous conflicts or the ending;
- creating persistent memory fields;
- judging whether the player “won”;
- generating whole crisis rules or production content;
- moderating itself by self-assertion alone;
- making network calls, using a required API key, training, or fine-tuning.

The product is a deterministic social game with an AI policy-and-voice layer—not an LLM transcript wearing game art.

## A 52-hour proof slice

The proof is one local browser build, one crisis, four characters, six beats, one carried echo, and one exported card. It proves or kills the interaction, not session-20 retention.

| Work | Hours | Deliverable |
|---|---:|---|
| Crisis grammar and cast | 5 | The Last Boat state sheet; four goals, secrets, legal action weights, six-beat clock; one alternate setup seed |
| Deterministic simulation | 8 | Legal-action enumerator, initiative, objects, promises, trust deltas, ending resolver, event log |
| Browser tableau | 8 | One responsive screen, four dossiers, clock, object row, relationship graph, whisper composer, state-delta animation |
| Local model integration | 10 | WebLLM worker, 0.5B/1.5B candidate switch, JSON schema, timeout/retry, compatibility gate, progress UI |
| Agent policy and memory | 7 | Bounded observation packet, role prompt, legal-action ranking, short line, private reason, six-beat context |
| Reveal and echo | 5 | Causal braid scrubber, secret reveal, typed echo selection, three-slot replacement, local persistence |
| Distribution object | 3 | Canvas PNG and challenge-code import/export; no hosted replay |
| Verification and polish | 6 | 50-turn technical harness, one same-seed counterfactual set, accessibility pass, eight-player observed test fixes |
| **Total** | **52** | Compelling-or-killed proof |

Explicitly absent: map, walking, economy, crafting, accounts, multiplayer, server database, cloud inference, payments, procedural art, voice, music generation, mobile optimization, live operations, analytics SDK, model training, and more than one finished crisis.

### Proof gates

These are decision thresholds for a tiny directional test, not statistically powered claims.

#### Technical gates on the MacBook M4 Pro

- cached start to first autonomous act: p50 ≤ 10 seconds across ten starts;
- uncached navigation to first act: ≤ 120 seconds on the recorded test connection;
- input commit to visible act: p50 ≤ 4 seconds and p95 ≤ 8 seconds across 50 turns;
- valid structured output after at most one retry: ≥ 95% of turns;
- impossible state mutations: zero, because only the deterministic resolver can mutate state;
- browser memory crash/device loss: zero in five complete back-to-back sessions.

#### Experience gates with eight fresh observed players

- at least 6/8 finish without facilitator rescue;
- at least 5/8 correctly point to one state change their whisper caused;
- at least 4/8 immediately choose replay or next-life preview;
- at least 3/8 mention a character by name or ask what happens to them next without prompting;
- at least 2/8 voluntarily export/copy the card or challenge code;
- across ten controlled counterfactual runs, at least three mechanically distinct endings result from materially different whispers.

Failing the causality or immediate-replay gates kills the structure. Failing only the share gate kills the card, not necessarily the game. Failing local-model latency or coherence kills the no-key browser implementation until a materially better free local runtime/model exists.

## Fastest falsification sequence

Do not spend 52 hours in one pass.

### Gate 0 — 90-minute paper test

Prepare four dossiers, six beat cards, three sample whispers per beat, and two manually written autonomous responses for each. Run five individual ten-minute sessions.

Stop if fewer than three players want to see the ending, or if a majority asks to directly control a character instead of whispering. This tests the indirect-agency fantasy before any model work.

### Gate 1 — six-hour headless model spike

Use the target browser, WebLLM, and two unmodified small-model candidates. Feed 50 isolated turns from The Last Boat. Measure cold/cached load, latency, schema validity, legal-action selection, secret leakage, character confusion, repetition, and prompt-injection behavior.

Stop if neither candidate meets 90% schema validity before retry, median four-second turn latency, and 80% human-rated role coherence in a blind checklist. Do not compensate by adding a server or paid API.

### Gate 2 — twelve-hour ugly playable

Build only text, buttons, state deltas, one scenario, and the reveal. Test eight fresh players.

Stop if fewer than 5/8 can correctly state what one whisper changed, or fewer than 3/8 replay immediately. Causal opacity and passive watching are premise failures, not art problems.

### Gate 3 — finish to 52 hours only after survival

Add the recurring-cast echo, relationship visualization, export card, accessibility, and polish. Test whether the same players remember two character names and want a new crisis 48 hours later. Do not author a third crisis before this signal.

## Strongest objections to the recommendation

### 1. “A small local model will make the cast stupid.”

This is the strongest objection. SOTOPIA already shows secret leakage and weak strategic behavior in much larger historical systems. A 0.5B–1.5B candidate may produce generic dialogue, confuse roles, or select obvious actions. Legal-action constraints prevent broken rules but cannot manufacture wit. If the headless spike fails, the recommendation is blocked under the no-key/no-cost constraint; scripted content should not be mislabeled as autonomous AI.

### 2. “Indirect whispers feel like low agency.”

The character's independence is the fantasy, but it can also feel like a random-number generator ignoring the player. The state-delta reveal and causal braid are intended to solve this. If players cannot correctly name what changed, the loop is dead even if they enjoyed the prose.

### 3. “Disposable timelines cheapen consequences.”

An ending matters less if the world resets. Typed echoes, character dossiers, and the Book of Lives are the proposed bridge, but this may still feel like a roguelite wrapper around disconnected sketches. A later small persistent home could be needed; the first proof should not assume it.

### 4. “The authored-crisis treadmill replaces the simulation treadmill.”

Yes. Tight stakes require authored rule grammars. Recombining secrets and roles can extend them, but cannot guarantee session-20 novelty. The discipline is to prove two grammars before producing six; if players do not replay one crisis, more content is waste.

### 5. “One model call is not four autonomous agents.”

If one ensemble prompt can see all secrets, apparent independence is compromised. The intended proof uses per-active-character observation packets and one active decision per beat. Other agents react only from public state. If latency later permits simultaneous independent calls, add them; do not counterfeit epistemic isolation in the first slice.

### 6. “The share card is not a playable distribution loop.”

A PNG can circulate but cannot create a one-click challenge without hosting. A compact code adds playability at the cost of copy/paste friction. Voluntary export is therefore a strict independent gate; do not claim virality from generated artifacts alone.

### 7. “Local-only excludes many consumer devices.”

Correct. MDN's current WebGPU caveat makes compatibility a product risk. The M4 Pro target can prove delight, not reach. A future server fallback would introduce cost, safety, and key decisions that are explicitly outside this slice.

### 8. “The alternate-life frame may be clever but emotionally cold.”

Players may prefer one continuous home, family, or neighborhood. The recommendation preserves a repeated cast but not an ordinary shared life. A test in which identical mechanics are framed once as alternate lives and once as consecutive nights would falsify whether the fiction helps.

## Rejected alternatives

- **One persistent civilization:** rejected for the first slice because it maximizes memory, state, infrastructure, passive-observation, and causal-legibility risk before proving one fun intervention.
- **One AI companion in an open world:** strong for attachment, weak for multi-agent social surprise, and still requires an explorable content surface.
- **A zero-player AI reality show:** strong spectator novelty and clips, weak human agency; the player becomes a producer watching model theater.
- **A fresh cast in every daily scenario:** lowest persistence burden, but sacrifices attachment and the accumulating folklore of known personalities.
- **A fully deterministic social-deduction game:** highly feasible and legible, but arbitrary natural-language interventions and character reinterpretation cease to be essential; AI becomes cosmetic.
- **A generative world/story authoring tool:** produces content rather than a consumer game loop and shifts quality control to the player.

ECHOHOUSE is the narrow bridge: persistent cast, bounded memory, authored stakes, semantic intervention, autonomous resistance, deterministic consequence.

## Evidence that would reopen the civilization decision

Reconsider a persistent shared civilization only after one or more of these are observed:

1. A matched prototype shows significantly higher next-day desire to return when the same world persists than when only the cast/echoes persist, without lower causal comprehension.
2. A no-key local model maintains identity, goals, and relationship facts across at least 30 episodes with no measurable decline in blinded believability ratings.
3. Players spend meaningful voluntary time following off-screen citizens and can recount why an event happened without reading a generated summary.
4. The compact game demonstrates that players care about the four characters and explicitly ask for a shared home, neighbors, or off-session lives.
5. A zero-cost architecture can preserve, migrate, inspect, and recover world state without adding accounts, required credentials, paid inference, or solo-builder operations burden.

Until then, persistence should attach to **people and consequences**, not to a simulated geography.

## Resulting implementation behavior if adopted

- Treat `character`, `crisis`, `chapter_event`, `legal_action`, `echo`, and `ending` as the only product concepts needed for the proof.
- Store chapter state and echoes locally; make all state transitions deterministic and inspectable.
- Give the model one bounded character observation packet, a list of legal actions, and a strict short-output schema.
- Keep free-text whisper input, because removing it would avoid testing the essential AI proposition.
- Keep a suggested-whisper path, because blank-page prompting is onboarding friction rather than agency.
- Render causality from the authoritative event log; the model may phrase it but cannot invent it.
- Cap persistent context at three typed echoes per character; never replay the lifetime transcript into the prompt.
- Fail closed when WebGPU/model loading fails; request no key and make no hidden network inference call.
- Build and test one scenario before persistence polish, and test the ugly loop before producing art.
- Add no map, economy, async clock, multiplayer, account, deployment, payment, analytics SDK, or content-generation pipeline to the slice.

## Fit with the binding personal constraints

- **Solo builder:** one screen, one rules engine, one crisis, and one local model worker are inspectable by one person. There is no live world to operate.
- **40–60 hours:** the scoped proof totals 52 hours and has kill gates at 1.5, 7.5, and 19.5 cumulative hours.
- **Approximately $0:** all inference is proposed on the player's device; persistence and export are local. No paid service is required for the proof.
- **No keys or credentials:** the proof fails closed rather than requesting a provider key.
- **No training or proprietary dataset:** use an unmodified redistributable model candidate and authored scenario data; conduct no training, tuning, or dataset acquisition.
- **No partnerships, enterprise motion, regulated data, payments, or revenue operations:** none contributes to the loop and none is included.
- **Free/useful V1:** a complete one-scenario local game can be replayed, persisted, and shared as a file/code without payment.
- **Consumer ambition:** the design explicitly concentrates curiosity, attachment, surprise, agency, social storytelling, persistent consequences, replayability, a shareable artifact, and a short reason to return. Whether it achieves those outcomes remains a player-evidence question.

## Recommendation

**Proceed only with the staged ECHOHOUSE falsification, not a persistent civilization plan.**

The strategic phrase is **persistent people, disposable worlds**. The technical phrase is **bounded AI policy, deterministic consequence**. The product test is brutally simple: after one sentence whispered into one autonomous mind, can a player see a surprising choice, explain how they caused it, care who paid for it, and immediately want to try another life?

If no, a larger civilization will hide the failure rather than fix it.

## Source-ledger rows

The coordinator retained these `S-ZA-*` identifiers in the canonical ledger after review. Every source below was opened on 2026-08-20.

### S-ZA-01

- **Title:** *Generative Agents: Interactive Simulacra of Human Behavior*
- **Authors/date:** Joon Sung Park et al.; submitted 2023-04-07, revised 2023-08-06
- **Type:** primary research paper
- **Material support:** 25-agent small-town instantiation; natural-language memory/reflection/planning; emergent party coordination; ablation contribution to believability
- **Full URL:** [source](https://arxiv.org/abs/2304.03442)
- **Accessed:** 2026-08-20

### S-ZA-02

- **Title:** *SOTOPIA: Interactive Evaluation for Social Intelligence in Language Agents*
- **Authors/date:** Xuhui Zhou et al.; submitted 2023-10-18
- **Type:** primary research paper
- **Material support:** difficult social-goal performance gap; secret leakage; norm violations; weaker strategic persistence than humans in the reported study
- **Full URL:** [source](https://arxiv.org/abs/2310.11667)
- **Accessed:** 2026-08-20

### S-ZA-03

- **Title:** *LIFELONG SOTOPIA: Evaluating Social Intelligence of Language Agents Over Lifelong Social Interactions*
- **Authors/date:** Hitesh Goel and Hao Zhu; submitted 2025-06-14
- **Type:** primary research paper
- **Material support:** declining believability/goal performance across episodes; advanced memory remains below human performance on history-dependent cases; identity/goal-confusion failures
- **Full URL:** [source](https://arxiv.org/abs/2506.12666)
- **Accessed:** 2026-08-20

### S-ZA-04

- **Title:** *WebLLM: A High-Performance In-Browser LLM Inference Engine*
- **Authors/date:** Charlie F. Ruan et al.; submitted 2024-12-20
- **Type:** primary systems paper
- **Material support:** entirely in-browser inference; WebGPU/WebAssembly architecture; OpenAI-style application interface; reported performance evaluation
- **Full URL:** [source](https://arxiv.org/abs/2412.15803)
- **Accessed:** 2026-08-20

### S-ZA-05

- **Title:** `mlc-ai/web-llm` project repository
- **Publisher/date:** MLC AI; repository state opened 2026-08-20
- **Type:** official implementation documentation
- **Material support:** no-server in-browser inference; WebGPU; structured JSON generation; seeding; model-family support
- **Full URL:** [source](https://github.com/mlc-ai/web-llm)
- **Accessed:** 2026-08-20

### S-ZA-06

- **Title:** `Qwen/Qwen2.5-1.5B-Instruct` model card
- **Publisher/date:** Qwen Team; model released 2024 (card state opened 2026-08-20)
- **Type:** official model documentation; publisher capability claims
- **Material support:** 1.54B parameter count; Apache-2.0 label; publisher claims concerning structured output and role-play conditioning
- **Full URL:** [source](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
- **Accessed:** 2026-08-20

### S-ZA-07

- **Title:** *WebGPU API*
- **Publisher/date:** MDN Web Docs; last modified 2026-05-05
- **Type:** web-platform reference
- **Material support:** WebGPU purpose, secure-context requirement, and “Limited availability” status
- **Full URL:** [source](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- **Accessed:** 2026-08-20

### S-ZA-08

- **Title:** `a16z-infra/ai-town` project repository
- **Publisher/date:** a16z Infrastructure; repository state opened 2026-08-20
- **Type:** official project documentation
- **Material support:** AI Town's virtual-town framing; characters living/chatting/socializing; shared simulation state; local and provider inference options
- **Full URL:** [source](https://github.com/a16z-infra/ai-town)
- **Accessed:** 2026-08-20

### S-ZA-09

- **Title:** *Project Sid: Many-agent simulations toward AI civilization*
- **Authors/date:** Altera.AL et al.; submitted 2024-10-31
- **Type:** primary research paper
- **Material support:** simulations of 10 to 1,000+ agents in Minecraft societies; roles, rules, and cultural/religious transmission reported by authors
- **Full URL:** [source](https://arxiv.org/abs/2411.00114)
- **Accessed:** 2026-08-20

### S-ZA-10

- **Title:** *Emergence World: A Platform for Evaluating Long-Horizon Multi-Agent Autonomy*
- **Authors/date:** Deepak Akkil et al.; submitted 2026-06-06
- **Type:** primary research paper
- **Material support:** continuously running shared spatial multi-agent world; persistent memory; governance; 15-day cross-vendor study
- **Full URL:** [source](https://arxiv.org/abs/2606.08367)
- **Accessed:** 2026-08-20
