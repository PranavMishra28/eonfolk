# Cost model

**Purpose:** define $0/$50/$300 planning envelopes, unit measurements, cap behavior, and approval gates.

**Status:** $0 LOCAL-FIRST DEFAULT ACCEPTED; HOSTED ENVELOPES ARE NON-AUTHORIZING COMPARISONS

**Authority boundary:** owns cost categories, formulas, envelope rules, sustainable-column policy, and cost failure behavior. It does not select current vendors or approve purchases/deployment.

**Related documents:** [architecture](ARCHITECTURE.md), [cognition](COGNITION.md), [security](SECURITY.md), [systems evidence](../research/SYSTEMS_RESEARCH.md), [model evidence](../research/MODEL_RESEARCH.md), [tool inventory](../research/PROPOSED_TOOLS.md)

## Owned decision

The first slice has a **$0 operating architecture**: local browser compute, IndexedDB, deterministic Standard Brain, authored assets, and no deployment. The $50 and $300 ceilings are comparative future experiment envelopes only. They authorize no purchase, account connection, model call, domain, CI upgrade, or deployment.

V1 remains useful and free. No cost model assumes payments, revenue, custody, licensing business, enterprise sales, proprietary data, partnerships, or regulated-data operations.

## Sustainable cost rule

Every future decision compares:

1. **developer/free experiment column:** current quota behavior, hard failures, and account conditions;
2. **sustainable production column:** published paid rates with free allocations set to zero;
3. **p50, p95, and worst-case measured usage:** not averages alone;
4. **abuse/contingency margin:** explicit and capped.

Volatile pricing and quotas live as dated evidence in the source ledger and are reopened on the execution day. This authority intentionally does not turn today's free tier into a promise.

## Unit formula

For a later hosted region:

```text
monthlyTotal = workerBase
             + workerRequests
             + workerCpu
             + regionRequests
             + regionDuration
             + rowsAndStorage
             + egressAndAssets
             + inference
             + observabilityAndModeration
             + backupAndRecovery
             + contingency
```

For token-priced inference:

```text
inference = calls * ((inputTokens * inputRatePerM
                    + outputTokens * outputRatePerM) / 1_000_000)
          + routingFees
```

Neuron/compute-unit providers use their measured unit instead. Record eligible boundaries, actual calls/session/simulated day, tokens or compute units, accepted/repaired/rejected/fallback rates, CPU/duration, event writes, rows read, messages, snapshot bytes, and artifact retention.

## Planning envelopes

| Ceiling | Permitted planning assumption | Excluded claim |
|---|---|---|
| **~$0 default** | Complete local game, exports, Standard Brain; optional developer-only existing tools under their present authorization | Public uptime, hosted inference, backups, abuse resistance, or unlimited CI |
| **$50 comparison** | A tightly capped small hosted/cognition canary with platform base, observability, and contingency separated | Sustainable 1,000-user world, continuous calls, or spending approval |
| **$300 comparison** | A measured small public experiment with separate infra, inference, moderation/observability, and contingency caps | Mass concurrency, profit, SLA, or permission to deploy |

If measured worst-case usage cannot fit the approved envelope with margin, optional work fails closed: disable model calls, reject costly writes, reduce fanout, and preserve read/export/replay. Never silently exceed the cap.

## First-slice cost ledger

The ExecPlan tracks actual incremental cash spend as **$0 unless the owner explicitly approves an item first**. It also records noncash solo-builder cost:

- engineering hours by milestone;
- dependency/tool setup and review hours;
- generated-asset cleanup and provenance hours;
- CI runtime/artifact storage;
- model download/eval time if a later gate opens;
- operational burden and credential surface.

The [ExecPlan bottom-up work breakdown](../exec-plans/active/001-foundation.md#bottom-up-work-breakdown) maps every blocking criterion to an owner/evidence task and totals 40/52/65 low/expected/high productive hours after the six-person Gate 0 correction. Focused hours sum coordinator, children, operator setup/facilitation/analysis, and independent review even when parallel; elapsed participant/scheduling wait is separate. Eight hours from expected to the hard 60 ceiling remain fix/review contingency only. A timed four-hour M0 and milestone re-estimates decide whether the expected case remains credible; a high trajectory triggers declared presentation cuts or product reopen, never a shallower gate or spend.

## Approval and stop controls

Before any future hosted spend:

- reopen current official price, quota, retention, and account pages;
- inspect the actual account plan/limits;
- model p50/p95/worst-case without free quota in the production column;
- name every resource and credential;
- configure platform alerts/limits where available plus application daily request/write/inference caps;
- provide a global kill switch and a read/export/replay degradation path;
- obtain explicit approval for the exact ceiling and action.

No agent may interpret an envelope as authority to purchase or deploy.

## Resulting implementation behavior

- Normal onboarding performs no credential, account, WebGPU, download, or payment check.
- Provider absence or exhaustion immediately uses Standard Brain.
- Local world progress and Chronicle facts incur no hosted compute.
- A later public experiment can enter read-only/fallback mode before a cost overrun.
- PR and nightly test suites are split so high-value checks run without wasteful routine artifacts.

## Rejected alternatives

| Alternative | Reason rejected |
|---|---|
| Subtract free tiers from sustainable unit economics | Quotas are volatile, conditional, and may hard-fail |
| Continuous inference as a fixed product cost | Conflicts with free V1, liveness, determinism, and abuse limits |
| Revenue-funded V1 assumptions | Explicitly out of scope and would distort product proof |
| Spend to compensate for missed scope | Hides a product/architecture failure and lacks authorization |
| One average monthly number | Conceals p95/worst-case and denial-of-wallet exposure |
| Install optional paid tools preemptively | Adds cost, credentials, and review work without a proven blocker |

## Unproven assumptions and reopen evidence

- **UNRESOLVED:** a later $50 or $300 public experiment fits measured infra and abuse margin. Reopen after real event/request/storage/message data.
- **UNRESOLVED:** existing GitHub/CI allowances cover the implementation evidence plan. Reopen after actual repository capability and Actions usage probes.
- **UNRESOLVED:** optional local inference has acceptable user-device cost. Reopen after download, memory, heat, battery, and frame tests.
- **UNRESOLVED:** hosted cognition creates enough incremental attachment to justify any owner or user cost. Reopen through blinded outcome/cost comparison.

## Constraint fit

The only accepted implementation requires no new spend and no proprietary infrastructure. The comparison envelopes remain explicit future hypotheses. The cost model values the solo builder's hours and avoids revenue, employment, payment, licensing, data, or enterprise dependencies.
