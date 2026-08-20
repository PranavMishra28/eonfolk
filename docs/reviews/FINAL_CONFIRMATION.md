# Final targeted confirmation

**Purpose:** independently confirm the bounded reconciliations requested after the final cross-discipline review.

**Status:** **PASS — TARGETED CONFIRMATION ONLY.** No P0 or P1 remains in the requested FR-001 through FR-006 scope. This is not an implementation result, human-evidence result, or repository-wide readiness declaration.

**Authority boundary:** this file records confirmation evidence and one bounded caveat. It changes no product, game, engineering, quality, execution, decision, or research authority.

**Related documents:** [final red team](FINAL_RED_TEAM.md), [decision reconciliation](../decisions/DECISIONS.md), [simulation](../engineering/SIMULATION.md), [world model](../game/WORLD_MODEL.md), [quality bar](../quality/QUALITY_BAR.md), [001 ExecPlan](../exec-plans/active/001-foundation.md), [Goal prompt](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md), [source ledger](../research/SOURCE_LEDGER.md)

## Review identity and verdict

- Baseline: `6850b699221fb5c79f247e03b1b4955c2c96b44b`.
- Reviewed commit: `94f3acd24840185b3fb08cc7683c8b649be8021f`.
- Review worktree/branch: `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/review-confirmation`, `review/final-confirmation`.
- Scope: the actual baseline-to-reviewed diff and current authorities needed to confirm FR-001 through FR-005 plus FR-006 uniqueness. Historical reviews were not treated as current authority.
- Verdict: **PASS.** FR-001 through FR-006 are confirmed at P0/P1 severity. `FC-001` is a P2 reproducibility caveat; the mandatory pre-session assignment-list commit/hash bounds it and prevents it from changing the gate result after exposure.

| ID | Result | Mechanical confirmation |
|---|---|---|
| FR-001 | PASS | Tuple bytes, SHA-256 digests, base32 IDs, PRNG state/vector, collision pairs, and acyclic event/batch order were independently derived. |
| FR-002 | PASS | The closed viewer/purpose/label/revision policy yields determinate core allow/deny boundaries; private-parent projection and coalesced target failure are explicit. |
| FR-003 | PASS | Eighteen WBS rows sum to `39.5/52/65`; the expected case leaves eight hours to 60, and each Quality Bar criterion has one primary acceptance owner. |
| FR-004 | PASS | A seeded cyclic-Latin order and both keep/reopen mock tables reproduce the Gate 0 decision rule; the frozen Gate B thresholds and strict-mean rule also reproduce. |
| FR-005 | PASS | Current authority text consistently uses the mill as the repair object and the well only as the water site/visual landmark. |
| FR-006 | PASS | The ledger has 122 rows and 122 unique source IDs; no referenced source ID is undefined. |
| FC-001 | P2 | Gate B names Fisher-Yates but not the exact unsigned-32-to-bounded-index operation; two standard mappings produce different, still precommitted, four/four orders. |

## FR-001 — deterministic protocol

