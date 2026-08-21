# Founder Alpha cognition and research review

**Purpose:** Record an independent hostile review of Founder Alpha cognition, evaluation, experiment, replay, and Observatory boundaries at one frozen implementation state.

**Status:** COMPLETE — CHANGES REQUIRED; zero P0, five P1, zero P2

**Authority boundary:** This document records review evidence and objections only. It does not change product, cognition, evaluation, persistence, Observatory, release, or planning authority, and it does not dispose findings.

**Related documents:** [authority index](../INDEX.md), [Founder Alpha plan](../exec-plans/active/002-founder-alpha.md), [cognition](../engineering/COGNITION.md), [evaluations](../quality/EVALS.md), [persistence](../engineering/PERSISTENCE.md), [Observatory](../product/OBSERVATORY.md), [cognition research](../research/FOUNDER_ALPHA_COGNITION_RESEARCH.md)

## Frozen review target

- Commit: `7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`
- Tree: `476c381034ab3601746a7e11235fe693d793782c`
- Comparison base: local `main` at `74a8a7e07d0743f467dd9547ebf4193eb53d6029`
- Diff inspected: `main...7319d59260555ffbe4eb2f4d58beb61d3f8a11ee`
- Worktree: `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/002-review-cognition`

## Method

I started from `docs/INDEX.md`, then inspected the actual frozen diff and the relevant authorities, source ledger rows, implementation, fixtures, runtime wiring, and tests. The code review covered Standard Brain scoring and proposal validation; context construction and visibility; raw decision records and viewer projections; the `BrainPort` and local-process descriptor; the 64-case planner benchmark; `ExperimentManifestV2`; canonical replay; durable runtime recovery; and the JSON-LD/PROV projection and local validator. I did not inspect any other Founder Alpha review output.

Focused execution at the frozen commit produced:

```text
PASS 38/38 tests in 6 files
  tests/unit/systems/cognition.test.ts
  tests/unit/cognition/experiment.test.ts
  tests/unit/cognition/planner-benchmark.test.ts
  tests/unit/observatory/projection.test.ts
  apps/web/src/authoritative-runtime.test.ts
  tests/unit/systems/simulation.test.ts

PASS 1/1 cognition timing test
  20 warmups and 200 measured cycles per class
  minimum: 50.095790999999736 ms
  median range: 51.12041700000009–51.16570800000045 ms
  p95 range: 51.25920899999619–51.30054200000086 ms
```

The runner warned that the active Node was `v25.2.1`, while the repository requests `22.23.1`. The passing focused results therefore are useful behavioral evidence, not proof of the pinned runtime cohort.

## Verdict

**CHANGES REQUIRED.** Canonical Reality remains protected in the inspected runtime: the application invokes Standard Brain directly, canonical replay reduces accepted events without invoking cognition, and neither the local-process nor Observatory seam is wired into application authority. The trace timing test also satisfies its declared minimum-release and spread thresholds in this run.

The release nevertheless cannot claim the documented cognition/evaluation/experiment/Observatory acceptance. The Standard Brain comparison matrix is absent; the advertised frozen benchmark is partially self-attested; the optional-brain fallback is neither actually time-bounded nor strictly validated; the experiment object combines pre-run identity with post-run result; and the Observatory labels caller-supplied content as authorized evidence without possessing authorization evidence. These are P1 defects because they invalidate named Founder Alpha acceptance and research-integrity claims, even though no current product path gives them canonical write authority.

## P0 findings

None. I found no current path by which cognition, experiment data, replay, or the Observatory projection mutates canonical Reality, and no model or planner runtime ships at the frozen target.

## P1 findings

### FA-COG-R-001 — Standard Brain completeness and independence are asserted without the required controls

**Evidence.** **VERIFIED FACT:** `docs/engineering/COGNITION.md:78-80` and `docs/quality/EVALS.md:21-35` require reactive-nearest-need, seeded-legal-random, canonical-trajectory, and five field-ablation comparisons, plus at least three terminal world vectors. Repository search finds none of those executable controls; `goalCompleted` exists only in the new planner benchmark. `tests/unit/systems/cognition.test.ts:88-109` checks changed score-term values or source IDs, not changed actions, superiority to controls, or final world state. In particular, the value perturbation only checks that a source ID changes. `packages/cognition/src/standard-brain.ts:59-66` assigns the top-ranked value to `FollowStandingPlan` even when the action has no matching value tag, so the receipt can say the plan fits a value without a typed semantic match. The transfer test uses `tests/fixtures/riverhold/index.ts:60-83`, which copies Mara's records and changes their IDs/subject to the selected actor rather than exercising that citizen's own mind. The product runtime calls Standard Brain only for Mara's counsel boundary at `apps/web/src/authoritative-runtime.ts:619-671`.

