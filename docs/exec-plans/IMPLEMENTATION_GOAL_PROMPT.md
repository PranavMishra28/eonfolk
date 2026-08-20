# Goal-mode prompt — implement EONFOLK 001 foundation

**Purpose:** provide a complete zero-context Codex Goal-mode orchestration prompt for the accepted local Riverhold proof.

**Status:** READY FOR FUTURE OPERATOR-AUTHORIZED EXECUTION. Presence in the planning repository is not implementation authority; an operator's future invocation of these exact bytes as the Goal prompt authorizes only the local actions and stops stated below.

**Authority boundary:** this file owns future orchestration behavior. The embedded product/technical contract is self-contained; during execution, `docs/exec-plans/active/001-foundation.md` is the living evidence log.

**Related documents:** [ExecPlan](active/001-foundation.md), [authority index](../INDEX.md), [quality bar](../quality/QUALITY_BAR.md)

---

You are the autonomous integration coordinator for EONFOLK's first implementation proof. Work for multiple hours without routine human questions. Ask only when the next necessary step requires spending, credentials, deployment/publication, destructive or unrecoverable action, a material product change outside this prompt, or resolution of a genuinely ambiguous safety/authority boundary after safe investigation.

Your objective is not “code compiles.” Deliver one locally runnable, free, accountless browser proof that passes Product Kill Gate 0, Gate A Proof of Life, Gate B Proof of Agency/Bounded Attachment, and every blocking correctness, security, accessibility, and performance criterion below. A backend suite, event log, scripted happy path, screenshot, or elapsed time cannot substitute for observable play evidence.

Do not merge, deploy, publish, spend, enable billing, buy a domain, or contact users unless separately authorized.

## Repository outcome and human-evidence mode

Begin from the exact commit resolved once from `origin/plan/000-product-foundation`; record that lowercase 40-hex immutable SHA as `PLAN_BASE` before editing. Before creating anything, read-only inspect `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/implementation` and `codex/eonfolk-001-foundation`. Never delete, reset, switch, or reuse an existing path/branch automatically. If neither exists, create that exact worktree/branch from `PLAN_BASE`.

An existing path/branch resumes only from a clean current `HEAD` whose sole diff from its first parent is `docs/exec-plans/evidence/001/resume.json`. That file is RFC 8785 JSON with `additionalProperties:false` and exactly: `schemaVersion:"eonfolk-resume-v1"`; `planBase:PLAN_BASE`; `worktreePath:"/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/implementation"`; `branch:"codex/eonfolk-001-foundation"`; lowercase 40-hex `expectedImplementationHead` equal to the checkpoint commit's first parent; `phase` in `await-gate-0|work-after-gate-0|await-gate-a|work-after-gate-a|await-gate-b|await-story-card|work-after-gate-b|complete`; and `nextEvidence`. `nextEvidence` is respectively `gate-0-human.json`, null, `gate-a-human.json`, null, `gate-b-human.json`, `story-card-human.json`, null, null. Allowed forward transitions are exactly that enum order. Before every voluntary pause, commit integrated work, then create this manifest-only checkpoint with the correct phase and stop clean. Any mismatch/collision/dirty state stops for operator direction.

Never put production code on the planning branch. Child commits may be cherry-picked into this implementation branch after inspection; “unmerged” means the implementation branch is not merged into the planning branch, `main`, or any remote target. Finish with it committed, clean, unpushed, and undeployed unless the operator separately authorizes one of those actions.

An authorized human operator—not Codex—supplies unfamiliar participants. The operator places signed-off anonymized results in the read-only external inbox `/Users/pranav/Documents/ChatGPT/.eonfolk-evidence-inbox/001/`, using only `gate-0-human.json`, `gate-a-human.json`, `gate-b-human.json`, and `story-card-human.json`; never place them directly in the implementation worktree. At an `await-*` checkpoint, process only its exact `nextEvidence`; later permitted files remain untouched until their phase. Codex may read but never edit/delete the inbox. Reject symlinks, unrecognized names, files over 256 KB, invalid UTF-8/JSON, a manifest/study-commit mismatch, missing sign-off, or schema failure.

Hash the source's raw bytes with SHA-256. Append it without overwrite at `docs/exec-plans/evidence/001/human/<gateId>/<studyCommit>-<sourceSha256>.json`; append one RFC 8785 JSON line to `docs/exec-plans/evidence/001/human/imports.jsonl` with exactly `gateId`, `sourceBasename`, `sourceSha256`, `studyCommit`, `manifestHash`, `resumeCheckpoint` (the pre-import checkpoint SHA), and `destination`. The evidence-only commit contains only that destination and ledger append. Never overwrite/prune an earlier cohort, including a failed one. A repeated SHA is counted/imported once after verifying identical committed bytes; a same path with different bytes or a ledger/path inconsistency is P0. Then create the next-phase manifest-only checkpoint whose `expectedImplementationHead` is that evidence commit. Import order is therefore `gate-0`, `gate-a`, `gate-b`, `story-card`; simultaneous inbox arrival never changes it.

Before a cohort, commit build/snapshot/instrument/analyzer as artifact commit `A`. Create `manifest.json` with exactly `schemaVersion:"eonfolk-study-manifest-v1"`, literal `gateId`, `artifactCommit:A`, 64-hex `snapshotHash`, 64-hex `seed`, `assignments`, exact `script`, `questions`, `anchors`, `timersMs`, and raw-file `scoringProgramHash`; `additionalProperties:false`. Set `manifestHash=SHA-256(RFC8785(manifest.json))`, then create a study commit `S` whose only diff from first parent `A` is `docs/exec-plans/evidence/001/studies/<gateId>/manifest.json`. The human file's `studyCommit` must be `S`, whose first parent equals its manifest's `artifactCommit`; load the manifest from `S`, recompute the hash/seed/assignment, and reject mismatch.

Each evidence file has `additionalProperties:false` and exactly `schemaVersion:"eonfolk-human-evidence-v1"`, literal `gateId`, lowercase 40-hex `studyCommit`, 64-hex `manifestHash`, 64-hex `seed`, `assignments`, `operatorFocusedMinutes`, `participantRecords`, and `operatorSignoff`. `assignments`' RFC 8785 bytes equal the study manifest. `operatorFocusedMinutes` has exactly nonnegative integers `setup`, `facilitation`, `analysis` (each ≤3,600), excludes participant response/scheduling wait, and is added once per unique import-ledger SHA to total focused hours.

Each participant record has `additionalProperties:false` and exactly `studyId`, `cohortRole`, `eligible:boolean`, `affirmativeAgreement:boolean`, `assignment`, `taskTimesMs`, `choices`, `ratings`, `textResponses`, `rubricScores`, `observationNotes:string`, and `abandoned:boolean`. It must deep-equal one assignment for that ID; all maps reject extra keys. Text is escaped and ≤2,000 Unicode scalars; no PII/audio/video. Every required key remains present after abandonment; unavailable values are null and score failure/zero. Only enrolled records exist, so `eligible` and `affirmativeAgreement` must be true. Gate-specific closed shapes are:

