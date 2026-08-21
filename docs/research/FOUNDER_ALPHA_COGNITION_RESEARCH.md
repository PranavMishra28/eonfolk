# Founder Alpha cognition research

**Purpose:** Decide the smallest safe Founder Alpha cognition, local-inference, experiment, and ontology seams.

**Status:** DECISION-READY RESEARCH — accessed 2026-08-21; no dependency, model, download, or implementation is authorized by this document.

**Authority boundary:** [Cognition](../engineering/COGNITION.md) owns cognitive behavior, [architecture](../engineering/ARCHITECTURE.md) owns package boundaries and typed authority, [Observatory](../product/OBSERVATORY.md) owns diagnostics, and the living [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md) owns execution. This file proposes decisions and source-ledger rows; it does not amend those authorities or [the source ledger](SOURCE_LEDGER.md).

**Evidence language:** `VERIFIED FACT` is limited to opened primary or official sources. `INFERENCE` is a bounded conclusion from those facts and the inspected repository. `PRODUCT HYPOTHESIS` requires product evidence. `UNRESOLVED` names evidence still missing.

## Executive disposition

| Label | Disposition | Decision-ready recommendation | Reopen / promote only when |
|---|---|---|---|
| `FA-COG-001` | **KEEP** | Standard Brain remains the complete default and liveness path in every mode. | A frozen behavioral corpus shows a specific multi-step deficit after mechanics, memory, and content pass. |
| `FA-COG-002` | **BOUNDED SPIKE** | If that deficit exists, implement one zero-dependency deterministic HTN/GOAP hybrid over the existing typed context and closed action catalog. | The benchmark in this document is frozen before implementation and the hybrid clears every safety, determinism, value, and runtime gate. |
| `FA-COG-003` | **REJECT NOW** | Do not implement MCTS, POMCP, particles, or probabilistic belief search in Founder Alpha. | A typed stochastic transition/observation model and an information-gathering failure case exist, and tiny POMCP beats both Standard Brain and the bounded planner under the later gate below. |
| `FA-COG-004` | **KEEP SEAM; DEFER ADAPTER** | Keep `BrainPort` provider-neutral. A developer-only, local, manually provisioned subprocess experiment may compare MLX-LM or llama.cpp; neither is a product dependency. Prefer llama.cpp for the first experiment because a pinned executable avoids the Python resolver surface. | Exact executable, model, tokenizer, prompt, schema, license, hashes, offline controls, and M4 Pro measurements are recorded. No weights are selected here. |
| `FA-COG-005` | **ADOPT** | Add an immutable BrainPort experiment-manifest revision before any optional planner/model comparison. It records reproducibility inputs and observed outputs without becoming canonical world state. | Reopen if the manifest cannot independently reconstruct the harness/configuration or leaks a secret, private record, path, or hidden reasoning. |
| `FA-COG-006` | **ADOPT BOUNDED** | Extend the existing one-way Observatory projection with embedded JSON-LD 1.1 terms, PROV-O mapping, and a locally implemented stable SHACL Core subset. Remain RDF 1.1-compatible; label RDF 1.2 and SHACL 1.2 features experimental. | A concrete interoperability consumer requires a larger standards/library surface and passes authorization, determinism, bundle, security, and round-trip-nonauthority tests. |

These recommendations keep the Founder Alpha implementation path at **zero new runtime dependencies, zero weights, zero required downloads, zero training, zero network, and approximately $0**. Planner, model, experiment, and ontology output remains untrusted, noncanonical proposal or diagnostic data.

## Inspected repository boundary

The review inspected the current cognition, protocol, simulation-facing projection, Observatory, evaluation, security, and performance authorities and implementation.

- `DecisionContext` is already the correct sole input boundary: it contains actor-authorized epistemic records, sorted relationships/values, a closed sorted action catalog, and explicit budgets of 32 records, 16,384 bytes, 8 candidates, plan depth 4, and zero retries.
- `BrainPort.propose` is called at most once and `decideWithDeterministicFallback` returns Standard Brain output on missing, forced timeout, malformed data, or a throw. Optional cognition cannot be required for liveness.
- Standard Brain uses integer grounded score terms, a persisted PRNG draw only for a tie, one catalog action, authored public explanation, and null plan/memory proposals.
- The current proposal validator intentionally accepts only `standard-brain` provenance and null plan/memory proposals. A planner/model spike therefore requires a new versioned proposal/provenance validator; broadly weakening the V1 validator would be a security regression.
- Raw `CognitiveDecisionRecord` already separates nullable provider/model/prompt/schema/artifact hashes from world truth, but its `cognitionKind` currently has only `standard-brain | model`. Planner provenance must be an explicit new version, not mislabelled `model`.
- `ExperimentManifest` is currently the immutable V1 local-proof manifest with Standard Brain and null parent/model. A new manifest revision is required; mutating V1 or overloading its meaning is rejected.
- `projectAuthorizedChronicleToProv` already accepts an authorized Chronicle projection rather than a ledger or Mind. It emits a small JSON-LD-shaped graph. It does not yet identify a JSON-LD version, validate a shape, sort/deduplicate by a frozen rule, bind a stable EON vocabulary, or distinguish full PROV activities from evidence entities.