**Impact.** **INFERENCE:** The tests establish deterministic sensitivity of one weighted Riverhold chooser, but not the documented claim that the full brain defeats scripted/reactive controls, transfers independently, or produces interpretation grounded in the actual semantics of values and commitments. The `IMPLEMENTED AND BENCHMARKED` status overstates the executable evidence.

**Affected files.** `packages/cognition/src/standard-brain.ts`; `tests/fixtures/riverhold/index.ts`; `tests/unit/systems/cognition.test.ts`; a new or existing cognition-eval suite; `docs/engineering/COGNITION.md`; `docs/quality/EVALS.md`.

**Direct acceptance tests.** Implement the four named controls and five one-field ablations as real independent choosers. Run the frozen perturbation matrix against each, asserting predeclared action/explanation differences and at least three post-command terminal state/world-head vectors. Transfer the fixture using an actual non-Mara citizen's own authorized records, values, relationship, and plan without cloning Mara's records. Add a negative test proving an unrelated top-ranked value cannot become a positive `FollowStandingPlan` reason. Until those pass, narrow the authority status and acceptance claims.

### FA-COG-R-002 — The 64-case corpus and promotion gate trust self-reported observations

**Evidence.** **VERIFIED FACT:** `packages/cognition/src/planner-benchmark.ts:136-140` hashes only case descriptors, not the canonical `DecisionContext` bytes, expected legal sets, goals, seeds, outputs, or environment used by a run. The actual contexts are regenerated by mutable fixture and genesis code in `tests/unit/cognition/planner-benchmark.test.ts:76-123`. The runner assigns `hiddenEquivalent: true` for every observation and declares `goalCompleted` from the case kind at `tests/unit/cognition/planner-benchmark.test.ts:167-180`; neither value is derived from an applied proposal or terminal world vector. The evaluator then trusts those booleans at `packages/cognition/src/planner-benchmark.ts:232-271`. The positive gate test fabricates a candidate by rewriting every baseline observation to `goalCompleted: true`, supplying four plan labels and small counters, and is promoted at `tests/unit/cognition/planner-benchmark.test.ts:241-261` without running a planner.

**Impact.** **INFERENCE:** The published digest freezes a recipe, not the actual 64 contexts or their oracles. A stale, faulty, or dishonest runner can claim legality, hidden-fact equivalence, goal completion, plan diversity, and search bounds and receive `promote-candidate`. The `52 declared scenario goals` result is a harness declaration rather than measured world behavior. The current `defer-no-candidate` disposition is conservative, but the benchmark cannot safely govern a later promotion and does not support the stronger baseline claims.

**Affected files.** `packages/cognition/src/planner-benchmark.ts`; `tests/unit/cognition/planner-benchmark.test.ts`; frozen benchmark fixtures/evidence; `docs/engineering/COGNITION.md`; `docs/exec-plans/active/002-founder-alpha.md`.

**Direct acceptance tests.** Freeze and hash the canonical JCS bytes and hashes of all contexts, their action catalogs, seeds, expected invariant/goal predicates, and hidden-pair membership. Make one trusted runner invoke the brain five times, validate proposals itself, apply accepted actions through the normal command path where goal completion is claimed, derive terminal vectors and hidden equivalence from bytes, and record the complete report as immutable evidence. The evaluator must reject caller-supplied flags not backed by those artifacts. Add adversarial tests showing that forged `legal`, `hiddenEquivalent`, `goalCompleted`, plan, and counter fields cannot promote a no-op candidate.

### FA-COG-R-003 — `BrainPort` fallback is unbounded and its validator is incompatible with an honest model proposal

