# Frontier V1

**Purpose:** Own the post-merge Dawnmere product path: honest continuity, recurring cognition, inner life in Play, and P0 UX, without reopening the frozen V1 lattice.

**Status:** ACTIVE ON `feat/frontier-v1` — architecture accepted; slices land on this branch; Frontier is not complete until remaining work is empty

**Authority boundary:** This file owns Frontier capability targets, the local-process continuity contract, Play-surface inner-life and counsel-clock behavior, and remaining-work honesty. [ARCHITECTURE.md](ARCHITECTURE.md) still owns package layers. [PERSISTENCE.md](PERSISTENCE.md) still owns IndexedDB, no-export, and catch-up receipts. [COGNITION.md](COGNITION.md) still owns Brain/Mind. [PRODUCT.md](../product/PRODUCT.md) still owns the first-session promise.

**Related documents:** [HUMAN_LOOP.md](../product/HUMAN_LOOP.md), [CHRONICLE.md](../product/CHRONICLE.md), [FEEDBACK.md](FEEDBACK.md), [FRONTEND.md](FRONTEND.md), Phase 0 findings on `origin/main` `4f03d7109bd478376c5d3f680dc7f96a1d88707e`.

## Owned decision

Frontier keeps typed Reality as the sole writer and the browser as a client. A **local Node process** is the only honest path for “the town continues after the tab closes.” Until that process exists and holds the writer fence, landing copy and catch-up must not claim closed-tab continuity.

While a counsel/sponsor decision boundary is open, the **play clock pauses**. Influence is re-validated against the current head; it is never silently discarded. Play HUD must show recorded water, Iven as a standing friend, Want as a goal, and Chronicle causal labels. Standard Brain runs on live days. Optional Model Brain may be selected locally later; it never writes Reality; replay never re-infers.

## Evidence that would reopen

- A measured dual-writer fork between the tab Worker and a local process that fencing cannot close.
- Human sessions where pausing the clock during counsel reads as the town dying.
- Live-day cognition that breaks 28s-day budgets or 365-day catch-up equivalence.
- Any claim of closed-tab continuity without a running local process.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Cloud / Cloudflare / Vercel / hosted daemon | Violates ~$0, no-deploy, no-credentials |
| Pretend the tab Worker is an OS daemon | Phase 0: Worker dies with the tab |
| Keep racing the 28s clock against counsel | Silently discards influence (D-017) |
| Export/import worlds | Still forbidden by [PERSISTENCE.md](PERSISTENCE.md) |
| LLM-as-GM, host tools, executable skills | Unchanged research doctrine |
| Recast navmesh or large GLB packs this pass | Payload; authored Dijkstra remains |

## Unproven assumptions

- **PRODUCT HYPOTHESIS:** Visible inner life plus paused counsel creates the first-session Iven/water contract.
- **UNRESOLVED:** A thin file/IndexedDB-backed Node process can share one fence with the browser without a new persistence version.
- **UNRESOLVED:** Recurring live-day Standard Brain stays inside Play timing budgets.

## Capability matrix (Phase 0 on `4f03d71`)

| Area | Phase 0 | Frontier target |
|---|---|---|
| Reality, worldgen, scheduler, needs, resources, production, transport, persistence, replay, catch-up | STRONG | Keep |
| Cognition on live days | SHALLOW (days 1–3, then skip) | Live days run Standard Brain; bulk genesis still skips after day 3 |
| `planRoutine` | UNUSED IN PLAY | Wired as the standing-plan constructor; inspectable in Play |
| Memory / beliefs / relationships / skills | SHALLOW (seeded water replan) | Heard testimony can change a later opening choice |
| Projects / institutions / migration | SHALLOW (seeded expedition, fixed chain) | Citizen-originated projects |
| Citizen-to-citizen information | SCAFFOLD | Conversations write listener message-claims; later acts can cite them |
| Model Brain in product | Hardcoded `standard-brain` | Local Settings treatment; Standard fallback; replay never re-infers |
| Browser Worker as authority | Hosts Reality while tab is open | Client of local process when process is running |
| Closed-tab continuity | FALSE | Only with local process |
| Inner life in Play | FALSE (Want copies walk; Iven invisible) | TRUE in HUD |
| Chronicle causal grammar | Research only | Play + Research |
| P0 UX (hero, contrast, counsel race, mobile, feedback drawer) | Blockers | Fixed first |
| Export/import | Absent by decision | Still absent |
| Catch-up UI | 7 days vs persistence 365 | Honest copy; no overclaim |

