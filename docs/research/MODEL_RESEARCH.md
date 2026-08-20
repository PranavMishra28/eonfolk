# Model research: zero-cost ecology, browser inference, providers, and evaluation

**Purpose:** Evaluate every requested model route against zero-inference liveness, device, cost, privacy, provenance and solo-operation constraints.

**Status:** RESEARCH COMPLETE FOR SYNTHESIS

**Authority boundary:** This file owns evidence inputs for model ecology, costs, licenses and failures. [Cognition](../engineering/COGNITION.md), [cost](../engineering/COST_MODEL.md) and [evals](../quality/EVALS.md) own decisions.

**Related documents:** [systems research](SYSTEMS_RESEARCH.md), [source ledger](SOURCE_LEDGER.md), [architecture](../engineering/ARCHITECTURE.md).

**Owned evidence question:** Which model ecology, if any, can enrich EONFOLK without becoming a key, cost, availability, determinism, privacy, or solo-builder dependency—and which explicit A–H options should be accepted, deferred, or rejected?

**Access date for external sources:** 2026-08-20

The coordinator verified and consolidated the report's `S-MODEL-*` rows in [SOURCE_LEDGER.md](SOURCE_LEDGER.md).

## Evidence language

- **VERIFIED FACT:** supported by an opened primary source in the source-ledger appendix.
- **INFERENCE:** a design conclusion drawn from verified facts and constraints.
- **PRODUCT HYPOTHESIS:** a proposition requiring a build/eval/player test.
- **UNRESOLVED:** an important uncertainty without adequate evidence.

## Recommendation

Ship the first slice with **Option A, the deterministic Standard Brain, only**. Its output contract must already support interchangeable proposal generators, but no model runtime or provider SDK belongs in the 40–60-hour slice.

After the core game proves attachment, run a bounded browser-local spike comparing **one** runtime (WebLLM first, Transformers.js only if its selected-model path is materially simpler) against the Standard Brain on the same decision fixtures. If the spike passes capability, download, thermal, frame-time, license, and fallback gates, expose it as an optional enhancement after onboarding. Later still, optionally offer user-authorized OpenRouter through PKCE. Hosted free tiers may support development/canary evaluation, never canonical liveness or a promise of sustainable public infrastructure.

No route may let a model write Reality. Every route returns one typed proposal, is validated by the same engine, and immediately falls back to the Standard Brain on absence, timeout, 429, malformed output, revoked credentials, unsupported WebGPU, missing model, or exhausted budget.

## Constraint fit

| Constraint | Model consequence |
|---|---|
| Solo builder / 40–60 hours | No model integration in the first slice; one stable adapter contract only |
| M4 Pro / no GPU infrastructure | Local development benchmarks are possible; public self-hosting is not assumed |
| Approximately $0 owner spend | Zero hosted calls is a supported normal path |
| No training/fine-tuning | Prompt/schema/rule/eval iteration only; no synthetic-data or fine-tune pipeline |
| Free, useful V1 | Model absence cannot remove agency, persistence, catch-up, or Chronicle facts |
| No required keys | Normal onboarding never asks for any provider account, login, key, or model download |
| Deterministic replay | Accepted action/event is recorded; replay never recalls a model |

## 1. Explicit model-ecology options A–H

These option letters are defined here for stable use in later planning.

| Option | Route | Key/account on normal onboarding? | Owner cost posture | V1 decision |
|---|---|---:|---|---|
| **A** | Deterministic Standard Brain: typed beliefs, utility/strategy templates, Standing Plans | No | $0 inference | **REQUIRED; ship first** |
| **B** | Browser-local generation through WebLLM/WebGPU | No key; large optional model download and supported device | User device/network | **DEFER to post-slice spike** |
| **C** | Browser-local generation through Transformers.js (WebGPU/WASM/model-specific path) | No key; optional model download | User device/network | **ALTERNATIVE to B, not both** |
| **D** | User-authorized OpenRouter through OAuth PKCE | Optional OpenRouter login/authorization after onboarding | User credits/free quota | **DEFER; opt-in enrichment only** |
| **E** | Owner-hosted OpenRouter adapter | No end-user key, but owner credential/server required | Metered owner spend | **DEVELOPMENT/CANARY only until paid gate** |
| **F** | Direct hosted adapters: Gemini, Groq, or Hugging Face Inference Providers | Owner account/key required | Volatile free dev quotas or metered | **EVAL only; never free-infra promise** |
| **G** | Cloudflare Workers AI behind the future Worker/RegionDO | No end-user key, but Cloudflare account/binding required | Daily free allocation then metered | **DEFER until hosted-region gate** |
| **H** | Self-hosted open weights (local M4 Pro evaluation or owner GPU service) | No provider key, but artifacts/ops required | Local device or GPU infrastructure | **LOCAL RESEARCH optional; public route rejected** |