**INFERENCE:** the current seams are sufficient. Founder Alpha needs typed versions and experiments, not a second cognitive authority or an RDF-backed reducer.

## Deterministic planner recommendation

### Why HTN plus GOAP, not a generic planner package

**VERIFIED FACT:** SHOP2 plans tasks in the same order they will be executed and uses domain-authored hierarchical task methods [S-FA-COG-001]. **VERIFIED FACT:** Orkin's real-time game-planning report describes goals/actions as reusable behavioral building blocks but also identifies search iterations and costly preconditions as CPU concerns [S-FA-COG-002].

**INFERENCE:** Riverhold benefits from the controllability of a tiny authored hierarchy and the recovery/diversity of a bounded cost search. It does not need PDDL parsing, temporal planning, a general theorem prover, or a third-party planner runtime. A local implementation is small enough to preserve exact ordering, integer arithmetic, typed preconditions, and the existing action catalog.

### Frozen algorithm contract

Call the research candidate `riverhold-planner-v1`. It must satisfy all of the following before it can be compared:

1. **Input authority.** Read only one already-built `DecisionContext`. Never query Reality, persistence, another Mind, a model, time, randomness outside the supplied PRNG, or a mutable registry.
2. **Planning state.** Derive a closed `PlanningStateV1` from explicit authorized fields. Every field is a boolean, bounded integer, enum, or stable ID. Missing knowledge is `unknown`, never false and never looked up.
3. **Operators.** Each operator references exactly one `actionId` in the supplied catalog and declares typed public preconditions, typed deterministic effects used only for planning, a nonnegative integer cost, and stable operator version. Effects cannot create facts, records, IDs, commands, or catalog actions.
4. **HTN methods.** Authored compound tasks decompose through methods sorted by stable `methodId`. Maximum decomposed action depth is `context.budgets.maxPlanDepth` (currently 4). Recursion and dynamic code are forbidden.
5. **GOAP search.** Use uniform-cost search initially (equivalent to A* with `h = 0`). Queue order is the tuple `(totalIntegerCost, depth, actionIdSequence, methodIdSequence)`. Never depend on object/map iteration, wall time, floating point, or platform collation.
6. **Hard caps.** At most 64 node expansions, 128 generated nodes, 8 catalog candidates, depth 4, and 16,384 output bytes. Duplicate states use canonical bytes plus the repository SHA-256 helper. Count caps, not elapsed time, decide the result.
7. **Selection.** Return the first action of the lowest-cost valid plan. A persisted PRNG draw is permitted only among plans identical on the full deterministic ordering key other than an explicitly declared diversity slot. The draw and tied IDs enter typed explanation/provenance.
8. **Output.** Emit one catalog action and, at most, a typed four-step Standing Plan proposal. Public justification is rendered from authored templates. Search frontier, rejected paths, private scoring narrative, and chain of thought are not persisted or exposed.
9. **Failure.** No plan, cap exhaustion, schema mismatch, stale context, invalid output, exception, or deadline signal returns Standard Brain through the existing fallback boundary. It never partially writes state.
10. **Execution authority.** The normal proposal validator and state-changing command path revalidate context revision, catalog membership, domain rules, writer fence, and persistence. A plan is intention, not fact or reserved future authority.

The wall-clock watchdog remains necessary for liveness, but it is a host failure condition rather than an input to planner choice. This preserves byte-for-byte replay on the same protocol version while still killing a hung worker.

### Frozen comparison protocol

Freeze the corpus, expectations, and hashes before writing the planner. The smallest credible corpus is 64 contexts:

- 48 full-factor contexts: two trust states × two evidence qualities × two commitment states × three counsel states × two plan states;
- 8 blocked-plan/replan contexts;
- 4 urgent-threat contexts where the safe short action must dominate;
- 4 hidden-pair contexts that differ only in records unauthorized to the actor.

Run each context with 8 fixed PRNG seeds for 512 decisions per cognition kind. Standard Brain and planner consume identical canonical contexts and catalogs. Planner promotion requires:

- 100% schema, authorization, catalog, stale-revision, boundedness, and public-explanation checks;
- identical proposal bytes and PRNG end state across five independent same-build repeats;
- identical authorized proposal/trace pairs for every hidden pair;
- zero invalid action, unauthorized ID, invented fact, partial write, extra adapter call, or replay divergence;
- all 12 predeclared multi-step/replan cases complete their authored goal within depth 4, and planner improves completion by at least 3 cases over Standard Brain without regressing an urgent hard assertion;
- at least four legitimate alternative plans across the declared diversity fixtures, with every difference explained by an authorized input or recorded tie draw;
- median at most 1 ms, p95 at most 3 ms, and worst at most 8 ms per proposal on the target M4 Pro in the cognition worker; maximum 64 expansions and 16,384 proposal bytes in every run;
- no regression of the repository's OFF/LOCAL/ALPHA frame, worker, memory, storage, or bundle budgets; and
- a blinded story/coherence review shows the improvement is legible, not merely a different action sequence.

The exact millisecond thresholds are **proposed implementation budgets**, not measured facts. Record cold and warm cohorts separately. If the planner misses any hard gate or does not clear the three-case improvement floor, `FA-COG-002` resolves to **REJECT** and Standard Brain remains complete.

## Belief-aware MCTS/POMCP disposition

**VERIFIED FACT:** POMCP combines Monte Carlo tree search with a particle representation of belief and uses a black-box simulator to plan in partially observable Markov decision processes [S-FA-COG-003].

POMCP is not warranted here:

- Riverhold's typed `BeliefRecord` is an actor's sourced epistemic state, not a calibrated probability distribution over hidden canonical Reality.
- No authorized generative transition and observation model currently assigns probabilities to outcomes or future perceptions.
- Sampling hidden Reality would violate the DecisionContext boundary; sampling unsupported hypotheses would add false precision.
- The present action bound (8), plan depth (4), and authored deterministic consequences favor exhaustive bounded symbolic search.
- Approximate rollout values, floating arithmetic, simulation count sensitivity, and stochastic ties add reproducibility and explanation cost without an observed information-gathering failure.

Reconsider only if a frozen case has all of these properties: at least two actor-authorized hypotheses; action-dependent observations with materially different information value; typed and calibrated transition/observation distributions; Standard Brain and the bounded planner both miss the goal; and the player can perceive the improvement.

A future comparison ceiling would be 32 particles, 128 simulations, depth 4, 8 actions, fixed-point integer rewards, one persisted seed, stable action/observation ordering, and actor-authorized hypothesis construction only. It must beat both baselines by the planner's safety gates and improve at least 20 percentage points on a predeclared information-gathering success metric across at least 100 fixed cases. Until those prerequisites exist, implementing even this tiny search is **REJECTED**.

## Local open/open-weight inference seam

### What current sources establish

**VERIFIED FACT:** Apple MLX 0.32.1 is MIT-licensed, requires Python 3.10 or later, publishes Apple-arm64 wheels, and on Darwin declares the exact companion `mlx-metal==0.32.1` [S-FA-COG-004] [S-FA-COG-005]. MLX is designed for Apple silicon and unified memory [S-OVN-006], but no opened source establishes EONFOLK latency, quality, memory, thermals, or renderer coexistence on this particular M4 Pro.

**VERIFIED FACT:** MLX-LM 0.31.3 is MIT-licensed and declares `mlx>=0.31.2` on Darwin plus unpinned `numpy`, `sentencepiece`, `protobuf`, `pyyaml`, and `jinja2`, and `transformers>=5.0.0` [S-FA-COG-006]. Its CLI accepts a local directory or a Hugging Face repository; if the supplied path does not exist its loader calls Hub `snapshot_download`. Its CLI also has a default remote model when no model is supplied. Therefore an existence check and explicit local path are security requirements, not conveniences.

**VERIFIED FACT:** llama.cpp v0.2.0 resolves to commit `bb4caa7540188872173c44d161602d9271386413`, is MIT-licensed, supports Metal, accepts a local GGUF with `-m`, has `--offline`, an explicit seed, and JSON-schema/grammar-constrained generation [S-FA-COG-007]. Its same README also supports `-hf` downloads and an HTTP server, and warns of recent API changes. Those surfaces are excluded.

### Recommended adapter shape

The first optional research adapter should be `local-process-brain-v1`, with a runtime descriptor selecting either `llama.cpp-cli-v1` or `mlx-lm-cli-v1`. It is a developer experiment, never required by app startup, save load, replay, or a player-visible action.