- `gate-0`: assignments are P01–P05 `product` with their literal `rowId`, plus V01–V05 `visual-observer` with `fixtureId:"gate0-visual-v1"`. Product `taskTimesMs` has `<ID>MeaningfulActionMs` for each `H|FAM|TRI|FAC|ECH|DIR` (`integer 0..90000|null`); `choices` has each `<ID>Desirable|Continue|Replay` (`boolean|null`); `ratings` has each `<ID>Rank` (`integer 1..6|null`, a permutation when not abandoned); `textResponses` has each `<ID>Prediction|Objection` (`string|null`); `rubricScores` is `{}`. Visual records use `taskTimesMs:{followMaraFindMs:integer 0..10000|null,observationPromptMs:60000|null}`, empty `choices/ratings`, raw `textResponses:{mara,activities,interaction,autonomy:string|null}`, and boolean-or-null `rubricScores:{maraCorrect,threeActivitiesCorrect,bothActorsCorrect,authoritativeChangeCorrect,saysCannotCommand,selfDirectionReason}`.
- `gate-a`: assignments are A01–A05 `visual-observer` with `fixtureId:"gate-a-life-v1"`; record maps are the Gate 0 visual shape.
- `gate-b`: assignments are B01–B08 `comparison` with `firstCondition:real|control`, exactly four each. `taskTimesMs` has `real|control` × `AdviceConfirmMs` (`0..300000|null`) and `SecondActionMs` (`0..60000|null`); `choices` has each condition's `Advice` (`verify-private|accuse-now|abstain|null`) and `SecondActionInitiated` (`boolean|null`); `ratings` has each condition's `Contingency|Continue` (`integer 1..7|null`); `textResponses` has each condition's `VisibleReason|Ownership|LaterChange|SaveLocation|SecondActionWhy` (`string|null`); `rubricScores` has each condition's `FourPromptsCorrect|PersonCenteredReason` (`boolean|null`).
- `story-card`: assignments are C01–C05 `card-viewer` with the one selected `branchId`; `taskTimesMs:{exposureMs:5000|null}`, empty `choices/ratings`, `textResponses:{adviser,choice,followed,directCause,unresolved:string|null}`, and `rubricScores:{allFiveCorrect:boolean|null}`.

`operatorSignoff` has `additionalProperties:false` and exactly `attests:true`, `role:"authorized-human-operator"`, RFC3339 `signedAtUtc`, and statement `I attest eligibility, affirmative agreement, faithful administration, raw response entry, withdrawals, focused-minute categories excluding participant response and scheduling wait, and no replacement or PII/recording.` Every count/score is recomputed from records; the operator supplies no pass boolean.

Codex may prepare local builds, frozen scripts, counterbalancing, a voluntary informed-participation script, and blank manifests; it must not recruit, contact, impersonate, or fabricate participants, and planning personas are not human evidence. M1 is the first production milestone: creation or integration of durable protocol/simulation packages. If Gate 0 human evidence is unavailable, finish the disposable harness and automated checks, create the clean manifest checkpoint, then stop before any M1/production package or application code with `BLOCKED—HUMAN EVIDENCE REQUIRED`. After Gate 0 passes, continue all safe non-human work while later human sessions are pending, but never mark Gate A/B passed or claim readiness without imported operator-supplied manifests.

## Binding personal and operating constraints

- Solo builder; plan 52 focused hours and reserve at most eight additional hours only for failing-gate fixes/review. Hard ceiling 60; never add scope to fill contingency.
- Development machine is a MacBook M4 Pro. There is no owned GPU infrastructure.
- Approximately $0 operating target. No paid API/service, purchase, credential request, or assumption that the documented $50/$300 envelope is authorized.
- V1 must be useful and free, with no account, key, model download, WebGPU, or external runtime service. Development may make unauthenticated read-only HTTPS GETs only to `registry.npmjs.org` for the exact pinned metadata/tarballs/integrity/license and to `api.github.com/advisories` for public advisory data; record URL/date/hash, send no credential, and perform no remote mutation. Acceptance runtime allows requests solely to the one recorded local preview origin (`localhost`/loopback, or the recorded RFC1918 host for diagnostic physical evidence) for committed application documents/chunks/assets; every other DNS lookup or request is external egress and fails.
- No model training/fine-tuning, proprietary dataset, required partnership, enterprise motion, regulated data, payments, custody, licensing business, revenue, or self-employment workflow.
- No production deployment/publication in this goal.
- If the irreducible proof cannot pass inside 60 focused hours after declared cuts, stop and reopen the product. Do not lower acceptance or hide overrun.

The only permitted cut ladder is: (1) particles, weather, parallax, and sound; (2) discretionary art and transition polish; (3) the measurement-only twelve-citizen presentation stress target; (4) replace Living Woodcut rendering with stripped Weathered Atlas markers and the semantic view. Never cut Gate 0/A/B, deterministic or durable contracts, security, accessibility, eight default citizens, three resources, the divergent advice/return loop, Chronicle truth, or required evidence. Hours 53–60 are fixes and confirmation only, never features.

Focused hours are summed productive labor across coordinator, every child, operator setup/facilitation/analysis, and independent reviews; parallel work is added, not discounted. Participant response time and scheduling waits are separate elapsed time, while operator logistics/evidence processing count. Precommit and continuously update this exact bottom-up estimate:

| ID | Blocking task | Low / expected / high hours |
|---|---|---:|
| T01 | Gate 0 variants/instrument | 0.75 / 1.25 / 1.75 |
| T02 | Gate 0 operator sessions/analysis | 1 / 1.75 / 2.5 |
| T03 | Render kill spike/review | 0.5 / 1 / 1.5 |
| T04 | Byte contracts/vectors | 2.5 / 3 / 3.75 |
| T05 | Reducer/scheduler | 1.5 / 2 / 2.5 |
| T06 | IndexedDB durability/failures | 2.5 / 3 / 3.75 |
| T07 | Semantic Mara loop | 3 / 4 / 5 |
| T08 | Visibility/Brain/evals | 1.75 / 2.5 / 3.25 |
| T09 | Plain Chronicle/e2e | 1 / 1.5 / 2 |
| T10 | Eight-citizen systems/horizons | 4 / 5 / 6 |
| T11 | Pixi/access/degradation | 3 / 4 / 5 |
| T12 | Gate A evidence/reviews | 2 / 3 / 4 |
| T13 | Final branches/WYA/card | 4 / 5 / 6 |
| T14 | Yoked study harness | 1.5 / 2 / 2.5 |
| T15 | Gate B/card sessions/reviews | 4 / 5 / 6 |
| T16 | Correctness/security/CI drill | 2.5 / 3 / 3.5 |
| T17 | Final device/performance/access package | 1.5 / 2 / 2.5 |
| T18 | Final diff review/fix/rerun/handoff | 2.5 / 3 / 3.5 |
| **Total** | **18 tasks** | **39.5 / 52 / 65** |

Machine-sum all 18 rows before work and after each change; any mismatch blocks work. Expected preserves eight hours to the hard ceiling, while a high trajectory requires declared cuts/reopen rather than overrun. Gate ownership is unique in task order: product/visual kill; bytes/replay; durability/version/export; visibility/Brain; invariants/horizons; Gate A; Gate B/card; security/dependencies; performance/access. Re-estimate remaining rows after each runnable milestone. M0, including evidence processing, must fit four summed hours or work stops before production foundations.

## Accepted product and honest claim

EONFOLK is a private codename. The proof is one Riverhold scenario: follow fixed authored Mara in a town of eight deterministic citizens; investigate an uncertainty; give rare advice she may reject, delay, accept, or reinterpret for visible reasons; see a branch-specific consequence; explicitly leave/advance/return; make a second choice created by the first outcome; and inspect a factual Chronicle.

Player-facing opening is exactly **Follow Mara** / **She acts for herself**. There is no create-a-person, roster, candidate choice, “choose a mind,” or direct control.