### 1.1 Option A — Standard Brain

**INFERENCE:** A is the only option that fully satisfies every binding constraint. It selects a legal strategy template from typed Mind/Reality context, instantiates or revises a Standing Plan, and emits one bounded proposal. Seeded tie-breaking and recorded accepted actions preserve replay.

**PRODUCT HYPOTHESIS:** A can produce enough apparent intention and social continuity to make eight citizens worth caring about. The correct falsification is a player/behavior comparison, not adding a model preemptively.

### 1.2 Option B — WebLLM

**VERIFIED FACT:** WebLLM runs LLM inference in the browser, requires a WebGPU-compatible browser, supports Web Workers, and exposes an OpenAI-like API [S-MODEL-01][S-MODEL-02]. Its repository is Apache-2.0 [S-MODEL-03]. Its current prebuilt configuration calls itself the source of truth for compatible prebuilt libraries and declares device memory requirements per model [S-MODEL-04].

One current example is Llama 3.2 1B Instruct q4f16 with 4,096 context and a declared 879.04 MB VRAM requirement [S-MODEL-04]. That number is runtime VRAM metadata, not download size, total browser memory, first-token latency, quality, or a guarantee that 3D rendering remains smooth.

**INFERENCE:** B is the most direct browser chat-generation spike, but only after the core slice. Run it in a dedicated worker; load after explicit opt-in; keep the world renderer usable before, during, and after download; cap context/output; cancel on navigation; release resources when disabled.

### 1.3 Option C — Transformers.js

**VERIFIED FACT:** Transformers.js runs pretrained models directly in the browser and documents WebGPU acceleration via `device: "webgpu"`; the repository is Apache-2.0 [S-MODEL-05][S-MODEL-06].

**INFERENCE:** C may be preferable for smaller classification, embedding, or summarization helpers and for a model already supported in its ONNX ecosystem. It is not automatically a better free-form proposal generator. Do not install B and C together "for flexibility"; select one only after a model/runtime spike measures artifact size, load time, first/subsequent token latency, memory, heat, frame-time interference, structured-output rate, and fallback.

### 1.4 Option D — user-authorized OpenRouter

**VERIFIED FACT:** OpenRouter documents a PKCE OAuth flow using an S256 challenge and an exchange for a user-controlled key [S-MODEL-07]. Its FAQ says free models are limited to 50 requests/day without a qualifying credit purchase, or 1,000/day after at least $10 of purchased credits, and are usually unsuitable for production [S-MODEL-08].

**INFERENCE:** D is the best later hosted route for optional user-funded enrichment because it avoids an owner-wide key and makes spend a user choice. It still adds account friction, token custody, XSS exposure, provider/model variability, and moderation/privacy work. PKCE is not permission to make it onboarding.

Use short-lived/in-memory storage where practical, least credit/limit scope, explicit disconnect/delete controls, and no token in event logs, URLs, analytics, replay exports, prompts, or screenshots.

### 1.5 Option E — owner-hosted OpenRouter

**INFERENCE:** E is useful for one adapter and model comparison because OpenRouter normalizes access to many providers. It is not a $0 public architecture. Free routing can change model and behavior; a paid owner key creates denial-of-wallet and moderation obligations. Keep it behind a server secret, daily call/token caps, and a global disable switch. Do not place an owner key in browser code.

### 1.6 Option F — direct Gemini, Groq, or Hugging Face

**VERIFIED FACT:** Gemini has a Free Tier for certain models, while its pricing page states Free Tier content may be used to improve products; actual active rate limits are viewed in AI Studio and vary by project/model/tier [S-MODEL-09][S-MODEL-10].

**VERIFIED FACT:** Groq publishes a high-level Free-plan limit table but says exact current organization limits are in the account limits page; 429 responses include rate-limit information [S-MODEL-11].

