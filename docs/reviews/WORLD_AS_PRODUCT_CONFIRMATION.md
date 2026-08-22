# World-as-product targeted release confirmation

**Purpose:** Record the single targeted cross-discipline confirmation of the
repaired World-as-Product candidate, including direct product observation and
disposition of every prior release-review finding.

**Status:** COMPLETE — exact answer `NO`; zero P0, two P1, and one P2 finding.

**Authority boundary:** This file records independent observations against one
immutable candidate. It does not amend Reality, product, design, engineering,
quality, planning, decision, risk, or release authority. The coordinator owns
disposition and any repair in the authorities mapped by [INDEX](../INDEX.md).

**Related documents:** [product review](WORLD_AS_PRODUCT_PRODUCT_REVIEW.md),
[systems review](WORLD_AS_PRODUCT_SYSTEMS_REVIEW.md), [visual
review](WORLD_AS_PRODUCT_VISUAL_REVIEW.md), [visual QA](../quality/VISUAL_QA.md),
[performance](../quality/PERFORMANCE.md), [testing](../quality/TESTING.md), and
[Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

## Exact release question

> Does this feel like watching real inhabitants of a place, rather than looking
> at a visualization of a simulation?

NO

The repair makes Riverhold substantially more truthful. Canonical Reality now
advances before presentation is published; exchange, gathering, and repair
release rather than loop; travel is monotonic across heads and reload; Mara's
ledger visibly changes from a marked mismatch to a sourced green seal; and the
return plus three Chronicle compositions keep their subjects visible.

The opening still does not sustain the inhabited-place read. Its one exchange
is clear only in the first ready frame and is settled by the first two-second
watched-world boundary. On laptop and mobile, the ten-second frame leaves one
readable central worker, with moving citizens at the edge or outside the camera.
The persistent result caption says that a trade happened, but the world no
longer shows it. Under throttled mobile, this same timing causes the required
`eonfolk-meaningful-world` mark to miss its five-second budget: the renderer is
ready and eight semantic citizens exist, but `data-interactions="0"`. This is
exactly text describing a simulation result after the physical activity has
disappeared, so an exact `YES` would not be supportable.

## Frozen target and independence

| Item | Recorded value |
|---|---|
| Candidate commit | `17b2a3d7bb01889d88a0ac1395580324d15ec59d` |
| Candidate tag | `world-as-product-repaired-candidate-17b2a3d` (dereferences to the candidate commit) |
| Comparison base | `afdc6e0e68afb54a79445324cd473e9f2a434cda` |
| Repair comparison | 25 files; 2,204 insertions; 324 deletions |
| Review branch | `review/world-product-confirmation-17b2a3d` |
| Review worktree | `/Users/pranav/Documents/ChatGPT/.eonfolk-worktrees/world-product-confirmation` |
| Reviewer source edits | none |

The reviewer read the repository instructions and the complete 1,025-line
World-as-Product override, inspected the actual `afdc6e0..17b2a3d` diff, and did
not delegate. Only this review artifact is tracked by the review commit.

## Method and executed evidence

### Diff and focused correctness

- `git merge-base --is-ancestor afdc6e0 HEAD`: **passed**.
- `git diff --check afdc6e0..HEAD`: **passed**.
- Focused Vitest command covering the authoritative runtime, deterministic
  simulation, spatial lifecycle, and visual choreography: **4 files / 49 tests
  passed**.
- `pnpm build`: **passed**. Vite emitted the existing PlayCanvas
  worker-externalization and greater-than-500 kB chunk warnings.
- `pnpm budget:check`: **passed** with a 99,843-byte critical-shell gzip total,
  642,369-byte total JavaScript gzip payload, and zero external world assets,
  against limits of 204,800 bytes, 665,600 bytes, and 6/4 MB.
- Five focused production Playwright journeys passed in 1.2 minutes: truthful
  watched lifecycle, full verify/return/Chronicle path, mobile/reduced-motion
  parity, required layouts/200% reflow, and mobile arrival.
- The network oracle passed with 80 routed requests, 12,993 netlog events, and
  zero external attempts.

The shell exposed Node `v25.2.1`, not the repository's pinned `22.23.1`; pnpm
`11.15.1` matched. These results support this review but do not replace the
coordinator's pinned full verification lattice.

### Direct temporal and product walkthrough

A separate production-browser walkthrough used fresh storage, blocked every
non-loopback request, and inspected 1728×1117, 1366×768, and 390×844. It
completed arrival, ten seconds of passive watching, Follow Mara, investigation,
private-verification counsel, accepted consequence, leave, return, controlled
advance, next risk, all three Chronicle spatial views, list-view suspension of
WebGL, reload, laptop reflow, mobile reduced motion, and semantic fallback
access. It reported zero console/page errors and zero attempted egress.

Observed system evidence:

- The first ready laptop frame was canonical revision 0 / sequence 0, with
  three moving citizens, one exchange, four visible action classes, five active
  tasks, an unrepaired mill, zero teleports, and zero contradictions.
- Ten seconds later it was revision 5 / sequence 21 / simulation time 300, with
  four moving citizens, zero interactions, three active tasks, a repaired mill,
  and zero teleports or contradictions.
- A longer desktop journey advanced revision 0 to 29 before the list-view
  check. With WebGL hidden for 2.3 seconds, Reality advanced revision 29 to 31;
  reload reconstructed revision 31 / sequence 130 exactly.
- Exchange transfer was visible only in the opening in-progress stage, then
  became `none`; completed exchange/repair/gather classes did not persist. This
  directly supports the task-result and release/resume repair.
- Mara remained visible at 18 m in Follow, investigation, consequence, and
  return-pending states. The public tally visibly changed from unmarked, to a
  red 12-unit mismatch, to a green sourced seal with participants staged at the
  ledger.
- Chronicle beats reported distinct `advice`, `choice`, and `consequence`
  compositions at 22 m, 17 m, and 20 m. Every beat reported its subject visible
  and the captures showed different, unobscured spatial framing.
- Laptop width was 1,366/1,366 CSS pixels and the arrival CTA ended at y=631 in
  a 768-pixel viewport. Mobile width was 390/390, reduced motion was active,
  list view remained available, and the arrival CTA ended at y=782 in an
  844-pixel viewport.

### Bounded performance probe

A deliberately noncanonical one-repetition probe used 300 ms state samples and
no warm-up. It is not release evidence. It passed desktop and laptop loading,
then failed the mobile-emulation qualification before frame sampling:

```text
qualification mark eonfolk-meaningful-world missed 5000ms
canvasReady=true
canvasInteractions=0
citizenCount=8
illustratedInteraction="Iven Holt gave 1 wood to Toma Reed for 1 food"
```

The host was on AC power when this failure was recorded. Stable power therefore
does not cure it: the failure is product timing. The semantic/toast layer knows
the exchange result, while the illustrated world has already removed the
interaction. A fresh canonical battery must not be represented as able to pass
this candidate until the opening activity remains physically visible through
meaningful-world qualification.

Temporary screenshots and JSON were retained only outside the repository under
`/tmp/eonfolk-confirmation-17b2a3d`; they are automated review evidence, not
physical-device or human-study evidence.

## Finding summary

| ID | Severity | Finding | Release effect |
|---|---|---|---|
| WAPC-P1-001 | P1 | Opening social/economic life expires before it can reliably establish an inhabited town | Exact question remains `NO`; World Presence gate fails |
| WAPC-P1-002 | P1 | Throttled mobile cannot emit the required meaningful-world mark after the interaction disappears | Performance/readiness gate fails before frame sampling |
| WAPC-P2-001 | P2 | Prototype silhouettes, hard shadows, sparse ground, and persistent control chrome still weaken presence | Bounded polish debt after the P1 timing repair |

No P0 was found.

## P1 findings

### WAPC-P1-001 — The opening is truthful but not durably inhabited

**Evidence.** At all three viewports, the exact initial frame is improved: a
market, Mara at the tally, and Toma/Iven facing one another around transfer props
are visible. The first canonical cadence settles that exchange. In the laptop
and mobile ten-second captures, only Mara is clearly readable in the market;
other citizens are clipped at the top, beyond the settlement frame, or too small
to identify. Diagnostics report four moving citizens and `carry,gather,inspect`,
but a viewer cannot name those activities from the shown people, routes, and
places. The black notice supplies the completed trade in words.

At 390×844 this is especially decisive. The opening pair is already small below
the controls, and after ten seconds the world presents Mara plus distant marks
above a large onboarding sheet. It remains a recognizable game settlement, but
not a convincing view of several inhabitants living there.

**Mechanism.** The worker advances 60 simulation seconds every two wall-clock
seconds. The initial exchange is one in-progress reservation at genesis and is
atomically settled at the first cadence. Renderer initialization, screenshot
stabilization, CPU/network slowdown, or an ordinary visitor's orientation can
therefore consume most or all of its visible lifetime. Later actions disperse
citizens beyond the fixed 36 m opening composition instead of replacing the
exchange with another readable in-frame social/economic scene.

**Required repair.** Preserve authoritative cadence and result ordering, but
make the opening choreography robust to readiness: either keep the first
canonical interaction in progress until the world has been meaningfully shown,
or schedule a subsequent canonical in-frame activity that remains visible
without depending on renderer state. The simulation must not read camera or
paint timing. The player-facing qualification must observe at least one current
physical interaction and several distinct readable activities, not a completed
toast. Re-run the exact throttled profile and an unlabelled ten-second
walkthrough after the repair.

### WAPC-P1-002 — Mobile meaningful-world qualification times out

**Evidence.** The short diagnostic benchmark reached a ready WebGL canvas and
eight semantic citizens under the mobile profile, yet after five seconds the
required `eonfolk-meaningful-world` mark was absent because
`canvasInteractions="0"`. The last textual notice still described the settled
Iven/Toma exchange. Desktop/laptop in the same probe qualified before the
interaction expired; mobile did not.

**Release effect.** This is not merely an ineligible power run. It is a direct
failure of the explicit five-second mobile meaningful-world budget and the
rule that text cannot substitute for world activity. The candidate cannot earn
canonical performance acceptance even if its frame times would otherwise fit.

**Required repair.** Fix WAPC-P1-001, then run the full canonical battery on the
pinned runtime and stable AC. Do not weaken the mark, extend the five-second
budget, count semantic text as an illustrated interaction, or reuse prior
samples.

## P2 finding

### WAPC-P2-001 — The world still carries prototype/dashboard smell

The collapsed **World tools** control is better and the laptop/mobile CTAs now
fit. The remaining flat terrain, severe black shadows, repeated blocky bodies,
large empty market surface, top camera strip, list-view button, and bottom status
card still make Riverhold feel instrumented. This did not create the new timing
failure, and it should not expand the current repair. Preserve it as bounded
visual debt after the opening gate passes.

## Prior-finding disposition

| Prior finding | Confirmation disposition | Direct evidence |
|---|---|---|
| WAPR-PROD-P1-001 | **NOT CLOSED** | Initial choreography improved, but laptop/mobile ten-second captures and the throttled qualification show label-dependent, unsustained activity; WAPC-P1-001. |
| WAPR-PROD-P1-002 | **CLOSED for the bounded branch** | Follow frames show Mara at the tally; investigation marks the 12-unit mismatch red; accepted verification stages participants and changes the tally to a green sourced seal. The trust-band explanation remains Level 2 text, but one authoritative consequence is now visible. |
| WAPR-PROD-P1-003 | **CLOSED** | Return no longer frames a wall, and Chronicle `advice`, `choice`, and `consequence` use distinct 22/17/20 m compositions with visible subjects. |
| WAPR-PROD-P2-001 | **PARTIALLY CLOSED / P2** | Secondary lenses moved under **World tools**; persistent camera/list/status chrome remains. |
| WAPR-PROD-P2-002 | **OPEN / P2** | Character and material specificity remain prototype-grade. |
| WAPR-SYS-001 | **CLOSED** | Passive watching advanced durable revisions and sequences; list view did not pause Reality; reload restored the exact head. Unit evidence blocks publication before persistence. |
| WAPR-SYS-002 | **CLOSED** | Exchange, gather, and repair require reservations, apply one result, release, and resume. Direct lifecycle ended with no transfer/interaction or completed work loops. |
| WAPR-SYS-003 | **CLOSED** | Cross-head inspection now compares stable action IDs; injected rewind tests fail; direct progression and reload reported zero teleports. |
| WAPR-SYS-004 | **CLOSED for the prior gate defect** | Production E2E samples 48×250 ms, checks durable advancement, result/release, list-view independence, reload, and failure counters. The 300-tick unit lifecycle and injected completed-loop/cross-head-teleport oracles passed. This is still not evidence against literally indefinite future stuck states. |
| WAPR-SYS-005 | **CLOSED** | A focused runtime test moves a cited participant, reloads, and retains the event-time Chronicle place; the three direct beat destinations remain distinct. |
| WAPR-VIS-001 | **NOT CLOSED** | Same mechanism as WAPC-P1-001; activity is briefly legible at ready but not sustained at ten seconds or throttled mobile readiness. |
| WAPR-VIS-002 | **NOT CLOSED** | The repaired candidate's own short mobile probe now fails meaningful-world qualification; a canonical AC run is invalid until that mechanism is fixed. |
| WAPR-VIS-003 | **CLOSED** | Return and all Chronicle targets keep the subject visible with distinct location-aware framing. |
| WAPR-VIS-004 | **PARTIALLY CLOSED / P2** | Laptop CTA bottom is y=631/768 and mobile CTA bottom is y=782/844 with no horizontal overflow; remaining control chrome is WAPC-P2-001. |
| WAPR-VIS-005 | **OPEN / P2** | Semantic parity passes and remains playable, but its diagnostic tone was not redesigned by this repair. |

## Material passes retained

- Typed Reality remains the only authority; the renderer, lenses, diagnostics,
  Chronicle focus, and list view do not mutate it.
- Watched progression persists before publication and safe-stops stale writers.
- Travel, reservation ownership, resource conservation, one-time exchange and
  mill repair, deterministic replay, and reload passed focused tests.
- The tally prop and participant staging make Mara's bounded branch consequence
  materially more visible.
- Return and Chronicle spatial linkage is repaired without claiming historical
  replay; event-time place evidence remains stable after later travel.
- Desktop, laptop, and mobile have no horizontal overflow; reduced motion and
  semantic controls remain functional.
- Bundle limits and zero-egress controls pass.

## Limitations and claim boundaries

- This is an independent automated-agent review, not an unfamiliar human
  observer. Human Gate 0, Gate A, Gate B, fun, attachment, voluntary return,
  and retention remain **NOT RUN**.
- Mobile evidence is Chromium emulation on the M4 Pro. Physical touch, thermals,
  screen-reader behavior, field network conditions, and sustained battery
  behavior were not tested.
- The short performance probe is diagnostic and intentionally noncanonical. It
  is used only to falsify readiness, not to claim passing frame-time evidence.
- Sound was not evaluated. The semantic renderer-failure journey was covered by
  existing production tests but was not re-styled in this candidate.
- The shell's Node mismatch means the coordinator must still run the pinned
  full verification lattice after repair.

## Release verdict

**NOT READY.** Do not merge `17b2a3d7bb01889d88a0ac1395580324d15ec59d`.
Repair the single opening-lifetime mechanism without weakening canonical
cadence or truth, then require the throttled meaningful-world mark, full pinned
verification/performance lattice, and all normal release checks to pass. No
second exact-answer review should be inferred from those checks: this frozen
candidate's recorded answer remains `NO`, and human product gates remain
`NOT RUN` until performed.
