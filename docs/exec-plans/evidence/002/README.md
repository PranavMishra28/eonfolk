# Founder Alpha performance evidence

**Purpose:** define the generated evidence boundary for Founder Alpha diagnostic overhead and optional physical-device observations.

**Status:** DIAGNOSTIC HARNESS AVAILABLE; PHYSICAL DEVICE NOT RUN

**Authority boundary:** this directory records measurements. Numerical budgets remain owned by [Performance](../../../quality/PERFORMANCE.md); diagnostic modes remain owned by [Diagnostics](../../../engineering/DIAGNOSTICS.md).

**Related documents:** [World Presence clean checkpoint](world-presence-clean-checkpoint.md), [physical-device record](physical-device.json), [headful 200%-equivalent reflow](headful-zoom.json), [Founder Alpha plan](../../active/002-founder-alpha.md), and [testing](../../../quality/TESTING.md).

## Diagnostic overhead

Run the fixed, short recorder workload only from a clean repository with the pinned Node 22.23.1 arm64 runtime:

```sh
pnpm benchmark:diagnostics -- --output /tmp/eonfolk-diagnostics-overhead.json
```

The result binds the commit, lockfile, relevant source-file hashes, runtime, exact OFF/LOCAL/ALPHA mode, fixed workload hash, seven repetitions, absolute record-call budgets, ring bounds, and unsupported browser signals. `--allow-dirty` is development-only and can emit only `SMOKE_ONLY`. This source-level workload does not replace the canonical browser benchmark and never claims frame, input, display, heap, upload, or physical-device performance.

## Physical-device protocol

The checked-in [record](physical-device.json) is deliberately `NOT_RUN`. No physical result exists until all of these steps occur:

1. From a clean source commit, run `pnpm build`.
2. Run `pnpm evidence:physical -- --output /tmp/eonfolk-physical-template.json` and retain its exact source, lockfile, and `apps/web/dist` manifest identity.
3. Restrict the host firewall to the trusted physical device/LAN. Start only `pnpm --filter @eonfolk/web preview --host 0.0.0.0 --port 4173`. Use the single recorded RFC1918 origin; never deploy it.
4. On a named physical phone, record exact OS/browser/screen/DPR, meaningful-world duration, at least 120 raw frame deltas for arrival/busy market/Chronicle, the eight Boolean journey observations, thermal support/status, start/end timestamps, and external-request count from inspected preview/browser logs. Preserve unsupported thermal data as `unsupported`, never zero.
5. Stop the preview server and remove the temporary firewall allowance.
6. Put the manual observation in `/tmp/eonfolk-physical-observation.json`, using schema `eonfolk-physical-device-observation-v1` and the template's exact build-manifest hash. Then run:

```sh
pnpm evidence:physical -- \
  --input /tmp/eonfolk-physical-observation.json \
  --output /tmp/eonfolk-physical-result.json
```

The validator rejects dirty source, absent/mismatched build output, public/non-RFC1918 origins, unknown fields, malformed timestamps, fewer than 120 raw samples per state, and numerical misses. A result can say `PASS` only for the manually observed device. It remains labeled “not independently reproduced” and is not pooled with canonical emulation.

## Headful 200%-equivalent reflow

The checked-in [headful record](headful-zoom.json) binds the clean source commit and exact headful Chrome metrics used for a 200%-equivalent reflow. It establishes zero horizontal overflow and presence of the opening action plus all counsel actions under equivalent CSS viewport/DPR metrics. macOS denied browser-UI keystroke automation, so the record does not rename this to direct Chrome UI zoom and does not replace human or assistive-technology testing.

## Evidence not yet collected

- **NOT RUN:** physical mobile meaningful-world and frame budgets.
- **NOT RUN:** physical mobile thermal behavior.
- **NOT RUN:** physical touch, reduced-motion, and semantic-fallback journey.
- **NOT RUN:** independent physical-device reproduction.