**VERIFIED FACT:** Hugging Face Inference Providers currently gives Free users $0.10 monthly routed credits, explicitly subject to change; further usage requires credits/purchase [S-MODEL-12].

**INFERENCE:** F is a development and evaluation pool, not a production failover mesh. Supporting three direct adapters multiplies schemas, credentials, privacy policies, model-deprecation handling, and tests. Choose at most one direct provider only if it beats D/E/G on a measured product need.

### 1.7 Option G — Workers AI

**VERIFIED FACT:** Workers AI currently includes 10,000 neurons/day at no charge, resets daily, fails further operations on Free after the allocation, and charges $0.011 per 1,000 neurons above the allocation on Workers Paid [S-MODEL-13].

**INFERENCE:** G co-locates inference with a later Cloudflare application and keeps the owner secret out of the client. It still requires hosted infrastructure, owner billing posture, model availability checks, and neuron measurement. It must use an application cap below the platform ceiling and fall back before a player notices provider failure.

### 1.8 Option H — self-hosted open weights

**VERIFIED FACT:** Qwen3's official repository documents open-weight sizes including 0.6B and 1.7B, support for local runtimes such as llama.cpp/MLX, and Apache-2.0 licensing [S-MODEL-14].

**INFERENCE:** H is credible for local M4 Pro evaluation and reproducible offline fixtures. It is not credible public V1 infrastructure because the project owns no GPU service and has no authorization for one. Running a local developer server also does not help visitors when the owner's laptop is closed.

## 2. Browser-local feasibility

### 2.1 Hard capability boundary

**VERIFIED FACT:** MDN still marks WebGPU as limited availability, secure-context-only, and unavailable in some widely used browsers [S-MODEL-15].

Therefore:

- feature-detect `navigator.gpu`, adapter, required features, storage, and memory-relevant limits;
- never hide normal play behind detection or download;
- offer "enhanced local brain" only after the user has seen the world work;
- provide download size, storage impact, deletion, progress, cancellation, and fallback before consent;
- run inference off the UI thread;
- test while the selected renderer is active, not on a blank benchmark page.

### 2.2 Required benchmark matrix

**UNRESOLVED:** no opened source establishes EONFOLK-specific performance on the M4 Pro or representative player devices. A later spike must record:

| Dimension | Devices/browsers | Pass criterion to set before spike |
|---|---|---|
| Capability | M4 Pro current Chrome/Safari; one integrated-GPU laptop; one supported mobile | Unsupported devices enter Standard Brain without broken UI |
| Artifact | cold/warm cache, interrupted download, eviction | Size is disclosed; resume/delete work; core world loads first |
| Latency | first load, first token, complete bounded proposal | Optional result arrives inside the defined decision UX budget |
| Memory/thermal | idle, generation, repeated decisions | No crash, runaway heat, or persistent resource leak |
| Rendering interference | representative 3D/2D scene at target quality | p95 frame-time remains within product budget or inference pauses/degrades visuals explicitly |
| Correctness | fixed decision fixture suite | Meets the adapter release bar below |
| Privacy | offline after artifact cached | No request leaves the device during local generation |

If the product selects a WebGL/WebGPU-heavy 3D direction, GPU contention is a first-order objection. A browser-local model may remain a desktop-only laboratory feature even if it runs on the M4 Pro.

### 2.3 Weight families and licenses

The runtime library license and the model-weight license are separate approvals.

| Family | Verified license posture | Candidate role | Recommendation |
|---|---|---|---|
| Qwen3 0.6B/1.7B | Official repo says Apache-2.0 [S-MODEL-14] | Small local proposal/presentation experiment if a selected browser runtime has a verified artifact | Best license posture; runtime/quality still unproven |
| Llama 3.2 1B | Custom Llama 3.2 Community License with attribution/use/redistribution terms [S-MODEL-16] | Current WebLLM prebuilt low-resource candidate | Use only after legal/provenance checklist; not "MIT because WebLLM is Apache" |
| Gemma | Custom terms require notices and downstream restrictions for distribution [S-MODEL-17] | Small/open-weight comparison if materially superior | Default reject for V1 to reduce obligations |

**UNRESOLVED:** Qwen3's official weights being Apache-2.0 does not prove a supported, audited, correctly quantized browser artifact exists in the selected runtime. Execution must pin the exact model repository revision, quantization artifact, compiler/runtime revision, hashes, license files, and redistribution chain.