## Target architecture

### 1. Local world authority

**VERIFIED FACT:** Today Reality lives in a Web Worker plus IndexedDB. Closing the tab stops the clock.

**Thinnest honest path (target; Play is not attached):**

```text
Node local-authority process  (optional, user-started, $0)
  └─ PersistencePort on the same IndexedDB/file stream
  └─ writer fence; live-day scheduler; Standard Brain
Browser Play / Research
  └─ client: projections, counsel commands, HUD
  └─ if process absent: current Worker-in-tab (no closed-tab claim)
```

The landed prototype is `tickLocalWorldAuthority` plus a process-presence script. It does not yet share a PersistencePort or writer fence with Play. No cloud. Catch-up remains player-accepted when no process was running.

### 2. Recurring cognition

Stop `skipOpeningDecisions` on **live** days. Bulk catch-up may still skip opening decisions for horizon cost. Standing plans persist and are inspectable in Play. `planRoutine` is the standing-plan constructor.

### 3. Inner life in Play

Selecting Mara must show recorded water stores, friendship with Iven, and the day's work. Want is the standing-plan goal, not locomotion copy. Relationships include standing ties, not only co-presence. Chronicle-in-play shows the five causal labels (direct, trigger, contributing, temporal predecessor, allegation) and stays honest about uncertainty.

### 4. Self-generated goals and citizen projects

Not only the seeded expedition. Remaining this pass: see remaining work.

### 5. A→B information travel

Conversations copy a typed message-claim onto the listener's Mind. A later opening decision can retrieve that heard record. Reality stays Application-written.

### 6. Optional Model Brain

Settings can select Standard Brain or optional local Model Brain. World identity stays `standard-brain`. Absent host → Standard fallback. Replay uses recorded decisions.

### 7. Presentation

P0 UX first (Slice 1). Name overlays no longer stack letters at 44px. About/License footer routes exist. Follow backs out further indoors. GLB remains unused (payload). Feedback is a bug/report icon, still localStorage-only.

### 8. Persistence honesty

Export/import remain forbidden. Catch-up copy must not overclaim. Landing must not claim the town continues with the tab closed until §1 exists.

### 9. Proofs

Lock as we go: inner-life first-session, counsel-clock pause, anti-leak of engine strings, live-day cognition. 30/90/365, social propagation, local-process continuity, and model-failure remain planned.

## Resulting implementation behavior

- Reality remains sole writer. LLM proposes catalog actions only. No host shell/FS/network/code for citizens.
- Determinism + replay from accepted events. Semantic, keyboard, and reduced-motion fallbacks remain.
- Small cast (~8). Dawnmere stays the product identity.

## Constraint fit

Local-only, ~$0, no deploy, no credentials, no Cloudflare/Vercel/backend. A Node process the user starts on their machine is not a hosted service.

## Decisions / risks / questions

| ID | This file |
|---|---|
| D-017 | Pause play clock while a decision boundary is open; re-validate; never silent discard |
| D-018 | Closed-tab continuity requires a local process; do not claim it before the process exists |
| D-019 | Inner life and causal Chronicle must be true in Play, not only Research |
| R-018 | Dual writer (tab Worker vs local process) can fork history |
| Q-016 | Does a thin local process preserve attachment when the tab is closed? |

## Remaining work

- Slice 4 attach: Play still uses Worker-in-tab. `tickLocalWorldAuthority` is a tested one-day stepper; `pnpm world:authority` is a process-presence placeholder and does not tick Reality. Do not claim closed-tab continuity.
- Citizen-originated projects beyond the seeded expedition.
- 30/90/365 social-propagation and local-process continuity proofs as product gates.
- Slice 6 remainder: GLB still unused (payload). Follow indoor clipping improved, not proven in every workshop.
- Live-day Standard Brain: `skipOpeningDecisions` is false on live days; bulk genesis still skips after day 3.
- Do **not** mark the Frontier goal complete while this section is non-empty.
