# Founder Alpha feedback

**Purpose:** Define the local report experience and the optional least-authority hosted relay boundary.

**Status:** IMPLEMENTED LOCALLY — relay core and provider adapters tested; composition, credentials, and deployment not run

**Authority boundary:** This file owns feedback schema, consent, local queue, relay, dedup, quota, retention, and delivery semantics. Feedback never owns game Reality, Chronicle truth, moderation truth, or a public availability claim.

**Related documents:** [security](SECURITY.md), [diagnostics](DIAGNOSTICS.md), [platform research](../research/FOUNDER_ALPHA_PLATFORM_RESEARCH.md), [testing](../quality/TESTING.md), and [Founder Alpha plan](../exec-plans/active/002-founder-alpha.md).

## Owned decision

The complete default is a sanitized, previewed local report queue that gameplay never waits for. A deployment-ready, unconfigured Worker seam may validate a report and reconcile it into one private repository through a narrowly installed GitHub App. No credential, deployment, R2 subscription, public URL, or exactly-once claim is authorized.

## Browser contract

A report contains one category, at most 2,000 Unicode scalar values of sanitized prose, optional consented diagnostics, reproduction/build/schema identifiers, and an optional locally sanitized PNG/JPEG/WebP preview. The browser decodes and re-encodes images before queueing, strips metadata, bounds dimensions/bytes, redacts likely credentials/account identifiers, shows the exact report/attachment/diagnostics state, distinguishes saved locally from uploaded, retries only on user action or a bounded policy, expires queued material after seven days, retains at most three reports, and lets the tester delete each report. Feedback failure cannot pause the world.

Until a reviewed relay URL exists, the honest state is “saved locally; nothing uploaded.” No GitHub token, Cloudflare secret, arbitrary destination, arbitrary URL, or private canonical record enters the browser.

## Optional relay contract

The only accepted route uses exact Origin and method/content-type checks, a 32 KiB JSON envelope, 24 KiB diagnostics, 2,000-scalar prose, no attachment by default, and a 1.1 MiB request ceiling reserved for a separately approved attachment mode. Turnstile Siteverify is mandatory when enabled, with hostname/action/expiry/single-use checks, but is not identity or a quota.

D1 owns atomic reservation, duplicate mapping, one global delivery lease, incident ownership, status, retry, cleanup, and quota state. Expired incident-lease takeover is atomic with the global lease; a failed or competing lease cannot strand an incident or create a second delivery owner. Stable incident fingerprints exclude prose, identity, time, IP, URLs, and private data. Delivery uses one private single-repository GitHub App, Metadata read and Issues write only, short-lived installation tokens, a fixed owner/repository, neutralized Markdown, and one fingerprint marker. Because GitHub issue/comment creation has no documented idempotency key, the claim is reconciled at-least-once delivery with tested duplicate suppression.

Compile-time application caps are five accepted reports per HMAC-keyed source bucket/hour and ten/day, 20/fingerprint/day, 100 globally/day, 1,000/rolling 30 days, and one GitHub mutation lease no faster than one/second. The source bucket is derived from `CF-Connecting-IP` with an operator secret and the raw address is never stored. Missing source or HMAC capability fails closed. Whether that derived bucket is acceptable remains a predeployment privacy decision. Retry honors `Retry-After`, uses bounded backoff, and never loops indefinitely.

## Retention and cost boundary

Unsanitized material is never persisted. Browser storage is parsed as hostile input: unsupported versions, future or expired timestamps, oversized JSON, too many reports, and out-of-contract attachment/diagnostic payloads are rejected or pruned before use. The local queue is limited to three reports, seven days, and 4 MiB total. Relay staging expires after seven days; acknowledged staging is cleared, and dedup/status/counters are cleaned after 30 days without deleting a live lease. Cleanup failure rejects the request rather than silently admitting unbounded state. Worker persisted invocation/custom logs are disabled and never contain report bodies. GitHub issues remain private until founder triage/deletion.

R2 is off and no attachment upload adapter is configured. Enabling it would require separate approval, subscription/cost revalidation, one private object ≤1 MiB, a 1 GiB reserved live-byte ceiling, seven-day lifecycle plus documented deletion delay, digest/type/size validation, private retrieval, and deletion tests. Cloudflare budget alerts do not count as a spend cap.

## Security, verification, and reopen evidence

Fake adapters inject lost create/comment responses, duplicate retry, marker reconciliation, lease expiry, Turnstile replay/expiry, 403/410/422/429/5xx, origin/schema/MIME/size violations, and D1/quota exhaustion. The implemented provider layer uses an injected fetch boundary for Turnstile Siteverify, exact fixed-repository GitHub Issues operations, and WebCrypto RS256 GitHub App installation-token minting. Tests prove exact HTTPS hosts and paths, manual redirect rejection, bounded JSON/MIME/status/schema handling, the fixed repository and permission surface, no arbitrary repository input, neutralized Markdown, bounded responses, safe outage, and no browser egress when feedback is unused. No provider SDK, credential, network call, Worker binding, or deployment configuration is present. A real deployment additionally requires current quotas/prices/log defaults, Worker key import and CPU under the Free limit, actual account capability, abuse review, rollback, and explicit operator authorization.

## Rejected alternatives and uncertainty

Rejected: client PAT/App credentials, public issue repo, arbitrary webhook, exactly-once claim, automatic Actions deployment, R2 by default, public/pre-signed attachment URL, provider-free-tier guarantees, and Turnstile as the only abuse control. The provider implementations are exercised only with injected deterministic fetch fixtures. No live Cloudflare/D1/Turnstile/GitHub App path, public abuse behavior, Worker CPU/bundle profile, GitHub search consistency observation, or human feedback usability has run.

## Resulting implementation behavior and constraint fit

Local feedback works for free and offline; the optional relay has zero game authority and can be deleted without changing world behavior. No present spend, account, credential, partnership, enterprise process, or production operation is required.
