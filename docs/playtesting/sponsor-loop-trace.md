# Sponsor loop trace

The product already has a read-only evidence surface and in-world Chronicle.
This page documents how to inspect the canonical loop. It does not add a
second tracing subsystem.

## Player-visible loop

1. `/` landing → `/world` Dawnmere.
2. Select Mara Vale (roster or semantic world).
3. **Sponsor this person** → **Consider an intervention**.
4. Facts available to the player, Mara’s beliefs, values, Standing Plan, and
   allegation status are listed before a choice.
5. Choose verify, public confrontation, or abstain. Copy on the panel states
   that Mara may accept, reject, delay, or reinterpret advice.
6. Leave the checkpoint, return, advance to her independent outcome.
7. Chronicle lists beats with causal language and allegation-versus-
   verification handling. Reload preserves the state hash.

## Maintainer inspection (not the default player UI)

- `/research` reads the current IndexedDB head and one accepted Chronicle
  beat without mutating authority. It labels world record, citizen account,
  and brain proposal separately.
- `/developer` states the runtime contract: camera, diagnostics, and optional
  cognition cannot mutate Reality.
- `corepack pnpm diagnose` prints a redacted local health snapshot. It is not
  canonical truth.
- Production Playwright journeys already cover intervention, abstention,
  reload, and Chronicle. They live under `tests/e2e/`.

## Trace checklist

Use this when debugging a specific run. Fill it in `tmp/playtesting/` or a
scratch note; do not commit live dumps.

```text
Commit:
Initial citizen / state hash:
Player-visible facts:
Citizen-visible beliefs:
Intervention or abstention:
Independent outcome (accept / reject / delay / reinterpret):
Committed consequence (resource, relationship, civic):
Chronicle causal labels:
Reload state hash matches:
Research surface beat matches Chronicle: yes / no
```

Do not expose hidden cognition or raw decision records in the normal player
UI to make this checklist easier.
