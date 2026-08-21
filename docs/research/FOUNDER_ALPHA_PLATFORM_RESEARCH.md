# Founder Alpha platform research

**Purpose:** decide whether and how Founder Alpha can retain a read-only local
observer and a deploy-ready feedback relay without weakening Reality authority,
requesting credentials, deploying, or creating an unbounded cost surface.

**Status:** RESEARCH COMPLETE — RECOMMENDATION READY; NO DEPLOYMENT, CREDENTIAL,
ACCOUNT, REPOSITORY, OR BILLING MUTATION WAS PERFORMED

**Authority boundary:** this record proposes evidence and implementation
constraints. It does not change product, security, testing, source-ledger, or
execution authority. The coordinator owns acceptance and any later setup.

**Related documents:** [Founder Alpha ExecPlan](../exec-plans/active/002-founder-alpha.md),
[security](../engineering/SECURITY.md), [testing](../quality/TESTING.md),
[authority index](../INDEX.md), and [source ledger](SOURCE_LEDGER.md).

**Access date for every web source:** 2026-08-21. Source IDs beginning
`S-FA-PLATFORM-` below are proposals, not authoritative ledger entries, until the
coordinator copies accepted rows into `SOURCE_LEDGER.md`.

## Executive decision

### Keep, condition, reject

| Decision | Recommendation | Reason |
|---|---|---|
| Local observer core | **KEEP** | A bounded, read-only projection over already-sanitized local artifacts closes the founder diagnosis loop without adding a service or canonical writer. |
| MCP adapter for that observer | **KEEP, OPTIONAL** | MCP is useful as a thin local STDIO adapter, but it is not a security boundary. The same observer must remain usable from the local CLI without MCP. |
| Worker + D1 + Turnstile text/diagnostics relay | **KEEP AS DEPLOY-READY, NOT DEPLOYED** | Current free-plan limits are ample for a capped Founder Alpha relay, GitHub App Issues permission is sufficiently narrow, and failure can return the report to the local queue. |
| R2 screenshot path | **KEEP DISABLED BY DEFAULT** | Private R2 storage is technically suitable, but activating R2 requires a usage-based subscription and its budget alerts do not stop spend. Activation therefore needs a separate explicit operator cost gate. |
| GitHub App | **KEEP** | A private app installed only on `PranavMishra28/eonfolk`, with Metadata read and Issues read/write, is materially narrower than a PAT and produces one-hour installation tokens. |
| Browser-to-GitHub credential or PAT relay | **REJECT** | It exposes durable authority to an untrusted client and cannot meet the no-client-credential constraint. |
| Public R2 objects or public attachment URLs | **REJECT** | Public or long-lived URLs turn a private diagnostic attachment into bearer-accessible data. |
| GitHub Actions deployment | **REJECT FOR FOUNDER ALPHA** | A deployment workflow would require credentials and create a mutation/spend path. A local dry-run is enough to prove deploy readiness. |
| Hosted or write-capable MCP observer | **REJECT** | Shell, filesystem, browser, network, raw-state, or mutation tools would defeat the observer's narrow purpose and enlarge the prompt-injection surface. |

**INFERENCE:** the viable minimum is a code-only relay package that runs locally
against simulated bindings and a fake GitHub API, plus an optional local STDIO
observer. A real endpoint is not part of this assignment or an implementation
readiness claim.

**INFERENCE:** the first approved deployment should remain text and bounded
diagnostics only. R2 should stay feature-flagged off until the operator separately
accepts the subscription, verifies billing state, and approves the hard quotas in
this document.

**PRODUCT HYPOTHESIS:** in-product, consented, deduplicated reports will reduce
founder diagnosis time enough to justify the relay's operational burden. Only
actual Alpha reports and resolution time can validate this.

## Facts that control the decision

### Cloudflare free limits and caveats

