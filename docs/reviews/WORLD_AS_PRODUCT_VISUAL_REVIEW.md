# World-as-Product visual, accessibility, and performance review

**Purpose:** independently assess the frozen World-as-Product candidate's visual presence, interaction, accessibility, and performance evidence boundaries.

**Status:** COMPLETE — RELEASE BLOCKED BY THREE P1 FINDINGS

**Authority boundary:** this document records an independent review only. It does not change product, visual, performance, or release authority.

**Related documents:** [visual QA](../quality/VISUAL_QA.md), [performance](../quality/PERFORMANCE.md), [frontend](../engineering/FRONTEND.md), [active ExecPlan](../exec-plans/active/002-founder-alpha.md)

## Frozen candidate and verdict

- Frozen commit: `afdc6e0e68afb54a79445324cd473e9f2a434cda`
- Review branch: `review/world-visual-release-afdc6e0`
- Review date: 2026-08-21 America/Los_Angeles
- Source state: clean before review; only this allowlisted review file changed. No source or authority document was edited.

> Does this feel like watching real inhabitants of a place, rather than looking at a visualization of a simulation?

NO

The scene now has coherent settlement scale, recognizable humanoids, real spatial selection, and continuous authoritative movement. It still fails the release question because the opening camera makes most activity too small and ambiguous to read without text instrumentation, and a later focal view can lose the inhabitant behind settlement geometry. The surrounding controls and state readouts reinforce the impression of inspecting a simulation.

## Finding summary

| ID | Severity | Finding | Release effect |
|---|---|---|---|
| WAPR-VIS-001 | P1 | The illustrated opening does not let this fresh reviewer identify three inhabitants' activities from the place itself | Blocks the exact inhabited/alive gate |
| WAPR-VIS-002 | P1 | The exact-SHA DEEP/performance artifact is `FAIL` because the battery crossed below the accepted floor | Blocks numerical performance acceptance despite passing samples |
| WAPR-VIS-003 | P1 | The focal camera can frame a building instead of the followed inhabitant at the Chronicle state | Blocks continuous world presence and Chronicle-to-space confidence |
| WAPR-VIS-004 | P2 | Mobile and laptop chrome compete with the world; the laptop opening action is partially clipped | Fix during the P1 visual pass |
| WAPR-VIS-005 | P2 | The semantic fallback is functionally complete but reads like a long diagnostic inventory | Preserve function while making the fallback human-first |

No P0 was found.

## P1 findings

### WAPR-VIS-001 — Opening activity is not independently legible

**Evidence.** Fresh arrival captures were inspected at 1728×1117 DPR 2, 1366×768 DPR 1, and 390×844 DPR 3. Buildings, roads, the market, and stylized humans establish a physical place. At the default town scale, however, the people occupy only a small central patch. I could recognize a group and the named exchange toast, but I could not determine three distinct citizens' activities from bodies, props, paths, and setting. Mara's tally inspection, Sela's water route, Rowan's wood route, and the repair task become knowable from the text view or controls rather than from watching the settlement. This fails the observer criterion even though automation reports eight activities and four animation classes.

The 390×844 opening keeps the world stage at 464.2 CSS pixels and the action in the viewport, but camera/lens controls cover the upper portion while the small activity cluster remains below them. The desktop view has more space yet preserves the same distant, sparse composition.

**Reproduction.** From cleared browser storage, open the production preview and wait for `data-ready="true"`. Do not open People, list view, or the semantic section. Watch the first three seconds at each required viewport and attempt to name three people and their work. Only the Toma–Iven exchange is explicitly identified in the illustrated first viewport.

**Recommendation.** Recompose the opening around three simultaneously readable activity silhouettes with distinct tools, carried props, destinations, and nearby landmarks. Keep the physical town context, but bring the activity cluster close enough to read without labels or a raw feed. Reduce or progressively disclose chrome, then repeat a silent fresh-observer test. Passing automation is not a substitute.

### WAPR-VIS-002 — The canonical performance run is not acceptance-eligible

**Evidence.** The coordinator's exact-SHA local artifacts report:

- `tmp/eonfolk-verification-deep.json`: `status: FAIL`; internal `outputSha256` `f19054087172d6724aeef3c501056790ee0840505a20929143f9e362d7a56f56`.
- `tmp/eonfolk-canonical-performance.json`: exact clean source `afdc6e0`, 15 completed runs, artifact SHA-256 `5f76bdbef06eaa5ad46ee8988865e97c40fc9dc1a60804c232b813797887abd5`.
- Power began on Battery Power at 56% and ended on Battery Power at 49%; `profileAccepted` is false under the binding stable-AC or battery-at-least-50%-at-both-boundaries rule.

