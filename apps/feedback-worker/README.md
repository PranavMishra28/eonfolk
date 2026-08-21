# Founder Alpha feedback Worker

This package is the deploy-ready, credential-free core of the private Founder
Alpha feedback relay. It exports a Worker-style `fetch(Request)` handler assembled
by `createFeedbackWorker`. The caller must supply four explicit capabilities:

- exact allowed browser origins and expected Turnstile hostname/action;
- a server-side Turnstile verification port;
- the `D1FeedbackRepository` over a migrated D1 binding; and
- a private GitHub App delivery port fixed to the one approved repository.

The endpoint is `POST /v1/feedback`. It accepts at most 32 KiB of JSON, 2,000
Unicode scalar values of prose, and a small allowlisted diagnostic projection.
Unknown properties are rejected. Attachments and every R2 path are intentionally
absent (`ATTACHMENTS_ENABLED` is `false`). Browser credentials, GitHub repository
selection, raw Reality, arbitrary URLs, and unconsented diagnostics are not part
of the schema.

Migration `migrations/0001_feedback_relay.sql` atomically reserves accepted
submissions, enforces compile-time global/fingerprint quotas, and creates the
fingerprint owner. A bounded lease serializes GitHub mutations. Every delivery is
reconciled by hidden submission/fingerprint markers before creating an issue or
comment. This is tested duplicate suppression for at-least-once delivery; it is
not an exactly-once claim. Staged prose is cleared from the live row after an
acknowledged or reconciled delivery.

No Wrangler configuration, account/resource identifier, public route, secret,
deployment script, or automatic deployment is included. Creating Cloudflare
resources, installing the private GitHub App with Metadata read and Issues
read/write, setting Worker secrets, measuring the final bundle/CPU, and performing
the first deployment are manual security/cost gates and are **NOT RUN**.