| Product | Current official allowance or limit | Consequence for Founder Alpha |
|---|---|---|
| Workers Free | `$0`; 100,000 requests/day, resetting at 00:00 UTC; 10 ms CPU/invocation; 128 MB memory; 50 external and 1,000 Cloudflare-service subrequests/invocation; 64 variables, 5 KB each; 3 MB compressed Worker | More than enough request volume, but signing, schema validation, hashing, D1 work, and response formatting must be measured under 10 ms CPU. The endpoint must fail closed on quota/resource exhaustion. Proposed `S-FA-PLATFORM-001`. |
| Worker HTTP body | Cloudflare Free account plan accepts up to 100 MB request bodies | This is a platform ceiling, not a safe application limit. Reject at the edge before buffering above the proposed 1.1 MiB application cap. Proposed `S-FA-PLATFORM-001`. |
| Workers Logs | New Workers have observability enabled by default. Workers Free includes 200,000 log events/day with three-day retention; invocation logs can be disabled | Explicitly disable persisted invocation logs for the relay, emit no report bodies or URLs with query data, and keep bounded aggregate health in D1. Default behavior is not privacy-safe enough. Proposed `S-FA-PLATFORM-002`. |
| D1 Free | 5 million rows read/day, 100,000 rows written/day, 5 GB total; 10 databases; 500 MB/database; 50 D1 queries/Worker invocation; 2 MB maximum string/BLOB/row | Suitable for reservations, counters, dedup mappings, and status—not attachments or unbounded reports. Indexed queries are required because scanned rows count. Free-limit exhaustion returns errors until reset. Proposed `S-FA-PLATFORM-003`. |
| D1 Time Travel | Always on; seven-day restore window on Workers Free | Deleting report staging fields does not imply immediate irrecoverability. Consent copy and retention claims must disclose the seven-day recovery window. Proposed `S-FA-PLATFORM-004`. |
| R2 Standard free tier | 10 GB-month/month, 1 million Class A operations/month, 10 million Class B operations/month, free egress | Ample only under application hard caps. The free tier excludes Infrequent Access. Overages are usage-billed and rounded to billing units. Proposed `S-FA-PLATFORM-005`. |
| R2 activation | Requires an R2 subscription checkout; usage above the free tier is billed monthly | This is a manual cost gate, not part of credential-free implementation. Cloudflare budget alerts notify but do not pause or cap usage. Proposed `S-FA-PLATFORM-006`. |
| R2 object lifecycle | Lifecycle rules can expire objects; removal normally occurs within 24 hours after expiration | Use Standard storage, a seven-day maximum lifecycle, a private bucket, and explicit manual/user deletion where available. Never promise deletion at the exact expiration instant. Proposed `S-FA-PLATFORM-007`. |
| Turnstile Free | Free, up to 20 widgets, 10 hostnames/widget, unlimited verification requests, seven-day analytics | One production widget and separate official test keys are sufficient. Turnstile is an abuse signal, not authentication or a quota. Proposed `S-FA-PLATFORM-008`. |
| Turnstile tokens | Server-side Siteverify is mandatory; tokens are single-use, at most 2,048 characters, and expire after 300 seconds; Siteverify supports an idempotency UUID | Validate expected hostname and action, keep the secret server-side, and fail closed. Offline or blocked Turnstile returns the report to the local queue. Proposed `S-FA-PLATFORM-009`. |
| Worker secrets and crypto | Worker secrets are encrypted bindings; each value is limited to 5 KB. Workers Web Crypto supports import/sign with RSASSA-PKCS1-v1_5 | A Worker can in principle sign GitHub's required RS256 JWT without a JWT dependency, but actual PEM size/format and measured CPU must pass a spike before acceptance. Proposed `S-FA-PLATFORM-010`. |

**VERIFIED FACT:** the Workers Free and D1 free limits fail requests when their
daily ceilings are reached; they do not silently upgrade the Worker to the paid
Workers plan. R2 is different: it is a usage-based subscription with free included
usage and published overage prices. `S-FA-PLATFORM-001`, `003`, `005`, and `006`
proposed.

**VERIFIED FACT:** R2 Standard currently charges `$0.015/GB-month`, `$4.50` per
million Class A operations, and `$0.36` per million Class B operations beyond the
free tier. Infrequent Access has different charges, no free tier, retrieval fees,
and a 30-day minimum. It must not be selected. `S-FA-PLATFORM-005` proposed.

**UNRESOLVED:** a generated GitHub App key has not been created, so its exact
encoded length and Worker import format were not tested. GitHub documents RS256;
Cloudflare documents the required signing primitive and a 5 KB secret-value cap.
Falsify viability by testing a generated key locally without uploading it.

**UNRESOLVED:** the complete relay has not been profiled against the 10 ms Free
CPU limit. Falsify with the real bundled Worker, including JWT signing, canonical
hashing, schema validation, and representative D1 calls.

### GitHub App and Issues API

**VERIFIED FACT:** GitHub Apps start without permissions, and GitHub recommends
selecting the minimum required permissions. Installation can be restricted to only
selected repositories. A private app can be installed only on its owner account.
`S-FA-PLATFORM-011` proposed.

The exact app registration should be:

| Setting | Required value | Why |
|---|---|---|
| Visibility | Private / only this account | Prevent third-party installation and support burden. |
| Repository access | Only `PranavMishra28/eonfolk` | Prevent lateral access if the app key is compromised. |
| Repository permissions | Metadata: read; Issues: read/write; everything else: no access | Create issues, read the dedup marker, and append comments without Contents, Actions, Administration, Checks, Pull requests, Deployments, or Secrets authority. |
| User authorization | Disabled/not requested | The relay acts as the installation, not as a tester or founder user. |
| Webhooks | Disabled | The relay does not need inbound GitHub events. |
| Installation token | Request for only the EONFOLK repository and only Issues write/read permissions | Defense in depth even though the installation is already single-repository. |

**VERIFIED FACT:** `POST /repos/{owner}/{repo}/issues` accepts GitHub App
installation tokens and requires Issues write permission. Creating an issue or
comment returns `201`; creating content too quickly can trigger secondary rate
limits. The issue endpoint documents no idempotency parameter.
`S-FA-PLATFORM-012` proposed.

**VERIFIED FACT:** an installation access token expires after one hour and can be
narrowed to selected repositories and a subset of the app's permissions. The app
JWT must use RS256, may expire no more than ten minutes in the future, and requires
the app private key. `S-FA-PLATFORM-013` proposed.

**VERIFIED FACT:** a non-Enterprise GitHub App installation gets at least 5,000
REST requests/hour, can scale to at most 12,500, and is also subject to secondary
limits. GitHub recommends serial mutative requests, at least a one-second pause
between many mutations, and honoring `Retry-After`/rate-reset headers.
`S-FA-PLATFORM-014` proposed.

