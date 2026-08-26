# Contributing to EONFOLK

EONFOLK is an early, solo-maintained experiment. Focused bug reports, gameplay
observations, accessibility findings, performance measurements, and small pull
requests are welcome. Large systems are unlikely to be accepted without an
agreed issue first.

## Before opening an issue

Choose the closest issue form and describe the player-facing problem. Include a
commit or version, operating system, browser, viewport, and minimal reproduction
when relevant. Never post credentials, personal information, private world data,
or exploit details.

Security concerns follow [SECURITY.md](SECURITY.md).

## Development setup

The pinned toolchain is Node 22.23.1 and pnpm 11.15.1. Java 21 is needed only for
the formal-model checks, not for ordinary play or `pnpm verify:fast`.

```sh
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm dev
```

Open the loopback URL printed by Vite. The game is local-first and should not
require an account, API key, model download, or external service.

Run the normal edit loop before submitting:

```sh
corepack pnpm verify:fast
```

`verify:fast` is the default contributor gate. `verify:pr` additionally runs
browser journeys, IndexedDB, formal TLA+ (needs `TLA2TOOLS_JAR`), and
zero-egress checks. State every check that was not run.

Optional local sessions with a person use the
[playtest kit](docs/playtesting/README.md). Automated personas are
`pnpm evaluate:synthetic` and are not human evidence.

A useful first contribution is a precise bug, accessibility, or gameplay
observation with commit, browser, and viewport—not a new subsystem.

## Change principles

- Start from a concrete player or correctness outcome.
- Preserve deterministic, model-free world operation.
- Keep Reality authoritative; UI, diagnostics, cognition, and prose do not write
  canonical facts directly.
- Use closed typed commands and inert text rendering at trust boundaries.
- Keep important actions available through semantic, keyboard-accessible UI.
- Do not add telemetry, hosted services, credentials, deployment, payments, or
  new data collection as an incidental change.
- Prefer the smallest executable change. Do not broaden a pull request silently.

## Pull requests

Keep commits reviewable and update tests and documentation with behavior. The
pull request should name the player outcome, exclusions, risks, verification,
browser evidence for UI changes, and accessibility/performance/security impact.
Use `git diff --check` and inspect the actual changed files before requesting
review.

By contributing, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