- The host builds one authorized `DecisionContext`, one closed action schema, and one bounded request. It invokes an executable directly with an argument array—never a shell or server—and writes one length-prefixed canonical JSON request to stdin.
- The child receives an empty temporary working directory and an environment allowlist. It has no credentials, proxy variables, home path, repository path, tool protocol, or arbitrary file paths.
- For llama.cpp, require the exact v0.2.0 commit/build hash, `--offline`, a pre-existing absolute local `-m` GGUF path, explicit seed, fixed context/token/thread/batch settings, temperature 0 for the first conformance run, and a local JSON-schema file/hash. Ban `-hf`, `--model-url`, server/router mode, Web UI, and remote schemas/references.
- For MLX-LM, require an isolated locked Python environment, explicit existing local `--model` directory, explicit seed and generation limits, `--trust-remote-code` absent, `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`, and a preflight that every model/tokenizer/config file is inside the approved artifact root. Do not rely on those environment variables instead of OS-level egress measurement.
- Capture stdout and stderr separately, cap each at 16 KiB, parse exactly one framed result, and reject trailing data. Timeout is one cold 15-second research ceiling and one warm 3-second ceiling, zero retries. Kill the process group on timeout.
- Validate exact keys, size, proposal hash, context/revision, catalog action and payload, typed plan/memory bounds, and public explanation template inputs. Model prose never becomes a fact, evidence, command, URI, ontology term, or justification of authority.
- macOS process launch alone does not prove zero egress. Accept a model run only with a deny-all network sandbox or equivalent independent socket/network trace plus the repository's zero-egress validation. Otherwise label the run `OFFLINE NOT PROVEN` and keep it diagnostic.

**INFERENCE:** llama.cpp is the smaller first experiment surface because the adapter can pin one native executable plus a separately licensed GGUF. MLX-LM is valuable as an Apple-native comparator but brings a Python resolver, Hub-aware loading, tokenizer code, and multiple native/data packages. This is not a quality or performance conclusion; only the frozen M4 Pro experiment may decide that.

### Exact dependency and supply-chain disposition

| Candidate at 2026-08-21 | Exact reviewed identity / license | Install or integration surface | Direct/transitive risk | Recommendation |
|---|---|---|---|---|
| Planner | Local TypeScript, no package | Repository build only | Algorithm/domain review; no supplier | **Zero dependency.** |
| Ontology projection/shape subset | Local TypeScript, no package | Repository build only | Standards-subset conformance must be tested | **Zero dependency.** |
| `mlx` | PyPI/GitHub `0.32.1`, commit `3a6219917e4535575ce5bce2fc2ba27a483a709b`, MIT; Python `>=3.10`; Darwin dependency `mlx-metal==0.32.1` | Isolated research venv only; hashes locked before install | Native wheel/Metal ABI, Python/OS compatibility; model is separate | **Do not add to workspace.** Consider only with an authorized lock/SBOM. |
| `mlx-lm` | PyPI/GitHub `0.31.3`, commit `ed1fca4cef15a824c5f1702c80f70b4cffc8e4dd`, MIT | Isolated research venv only; no extras | Declares ranges, not a reproducible graph: `mlx>=0.31.2`, `numpy`, `transformers>=5.0.0`, `sentencepiece`, `protobuf`, `pyyaml`, `jinja2`. `transformers` brings Hub/network, tokenizers, safetensors, HTTP, filesystem, and native-wheel surfaces. Effective Python floor is MLX's `>=3.10`, despite MLX-LM metadata saying `>=3.8`. | **Defer.** Lock every wheel/hash/license; no source distributions, extras, training, conversion, upload, or Hub resolution. |
| `llama.cpp` | tag `v0.2.0`, commit `bb4caa7540188872173c44d161602d9271386413`, MIT | Prefer a locally built, hashed `llama-cli`; do not link `libllama` or launch server | Vendored ggml/backend code, native compiler/Metal surface, build flags, release/API churn; default source options include server/UI and optional download/HTTPS paths. GGUF/model/tokenizer licenses are separate. | **Preferred first external spike**, with source pin, compiler/build manifest, network features disabled, and binary hash. |
| `jsonld` | npm `9.0.0`, BSD-3-Clause, Node `>=18` | Four direct runtime dependencies | Includes `@digitalbazaar/http-client` and canonicalization/cache packages; remote context fetching is contrary to the seam; dependency ranges expand audit/bundle | **Reject for first projection.** |
| `rdf-validate-shacl` | npm `0.6.5`, MIT | Eleven declared direct runtime dependencies, including RDFJS environment/dataset/vocab packages | Large range-based graph, datatype/term semantics, no declared Node engine in package metadata, and unnecessary SPARQL-adjacent surface for six local constraints | **Reject for first projection.** |

The MLX-LM dependency constraints above are exact release metadata; exact resolved transitives do not exist until a lock is generated. Treating 2026-08-21 registry “latest” versions as a lock would be false reproducibility. Any authorized experiment must generate a platform-specific lock with artifact hashes, reject sdists/build scripts, enumerate all resolved licenses and native code, and attach that immutable inventory to the manifest before execution. This document performed no install.