**INFERENCE:** no PAT, GitHub password, repository token, installation token, or
private key belongs in the browser, D1, R2, issue body, diagnostic bundle, build
artifact, source tree, or Worker log. The GitHub App private key and Turnstile
secret exist only as manually provisioned Worker secrets. Installation tokens are
minted on demand, held only in invocation memory, and never persisted.

### Dedup and create-or-update semantics

GitHub's issue and comment creation endpoints do not document an idempotency key.
Therefore the relay must not claim transactional exactly-once delivery across D1
and GitHub.

Use this state machine:

1. The client creates a random 128-bit `submission_id`, canonicalizes the approved
   sanitized fields, and computes a payload digest. The Worker repeats all
   canonicalization and hashing; it never trusts a client-provided digest.
2. The Worker validates Turnstile, origin, schema, MIME, sizes, and hard counters,
   then uses one D1 batch to reserve the `submission_id`, report fingerprint, daily
   quota, monthly quota, and optional attachment bytes.
3. A unique constraint on `submission_id` makes an identical retry return the
   stored state. A unique fingerprint row maps one incident class to one GitHub
   issue and carries `reserved`, `creating`, `open`, or `retryable` state plus a
   bounded lease.
4. The issue body contains fixed headings and hidden, non-secret markers for the
   fingerprint and `submission_id`. Untrusted user text is length-bounded, control
   characters removed, mentions neutralized, and rendered as quoted/fenced text.
5. If no issue mapping exists, the lease holder creates one issue. If a mapping is
   already open, it creates one comment with a hidden `submission_id` marker.
6. On a lost GitHub response, the relay first lists the bounded candidate issue or
   its comments and reconciles the hidden marker. It creates content again only
   when the marker is absent. A successful response stores the GitHub issue/comment
   ID and clears staged report text from the live D1 row.
7. GitHub `403`, `429`, `5xx`, network failure, expired token, Worker/D1/R2
   exhaustion, or an occupied lease returns a typed retryable response. The browser
   keeps its sanitized local copy and shows that upload is not complete.

**INFERENCE:** this provides practical create-or-update and strongly reduces
duplicates, but it cannot prove global exactly-once behavior across a crash and an
external API without native GitHub idempotency. Acceptance language must be
“reconciled at-least-once delivery with tested duplicate suppression,” not
“exactly once.”

**INFERENCE:** the incident fingerprint should use only stable, pre-approved
diagnostic fields (schema version, category, public error code, route ID, build
version, normalized bounded stack frames, and invariant ID). Feedback prose,
timestamps, raw URLs, identity, IP address, screenshot bytes, and private Reality
data must not affect the incident fingerprint.

### Application hard caps

Vendor ceilings are too large to be product controls. The relay should ship with
lower compile-time caps and no remote override:

| Item | Proposed hard cap |
|---|---:|
| JSON envelope | 32 KiB |
| Tester prose | 2,000 Unicode scalar values |
| Sanitized structured diagnostics | 24 KiB |
| Attachments | 0 by default; if separately enabled, one sanitized PNG/JPEG/WebP, maximum 1 MiB |
| Entire request | 1.1 MiB |
| Per daily keyed network bucket | 5 accepted/hour and 10/day; store only a rotating HMAC, never the raw address |
| Per incident fingerprint | 20 accepted/day |
| Global accepted reports | 100/day and 1,000/rolling 30 days |
| GitHub mutations | One lease at a time; no faster than one/second |
| R2 live bytes | 1 GiB reserved ceiling and seven-day lifecycle |
| GitHub retry | Honor `Retry-After`; bounded exponential backoff; no infinite background retry |

**INFERENCE:** reserve quota atomically before R2 or GitHub. This keeps worst-case
monthly operations and live storage far below the current R2 free tier even under
hostile traffic. It is still defense in depth, not a provider-level spend cap.

**UNRESOLVED:** the rotating network-bucket key is another secret and network
addresses are personal data in some jurisdictions. The fastest falsification is a
privacy review of the exact retention and whether Turnstile plus global quotas can
avoid any address-derived storage.

## Exact data flow and retention

```text
local game
  -> source-side redaction + bounded preview + explicit consent
  -> local IndexedDB queue (user can delete; gameplay never waits)
  -> HTTPS POST to one fixed Worker route
  -> Turnstile Siteverify + schema/origin/quota validation
  -> D1 reservation/dedup/status (no raw Reality; staged prose cleared on success)
  -> optional private R2 object (disabled unless separately approved)
  -> short-lived GitHub App installation token
  -> one private GitHub issue or deduplicated issue comment
  -> typed receipt to local queue; local user chooses when to delete
```

| Data | Location | Maximum intended retention | Access |
|---|---|---|---|
| Unsanitized incident material | Nowhere outside the game process | Never persisted or uploaded | Source redactor only |
| Sanitized queued report | Local IndexedDB | Until user deletes or confirmed receipt policy runs | Local browser origin |
| Turnstile token | Invocation memory | One validation, at most five minutes | Worker and Siteverify |
| D1 staged sanitized prose | D1 live rows | Clear after GitHub acknowledgement; retry TTL if not acknowledged | Bound Worker only; recoverable through D1 Time Travel for up to seven days on Free |
| D1 dedup/status/counters | D1 | 30 days for status; aggregate/fingerprint retention reviewed at milestone | Bound Worker only |
| Screenshot | Private R2, if enabled | Seven days maximum plus documented lifecycle deletion delay | Bound Worker; founder manually via authenticated Cloudflare dashboard/CLI |
| GitHub issue/comment | Private EONFOLK repository | Until founder triage/deletion policy removes it | Repository collaborators and narrowly installed GitHub App |
| Installation token | Worker invocation memory | At most one hour by GitHub; discard immediately after use | Worker invocation only |
| Worker logs | Disabled for persisted invocation/custom logs | None intentionally persisted | No report body may be logged |

