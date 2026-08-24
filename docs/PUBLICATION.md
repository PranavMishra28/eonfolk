# Publication readiness

EONFOLK remains private and unreleased. This page records a future publication
package; it does not authorize a visibility change, deployment, release, or
spend.

## Recommended repository metadata

**Description:** Local-first civilization game about sponsoring one autonomous
life, risking rare interventions, and returning to a factual Chronicle.

**Topics:** `civilization-simulation`, `local-first`, `deterministic-simulation`,
`event-sourcing`, `indexeddb`, `playcanvas`, `react`, `typescript`,
`accessibility`, `game-ai`

**Social preview:** use the tracked 1280×640 current-game capture under
`docs/media/`, without badges, invented UI, or unreleased feature claims.

Topics can expose project intent even on a private repository. Do not apply this
metadata until the maintainer explicitly chooses to publish.

## Release note draft

### EONFOLK pre-alpha source release

This source snapshot contains a small, complete local civilization proof: one
generated region, eight autonomous citizens, a sponsor intervention/abstention
loop, durable browser persistence and catch-up, and a Chronicle that distinguishes
facts, beliefs, allegations, and causal roles. It requires no account, server,
model, or paid service. The core unanswered question is human attachment, not
technical liveness; see the roadmap and limitations before treating this as a
finished game.

## History boundary

The engineering repository contains private planning, review, local-path, and
release-attestation history that is inappropriate for a public clone even though
full-history secret scanning passes. Rewriting that private archive would weaken
auditability. The publication path is therefore a reproducible sanitized tree
export from an accepted `main` commit, followed by a new public history if and
only if publication is later authorized.

Create the export into a new, explicit directory outside the repository:

```sh
node scripts/export-public-release.mjs /absolute/new/eonfolk-public
```

The command fails if the source tree is dirty, the destination exists, or the
destination overlaps the source. It copies only the reviewed reader surface,
source, runtime assets, formal model, relevant tests/tooling, community files,
and hardened public CI template. It emits `PUBLICATION_MANIFEST.json` with the
source tree identity and content hashes. It does not initialize Git, add a
remote, publish, deploy, or modify the private archive.

Before any later publication, verify the exported tree from a fresh install,
inspect every file and license, run a full history secret scan on its new
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