## 3. One Brain interface, bounded context, bounded proposal

### 3.1 Adapter contract

**INFERENCE:** all A–H implementations satisfy one interface conceptually equivalent to:

`propose(context, budget, signal) -> IntentProposal | NoProposal`

The context contains:

- decision reason and simulation time;
- citizen identity traits, current goal, commitments, and Standing Plan status;
- a bounded set of beliefs/memories with provenance;
- visible local Reality only;
- a closed action catalog with IDs, argument schemas, and short semantics;
- token/time/output budget and proposal schema version.

The response contains exactly one action kind and typed arguments. Free-form rationale is optional, length-bounded, untrusted, and noncanonical.

### 3.2 Context policy

- Never send secrets, private sponsor data, raw logs, hidden citizen knowledge, or unrelated world state.
- Retrieve deterministically before invoking a model; do not let a provider decide which private memories it may read.
- Summaries are typed records with cited event IDs; model prose cannot overwrite beliefs or memories.
- Use explicit unknown/absent values so the model is not invited to invent them.
- Do not expose tools, URLs, SQL, shell, generic file/network access, or recursive planning.
- One request cannot propose a batch of world mutations.

### 3.3 Acceptance pipeline

1. Parse only the declared structured object.
2. Enforce byte, token, depth, string, array, enum, and numeric limits.
3. Reject unknown fields and IDs not present in context.
4. Validate knowledge, location, life state, resource, law, ownership, permission, and expected revision.
5. If schema-only repair is enabled, allow at most one bounded repair request inside the same adapter budget.
6. Otherwise or after failure, invoke Option A immediately.
7. Append only the validated accepted action/event. Store raw provider traces only in an opt-in, noncanonical developer artifact with redaction/retention rules.

The engine never trusts a provider's statement that an action is valid.

## 4. Failure semantics

| Failure | Canonical behavior | User-facing behavior |
|---|---|---|
| Owner closes browser | Local world stops consuming compute; next open catches up using deterministic events | Factual absence summary after catch-up |
| Browser lacks WebGPU | Skip B/C | Standard Brain; no error gate |
| User declines model download/login | Skip B/C/D | Full game through Standard Brain |
| Provider/model disappears | Disable route/version; do not substitute silently inside a replay | Standard Brain; optional reconnect notice |
| 429/quota exhausted | Respect retry metadata for future optional work; no blocking retry loop | Immediate Standard Brain for this decision |
| Timeout/network failure | Abort at strict deadline | Immediate Standard Brain |
| Malformed/unauthorized proposal | Reject; optional one schema repair, then A | World continues; developer metric increments |
| Context exceeds budget | Deterministically trim by declared retrieval ranking; if still too large, A | No data-loss claim or spinner loop |
| Token/OAuth revoked | Delete local session material and disable D | Standard Brain plus reconnect control |
| User never returns | Local world has no compute; catch-up on return. A later hosted world advances with A | No model dependency |
| Raw output contains injection/HTML/code | Treat as text or discard; never execute/render raw | Safe fallback/presentation |

## 5. Cost and quota model

### 5.1 Do not convert free tiers into unit economics

**INFERENCE:** classify every route separately:

- **Free development tier:** suitable for manual tests and small CI canaries; can disappear or hard-fail.
- **Free small public test:** requires explicit terms, account-specific limits, abuse margin, and a stable fallback. None of the opened hosted free routes is accepted as this by default.
- **Sustainable public infrastructure:** modeled at published paid rates with free allocation set to zero and a contingency margin.

### 5.2 Formula

For token-priced providers:

`monthlyInference = calls * ((inputTokens * inputPricePerM + outputTokens * outputPricePerM) / 1,000,000) + routingFees`

For Workers AI, record actual neurons per request and apply the official neuron rate. Also include outer Worker/DO/storage costs in the systems cost model.

Required measurements by adapter/model/version:

- eligible decision boundaries and percentage actually sent;
- calls per simulated day and human session;
- p50/p95/worst input/output tokens or neurons;
- timeout, 429, malformed, rejected, repaired, and fallback rates;
- cache hit rate only where semantics permit reuse;
- daily/monthly hard application cap.

### 5.3 Envelope allocation