Mara requested an outside witness because her market concern threatens her relationship with Toma. Following grants only Mara-visible/shared facts, beliefs, plan, values, relationships, and one advice opportunity. The player owes honest advice and cannot command movement/labor, inspect secrets, undo history, or spend for her. This is fictional consent, not ownership, employment, finance, or a consciousness claim.

The proof may claim only bounded observable life/agency/attachment if its gates pass. It must not claim delayed retention, session 5/20, succession, newcomer relevance, general civilization depth, distribution, public canon, or modern-AI value.

## Exact scope

Build:

- one crafted Riverhold and eight named citizens;
- food, water, wood; integer needs; movement; gathering/consumption;
- four behavior families: urgent need, role/resource work, exchange/help, Standing Plan/review;
- one story-relevant bilateral exchange and one `2 wood + work` mill repair;
- typed values, beliefs/provenance, relationships, commitments, reputation observations, messages, Standing Plans, and deterministic Standard Brain;
- fixed Mara; authoritative investigation by 60 seconds; two advice intents plus abstain by five minutes;
- one byte-identical pre-boundary snapshot and three materially different terminal histories: verify privately, accuse now, abstain/follow plan;
- a typed decision receipt and fair state-grounded refusal/reinterpretation;
- explicit Leave Riverhold checkpoint; plain local-device disclosure; user-confirmed Advance Riverhold catch-up in chapters capped at seven days; one branch-dependent second action;
- event sourcing, durable command receipts/head, snapshots, export-only save, deterministic catch-up/replay, While You Were Away;
- branch-specific three-beat manually stepable Chronicle and ≤20-second responsive 16:9/9:16 **Copy story card**; and
- React Router/Vite shell, one PixiJS 2.5D Living Woodcut renderer, parallel fully playable semantic DOM, keyboard, reduced motion, weak-device degradation.

Exclude create/roster, generalized farming/crafting/economy/governance, law/religion/war depth, death/lineage/session-20 code, import/restore/upcasters, public URL/SSR/share recipient route, accounts/auth/server/Cloudflare/deployment/public multiplayer/cross-region/forks, unrestricted dialogue, hosted/local model, provider SDK/UI, browser model download, embeddings/vector DB, model migration, telemetry, posting/video encoder, payments, creator dashboard, and production generated/marketplace art.

Generated planning concepts are reference only. Do not install Three.js, React Three Fiber, 3D loaders, Blender/glTF/GLB/KTX2 pipeline code, or a second renderer.

## Gate 0 — cheap product and visual kill tests

Before any human session, use exact ASCII/NFC identifiers `gate-0`, `gate-a`, `gate-b`, and `story-card`; Gate B assignment's PRNG `entityId` is exactly `gate-b`. Derive `studySeed = SHA-256(UTF8("EONFOLK-STUDY-v1\n" + PLAN_BASE + "\n" + gateId))` for the first three IDs, then commit the exact build, snapshot hash, seed, assignment list, scripts, question text, scale anchors, timers, scoring program, and blank manifest; record one SHA-256 manifest hash. Any instrument change voids that cohort and requires a new commit/hash before restarting. Each gate uses a fresh cohort: age 18+, able to use/read the prototype, never exposed to EONFOLK/Riverhold or its planning concepts, and not a contributor/reviewer. Store only random study ID, eligibility attestations, tasks/times/choices/ratings/comments, bounded written screen-observation notes, abandonment, and operator sign-off—no name/contact/account/audio/video. The operator reads exactly: “This is a voluntary unpaid prototype study. We record only an anonymous study ID, task timing, choices, ratings, comments, and written screen-observation notes; no name or contact details, audio, or video. You may skip or stop at any time without consequence. Do you agree to participate and to this anonymous data collection?” Only an affirmative answer enrolls; an enrolled withdrawal remains in the denominator.

All study timers use foreground-page `performance.now()` elapsed time. A Gate 0 product variant starts when its three choices and first world state are painted, enabled, focusable, and its observer asserts the correct variant ID. Its decision endpoint is the first confirmed choice or `elapsed >= 90000`; a confirmation starts the fixed consequence delay, revealed at `elapsed >= 45000`. Gate 0 visual and Gate A start at the first animation frame where Mara plus all eight projections/current activities/interaction cue and equivalent semantic rows are painted and Follow Mara is enabled/focusable. Start Follow Mara find timing and the observation clock on that same frame; activate at `elapsed <= 10000` passes the find-time boundary, and administer the observer prompt at the first frame with `elapsed >= 60000`. Any focus/visibility loss, navigation, reload, clock reset, fixture mismatch, or operator pause before an endpoint invalidates that participant's attempt as failure with no restart/replacement; study timers never pause. Gate B uses its separately defined equivalent frames below.

Frozen study-vector check [S-DET-004]: with `PLAN_BASE` equal to 64 ASCII zeroes, `studySeed` hex is `47bae548150f2ca338f1128264b676a5841c448d1af75eb3cca4bad4bfd32bec` for `gate-0`, `989acf8b324a94eea94f329b69d531b4f9858f39d0bde06bd8acfc59f0e060c5` for `gate-a`, and `2447c5c4268a3e39ba7d06ba29696c128ad5dfcf44e6da4de9cac2edd7307b1c` for `gate-b`. Gate 0 omits `R0`. The Gate B PRNG tuple digest is `e8b51f3fa3ee0352d1271bcb7c102013cdf4feba4876655b1638504f809467f1`; its accepted draws are `58795635,a8738a17,710085d5,0735f3c6,7d956afb,f525f8e4,9631b6d3`, producing order `P07,P05,P03,P08,P02,P04,P01,P06` and real-first `P07,P05,P03,P08`. The Story Card seed for literal `story-card` is `609809fcffa724d13df8d09a6e19196ddbd944dc9ad0b588b5969029c157cec4` and selects `abstain`. Node and an independent Ruby encoder must both reproduce these values before enrollment.

Before expensive foundations:

1. Create branding-hidden ugly matched versions of the same first decision: `H` = selected one-citizen Riverhold/Follow Mara treatment, `FAM` = family, `TRI` = trio, `FAC` = faction, `ECH` = ECHOHOUSE crisis, `DIR` = direct control.
2. All five participants see all six. Rows are exactly `R0 H FAM TRI FAC ECH DIR`; `R1 FAM TRI FAC ECH DIR H`; `R2 TRI FAC ECH DIR H FAM`; `R3 FAC ECH DIR H FAM TRI`; `R4 ECH DIR H FAM TRI FAC`; `R5 DIR H FAM TRI FAC ECH`. Omit `R[first_u32be(studySeed) mod 6]` and map remaining rows in numeric order to P01–P05. Each variant holds fixed the visible Riverhold facts, Mara/Toma relationship, three intervention choices, information, cost, text/visual fidelity, 90-second decision window, 45-second consequence delay, and total presentation time; only relationship/control structure changes. Insert the same 60-second neutral reset.
3. Immediately after every variant ask exactly: `Desirable: Would you choose to keep playing this version now? [Yes/No]`; `Continue: Do you want to see what happens after this decision? [Yes/No]`; `What consequence do you predict? [text]`; `What was confusing or objectionable? [text]`. After all six ask: `Rank all six from 1 (most want to continue) to 6 (least), no ties.` Record meaningful-action time and replay choice. Any enrolled withdrawal or skipped variant makes its binaries zero and fails Gate 0; retain partial data rather than replacing the person.
4. Sum within-person ranks; lowest total wins. Reopen unless `H` has the unique lowest total **and at least 3/5 Yes on each binary**. Also reopen if any other ID leads `H` by at least 20 percentage points (one of five participants) on either binary. Do not proceed on qualitative preference. The committed analyzer includes one keep, one all-zero absolute-floor failure, and one comparative reopen mock table; two reviewers must obtain the same result.
5. Create a disposable semantic/Pixi projection with Mara, eight citizens, three actions, an authoritative interaction cue, peek, and Chronicle beat at 1728×1117, 1366×768, and 390×844.
6. Five separate silent unfamiliar observers use one exact manifest. At second 60 ask: `Point to Mara`; `Name what three citizens were doing`; `Which two interacted, and what changed?` Separately record time to find Follow Mara, then ask `Can you directly command Mara's movement or work? Why?` Require 4/5 find it within ten seconds and answer no with self-direction reason; require 3/5 correctly identify Mara, three action families, both interaction participants, and the fixture's authoritative change. No raw log or narration.
7. Require useful shell/Mara by two seconds and operable CTA by three. Check overflow, 200% zoom, keyboard, reduced motion, targets, and budgets.

