# Publication readiness

The GitHub source repository is public. This page records a source-release
package; it does not authorize a hosted game, deployment, paid operations, or
a claim that human attachment is proven.

## Recommended repository metadata

**Description:** Local-first civilization game about sponsoring one autonomous
life, risking rare interventions, and returning to a factual Chronicle.

**Topics:** `civilization-simulation`, `local-first`, `deterministic-simulation`,
`event-sourcing`, `indexeddb`, `playcanvas`, `react`, `typescript`,
`accessibility`, `game-ai`

**Social preview:** use the tracked 1280×640 current-game capture under
`docs/media/`, without badges, invented UI, or unreleased feature claims.

Topics describe the source project. They are not a claim of a live service.

## Release note draft

### v0.1.0-prealpha — EONFOLK source release

This source snapshot contains a small, complete local civilization proof: one
generated region, eight autonomous citizens, a sponsor intervention/abstention
loop, durable browser persistence and catch-up, and a Chronicle that distinguishes
facts, beliefs, allegations, and causal roles. It requires no account, server,
model, or paid service. The core unanswered question is human attachment, not
technical liveness; see the roadmap and limitations before treating this as a
finished game.

## History boundary

The engineering tree still contains planning, review, local-path, and
release-attestation history. Rewriting that archive would weaken auditability.
A separate sanitized export remains available for a smaller reader-facing tree:

```sh
node scripts/export-public-release.mjs /absolute/new/eonfolk-public
```

The command fails if the source tree is dirty, the destination exists, or the
destination overlaps the source. It copies only the reviewed reader surface,
source, runtime assets, formal model, relevant tests/tooling, community files,
and hardened public CI template. It emits `PUBLICATION_MANIFEST.json` with the
source tree identity and content hashes. It does not initialize Git, add a
remote, publish, or deploy.

Before treating an export as a new history, verify it from a fresh install,
inspect every file and license, run a full history secret scan on that new
history, confirm screenshots match the released source, and probe current
GitHub security/ruleset capabilities.

## Suggested labels and Discussions

Minimal labels: `bug`, `gameplay`, `accessibility`, `performance`, `enhancement`,
`security`, `documentation`, and `good first issue`. Labels are a plan until
they are explicitly created.

If Discussions are later enabled, start with **Announcements** (maintainer only),
**Q&A**, **Ideas**, and **Show and Tell**. Issues are for reproducible defects and
scoped work that can be closed; Discussions are for questions, proposals, play
stories, and broader conversation. Do not use Discussions as a security channel
or enable it before moderation capacity exists.