No runtime or model license covers a model artifact automatically. Before any run, record the exact weight repository/revision, content hashes, tokenizer/config/template hashes, license text hash, attribution/use/redistribution constraints, source, and whether the model permits the intended local evaluation. Unknown or incompatible terms fail closed.

## Reproducible BrainPort experiment manifest

`ExperimentManifestV2` should be immutable, canonicalized with the repository JCS implementation, hashed with SHA-256, and stored outside the canonical World ledger. RFC 8785 describes invariant JSON serialization for repeatable hashing [S-FA-COG-013]; EONFOLK should continue its already-tested local JCS implementation instead of adding a package.

Required closed fields:

- `schemaVersion`, `manifestId`, `experimentId`, `runId`, `createdAt`, research owner, purpose, status, and explicit `nonCanonical: true`;
- source commit/tree, dirty-state boolean (must be false for comparable runs), engine/protocol/determinism/replay/visibility/catalog/cognition versions and hashes;
- canonical input-corpus ID/hash, exact context IDs/hashes, fixed seed list/PRNG algorithm and initial states, repetition ordering, warm/cold definition, and expected invariant-set hash;
- brain kind (`standard | planner | local-process-model`), adapter/version/hash, executable path-redacted identity/hash, command argument array with local paths replaced by artifact IDs, environment allowlist hash, build/compiler flags, and OS sandbox/egress evidence;
- for planners: domain/operator/method/cost/queue-order hashes and expansion/generated/depth/byte caps;
- for models: runtime/version/commit/license, model/tokenizer/config/chat-template/prompt/proposal-schema artifact IDs, sizes/hashes/licenses, quantization, context/token/sampling/thread/batch parameters, seed, offline controls, and `trustRemoteCode: false`;
- host model (`MacBook M4 Pro`), CPU/GPU/OS/runtime/browser identities, total memory, power source/mode and boundary readings, thermal/fan sampling method, concurrent renderer/build identity, and whether the run is cold or warm;
- request/output byte caps, timeout, retries (`0`), actual invocation count, stdout/stderr hashes and bounded retained artifacts, parsed proposal/result/failure code, validator stages, and Standard Brain fallback result;
- per-sample latency (load/prefill/first-token/decode/total where applicable), memory high-water, energy/thermal observations, renderer frame/worker interference, output token count, schema/legal-action rate, and story/eval labels;
- accepted decision/receipt/event references only where the experiment intentionally executes a normal command; otherwise `execution: null`. No experiment may forge or reserve these IDs;
- zero-egress and credential-scan result/artifact hashes, license/SBOM result, invariant/noninterference/replay results, deviations, limitations, artifact retention policy, manifest canonical-byte hash, and optional signature metadata.

The manifest stores inputs, configuration, measurements, and outputs; it does **not** promise that a stochastic model will regenerate identical output. Model comparisons use independent run IDs and report distributions. It must never store chain of thought, raw hidden state, an unauthorized DecisionContext, credentials, full home/repository paths, mutable URLs without revision/hash, or unbounded stdout/stderr.

Five repetitions per exact cell are the minimum smoke cohort; behavioral comparisons retain the 8 fixed seeds above and at least 100 contexts for any model, matching [evaluation authority](../quality/EVALS.md). One manifest covers one immutable run. A parent experiment may reference child manifest hashes, but may not mutate or overwrite them.

## Read-only JSON-LD / RDF / PROV-O / SHACL projection

### Standards posture

- **VERIFIED FACT:** JSON-LD 1.1 is a W3C Recommendation dated 2020-07-16 and defines JSON-based linked data processing [S-FA-COG-008].
- **VERIFIED FACT:** RDF 1.2 Concepts is a W3C Candidate Recommendation Snapshot dated 2026-04-07, not a final Recommendation [S-FA-COG-009].
- **VERIFIED FACT:** PROV-O is a W3C Recommendation dated 2013-04-30 with `prov:Entity`, `prov:Activity`, `prov:Agent`, and qualified extensions [S-FA-COG-010].
- **VERIFIED FACT:** SHACL 1.0 is a stable W3C Recommendation dated 2017-07-20 [S-FA-COG-011]. SHACL 1.2 Core is a Working Draft dated 2026-08-03 [S-FA-COG-012].

Therefore `eonfolk-observatory-jsonld-v2` should emit a JSON-LD 1.1 document restricted to an RDF 1.1-compatible subset. It may declare that RDF 1.2 processors are a test target, but must not depend on RDF 1.2 triple terms, directional language tags, or another Candidate feature. SHACL 1.2-only features remain experiments, never validation authority.

### Projection contract

