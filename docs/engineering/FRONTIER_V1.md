# Frontier V1

**Purpose:** Own the post-merge Dawnmere product path: honest continuity, recurring cognition, inner life in Play, and P0 UX, without reopening the frozen V1 lattice.

**Status:** ACTIVE ON `feat/frontier-v1` — architecture accepted; slices land on this branch; Frontier is not complete until remaining work is empty

**Authority boundary:** This file owns Frontier capability targets, the local-process continuity contract, Play-surface inner-life and counsel-clock behavior, and remaining-work honesty. [ARCHITECTURE.md](ARCHITECTURE.md) still owns package layers. [PERSISTENCE.md](PERSISTENCE.md) still owns IndexedDB, no-export, and catch-up receipts. [COGNITION.md](COGNITION.md) still owns Brain/Mind. [PRODUCT.md](../product/PRODUCT.md) still owns the first-session promise.

**Related documents:** [HUMAN_LOOP.md](../product/HUMAN_LOOP.md), [CHRONICLE.md](../product/CHRONICLE.md), [FEEDBACK.md](FEEDBACK.md), [FRONTEND.md](FRONTEND.md), Phase 0 findings on `origin/main` `4f03d7109bd478376c5d3f680dc7f96a1d88707e`.

## Owned decision

Frontier keeps typed Reality as the sole writer and the browser as a client. A **local Node process** is the only honest path for “the town continues after the tab closes.” The process holds the writer fence when it is reachable. Landing copy and catch-up still must not claim default closed-tab continuity.

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
- **VERIFIED FACT:** The local process and IndexedDB do not silently share one Reality. When the process is reachable it is the sole writer unless the player explicitly keeps the browser town. Divergent snapshots require an explicit choice and are never merged.
- **UNRESOLVED:** Recurring live-day Standard Brain stays inside Play timing budgets.

## Capability matrix (Phase 0 on `4f03d71`)

| Area | Phase 0 | Frontier target |
|---|---|---|
| Reality, worldgen, scheduler, needs, resources, production, transport, persistence, replay, catch-up | STRONG | Keep |
| Cognition on live days | SHALLOW (days 1–3, then skip) | Live days run Standard Brain; bulk/prefix openings through day 30; skip after day 30 for 365 identity/perf, not a cognition proof |
| `planRoutine` | UNUSED IN PLAY | Wired as the standing-plan constructor; inspectable in Play |
| Memory / beliefs / relationships / skills | SHALLOW (seeded water replan) | Heard testimony can change a later opening choice |
| Projects / institutions / migration | SHALLOW (seeded expedition, fixed chain) | Citizen-originated water-reserve from standing plan + need; institutions/migration still the seeded chain |
| Citizen-to-citizen information | SCAFFOLD | Conversations write listener message-claims; later acts can cite them |
| Model Brain in product | Hardcoded `standard-brain` | Local Settings treatment; Standard fallback; replay never re-infers |
| Browser Worker as authority | Hosts Reality while tab is open | Client of local process when process is running and the fence attaches; IndexedDB writer if the process is absent |
| Closed-tab continuity | FALSE | Only with local process |
| Inner life in Play | FALSE (Want copies walk; Iven invisible) | TRUE in HUD |
| Chronicle causal grammar | Research only | Play + Research |
| P0 UX (hero, contrast, counsel race, mobile, feedback drawer) | Blockers | Fixed first |
| Export/import | Absent by decision | Still absent |
| Catch-up UI | 7 days vs persistence 365 | Honest copy; no overclaim |

## Target architecture

### 1. Local world authority

**VERIFIED FACT:** Default Play writes Reality in a Web Worker plus IndexedDB. Closing the tab stops that clock unless `pnpm world:authority` is running and Play attaches as a read client.

**Landed vertical (optional; not a shared PersistencePort):**

```text
Node local-authority process  (optional, user-started, $0)
  └─ file snapshot + loopback HTTP; ticks days while the process is running
Browser Play
  └─ read client when the process is reachable and the fence attaches
     (kind: local-process); IndexedDB does not write a competing Reality
  └─ if process absent: current Worker-in-tab (catch-up required)
  └─ if both stores exist and diverge: explicit choice, never a silent merge
```

