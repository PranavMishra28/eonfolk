# Founder Alpha release boundary

**Purpose:** define the reproducible local production preview, CI evidence retention, and the credential-gated path from the inert feedback relay core to a future private alpha deployment.

**Status:** WORLD PRESENCE EXACT-YES AND FOUNDER ALPHA MEGA PR #7 INTEGRATED; BOUNDED IDENTITY/CI CONTINUATION ACTIVE; DEPLOYMENT NOT RUN

**Authority boundary:** this file owns Founder Alpha release procedure and release-status claims. It does not authorize deployment, spend, credentials, a public availability claim, or changes to Reality. [Feedback](FEEDBACK.md) owns relay behavior; [Testing](../quality/TESTING.md) owns verification policy; [Security](SECURITY.md) owns trust boundaries.

**Related documents:** [architecture](ARCHITECTURE.md), [feedback](FEEDBACK.md), [security](SECURITY.md), [testing](../quality/TESTING.md), [active Founder Alpha plan](../exec-plans/active/002-founder-alpha.md)

## Owned decision

Founder Alpha is releasable only as a verified local browser build. The web application is complete without an account, network service, hosted model, or feedback relay. `apps/feedback-worker` contains a credential-free relay core, D1 contract, injected-fetch Turnstile provider, and fixed-repository GitHub App/Issues providers. It is not a composed or deployed Worker: this repository intentionally contains no Wrangler configuration, Cloudflare resource identifier, GitHub App key, Turnstile secret, public route, deployment workflow, or automatic deployment action.

Reopen this boundary only after Gate A/B remain green, the exact deployment candidate passes PR and DEEP verification, and the operator explicitly approves the concrete account, resource, cost, origin, credential, retention, and rollback plan.

## Exact local production preview

From the repository root on the pinned Node and pnpm versions:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm verify:pr
pnpm --filter @eonfolk/web preview --host 127.0.0.1 --port 4174 --strictPort
```

Open `http://127.0.0.1:4174/`. `verify:pr` builds the production assets before preview. This is a loopback-only production-bundle preview, not a public deployment. World state, diagnostics, and feedback remain browser-local; closing or clearing the browser profile can remove local evidence. No relay availability, durability, backup, or multi-device continuity is claimed.

The release candidate additionally requires `pnpm verify:deep`, an actual browser playtest, inspection of the generated Git diff and evidence, and reconciliation of every P0/P1 review finding. Human, physical-device, provider, and deployment evidence must remain `NOT RUN` until actually performed.