**Evidence.** **VERIFIED FACT:** `packages/cognition/src/brain-port.ts:47-48` awaits `optionalBrain.propose` with no timer, cancellation, byte limit, or process termination. The alleged timeout route at lines 40-46 returns before invoking the adapter, and `tests/unit/systems/cognition.test.ts:192-210` therefore tests a forced branch with zero adapter invocations, not a hung or late adapter. Proposal validation checks exact top-level keys but only shallow nested conditions at `packages/cognition/src/standard-brain.ts:298-347`; it does not close or validate explanation/provenance subobjects, authorize every explanation reference, require the authored justification template, or enforce the proposal byte budget. It also requires `cognitionKind === "standard-brain"`, and the only protocol proposal type permits that kind at `packages/protocol/src/types.ts:628-647`. Thus an honestly labelled model proposal cannot pass, while an untrusted adapter can impersonate Standard Brain and submit its own correctly hashed but ungrounded nested receipt. `createCognitiveDecisionRecord` then hard-codes Standard Brain and null provider metadata at `packages/cognition/src/decision-record.ts:68-79`.

**Impact.** **INFERENCE:** A never-settling adapter can stop liveness forever. A future adapter cannot satisfy the stated provenance contract, and the shared validator does not enforce the documented unknown-field, explanation-grounding, and size boundary. The descriptor's timeout and output limits are metadata only; they are not enforced by the executable `BrainPort` path.

**Affected files.** `packages/protocol/src/types.ts`; `packages/cognition/src/brain-port.ts`; `packages/cognition/src/standard-brain.ts`; `packages/cognition/src/decision-record.ts`; `tests/unit/systems/cognition.test.ts`; adapter contract tests.

**Direct acceptance tests.** Either remove the executable optional-brain claim until an adapter exists or add an actually enforced deadline with cancellation/process kill and one deterministic fallback. A fake that returns a never-settling promise must fall back within the declared bound; a late resolution must have no effect. Parse candidates through a closed runtime schema with recursive unknown-field rejection, total byte/depth/count limits, catalog equality, authored-or-explicitly-untrusted justification handling, and reauthorization of every explanation reference. Add separate valid Standard Brain and model provenance variants, persist the exact accepted variant, and test that spoofed provenance, oversized nested arrays, unknown nested fields, unsupported references, template mismatch, and malformed hashes all reject atomically.

### FA-COG-R-004 — `ExperimentManifestV2` is a post-run report, not the documented immutable pre-run manifest

**Evidence.** **VERIFIED FACT:** `docs/engineering/COGNITION.md:98` says the immutable manifest binds run setup and that results append separately. `ExperimentManifestV2` instead embeds mutable outcome fields—including status, output hash, latency, memory, invariant results, and evidence—at `packages/cognition/src/experiment.ts:136-157`, and hashes them into the manifest at lines 520-564. There is no separate result type or append/store path. Repository search finds `createExperimentManifestV2` and `verifyExperimentManifestV2` only in their implementation and unit test; the persistence adapters store the different canonical-run `ExperimentManifest`, not V2 experiment records. The V2 aggregate describes a corpus, seeds, and repetitions, but `result.adapterInvocations` is restricted to at most one at `packages/cognition/src/experiment.ts:468-473`, so it cannot represent a multi-context local-model run honestly.

**Impact.** **INFERENCE:** The experiment identity cannot be committed before observing results, results cannot append immutably to a predeclared identity, and no durable artifact proves which manifest governed a run. A researcher can create a different valid manifest after each outcome. This does not affect Reality, but it defeats the stated experiment-integrity and reproducibility purpose.

**Affected files.** `packages/cognition/src/experiment.ts`; `packages/persistence/src/types.ts` and the chosen noncanonical experiment store; experiment tests; `docs/engineering/COGNITION.md`; `docs/engineering/PERSISTENCE.md`.

**Direct acceptance tests.** Split a pre-run `ExperimentManifestV2` from append-only `ExperimentResultV2` records keyed by its hash. Commit the manifest before execution, preserve exact ordered context/seed/repetition identity, and reject same-ID/different-hash replacement. Results must bind output/proposal hashes, measured samples, invariant evidence, actual invocation count, and failure disposition without changing the manifest hash. Round-trip both through a store that is structurally unavailable to reducers. Test crash/retry, collision, tampering, incomplete runs, and a complete 64-context × five-repetition record.

