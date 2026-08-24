# Performance

Performance budgets protect world readability on ordinary hardware. They are
release gates, not aspirations that can be waived because the build succeeds.

## Initial budgets

| Area | Budget |
|---|---|
| Critical shell HTML/CSS/JS | at most 200 KB gzip |
| Total initial-route JavaScript, including world renderer | at most 650 KB gzip |
| Compressed first-world 3D assets | at most 6 MB desktop / 4 MB mobile |
| Meaningful world display | at most 3 s target Mac/laptop / 5 s mid-tier mobile profile |
| Desktop frame time | 60 FPS target; p95 at most 16.7 ms with eight citizens |
| Mobile frame time | 30 FPS minimum; p95 at most 33.3 ms |
| Active rendered citizens | eight default; practical at twelve |

The world must also make three citizen activities and one social interaction
recognizable. A high frame rate on an unreadable scene does not pass.

## Latest measured baseline

The clean `8b06022d4bfb6a803a7d6f54abd39e21c3bd4f2f` baseline was measured on
August 24, 2026 before the public-release documentation pass. It passed the
same production benchmark used by the DEEP verification tier:

| Profile | Meaningful world | Pooled p95 frame time | Result |
|---|---:|---:|---|
| Target Mac desktop | 895 ms | 8.9 ms | pass |
| Laptop viewport | 877 ms | 8.5 ms | pass |
| Throttled mobile profile | 4,752 ms | 10.1 ms | pass |

The run began on AC power at 89% and ended on AC power at 90%. These numbers
are a public baseline, not a substitute for measuring the final candidate; the
release process reruns the benchmark against the frozen candidate SHA.

## Measurement

The benchmark builds the production bundle, starts a loopback server, waits for
an explicit meaningful-world marker, samples representative desktop, laptop,
and throttled mobile profiles, and records repeated frame windows. It verifies
payloads from the build manifest and validates generated assets before browser
measurement.

```sh
corepack pnpm budget:check
corepack pnpm benchmark:web
```

Measurements must identify the exact commit, browser/runtime cohort, viewport,
power state, repetitions, and aggregation method. A single warm screenshot is
not performance evidence. Spikes may tighten budgets; weakening them requires a
documented product tradeoff and fresh evidence.

## Current boundaries

PlayCanvas is lazy-loaded after the shell. World simulation runs in a worker,
and renderer state cannot influence Reality. Generated geometry and textures
are validated against a tracked manifest. Weak-device degradation follows
[Accessibility](ACCESSIBILITY.md) and never removes important facts or actions.

The current population ceiling is intentionally small. Larger settlements,
more detailed assets, network sync, and hosted cognition require new measured
budgets rather than extrapolation from this proof.
