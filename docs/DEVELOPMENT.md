# Development

## Prerequisites

- Node.js 22.23.1
- Corepack with pnpm 11.15.1
- Chromium installed through Playwright for browser tests
- Java 21 plus a verified TLA+ Tools 1.8.0 JAR for formal verification

Install without package lifecycle scripts:

```sh
corepack enable
corepack pnpm install --frozen-lockfile --ignore-scripts
```

## Run

```sh
corepack pnpm dev
```

Vite binds to loopback. `/` introduces the product and `/world` enters the
generated settlement. `/research` and `/developer` are deliberate secondary
surfaces. Unknown routes fail closed without presenting a world as fact.

Production-mode local preview:

```sh
corepack pnpm prod
```

Local diagnostic summary:

```sh
corepack pnpm diagnose
```

## Make changes safely

- Keep authoritative state transitions inside the pure simulation boundary.
- Use typed IDs, integer conserved quantities, explicit simulation time, and
  seeded randomness.
- Never use `Date.now()` or `Math.random()` as simulation authority.
- Treat cognition as an untrusted proposal source.
- Commit persistence before publishing a candidate state.
- Keep renderer, diagnostics, and feedback imports out of Reality packages.
- Give important world actions semantic DOM and keyboard equivalents.
- Add or update tests at the lowest layer that owns the behavior.

Run the fast loop before requesting review:

```sh
corepack pnpm verify:fast
```

See [Testing](TESTING.md) for deeper tiers and [Contributing](../CONTRIBUTING.md)
for pull-request expectations.

## Workspace responsibilities

| Package | Purpose |
|---|---|
| `protocol` | stable types, identifiers, visibility, and version contracts |
| `sim` | authoritative transition, invariants, Chronicle facts, replay |
| `civilization` | bounded society state, scheduler, projects, sponsor effects |
| `cognition` | Standard Brain, plans, memories, proposal validation |
| `persistence` | durable ports and IndexedDB implementation |
| `worldgen` | deterministic generated geography and settlement |
| `world-presentation` | renderer-neutral scene and animation projections |
| `diagnostics` | local redacted observation and recovery signals |

The web application composes these packages; dependencies point toward protocol
and pure domain logic, not toward React or PlayCanvas.

## Environment and cost

Normal development needs no account, API key, hosted model, deployment, or paid
service. Optional loopback model experiments are manual and must not become a
test or gameplay prerequisite.