| Envelope | Inference policy |
|---|---|
| ~$0 | Option A always; B/C optionally consume user device after consent; hosted free routes only for developer evaluation |
| $50/month comparison | Reserve no more than a declared minority (illustratively $10–$20) for bounded canaries; retain infrastructure/contingency; hard stop before overage |
| $300/month comparison | Separate inference, infrastructure, observability/moderation, and contingency caps; still call only at rare decision boundaries |

These are **INFERENCE** planning allocations, not approved spend or traffic promises. Exact allocations require measured calls/tokens/neurons and product evidence.

## 6. Evaluation and release gates

### 6.1 Fixed corpus

Build at least 100 decision contexts spanning routine planning, blocked plans, incomplete/false beliefs, private information, betrayal, relationship conflict, job loss, resource scarcity, offers, law, politics, and provider-injection text. Store expected legal action sets and invariant outcomes; do not require a single "correct" personality choice where several are valid.

### 6.2 Adapter release bar

An optional model adapter/model/version may enter an experiment only if:

- 100% of requests end as a valid accepted proposal or deterministic fallback;
- 0 unauthorized actions, hidden-fact uses, invalid/dead actors, nonexistent IDs, or partial mutations;
- at least 95% first-pass schema validity on the fixed corpus, with the exact threshold revisable only from error evidence;
- 100% of malformed, timeout, 429, and revoked-credential fixtures preserve world progress;
- repeated persona/goal continuity tests meet a documented behavioral rubric;
- strategic diversity improves over A without increasing invariant violations;
- all provider/model/runtime/license/weight versions and hashes are recorded;
- cost, latency, download, memory, thermal, and renderer-interference budgets pass on the target matrix.

The 95% target is a proposed engineering gate, not a verified external standard.

### 6.3 Evaluation method

- Deterministic contract assertions own safety and executability.
- Scenario rubrics own continuity, groundedness, goal fit, and diversity.
- Pairwise human/player review owns believability/attachment.
- An LLM judge may be a supplemental diagnostic, never the sole release gate.
- Record per-adapter/model results; do not pool failures behind an aggregate router score.
- Prompt injection tests place hostile text in memories, names, sponsor messages, and provider responses.
- Promptfoo is optional once a real model path exists; ordinary fixtures/tests are enough before then.

## 7. Ordered workflow

### Gate M0 — freeze no-model interface

Deliverable: `DecisionContext`, `IntentProposal`, validation errors, budget, cancellation, and Standard Brain behavior. Pass only when Option A runs every fixture with no provider package installed.

### Gate M1 — establish product need

Deliverable: player/behavior evidence that A's deficit is specifically proposal/presentation quality and not missing mechanics, memory, stakes, UI, or content. Stop model work if the cause is elsewhere.

### Gate M2 — license and artifact shortlist

Deliverable: exact runtime release, model repository commit, quantization artifact/hash, weight/runtime licenses, notices, artifact size, and redistribution checklist for one candidate. Reject any ambiguous artifact chain.

### Gate M3 — browser-local spike

Deliverable: B **or** C in an isolated prototype against the benchmark matrix and fixed corpus. Pass only if optional loading cannot degrade normal play and the release bar is met.

### Gate M4 — opt-in experience

Deliverable: post-onboarding consent, capability detection, download/cancel/delete, resource release, fallback, and privacy copy. Pass on real browser/device tests.

### Gate M5 — user-authorized hosted experiment

Deliverable: D with PKCE S256, token lifecycle, scoped budget, disconnect, threat model, provider terms/privacy review, and no owner credential. Pass only after explicit user action and deterministic fallback drills.

### Gate M6 — owner-paid route

Deliverable: measured E/F/G comparison, sustainable paid-rate model, abuse caps, observability, data handling, model-deprecation playbook, and explicit spend/deploy approval. Free quota is excluded from the sustainable column.

## 8. Strongest objections