The samples themselves are encouraging but diagnostic only: desktop pooled p95 9.1 ms, laptop 8.8 ms, throttled mobile emulation 10.1 ms; the worst mobile meaningful-world mark is 4,430.8 ms; all 15 netlogs report zero external attempts. Those numbers do not override the explicit failed power boundary.

**Reproduction.** Inspect `.status` and the `canonical-web-performance` constituent in the DEEP manifest, then inspect `.runtime.power` in the canonical performance artifact. The final constituent exits 1 after all prior 25 constituents pass.

**Recommendation.** Run a wholly fresh 15-run battery at stable AC, or at battery >=50% at both boundaries, without weakening thresholds or reusing these samples. Preserve this failed run as variance/diagnostic evidence and do not describe it as the canonical pass.

### WAPR-VIS-003 — Follow framing loses the inhabitant behind geometry

**Evidence.** A complete keyboard-only verify path was run with reduced motion at 1366×768. After Mara accepted private verification, Riverhold advanced, the outcome-dependent action was taken, and the Chronicle opened. The world remained at citizen scale, but the top viewport was dominated by the roof and wall of a nearby building; no inhabitant was visible. The Chronicle is therefore visually disconnected from the supposedly followed life at the moment it explains her consequence.

The earlier market Follow view does frame Mara recognizably, so this is location-dependent camera occlusion rather than a missing model. It is especially damaging because the world-focused camera is intended to maintain personal continuity across Chronicle beats.

**Reproduction.** At 1366×768 with reduced motion, complete Follow Mara → investigate → verify privately → leave → return → Advance Riverhold → publish the verified count. Observe the world at the Chronicle state before reading the record. The camera target is near the granary, but the structure occludes the focal inhabitant.

**Recommendation.** Add location-aware follow compositions or a camera line-of-sight/occlusion correction that guarantees the focal inhabitant remains visible without clipping through roofs. Exercise every Chronicle spatial target and each authored destination at citizen scale in desktop, laptop, and mobile screenshots.

## P2 findings

### WAPR-VIS-004 — Chrome and clipping weaken world dominance

**Evidence.** At 390×844, the camera and lens blocks occupy about 24.2% of the world stage's geometric area and roughly the upper third of its height; a separate list-view button occupies the lower world area. At 1366×768, the opening decision rail has 635 CSS pixels of client height for 791 pixels of content. The 62-pixel Follow Mara action starts at y=714.3, leaving only 53.7 pixels visible before the viewport edge. It remains focusable and clickable, but the clipped CTA and scrollbar-dependent copy make the first view feel fitted around panels rather than the town.

**Reproduction.** Clear storage and open at 1366×768 or 390×844. Inspect the first viewport without scrolling. On laptop, compare the primary action's bottom with the viewport. On mobile, compare the control blocks with the visible activity area.

**Recommendation.** Collapse infrequent camera/lens actions behind one compact control after onboarding, keep pan/zoom gestures and semantic equivalents, and fit the complete laptop CTA without internal scrolling. Retain the current mobile sheet cap: the settled direct-selection sheet measured 295.39 pixels, exactly within 35svh, stayed opaque, and left the world visible.

### WAPR-VIS-005 — Semantic fallback is complete but diagnostic in tone

**Evidence.** With the renderer-failure fixture at 390×844 and reduced motion, the canvas disappears, an honest failure notice appears, horizontal overflow remains zero, and Follow Mara still advances the product. The eight citizen cards, settlement resources, interaction state, and world changes are reachable by keyboard. The fallback nevertheless opens as a long vertical inventory with phrases such as “in progress; no result claimed” and later “canonical event 19.” It preserves facts but feels like a system report rather than another view of inhabited Riverhold.

**Reproduction.** Set `sessionStorage["eonfolk:e2e-renderer-failure"] = "1"`, reload at 390×844 with reduced motion, and proceed using only the keyboard.

**Recommendation.** Lead with two or three human-readable current scenes and relationships, then disclose the complete provenance inventory behind details. Keep every existing fact/action and the honest failure notice.

## What passed in this review

