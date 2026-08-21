# Founder Alpha feedback Worker

This package is the deploy-ready, credential-free core of the private Founder
Alpha feedback relay. It exports a Worker-style `fetch(Request)` handler assembled
by `createFeedbackWorker`. The caller must supply five explicit capabilities:

- exact allowed browser origins and expected Turnstile hostname/action;
- a server-side Turnstile verification port;
- the `D1FeedbackRepository` over a migrated D1 binding; and
- a private GitHub App delivery port fixed to the one approved repository.
- a server-only rotating source-quota port. `createHmacSourceQuotaPort` derives
  non-reversible, non-linkable hour and UTC-day buckets from the Cloudflare
  source header; the raw address never leaves that capability.

`createCloudflareTurnstilePort` supplies the concrete Siteverify adapter using an
injected secret and optional injected `fetch`. `createGitHubIssuePort` supplies
the concrete GitHub Issues adapter and rejects every destination except
`PranavMishra28/eonfolk`. It obtains short-lived credentials only through an
`InstallationTokenProvider`. `createGitHubAppInstallationTokenProvider` is the
included Cloudflare-compatible token authority: it signs a nine-minute RS256 JWT
with WebCrypto from an injected, unencrypted PKCS#8 key and exchanges it for an
installation token. Secrets and tokens are never accepted from a request,
returned in an error, or logged. Provider calls use exact HTTPS origins and
paths, manual redirect handling, bounded JSON responses, and required response
schema checks.

The endpoint is `POST /v1/feedback`. It accepts at most 32 KiB of JSON, 2,000
Unicode scalar values of prose, and a small allowlisted diagnostic projection.
Unknown properties are rejected. Attachments and every R2 path are intentionally
absent (`ATTACHMENTS_ENABLED` is `false`). Browser credentials, GitHub repository
selection, raw Reality, arbitrary URLs, and unconsented diagnostics are not part
of the schema.

Migration `migrations/0001_feedback_relay.sql` atomically reserves accepted
submissions, enforces five/source/hour, ten/source/day, fingerprint, global-day,
and rolling-global quotas, and creates the fingerprint owner. Duplicate
submission IDs do not consume quota. Hour and day source keys rotate at exact UTC
boundaries with no overlap or stable cross-window identifier. A bounded lease
serializes GitHub mutations, including atomic reacquisition of both the incident
and singleton lease after expiry. Every delivery is
reconciled by hidden submission/fingerprint markers before creating an issue or
comment. This is tested duplicate suppression for at-least-once delivery; it is
not an exactly-once claim. Staged prose is cleared from the live row after an
acknowledged or reconciled delivery. The Worker runs a fail-closed, bounded,
idempotent cleanup before reservation: abandoned staging is cleared after seven
days and submission, incident, and quota metadata is removed after 30 days,
without purging a live lease. Cleanup failure prevents any GitHub mutation.

No Wrangler configuration, account/resource identifier, public route, secret,
deployment script, or automatic deployment is included. Creating Cloudflare
resources, installing the private GitHub App with Metadata read and Issues
read/write, setting Worker secrets, measuring the final bundle/CPU, and performing
the first deployment are manual security/cost gates and are **NOT RUN**.