1. Accept only already-authorized, purpose-bound Chronicle or filtered DecisionTrace projections with viewer, `atRevision`, and visibility-policy version. The function signature must make a raw ledger, Reality, Mind, raw decision record, or whole-state hash unrepresentable.
2. Use one literal embedded `@context` with `@version: 1.1`; prohibit remote contexts, imports, dereferencing, framing URLs, and document loaders. Prefer a versioned `urn:eonfolk:vocab:v2:` namespace over the current placeholder web origin.
3. Generate opaque versioned URNs from IDs already authorized in the input. Never expose hidden IDs, hashes, counts, sequence gaps, blank-node labels, filesystem paths, or raw payloads.
4. Sort graph nodes by canonical `@id`, properties by the local JCS rule, and all multivalues by their canonical scalar/object bytes unless the protocol explicitly marks order semantic. Deduplicate identical nodes; conflicting duplicate IDs fail projection.
5. Map an authorized event-envelope projection to `prov:Entity`; an authorized executed decision/transition projection to `prov:Activity`; the public citizen/viewer identity, if authorized, to `prov:Agent`; and Chronicle sentences to `prov:Entity` generated by a named Chronicle projection activity. Use `prov:used`, `prov:wasGeneratedBy`, `prov:wasAssociatedWith`, and `prov:wasDerivedFrom` only where the typed source relationship really has that semantics.
6. Keep EONFOLK causal relation classes (`direct`, `trigger`, `contributing`, `prevented-by`, `would-have-otherwise`) as typed `eon:` terms. Do not silently translate every causal parent into PROV derivation.
7. Treat public justification, belief, claim, memory, planner path, and model output as attributed entities/testimony. Projection cannot upgrade them into world fact.
8. Projector or shape failure blocks only the export/diagnostic surface. It cannot reject, accept, mutate, rewind, replay, or repair a world command.

### Local shape subset

Implement only the closed checks EONFOLK needs: required/optional exact keys; min/max count; string/boolean/bounded-integer datatype; allowed enum; fixed class/namespace; URN syntax; unique `@id`; reference target existence; no blank node; no remote `@context`; and maximum nodes/bytes. Name the validator `eonfolk-shape-subset-v1`, not “SHACL-complete.”

Keep a small hand-authored SHACL 1.0 document as an interoperability fixture if useful, and verify the same positive/negative vectors with an external validator in a nonblocking research job. Do not ship SPARQL constraints, inference, rules, recursion, JavaScript extensions, remote imports, a triple store, JSON-LD expansion/compaction, or an RDF parser in Founder Alpha.

Required tests include shuffled-input byte equality, duplicate/conflicting ID rejection, Unicode/number vectors, remote-context rejection without attempted egress, unauthorized-pair noninterference, raw-type compile/runtime rejection, max-node/max-byte overflow, every shape failure, stable external JSON-LD/RDF parse of the golden fixture, and proof that deleting Observatory/ontology code leaves canonical replay hashes unchanged.

## Security and failure analysis

| Threat | Required control / failing outcome |
|---|---|
| Planner sees hidden truth | Planning state is a pure transform of authorized `DecisionContext`; hidden-pair test must produce identical authorized output. Any difference rejects planner. |
| Planner invents or reserves an action | Operator references exact catalog entry; normal validator and command path revalidate. Failure falls back before mutation. |
| Model prompt injection asks for tools/files/network | No tool protocol, shell, server, credentials, arbitrary paths, or network; stdout is untrusted bounded JSON. Injection corpus must yield only a legal proposal or fallback. |
| MLX-LM or llama.cpp downloads implicitly | Existing local artifact preflight, explicit local path, offline flags/environment, deny-all egress evidence, and ban on Hub/model URL/server modes. Any DNS/socket byte invalidates run. |
| Model/tokenizer custom code executes | `trustRemoteCode: false`; reject artifacts requiring remote/custom Python; prefer declarative known tokenizer formats. |
| Native runtime/model artifact is malicious or corrupt | Pin source/release, compiler/build flags and hashes; verify weight/tokenizer/config hashes and license; run least-privilege process with caps. |
| Output smuggles fact or hidden ID | Exact closed schema/catalog match; authored explanation; per-field authorization; no raw output in Chronicle or ontology. |
| Experiment becomes a replay oracle or canonical branch | Manifest is immutable research evidence outside reducer input; replay uses persisted canonical events, never reruns planner/model. |
| JSON-LD processor fetches a remote context | Embedded fixed context, no document loader, static rejection of URL contexts, zero-egress test. |
| RDF/PROV terminology overclaims truth or causality | Explicit type mapping; typed EON causal terms retained; belief/claim/justification remains testimony. |
| Shape/ontology code gains write authority | Dependency direction and API accept projections only; removal/nonauthority test; failure affects export alone. |
| Unbounded search/output exhausts worker | Count/depth/node/byte/token/process limits; no retry; process-group termination; Standard Brain fallback. |

