# Visual concept provenance

**Purpose:** Record the prompt contract, generation provenance, and review limits for the fifteen EONFOLK planning concepts.

**Status:** REVIEW SET — generated 2026-08-20; no concept is a production asset or style commitment until the independent visual review is reconciled.

**Authority boundary:** This manifest owns concept provenance only. [Art directions](../ART_DIRECTIONS.md) owns selection; [design research](../../research/DESIGN_RESEARCH.md) owns comparative evidence.

**Related documents:** [Design](../DESIGN.md), [mobile](../MOBILE.md), [visual QA](../../quality/VISUAL_QA.md), [source ledger](../../research/SOURCE_LEDGER.md).

## Generation contract

All images were generated with the built-in Codex Image Generation tool (`gpt-imagegen`, tool-reported software agent `gpt-image`, version `2.0`) without reference images. Prompts prohibited logos, readable UI text, photorealism, science-fiction technology, and production-asset use. Desktop frames requested 16:9; mobile frames requested 9:16 at a 390 × 844 composition target. The generated originals remain in the tool-managed provenance directory; these copies are the review set.

Every scene reused this world brief: a bounded medieval-fantasy Riverhold with a central well, timber houses, market, woodpile, farm edge, eight distinct ordinary adult citizens, world-dominant composition, and legible intimate stakes.

Direction clauses:

- **Hearthscale:** tactile handcrafted living miniature; carved wood and painted clay; warm readable faces; physical scale-model lighting; avoid generic plastic mobile-game styling.
- **Living Woodcut:** animated hand-carved woodblock print on warm paper; expressive gouged lines; rust, charcoal, moss, and river-blue inks; engraved silhouettes; Chronicle-native visual grammar.
- **Weathered Atlas:** painterly physical atlas on vellum; topographic river and terrain; integrated portrait vignettes and symbolic annotations; layered pigments.

Scene clauses:

- **Arrival:** dawn, high three-quarter camera, sponsored citizen crossing the bridge while residents carry water, trade, gather wood, and tend crops.
- **Social:** market activity, sponsored green-coated citizen selected with a subtle halo and relationship thread to an older carpenter; barter, argument, wood, crops, and observation remain visible.
- **Crisis:** stormy dusk, shortage, barricaded well, sponsored citizen and carpenter oppose one another at a public assembly; diverted channel and broken promise make the stakes legible.
- **Chronicle:** return after absence, rationed well reopened, relationship changed, water council formed; exactly three large causal beats and distinct notation for direct cause, contribution, and allegation.
- **Mobile:** portrait composition with the living world above, one identity card and three causal beats below; large targets, no dashboard tiles or horizontal overflow.

## Artifact ledger

| Direction | Scene | File | Tool output ID | SHA-256 |
|---|---|---|---|---|
| Hearthscale | Arrival | `hearthscale/arrival.png` | `exec-24f50e16-abd3-45ad-acb8-99a819c4459a` | `ae90c8f193137800e2e24eebbf8ad01083918a923ee5b847d10a2505a2c8030a` |
| Hearthscale | Social | `hearthscale/social.png` | `exec-188cc1a8-f971-46bb-a790-2dd1677d2267` | `4f6882a68ee40418b461284615319f9fc9cec3a02281e6285c4cab7f58652893` |
| Hearthscale | Crisis | `hearthscale/crisis.png` | `exec-3873123f-e8bf-4118-b13e-80e31e9c7b5a` | `1d17af00312f3e2c8ce680c1a5a4f4043134cadd1e086d1ee55721f5e107a425` |
| Hearthscale | Chronicle | `hearthscale/chronicle.png` | `exec-d2a1dcb3-111e-452e-9cdb-6d538db4db08` | `03fd5d4c6a2e49cceaadc4b395f7d568ec3a560f83db47e9e859937d7d54b6f0` |
| Hearthscale | Mobile | `hearthscale/mobile.png` | `exec-c227855b-c067-4ea8-8564-69320392d13d` | `1c99ec6b24bd51246b86a522b00c985bee31e6e93e588bbb2439c0cd8ad015da` |
| Living Woodcut | Arrival | `living-woodcut/arrival.png` | `exec-5b4ddf33-9439-4171-b8ac-032c5af0aae1` | `ab16f12b6e10276ceb7f40911d392f4a9d9214e548ee6d9713ec6db93b6f1ac0` |
| Living Woodcut | Social | `living-woodcut/social.png` | `exec-1b09d9f8-e9d4-4b75-8295-f73699ff7e05` | `b9aab9be5fe71cab9fe49de5ecb94cb135d9e5e42f940919ed94cfeb08ff373a` |
| Living Woodcut | Crisis | `living-woodcut/crisis.png` | `exec-121416d4-52b8-4199-b1f5-db1dbe0c3b7f` | `55927483c0586c5de2480e078e7adf63bd09db94c83a2cadb6b94a9a4cc4402e` |
| Living Woodcut | Chronicle | `living-woodcut/chronicle.png` | `exec-18291acb-b2df-47b7-894a-b3f9b0144aba` | `b5632e8746fb8da3d9b9b983f2f4978682b5b5fceda7a3b5494a5b760ed9fd29` |
| Living Woodcut | Mobile | `living-woodcut/mobile.png` | `exec-39fa6689-aa81-41e0-bd4e-d53c685f6240` | `6a9fdc695a55fbf42e1a79284c0fb1460e9c3bb80d4ccef7d218c61920a885da` |
| Weathered Atlas | Arrival | `weathered-atlas/arrival.png` | `exec-6c7df3c1-eb4f-4d5b-b182-df2c5c7d7d1f` | `fcfd0a46c2c3cfad8f47fc5af7478591dbb365afa789a6ba708cfb586441ba42` |
| Weathered Atlas | Social | `weathered-atlas/social.png` | `exec-ccb0b3d3-686f-45a9-97de-e51ce1566f63` | `fb49fda042880e4bba03a5e5ce58220ccc1645d86aade60ba654937abf0a81d2` |
| Weathered Atlas | Crisis | `weathered-atlas/crisis.png` | `exec-39ce8fd0-0848-4375-98bc-a38b43fca925` | `796c48a63ef851d8a4810854ba44b5f42114a7fa9e484aa67ffa4fe3d2181871` |
| Weathered Atlas | Chronicle | `weathered-atlas/chronicle.png` | `exec-c8ebd81e-8344-40c9-905d-449e505d66aa` | `893a47e98acb51d4ac81141bf74eb222e26d5ba5070b727197353d7888167fd7` |
| Weathered Atlas | Mobile | `weathered-atlas/mobile.png` | `exec-1e16f41f-41ca-4c07-a12e-9746c58b7aea` | `b952949a6afa454b32a605a590fdcae3d4d084d4102b432210a8b5b614b90db6` |

## Review limits

- Generated images are evidence of a visual proposition, not evidence that the production pipeline, performance budget, exact character count, or interaction hierarchy is achievable.
- Fine detail, incidental pseudo-text, faces, anatomy, counts, symbols, and causal notation require human inspection; no image establishes factual product behavior.
- Production assets must be authored through the approved pipeline. A concept may guide composition, palette, material, and hierarchy only.