**INFERENCE:** the GitHub issue should contain only the sanitized report, bounded
diagnostic projection, reproduction ID, build/schema versions, fingerprint marker,
and—if R2 is enabled—an opaque object key, digest, MIME, byte length, and expiry.
It must not contain an R2 public URL or pre-signed URL.

**INFERENCE:** founder attachment retrieval through the authenticated Cloudflare
dashboard or local Wrangler CLI is less convenient but strictly narrower than
adding a public download route. A future authenticated download route requires a
fresh decision and threat model.

## Threat model

| Threat | Required control | Residual risk / falsification |
|---|---|---|
| Bot floods feedback and creates issue spam | Turnstile server validation, exact hostname/action, D1 per-bucket/fingerprint/global reservations, one GitHub mutation/second, hard monthly ceiling, fail closed | Distributed abuse can consume the intentionally small quota. Falsify with concurrent/replay load tests. |
| Cross-origin page calls the endpoint | Exact Origin allowlist, fixed POST route, no permissive CORS, Turnstile hostname/action check | Origin is not authentication and non-browser clients can forge it; quotas remain mandatory. |
| Tester submits secrets, PII, prompt injection, Markdown mentions, or giant input | Source redaction, exact schema, allowlisted diagnostic fields, size/depth/count limits, control/mention neutralization, fixed issue template, preview and consent | Free prose can still contain personal data. UI must warn and founder must triage as untrusted text. |
| Duplicate retries create multiple issues/comments | D1 unique reservations, leases, hidden markers, reconciliation before retry | No native GitHub idempotency is documented; exactly-once remains unproven. |
| GitHub App key is stolen | Private app, one selected repo, Issues-only authority, Worker secret, no logs/persistence, key rotation runbook | App private keys do not expire automatically; compromise can still read/write private issues until revoked. |
| Installation token is stolen | Mint per operation, scope down again, memory-only, discard after request | Token remains valid for up to one hour. |
| R2 attachment becomes public | Private bucket, no `r2.dev`, no public/custom domain, no GET route, random key, lifecycle expiry | Cloudflare account compromise still exposes objects; R2 remains disabled until cost/privacy approval. |
| “Delete” overpromises erasure | Distinguish local deletion, live-row deletion, R2 lifecycle delay, D1 seven-day Time Travel, and separate GitHub retention | Vendor backups and GitHub issue history mean immediate global erasure is not established. |
| Quota creates spend | Workers Free, compile-time caps, atomic reservations, R2 disabled by default | Cloudflare budget alerts do not cap spend. R2 activation requires explicit operator acceptance and post-deploy billing checks. |
| Relay outage blocks the game | Local queue and preview remain complete; relay failures are typed; no game code depends on network | Reports may arrive late or never; UI must say so truthfully. |
| Feedback or diagnostics mutate Reality | Separate package/process boundary; relay accepts projections only; no canonical store binding/import | Direct architecture and dependency tests must prove no path to reducer/persistence writes. |
| MCP tool description claims read-only while implementation writes | Treat annotations as untrusted hints; expose only compiled read-only code; deny write APIs at implementation and process boundary | MCP itself cannot enforce the hint. Mutation and filesystem/network denial tests are required. |
| Local MCP server is reached by a hostile website | Prefer STDIO. If HTTP is ever used, bind `127.0.0.1`, validate Origin, and authenticate as required by the current MCP transport spec | STDIO child-process compromise still has the process's OS authority. Keep its environment and filesystem capability narrow. |
| Observer leaks raw Reality, cognition, files, or secrets | Open artifacts only by typed ID from an allowlisted inventory; realpath jail; bounded output schemas; no arbitrary path, shell, browser, network, sampling, elicitation, or environment forwarding | Sanitization defects remain possible; use hostile fixtures and independent source-side redaction tests. |
| Parallel agents overwrite work or inherit secrets | Non-overlapping allowlists, isolated worktrees, one writer/branch, no secret patterns in `.worktreeinclude` | Worktrees share Git metadata and are not a confidentiality boundary. |
| CI supply-chain or fork PR exfiltrates credentials | Full-SHA actions, `permissions: contents: read`, no deployment secrets, no `pull_request_target`, no private-fork secret/write-token forwarding | Repository setting currently permits all actions and does not require SHA pinning platform-wide; workflow review remains necessary. |

## Read-only local observer contract

### Keep this surface

The observer may expose only the projections already named by the ExecPlan:

- health summary;
- incident list and one incident by typed ID;
- bounded session summary;
- sanitized typed trace;
- bounded performance summary;
- host-only network summary;
- reproduction recipe;
- allowlisted artifact inventory; and
- bounded world-head summary containing identifiers and counts, not raw Reality.

It must not expose raw Reality, raw cognitive records, prompts, hidden reasoning,
full hash preimages, arbitrary files/paths, environment variables, browser control,
shell/process execution, network fetch, write/delete/repair actions, deployment,
sampling, elicitation, or generic SQL.