1. **A may be too repetitive.** This is the central product risk. A model cannot repair missing stakes, mechanics, or memory; first isolate the cause.
2. **Small local models may be bad at grounded social planning.** Parameter count and vendor benchmarks do not establish EONFOLK quality. The fixed corpus and player comparison must decide.
3. **Browser inference competes with the world renderer.** WebGPU support alone says nothing about simultaneous graphics, heat, or frame time.
4. **Optional downloads are still onboarding/product debt.** A near-gigabyte runtime memory declaration and unknown artifact size can be unacceptable even at $0 owner cost.
5. **User OAuth shifts rather than removes friction and risk.** Accounts, token custody, user credit, provider terms, and model variability remain.
6. **A failover mesh can silently change characters.** Automatic model substitution harms continuity. Pin model/version within an experiment and fall back to A, not a random model.
7. **Free hosted quotas invite false economics.** OpenRouter explicitly says its free routes are not usually production-suitable [S-MODEL-08]; HF free credits are $0.10/month [S-MODEL-12].
8. **Custom model licenses can contaminate distribution assumptions.** Runtime Apache/MIT status does not grant weight redistribution rights.

## 9. Rejected options

| Option | Decision | Reason |
|---|---|---|
| Model required during onboarding | Reject | Violates free/no-key/reliability constraints |
| Continuous per-citizen calls | Reject | Cost, latency, quota, determinism, and scale failure |
| Model-generated direct state patches | Reject | Excessive agency and replay/security failure |
| Multiple browser runtimes in V1 | Reject | Bundle/test/worker/artifact complexity |
| Random free-model router for canonical personality | Reject | Version/quality/continuity instability |
| Provider free tiers as public infrastructure | Reject | Volatile/account-specific/hard-fail limits |
| Owner key in client | Reject | Credential extraction and denial-of-wallet |
| Self-hosted public GPU in V1 | Reject | No infrastructure, budget, or operations capacity |
| Fine-tuning/training | Reject | Explicitly out of scope |
| Vector memory before typed recall evidence | Reject | Complexity without measured benefit |

## 10. Unproven assumptions and reopen evidence

| Assumption | Status | Reopen evidence |
|---|---|---|
| Standard Brain is sufficient for V1 attachment | **PRODUCT HYPOTHESIS** | Target-player sessions show grounded but emotionally flat/repetitive citizens after mechanics/memory pass |
| A sub-2B local model can improve proposals | **UNRESOLVED** | Fixed-corpus comparison and human preference test |
| M4 Pro can run model plus chosen renderer comfortably | **UNRESOLVED** | Measured frame time, thermal, memory, and latency on representative scene |
| Browser artifact/download is acceptable | **UNRESOLVED** | Exact artifact bytes, cache/eviction behavior, opt-in conversion/drop-off |
| OpenRouter PKCE token lifecycle is acceptable for this threat model | **UNRESOLVED** | Security review and prototype token-storage/XSS analysis |
| Provider data terms fit fictional-world prompts | **UNRESOLVED** | Execution-day terms/privacy review and exact prompt inventory |
| $50/$300 inference allocation has product value | **UNRESOLVED** | Measured cost per accepted improvement and attachment evidence |

## 11. Implementation implications for authority documents

- `engineering/COGNITION.md`: Option A mandatory; stable adapter contract; rare decision boundaries; accepted-proposal recording; A–H lifecycle.
- `engineering/SECURITY.md`: tokens/secrets, prompt minimization, output validation, provider privacy, quotas, injection fixtures, no raw HTML/code/tools.
- `engineering/COST_MODEL.md`: tokens/neurons/calls and error/fallback rates by exact model/version; sustainable column excludes free tiers.
- `quality/EVALS.md`: fixed contexts, hard safety assertions, behavioral rubrics, pairwise player review, model-version release bar.
- `quality/PERFORMANCE.md`: browser model download/load/latency/memory/thermal and renderer-interference budgets.
- `product/PRODUCT.md`: no model/key/account/download in normal onboarding; local brain is optional enhancement only.

## 12. Plan-mode-safe and execution-day verification

Planning may safely compare schemas, source terms, published quotas, model cards, artifact metadata, failure tables, and parameterized costs without installing runtimes, downloading weights, creating accounts, entering credentials, invoking paid APIs, or deploying.

Before any later execution:

1. Pin package-manager lockfile and exact runtime version/license.
2. Pin model repository commit, exact quantization file, download URL, SHA-256, declared size, compiler/runtime compatibility, model card, license, acceptable-use terms, notices, and redistribution obligations.
3. Re-open all provider pricing/rate-limit/privacy/data-use/deprecation pages that day.
4. Inspect the actual account/project dashboard; public limit tables are not the account's guarantee.
5. Send a minimal canary and record response headers/usage counters only after credential and spend approval.
6. Configure application caps below provider/platform ceilings and test 429, timeout, revoke, model-not-found, malformed, and budget-exhausted paths.
7. Re-run the complete fixed corpus and device benchmark after any runtime, browser, model, quantization, prompt, or schema change.
8. Generate a license/provenance artifact for shipped runtime and weights; do not infer model license from the JavaScript library.

