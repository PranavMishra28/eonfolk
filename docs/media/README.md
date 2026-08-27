# Product media provenance

These files are captures of the running local product. They are documentation
evidence, not concept art or generated UI.

## Source identity

- Product source: `feat/product-v1-rescue` working tree captured on 2026-08-27
  Pacific, including the live-day continuation and first-session UI on this
  branch (parent `723d5721a3eb94f67fe232ab569fd4bae6864e32`).
- Capture date: 2026-08-27 Pacific.
- Browser cohort: Playwright Chromium on Apple Silicon macOS, production Vite
  preview at `http://127.0.0.1:4176`.
- Capture runtime: Node 22.23.1 arm64, pnpm 11.15.1, Playwright 1.62.1,
  FFmpeg 8.1.1, and cwebp.
- No remote page, model, image generator, third-party image, or post-production
  content was introduced. IndexedDB was reset before the first-session capture.

## Files

| File | Dimensions / duration | Capture and transformation | SHA-256 |
|---|---|---|---|
| `eonfolk-landing.webp` | 1366×768 | production `/` landing: Follow Mara Vale / Enter Dawnmere, WebP q85 | `d88acf35610452a009febea6a3be6ef89a829bedd45754bdf25a28aef19abc6a` |
| `eonfolk-world-source.jpg` | 1728×1117 | deterministic `/world` Day 1, eight people, JPEG q3 | `1573df1a207b8c27687c2f2e31da397ab1ae17b597c04a27bcba26dafad2b89b` |
| `eonfolk-social-preview.png` | 1280×640 | center world crop then Lanczos resize | `628ad01f92ed6cedf469fd2673d65e6b4770ef061311a8dc025e9e332cb41050` |
| `eonfolk-sponsor-01-focus.jpg` | 1366×768 | Mara selected at her first counsel boundary | `7fe86c16750e27ae326ef4a78deb984f9de0d10d49e2f0627adc5d8ee15e76a5` |
| `eonfolk-chronicle-desktop.png` | 1366×986 | after Check the stores: What happened / Review Chronicle | `b9c91e6e88c7b14896841c5b00df05451db08d6ad14b25670c63ca65b897196f` |
| `eonfolk-chronicle-site-focus.png` | 1366×986 | building-in-focus from the living Dawnmere camera | `7e8cc197030cfaa5cbdec6125a8794e65c5100504889cbf3d0ed66e6d6cfb9be` |
| `eonfolk-world-mobile.png` | 390×1722 | compact `/world` with Mara in focus, eight-person roster | `8e436554151fa3b3146d57de38fb28438c4a382f39101fa42889a1d836d96997` |
| `eonfolk-sponsor-loop.mp4` | 960×540 / 15.37 s | first-session recording: landing, living Dawnmere, counsel, Chronicle; H.264 CRF 24 | `d7644b4491786b39b00d571901411f72122bd60ff17e45b700c62fd5f613b11f` |
| `eonfolk-sponsor-loop.gif` | 640×360 / 15.33 s | same timeline, 6 FPS and 96-color palette for README playback | `4b1b9cc317b006e484abe9e4e8d0e5926c17bef4f62ce8a4ac243be68819ce54` |

The stills and recording came from a local production preview. Each run used a
deny-by-default route audit; only the exact local origin was allowed. The
recording is not presented as real-time pacing or as human playtest evidence.

## Rights

These original captures and recordings are licensed under Apache-2.0 as
described in [third-party notices](../../THIRD_PARTY_NOTICES.md). The EONFOLK
name and mark remain reserved trademarks; the license permits copyright reuse
but does not grant trademark endorsement rights.
