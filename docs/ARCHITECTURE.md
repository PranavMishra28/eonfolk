# Architecture

EONFOLK is a local-first TypeScript workspace built around one rule: **Reality
is the sole authority**. Models, UI, diagnostics, and narration may propose or
describe; none may directly change canonical state.

## Runtime

```text
pnpm dev
├── Local world authority (loopback process)
│   ├── file-backed versioned persistence
│   ├── civilization scheduler and reducer
│   └── mandatory model-free Standard Brain
└── Browser client
    ├── React semantic interface and Chronicle
    ├── PlayCanvas world renderer
    └── IndexedDB Web Worker fallback when the process is down
```

`pnpm dev` starts the local world authority and the web client together.
Closing the browser does not stop the civilization while that process remains
alive. Restarting the process requests deterministic catch-up for elapsed awake
time; it does not pretend the machine ran while it was off. `pnpm dev:web` is
the browser-only fallback.

The application validates a typed command against an expected revision. The
simulation prepares an immutable transition, checks invariants, emits ordered
events with pre/post hashes, and installs the candidate only after persistence
commits it. A retry with the same idempotency identity returns the durable
receipt; a collision or stale writer fails closed.

## Authority layers

| Layer | May do | May not do |
|---|---|---|
| Reality | validate and apply typed transitions; emit canonical events | read UI, renderer, provider, or wall-clock state |
| Mind | hold sourced beliefs, memories, relationships, and Standing Plans | create facts or grant authority |
| Brain | propose one action from a bounded catalog | mutate Reality or emit arbitrary code/content |
| Application | authorize, persist, project, render, and recover | bypass reducer or publish uncommitted state |

The `packages/sim` and `packages/protocol` packages are renderer- and
browser-independent. `packages/world-presentation` converts immutable
projections to spatial scene data. PlayCanvas consumes those projections; frame
time, camera position, and pointer state never feed simulation decisions.

## Truth, belief, and causality

World facts, observations, private knowledge, beliefs, memories, and attributed
claims are different types. Observing a statement proves that it was said—not
that its content is true. Visibility is deny-by-default and evaluated before
data enters a decision context or Chronicle projection.

Canonical causal edges are limited to direct cause, trigger, and contributing
condition. Temporal predecessor and response are noncausal relations.
Allegations remain attributed speech. The Chronicle uses this same vocabulary
and never infers causality from prose or timing alone.

## Persistence and replay

The browser fallback keeps versioned events, batch headers, state hashes, receipts,
snapshots, and fencing tokens in IndexedDB. The local world authority keeps the
same versioned stores in an atomic file under `~/.eonfolk/worlds/`. Canonical
replay consumes a verified snapshot plus an exact ordered event interval. It does
not call cognition or attempt to reproduce a model response.

Catch-up advances through deterministic boundaries. Stable spans may be
coalesced for presentation, but shocks, shortages, ownership changes, plan
boundaries, and consequential decisions remain explicit.

The current build has no player-facing backup/import interface, sync, hosted
server authority, or multi-device conflict resolution. A future region server can
implement the existing persistence boundary, but it will require a separate
authentication, moderation, backup, and operations design.

## Security properties

- Typed authorization occurs after cognition and before every write.
- External or local model output is parsed as untrusted structured data.
- User/model text renders as escaped text, never trusted HTML, Markdown, SQL,
  URLs, or code.
- Diagnostics and local feedback are redacted, bounded, and non-authoritative.
- Production browser tests fail on external network attempts.
- Hidden, missing, and unauthorized targets share the same public failure shape.

See [Gameplay](GAMEPLAY.md), [Development](DEVELOPMENT.md), and
[Testing](TESTING.md).