### MCP-specific constraints

**VERIFIED FACT:** the current MCP architecture distinguishes resources, prompts,
and tools, but tool annotations such as `readOnlyHint` are hints and must not be
trusted from an untrusted server. Hosts are responsible for consent, authorization,
and security boundaries. `S-FA-PLATFORM-019` proposed.

**VERIFIED FACT:** current MCP Streamable HTTP servers must validate Origin, should
bind local servers to `127.0.0.1`, and should authenticate connections. Current MCP
authorization forbids token passthrough and requires intended-audience validation
for protected HTTP servers. `S-FA-PLATFORM-019` proposed.

**VERIFIED FACT:** Codex supports local STDIO and Streamable HTTP MCP servers,
project-scoped configuration only for trusted projects, environment forwarding,
tool allow/deny lists, and server/per-tool approval modes. `S-FA-PLATFORM-020`
proposed.

Recommended implementation:

1. Keep the observer as a normal local library/CLI first.
2. If retained, make MCP a dependency-free STDIO adapter over the same typed
   query functions. Declare resources where practical; use tools only for bounded
   parameterized reads.
3. Start it with an explicit repository `cwd`, an empty forwarded-environment
   allowlist, an exact enabled-tool list, and prompt/approve mode during Alpha.
4. Resolve artifact IDs through a closed manifest. Reject separators, symlinks,
   non-regular files, paths outside the diagnostics root, unknown versions, and
   outputs above the per-resource byte cap.
5. Make every result structured, versioned, redacted before the adapter sees it,
   and marked non-authoritative. The adapter never imports a Reality writer.
6. Treat project MCP configuration as executable setup requiring explicit founder
   review; do not silently install or globally register it.

**INFERENCE:** resources alone do not guarantee safety, and a `readOnlyHint` does
not prove read-only behavior. Code and process capabilities are the security
boundary.

## Codex subagent, worktree, and skill guidance

**VERIFIED FACT:** current Codex documentation says subagents can run specialized
work in parallel; each consumes its own model/tool work, and OpenAI recommends
starting with parallel read-heavy tasks while taking more care with concurrent
write-heavy work. Applicable `AGENTS.md` or skill instructions can request
delegation. `S-FA-PLATFORM-021` proposed.

**VERIFIED FACT:** Codex worktrees are separate checkouts sharing repository Git
metadata. A branch can be checked out in only one worktree. Managed worktrees can
copy ignored local files only when `.worktreeinclude` lists them. The documentation
explicitly uses environment/secret files as examples. `S-FA-PLATFORM-022`
proposed.

**VERIFIED FACT:** skills use progressive disclosure: Codex sees the name and
description, then reads the complete `SKILL.md` when the skill is selected. Skills
can activate explicitly or by matching their description. `S-FA-PLATFORM-023`
proposed.

Resulting repository policy:

- keep bounded, non-overlapping agent file allowlists;
- use subagents for independent read-heavy research/review/tests, not overlapping
  shared-authority edits;
- keep one branch checked out in one worktree and let the coordinator integrate;
- never list `.env`, private keys, or deployment credentials in
  `.worktreeinclude` for EONFOLK;
- treat every selected skill's complete instructions as executable process
  authority within its stated scope; and
- do not treat a worktree, subagent, skill label, or MCP hint as a security
  boundary.

## GitHub Actions and private-repository reality

### Official current behavior

**VERIFIED FACT:** on GitHub Free, private repositories receive 2,000 standard
GitHub-hosted minutes/month, 500 MB shared artifact/package storage, and 10 GB
cache storage per repository. GitHub Pro provides different included quantities.
Usage beyond the included amount is billable unless a GitHub budget is configured
to stop usage. Larger runners are always charged. The exact owner account plan was
not probed in this assignment. `S-FA-PLATFORM-015` proposed.

**VERIFIED FACT:** workflow `permissions` can reduce `GITHUB_TOKEN`; specifying any
permission sets unspecified permissions to `none`. Fork PRs normally receive a
read-only `GITHUB_TOKEN` and no other secrets, but private-repository settings can
explicitly allow write tokens, secrets, and workflow execution from private forks.
Dependabot PRs receive the fork restrictions. `S-FA-PLATFORM-016` proposed.

**VERIFIED FACT:** GitHub says full-length commit SHA pinning is the only immutable
way to reference an action. It warns that `pull_request_target` or `workflow_run`
combined with checkout of untrusted PR code can compromise a repository.
`S-FA-PLATFORM-017` proposed.

### Exact EONFOLK read-only probe on 2026-08-21

No setting was changed. Authenticated read-only GitHub API calls showed:

| Control | Observed state | Consequence |
|---|---|---|
| Repository | Private; default `main` | No public publication occurred. |
| Actions | Enabled; all actions allowed; platform SHA-pinning requirement false | The repository must continue enforcing SHA pins in reviewed workflow source. |
| Rulesets | API accessible; zero rulesets | Do not claim ruleset enforcement. |
| Classic `main` protection | Strict required `Verify`, `Formal model`, `Secret scan`; admins enforced; force-push and deletion disabled | Existing integration controls are real and must remain green. |
| Vulnerability alerts | `404`, disabled | No native Dependabot alert coverage may be claimed. |
| Automated security fixes | Disabled, not paused | No automatic security fix coverage may be claimed. |
| Secret scanning | `404`, disabled | Pinned Gitleaks remains the compensating committed-history scan. |
| Code scanning default setup | `403`, not enabled | No native code scanning coverage may be claimed. |

