# Release Genesis feedback

**Purpose:** Define the bounded, local-only in-game feedback experience.

**Status:** IMPLEMENTED LOCALLY — no relay, account, credential, or upload path

**Authority boundary:** This file owns feedback consent, sanitization, local retention, and deletion. Feedback never owns Reality, Chronicle truth, diagnostics truth, or release readiness.

**Related documents:** [security](SECURITY.md), [diagnostics](DIAGNOSTICS.md), [testing](../quality/TESTING.md), and [V1 plan](../exec-plans/active/003-v1-civilization.md).

## Owned decision

V1 feedback is an explicit in-game bug/report control that opens a bounded local form and saves sanitized reports only in the current browser. It is not a full-width bottom drawer over the world. It has no network relay, provider adapter, deployment configuration, destination account, or automatic retry. The interface says this before and after saving. Feedback failure cannot pause or mutate the world.

Evidence that would reopen this decision is a separately approved public test requiring remote collection, with a current privacy, abuse, cost, credential, retention, and deletion design. A hypothetical future relay is not retained as dormant production code.

## Executable contract

A local report contains one bounded category, sanitized prose, optional diagnostics enabled only by an unchecked-by-default consent control, and an optional image that the browser decodes, bounds, and re-encodes before saving. The player sees the exact sanitized preview.

The queue:

- accepts at most three reports and 4 MiB total;
- expires reports after seven days;
- redacts likely credentials and account identifiers;
- rejects unsupported versions, oversized or malformed input, and unsafe attachments;
- exposes per-report and clear-all deletion;
- never stores raw world state, prompts, hidden reasoning, credentials, browser history, or unbounded logs; and
- never opens a network request.

Consented diagnostics are a bounded source-redacted observer projection. Saving a report, enabling diagnostics, adding an attachment, reloading, and deleting reports must preserve the authoritative world head and IndexedDB fingerprint.

## Rejected alternatives and uncertainty

Rejected for V1: client tokens, arbitrary webhooks, a public issue repository, Cloudflare/D1/Turnstile code, provider SDKs, background upload, automatic deployment, and claims of eventual or exactly-once delivery. These add dormant security and operational surface to an account-free local benchmark.

Human usability of the feedback wording remains unproven. Reopen the interface if browser playtests show that players mistake local saving for submission, cannot find deletion, or cannot understand diagnostics consent.

## Resulting implementation behavior and constraint fit

Feedback works offline and at approximately $0, requires no account or credential, and stays outside Reality. Removing every future hosted service leaves the complete V1 product and feedback path intact.
