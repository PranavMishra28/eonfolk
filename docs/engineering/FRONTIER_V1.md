# Frontier V1

**Purpose:** Own the post-merge Dawnmere product path: honest continuity, recurring cognition, inner life in Play, and P0 UX, without reopening the frozen V1 lattice.

**Status:** ACTIVE ON `feat/frontier-v1` — architecture accepted; capability targets locked; remaining work is accepted non-blockers only

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
- **VERIFIED FACT:** Live Play/Faster days and player-authorized return catch-up use the same incremental Standard Brain openings (`continueCivilizationExperimentDay`, `skipOpeningDecisions` false). Origin checkpoint days no longer re-run bulk genesis. Timed FAST evidence: one live persist+think day is well under Faster's 8s and Play's 28s on this machine.
- **VERIFIED FACT:** Headed desktop Play (1728×1117, deviceScaleFactor 2, Playwright Chromium-1234 Google Chrome for Testing, Vite `127.0.0.1:5197`, Faster) sampled `requestAnimationFrame` intervals while `data-advancing-day` was true for one live think (horizon 1→2). Think-window nearest-rank p95 was 8.9 ms (n=101); Watch baseline before that think was 9.3 ms (n=299). Both sit under the 16.7 ms desktop frame budget. The Worker think did not freeze the 3D view. A non-blocking footer (“The day is turning. Dawnmere stays in view.”) is visible for that window. This is not a 30s soak and is not a FAST lock.
- **VERIFIED FACT:** Headed phone-emulated Play (390×844, deviceScaleFactor 3, same Chromium-1234 / Vite / Faster) sampled rAF while `data-advancing-day` was true for one live think (horizon 1→2). Think-window nearest-rank p95 was 9.1 ms (n=99); Watch baseline before that think was 9.2 ms (n=298). A later Faster think after four live days (horizon 5→6) was 9.7 ms (n=265) vs 9.9 ms baseline (n=300). All sit under 16.7 ms; no day-turning jank fix was required. This is headed Chromium phone viewport evidence, not a physical phone, not a 30s soak, and not a FAST lock.

## Capability matrix (Phase 0 on `4f03d71`)

| Area | Phase 0 | Frontier target |
|---|---|---|
| Reality, worldgen, scheduler, needs, resources, production, transport, persistence, replay, catch-up | STRONG | Keep |
| Cognition on live days | SHALLOW (days 1–3, then skip) | Live days and player-authorized return catch-up (1–7) run Standard Brain; bulk/prefix/year genesis runs openings every day of the generated year (`BULK_OPENING_DECISION_HORIZON_DAYS` = 365; 365×8 = 2920). FAST proves day 90; DEEP locks the year. |
| `planRoutine` | UNUSED IN PLAY | Wired as the standing-plan constructor; inspectable in Play |
| Memory / beliefs / relationships / skills | SHALLOW (seeded water replan) | Heard testimony can change a later opening choice |
| Projects / institutions / migration | SHALLOW (seeded expedition, fixed chain) | Citizen-originated water-reserve, grain-reserve, and path-upkeep from standing transport plans + recorded needs, then completed by Reality (not forever proposed); institutions/migration still the seeded chain |
| Citizen-to-citizen information | SCAFFOLD | Conversations write listener message-claims on thinking days; a later opening after day 30 can cite them. Not a 365 social-propagation proof. |
| Model Brain in product | Hardcoded `standard-brain` | Local Settings treatment; Standard fallback; replay never re-infers |
| Browser Worker as authority | Hosts Reality while tab is open | Client of local process when process is running and the fence attaches; IndexedDB writer if the process is absent |
| Closed-tab continuity | FALSE | Only with local process |
| Inner life in Play | FALSE (Want copies walk; Iven invisible) | TRUE in HUD |
| Chronicle causal grammar | Research only | Play + Research |
| P0 UX (hero, contrast, counsel race, mobile, feedback drawer) | Blockers | Fixed first |
| Export/import | Absent by decision | Still absent |
| Catch-up UI | 7 days vs persistence 365 | Player-facing cap is **up to 7 days**; persistence still 365; copy does not imply 365 lived days |

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

