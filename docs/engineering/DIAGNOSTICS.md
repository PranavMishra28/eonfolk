# Diagnostics and Sentinel

**Purpose:** Define Founder Alpha failure recording, incident handling, safe observation, and diagnostics budgets.

**Status:** IMPLEMENTED LOCALLY — hostile privacy repairs and source budgets pass; final clean-candidate browser profile pending

**Authority boundary:** This file owns diagnostic event, mode, redaction, incident, observer, replay-capture, and overhead behavior. It owns no canonical world fact or product truth.

**Related documents:** [architecture](ARCHITECTURE.md), [security](SECURITY.md), [performance](../quality/PERFORMANCE.md), [testing](../quality/TESTING.md), [research](../research/FOUNDER_ALPHA_DIAGNOSTICS_RESEARCH.md), and [completed Founder Alpha plan](../exec-plans/completed/002-founder-alpha.md).

## Owned decision

Use a dependency-light first-party Flight Recorder and Sentinel. Diagnostics are subordinate observers of Reality. They may freeze a bounded incident and request one typed recovery order, but cannot create, rewrite, delete, or reinterpret canonical events. rrweb, browser OpenTelemetry, and MCP are rejected for Founder Alpha; a disabled `ReplayCapturePort` preserves the future seam.

## Closed event and redaction contract

Each record has schema version, closed kind, severity, component, session sequence, caller-supplied monotonic time, optional simulation revision/time, outcome code, bounded correlation IDs, and a kind-appropriate allowlisted payload. Arbitrary metadata bags, error objects, URLs, bodies, headers, DOM, private state, prompts, provider streams, hidden reasoning, hash preimages, paths, credentials, and user prose are forbidden.

Every snapshot and observer projection carries one bounded identity block: diagnostic session ID, exact build SHA or explicit `unknown`, package app version, protocol version, experiment ID, run ID, coarse runtime class, coarse viewport class, and current diagnostics mode. Build resolution accepts a valid explicit build environment value or the current Git commit and otherwise fails closed to `unknown`; it never substitutes a timestamp or mutable branch name. Runtime/viewport fields are coarse allowlisted classes, not browser fingerprinting. Incident fingerprints bind build SHA, protocol version, and diagnostics schema so unrelated builds cannot collapse into one incident.

The caller selects a typed constructor; only allowlisted primitives are copied and length-bounded; routes lose query/fragment; stack input becomes at most three approved module/function tokens; schema validation happens before the record reaches a ring, freeze, observer, preview, disk, or relay. Incident summaries are closed outcome/invariant codes, never arbitrary exception text. Regex cleanup is defense in depth, never the primary boundary.

World Presence adds the closed `presentation` category. It records only bounded source linkage and aggregate spatial state: projection/scene versions, presentation clock tick, source sequence, displayed action, action kind, actor/interaction counts, integer distance, and a closed mismatch code. It may report blocked-volume intersection, invalid or future event linkage, missing interaction participants, action/animation disagreement, or over-speed/teleport evidence. It cannot record coordinates, raw Reality objects, citizen prose, camera/pointer data, frame-dependent world decisions, or mutate/repair canonical state. A mismatch freezes evidence and leaves Reality untouched.

## Modes and hard budgets

These are ceilings to tighten with integrated measurement:

| Mode | Live memory | Persistence | Network | Performance |
|---|---:|---|---|---|
| OFF/core | 128 records and 128 KiB serialized | none except one explicitly frozen Sentinel incident ≤256 KiB | none | ≤1% p95 frame regression; ≤0.5 ms p95 record call |
| LOCAL | 2,048 records and 2 MiB | rolling ≤8 MiB or 24 hours; all frozen incidents ≤16 MiB total | none | ≤3% p95 frame regression; ≤1 ms p95 record call |
| ALPHA | 512 records and 512 KiB live | local feedback queue ≤4 MiB and seven-day expiry | only an explicitly previewed/consented bundle ≤1 MiB; screenshot separately bounded | ≤3% p95 frame regression; serialization/upload outside animation-critical slices |

OFF registers no optional replay, frame, long-task, or network capture. It retains only error/critical and Sentinel evidence. LOCAL is explicit developer operation. ALPHA starts only after per-bundle tester consent and is idempotent. Every mode records a capability bitmap so unsupported signals cannot be confused with zero incidents.

## Sentinel order

On an invariant failure Sentinel must: stop the affected command or projection; prevent partial/unauthorized publish; freeze the bounded preceding window; compute the stable fingerprint/reproduction ID from public error category, route/build/schema, normalized tokens, and invariant ID; persist or expose the safe incident outside Reality; attempt at most one typed recovery; and present calm failure copy. The OFF-mode crash surface shows only the sanitized stop reason and exact incident ID and offers the same local feedback path; raw runtime errors never become user copy. Feedback text, identity, time, IP, raw URL, attachment bytes, and private Reality data never influence a fingerprint.

## Observer and performance projection

The observer is local and read-only. It exposes only identity, health, incident headers, typed trace, bounded session/performance/network summaries, reproduction steps, approved artifact inventory, and run/region/revision/sequence/simulation-time/status world head. It has no arbitrary file, shell, browser-control, network, environment, raw Reality, cognitive record, or mutation surface. Browser bridge traces say only what that bridge directly observes: authority response, projected UI/counsel/Chronicle data, and its own local checkpoint write. They never claim an unseen internal canonical commit or publish boundary.

Performance capture uses feature-detected native marks/measures, frame histograms, supported-entry capability, and bounded long-task/event summaries. Absence is explicit. Raw observer objects are frozen/copy-safe so consumers cannot mutate recorder state.

## Verification and reopen evidence

Tests inject command, Worker, persistence, cognition, Chronicle, route, and UI failures; assert no partial canonical mutation; search every projection for canaries; exercise ring overflow/truncation; prove identical fingerprints across time-varying inputs; and profile the same deterministic journey in OFF/LOCAL/ALPHA. The clean fixed source workload at `279e1c6` measured p95 record calls of 0.000084 ms OFF, 0.007542 ms LOCAL, and 0.007875 ms ALPHA; p95 freezes were 0.384291 ms, 0.368584 ms, and 0.228375 ms respectively. Serialized bounds were 65 events/18,245 bytes OFF, 2,048/617,952 LOCAL, and 512/154,488 ALPHA. All source-call and ring ceilings passed. These are not browser-frame, input, display, heap, upload, thermal, or physical-device results; the canonical browser profile remains a separate gate. A concrete defect that cannot be reproduced from structured evidence plus an explicit screenshot may reopen a one-hour rrweb spike under the research contract. Any leak, authority dependency, unbounded growth, or budget miss removes optional capture before a budget waiver.

## Rejected alternatives and uncertainty

Rejected: continuous session replay, unsafe canvas replay, provider/browser telemetry, arbitrary observer access, remote observer, hidden-reasoning capture, and diagnostic canonical events. Still unproven: frame-level regression by mode in the final browser candidate, Safari/Firefox token normalization, physical-device behavior, and whether structured traces reproduce every canvas-only defect.

## Resulting implementation behavior and constraint fit

The package remains deterministic where it intersects canonical sequencing, accepts clocks/capabilities through ports, performs no external request, and degrades to normal gameplay when absent. The design needs no service, paid product, model, or large dependency graph and remains maintainable by one builder.
