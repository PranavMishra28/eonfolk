# Trusted agent-skill lock

**Purpose:** Record the agent instruction packages actually trusted during the bootstrap run as executable supply-chain inputs.

**Status:** ACTIVE — append only when another skill is read and used

**Authority boundary:** This file records provenance and permission risk; repository dependencies remain owned by the lockfile and dependency evidence.

**Related documents:** [security](../engineering/SECURITY.md), [tool inventory](../research/PROPOSED_TOOLS.md), [development status](../../PLAN.md).

| Skill | Package identity | Instruction SHA-256 | License | Intended use | Permissions and security notes | Reviewed |
|---|---|---|---|---|---|---|
| GitHub | `openai-curated-remote/github/0.1.10-5f7cd798dc99`, `skills/github/SKILL.md` | `e506d8b7aef0df45a0dd9ffa43ef1444914f5687fb7658fbc3b37cf64dfa1a88` | Apache-2.0 | Inspect and mutate the exact private repository under explicit operator authority | Authenticated GitHub read/write; requires exact repo/ref/diff checks; no merge or destructive rewrite inferred | 2026-08-21 |
| GitHub review threads | same package, `skills/gh-address-comments/SKILL.md` | `f01ea4dea76d78db2de7cde217548324b67ad49860514907aeac1f05907493c1` | Apache-2.0 | Governs any review-thread inspection or resolution | Authenticated PR mutation; no thread was resolved without direct authority | 2026-08-21 |
| In-app Browser | `openai-bundled/browser/26.818.31338`, `skills/control-in-app-browser/SKILL.md` | `bdec2bfc891a6bd3f0a62d9d872ece4c6c3678f75bef7a5a2916cb1a53cc6910` | OpenAI-bundled; no standalone package license file found | Inspect and playtest the owned localhost application after automated checks | UI control over a dedicated browser surface; no cookies, profiles, passwords, unrelated tabs, or external sites inspected | 2026-08-21 |

No skill grants product authority, world authority, credentials, spending, deployment, or permission to contact people. Skills are rechecked before a materially different use.