Historical clean local DEEP passed all 26 ordered rows at commit `59edef3c768d9a3fe9409f07d77d49fded4b9554`, but the World Presence override invalidated that sparse Pixi candidate while preserving its evidence. Exact clean final implementation head `f818d1069401a1f8e14d2ca6badec29841afbd81` is the currently retained release-valid PlayCanvas evidence boundary. It passed the protected GitHub `Verify`, `Formal model`, and `Secret scan` jobs in [run 32559456985](https://github.com/PranavMishra28/eonfolk/actions/runs/32559456985), then passed all 26 target-Mac DEEP rows, all sixteen illustrated production journeys, independent exact inhabited-place **YES**, and the canonical fifteen-run performance/egress battery with unchanged source/lockfile. Local verification output SHA-256 is `21e85a3e875ca79d0d6e31b25d4ba19f1c871bb6c22c780cf777ba877cfb689d`. The current identity, browser-cohort portability, run-surface, and CI-workflow candidate must receive its own protected checks and target-Mac evidence before merge; historical success cannot substitute for the exact merge head.

## CI release surface

The one `CI` workflow retains the protected `Verify`, `Formal model`, and `Secret scan` jobs. All actions are pinned to immutable commit SHAs and workflow permissions are `contents: read`; checkout credentials are not persisted. Verify also runs checksum-pinned actionlint before the product lattice. Linux `Verify` runs the nineteen-row PR baseline with two semantic injected-fault journeys, fourteen semantic product journeys, and a blocking trace-free production PlayCanvas/WebGL2 smoke at 1728×1117, 1366×768, and 390×844. Web, every runtime package, browser tests, the CI workflow, dependency manifests, and renderer/test configuration trigger that smoke. The target-Mac PR/DEEP surface keeps all sixteen illustrated journeys, including cadence and spatial picking. Cognition/protocol/Observatory changes explicitly rerun the frozen planner benchmark and experiment/projection regressions. Workflow dispatch additionally offers an unscheduled portable Linux extended lane; it does not claim the independently hashed target-Mac browser cohort or canonical performance profile. Reduced-motion, keyboard, semantic fallback, and complete product journeys remain blocking in the semantic suite and target-Mac lattice.

Failed Playwright screenshots/traces are retained for 14 days. Conditional accepted UI screenshots and the local preview log are retained for 30 days. Successful videos are not recorded. Artifact access inherits private-repository Actions access; artifacts must not contain feedback prose, credentials, raw Reality, private cognition records, or external provider traces. Private storage is access control, not permission to upload sensitive evidence.

## Credential-gated relay path

Every item below is a future manual gate and is **NOT RUN**. The sequence is descriptive, not authorization:

1. Re-probe the private repository, Cloudflare plan/pricing, Worker/D1/Turnstile limits, Actions allowance, and GitHub App permission model on the execution date. Record the observed state and a $0/$50/$300 cost bound before creating anything.
2. Review the exact relay/provider commit and repeat its unit, schema, quota, duplicate-suppression, cryptographic-token, endpoint, failure, secret-scan, and bundle/CPU checks. Implement and review the still-missing Worker composition and concrete D1 binding; the current core accepts injected D1, Turnstile, GitHub, clock, and fetch ports.
3. With explicit operator approval, create one D1 database and apply `apps/feedback-worker/migrations/0001_feedback_relay.sql`. Bind it under a reviewed name. Do not enable R2.
4. Create one Turnstile site restricted to the exact approved browser origin. Supply its secret only through the Worker secret store and bind the expected hostname/action in server configuration.
5. Create one private GitHub App installed only on `PranavMishra28/eonfolk`, with Metadata read and Issues read/write and no broader repository or organization permission. Keep the App ID, installation ID, and private key server-side; mint short-lived installation tokens. The browser never receives them and cannot choose a repository.
6. Configure one exact allowed origin and `POST /v1/feedback` route. The prospective inputs are the D1 binding, Turnstile secret/hostname/action, GitHub App ID/installation/private key, fixed repository identity, and allowed origin. These names are not current environment-variable or binding contracts because no deployment composition exists yet.
7. Run a private, capped staging exercise covering wrong origin/method/MIME/schema, Turnstile failure, quotas, D1 retry/lease recovery, ambiguous GitHub delivery reconciliation, log inspection, rollback, and relay outage while the local game continues. Inspect the created private issues and verify no secret, raw Reality, private cognition, arbitrary Markdown/URL, or attachment escaped.
8. Only after a second explicit operator approval may a public relay route be created. Record resource IDs outside version control, set budget alerts without misrepresenting them as hard caps, document disable/delete rollback, and repeat the acceptance run against the exact deployed version.

No current file or command performs steps 3–8. There is no deploy-on-push path. A green CI run proves the local code and fixtures, not Cloudflare, Turnstile, GitHub delivery, public abuse resistance, or production economics.

## Rollback and stop conditions

Local preview rollback is `git revert` of the offending reviewed commit followed by PR verification; do not rewrite protected history. A future relay must be independently disableable by removing its public route or binding while local feedback continues to save locally. Stop before deployment when credentials or spend lack approval, an origin/repository is not exact, a security or privacy P0/P1 remains, quotas/lease/reconciliation fail, logs contain report bodies, the game depends on the relay, or the production composition is absent.

## Rejected alternatives

Automatic deployment from Actions, client-held GitHub credentials, a personal access token, arbitrary repository/webhook destinations, public issue storage, R2 by default, exactly-once delivery claims, deployment before local attachment proof, and treating private Actions artifacts as unrestricted storage are rejected.

## Unproven assumptions and constraint fit

- **UNRESOLVED:** Worker composition, the concrete D1 binding, deployed Worker CPU/bundle, actual D1 behavior, live Turnstile usability, GitHub App lifecycle, GitHub search eventual consistency, quotas under public abuse, and disable/delete rollback have not run.
- **UNRESOLVED:** the 14/30-day artifact policy fits actual Actions storage and debugging needs; revise from measured usage.
- **UNRESOLVED:** a feedback relay improves the private alpha enough to justify any operational burden; local feedback remains the complete fallback.

This boundary costs approximately $0 today, needs no owned GPU or model work, and keeps the solo-builder slice useful and free. The optional relay can be omitted without changing the world, citizen behavior, Chronicle, or any Gate A/B outcome.
