# Public-readiness Markdown disposition audit

**Purpose:** Assign exactly one public-release disposition to every Markdown file
in the working tree.

**Status:** COMPLETE FOR THE PUBLIC-READINESS CHECKPOINT — rerun if Markdown is
added, removed, or renamed before the accepted candidate.

**Authority boundary:** This audit governs the sanitized public HEAD. The current
private engineering repository remains the evidence archive until final
attestation; therefore **ARCHIVE PRIVATELY** and **DELETE FROM HEAD** files remain
reachable only in that private archive and are excluded from the public export.

**Related documents:** [publication readiness](../../../PUBLICATION.md),
[code/history audit](public-readiness-code-history-audit.md), and
[reader documentation template](../../../../config/public/INDEX.md).

## Disposition meanings

- **KEEP:** publish at this path, or through the explicit template mapping shown
  in the export script.
- **CONSOLIDATE:** its durable current conclusions are represented in the public
  reader docs; do not publish the repetitive/internal source document.
- **ARCHIVE PRIVATELY:** retain for evidence, research provenance, or release
  auditability; never include it in the sanitized public HEAD.
- **DELETE FROM HEAD:** exclude obsolete handoff, generated inventory, or
  non-production concept material from the sanitized public HEAD. Preserve the
  existing bytes/history in the private archive.

## Coverage

| Disposition | Count |
|---|---:|
| ARCHIVE PRIVATELY | 64 |
| CONSOLIDATE | 37 |
| DELETE FROM HEAD | 3 |
| KEEP | 21 |
| **Total** | **125** |

## Exact file audit