This reproduces the current execution record rather than replacing it.
`S-FA-PLATFORM-018` proposed.

The existing [CI workflow](../../.github/workflows/ci.yml) already uses
`permissions: contents: read`, full action SHAs, `persist-credentials: false`,
pinned tool versions/checksums, and no deployment job. Preserve those properties.

**INFERENCE:** relay deployment must remain absent from PR and push workflows.
Deploy readiness is proven with a pinned local command equivalent to
`wrangler deploy --dry-run --outdir <temporary-directory>`, contract tests, and a
reviewed bundle. A future live deploy requires a new explicit operator decision,
manual credential/resource setup, and a separate security/cost review.

## Deploy-ready without credentials

### Safe committed surface

Implementation may commit only:

- Worker source and exact schemas;
- D1 migrations and local deterministic fixtures;
- an R2 adapter that is disabled unless an explicit configuration flag and binding
  are both present;
- declared secret **names**, never values;
- local fake GitHub and fake Siteverify adapters;
- official Turnstile test-key configuration for tests only;
- a reviewed Wrangler configuration/template that cannot name a production route
  or auto-deploy from package scripts;
- a dry-run bundle command with a pinned Wrangler dependency;
- the local observer/optional STDIO adapter and closed resource manifest; and
- an exact manual setup/runbook clearly labeled **NOT RUN**.

Do not commit an account ID, D1 production ID, R2 production bucket, zone/route,
GitHub App ID/installation ID if the repository chooses to treat operational
identifiers as local configuration, private key, Turnstile secret, API token,
public URL, or fabricated successful receipt. A production Turnstile sitekey is a
public identifier, not a secret; it may be committed only after a real widget
exists and must never be fabricated.

Cloudflare documents that Wrangler can auto-provision D1/R2 resources during a
real deploy when bindings omit IDs. **INFERENCE:** the implementation must not rely
on that convenience. Its manual production configuration should name already
approved resources, while repository scripts expose only local dev and dry-run.

### Manual, state-changing boundary — not performed

After explicit approval, one human operator would need to:

1. Confirm the Cloudflare account remains on Workers Free and review its billing
   page. Do not select Workers Paid.
2. Create one D1 database and apply reviewed migrations.
3. Create one Turnstile Free widget restricted to exact production hostnames;
   retain separate official test keys locally.
4. Create a private GitHub App with the exact settings above, install it only on
   EONFOLK, generate one private key, and convert/import it in the tested format.
5. Add Worker secrets for the GitHub App key, Turnstile secret, and any rotating
   quota/dedup HMAC key. Secret-setting commands are mutations and may create a
   Worker version; they are never part of an unattended agent run.
6. Add exact D1 and secret bindings. Keep `workers_dev`/preview/public routes off
   until the final reviewed deployment step.
7. Only under a separate cost approval, complete R2 subscription checkout, create
   one private Standard bucket, add the seven-day lifecycle, verify no public
   domain, and bind only that bucket.
8. Review the dry-run bundle, configured route, CORS/Turnstile hostnames, hard
   quotas, log settings, and the absence of all secrets from Git/history/artifacts.
9. Explicitly approve the first deployment, then run a synthetic report and
   failure/offline tests. Record the real URL and evidence only after success.
10. Rotate/revoke the GitHub App key and remove bindings/resources if the relay is
    abandoned.

Cloudflare budget alerts may be useful after an approved R2 subscription, but
they are not a substitute for the application cap because the official service
says alerts do not pause or cap usage.

## Required implementation evidence

Before the coordinator can accept the design as implemented:

- schema/property tests reject unknown fields, excessive depth/count/bytes,
  non-approved MIME, malformed images, control characters, and unsanitized data;
- source-redaction tests prove raw Reality, raw cognition, secrets, arbitrary URLs,
  and full hash preimages never reach the relay adapter;
- concurrent D1 tests prove atomic quota reservation, unique submissions, one
  fingerprint owner, lease expiry, and daily/monthly rollover;
- fault injection covers lost GitHub create/comment responses, marker
  reconciliation, `403`, `410`, `422`, `429`, `5xx`, token expiry, Turnstile replay,
  D1/R2 exhaustion, and Worker outage;
- a fake GitHub server proves exact endpoint, owner/repo allowlist, API version,
  Issues-only requests, neutralized Markdown, and no arbitrary repository input;
- Worker bundle and CPU measurements use representative worst-case inputs and the
  Free 10 ms CPU limit;
- the dry run performs no network deployment and produces a reviewed small bundle;
- optional R2 tests prove the flag defaults off, reserve bytes before write, keep
  objects private, validate digest/type/size, delete on request, and honor the
  lifecycle limitation;
- browser tests prove preview/consent, success, failure, offline queue, retry,
  dedup, exact attachment preview, and local deletion while gameplay continues;
- network tests allow only the configured relay/Turnstile paths in ALPHA mode and
  zero external egress when feedback is unused/offline;
- observer tests prove realpath confinement, artifact-ID allowlist, output bounds,
  no environment/network/shell/browser/filesystem mutation, and no Reality writer
  dependency; and