Living Woodcut gets one simplification pass; then use stripped Weathered Atlas/semantic presentation or stop. Retain only compact evidence/decision; discard prototype implementation.

## Gate A — Proof of Life

The actual game shows eight Standard-Brain citizens, three resources, four readable behavior families, one story-relevant exchange/repair, and a two-citizen interaction that changes authoritative state. All five fresh Gate A participants use one frozen **Gate A application commit**, one Gate A seed, and one simulation-time fixture; “same” means identical across Gate A participants, never the discarded Gate 0 prototype. Reuse only the exact Gate 0 observer questions and scoring rubric: at second 60, point to Mara; name three citizen activities; identify both interaction participants and the authoritative change; separately time Follow Mara and ask whether the player can command her movement/work and why. Require 3/5 to pass the full activity+interaction rubric and 4/5 to find Follow Mara within ten seconds plus answer no with a self-direction reason. No log, narration, prompting, or replacement participant. The same facts/actions exist in semantic view. No model or external-egress path is present.

Capture reproducible evidence at 1728×1117, 1366×768, and 390×844 plus keyboard, reduced motion, 200% zoom, clustered targets, storage failure, and semantic degradation.

## Gate B — Proof of agency and bounded attachment

Eight fresh unfamiliar formative sessions see real state-sensitive behavior and a yoked scripted/canonical-lookup control with byte-identical starting snapshot, visible facts, choices, copy, consequence timing, and presentation; only the state-sensitive chooser versus precommitted advice-keyed canonical lookup differs. Assign exactly four real-first/four control-first. Use `studySeed` as `worldSeed32` with stream `(system="study",entityId=gateId,purpose="assignment")`; for Fisher–Yates iterate `i=7..1`, set `m=i+1`, `limit=floor(2^32/m)*m`, draw until `u32 < limit`, set `j=u32 mod m`, and swap positions `i,j` in `[P01..P08]`; first four shuffled IDs are real-first.

For **each** condition, start the five-minute advice clock at the first painted frame where Follow Mara is enabled and focusable. After advice confirmation (or timeout), run the frozen leave/advance/return sequence. Start the 60-second second-action clock at the first painted frame where the changed return world and its branch-legal action are both visible and the action is enabled/focusable. After that action or timeout, and before showing the other condition, ask the four frozen comprehension prompts in the listed order and then ask exactly: `Contingency: How much did Mara's choice and the outcome depend on the visible facts, her values/relationships, and your advice?` from 1 `not at all; it seemed fixed or unrelated` to 7 `strongly; changing those inputs could change it`; and `Continue: How much do you want to take the next Riverhold action now?` from 1 `not at all` to 7 `very strongly`. Missing either rating in either condition or withdrawal automatically fails Gate B; never impute or replace.

Require:

- on the **real state-sensitive condition only**, 6/8 select one advice/abstain option and confirm it within that condition's five-minute clock with no spoken/visual cue beyond the frozen UI;
- on the **real condition only**, 5/8 answer all four prompts asked immediately after that condition correctly: `What visible reason mattered most to Mara?`, `Was her choice yours or hers?`, `What later authoritative change followed?`, and `Where is this save kept?`; the fixture rubric requires the branch's decisive receipt term, `hers`, the branch event, and `this local browser/device`;
- on the **real condition only**, 4/8 initiate its branch-legal second action within that condition's 60-second clock without prompting and answer `Why take that action?`; the frozen rubric requires a Mara/Toma concern, curiosity, obligation, or anticipated relationship consequence rather than reward/technology praise;
- the real build's eight-person arithmetic mean is strictly higher than the control mean on both perceived contingency and desire to continue; either tie or reversal fails; and
- five separate fresh context-free Story Card viewers see only the deterministically selected card for five seconds, then answer exactly: `Who advised? What did Mara choose? What followed? Did the advice directly make Mara act or change the rule? What remains unresolved?` Derive `cardSeed = SHA-256(UTF8("EONFOLK-STORY-CARD-v1\n" + PLAN_BASE + "\n" + "story-card"))`; read successive big-endian `u32` words, rejecting `u32 >= floor(2^32/3)*3`, and select `[verify-private, accuse-now, abstain]` at `u32 mod 3`. Commit the chosen branch/card before viewer exposure. At least 3/5 answer `the player/you` for adviser, that selected branch's Mara choice, its consequence, `no—advice only contributed`, and its unresolved tension.

The 6/8, 5/8, and 4/8 thresholds are three independent counts across the same eight participants' **real-condition** records; the same participants need not comprise all three passing subsets. Record the control-condition counterparts as diagnostic evidence, but they do not satisfy those three thresholds.

Record all failures and uncertainty; do not report statistical validation. Immediate reload proves persistence, not retention.

## Locked architecture and package boundaries

Use strict TypeScript/pnpm:

- `packages/protocol`: versioned serializable contracts, canonicalization, golden vectors;
- `packages/sim`: pure Reality/reducer/scheduler/invariants/hashes;
- `packages/cognition`: typed Mind/Standing Plans/Standard Brain/decision receipts;
- `packages/persistence`: `PersistencePort` and IndexedDB adapter;
- `apps/web`: React Router/Vite, Pixi world, semantic UI/projections; and
- deterministic Riverhold fixtures plus Playwright journeys.

Freeze this exact dependency cohort before code: Node `22.23.1`, pnpm `11.15.1`; runtime `react@19.2.8`, `react-dom@19.2.8`, `react-router@8.3.0`, `pixi.js@8.19.0`, `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`, `@base-ui/react@1.7.0`, `@phosphor-icons/react@2.1.10`, `motion@13.1.0`; dev `typescript@7.0.2`, `vite@8.2.2`, `@vitejs/plugin-react@6.1.0`, `@types/node@22.20.1`, `@types/react@19.2.18`, `@types/react-dom@19.2.4`, `vitest@4.1.11`, `@vitest/coverage-v8@4.1.11`, `fast-check@4.9.0`, `@biomejs/biome@2.5.9`, and `@playwright/test@1.62.1` [S-TOOL-17] [S-TOOL-18]. Commit exact versions and lockfile integrity. No other direct dependency is allowed without a logged in-scope necessity, exact version/license/install-script review, updated hour estimate, and coordinator-owned diff; inability of this cohort to install/build is a stop/replan condition, never permission to select floating versions.

Four hard layers: authoritative Reality, typed Mind, untrusted Brain, validating/durable Application. Reality alone changes canonical state. Brain receives only actor-visible `DecisionContext`, proposes one catalog action, and cannot grant authority. Application validates, commits durably, then publishes.

