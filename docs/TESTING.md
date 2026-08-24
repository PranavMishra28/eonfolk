# Testing

EONFOLK treats observable product behavior and deterministic state correctness
as separate blocking requirements. A passing build cannot substitute for a
playable browser journey.

## Verification tiers

```sh
# normal edit loop
corepack pnpm verify:fast

# install the pinned browser once
corepack pnpm exec playwright install chromium

# pull-request baseline; Java 21 and the verified TLA+ JAR are required
TLA2TOOLS_JAR=/absolute/path/to/tla2tools.jar corepack pnpm verify:pr

# release-depth Apple Silicon cycle
TLA2TOOLS_JAR=/absolute/path/to/tla2tools.jar corepack pnpm verify:deep
```

The fast tier checks runtime versions, dependency cohort, package boundaries,
docs, Markdown, formatting, lint, strict TypeScript, unit tests, focused
properties, generated assets, and a production build.

The PR tier adds the complete property suite, real Chromium IndexedDB tests,
timing checks, fault-injected and production Playwright journeys, zero-egress
network validation, production dependency audit, and the bounded persistence
model.

The deep tier adds long-horizon properties, targeted mutation testing, local
model/fallback evaluation when the explicitly configured loopback treatment is
available, extended fault and persistence drills, and repeated performance
measurements.

## Blocking behaviors

Tests cover:

- deterministic hashes and replay equivalence;
- command atomicity, revision checks, idempotency, and writer fencing;
- resource conservation and bounded needs;
- 1/7/30/90/365-day progress without any model;
- visibility and hidden-fact isolation;
- cognition schema failure and deterministic fallback;
- IndexedDB close/reopen, corruption, migration, and injected crashes;
- sponsor acceptance, rejection, delay, reinterpretation, and abstention;
- Chronicle causal labels and accusation-versus-verification language;
- keyboard, reduced-motion, forced-colors, zoom/reflow, and semantic fallback;
- desktop, laptop, and mobile browser journeys; and
- external network attempts, unsafe diagnostics, and local feedback deletion.

## Continuous integration policy

Relevant pull requests run formatting/lint, strict TypeScript, unit,
deterministic simulation, property/fuzz smoke, production build, documentation,
license, secret, formal, and critical Playwright checks. Cognition changes add
schema, authorization, hidden-fact, provider-failure, fallback, and behavior
regressions. Major UI changes add deterministic browser screenshots and access
checks.

Longer fuzzing, horizon seeds, mutation, browser matrices, migrations, and
capped cognition experiments belong in nightly or manual workflows so ordinary
PR feedback remains useful. Dependency updates are grouped weekly, capped at
five open PRs, and never auto-merged.

Failed browser screenshots, traces, and videos should be retained for 14 days;
accepted milestone screenshots for 30 days. Routine successful videos are not
retained.