- secret scans cover the full committed history, generated dry-run output, and
  test artifacts with redacted failure output.

Human usability, public abuse resistance, public availability, R2 cost safety,
and production operations remain **NOT RUN** until the corresponding real protocol
is executed.

## Objections, rejected alternatives, and reopen evidence

| Objection or alternative | Disposition | Evidence that reopens it |
|---|---|---|
| “Turnstile already rate-limits bots.” | Reject. It validates a short-lived challenge token; it is not identity, a spend cap, or per-product quota. | Official service adds a hard, applicable quota/cost cap or measured Alpha traffic proves simpler global controls sufficient. |
| “The free tier guarantees zero spend.” | Reject for R2. R2 is a usage-based subscription and budget alerts are informational. | Cloudflare adds a hard zero-dollar cap verified on the exact account. |
| “Put the GitHub token in the client; the repo is private.” | Reject. Browser compromise would expose durable repository authority. | No plausible evidence; this violates the binding trust boundary. |
| “Use a PAT because it is simpler.” | Reject. A GitHub App is repository- and permission-scoped with short-lived installation tokens. | GitHub removes installation tokens/Issues support or the measured Worker signing path cannot meet CPU/secret limits. |
| “R2 screenshots should render in the issue.” | Reject for Founder Alpha. That requires public/bearer URLs or another authenticated download surface. | A reviewed private attachment integration becomes available with narrower authority and no extra paid surface. |
| “D1 plus GitHub can be exactly once.” | Reject as unsupported. The GitHub mutative endpoints document no idempotency key. | GitHub adds native idempotency with documented semantics, or a formal end-to-end proof covers all response-loss states. |
| “MCP `readOnlyHint` proves safety.” | Reject. The specification calls annotations untrusted hints. | A trusted host enforces capabilities independently and the implementation still passes mutation-denial tests. |
| “Expose the whole diagnostics directory read-only.” | Reject. Arbitrary path/file reads leak more than the founder needs. | A concrete incident cannot be diagnosed through the typed manifest and a narrower new projection is reviewed. |
| “Deploy from Actions when CI is green.” | Reject for Alpha. It adds credentials and an automatic external mutation path. | Separate operator authorization plus protected environment, spend controls, threat review, and rollback evidence. |
| “Parallel write agents are faster.” | Reject for shared authorities. Current Codex guidance warns of write conflicts; EONFOLK already assigns isolated allowlists. | Measured workflow proves conflict-free integration with unchanged review quality. |

The platform decision must reopen if any of these occurs:

- Cloudflare changes free quotas, R2 subscription/overage behavior, log defaults,
  Turnstile limits, secret size, or Worker crypto support;
- GitHub changes App installation permissions, Issues endpoints, token lifetime,
  rate limits, Actions billing, fork behavior, or private-repository controls;
- MCP changes transport security, tool-annotation semantics, or Codex configuration;
- real Worker signing/schema/dedup exceeds 10 ms CPU or cannot import the reviewed
  key under the 5 KB secret limit;
- dedup fault tests produce repeated issues/comments or lose accepted reports;
- any report, attachment, observer output, log, or issue exposes prohibited data;
- R2 cannot be kept private and below hard caps, or the account cannot enforce the
  operator's acceptable cost posture; or
- Alpha evidence shows the relay/observer burden exceeds its diagnosis value.

## Proposed source-ledger rows

