# Product media provenance

These files are captures of the running local product. They are documentation
evidence, not concept art or generated UI.

## Source identity

- Product source: `9540593f9a58f0a014fd9f4366e666a1a0b3729c`.
- Capture date: 2026-08-24 Pacific.
- Browser cohort: Playwright Chromium revision 1234 / Chrome for Testing
  151.0.7922.34 on Apple Silicon macOS.
- Capture runtime: Node 22.23.1 arm64, pnpm 11.15.1, Playwright 1.62.1,
  and FFmpeg 8.1.1.
- The detached capture worktree was clean at the source commit. Its dependency
  and browser cohorts passed before capture.
- No remote page, model, image generator, third-party image, or post-production
  content was introduced.

## Files

| File | Dimensions / duration | Capture and transformation | SHA-256 |
|---|---|---|---|
| `eonfolk-world-source.jpg` | 1728×1117 | deterministic `/world` evidence capture, converted to JPEG without a content edit | `e108c989f9dd6383757f9b261c6fcc5f886fb41a19b84f97cf702dd72904886d` |
| `eonfolk-social-preview.png` | 1280×640 | center world crop `1728:864:0:126`, then exact Lanczos resize | `ac0e7782aaa55ee3e54786094682ea3a121d3b0559d3e70381eda21255e45a1c` |
| `eonfolk-sponsor-01-focus.jpg` | 1366×768 | passing sponsor journey with Mara selected in the embodied world | `91555344afa08914dc92afafab1df83c88cfec95eae402f59c6e1a308d670d81` |
| `eonfolk-chronicle-desktop.png` | 1366×957 | passing sponsor journey after counsel, consequence, reload, and Chronicle availability | `19601e8bfa321a1ab30a195b57ca701212f8fcce468c1da99f02d9741c31965f` |
| `eonfolk-chronicle-site-focus.png` | 1366×957 | passing Chronicle-to-workshop journey at the repaired 24 m building scale | `98f77511bf75ad414119e18023c627c0d264d4281f8d9321f3d21d35f9853009` |
| `eonfolk-world-mobile.png` | 390×1491 | passing typed mobile citizen focus and semantic-world journey | `6af82752c4d01dc047c1f411e7ac8883e0706d6aedbf1f4c6cd462e5e87dbaa5` |
| `eonfolk-sponsor-loop.mp4` | 960×540 / 16.00 s | complete 19.56 s passing sponsor journey uniformly compressed to 16 s, 30 FPS, H.264 CRF 24 | `8ecd7019729d9a26096c3b81e1fae613a92206d44e9197a07f0293fe7832640a` |
| `eonfolk-sponsor-loop.gif` | 640×360 / 16.01 s | same complete timeline, 8 FPS and 128-color palette for README playback | `0130f734fd2844fcab69884ed77623d60784221cccf217505f8a5356be0bcc57` |

The recording was not trimmed. FFmpeg applied one uniform `setpts` factor of
`1.22250000`; it preserves the complete order from living world through citizen
focus, sponsorship, intervention, independent outcome, reload, consequence,
and Chronicle. It is not presented as real-time pacing.

The stills came from `v1-browser-evidence` plus guarded capture points in the
same passing Playwright journeys. Each run used the repository route audit;
only the exact local production origin was allowed.

## Rights

These original captures and recordings are licensed under Apache-2.0 as
described in [third-party notices](../../THIRD_PARTY_NOTICES.md). The EONFOLK
name and mark remain reserved trademarks; the license permits copyright reuse
but does not grant trademark endorsement rights.