An independent Node implementation used only the then-current SIMULATION v1 prose; the [current v2 profile](../engineering/SIMULATION.md#determinism-profile-eonfolk-determinism-v2) supersedes that historical vector.

- `tuple("EONFOLK:ID:v1", ["citizen", 32 zero bytes, u64be(1)])` hashed to `3a532c46a6d4aa15f22b66b995935073a2c89978e66fa80d86f2a8c02bae6c7c`, producing `citizen_hjjsyrvg2svbl4rlm24zle2qoormrgly4zx2qdmg6kumak5onr6a`. The digest suffix is exactly 52 lowercase unpadded RFC 4648 base32 characters.
- `tuple("EONFOLK:BATCH-ID:v1", ["riverhold", u64be(0), "cmd-1"])` hashed to `bd11b5e3e8e471fabe6b8dcf4d71e1950f4e904c2a702c53cbee66ccfe77fc22`, producing `batch_xui3ly7i4ry7vptlrxhu24pbsuhu5ecmfjycyu6l5ztmz7tx7qra`.
- The empty genesis tuple produced head `1c47866ad1dfbdcc227e1df52b1757cb5cf81ca595636dee662bc61b73b2960b`.
- The literal all-zero PRNG replacement produced the published six draws exactly: `92dcf72a`, `00544cb2`, `046d0ff3`, `7192e3d9`, `ba2b8389`, `12be2f0f`.
- Framed preimages distinguished `("ab","c")` from `("a","bc")`, PRNG streams `("ab","c","d")` from `("a","bc","d")`, and creation sequences 1 from 256; all three collision probes produced different SHA-256 digests.
- Dependency derivation is acyclic: validated command fields and fingerprint -> stable `batchId` -> complete ordered envelopes -> `eventHash` values -> `batchHash` and durable head. `batchId` does not consume `batchHash`, and `batchHash` is not placed back into an event envelope.

These results confirm the tuple framing, hash/ID rules, stream ownership, exact transition, and batch order without supplying an implementation choice not present in the authority.

## FR-002 — visibility policy

The independently transcribed policy produced the following grouped matrix. “Matching” means the subject/role/test-run identity comes from canonical state or application configuration, not caller input.

| Record label | Allow | Deny |
|---|---|---|
| `public` | All ordinary projections; public Chronicle; privileged moderation/diagnostics only under their matching viewer kind | A public label alone cannot create moderator or implementation authority |
| `participant-private` | Matching participant for semantic/patron/private Chronicle/private replay and owner export | Citizen DecisionContext, public Chronicle, mismatched participant |
| `citizen-private` | Matching citizen DecisionContext; verified owner export; matching nonproduction diagnostic | Participant/patron/public presentation and mismatched citizen |
| `patron-visible-through-covenant` | Matching citizen DecisionContext; matching participant presentation/private history while `grant <= revision < revoke`; owner export/diagnostic | Before grant, at/after revoke, mismatched participant, public Chronicle |
| `moderator-only` | Matching configured moderator for `moderation` only | Every other viewer/purpose; absent from V1 |
| `implementation-only` | Matching test run for nonproduction diagnostics only | Production ingress and every other viewer/purpose |

A boundary fixture with grant revision 10 and revoke revision 20 yielded deny at 9, allow at 10 and 19, and deny at 20. `chronicle-public` admitted only a `public` record. Owner export is explicitly spoiler-bearing canonical data, not a UI, Brain, replay, or Chronicle privilege.

For a public child with a private parent, the derived public shape contained only the child's public payload. It contained no parent edge, ID, count, placeholder, or timing hint, and the Chronicle could not cite the private fact before a typed disclosure. Catalog/target enumeration follows authorization; hidden, missing, and revoked targets share `ACTION_UNAVAILABLE`, wording, shape, order behavior, and deterministic timing class. Twelve representative allow/deny assertions covering matches, mismatches, grant/revoke boundaries, privileged labels, production rejection, and public Chronicle passed.

## FR-003 — hours and criterion ownership

Independent arithmetic over T01-T18 reproduced:

| Case | Sum | Consequence |
|---|---:|---|
| Low | 39.5 | Estimate only; not a completion shortcut |
| Expected | 52 | Leaves exactly 8 focused hours to the hard ceiling |
| High | 65 | Exceeds the ceiling by 5 and therefore requires declared cuts/reopen before overrun |

The six milestone expected values also sum to 52. “Focused hours” is total productive labor summed across coordinator, every child, operator setup/facilitation/analysis, and independent review; parallel labor is added. Participant response time and scheduling waits are separate elapsed time, while preparation, operator-channel logistics, facilitation, analysis, and review count. Hours 53-60 are fixes/confirmation only.

The Quality Bar was decomposed into atomic criteria so each has one primary acceptance owner; prerequisite builders and T18 confirmation are not duplicate owners.

| Quality Bar criterion | Primary WBS owner |
|---|---|
| Gate 0 frozen instrument, order, questions, scoring mocks | T01 |
| Gate 0 eligibility/agreement/denominator and product result | T02 |
| Gate 0 visual/semantic/viewport observer result | T03 |
| Gate A frozen browser/human result | T12 |
| Gate B yoked harness, seed/order, anchors, scoring mocks | T14 |
| Gate B/card eligibility, denominator, thresholds, strict means, raw analysis | T15 |
| Canonical tuple/bytes/hash/PRNG/rounding/Unicode/repeat vectors | T04 |
| Snapshot/range replay, durable-before-visible, receipts, collision/crash/atomicity/quota/fence/corruption/dual-tab, export/version/no-import | T06 |
| Three branch terminal vectors and final return/card integration | T13 |
| Visibility invariant/noninterference, Standard Brain perturbation/transfer/baseline/ablation/fallback/no-provider | T08 |
| Resource/ownership/life invariants, fuzzing, and exact 30/90/365 horizons | T10 |
| Production journey, numerical performance budgets, keyboard/reduced motion/semantic paths, three viewports | T17 |
| Prohibited scope absence, HAR/egress, hostile active content, bounds, fail-closed cases, dependency/advisory/license/CI evidence | T16 |
| Reproducible named-commit evidence package and final actual-diff disposition | T18 |

The timed four-hour M0 stop and mandatory milestone re-estimation make the estimate falsifiable before M1; they do not convert elapsed time or parallelism into free labor.

## FR-004 — frozen study calculations

For a reproducible mock only, `PLAN_BASE` was set to the reviewed SHA and gate IDs to `gate-0`/`gate-b`. The exact Goal-prompt seed formula yielded Gate 0 seed `706026b6a9386d6c89e5bbcdf555c439b4e58b307346b93db2f0e627796efc4b`; `first_u32be = 1885349558`, so row 2 was omitted. The remaining cyclic rows mapped in numeric order:

| Participant | Row | First -> last |
|---|---:|---|
| P01 | 0 | one citizen, family, trio, faction, ECHOHOUSE, direct control |
| P02 | 1 | family, trio, faction, ECHOHOUSE, direct control, one citizen |
| P03 | 3 | faction, ECHOHOUSE, direct control, one citizen, family, trio |
| P04 | 4 | ECHOHOUSE, direct control, one citizen, family, trio, faction |
| P05 | 5 | direct control, one citizen, family, trio, faction, ECHOHOUSE |

The keep fixture gave selected one-citizen rank sum 6 against `11/16/17/27/28`; its two binary counts were 4/5 while every alternative was at most 3/5. It therefore kept the structure. Changing one alternative to 5/5 against 4/5 created exactly a 20-point lead and reopened. A tied lowest rank, selected-structure loss, withdrawal, or skipped variant also reopens by direct application of the rule.

The Gate B mock produced first-advice/four-prompt/second-action/card counts `6/8`, `5/8`, `4/8`, and `3/5`. Real/control arithmetic means were `5.5/3.75` for contingency and `5.5/3.625` for continue, so it passed; replacing either control mean with equality failed. The protocol freezes build/snapshot, seed, assignments, exact script/questions/anchors/timers/scoring program, blank manifest, and one manifest hash before enrollment; cohorts are distinct, withdrawal remains in the denominator, and an instrument change voids the cohort.

### FC-001 — P2 — bounded Gate B order reproducibility

**Location:** [Goal prompt, Gate B](../exec-plans/IMPLEMENTATION_GOAL_PROMPT.md#gate-b--proof-of-agency-and-bounded-attachment) and [Quality Bar, Gate B](../quality/QUALITY_BAR.md#gate-b--proof-of-agency-and-bounded-attachment).

The prose fixes the Standard-Brain PRNG stream and says “Fisher-Yates,” but does not fix how each unsigned 32-bit draw becomes an integer in `[0,i]`. A descending Fisher-Yates using multiply-high produced `P05,P01,P06,P02,P04,P08,P07,P03`; using modulo produced `P05,P06,P04,P07,P01,P08,P02,P03` from the same mock seed. Both still yield exactly four real-first/four control-first.

This is P2, not P1, because the exact assignment list and scoring program must be committed and hashed before any participant sees a condition; all eight see both conditions and the decision thresholds are unchanged. The bounded implementation fix is to freeze the descending loop and unbiased bounded-integer rule in the committed analyzer plus a seed/order fixture. Confirmation is two clean implementations returning the same eight-ID order.

## FR-005 — repair-object consistency

A case-insensitive search of current authority Markdown, excluding historical reviews and research, found:

- `ECONOMY`: `2 wood + work` repairs the mill fixture; the 12-food reserve supports that repair.
- `GAME_SYSTEMS`: the same mill conversion and repair pressure.
- `DESIGN`/`ART_DIRECTIONS`: “repairing mill” and a mill-repair silhouette/mark; the well remains the water route and settlement landmark.
- `CHRONICLE`: the audit finds a mill-repair reserve/work order.
- `001` and the Goal prompt: one `2 wood + work` mill repair.

No current authority says the well is repaired. The word “well” appears only for water/site/visual context, not as the repair target.

## FR-006 and repository QA

- Source ledger: 122 rows, 122 unique `S-*` IDs; no referenced ID is undefined. The duplicate `S-DET-001`/`S-DET-002` rows present at the baseline are removed in the reviewed diff.
- `git diff --check 6850b699...94f3acd`: pass.
- `markdownlint-cli2` across the 57 pre-confirmation Markdown files: 0 issues.
- `lychee --offline --include-fragments=full '**/*.md'`: 998 links checked, 727 successful, 271 intentionally excluded external targets, 0 errors.
- `gitleaks` over the reviewed commit and the full worktree: no leaks.
- Unfinished-marker scan: only the policy word “placeholder” and a sourced competitor's “coming soon” status; neither is unfinished work.
- Production/deployment/license scan: no package/lockfile, application source, workflow, deployment manifest, container file, or license. `.env.example` is the sole tracked env-like file and contains no credential.
- Current worktree before this report: clean on the requested branch and exact reviewed SHA.

## Readiness boundary

This confirmation establishes only that the requested reconciliations have no surviving P0/P1 in the targeted planning scope. It supplies no human Gate 0/A/B evidence, implementation, device result, runtime test, or authorization to merge, deploy, publish, spend, or contact participants. Global readiness remains a coordinator decision after this report's allowlist/diff/commit QA and any separately required zero-context review.