## Objections, uncertainties, and falsification

### Strong objections

1. **A planner may create technically coherent but less human behavior.** The promotion gate includes blinded story legibility and a minimum specific multi-step gain. Diversity alone is not value.
2. **Authored HTN methods can become a disguised script graph.** Limit methods to recurring goals and reusable operators; measure transfer to held-out combinations. Reject if every interesting branch needs a bespoke method.
3. **A local model can crowd the renderer and still appear “fast” in isolation.** Measure it concurrently with the selected scene and preserve existing frame/worker gates. Model inference pauses/degrades or falls back; rendering budgets do not weaken.
4. **Temperature zero and a seed do not prove cross-build determinism.** Record exact runtime/build/hardware and treat model output as an observed distribution, never canonical replay.
5. **Linked-data vocabulary can become architecture astronautics.** The projection earns retention only through a real diagnostic/export question. It stays removable, zero-dependency, and one-way.
6. **SHACL subset naming can imply conformance it lacks.** Publish the exact supported constraint matrix and never call it a general SHACL engine.

### Unresolved evidence

| ID | `UNRESOLVED` question | Falsifying / resolving evidence |
|---|---|---|
| `U-FA-COG-001` | Does Standard Brain actually fail a multi-step Founder Alpha behavior? | Frozen corpus plus player-observable failure categories. No failure closes planner work. |
| `U-FA-COG-002` | Can the proposed planner improve coherence within the budgets? | Five-repeat M4 Pro corpus report and blinded comparison. Missing any hard gate rejects it. |
| `U-FA-COG-003` | Is there an information-value problem that needs partial-observability search? | Typed stochastic model and predeclared POMCP win. Without both, rejection stands. |
| `U-FA-COG-004` | Which, if any, open-weight artifact is legal, small, coherent, and fast enough? | Exact-artifact license review plus >=100-context MLX-LM/llama.cpp manifest cohort. No model is selected now. |
| `U-FA-COG-005` | Can macOS local-process experiments prove zero egress with the chosen harness? | Independent deny/trace artifact covering DNS and sockets. Offline flags alone do not resolve it. |
| `U-FA-COG-006` | Does an external tool need RDF 1.2 or SHACL 1.2 behavior? | Named consumer and conformance fixtures. In their absence, stable subset remains sufficient. |
| `U-FA-COG-007` | Does ontology projection help Founder Alpha debugging enough to justify maintenance? | A predeclared Observatory task becomes faster/more correct without exposing more data. Otherwise remove it. |

### Explicit falsification rules

- If Standard Brain clears the frozen plan corpus and human review, do not implement the planner to manufacture novelty.
- If a planner/model changes an output because of an unauthorized record, exposes an unreadable ID/count/timing signal, or affects canonical replay when removed, reject the candidate regardless of quality.
- If an external runtime requires a key, network, auto-download, training, unreviewed custom code, weights in Git, or numerical budget relief, reject it for Founder Alpha.
- If the selected model/runtime/model-license inventory cannot be independently reconstructed from hashes and immutable sources, do not run it.
- If JSON-LD/shape processing attempts network access or Observatory code becomes an input to Reality/reducer validation, remove the path.

## Proposed source-ledger rows

These IDs are proposed and intentionally not written to the coordinator-owned ledger.