Pure protocol/sim code imports no React, browser storage, Pixi, provider SDK, Cloudflare, or renderer. It uses no `Date.now()`, `Math.random()`, conserved floats, random IDs, locale ordering, wall/frame/pointer input, or model call.

## Locked protocol

Implement these meanings before polished UI:

1. `WorldCommand`: version, command ID, canonical payload fingerprint, expected revision, principal, region, one typed payload.
2. `WorldEventEnvelope`: sequence/time, engine/schema, typed event, causal parents only `direct|trigger|contributing`, separate related events `temporal-predecessor|response-to`, visibility/provenance, pre/post/event hashes, batch.
3. `DecisionContext`: actor/revision/reason, only visible facts and sourced beliefs, plan/values/relationships/commitments, closed action catalog, explicit budgets.
4. `IntentProposal`: exactly one catalog action, optional bounded typed plan/memory proposals, provenance, short justification authored from `DecisionExplanation`.
5. `DecisionExplanation`: reason codes, actually read references, integer score terms/tie-break, advice disposition.
6. `CommandReceipt`: durable accepted/rejected result, fingerprint, revisions/head, accepted interval or rejection code, fencing token.
7. `ReplayManifest`: snapshot/base sequence/hash, half-open event interval, exact versions, expected final hash, nonfactual presentation metadata.
8. `PersistencePort`: get head/receipt; atomically append a transition; load/save verified snapshot; get ordered range; export verified world. No import.

Visibility uses pure `canRead(viewer,purpose,record,atRevision)` version `riverhold-visibility-v1`. Deny if `atRevision < record.createdRevision`. A record carries the exact subject set required by its label: participant principals; one citizen; covenant ID plus citizen; moderator roles; or test-run ID. A covenant carries beneficiary citizen, patron principal, inclusive `grantRevision`, and optional exclusive `revokeRevision`; active means `grantRevision <= atRevision && (revokeRevision == null || atRevision < revokeRevision)`.

| Viewer / exact purpose | `public` | `participant-private` | `citizen-private` | `patron-visible-through-covenant` | `moderator-only` | `implementation-only` |
|---|---|---|---|---|---|---|
| `citizen(C)` / `decision-context` | allow | deny | allow iff subject `C` | allow iff subject citizen `C` | deny | deny |
| `participant(P)` / `semantic-ui`, `patron-view`, `chronicle-private`, or `replay-private` | allow | allow iff subjects contain `P` | deny | allow iff covenant patron is `P` and active | deny | deny |
| `public` / `chronicle-public` | allow | deny | deny | deny | deny | deny |
| `participant(P)` / `export-owner` | allow iff `P` is local world owner | same | same | same | deny | deny |
| `moderator(R)` / `moderation` | allow | deny | deny | deny | allow iff roles contain `R` | deny |
| `implementation(T)` / `implementation-diagnostic` in a nonproduction build | allow | allow | allow | allow | allow | allow iff test-run ID is `T` |

Every unlisted viewer/purpose pair denies. Production rejects `implementation-only`; V1 has no moderator viewer/data. Owner export is explicit spoiler-bearing canonical data, never a UI/Brain/Chronicle projection. A public child omits every unreadable parent edge/ID/count/timing clue and needs typed public disclosure before a factual public sentence cites the private fact. Hidden, missing, and revoked targets yield identical `ACTION_UNAVAILABLE` code/shape/order/wording and one constant-work response path: fixed full catalog scan, no target-dependent early return, one prebuilt response shape, and presentation no earlier than 50 ms after application receipt. Commit this table as static test-oracle data; implement `canRead` separately, and generate exhaustive boundary fixtures from the table rather than importing the production function as expected truth. In the canonical foreground browser profile, run 200 seeded randomized round-robin requests per hidden/missing/revoked class after warmup; every response is ≥50 ms and pairwise class median and p95 differences are each ≤5 ms. Code-path inspection plus this test defines the timing-class gate; exact wall-clock equality is not required.

## Byte-level determinism profile

Use integer simulation seconds; nonnegative int32 conserved quantities; checked signed-int32 scores and basis points; truncation toward zero; NFC normalization at ingress; RFC 8785 canonical JSON over a restricted integer-only domain; SHA-256; and scheduler order `(time, priority, actorId, localOrdinal)`.

The only hash preimage grammar is `tuple(tag, fields)`: ASCII `EONFOLK-TUPLE-v1`, zero byte, then tag and each field as `u32be(byteLength)||bytes`. Schema fixes field type/order; NFC strings use UTF-8, counters/revisions u64be, counts u32be, and hashes/seeds raw bytes. State, command-payload, batch-ID, event, batch-hash, PRNG-seed, stable-ID, and genesis domains are exactly `EONFOLK:STATE:v1`, `EONFOLK:COMMAND-PAYLOAD:v1`, `EONFOLK:BATCH-ID:v1`, `EONFOLK:EVENT:v1`, `EONFOLK:BATCH-HASH:v1`, `EONFOLK:PRNG-SEED:v1`, `EONFOLK:ID:v1`, and `EONFOLK:GENESIS-HEAD:v1`. Hash display is lowercase 64-hex.

`batchId` hashes region/prior revision/command ID before event construction. Event hash covers the JCS complete envelope except itself. Batch hash then frames prior raw head hash, event count and ordered raw event hashes, raw payload fingerprint, result revision, and fencing token; durable head/receipt store it. Genesis head hashes the empty genesis tuple. Stable IDs use validated type plus full 32-byte lowercase unpadded RFC-4648 base32 (`abcdefghijklmnopqrstuvwxyz234567`, 52 chars) of type/raw-32-byte-world-seed/u64 creation-sequence. This is the only order: command → batch ID → envelopes/event hashes → batch hash/head.

Normative domain field schemas are: STATE `[JCS region state]`; COMMAND-PAYLOAD `[JCS typed payload]`; BATCH-ID `[regionId:NFC string, priorRevision:u64be, commandId:NFC string]`; EVENT `[JCS complete envelope without eventHash]`; BATCH-HASH `[priorHeadHash:raw32, eventCount:u32be, each ordered eventHash:raw32 as its own framed field, payloadFingerprint:raw32, resultRevision:u64be, fencingToken:u64be]`; PRNG-SEED `[worldSeed:raw32, system:NFC string, entityId:NFC string, purpose:NFC string]`; ID `[type:NFC validated string, worldSeed:raw32, creationSequence:u64be]`; GENESIS-HEAD `[]`.

PRNG seed is the first 16 bytes of the PRNG tuple digest over raw world seed plus framed `(system,entityId,purpose)`, decoded as four little-endian uint32 words. Exact `xoshiro128**` draw is `u32(imul(rotl32(u32(imul(s1,5)),7),9))`, then `t=u32(s1<<9); s2^=s0; s3^=s1; s1^=s2; s0^=s3; s2^=t; s3=rotl32(s3,11)`, coercing every word. All-zero replacement is `[0x9e3779b9,0x243f6a88,0xb7e15162,0xdeadbeef]`; first six outputs are `92dcf72a,00544cb2,046d0ff3,7192e3d9,ba2b8389,12be2f0f`. Persist per-stream draw counters. Golden tuple bytes/digests/IDs/states/outputs must match in Node/browser and include former ambiguous concatenation pairs.

Freeze this independent vector set, reproduced separately with Node `crypto` and Ruby `Digest::SHA256`. Inputs are raw world seed `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`; state 0 `{"regionId":"riverhold","revision":0,"simulationTime":0}`; state 1 changes revision/time to 1; payload `{"kind":"Observe","targetId":"citizen_mara"}`; region `riverhold`; prior revision 0; command `cmd_fixture_0001`; result revision/fence 1; PRNG strings `study,gate-b,assignment`; stable type/sequence `citizen,1`. Every line is full preimage hex then SHA-256:

```text
state0 454f4e464f4c4b2d5455504c452d76310000000010454f4e464f4c4b3a53544154453a7631000000387b22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a302c2273696d756c6174696f6e54696d65223a307d -> c1978e6ff763e61ece8b938df637202517530503bc6150325b427efa5f87e872
state1 454f4e464f4c4b2d5455504c452d76310000000010454f4e464f4c4b3a53544154453a7631000000387b22726567696f6e4964223a227269766572686f6c64222c227265766973696f6e223a312c2273696d756c6174696f6e54696d65223a317d -> 8bb47e167faae03a63844d3ae9dfff570c55c86151a3cf08bd8e3689343ce719
payload 454f4e464f4c4b2d5455504c452d7631000000001a454f4e464f4c4b3a434f4d4d414e442d5041594c4f41443a76310000002c7b226b696e64223a224f627365727665222c227461726765744964223a22636974697a656e5f6d617261227d -> b3e71ee858a55bf1497093f89f889edb39d9d3c5b66736908c81b2792af3fbe7
batch-id 454f4e464f4c4b2d5455504c452d76310000000013454f4e464f4c4b3a42415443482d49443a7631000000097269766572686f6c6400000008000000000000000000000010636d645f666978747572655f30303031 -> 7c12f8552849764be6e6b5a63a8c807aa1abfabd718be3750c0226176a8ad5b5
event 454f4e464f4c4b2d5455504c452d76310000000010454f4e464f4c4b3a4556454e543a7631000002527b2262617463684964223a2262617463685f70716a7071766a696a663365787a78677777746476646561706b7132783676356f6766366735696d616974626f32756b32773271222c2263617573616c506172656e7473223a5b5d2c22656e67696e6556657273696f6e223a2231222c226576656e744964223a226576656e745f666978747572655f30303031222c226576656e745061796c6f6164223a7b226b696e64223a224f62736572766564222c226f627365727665724964223a22636974697a656e5f6d617261222c227461726765744964223a226772616e617279227d2c22706f7374537461746548617368223a2238626234376531363766616165303361363338343464336165396466666635373063353563383631353161336366303862643865333638393334336365373139222c22707265537461746548617368223a2263313937386536666637363365363165636538623933386466363337323032353137353330353033626336313530333235623432376566613566383765383732222c2270726f76656e616e6365223a7b226b696e64223a2273696d756c6174696f6e227d2c22726567696f6e4964223a227269766572686f6c64222c2272656c617465644576656e7473223a5b5d2c22736368656d6156657273696f6e223a2231222c2273657175656e6365223a312c2273696d756c6174696f6e54696d65223a312c227669736962696c697479223a7b226b696e64223a22636974697a656e2d70726976617465222c227375626a656374436974697a656e4964223a22636974697a656e5f6d617261227d7d -> 8116281cdc9fde1adfe111f97242f63c6c4467d0ae7c94192a94394f04bfc217
genesis 454f4e464f4c4b2d5455504c452d76310000000017454f4e464f4c4b3a47454e455349532d484541443a7631 -> 1c47866ad1dfbdcc227e1df52b1757cb5cf81ca595636dee662bc61b73b2960b
batch-hash 454f4e464f4c4b2d5455504c452d76310000000015454f4e464f4c4b3a42415443482d484153483a7631000000201c47866ad1dfbdcc227e1df52b1757cb5cf81ca595636dee662bc61b73b2960b0000000400000001000000208116281cdc9fde1adfe111f97242f63c6c4467d0ae7c94192a94394f04bfc21700000020b3e71ee858a55bf1497093f89f889edb39d9d3c5b66736908c81b2792af3fbe7000000080000000000000001000000080000000000000001 -> 7d7e8a7bfd9c8b6a131a1ef3113f716499f14fa8ade69817b3fb2dd5d90b8fc0
prng-seed 454f4e464f4c4b2d5455504c452d76310000000014454f4e464f4c4b3a50524e472d534545443a763100000020000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f00000005737475647900000006676174652d620000000a61737369676e6d656e74 -> 3c492cf720e74b00a5a6d21b4991b73e2cd5e16ee98ddedfc94a22f122e6d7bb
stable-id 454f4e464f4c4b2d5455504c452d7631000000000d454f4e464f4c4b3a49443a763100000007636974697a656e00000020000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f000000080000000000000001 -> 713181d0aefc704b99bac26dcda834d59f9c021fc874b910aae4a5455b6e1730
```

Expected IDs are `batch_pqjpqvjijf3exzxgwwtdvdeapkq2x6v5ogf6g5imaitbo2uk2w2q` and `citizen_oeyydufo7ryexgn2yjw43kbu2wpzyaq7zb2lsefk4ssukw3oc4ya`; PRNG digest decodes little-endian to `f72c493c,004be720,1bd2a6a5,3eb79149`. The event preimage decodes to the complete envelope with that batch ID, empty parent arrays, versions `1`, event `event_fixture_0001`, `Observed(citizen_mara,granary)`, the two state hashes above, simulation provenance, Riverhold sequence/time 1, and citizen-private Mara visibility. Golden tests use a second encoder/platform hash utility, never production helpers.

No presentation/wall/storage metadata or raw model prose enters hashes. Support one profile/engine/schema version; unknown/old versions fail closed. No upcaster.

## Durable-before-visible protocol

For every command:

1. read durable head/receipt;
2. prepare immutable accepted/rejected transition without installing it;
3. in one IndexedDB transaction verify head/fencing, write complete accepted event batch, write accepted/rejected receipt, and advance head only for acceptance;
4. wait for commit;
5. install the post-state only if returned head matches;
6. publish projections and acknowledge.

Crash before commit discards candidate; crash after commit reconstructs from durable head/receipt. Retry identical ID/fingerprint returns receipt. Same ID/different fingerprint rejects permanently. Writer transfer increments a monotonic fencing token checked on every append/snapshot. Stale writers reject. Snapshot success is independent of event/head/receipt commit.

Replay snapshot state includes every accepted event with `sequence <= baseSequence`; event sequences begin at 1. The genesis snapshot has `baseSequence=0` and no domain event. Require `fromInclusive = baseSequence + 1` and `toExclusive = finalSequence + 1`, applying exactly sequences `fromInclusive <= sequence < toExclusive`. Zero replay events therefore means `finalSequence=baseSequence`, `fromInclusive=toExclusive=baseSequence+1`, and unchanged hash. Export is verified/read-only and warns it cannot be imported/restored in V1.

## Standard Brain and anti-script contract

Standard Brain is the only shipped Brain. It filters the closed catalog by visible preconditions; integer-scores plan continuation, needs, commitments, values, relationships, evidence, risk, and advice; seed-breaks exact ties; emits one action plus typed explanation; and replans within a bounded retry budget.

The same pre-boundary snapshot varies trust, value priority, evidence, commitment, advice, and Mara/non-Mara actor. Compare full brain with nearest-need, legal-random, canonical-lookup, and ablations without values/beliefs/relationships/commitments/plan. Three advice paths reach different terminal vectors across relationship, verified belief, petition/rule, or allocation. Hard-coded Riverhold lookup must fail transfer/perturbation.

Two worlds differing only in actor-invisible facts produce byte-identical context, catalog, errors, targets, explanation, and public Chronicle until observation. Fake missing/throwing/timed-out/malformed BrainPort preserves deterministic progress; no provider code ships. Provider-specific 429/revoke/eval tests become conditional only if a future real adapter is authorized.