`pnpm world:authority` owns Reality + clock on `127.0.0.1` when Play attaches. Play probes only outside tests and WebDriver. The page Worker inherits that skip because `WorkerNavigator` has no `webdriver`; a WebDriver page sends `skipAuthorityProbe` with the first Worker message. **R-018 is closed** for silent dual-write: the reachable process is the sole writer; the browser does not persist a competing Reality; reconnect with divergent snapshots stops until the player chooses fresh local town, adopt process world, or stay local. Remaining case: an explicit stay-local/fresh-local choice while the process is still running leaves two unmerged stores by player intent. Landing copy does not claim default closed-tab continuity. About describes the optional process and the no-merge fence. Catch-up remains the honest path when the process was not running.

### 2. Recurring cognition

Stop `skipOpeningDecisions` on **live** days and on **player-authorized return catch-up** (1–7 days). Those days use `continueCivilizationExperimentDay` with Standard Brain openings; they are not empty ticks, not a closed-tab clock, and not a bulk genesis replay of the prefix. Origin checkpoint Play (before counsel) uses the same incremental continue path as post-sponsor live days. The play clock does not start the next 28s/8s interval until that Worker advance finishes (`advancingDay`). Bulk/prefix genesis and the product year run real Standard Brain openings through day 365 (`BULK_OPENING_DECISION_HORIZON_DAYS`). A 365-day run is 2920 Standard Brain decisions; days 91–365 are thinking days, not empty ticks. FAST proves the 90-day prefix (720 openings). DEEP locks the year. Standing plans persist and are inspectable in Play without leaking engine step kinds. `planRoutine` is the standing-plan constructor. Idle related residents can talk/listen on thinking days when planned work did not execute; openings do not invent omniscient social.

### 3. Inner life in Play

Selecting Mara must show recorded water stores, friendship with Iven, and the day's work. Want is the standing-plan goal, not locomotion copy. Relationships include standing ties, not only co-presence. Chronicle-in-play shows the five causal labels (direct, trigger, contributing, temporal predecessor, allegation) and stays honest about uncertainty.

### 4. Self-generated goals and citizen projects

A later live day **or a 30-day bulk genesis run** can contain **citizen-sponsored** projects distinct from the seeded Expedition Kit. Application offers `ProposeProject` only when a standing-plan goal (`routine:transport`) and a recorded need are both visible; Standard Brain may select that catalog entry; Reality (`registerProject`) is the sole writer. Names/kinds are `water-reserve` (citizen-06, water transport + water need), `grain-reserve` (citizen-05, grain transport + grain need), and `path-upkeep` (citizen-07, timber transport + worn-path need at the existing storehouse haul), not invented titles. Play HUD lists works in progress and Chronicle happenings show the origination. A 30-day (and longer) run then **completes** those projects through scheduler Reality writes from settlement stocks and citizen labor; they are not forever `proposed`.

### 5. A→B information travel

Conversations copy a typed message-claim onto the listener's Mind on days that run Standard Brain openings: live days, player-authorized return catch-up (1–7), and every day of the generated year. Pairing is scheduler-owned from idle related residents (executed work stays work; openings do not paint ghost standing-plan labor). A later opening decision — including after day 30 — can retrieve that heard record. Reality stays Application-written. This is not a 365-day social-propagation proof.

### 6. Optional Model Brain

Settings can select Standard Brain or optional local Model Brain. World identity stays `standard-brain`. Absent host → Standard fallback. Replay uses recorded decisions.

### 7. Presentation

P0 UX first (Slice 1). Name overlays no longer stack letters at 44px. About/License footer routes exist. Follow backs out of indoor meshes and peeks over a ridge so the followed body stays in frame for Workshop, Dawnmere meeting-hall, mill-scale, storehouse, and shared-dwelling envelopes. Storehouse occluders match the shorter store mesh; shared-dwelling occluders include the pitched-roof depth. A body inside an envelope keeps the look target inside so near-wall Follow still peeks. Timber logistics write standing-timber through the storeyard; the forester's thinking-day work uses that envelope. Dawnmere has no mill building; mill-kind sizing is locked anyway. GLB remains unused (payload). Feedback is a bug/report icon, still localStorage-only. While a live day thinks, Play keeps rendering and the footer can say the day is turning without pausing Watch.

### 8. Persistence honesty

Export/import remain forbidden. Catch-up copy names the **up to 7 day** player-facing cap and does not imply 365 lived days. Persistence still stores 365. Landing still describes Worker-in-tab time. About describes the optional local process and that divergent stores are not merged. Do not claim default closed-tab continuity.