### FA-COG-R-005 — Observatory authorization and provenance are caller assertions, while the authority text overclaims the validator

**Evidence.** **VERIFIED FACT:** `projectAuthorizedChronicleToProv` accepts only a caller-supplied `viewerKind`, `purpose`, revision, and already-built `ChronicleProjection` at `packages/observatory/src/index.ts:29-35`. It has no viewer identity, visibility context, authorization receipt, event registry, or call to `canRead`. `assertAuthorizedInput` checks only that the two labels form an allowed pair and that Chronicle fields are shaped and bounded at lines 155-190. Every supplied evidence ID is then labelled `eon:AuthorizedEventEvidence` at lines 258-277 without proving that the event exists or is readable by that viewer. The local validator checks the same labels and graph syntax, not source visibility, at lines 402-451 and 537-661. No application call site exists outside the tests. Meanwhile `docs/product/OBSERVATORY.md:41-43` says authorization precedes projection, the validator checks visibility, and the mapping covers agents, association, and attribution; this implementation emits only activities/entities plus use, derivation, and generation.

**Impact.** **INFERENCE:** Any future caller can pass private text/evidence, label the request `public`/`chronicle-public`, and receive a conforming bundle that calls it authorized. The seam is read-only and currently unwired, so this is not a present product disclosure, but its API and validator do not enforce the trust boundary their names and authority claims advertise. The PROV/SHACL language risks overstating interoperability and authorization assurance.

**Affected files.** `packages/observatory/src/index.ts`; `tests/unit/observatory/projection.test.ts`; the Chronicle authorization/projection boundary; `docs/product/OBSERVATORY.md`; `docs/engineering/COGNITION.md`.

**Direct acceptance tests.** Make the input an opaque viewer-authorized Chronicle artifact bound to viewer identity, purpose, revision, policy version, and canonical source digest, or have Observatory invoke the shared visibility projector itself. Resolve each evidence ID against the authorized event set before emitting an evidence node. Add a test in which private Chronicle text/event IDs are supplied with public labels and must fail, plus revoked/missing/wrong-viewer tests. Extend the closed validator to the exact cardinalities and PROV relations actually promised, or narrow the authority language to the implemented subset; do not call syntax-conforming caller input visibility-authorized.

## P2 findings

None separate from the P1 findings above.

## Confirmed controls

- **VERIFIED FACT:** Canonical replay in `packages/sim/src/replay.ts` consumes only the verified snapshot, batch headers, and events; it imports or invokes no cognition or Observatory code.
- **VERIFIED FACT:** `apps/web/src/authoritative-runtime.ts` replays the durable world ledger before separately recovering the stored proposal for presentation, and focused recovery tests passed for all three counsel branches.
- **VERIFIED FACT:** The current product path invokes `standardBrain` directly and does not call `decideWithDeterministicFallback`, `createExperimentManifestV2`, or `projectAuthorizedChronicleToProv`.
- **VERIFIED FACT:** `ExperimentManifestV2` output is deeply frozen and JCS-domain-hashed, and tampering with a tested field makes verification fail. That cryptographic property does not cure the pre-run/result conflation in FA-COG-R-004.
- **VERIFIED FACT:** The Observatory implementation has an embedded context, no document loader/network path, closed top-level/node keys, byte/node limits, duplicate-ID detection, and dangling-reference detection.
- **VERIFIED FACT:** The decision-trace release test passed hidden-value byte equality, the 50 ms minimum, and the 5 ms median/p95 spread thresholds in this review run.

## Uncertainties and limits

- **UNRESOLVED:** Human Gate B, the yoked scripted comparison, and fresh-player interpretation remain `NOT RUN`; code and logs cannot establish player-perceived independence or attachment.
- **UNRESOLVED:** No planner or local model candidate exists, so no candidate quality, performance, memory, thermal, license, or zero-egress claim was tested. The correct current disposition remains no candidate, not Planner superiority.
- **UNRESOLVED:** The focused tests ran under unsupported Node `v25.2.1`; rerun all acceptance under pinned Node `22.23.1` after repairs.
- **UNRESOLVED:** No external Observatory consumer or round-trip requirement is identified. If none appears, removing or narrowing the seam is safer than expanding a research surface that the product does not use.
