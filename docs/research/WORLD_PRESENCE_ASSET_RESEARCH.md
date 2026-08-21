# World-presence asset research

**Purpose:** Record primary-source licensing, package inspection, action coverage, provenance, and a bounded asset recommendation for embodied Riverhold.

**Status:** RESEARCH COMPLETE — recommendation is conditional on the renderer/animation spike and payload gate

**Authority boundary:** This document owns research evidence about candidate third-party visual assets. It does not approve a renderer, change the canonical simulation, authorize spending, or make runtime assets authoritative. The coordinator must reconcile adoption in the design, engineering, quality, decision, and execution authorities.

**Related documents:** [authority index](../INDEX.md), [design authority](../design/DESIGN.md), [art direction](../design/ART_DIRECTIONS.md), [frontend authority](../engineering/FRONTEND.md), [security](../engineering/SECURITY.md), [performance budgets](../quality/PERFORMANCE.md), [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md).

**Access date:** 2026-08-21

## Executive recommendation

Use a **curated, optimized KayKit prototype cohort** if and only if the renderer spike proves animation binding and the optimized payload passes the existing asset budgets:

1. KayKit Adventurers Free 2.0 for five base citizens, with the hooded Rogue variant and texture/outfit variation used to distinguish eight citizens. Reserve Ranger's silhouette and palette for Mara.
2. KayKit Character Animations Free 1.1 for the compatible `Rig_Medium` locomotion, tool, interaction, sitting/lying, and reaction clips.
3. KayKit Medieval Hexagon Free 1.0 for a small coherent Riverhold subset: homes, market, well, lumbermill, watermill, bridge, grain, river/road/ground tiles, trees, crates, barrel, and water bucket.
4. KayKit Resource Bits Free 1.0 for logs, planks, and a repair part; KayKit RPG Tools Bits Free 1.0 for axe, saw, hammer, anvil, and utility bucket.

This is the smallest reviewed combination that is simultaneously zero-cost, author-distributed, consistently CC0-marked in both package and source page, recognizably full-limbed, mobile-oriented, visually coherent across characters/environment/props, and broad enough for the release-blocking action graph. It is not ready to copy wholesale into the application.

The measured unoptimized source subset is **7,001,351 bytes (6.677 MiB across 64 files)**: 1.883 MiB characters, 3.657 MiB animation containers, 0.734 MiB environment, 0.268 MiB resources, and 0.134 MiB tools. That already exceeds the 6 MB desktop and 4 MB mobile asset budgets before any other world asset. Adoption therefore requires clip pruning, removal of mannequin geometry from animation containers, texture downsampling/compression, mesh optimization, output hashing, and measured desktop/mobile budgets. A budget miss rejects or reduces the cohort; it does not waive the budget.

Two serious alternatives remain:

- **Kenney Blocky Characters 2.0 + Fantasy Town Kit 2.0** is much smaller and has eighteen visually distinct citizens, but its 27 node-transform clips do not provide a skeletal retarget seam or enough distinct settlement-work behaviors. It is the payload fallback if the KayKit binding/optimization spike fails.
- **Quaternius Universal Base Characters + Modular Character Outfits — Fantasy + Universal Animation Libraries 1 and 2** has the strongest named animation coverage and exact 65-joint compatibility, but the four inspected archives total about 458 MB, the base page reports about 13k triangles per character, and the free outfit path requires head/body assembly. It is too much conversion and integration risk for the solo Founder Alpha boundary unless a measured spike proves a very small curated runtime output.

`WP-ASSET-001` is therefore **PRODUCT HYPOTHESIS:** the KayKit cohort can pass action readability and the payload budget after deterministic pruning. Falsify it quickly by animating Ranger with one locomotion, carry, work, talk/listen, exchange, repair, sit/eat, and reaction sequence in the selected renderer, then measure the exact optimized output.

## License interpretation

