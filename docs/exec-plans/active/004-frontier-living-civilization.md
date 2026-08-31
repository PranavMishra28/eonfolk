# ExecPlan 004 — Frontier living civilization

**Purpose:** Build the living EONFOLK V1 from current `main`: a locally running civilization whose people think, remember, originate goals and projects, and keep living when the browser is closed.

**Status:** ACTIVE — Phase 0 audit complete; slice 1 local world authority in progress

**Authority boundary:** This file is the living implementation plan for the frontier V1. Historical ledgers under `docs/exec-plans/completed/` and ExecPlan 003 are snapshots, not current runbooks. Repository code and the running product outrank those documents.

**Owner:** Coordinator on `feat/frontier-living-civilization`.

**Target:** One continuously updated Mega PR into protected `main`. Do not merge automatically. Do not deploy.

## Product outcome

EONFOLK is a locally running artificial civilization whose people continuously perceive, remember, form goals, plan, cooperate, disagree, learn strategies, create projects and change their settlement without waiting for the player. Routine life works deterministically. Optional local language models may deliberate without becoming world authority. The civilization continues while the local world process is alive, and deterministically catches up after interruption.

## Binding constraints

- Work from current `main`. Do not reopen the frozen Gate 0 lattice as live game logic.
- Reality remains the sole writer. Brains propose; validators accept or reject.
- No Cloudflare, Vercel, accounts, credentials, or cloud spend.
- Citizens have no host-computer autonomy (no shell, filesystem, credentials, or network except the bound local cognition connector).
- Browser is a client/projection, not the world authority.

## Phase 0 — current truth (2026-08-30, HEAD `4f03d71`)

Observed by reading current code and playing production `http://127.0.0.1:4174`.

### Capability matrix

| Area | Classification | Evidence |
|---|---|---|
| Reality / reducer / scheduler | STRONG + ACTIVE | `packages/civilization/src/scheduler.ts`, live day advance |
| Worldgen | STRONG + ACTIVE | Dawnmere generates; 8 people, sites, routes |
| Resources / recipes / transport | STRONG + ACTIVE | Conserved stocks; carrying toward Workshop in play |
| Persistence / replay / IndexedDB | STRONG + ACTIVE | Worker + IndexedDB; Day advanced across session |
| Catch-up (browser return) | ACTIVE BUT SHALLOW | Player-authorized, max 7 days; tab-closed world stops |
| Standard Brain | ACTIVE BUT SHALLOW | Scores catalog at counsel; live days use scheduler brain |
| Standing Plans | ACTIVE BUT SHALLOW | Routine kinds; 4-step replacement plans |
| Memory | ENGINE EXISTS BUT NOT USED IN NORMAL PLAY | Six kinds + retrieval; not visibly changing live choices |
| Routine / project planners | ENGINE EXISTS BUT NOT USED IN NORMAL PLAY | HTN-style; experiment/test path |
| Model Brain / BrainPort | EXPERIMENT / TEST ONLY | Ollama seam; not onboarding |
| Projects | ACTIVE BUT SHALLOW | One genesis `project-expedition-kit`; completed by Day 4 in play |
| Migration / founding | ACTIVE BUT SHALLOW | Orin leaves; Second Founding appears; not citizen-originated |
| Institutions / agreements | ENGINE EXISTS BUT NOT USED IN NORMAL PLAY | Gate collective work affordances |
| Self-generated goals | SCAFFOLD | UI "Want" is current activity copy |
| Learned strategies | MISSING | — |
| Reflection / sleep-time | MISSING | — |
| A-tells-B information | SCAFFOLD | `social-maintenance` contact, not typed claims |
| Generalized player relationships | ACTIVE BUT SHALLOW | Follow any person; Sponsor is Mara-only |
| Local world process | MISSING → slice 1 | World dies with the tab |
| Export / import | MISSING | README states this |
| Rigged characters | MISSING | Procedural boxes + limb-angle poses |
| Navmesh / crowd | MISSING | Authored graph Dijkstra in presentation |
| Audio | MISSING | — |
| Website IA | ACTIVE BUT SHALLOW | Landing is Mara-centric; Research/Developer are footer leftovers |
| Game HUD | ACTIVE BUT SHALLOW | Pause/Play/Faster/Follow/Chronicle exist; camera debug still in the tree |
| Feedback | ACTIVE BUT SHALLOW | Bottom drawer "Feedback form — not the Chronicle" |
| Accessibility | STRONG + ACTIVE | In words, keyboard, reduced motion |

### First-session play (production preview)

- Landing: "Follow Mara Vale. She acts for herself." Hero town is a low-poly miniature. Research/Developer sit in the footer.
- `/world`: Day advanced while watching; 7 people after Orin left; people repair/carry/inspect; Follow Mara and Follow Iven both work; Sponsor remains Mara-only; "Immediate relationship: No one is currently beside them" while several people share the Workshop; camera debug lives under "Camera, playback, and evidence"; feedback is a bottom drawer.
- Closing the tab stops the world. Copy honestly says the settlement remains in **this browser**.

## Research principles kept (not copied architectures)

- Generative Agents: memory stream + retrieval (relevance/recency/importance) + reflection + planning, with EONFOLK typed Reality instead of natural-language world writes.
- Letta sleep-time: background consolidation off the live decision path; derived beliefs keep provenance; never invent canonical facts.
- Voyager: reusable skill macros as validated plan templates, never generated code execution.
- llama.cpp/Ollama: grammar-constrained JSON for Model Brain; MLX structured output is not yet trustworthy; fail closed to Standard Brain.
- PlayCanvas 2.21 AnimComponent + blend trees for real skeletal clips.
- recast-navigation-js (`@recast-navigation/playcanvas`) for presentation navigation only.
- Quaternius Universal Animation Library (CC0) as the leading permissive humanoid clip source.

## Slice sequence

1. Local always-running world authority + honest catch-up (this slice)
2. Recurring cognition boundaries + self-generated goals
3. Capability composition + autonomous project origination
4. Memory/reflection that changes later choices
5. Social intelligence + A-tells-B proofs
6. Generalized player relationships
7. Local model routing/fallback (optional)
8. Learned strategies
9. Long-run 30/90/365 emergence
10. Rigged characters + animation
11. Navmesh/crowd (presentation)
12. Website/game UX overhaul
13. Chronicle/feedback/export
14. Adversarial review freeze

## Slice 1 — local world authority

**Outcome:** `pnpm dev` launches a loopback world process and the web client. Closing the browser does not stop the civilization while the process is alive. Restarting the process requests deterministic catch-up for elapsed awake time, capped and honest.

**Non-goals:** cloud hosting, IndexedDB removal (worker remains fallback), model inference.

## Progress

- 2026-08-30 — Phase 0 audit from `main@4f03d71`. Branch `feat/frontier-living-civilization` opened.
- 2026-08-30 — Slice 1 local world authority: loopback process, file persistence, browser client fallback, honest 7-day catch-up.

## Limitations (ruthless)

- Citizens do not yet originate novel projects from observed conditions.
- Memory, relationships, and counsel do not yet compose into a full three-layer cognitive loop.
- Characters are still procedural proxies.
- The website is not yet a premium product narrative.
- Browser-only fallback still exists when the local process is down.