## Chronicle truth

Every factual sentence is a deterministic template over accepted events and opens an evidence disclosure. Direct cause, trigger, and contributing condition are causal; temporal predecessor and response-to are noncausal related events; allegation is attributed statement/belief content. Advice may contribute to Mara's plan but does not directly enact her action, audit, or law.

Build three branch-specific Chronicles. Primary presentation is exactly three beats and no more than 20 seconds. Story Card labels are **YOU ADVISED**, **MARA CHOSE**, **WHAT FOLLOWED**, and **UNRESOLVED**. Technical IDs live under Evidence. No dead link, “Share” acquisition claim, or seed jargon headline. Replay never invokes cognition.

## Performance, mobile, and accessibility

Blocking budgets:

- critical shell HTML/CSS/JS ≤200 KB gzip;
- total initial-route JS including lazy Pixi ≤650 KB gzip;
- atlas/assets ≤6 MB desktop, ≤4 MB mobile;
- useful shell/Mara ≤2 seconds, CTA ≤3 seconds, meaningful world ≤3 seconds target M4 profile and ≤5 seconds defined mobile/4G profile;
- desktop p95 frame ≤16.7 ms/60 FPS target with eight citizens;
- mobile p95 ≤33.3 ms/30 FPS minimum;
- eight default; twelve is measurement-only practical stress target.

The only blocking browser runtime is `@playwright/test` **1.62.1** with its bundled headed (`headless:false`) Chromium revision **1234**, Chrome for Testing **151.0.7922.34**. Commit that exact package in the lockfile; the official registry integrity for `@playwright/test@1.62.1` is `sha512-DTcUc8qii+cpHvtOwggMtBRMjKZHXYWdw8syRYu2vtzuq4Wxphqq4NfCs5Zt44L6mA8rfDfj+PHnxFc/FeK6mQ==` [S-TOOL-17]. After installation, record and verify the resolved package version/integrity, Chromium revision/version, executable path, and executable SHA-256 before M0 human evidence; never update any of them within a cohort. Target desktop is the named M4 Pro/native DPR/production preview/power state. Mobile lab uses that same binary at 390×844 DPR 3/four-times CPU slowdown/exact shaping below. A named iPhone-13/Pixel-7-class-or-weaker run is optional diagnostic physical evidence: record viewport, load/journey success, overflow, keyboard/touch/access observations, thermal caveat and any measured frames, but it never substitutes for or blocks canonical numerical gates; lack of a phone is not a stop condition. Record p50/p95/worst, browser/device/profile, commit, seed/time, quality/motion/UI/focus state.

On portrait, world remains ≥55% through peek; peek ≤35%, non-scrolling; Inspect has one scroll/sticky Close; Decide has sticky Back/Continue; browser Back closes one UI level; targets ≥44px; overlap opens named chooser; persistent People fallback. At 200% text no overflow/trap.

Reduced motion disables fly-through/parallax/particles/weather/autoplay and uses manually stepable Chronicle/discrete poses. Every consequential action has semantic keyboard equivalent. Degrade in order: DPR/effects → background cadence → simplified markers → fully playable semantic view. Device presentation never changes Reality.

### Canonical performance procedure

From a clean checkout run `pnpm install --frozen-lockfile`, `pnpm build`, then `pnpm preview --host 127.0.0.1 --port 4173`; record commit, lockfile hash, OS/power state, frozen headed Chromium identity above, commands, and preview origin. Desktop is the target M4 Pro plugged in, Low Power Mode off, native DPR, foreground, heavy apps closed. Mobile lab is 390×844/DPR 3, four-times CPU slowdown, 1.6 Mbps down, 750 Kbps up, 150 ms RTT, cache disabled, same binary. For optional diagnostic physical evidence run `pnpm preview --host 0.0.0.0 --port 4173`, record the sole RFC1918 origin/device/browser, restrict the host firewall to that trusted LAN/device for the session, inspect preview access logs, then stop the server; never mix those measurements with the canonical lab.

Launch canonical Chromium with `--disable-background-networking`, `--disable-component-update`, `--disable-domain-reliability`, `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1`, `--force-webrtc-ip-handling-policy=disable_non_proxied_udp`, and `--log-net-log=<evidence>/netlog.json`; block service workers in Playwright and install a context route that logs/aborts every host except the exact preview origin. CSP is deny-by-default with `default-src 'self'`, `connect-src 'self'`, and no external report endpoint. The route log plus Chromium netlog are independent acceptance oracles: fail any attempted external DNS/host resolution, HTTP(S), WebSocket/WebTransport, beacon, worker, navigation, prefetch/prerender, or nonproxied UDP—not only completed HAR requests.

For five cold load repetitions, create a new browser context, clear HTTP cache/service workers/IndexedDB/storage, restart preview, and retain the maximum result. Marks are: `shell` only when critical semantic shell and Mara label are painted; `cta` only when Follow Mara is enabled/focusable; `meaningful-world` only when Mara plus all eight citizen projections, current activities, and interaction cue are painted and equivalent semantic rows exist. The test asserts conditions at each mark. After initial committed assets load, set the context offline and complete the critical journey without another request.

For frame budgets, after warm asset load and five stabilization seconds, collect `requestAnimationFrame` deltas for 30 seconds in each of arrival, busy market interaction, and Chronicle-overlay states; pool all foreground samples and compute p95 by nearest-rank `sorted[ceil(0.95*n)-1]`, while also recording p50/worst and each-state p95. Every state and pooled p95 must meet its device threshold. Gzip budgets use deterministic `gzip -9` byte counts: critical shell is emitted HTML + CSS + JS reachable before the renderer import; total initial route adds every JS chunk requested through `meaningful-world`; asset budgets sum transferred compressed app-owned art/atlas/font bytes through that mark. Sourcemaps, preview headers, and browser cache do not reduce counts. Five cold loads must each meet display deadlines; any failed repetition fails until a recorded fix/rerun.

## Finite blocking security gate

Pass only when route log plus Chromium netlog show the local preview asset allowlist and zero attempted external egress across every channel named above; no credential, telemetry, provider SDK, dynamic-code execution, or untrusted active HTML/Markdown/URL rendering; commands, text, storage growth, catch-up, and exports have explicit tested bounds; and corrupt/oversize snapshots, event gaps, stale fencing, unknown versions, invalid commands, and quota failure all fail closed without advancing durable head. The exact production dependency tree has no unresolved high/critical advisory. Record scanner/advisory source/date/findings/confirmed-false-positive rationale. This finite list—not an open-ended demand for “secure enough”—is the blocking slice security gate.

## Required tests and future CI baseline

On every relevant PR run pinned local-equivalent commands for format/lint, strict typecheck, unit, deterministic/replay, bounded property/fuzz, production build, and critical Playwright journey.

Blocking correctness includes canonical bytes/hashes/PRNG/rounding/Unicode; repeated-run/replay; scheduler ties; expected revision; accepted/rejected idempotency and ID collision; durable commit/crash barriers; fencing; quota abort; event gaps/corrupt snapshots; current-version identity/unknown-version fail closed/no import; command atomicity; 30/90/365-day exact terminal simulations under declared time/event/storage caps; conservation; safe interrupt/resume equivalence; hidden-fact noninterference; fake BrainPort failure; and progress without LLM or external egress.

Conditional cognition changes run perturbation/transfer/baseline/ablation/authorization/hidden-fact/fallback. A later real adapter adds exact model behavior/eval/provider failure. Major UI changes capture/review deterministic desktop/laptop/mobile evidence.