| Markdown path | Disposition |
|---|---|
| `.github/pull_request_template.md` | KEEP |
| `AGENTS.md` | ARCHIVE PRIVATELY |
| `CHANGELOG.md` | KEEP |
| `CODE_OF_CONDUCT.md` | KEEP |
| `CONTRIBUTING.md` | KEEP |
| `FOUNDER_ALPHA_HANDOFF.md` | DELETE FROM HEAD |
| `GOAL.md` | ARCHIVE PRIVATELY |
| `PLAN.md` | ARCHIVE PRIVATELY |
| `README.md` | KEEP |
| `RESUME.md` | ARCHIVE PRIVATELY |
| `ROADMAP.md` | KEEP |
| `SECURITY.md` | KEEP |
| `SUPPORT.md` | KEEP |
| `THIRD_PARTY_NOTICES.md` | KEEP |
| `config/public/INDEX.md` | KEEP |
| `config/public/PUBLICATION.md` | KEEP |
| `config/public/RESEARCH.md` | KEEP |
| `docs/ACCESSIBILITY.md` | KEEP |
| `docs/ARCHITECTURE.md` | KEEP |
| `docs/DEVELOPMENT.md` | KEEP |
| `docs/GAMEPLAY.md` | KEEP |
| `docs/INDEX.md` | CONSOLIDATE |
| `docs/PERFORMANCE.md` | KEEP |
| `docs/PUBLICATION.md` | KEEP |
| `docs/RESEARCH.md` | CONSOLIDATE |
| `docs/TESTING.md` | KEEP |
| `docs/agentic/SKILL_LOCK.md` | ARCHIVE PRIVATELY |
| `docs/decisions/DECISIONS.md` | ARCHIVE PRIVATELY |
| `docs/decisions/OPEN_QUESTIONS.md` | ARCHIVE PRIVATELY |
| `docs/decisions/RISKS.md` | ARCHIVE PRIVATELY |
| `docs/design/ART_DIRECTIONS.md` | CONSOLIDATE |
| `docs/design/DESIGN.md` | CONSOLIDATE |
| `docs/design/INTERACTION.md` | CONSOLIDATE |
| `docs/design/MOBILE.md` | CONSOLIDATE |
| `docs/design/MOTION_SOUND.md` | CONSOLIDATE |
| `docs/design/concepts/README.md` | DELETE FROM HEAD |
| `docs/engineering/ARCHITECTURE.md` | CONSOLIDATE |
| `docs/engineering/COGNITION.md` | CONSOLIDATE |
| `docs/engineering/COST_MODEL.md` | CONSOLIDATE |
| `docs/engineering/DIAGNOSTICS.md` | CONSOLIDATE |
| `docs/engineering/FEEDBACK.md` | CONSOLIDATE |
| `docs/engineering/FOUNDER_ALPHA_RELEASE.md` | CONSOLIDATE |
| `docs/engineering/FRONTEND.md` | CONSOLIDATE |
| `docs/engineering/FRONTIER_TECH.md` | CONSOLIDATE |
| `docs/engineering/PERSISTENCE.md` | CONSOLIDATE |
| `docs/engineering/SECURITY.md` | CONSOLIDATE |
| `docs/engineering/SIMULATION.md` | CONSOLIDATE |
| `docs/exec-plans/IMPLEMENTATION_GOAL_PROMPT.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/PLANS.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/active/002-founder-alpha.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/active/003-v1-civilization.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/completed/001-foundation.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/completed/002-founder-alpha.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/evidence/001/operator-implementation-override.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/evidence/002/README.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/evidence/002/world-presence-clean-checkpoint.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/evidence/002/world-presence-override.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/evidence/003/public-readiness-code-history-audit.md` | ARCHIVE PRIVATELY |
| `docs/exec-plans/evidence/003/public-readiness-markdown-audit.md` | ARCHIVE PRIVATELY |
| `docs/game/AGENT_LIFE.md` | CONSOLIDATE |
| `docs/game/ECONOMY.md` | CONSOLIDATE |
| `docs/game/GAME_SYSTEMS.md` | CONSOLIDATE |
| `docs/game/GOVERNANCE.md` | CONSOLIDATE |
| `docs/game/WORLD_MODEL.md` | CONSOLIDATE |
| `docs/generated/REPO_INVENTORY.md` | DELETE FROM HEAD |
| `docs/media/README.md` | KEEP |
| `docs/product/CHRONICLE.md` | CONSOLIDATE |
| `docs/product/DISTRIBUTION.md` | CONSOLIDATE |
| `docs/product/HUMAN_LOOP.md` | CONSOLIDATE |
| `docs/product/OBSERVATORY.md` | CONSOLIDATE |
| `docs/product/PRODUCT.md` | CONSOLIDATE |
| `docs/product/PROGRESSION.md` | CONSOLIDATE |
| `docs/product/WORLD_STRUCTURE.md` | CONSOLIDATE |
| `docs/quality/EVALS.md` | CONSOLIDATE |
| `docs/quality/PERFORMANCE.md` | CONSOLIDATE |
| `docs/quality/QUALITY_BAR.md` | CONSOLIDATE |
| `docs/quality/TESTING.md` | CONSOLIDATE |
| `docs/quality/VISUAL_QA.md` | CONSOLIDATE |
| `docs/research/COMPETITORS.md` | ARCHIVE PRIVATELY |
| `docs/research/DEPENDENCY_COHORT.md` | CONSOLIDATE |
| `docs/research/DESIGN_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/DISTRIBUTION_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/FOUNDER_ALPHA_COGNITION_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/FOUNDER_ALPHA_DIAGNOSTICS_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/FOUNDER_ALPHA_PLATFORM_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/GAME_DESIGN_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/LOCAL_MODEL_LAB.md` | ARCHIVE PRIVATELY |
| `docs/research/MODEL_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/NAMING_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/PLAYER_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/PROPOSED_TOOLS.md` | ARCHIVE PRIVATELY |
| `docs/research/SOURCE_LEDGER.md` | ARCHIVE PRIVATELY |
| `docs/research/SYSTEMS_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/WORLD_AS_PRODUCT_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/WORLD_AS_PRODUCT_TECH_SPIKE.md` | ARCHIVE PRIVATELY |
| `docs/research/WORLD_PRESENCE_ASSET_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/research/WORLD_PRESENCE_RENDERER_SPIKE.md` | ARCHIVE PRIVATELY |
| `docs/research/WORLD_PRESENCE_SPATIAL_RESEARCH.md` | ARCHIVE PRIVATELY |
| `docs/reviews/CIVILIZATION_AMENDMENT_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/DESIGN_RED_TEAM.md` | ARCHIVE PRIVATELY |
| `docs/reviews/ENGINEERING_RED_TEAM.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FINAL_CONFIRMATION.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FINAL_READINESS.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FINAL_RED_TEAM.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FOUNDER_ALPHA_CI_EVIDENCE_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FOUNDER_ALPHA_COGNITION_RESEARCH_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FOUNDER_ALPHA_CONFIRMATION.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FOUNDER_ALPHA_DIAGNOSTICS_PRIVACY_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FOUNDER_ALPHA_PRODUCT_GAME_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FOUNDER_ALPHA_SYSTEMS_CORRECTNESS_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/FOUNDER_ALPHA_VISUAL_ACCESSIBILITY_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/GAME_RED_TEAM.md` | ARCHIVE PRIVATELY |
| `docs/reviews/GOAL_PROMPT_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/IMPLEMENTATION_FINAL_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/PLAYER_PERSPECTIVES.md` | ARCHIVE PRIVATELY |
| `docs/reviews/PRODUCT_RED_TEAM.md` | ARCHIVE PRIVATELY |
| `docs/reviews/WORLD_AS_PRODUCT_BASELINE.md` | ARCHIVE PRIVATELY |
| `docs/reviews/WORLD_AS_PRODUCT_CONFIRMATION.md` | ARCHIVE PRIVATELY |
| `docs/reviews/WORLD_AS_PRODUCT_FINAL_CONFIRMATION.md` | ARCHIVE PRIVATELY |
| `docs/reviews/WORLD_AS_PRODUCT_PRODUCT_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/WORLD_AS_PRODUCT_SYSTEMS_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/WORLD_AS_PRODUCT_VISUAL_REVIEW.md` | ARCHIVE PRIVATELY |
| `docs/reviews/ZERO_ANCHOR_CHALLENGE.md` | ARCHIVE PRIVATELY |
| `formal/README.md` | KEEP |
| `packages/persistence/README.md` | CONSOLIDATE |

## Validation rule

The sorted table contains 125 unique paths and one disposition per path. Before
the final export, compare it with `git ls-files '*.md' | sort`; any missing,
duplicate, or extra path blocks publication. The export's closed allowlist and
private denylist independently fail on an unclassified tracked path.