`pnpm world:authority` owns Reality + clock on `127.0.0.1` when Play attaches. Play probes only outside tests and WebDriver. **R-018 is closed** for silent dual-write: the reachable process is the sole writer; the browser does not persist a competing Reality; reconnect with divergent snapshots stops until the player chooses fresh local town, adopt process world, or stay local. Remaining case: an explicit stay-local/fresh-local choice while the process is still running leaves two unmerged stores by player intent. Landing copy does not claim default closed-tab continuity. About describes the optional process and the no-merge fence. Catch-up remains the honest path when the process was not running.

### 2. Recurring cognition

Stop `skipOpeningDecisions` on **live** days. Bulk/prefix genesis runs real Standard Brain openings through day 30 (`BULK_OPENING_DECISION_HORIZON_DAYS`). After that window, later prefix days may skip for 365 identity and horizon cost; that skip is **not** a 90/365 cognition proof. Return catch-up (1–7 days) still skips openings. Standing plans persist and are inspectable in Play. `planRoutine` is the standing-plan constructor.

### 3. Inner life in Play

Selecting Mara must show recorded water stores, friendship with Iven, and the day's work. Want is the standing-plan goal, not locomotion copy. Relationships include standing ties, not only co-presence. Chronicle-in-play shows the five causal labels (direct, trigger, contributing, temporal predecessor, allegation) and stays honest about uncertainty.

### 4. Self-generated goals and citizen projects

A later live day **or a 30-day bulk genesis run** can contain a **citizen-sponsored** project distinct from the seeded Expedition Kit. Application offers `ProposeProject` only when a standing-plan goal (`routine:transport`) and a recorded water-reserve need are both visible; Standard Brain may select that catalog entry; Reality (`registerProject`) is the sole writer. The project name/kind is `water-reserve`, not an invented title. Play HUD lists works in progress and Chronicle happenings show the origination. Completing that project and originating other kinds remain open.

### 5. A→B information travel

Conversations copy a typed message-claim onto the listener's Mind. A later opening decision can retrieve that heard record. Reality stays Application-written.

### 6. Optional Model Brain

Settings can select Standard Brain or optional local Model Brain. World identity stays `standard-brain`. Absent host → Standard fallback. Replay uses recorded decisions.

### 7. Presentation

P0 UX first (Slice 1). Name overlays no longer stack letters at 44px. About/License footer routes exist. Follow backs out further indoors. GLB remains unused (payload). Feedback is a bug/report icon, still localStorage-only.

### 8. Persistence honesty

Export/import remain forbidden. Catch-up copy must not overclaim. Landing still describes Worker-in-tab time. About describes the optional local process and that divergent stores are not merged. Do not claim default closed-tab continuity.

### 9. Proofs

Locked: inner-life first-session, counsel-clock pause, anti-leak of engine strings, live-day cognition, conversation testimony → later choice, local-process attach (process ticks Reality without a browser; Play is a read client when reachable; catch-up if the process is down), shared writer fence (process-up does not write a browser fork; process-down keeps IndexedDB catch-up; divergent snapshots are not silently merged), citizen-originated water-reserve project from a standing transport plan and recorded water need (distinct from the seeded expedition; visible in Play HUD/projects), **30-day bulk Standard Brain** (`runCivilizationExperiment(30)` runs openings every day; citizen-06 originates `water-reserve` from those openings; 240 Standard Brain decisions; 30-day prefix matches 365). **90/365 social remains UNRESOLVED:** days 31–365 of a year run skip openings for identity/perf; that is not a cognition proof. Do not fake a 365-day wall-clock or cognition proof.

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
| R-018 | Dual writer (tab Worker vs local process) can fork history — **closed** for silent merge; remaining: explicit stay-local while the process is running leaves two unmerged stores |
| Q-016 | Does a thin local process preserve attachment when the tab is closed? — **yes** while the process runs and the fence attaches; catch-up when it does not |

## Remaining work

- 90/365 social-propagation as a product gate: prefix skip after day 30 is identity/perf, **not** a cognition proof; do not fake 365.
- Slice 6 remainder: GLB still unused (payload). Follow indoor clipping improved, not proven in every workshop.
- Return catch-up (1–7 days) still sets `skipOpeningDecisions` true.
- Bulk thinking days follow standing-plan work; scheduler-paired talk/listen appears on skipped odd days, so 30-day TRUE is the citizen project, not social propagation.
- Do **not** mark the Frontier goal complete while this section is non-empty.
