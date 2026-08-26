# Founder Alpha release boundary

**Purpose:** Preserve the historical local-release boundary and evidence meaning for Founder Alpha.

**Status:** HISTORICAL — superseded by Release Genesis V1

**Authority boundary:** This file explains retained Founder Alpha evidence. It does not define current V1 operations, authorize deployment, or claim that historical source paths still exist.

**Related documents:** [completed Founder Alpha plan](../exec-plans/completed/002-founder-alpha.md), [historical handoff](../../FOUNDER_ALPHA_HANDOFF.md), [current feedback](FEEDBACK.md), and [current V1 plan](../exec-plans/active/003-v1-civilization.md).

## Historical decision and evidence

Founder Alpha was accepted only as a verified local browser build without an account, hosted model, or required network service. Its frozen evidence is tied to the exact commits, workflows, review files, and immutable tags recorded by the completed plan and handoff. Historical success cannot substitute for Release Genesis verification.

The branch once contained an uncomposed feedback-relay prototype for Cloudflare D1, Turnstile, and a fixed private GitHub App destination. It was never deployed and had no credential, public route, Worker composition, or authority over the game. V1 removed that unreachable prototype, its tests, and its deployment-oriented instructions. Retained Founder Alpha reviews remain historical evidence about the deleted design, not an active implementation contract.

## Current executable boundary

The current local production preview is owned by the V1 plan and root scripts:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm verify:pr
pnpm prod
```

This remains a loopback-only production-bundle preview. World state, diagnostics, and feedback remain browser-local. There is no deploy-on-push path, server, public URL, credential, payment, or paid action.

## Retention and reopen rule

Keep Founder Alpha review and evidence artifacts because they explain historical decisions and regression meaning. Do not copy their release claims into V1. A future remote feedback or public deployment path starts from a new current threat, privacy, cost, retention, abuse, credential, rollback, and account-capability review and requires explicit approval before any external mutation or spend.

## Resulting behavior and constraint fit

Removing the old relay does not change the world, citizen behavior, Chronicle, local feedback, or any V1 product gate. The active product stays account-free, approximately $0, local-first, and complete without hosted infrastructure.