## Source-ledger appendix — proposed rows

| Provisional ID | Claim supported | Primary source | Accessed | Type | Confidence | Reopen note |
|---|---|---|---|---|---|---|
| S-MODEL-01 | WebLLM requires a WebGPU-compatible browser | [WebLLM getting started](https://webllm.mlc.ai/docs/user/get_started.html) | 2026-08-20 | B | High | Reopen per release/browser matrix |
| S-MODEL-02 | WebLLM supports browser inference, Web Workers, and OpenAI-like API | [WebLLM repository](https://github.com/mlc-ai/web-llm) | 2026-08-20 | B | High | Pin exact release before use |
| S-MODEL-03 | WebLLM is Apache-2.0 | [WebLLM repository license](https://github.com/mlc-ai/web-llm) | 2026-08-20 | B | High | Runtime license only, not weights |
| S-MODEL-04 | WebLLM prebuilt config is compatibility source and declares Llama 3.2 1B q4f16 at 879.04 MB VRAM/4,096 context | [WebLLM current config](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts) | 2026-08-20 | B | High on accessed revision | Pin commit; benchmark actual artifact/device |
| S-MODEL-05 | Transformers.js runs models in-browser and supports WebGPU acceleration | [Transformers.js documentation](https://huggingface.co/docs/transformers.js/main/index) | 2026-08-20 | B | High | Verify selected task/model/runtime |
| S-MODEL-06 | Transformers.js repository is Apache-2.0 | [Transformers.js repository](https://github.com/huggingface/transformers.js/) | 2026-08-20 | B | High | Runtime license only |
| S-MODEL-07 | OpenRouter documents OAuth PKCE with S256 and user-controlled key exchange | [OpenRouter OAuth PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth) | 2026-08-20 | A | High | Reopen security/redirect/token docs before implementation |
| S-MODEL-08 | OpenRouter free models have 50 requests/day, or 1,000/day after at least $10 purchased credits, and are usually not production-suitable | [OpenRouter FAQ](https://openrouter.ai/docs/faq) | 2026-08-20 | A | High on access date | Reopen limits/fees/model availability |
| S-MODEL-09 | Gemini Free Tier exists for certain models and Free content may improve products | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) | 2026-08-20 | A | High on access date | Reopen model/region/data terms |
| S-MODEL-10 | Gemini limits vary and active project limits are shown in AI Studio | [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) | 2026-08-20 | A | High | Account dashboard is execution truth |
| S-MODEL-11 | Groq publishes high-level limits, exact org limits live in account settings, and 429/headers report exhaustion | [Groq rate limits](https://console.groq.com/docs/rate-limits) | 2026-08-20 | A | High | Reopen account/model page before use |
| S-MODEL-12 | Hugging Face Free users receive $0.10/month inference-provider credits, subject to change | [HF Inference Providers pricing](https://huggingface.co/docs/inference-providers/en/pricing) | 2026-08-20 | A | High on access date | Reopen provider/model route and billing |
| S-MODEL-13 | Workers AI provides 10,000 neurons/day free, hard-fails Free overage, and charges $0.011/1,000 neurons on Paid above allocation | [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) | 2026-08-20 | A | High on access date | Measure selected model neurons and reopen pricing |
| S-MODEL-14 | Qwen3 offers 0.6B/1.7B+ open weights, local runtime guidance, and Apache-2.0 licensing | [Qwen3 official repository](https://github.com/QwenLM/Qwen3) | 2026-08-20 | B | High | Exact artifact/quantization license still required |
| S-MODEL-15 | WebGPU is limited-availability and secure-context-only | [MDN WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) | 2026-08-20 | A/B reference | High | Reopen target-browser support |
| S-MODEL-16 | Llama 3.2 weights use a custom Community License with attribution/use/redistribution terms | [Meta Llama 3.2 license](https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE) | 2026-08-20 | B | High | Legal review exact selected artifact |
| S-MODEL-17 | Gemma terms impose notices and downstream restrictions for distribution | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) | 2026-08-20 | A | High | Exact Gemma generation/license may differ; reopen |
