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

## Synthetic product evaluation

`pnpm evaluate:synthetic` runs labeled Playwright personas A–G. It is
**automated product evaluation, not human research**. Reports write to
`tmp/synthetic-evaluation/` and must not be cited as fun, attachment,
comprehension, adoption, or retention evidence.

The suite may fail on broken routes, missing labels, unreachable sponsor
controls, reload drift, Chronicle wording that overcredits the player, keyboard
or semantic fallback gaps, and loopback egress. Human playtests use
[docs/playtesting](playtesting/README.md).

## Public script responsibilities

The public package scripts are the callers below. All tools are local-only
unless a row explicitly names a network fetch; generated evidence stays under
`tmp/` and is not canonical game state.

| Scripts | Purpose and caller | Network / output |
|---|---|---|
| `check-runtime.mjs`, `typecheck.mjs`, `check-boundaries.mjs`, `check-diff.mjs` | Runtime, strict type graph, authority-layer, and tracked-diff gates; `verify:fast` | no network; console only |
| `check-doc-links.mjs`, `check-bibliography.mjs` | Reader-link and bibliography validation; `docs:check` | no network; console only |
| `validate-generated-assets.mjs`, `measure-bundle.mjs` | Generated-asset provenance and gzip payload gates; FAST/PR | no network; manifest or `tmp/eonfolk-bundle-measurement.json` |
| `check-licenses.mjs` | Production dependency license allowlist; FAST/PR | no network; console only |
| `validate-web-network.mjs` | Reject external browser requests from Playwright; PR | reads per-worker `tmp/dawnmere-playwright/netlog-w*.json` and `route-log-w*.json` |
| `check-formal.mjs`, `formal-toolchain.mjs` | Run and identify the pinned TLA+ persistence model; PR/deep | caller fetches the hash-pinned TLC JAR; console only |
| `check-targeted-mutations.mjs` | Kill the bounded pure-logic mutant set; manual deep | no network; console only |
| `validate-browser-cohort.mjs`, `validate-browser-cohort.rb` | Cross-check the pinned Playwright browser identity; manual deep | no network; console only |
| `benchmark-persistence.mjs` | Measure memory and real IndexedDB append/recovery; manual deep | loopback browser only; JSON under `tmp/` |
| `benchmark-diagnostics.mjs`, `benchmark-diagnostics-browser.mjs` | Measure diagnostic overhead and browser noninterference; manual deep | loopback browser only; JSON under `tmp/` |
| `benchmark-web.mjs` | Repeated desktop/laptop/mobile load, frame, memory, and interaction budgets; manual deep | loopback browser only; JSON and screenshots under `tmp/` |
| `benchmark-presentation-stress.mjs` | Measure the twelve-actor presentation ceiling without adding canonical citizens; manual deep. Eight citizens retain the stricter production 16.7/33.3 ms gate; twelve synthetic actors must remain under 25/33.3 ms p95 and add at most 25% over the paired seven-actor fixture. | loopback headful browser only; JSON under `tmp/` |
| `ollama-bounded-adapter.mjs` | Optional explicitly configured loopback model treatment; cognition benchmark only | loopback Ollama only; bounded JSON response |
| `diagnose.mjs` | Local developer health snapshot used by `pnpm diagnose` | no network; redacted console report |
| Playwright `@synthetic` journeys | Mechanical product-evaluation personas; `evaluate:synthetic` | loopback only; JSON under `tmp/synthetic-evaluation/` |
| `evidence-integrity.mjs` | Shared deterministic content hashing for benchmark artifacts | library caller only; no direct output |

The manual public Ubuntu lane runs the portable extended checks under Xvfb. The
target-Mac DEEP lane additionally verifies the pinned macOS browser cohort and
is the only lane eligible for target-device readiness evidence.