| Proposed ID | Material claim | Primary / official source | Accessed | Class | Confidence | Reopen rule |
|---|---|---|---|---|---|---|
| `S-FA-COG-001` | SHOP2 is an HTN planner that orders tasks like execution order and supports domain-authored methods. | [JAIR/AAAI SHOP2 paper](https://s.aaai.org/Library/JAIR/Vol20/jair20-013.php) | 2026-08-21 | A | High for paper claims | Reopen only for a different planner algorithm or a correction to the source. |
| `S-FA-COG-002` | Real-time game planning provides reusable goals/actions but makes search iterations and costly preconditions a CPU concern. | [AAAI AIIDE: Orkin 2005](https://ojs.aaai.org/index.php/AIIDE/article/view/18724) | 2026-08-21 | A | High for report claims | Reopen with direct Riverhold planner measurements. |
| `S-FA-COG-003` | POMCP combines MCTS and a particle belief representation with a black-box simulator for POMDP planning. | [NeurIPS POMCP paper](https://papers.nips.cc/paper/2010/file/edfbe1afcf9246bb0d40eb4d8027d90f-Paper.pdf) | 2026-08-21 | A | High for algorithm claim | Reopen when EONFOLK has a calibrated generative/observation model and benchmark. |
| `S-FA-COG-004` | MLX v0.32.1 is the current official release at the accessed date; its tagged commit is `3a621991…`. | [Apple MLX v0.32.1 release](https://github.com/ml-explore/mlx/releases/tag/v0.32.1) and [tag ref](https://api.github.com/repos/ml-explore/mlx/git/ref/tags/v0.32.1) | 2026-08-21 | B | High for accessed release | Reverify immediately before a spike. |
| `S-FA-COG-005` | MLX 0.32.1 is MIT, Python >=3.10, and Darwin installs `mlx-metal==0.32.1`; Apple-arm64 wheels exist. | [Official PyPI MLX metadata](https://pypi.org/pypi/mlx/0.32.1/json) | 2026-08-21 | B | High for release metadata | Reverify Python/OS/wheel/hash before install. |
| `S-FA-COG-006` | MLX-LM v0.31.3 is MIT and declares the listed unpinned inference dependency graph; a missing local model path can trigger Hub download. | [MLX-LM v0.31.3](https://github.com/ml-explore/mlx-lm/tree/v0.31.3), [loader](https://github.com/ml-explore/mlx-lm/blob/v0.31.3/mlx_lm/utils.py), and [PyPI metadata](https://pypi.org/pypi/mlx-lm/0.31.3/json) | 2026-08-21 | B | High for inspected release | Reverify and lock exact graph before any install/run. |
| `S-FA-COG-007` | llama.cpp v0.2.0 (`bb4caa754…`) is MIT and exposes local model, offline, seed, grammar/JSON-schema and Metal paths, alongside excluded download/server surfaces. | [Official v0.2.0 release](https://github.com/ggml-org/llama.cpp/releases/tag/v0.2.0), [CLI options](https://github.com/ggml-org/llama.cpp/blob/v0.2.0/tools/cli/README.md), and [license](https://github.com/ggml-org/llama.cpp/blob/v0.2.0/LICENSE) | 2026-08-21 | B | High for tagged source | Reverify release/API/build and all vendored licenses before spike. |
| `S-FA-COG-008` | JSON-LD 1.1 is a W3C Recommendation dated 2020-07-16. | [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) | 2026-08-21 | A | High | Reopen for errata/new Recommendation. |
| `S-FA-COG-009` | RDF 1.2 Concepts is a Candidate Recommendation Snapshot dated 2026-04-07. | [W3C RDF 1.2 Concepts](https://www.w3.org/TR/rdf12-concepts/) | 2026-08-21 | A | High for current status | Reverify at implementation and on Recommendation. |
| `S-FA-COG-010` | PROV-O is a W3C Recommendation dated 2013-04-30 for provenance entities, activities, agents, and relations. | [W3C PROV-O](https://www.w3.org/TR/prov-o/) | 2026-08-21 | A | High | Reopen for errata or incompatible consumer requirement. |
| `S-FA-COG-011` | SHACL 1.0 is a stable W3C Recommendation dated 2017-07-20. | [W3C SHACL Recommendation](https://www.w3.org/TR/2017/REC-shacl-20170720/) | 2026-08-21 | A | High | Reopen for errata or superseding Recommendation. |
| `S-FA-COG-012` | SHACL 1.2 Core is a W3C Working Draft dated 2026-08-03, not a Recommendation. | [W3C SHACL 1.2 Core](https://www.w3.org/TR/shacl12-core/) | 2026-08-21 | A | High for current status | Reverify at implementation and on maturity change. |
| `S-FA-COG-013` | RFC 8785 defines JCS as deterministic JSON primitive serialization and property sorting for repeatable hashing; it is Informational. | [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) | 2026-08-21 | A | High | Reopen for errata or repository canonicalization-version change. |
| `S-FA-COG-014` | `jsonld` 9.0.0 is BSD-3-Clause with four direct dependencies including an HTTP client; `rdf-validate-shacl` 0.6.5 is MIT with eleven direct dependencies. | [npm `jsonld` metadata](https://registry.npmjs.org/jsonld/9.0.0) and [npm `rdf-validate-shacl` metadata](https://registry.npmjs.org/rdf-validate-shacl/0.6.5) | 2026-08-21 | B | High for registry manifests | Reverify exact tarballs, transitive lock, licenses, install scripts, advisories, and bundle before adoption. |

## Coordinator handoff

Adopt `FA-COG-001`, `FA-COG-003`, `FA-COG-005`, and `FA-COG-006` as written. Treat `FA-COG-002` as a benchmark-gated spike rather than committed scope. Treat `FA-COG-004` as a seam plus optional research protocol, with llama.cpp first only if the operator separately authorizes an exact executable and model artifact. Add no dependencies for the first planner, manifest, or ontology implementation.

The decisive design invariant is unchanged: typed Reality is the only world authority; cognition proposes; the normal command path validates and persists; experiments measure; Observatory projects. None of planner search, model text, experiment metadata, JSON-LD, RDF, PROV-O, or SHACL may reverse that dependency.