### 9. Proofs

Locked: inner-life first-session, counsel-clock pause, anti-leak of engine strings (standing-plan HUD maps `WorkProject` and other step kinds to player-facing copy), **live-day Standard Brain in Play** (origin checkpoint and post-sponsor live days, plus return catch-up, use incremental `continueCivilizationExperimentDay` with `skipOpeningDecisions` false; 8 openings per day; not a bulk genesis replay; FAST times one persist+think day under Faster 8s and Play 28s; the clock holds `advancingDay` until the Worker finishes, then starts the next interval), **headed live-think frame p95** (one Faster think on headed desktop Play; rAF p95 8.9 ms during `data-advancing-day`, baseline 9.3 ms; under 16.7 ms; not a FAST lock), **headed phone-emulated live-think frame p95** (390×844 dpr 3; one Faster think; rAF p95 9.1 ms during `data-advancing-day`, baseline 9.2 ms; under 16.7 ms; not a FAST lock, not a physical phone), conversation testimony → later choice, local-process attach (process ticks Reality without a browser; Play is a read client when reachable; reconnect after a process tick shows the advanced day; process restart reloads the same persisted day; process-down Play uses IndexedDB and does not graft the process snapshot; catch-up if the process is down), shared writer fence (process-up does not write a browser fork; process-down keeps IndexedDB catch-up; divergent snapshots are not silently merged), citizen-originated **water-reserve** (citizen-06, transport + water need), **grain-reserve** (citizen-05, transport + grain need), and **path-upkeep** (citizen-07, timber transport + worn-path need; distinct from the seeded expedition; visible in Play HUD/projects; **completed** in a 30-day bulk run, not left forever proposed), **30-day bulk Standard Brain** (`runCivilizationExperiment(30)` runs openings every day; those three citizen projects originate from openings and Reality completes them; 240 Standard Brain decisions; 30-day prefix matches 90), **90-day bulk Standard Brain** (`runCivilizationExperiment(90)` runs openings every day; 720 Standard Brain decisions; days 31–90 include a later opening that retrieves heard or water-reserve memory and a later message-claim; FAST cost is accepted), **365-day bulk Standard Brain** (`BULK_OPENING_DECISION_HORIZON_DAYS` = 365; a year run is 2920 Standard Brain decisions; 90-day prefix matches 365; measured ~1.0s for one year on this machine; FAST proves 90; DEEP locks 2920), **thinking-day conversation** (paired talk/listen and listener message-claims occur on days where `skipOpeningDecisions` is false, not only on skipped odd days), **return catch-up thinking** (player-authorized 1–7 days set `skipOpeningDecisions` false and leave at least one real opening consequence; copy names **up to 7 days**; not a closed-tab clock unless `pnpm world:authority` was running), **hall/mill indoor Follow** (FAST locks meeting-hall and mill-scale peek/back-out the same way as Workshop; headed Play followed citizen-05 inside the Dawnmere meeting-hall envelope with the body in frame; Dawnmere has no mill building), **storehouse/shared-dwelling indoor Follow** (FAST locks peek/back-out on Dawnmere storehouse and shared-dwelling envelopes the same way as Workshop/hall; headed Play followed citizen-06 inside the shared-dwelling envelope at origin, peek pitch -36, body in frame at y-ratio 0.507; FAST occupancy: citizen-07's timber standing plan writes standing-timber to the storeyard; citizen-04's forestry work uses a storehouse interaction slot inside that envelope; Follow peeks over the occupied storehouse). Do not fake a 365-day wall-clock proof.

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

Accepted non-blockers (not incomplete):

- KayKit/Kenney GLB still unused (payload).
- Dawnmere has no mill building; mill-kind Follow sizing is locked anyway. Headed Play framed citizen-05 in the hall and citizen-06 in the shared dwelling. FAST locks storehouse occupancy from citizen-04's forestry work on timber stored at the storeyard; that occupancy is not a headed Play soak.
- Headed live-think frame p95 is one Faster think on this machine (desktop 8.9 ms; phone-emulated 390×844 9.1 ms), not a 30s soak, not a physical phone, and not a FAST lock.
- Player-facing catch-up remains up to 7 days; copy is honest; persistence still stores 365.