All selected candidates associate their packs with [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Creative Commons states that users may copy, modify, distribute, and perform a CC0 work, including commercially, without asking permission. Attribution is not a CC0 condition. CC0 does not waive third-party patent or trademark rights, grants no warranty, and does not clear publicity/privacy or other third-party rights. This is a provenance and copyright-compatibility review, not legal clearance.

Kay Lousberg's package files say credit is optional. The KayKit pages also request that users not resell unmodified copies or claim the assets as their own. That request is not expressed as a condition in the included CC0 notice, but EONFOLK should respect it: redistribute only the curated runtime subset as part of the game, preserve the source license and provenance, do not market a raw asset bundle, and do not imply endorsement. Kenney likewise says attribution is optional and asks users not to use the Kenney logo for their own projects. Quaternius package notices identify CC0 and request optional Patreon support.

Voluntary product credit is recommended even though attribution is not required:

> Selected prototype assets by Kay Lousberg (KayKit), used under CC0 1.0. Modified and optimized for EONFOLK.

## Package inspection method and boundary

The package findings below are **VERIFIED FACT** from author-controlled source pages and fresh official downloads on 2026-08-21. The inspection:

- downloaded only from `kaylousberg.itch.io`, `quaternius.itch.io`, `quaternius.com`/its linked Drive folder, and `kenney.nl`; no marketplace mirror or third-party repository was trusted;
- computed SHA-256 before extraction;
- ran ZIP integrity checks and enumerated every path before extraction;
- found no absolute path, `..` traversal, symlink, executable, install script, shell script, dynamic library, package, disk image, or JavaScript/Python/Ruby payload in the twelve downloaded archives;
- parsed 524 textual glTF files and inspected 1,142 external buffer/image URIs; none used HTTP(S), `file:`, an absolute path, or `..` traversal;
- parsed GLB JSON metadata to enumerate animation names, skeletons, meshes, skins, and file sizes without executing model content; and
- extracted only under a disposable `/tmp` directory. No downloaded binary enters this branch.

This does not prove author ownership, absence of latent parser bugs, aesthetic fit in Riverhold, correct runtime animation retargeting, or safety of opening a `.blend` file with script execution enabled. Treat all model files as untrusted data and preserve the same checks on reacquisition.

The included license-file checksums provide an exact package-level evidence anchor. Different hashes across KayKit packs reflect different human-readable notices; all inspected notices name CC0 1.0. Quaternius' Animation Library 1 and 2 notices are byte-identical. Kenney's notices are pack-local copies of its CC0 asset notice.

| Package | Included license path | License-file SHA-256 |
|---|---|---|
| KayKit Adventurers Free 2.0 | `KayKit_Adventurers_2.0_FREE/License.txt` | `d4adc31660d1db22eb60eba648e01db41577548f6fa1a3576cb4a6283dae0a58` |
| KayKit Character Animations Free 1.1 | `KayKit_Character_Animations_1.1/License.txt` | `373b159044d1a886ed15f57ca5a7673ba14e2623c460283452705f2056912ed9` |
| KayKit Medieval Hexagon Free 1.0 | `KayKit_Medieval_Hexagon_Pack_1.0_FREE/License.txt` | `18c35a487baeffbdbe8256c0c7154a688321fe955b351c78773fab0a978cc02c` |
| KayKit Resource Bits Free 1.0 | `KayKit_ResourceBits_1.0_FREE/License.txt` | `cfeda9f60f4c03bb8b342ab4448c944ea5dccc84cd697b4b8eaedcdaa46fcc34` |
| KayKit RPG Tools Bits Free 1.0 | `KayKit_RPGToolsBits_1.0_FREE/License.txt` | `a0d34adb9fddc83036bd28cef791b05edf2108ebcce7f75539d16ad1f01d76ee` |
| KayKit Forest Nature Free 1.0 | `KayKit_Forest_Nature_Pack_1.0_FREE/License.txt` | `987811fa42c7548ad487324531813b0210ee6d1ebd410089e881820630e3be54` |
| Quaternius Universal Base Characters Standard | `Universal Base Characters[Standard]/License_Standard.txt` | `0f4beaf0fe360a7732e58bbe3dbf60a2422367fbea60cb9ea4add968f383268e` |
| Quaternius Modular Character Outfits — Fantasy Standard | `Modular Character Outfits - Fantasy[Standard]/License_Standard.txt` | `2202cc2f608c4210790b112e5f121bc2e7f8dced7b5b1c7f4be6203461bdebbb` |
| Quaternius Universal Animation Library Standard | `Universal Animation Library[Standard]/License.txt` | `6d01f55c6e4c49a2c9963e147e561945ae2c83958c8ca667d90a6bffdbfac061` |
| Quaternius Universal Animation Library 2 Standard | `Universal Animation Library 2[Standard]/License.txt` | `6d01f55c6e4c49a2c9963e147e561945ae2c83958c8ca667d90a6bffdbfac061` |
| Kenney Blocky Characters 2.0 | `License.txt` | `610fec89c16826112e9d6b80497b726c43fea0e42c9cd9d7cb081f8ad550c0ec` |
| Kenney Fantasy Town Kit 2.0 | `License.txt` | `fb8e4817197ef9f62215e95b4451a0f09c769c8e03e416e3a2ce108dfa6117e4` |

## Candidate inventory

### KayKit packages

| ID | Pack, author, source | Download inspected | License / terms | Formats and contents | Security and fit |
|---|---|---|---|---|---|
| WP-KAY-CHAR | [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers), Kay Lousberg | Free 2.0; itch upload `15363167`; 13,024,345 bytes; SHA-256 `abe48f4763fba0896bab486ee9e6d08ca6b5b3884b9601f235c8847ae94dc479`; 266 entries / 23,027,118 uncompressed bytes | Included `License.txt` and source page: CC0; attribution optional; page asks against raw resale or false authorship | FBX, glTF/GLB, OBJ, PNG. Five base characters; archive contains six full-limbed GLBs (`Knight`, `Barbarian`, `Ranger`, `Mage`, `Rogue`, `Rogue_Hooded`) plus accessories. Five character textures, one skin per GLB, 23 named rig joints | No risky archive entries. Official page says mobile-suitable and one 1024 atlas per character, downsampleable to 128. **Selected**, subject to binding/payload spike |
| WP-KAY-ANIM | [KayKit Character Animations](https://kaylousberg.itch.io/kaykit-character-animations), Kay Lousberg | Free 1.1; itch upload `15799903`; 14,858,957 bytes; SHA-256 `65882f31f905ad2e953819648a59287cdeab8f623908d5ef701971d3758be20f`; 48 entries / 42,942,585 uncompressed bytes | Included `License.txt` and page: CC0; attribution optional | FBX and GLB; official page reports 161 animations for `Rig_Medium` and `Rig_Large`. Archive has fourteen animation GLBs plus two mannequins | No risky entries. Character and animation skeletons have the same 23 joint names but a different array order, so the official compatibility claim still needs a real renderer binding test. **Selected** |
| WP-KAY-WORLD | [KayKit Medieval Hexagon](https://kaylousberg.itch.io/kaykit-medieval-hexagon), Kay Lousberg | Free 1.0; itch upload `10278234`; 35,251,508 bytes; SHA-256 `4fbb374c45732c88522bd3439e9415bf568c683236ede336b4e61d161155ba12`; 1,545 entries / 64,737,317 uncompressed bytes | Included `License.txt` and page: CC0; attribution optional | FBX, glTF, OBJ. 221 glTF models in the free archive, including homes, market, blacksmith, lumbermill, watermill, windmill, well, grain, bridge, road/river/ground tiles, trees, crates, barrel, and water bucket; one repeated shared gradient texture | No risky entries or remote glTF URIs. Coherent and lower-integration than assembling a modular building kit. **Selected as a strict subset** |
| WP-KAY-RESOURCE | [KayKit Resource Bits](https://kaylousberg.itch.io/resource-bits), Kay Lousberg | Free 1.0; itch upload `13266824`; 8,520,574 bytes; SHA-256 `7056f1310896a4612a67703fd6d5af389fcccdeb46df0a89e2322aa8e3bcfcf7`; 473 entries / 17,618,275 uncompressed bytes | Included `License.txt` and page: CC0; attribution optional | 76 glTF models plus FBX/OBJ: logs, log stacks, planks, metals, stone, textiles, fuel, and repair parts. The free tier does not include the page's paid food/container extras | No risky entries. **Selected only for logs, planks, and one repair part** |
| WP-KAY-TOOLS | [KayKit RPG Tools Bits](https://kaylousberg.itch.io/rpg-tools-bits), Kay Lousberg | Free 1.0; itch upload `15653196`; 3,885,168 bytes; SHA-256 `a17c2a54df93d525e90d960baf3c68638defb4f424e204ceead6ea1f89e9c7dd`; 346 entries / 7,064,764 uncompressed bytes | Included `License.txt` and page: CC0; attribution optional | 49 glTF models plus FBX/OBJ: axe, hammer, saw, pickaxe, shovel, anvil, bucket, hand tools, lantern, maps, and blueprints | No risky entries. The page explicitly links the tools to 28 tool animations in the current animation pack. **Selected as a strict subset** |
| WP-KAY-NATURE | [KayKit Forest Nature](https://kaylousberg.itch.io/kaykit-forest), Kay Lousberg | Free 1.0; itch upload `13520330`; 6,435,630 bytes; SHA-256 `2ee83e63bb7695f2d884ec27ddf6fce020789a452e7d5c5b0bbdfc4f6ea1fc8c`; 649 entries / 11,719,553 uncompressed bytes | Included `License.txt` and page: CC0; attribution optional | 105 glTF models plus FBX/OBJ in the free archive; trees, bushes, grass, and rocks sharing a gradient texture | No risky entries. **Rejected for Founder Alpha** because Medieval Hexagon already contains enough coherent vegetation; adding this pack increases provenance and payload without closing a gate |

### Quaternius packages

| ID | Pack, author, source | Download inspected | License / terms | Formats and compatibility | Security and fit |
|---|---|---|---|---|---|
| WP-QUAT-BASE | [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html), Quaternius | Standard; itch upload `15861669`; 128,968,391 bytes; SHA-256 `fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40`; 128 entries / 132,571,039 uncompressed bytes | Included `License_Standard.txt` and page: CC0; attribution not required by CC0 | FBX and glTF. Page describes six bases and about 13k triangles on average; inspected Standard archive exposes male/female Superhero bodies plus hair assets. One 65-joint humanoid skin per body | No risky entries. Bare base bodies are not settlement-ready without outfits. Payload and assembly burden are higher than KayKit. **Rejected for Founder Alpha** |
| WP-QUAT-OUTFIT | [Modular Character Outfits — Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html), Quaternius | Standard; itch upload `16289385`; 294,347,394 bytes; SHA-256 `c3468b18871cc8c8f05ab14df7712baf22cb9f389cbd870babf130e595187f70`; 136 entries / 305,995,429 uncompressed bytes | Included `License_Standard.txt` and page: CC0 | FBX and glTF. Standard archive has male/female Peasant and Ranger outfits plus modular parts. Included readme says only the base head should be combined with clothing to prevent clipping. Outfit and Base glTFs have the same 65 joints in the same order | No risky entries or remote glTF URIs. Strong silhouette potential but a very large texture-heavy source cohort and nontrivial assembly/optimization path. **Rejected for the bounded slice** |
| WP-QUAT-UAL1 | [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html), Quaternius | Standard; itch upload `17958403`; 15,904,933 bytes; SHA-256 `cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724`; 12 entries / 63,648,179 uncompressed bytes | Included `License.txt` and page: CC0 | FBX and GLB, root-motion and no-root-motion variants. Parsed Standard GLB has 43 clips and a 65-joint humanoid skin | No risky entries. Covers idle, walk, jog, sprint, talk, interact, pickup, kneeling repair, push, sit, hit, and death. Exact joint names/order match UAL2 and the inspected outfits. **Strong but not selected** |
| WP-QUAT-UAL2 | [Universal Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html), Quaternius | Standard; itch upload `17958478`; 18,735,003 bytes; SHA-256 `4008ea208a604773a2b2177d965f0f5d3195498b5bf838c3f5785d68e95f2a68`; 19 entries / 72,807,306 uncompressed bytes | Included `License.txt` and page: CC0 | FBX/GLB plus a female mannequin `.blend`; root-motion and no-root-motion variants. Parsed Standard GLB has 43 clips on the same 65-joint rig | No risky entries. Covers consume, harvest, plant, water, chop, walk-carry, throw, and yes/emotional reaction. Excellent semantic coverage, but useful only after the heavier compatible character cohort is integrated. **Strong but not selected** |
| WP-QUAT-LEGACY | [Ultimate Animated Character Pack](https://quaternius.com/packs/ultimatedanimatedcharacter.html), Quaternius | Official page and linked Drive folder inspected; no archive retained or hashed. The folder exposes FBX, OBJ, Blend, and `License.txt`; the license file is 364 bytes and states CC0 | Official page and Drive license: CC0 | November 2019; 52 characters; FBX, OBJ, Blend; public page does not enumerate clip names or claim compatibility with the current Universal rig | Author-controlled but old, no official glTF option, and unknown action coverage without deeper DCC inspection. **Rejected** in favor of the current Universal family or KayKit |
| WP-QUAT-WORLD | [Medieval Village MegaKit](https://quaternius.com/packs/medievalvillagemegakit.html), [Fantasy Props MegaKit](https://quaternius.com/packs/fantasypropsmegakit.html), and [Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html), Quaternius | Source-page metadata inspected; binaries not retained | Pages mark all tiers CC0. Free Standard tiers expose 60–70% of each pack | Village: 304 modular models. Props: 211 low-poly models using four texture sets. Nature: 116 models. FBX/OBJ/glTF; paid Source tiers add engine projects/collisions/shaders | Broad and high quality, but assembling a village from hundreds of modular parts is more solo work than selecting ready-made KayKit buildings. **Rejected for the first cohort; revisit after the presence gate** |

### Kenney packages

| ID | Pack, author, source | Download inspected | License / terms | Formats and contents | Security and fit |
|---|---|---|---|---|---|
| WP-KEN-CHAR | [Blocky Characters](https://kenney.nl/assets/blocky-characters), Kenney | Version 2.0; [official archive](https://kenney.nl/media/pages/assets/blocky-characters/8369c0cf30-1749547469/kenney_blocky-characters_20.zip); 2,148,510 bytes; SHA-256 `5e123859aa0c1598342b600c6db197024a1d63eb9ec531398b310725f589887e`; 158 entries / 12,858,189 uncompressed bytes | Included `License.txt`, pack page, and [Kenney support](https://kenney.nl/support): CC0; attribution optional; do not use Kenney's logo as project branding | 18 characters in FBX, OBJ, and GLB plus textures. Every GLB is about 113.5 KB and contains 27 named animation clips but no glTF `skin`; motion is applied to block-part nodes | No risky entries. Very small, highly legible, and visually distinct. Lack of a skeleton blocks clean retargeting, while clip coverage relies heavily on generic `interact`, `pick-up`, `holding-*`, `sit`, and `emote-*`. **Payload fallback, not first choice** |
| WP-KEN-WORLD | [Fantasy Town Kit](https://kenney.nl/assets/fantasy-town-kit), Kenney | Version 2.0; [official archive](https://kenney.nl/media/pages/assets/fantasy-town-kit/efe948d309-1754222374/kenney_fantasy-town-kit_2.0.zip); 3,854,691 bytes; SHA-256 `1a7530c09f4d2fa2cdee259876f089334f8b1f27fa86a0c4f54ef86cdd8676ef`; 856 entries / 10,647,704 uncompressed bytes | Included `License.txt` and page: CC0; attribution optional | 167 GLBs plus FBX/OBJ, textures, and previews. Modular walls, roofs, roads, trees, market stalls, carts, fountain, fences, and furniture-like pieces | No risky entries. Excellent payload but no authored well/lumbermill/watermill/resource/tool cohort; building assembly and cross-pack props remain. **Fallback environment** |

## Animation/action coverage

The labels below describe source clip coverage, not acceptance of the resulting animation in Riverhold. A bilateral exchange, for example, still requires spatial rendezvous, facing, synchronized timing, prop ownership transfer, and canonical-event correlation.

| Required state | KayKit selected cohort | Quaternius Universal cohort | Kenney Blocky | Result |
|---|---|---|---|---|
| Idle | `Idle_A`, `Idle_B` | `Idle_Loop`, `Idle_No_Loop`, folded-arms/lantern idles | `idle` | All covered |
| Walk | `Walking_A/B/C` | `Walk_Loop`, `Walk_Formal_Loop`, jog/sprint | `walk`, `sprint` | All covered |
| Carry | `Holding_A/B/C`; no named walk-carry clip | `Walk_Carry_Loop`, push, lantern idle | `holding-*`; no combined walk-carry clip | KayKit/Kenney need a measured layered or attached-prop treatment |
| Gather | `Chopping`, `Digging`, `Pickaxing`, `Working_*` | `Farm_Harvest`, `Farm_PlantSeed`, `Farm_Watering`, `TreeChopping_Loop` | `interact-*`, `pick-up` only | KayKit and Quaternius strong |
| Inspect | `Use_Item`, `Interact`, `Holding_*` | `Interact`, `Chest_Open`, folded-arms/yes | generic `interact-*` | All usable; no dedicated inspect clip |
| Talk/listen | `Waving`, `Idle_*`, `Interact`; no named talk/listen clips | `Idle_Talking_Loop`, `Sitting_Talking_Loop`, idle | `emote-yes/no`, idle | Quaternius strongest; KayKit needs facing/head-look plus role-specific state |
| Exchange | `PickUp`, `Throw`, `Interact`, hand slots | `Interact`, `PickUp_Table`, `OverhandThrow`, carry | `pick-up`, `holding-*`, `interact-*` | No pack supplies the full bilateral choreography; implementation owns it |
| Repair | `Hammering`, `Sawing`, `Working_*` | `Fixing_Kneeling` | generic `interact-*` | KayKit strongest for visible tool use |
| Eat/rest | `Use_Item`, chair/floor sit and lie clips; source page says eating/drinking clips are still planned | `Consume`, sitting and `LayToIdle` | `sit`, `holding-*` | KayKit needs a prop-to-mouth treatment or a tiny authored clip; Quaternius strongest |
| Emotional reaction | `Cheering`, `Hit_*`, `Waving`, death poses | `Yes`, hit/knockback, dance, death | `emote-yes/no`, `die` | All minimally covered |

### KayKit binding facts and gap

The inspected Ranger and `Rig_Medium_Tools` GLBs each expose one skin with the same 23 joint names, including `handslot.l` and `handslot.r`. Their joint arrays are ordered differently. The source page explicitly says current Adventurers models are compatible with KayKit Character Animations, but that does not prove a PlayCanvas asset can bind external animation channels to the character instance without a conversion step.

The renderer spike must therefore demonstrate all of the following before assets are adopted:

1. A single optimized character GLB accepts clips extracted from all four selected animation groups without duplicating a mannequin mesh.
2. Bone-name/path binding is deterministic despite source array-order differences.
3. A carried prop can bind to a hand slot while locomotion plays without severe arm/prop clipping.
4. A tool clip, sit/rest clip, and reaction clip transition without visible T-pose or scale/orientation jumps.
5. Eight simultaneous characters stay within the measured desktop/mobile frame and asset budgets.

If any of those fails materially, use the Kenney fallback for the presence proof or run one bounded Quaternius Universal experiment; do not create a bespoke animation pipeline inside Founder Alpha.

## Curated KayKit source subset

The measured 64-file source estimate used five character GLBs, four animation containers, and these glTF assets with their referenced `.bin` and texture files:

- Environment: green home A, market, lumbermill, watermill, well; neutral grain and bridge A; water bucket, barrel, small crate, single tree A, grass hex, river A hex, and road A hex.
- Resources: `Wood_Log_A`, `Wood_Log_Stack`, `Wood_Plank_A`, and `Parts_Cog`.
- Tools: axe, hammer, saw, metal bucket, and anvil.
- Characters: Ranger, Rogue, Mage, Barbarian, and Knight. The hooded Rogue variant may replace rather than add a sixth base mesh.
- Animation containers: `MovementBasic`, `General`, `Tools`, and `Simulation` for `Rig_Medium`.

This list is an upper-bound source selection, not a runtime copy list. A runtime manifest must name individual retained clips and optimized output hashes. It must not ship unused FBX/OBJ duplicates, preview images, paid-tier content, source URLs, cookies, signed links, or full source archives.

Mara's distinctness should come from a unique Ranger silhouette, fixed palette, a small authored emblem/material variant, and consistent name/semantic DOM identity. Do not use a giant world marker to compensate for indistinguishable citizens.

## Provenance manifest template

Create one record per source archive and one record per emitted runtime artifact. JSON or YAML is acceptable if schema-validated; the fields below are mandatory.

```yaml
asset_id: vendor-kaykit-adventurers-free-2-0
role: citizen-character-source
title: KayKit Adventurers
author: Kay Lousberg
canonical_source_url: https://kaylousberg.itch.io/kaykit-adventurers
acquisition_url: https://kaylousberg.itch.io/kaykit-adventurers/purchase
acquisition_mechanism: itch-free-upload
upload_id: "15363167"
source_tier: FREE
source_version: "2.0"
accessed_at: "2026-08-21"
source_filename: kaykit-adventurers-free-2.0.zip
source_bytes: 13024345
source_sha256: abe48f4763fba0896bab486ee9e6d08ca6b5b3884b9601f235c8847ae94dc479
license_expression: CC0-1.0
license_source_url: https://creativecommons.org/publicdomain/zero/1.0/
license_file_in_archive: KayKit_Adventurers_2.0_FREE/License.txt
license_file_sha256: d4adc31660d1db22eb60eba648e01db41577548f6fa1a3576cb4a6283dae0a58
attribution_required: false
voluntary_credit: Kay Lousberg (KayKit)
redistribution_note: curated game assets only; never an unmodified asset bundle
selected_source_paths:
  - KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb
transform:
  tool: REQUIRED_AT_ADOPTION
  command: REQUIRED_AT_ADOPTION
  changes:
    - prune unused meshes, materials, and clips
    - downsample and compress textures
    - optimize mesh and animation data
runtime_outputs:
  - path: apps/web/public/assets/vendor/kaykit/ranger.glb
    bytes: REQUIRED_AT_ADOPTION
    sha256: REQUIRED_AT_ADOPTION
    retained_clips: [Idle_A, Walking_A]
security_review:
  archive_integrity: PASS
  path_and_symlink_audit: PASS
  executable_and_script_audit: PASS
  external_uri_audit: PASS
  parser_toolchain_review: REQUIRED_AT_ADOPTION
reviewed_by: REQUIRED_AT_ADOPTION
approved_in_commit: REQUIRED_AT_ADOPTION
```

Retain a plain-text copy of each source license adjacent to the provenance manifest, even though CC0 does not require attribution. Do not add a repository-wide application license merely to document third-party assets.

## Exact acquisition and checksum workflow

1. Create a disposable directory with `mktemp -d`; never download into the repository or a tracked worktree.
2. Open the canonical author page and record title, author, tier, visible version, size, license, and access date. Reject marketplace mirrors and reuploads.
3. Download the named free archive through the author page. Itch signed storage URLs and cookies are short-lived secrets-by-capability: never log or commit them. Record the stable page, tier, upload ID, and file label—not the signed URL.
4. Before extraction, run `file`, `shasum -a 256`, `unzip -tq`, `zipinfo -1`, and `zipinfo -l`. Reject absolute paths, `..` segments, symlinks, executable/install/script extensions, unexpected nested archives, or an integrity failure.
5. Extract only into a new child of the disposable directory. Read the included license and compute its SHA-256. Confirm that package and author page agree.
6. Parse every glTF/GLB URI. Reject remote URLs, `file:` URLs, absolute paths, traversal, data not referenced by the selected model, and unsupported extensions. Do not let the loader fetch arbitrary network resources.
7. Prefer glTF/GLB over FBX/OBJ and do not open `.blend` files for this slice. If a DCC is ever required, use an isolated profile, disable script auto-run, and review the file before enabling any embedded script.
8. Copy only the allowlisted source models into a scratch conversion directory. Pin the conversion tool and its transitive dependency cohort; run it without credentials, network, plugins, or install scripts.
9. Emit a minimal GLB per reusable mesh/rig plus pruned animation data. Downsample/compress textures and optimize meshes only with deterministic commands recorded in the manifest.
10. Compute each output's SHA-256 and byte size. Run visual, skeleton/clip-name, no-egress, accessibility, and desktop/mobile payload/frame checks. A mismatch or budget failure blocks adoption.
11. Commit only reviewed optimized outputs, source license copies, and the completed provenance manifest. Never commit source ZIPs, cookies, signed URLs, full paid/source tiers, duplicate formats, preview marketing images, or conversion caches.
12. Delete the disposable directory. Reacquisition must reproduce the recorded source hash; a hash change requires a new versioned provenance record and fresh review, not an in-place overwrite.

## Objections, uncertainties, and reopen triggers

### Objections

- KayKit's free Adventurers silhouettes read as fantasy classes rather than ordinary settlers. Palette changes and removal of combat accessories may be enough for a prototype, but the visual reviewer must judge dashboard-free settlement plausibility.
- Five base characters plus one hood variant are fewer than eight citizens. Reuse is acceptable only if hair/headgear/palette and semantic identity keep individuals legible; clone-like citizens fail the World Presence Gate.
- The chosen animation pack lacks named talk, listen, exchange, and eat/drink clips. Spatial choreography, facing, prop transfer, and a tiny authored/procedural layer must create distinct semantic states without implying false authoritative results.
- The unoptimized subset already exceeds both asset budgets. Optimization is a blocking engineering task, not polish.
- CC0 is not a warranty of title or a trademark/publicity clearance. Avoid vendor logos, endorsement claims, and source marketing art in the product.

### Uncertainties

- **UNRESOLVED WP-U-001:** external KayKit animation binding and clip pruning behavior in the selected PlayCanvas React path.
- **UNRESOLVED WP-U-002:** final optimized bytes, decode time, GPU memory, animation CPU cost, and eight-/twelve-citizen frame time.
- **UNRESOLVED WP-U-003:** whether KayKit's class-coded outfits can be recontextualized as Riverhold residents without bespoke character art.
- **UNRESOLVED WP-U-004:** whether carry locomotion can look natural with a hand-slot prop using existing clips.
- **UNRESOLVED WP-U-005:** whether one very small authored eat/talk layer is cheaper than accepting generic animation reuse; this must not expand into an animation-production pipeline.

### Reopen or abandon the selection when

1. the renderer cannot bind and blend the KayKit clips without per-character manual repair;
2. the optimized desktop cohort exceeds 6 MB or mobile cohort exceeds 4 MB, or meaningful display/frame budgets fail;
3. eight citizens remain clone-like or Mara is not recognizable without a giant marker;
4. a ten-second observer cannot distinguish several physical tasks and one interaction;
5. a package hash/license changes on reacquisition; or
6. the independent visual/product reviewer does not answer YES that Riverhold feels inhabited and alive.

## Proposed source-ledger rows

The coordinator owns `SOURCE_LEDGER.md` and should assign final `S-*` identifiers. These rows are proposed evidence, not edits to the shared ledger.

| Proposed key | Claim supported | Primary URL | Accessed | Class | Confidence | Consumers |
|---|---|---|---|---|---|---|
| S-PROPOSED-WP-001 | CC0 permits copy, modification, and distribution without required attribution, while excluding trademark/patent warranties | [Creative Commons CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/) and [legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode.en) | 2026-08-21 | A | High | asset research, security, release, provenance |
| S-PROPOSED-WP-002 | Current KayKit Adventurers are full-rigged low-poly characters compatible with KayKit Character Animations, CC0, FBX/glTF, and mobile-oriented | [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) | 2026-08-21 | A | High | design, frontend, ExecPlan |
| S-PROPOSED-WP-003 | Current KayKit Character Animations provides 161 humanoid animations across general, movement, simulation, and tool sets under CC0 | [KayKit Character Animations](https://kaylousberg.itch.io/kaykit-character-animations) | 2026-08-21 | A | High | frontend, quality, ExecPlan |
| S-PROPOSED-WP-004 | KayKit Medieval Hexagon, Resource Bits, RPG Tools, and Forest Nature are CC0 low-poly glTF/FBX/OBJ cohorts | [Medieval Hexagon](https://kaylousberg.itch.io/kaykit-medieval-hexagon), [Resource Bits](https://kaylousberg.itch.io/resource-bits), [RPG Tools](https://kaylousberg.itch.io/rpg-tools-bits), [Forest Nature](https://kaylousberg.itch.io/kaykit-forest) | 2026-08-21 | A | High | design, frontend, provenance |
| S-PROPOSED-WP-005 | Quaternius Universal characters/outfits and Animation Libraries 1/2 use compatible humanoid rigs and are CC0 | [Base Characters](https://quaternius.com/packs/universalbasecharacters.html), [Fantasy Outfits](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html), [UAL1](https://quaternius.com/packs/universalanimationlibrary.html), [UAL2](https://quaternius.com/packs/universalanimationlibrary2.html) | 2026-08-21 | A | High | design research, fallback decision |
| S-PROPOSED-WP-006 | Quaternius current village, props, and nature kits offer CC0 glTF cohorts but at much broader modular scope | [Medieval Village](https://quaternius.com/packs/medievalvillagemegakit.html), [Fantasy Props](https://quaternius.com/packs/fantasypropsmegakit.html), [Stylized Nature](https://quaternius.com/packs/stylizednaturemegakit.html) | 2026-08-21 | A | High | design research, fallback decision |
| S-PROPOSED-WP-007 | Kenney Blocky Characters and Fantasy Town Kit are CC0; attribution is optional | [Blocky Characters](https://kenney.nl/assets/blocky-characters), [Fantasy Town Kit](https://kenney.nl/assets/fantasy-town-kit), [Kenney support](https://kenney.nl/support) | 2026-08-21 | A | High | payload fallback, provenance |

## Constraint fit

- **Solo builder / 40–60 hours:** the KayKit family avoids cross-rig retargeting and modular building assembly, but only if the spike yields a reusable automated clip/asset pipeline. Manual repair of every citizen is a stop condition.
- **MacBook M4 Pro / no owned GPU:** all acquisition, conversion, and testing can run locally; no training or GPU service is required.
- **Approximately $0 / no unapproved spend:** every selected source is the free Standard/FREE tier. Paid EXTRA/SOURCE content is explicitly excluded.
- **Free V1 / no commercial dependency:** CC0 permits the prototype use without ongoing vendor service, account, key, proprietary dataset, or partnership.
- **No training/fine-tuning:** generated or trained assets are unnecessary. The inspected KayKit pages mark the selected packs as created without generative AI, but that label is not a product requirement.
- **Security:** acquisition is data-only from author-controlled HTTPS sources; runtime receives only allowlisted, optimized, locally hashed outputs with no external fetches or executable content.

The selection remains a prototype bootstrap, not EONFOLK's permanent art identity. Bespoke Riverhold citizens and authored motions may replace these assets later without changing Reality or the WorldPresentation/SpatialProjection contract.