| Proposed ID | Material claim | Primary source | Class | Confidence | Reverify |
|---|---|---|---|---|---|
| S-FA-PLATFORM-001 | Workers Free provides 100,000 requests/day, 10 ms CPU/invocation, 128 MB memory, bounded subrequests/variables/bundle, and Free-plan limit failures. | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [limits](https://developers.cloudflare.com/workers/platform/limits/) | A | High | On Workers pricing/limits change and before deployment. |
| S-FA-PLATFORM-002 | New Workers default persisted observability on; invocation logs can be disabled; Free retention is three days. | [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) | A | High | Before deployment and on logging-default change. |
| S-FA-PLATFORM-003 | D1 Free provides 5M rows read/day, 100K written/day, 5 GB total, 10 databases, 500 MB/database, and documented query/row limits; limit exhaustion returns errors. | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) | A | High | On D1 pricing/limits change and before deployment. |
| S-FA-PLATFORM-004 | D1 Time Travel is always on and provides a seven-day Free restore window. | [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) | A | High | Before publishing deletion/retention copy. |
| S-FA-PLATFORM-005 | R2 Standard includes 10 GB-month, 1M Class A, 10M Class B and free egress monthly; excess usage has published rounded billing; Infrequent Access has no free tier. | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) | A | High | Before R2 activation and each billing review. |
| S-FA-PLATFORM-006 | R2 requires subscription checkout and usage is billed monthly; Cloudflare budget alerts do not pause or cap usage. | [R2 getting started](https://developers.cloudflare.com/r2/get-started/) and [budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/) | A | High | Before any subscription or attachment activation. |
| S-FA-PLATFORM-007 | R2 lifecycle rules expire objects and deletion usually completes within 24 hours after expiration. | [R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) | A | High | Before retention copy or lifecycle setup. |
| S-FA-PLATFORM-008 | Turnstile Free includes 20 widgets, 10 hostnames/widget, unlimited verifications and seven-day analytics. | [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/) | A | High | Before widget setup and on plan change. |
| S-FA-PLATFORM-009 | Turnstile requires server validation; tokens are single-use, 300-second, and Siteverify accepts an idempotency UUID. | [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) | A | High | Before relay acceptance. |
| S-FA-PLATFORM-010 | Workers secrets are encrypted bindings capped at 5 KB/value; Web Crypto supports RSASSA-PKCS1-v1_5 signing/import. | [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [limits](https://developers.cloudflare.com/workers/platform/limits/), and [Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) | A | High for capability; viability unmeasured | Test exact key/bundle/CPU before acceptance. |
| S-FA-PLATFORM-011 | GitHub Apps default to no permissions, should use minimum permissions, can be private, and installation can select repositories. | [Choosing App permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app), [creating Apps](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps), and [installing your App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app) | A | High | Before App registration or permission change. |
| S-FA-PLATFORM-012 | GitHub issue/comment creation accepts installation tokens with Issues write, returns 201, can trigger secondary limits, and documents no idempotency parameter. | [Issues endpoints](https://docs.github.com/en/rest/issues/issues) and [issue comments](https://docs.github.com/en/rest/issues/comments) | A | High for documented API; Medium for absence of undocumented behavior | Contract-test current API before deployment. |
| S-FA-PLATFORM-013 | GitHub App JWTs require RS256 and a maximum ten-minute expiry; narrowed installation tokens expire after one hour. | [JWT generation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app) and [installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) | A | High | Before auth implementation and key rotation. |
| S-FA-PLATFORM-014 | App installations have a 5,000/hour minimum primary REST limit, bounded scaling, secondary limits, and documented retry/serialization guidance. | [REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) and [REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api) | A | High | Before load limits or retry changes. |
| S-FA-PLATFORM-015 | Private-repository Actions consumes plan allowances; GitHub Free includes 2,000 minutes/month, 500 MB artifact storage, and 10 GB cache/repository; overage/budget behavior is plan-dependent. | [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | A | High for plan table; account plan unresolved | Reverify exact owner plan and billing before expanding CI. |
| S-FA-PLATFORM-016 | Workflow permissions narrow `GITHUB_TOKEN`; fork PRs normally get read-only token/no secrets, while private-fork policies can widen access. | [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), and [repository Actions settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) | A | High | On workflow/event/settings change. |
| S-FA-PLATFORM-017 | Full commit SHA is GitHub's immutable action reference; unsafe use of `pull_request_target`/`workflow_run` with untrusted checkout can compromise a repo. | [GitHub Actions secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use) | A | High | On workflow changes. |
| S-FA-PLATFORM-018 | EONFOLK was private with strict classic protection and three checks, but zero rulesets and disabled native vulnerability, secret, and code scanning in the dated read-only probe. | Authenticated GitHub REST/CLI reads against `PranavMishra28/eonfolk` on 2026-08-21; related official [ruleset availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) and [secret-scanning availability](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning) | A | High for dated state | Reprobe after account/repository/settings change and before release. |
| S-FA-PLATFORM-019 | Current MCP treats tool annotations as untrusted hints, places consent/security on hosts, requires local HTTP origin/localhost controls, and forbids token passthrough for protected HTTP servers. | [MCP schema](https://modelcontextprotocol.io/specification/2025-11-25/schema), [transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), and [authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) | A | High | On MCP protocol revision or adapter transport change. |
| S-FA-PLATFORM-020 | Codex supports local STDIO/HTTP MCP, trusted-project config, environment forwarding, tool allow/deny lists, and approval modes. | [OpenAI Codex MCP](https://learn.chatgpt.com/docs/extend/mcp) | A | High | Before checked-in Codex MCP config or Codex release change. |
| S-FA-PLATFORM-021 | Codex subagents parallelize specialized work; current guidance favors bounded read-heavy parallelism and cautions on concurrent writes. | [OpenAI Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) | A | High | On coordination-model change. |
| S-FA-PLATFORM-022 | Codex worktrees are separate checkouts sharing Git metadata; one branch cannot be checked out twice; `.worktreeinclude` can copy ignored local files. | [OpenAI Codex worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees) | A | High | On worktree/setup-policy change. |
| S-FA-PLATFORM-023 | Codex skills use progressive disclosure and load full `SKILL.md` after explicit or description-matched selection. | [OpenAI Build skills](https://learn.chatgpt.com/docs/build-skills) | A | High | On skill-loading or invocation-policy change. |

## Final research conclusion

**INFERENCE — KEEP WITH CONDITIONS:** the platform can meet Founder Alpha's local,
account-free, approximately `$0`, non-authoritative feedback goal if the committed
result is deploy-ready but not deployed; GitHub authority is one private,
single-repository, Issues-only App; D1 owns bounded reconciliation; Turnstile is
only one abuse layer; gameplay and local queue remain complete through outage; and
the observer stays local and read-only.

**INFERENCE — DO NOT ENABLE R2 YET:** screenshot code may be tested locally behind
a default-off adapter, but activating R2 crosses a real subscription and cost gate
that an informational budget alert cannot close. Text plus bounded diagnostics is
the honest initial hosted seam.

**UNRESOLVED / NOT RUN:** no Cloudflare account capability, App registration, key
format, real token exchange, Worker CPU profile, D1/R2 deployment, Turnstile
hostname, public abuse test, human feedback flow, production URL, or spend control
was executed. None may be described as verified implementation evidence.
