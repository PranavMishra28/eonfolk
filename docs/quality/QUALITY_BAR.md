# Quality bar

**Purpose:** define the minimum product and technical evidence required to call the first local proof complete.

**Status:** ACCEPTED AFTER RED TEAM — no fun, retention, or general attachment claim is pre-approved

**Authority boundary:** owns cross-discipline pass/fail. [TESTING](TESTING.md), [EVALS](EVALS.md), [VISUAL_QA](VISUAL_QA.md), and [PERFORMANCE](PERFORMANCE.md) own detailed procedures.

**Related documents:** [product](../product/PRODUCT.md), [ExecPlan](../exec-plans/active/001-foundation.md), [reviews](../reviews/PRODUCT_RED_TEAM.md), [player perspectives](../reviews/PLAYER_PERSPECTIVES.md)

## Owned decision

Completion requires Gate 0, Gate A, Gate B, and every blocking correctness/security/access/performance test. A build, backend suite, scripted Riverhold chain, screenshot, favorable anecdote, or elapsed estimate is not a substitute. All abandonment and confusion stay in the denominator.

Only an authorized human operator can supply the unfamiliar-participant manifests. Codex may prepare builds/scripts and continue non-human work after Gate 0, but cannot recruit, impersonate, fabricate, or substitute planning personas. Without operator-supplied Gate 0 evidence, implementation stops before foundations; without Gate A/B manifests, those gates remain unpassed.

Before each cohort, freeze and commit build/snapshot, a study seed derived from `PLAN_BASE` plus gate ID, assignment, exact script/questions/anchors/timers/scoring code, and blank manifest; hash it. An instrument change voids and restarts that cohort. Cohorts are distinct, age 18+, able to read/use the prototype, unexposed to EONFOLK/Riverhold, and not contributors/reviewers. The operator obtains affirmative agreement after stating voluntary/unpaid participation, anonymous task data only, no name/contact/recording, and stop/skip rights. Enrolled withdrawal stays in the denominator; no replacement.

## Gate 0 — Product kill gate

All five participants see all six branding-hidden ugly versions. Use the six cyclic Latin rows over `[one citizen,family,trio,faction,ECHOHOUSE,direct control]`, omit row `first_u32be(studySeed) mod 6`, and map remaining numeric rows to P01–P05. Hold visible facts, relationship, three choices, information, cost, fidelity, 90-second decision, 45-second consequence, total time, and 60-second neutral reset constant; only relationship/control structure changes. After each ask binary `Would you choose to keep playing this version now?`, binary `Do you want to see what happens after this decision?`, predicted consequence, confusion/objection, and record meaningful-action time/replay choice. Finally rank 1 most to 6 least, no ties. Withdrawal/skip gives zeros and fails Gate 0. Lowest rank sum wins; Riverhold tie/loss or any alternative's ≥20-point lead on either binary reopens. A frozen analyzer has keep/reopen mock fixtures that two reviewers compute identically.

## Gate A — Proof of Life

The named build shows eight Standard-Brain citizens, three resources, four legible behavior families, one story-relevant exchange/repair loop, and one two-citizen interaction that changes authoritative state. Five fresh silent observers use the same seed/time without log/narration. At second 60 they point to Mara, name three citizen activities, and identify both interaction participants plus the authoritative change. At least 3/5 pass that whole rubric. Separately, 4/5 find **Follow Mara** in ten seconds and answer that they cannot command movement/work because she directs herself. Semantic mode preserves identical facts/actions. No model or external-egress path exists.

## Gate B — Proof of agency and bounded attachment

Eight fresh sessions compare state-sensitive build with advice-keyed canonical lookup using byte-identical snapshot/facts/choices/copy/timing/presentation. Standard-Brain PRNG over the frozen study seed shuffles P01–P08; first four are real-first, four control-first. After each condition/before the other, ask contingency from 1 `fixed/unrelated` to 7 `strongly depended on facts/values/relationships/advice`, and desire to take the next Riverhold action from 1 `not at all` to 7 `very strongly`. The real build includes fixed Mara, state-changing investigation by 60 seconds, two advice intents plus abstain by five minutes, branch-specific interpretation/consequence, explicit leave/advance/return, one outcome-dependent second choice, and a factual three-beat/≤20-second Chronicle/card.

