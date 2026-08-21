# EONFOLK bootstrap handoff

**Purpose:** Give the operator one practical, evidence-backed summary of the consolidated Riverhold implementation.

**Status:** IN PROGRESS — final SHA and verification evidence will be frozen after the rejection review

**Authority boundary:** This file summarizes implemented reality. Product and technical semantics remain owned by [docs/INDEX.md](docs/INDEX.md); execution evidence remains in the [001 ExecPlan](docs/exec-plans/active/001-foundation.md).

## Current checkpoint

- Repository: private `PranavMishra28/eonfolk`, default branch `main`.
- Consolidation commit: `cc12d33e3128dd7436103139bd26f2e90044493d`.
- Workspace scaffold: `4fb5f938d8e9ef50706901d7909348048c9d4c92`.
- Human evidence: not run; implementation proceeds only under the recorded **OPERATOR IMPLEMENTATION OVERRIDE**.
- Deployment/publication/spend: none.

## Run during implementation

```bash
export PATH=/Users/pranav/.nvm/versions/node/v22.23.1/bin:$PATH
corepack pnpm install --frozen-lockfile
corepack pnpm runtime:check
```

The final handoff will replace this checkpoint with the exact run, verify, performance, architecture, frontier decision, evidence, limitation, branch/tag, and manual-test record.