- Fresh production builds painted without console or page errors at all three required viewports.
- No horizontal overflow was observed at 1728×1117, 1366×768, or 390×844.
- Pointer selection resolved the projected inhabitant on laptop and mobile, opened the correct context sheet, and restored focus on Escape. Wheel zoom changed camera distance from 18 m to 12 m on laptop and 14.2 m on mobile; pointer drag remained bounded.
- Keyboard `F`, `+`, arrows, and Home camera paths worked. A complete consequential journey, Chronicle stepping, evidence dialog, and dismissal were completed without pointer input.
- Reduced motion set root scrolling to `auto`, retained essential world progression, disabled Chronicle autoplay, and left Previous/Next operable.
- The semantic/list and injected renderer-failure routes preserved facts and consequential actions.
- Eight focused production tests passed in 1.7 minutes: direct picking/camera parity; mobile/keyboard/semantic parity; required layouts/200% reflow; mobile arrival; contrast/forced colors; complete keyboard journey; renderer-failure journey; and manual reduced motion/touch targets.
- The built route remained within the recorded bundle boundary: 99,043 bytes gzip critical shell, 641,440 bytes gzip total JavaScript, 515,428 bytes gzip lazy world chunk, and zero external world assets, as reported by the frozen candidate's existing measurement.

## Screenshot manifest

These review captures are temporary local evidence, not physical-device evidence or a committed visual baseline.

| State | Viewport/profile | Local capture | SHA-256 |
|---|---|---|---|
| Arrival after three seconds | 1728×1117 DPR 2 | `/tmp/eonfolk-afdc6e0-visual/desktop-arrival-3s.png` | `8d1d943f1a75514ebe523b0e5aa8092e19c82b0c63fb523b038eac93c93fab88` |
| Arrival full page | 1366×768 DPR 1 | `/tmp/eonfolk-afdc6e0-visual/laptop-arrival.png` | `9fcf30b7e7f3d7bdc5cdf39c75edb5b202b56fda377a1d23d954f9316ba1bcfe` |
| Arrival full page | 390×844 DPR 3 emulation | `/tmp/eonfolk-afdc6e0-visual/mobile-arrival.png` | `a0fd7f47ab73b355b4e16cb04d5553c853bfbb9c35403d1a9df4d77266958c2a` |
| Initial Follow composition | 1728×1117 DPR 2 | `/tmp/eonfolk-afdc6e0-visual/desktop-follow.png` | `9cfafc9dffa2c1ad8eda9f9bc2f695da19c3b14315c818df10954480a1719a36` |
| Keyboard Chronicle/evidence | 1366×768 DPR 1, reduced motion | `/tmp/eonfolk-afdc6e0-visual/laptop-keyboard-chronicle-evidence.png` | `a0b44074dfd65158629d7672e01f9a355eee1c1ee3082fc12c11eb16b6d92d52` |
| Settled direct-selection sheet | 390×844 DPR 3 emulation | `/tmp/eonfolk-afdc6e0-visual/mobile-direct-pick-settled.png` | `59132f775f335dc10858fc5806bc75fd9920d52e3150c39b73d0985d9e801b71` |
| Renderer failure after Follow | 390×844 DPR 3 emulation, reduced motion | `/tmp/eonfolk-afdc6e0-visual/mobile-renderer-fallback-follow.png` | `247282c718677ea283ebfcaa755c8dfde5e43ff082ddcb21dde2f7c7c15dbcf6` |

## Limitations and claim boundaries

- This was a fresh independent AI visual/accessibility review, not the required cohort of unfamiliar human observers.
- All viewport and mobile results are Chromium emulation on the M4 Pro. No physical phone, touch hardware, thermal soak, screen reader, or field network was tested.
- Visual capture used the pinned Chrome for Testing 151.0.7922.34 executable. The reviewer shell exposed Node 25.2.1 instead of the repository's Node 22.23.1 contract; the generated production asset hashes matched the coordinator artifact, and the separate coordinator DEEP run used Node 22.23.1.
- The exact-SHA performance artifact was inspected, not rerun by this reviewer. Its numerical samples are diagnostic because the run's own acceptance rule failed.
- Temporary screenshots are hash-identified above but are not retained by this commit.

## Required disposition

WAPR-VIS-001, WAPR-VIS-002, and WAPR-VIS-003 require correction and targeted independent confirmation against one new clean frozen SHA. The confirmation must again answer the exact inhabited-place question with standalone `YES`; automation, bundle success, or numerically passing samples cannot substitute for that verdict.