Pass requires:

- 6/8 select and confirm advice/abstain by five minutes using only frozen UI;
- 5/8 correctly answer the branch-rubric prompts for Mara's decisive visible reason, whose choice it was (`hers`), later branch event, and save location (`this local browser/device`);
- 4/8 initiate the branch-legal second action within 60 seconds without prompting and give a rubric-matched Mara/Toma concern, curiosity, obligation, or anticipated relationship consequence;
- the real build's eight-person arithmetic mean is strictly higher on both perceived contingency and desire to continue; a tie or reversal on either fails; and
- 3/5 fresh context-free card viewers, after five seconds, correctly name adviser, Mara's choice, what followed, `advice contributed but did not directly act/change the rule`, and the unresolved tension.

This permits only “bounded agency/attachment proof passed.” Delayed voluntary return, session 5/20, succession, newcomer relevance, and retention remain unproven.

## Blocking technical bar

- Byte-level determinism profile, golden hashes/PRNG/rounding/Unicode, repeated run, replay, snapshot range, and three divergent counsel terminal vectors pass.
- Durable-before-visible commit, accepted/rejected receipts, ID collision, crash barriers, atomicity, quota abort, stale fencing, corrupt snapshot, and dual-tab transfer pass.
- Export succeeds non-destructively; no import/replacement route exists; same/unknown schema policy tests pass.
- Resource/ownership/life/visibility invariants survive property tests and bounded fuzzing.
- 30/90/365-day worlds reach exact terminal time under declared caps, conserve, and replay; an early pause is failure.
- Hidden-fact noninterference covers context, catalog, errors, targets, explanation, and Chronicle.
- Standard Brain passes perturbation/transfer/baseline/ablation tests; fake absent/throwing/malformed BrainPort cannot stop the world. No provider dependency exists.
- Production build, critical browser journey, all numerical budgets, keyboard/reduced motion/semantic paths, and three viewports pass.
- No server, deployment, account, payment, import, required model/download, or public multiplayer path ships.
- A clean-build HAR/request assertion permits only one declared local preview origin serving committed app assets and records zero DNS/external-egress requests; the build contains no credential, telemetry, provider SDK, dynamic-code execution, or untrusted active HTML/Markdown/URL rendering, and enforces tested bounds on commands, text, storage, catch-up, and exports.
- Corrupt/oversize snapshots, event gaps, stale fences, unknown versions, invalid commands, and quota failures fail closed without durable-head advance. The exact production dependency tree has no unresolved high/critical advisory; scanner/advisory source, access date, findings, and confirmed-false-positive rationale are recorded.

## Evidence package

Each manifest records exact commit, dependencies/browser, seed/world/hash, simulation time, viewport, DPR, device/profile, quality tier, motion mode, UI/focus state, expected action/result, commands/exit results, p50/p95/worst where relevant, screenshots/targeted traces, participant script/results including failures, deviations, reviewer disposition, and actual Git diff inspection. Evidence not reproducible from a named commit is a note, not a pass.

## Severity and stop behavior

- **P0:** data loss/corruption, unauthorized mutation, secret exposure, unplayable journey, or factual fabrication. Stop and fix.
- **P1:** any gate/correctness/replay/access/budget/comprehension failure. Fix before readiness.
- **P2:** bounded material friction with workaround and reopen trigger.
- **P3:** polish with no gate effect.

No accepted P0 or unmitigated P1 remains. A new P0/P1 after final review gets one fix and targeted confirmation pass; unresolved means not ready.

## Rejected alternatives and reopen evidence

Reject build-only acceptance, one favorable observer, self-testing as human evidence, fixed-script success, raw logs, model-backed theater, and timebox expiry. Reopen the thesis if the irreducible early investigate → advice → divergence → return choice cannot fit 60 focused hours after declared cuts, or the real loop fails to beat its scripted control.

## Constraint fit

The bar spends scarce solo hours on falsifying life, contingency, and care; infrastructure, content breadth, provider work, and public distribution are outside it. Tests run locally/CI for approximately $0 with no training, partner, account, payment, or deployment.
