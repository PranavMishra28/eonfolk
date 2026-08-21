# Diagnostics and Sentinel

**Purpose:** Define Founder Alpha failure recording, incident handling, safe observation, and diagnostics budgets.

**Status:** ACTIVE IMPLEMENTATION CONTRACT — integrated measurements and hostile review pending

**Authority boundary:** This file owns diagnostic event, mode, redaction, incident, observer, replay-capture, and overhead behavior. It owns no canonical world fact or product truth.

**Related documents:** [architecture](ARCHITECTURE.md), [security](SECURITY.md), [performance](../quality/PERFORMANCE.md), [testing](../quality/TESTING.md), [research](../research/FOUNDER_ALPHA_DIAGNOSTICS_RESEARCH.md), and [Founder Alpha plan](../exec-plans/active/002-founder-alpha.md).

## Owned decision

Use a dependency-light first-party Flight Recorder and Sentinel. Diagnostics are subordinate observers of Reality. They may freeze a bounded incident and request one typed recovery order, but cannot create, rewrite, delete, or reinterpret canonical events. rrweb, browser OpenTelemetry, and MCP are rejected for Founder Alpha; a disabled `ReplayCapturePort` preserves the future seam.

## Closed event and redaction contract

Each record has schema version, closed kind, severity, component, session sequence, caller-supplied monotonic time, optional simulation revision/time, outcome code, bounded correlation IDs, and a kind-appropriate allowlisted payload. Arbitrary metadata bags, error objects, URLs, bodies, headers, DOM, private state, prompts, provider streams, hidden reasoning, hash preimages, paths, credentials, and user prose are forbidden.

The caller selects a typed constructor; only allowlisted primitives are copied and length-bounded; routes lose query/fragment; stack input becomes at most three approved module/function tokens; schema validation happens before the record reaches a ring, freeze, observer, preview, disk, or relay. Regex cleanup is defense in depth, never the primary boundary.

## Modes and hard budgets

These are ceilings to tighten with integrated measurement:

| Mode | Live memory | Persistence | Network | Performance |
|---|---:|---|---|---|
| OFF/core | 128 records and 128 KiB serialized | none except one explicitly frozen Sentinel incident ≤256 KiB | none | ≤1% p95 frame regression; ≤0.5 ms p95 record call |
| LOCAL | 2,048 records and 2 MiB | rolling ≤8 MiB or 24 hours; all frozen incidents ≤16 MiB total | none | ≤3% p95 frame regression; ≤1 ms p95 record call |
| ALPHA | 512 records and 512 KiB live | local feedback queue ≤4 MiB and seven-day expiry | only an explicitly previewed/consented bundle ≤1 MiB; screenshot separately bounded | ≤3% p95 frame regression; serialization/upload outside animation-critical slices |

OFF registers no optional replay, frame, long-task, or network capture. It retains only error/critical and Sentinel evidence. LOCAL is explicit developer operation. ALPHA starts only after per-bundle tester consent and is idempotent. Every mode records a capability bitmap so unsupported signals cannot be confused with zero incidents.

## Sentinel order

On an invariant failure Sentinel must: stop the affected command or projection; prevent partial/unauthorized publish; freeze the bounded preceding window; compute the stable fingerprint/reproduction ID from public error category, route/build/schema, normalized tokens, and invariant ID; persist or expose the safe incident outside Reality; attempt at most one typed recovery; and present calm failure copy. Feedback text, identity, time, IP, raw URL, attachment bytes, and private Reality data never influence a fingerprint.

## Observer and performance projection

The observer is local and read-only. It exposes only health, incident headers, typed trace, bounded session/performance/network summaries, reproduction steps, approved artifact inventory, and run/region/revision/sequence/simulation-time/status world head. It has no arbitrary file, shell, browser-control, network, environment, raw Reality, cognitive record, or mutation surface.

Performance capture uses feature-detected native marks/measures, frame histograms, supported-entry capability, and bounded long-task/event summaries. Absence is explicit. Raw observer objects are frozen/copy-safe so consumers cannot mutate recorder state.

## Verification and reopen evidence

Tests inject command, Worker, persistence, cognition, Chronicle, route, and UI failures; assert no partial canonical mutation; search every projection for canaries; exercise ring overflow/truncation; prove identical fingerprints across time-varying inputs; and profile the same deterministic journey in OFF/LOCAL/ALPHA. A concrete defect that cannot be reproduced from structured evidence plus an explicit screenshot may reopen a one-hour rrweb spike under the research contract. Any leak, authority dependency, unbounded growth, or budget miss removes optional capture before a budget waiver.

## Rejected alternatives and uncertainty

Rejected: continuous session replay, unsafe canvas replay, provider/browser telemetry, arbitrary observer access, remote observer, hidden-reasoning capture, and diagnostic canonical events. Still unproven: final integrated overhead, Safari/Firefox token normalization, and whether structured traces reproduce every canvas-only defect.

## Resulting implementation behavior and constraint fit

The package remains deterministic where it intersects canonical sequencing, accepts clocks/capabilities through ports, performs no external request, and degrades to normal gameplay when absent. The design needs no service, paid product, model, or large dependency graph and remains maintainable by one builder.