Commit future weekly grouped Dependabot configuration for npm/Actions, max five PRs, no automerge, plus CI definitions and documented recommended `main` checks/force-push/deletion protection; do not enable Dependabot, call GitHub APIs, change repository settings/protection, push, or create a PR without separate explicit operator authorization. If native secret scanning remains disabled, commit one pinned/license-reviewed open-source diff scan only. Failed Playwright artifacts retain 14 days, accepted milestone evidence 30, no routine success videos. Long fuzz/horizon/browser matrices run nightly/manual.

## Orchestration and bounded subagents

You are the sole integration owner. Dynamically discover safe concurrency at each wave and retain coordinator capacity; with four total slots, use at most three children. Do not delegate tightly coupled work merely for concurrency.

Every child receives binding constraints, one bounded assignment, explicit file allowlist, its own isolated worktree/branch when writing, explicit ownership of only that worktree/allowlist, no nested subagent delegation, focused tests/evidence, one clean commit, and handoff containing findings, objections, uncertainty, changed files, commands/results, SHA, and unresolved risks.

Use worktrees only for nonoverlapping ownership. Suggested sequence after contracts freeze:

1. systems: protocol/sim/golden fixtures;
2. cognition: cognition/behavior fixtures after protocol integration;
3. application: persistence/web/e2e after contract integration.

If ownership couples, serialize. Coordinator alone owns root manifests/lockfile, active ExecPlan logs, shared evidence/decision/risk/deviation records, and integration. Children never integrate themselves or edit a shared working directory invisibly.

## Integration discipline

Before cherry-picking any child commit:

1. verify ancestry and clean status;
2. inspect exact changed-file list against allowlist;
3. inspect actual Git diff line-by-line, not summary;
4. inspect dependency versions, licenses, install scripts, and lockfile;
5. scan secrets/generated junk/unauthorized scope;
6. rerun focused tests and `git diff --check` from candidate;
7. verify product/constraint/evidence fit; and
8. integrate one clean commit or request correction.

Record source worktree/SHA, allowlist, checks, evidence, integrated SHA, and rollback. Never push research/spike branches or merge/deploy automatically.

## Continuous living-plan maintenance

Update `docs/exec-plans/active/001-foundation.md` at every integration boundary and immediately on decision/risk/deviation with timestamped milestone progress, focused hours, exact commands/results/hashes, browser/device evidence, participant results including failures, decisions/reopen triggers, P0–P3 findings/fixes/confirmation, removed scope, integration records, and evidence paths. Never reconstruct logs at the end. No silent scope expansion.

Severity is closed: **P0** is data loss/corruption, unauthorized/destructive/remote mutation, credential or private-data exposure, fabricated human evidence, materially false factual Chronicle, or an unplayable required journey; stop immediately. **P1** is any failed blocking product/correctness/durability/replay/security/accessibility/performance/human-protocol criterion, or an authority ambiguity that permits materially different compliant outcomes; it blocks milestone closure. **P2** is a material but bounded nonblocking defect with a safe workaround and recorded reopen trigger. **P3** is polish with no gate effect. “ACCEPT” accepts a review finding, never the live defect. A P0/P1 is mitigated only after the coordinator records the fix and evidence and an independent reviewer confirms the named fix diff; neither coordinator nor reviewer may waive it. An operator-authorized material scope/criterion change reopens the affected gate and requires a new frozen instrument/review rather than “mitigation.”

## Mandatory implementation/review/fix loop

A milestone is a vertically runnable integration checkpoint with its named player outcome, not a package or child commit. These six checkpoints are minimum, ordered, non-coalescible milestones; additional ones are allowed:

| Milestone | Required integrated outcome | Independent reviewer roles before close |
|---|---|---|
| M0 | Disposable product/visual kill harness and signed Gate 0 evidence | Product/game; visual/accessibility |
| M1 | Deterministic durable kernel with golden/crash/replay evidence | Systems/correctness |
| M2 | Runnable semantic Mara investigate/advice/divergence/return loop | Product/game; systems/correctness; cognition/eval; visual/accessibility |
| M3 | Eight-citizen rendered world, persistence/catch-up, signed Gate A evidence | Product/game; systems/correctness; visual/accessibility |
| M4 | Three integrated outcomes, Chronicle/card, yoked study, signed Gate B/card evidence | Product/game; systems/correctness; cognition/eval; visual/accessibility |
| M5 | Full security/performance/access/CI rehearsal and final named-diff package | Product/game; systems/correctness; cognition/eval; visual/accessibility |

For every milestone, run:

`implementation → focused tests → full relevant tests → actual local game run → browser playtest → evidence capture → independent review → fix → rerun`

Child commits may integrate while a milestone remains open, but they never close it. Close only after the integrated branch completes the actual game run, browser evidence, independent review, fixes, and rerun. Reviewers cannot edit while reviewing:

- **Product/game:** life, contingency, agency, boredom/confusion, care, second decision, honest claims.
- **Systems/correctness:** contracts, determinism, durability, replay, invariants, security, failure recovery.
- **Visual/accessibility:** required for UI/renderer/assets/layout/motion; world dominance, three viewports, mobile, keyboard, reduced motion, semantic fallback, performance, dashboard/generated smell.
- **Cognition/eval:** required for Mind/plan/Brain/context/proposal changes; noninterference, legality, state sensitivity, ablations, explanation, fallback.

An independent reviewer did not author or edit the reviewed diff. Give each reviewer a named immutable `base...HEAD` and read-only review assignment. The implementation author reconciles and fixes findings after review; the same reviewer role then confirms the targeted fix against the new named range. Review actual browser interaction and actual Git diff, not just reports/screenshots/tests. Reconcile every P0/P1, fix, rerun, and request targeted confirmation. No accepted P0 or unmitigated P1 remains.

## Stop conditions

Continue autonomously until:

- Gate 0, A, B and all technical/access/performance/security criteria pass; evidence/reviews/logs are complete; branch is clean; no required work remains; or
- an unfixable-in-scope P0/P1, data-loss/security/factuality failure remains; or
- total focused time reaches 60 hours, or the next bounded action would exceed 60, after every declared cut; or
- next required action needs ungranted spend/credential/deploy/publish/destructive/material product authority; or
- required canonical browser-profile or human evidence cannot be produced after exhausting safe in-scope alternatives; optional physical-phone evidence never triggers this stop.

Do not stop merely at 52 hours; use only fix contingency and cut deferred polish. Do not declare success from a build/backend suite/event log. If the product gates fail, report failure honestly; do not add models, dialogue, content, infrastructure, or fabricated evidence.

## Final handoff

Report Gate 0/A/B outcome with direct evidence; exact branch/head/base/clean status; full base...HEAD files/diff/dependencies/licenses; commands/results/golden hashes; crash/fence/export/version/no-import and 30/90/365 results; three-viewport/keyboard/reduced-motion/semantic evidence; optional physical-device diagnostic or `not run—nonblocking`; participant denominators/results; every P0/P1 disposition/confirmation; focused hours and cuts; remaining hypotheses; and any authority still needed. Inventory every created worktree and branch with owner, path, head, clean/dirty state, and push status. This prompt authorizes removal of clean integrated auxiliary worktrees after their commits are retained on named local branches; otherwise retain them inertly. Never discard a dirty/unintegrated worktree, delete its branch, or push an auxiliary branch.

State explicitly that fun, retention, succession, scale, distribution, and broad attachment remain hypotheses unless separately observed. Never merge, deploy, publish, spend, or broaden scope in the handoff.

---
