# Security policy

EONFOLK is an unreleased, local-first pre-alpha. It has no production service,
account system, payment path, or supported public data store. Security reports
are still valuable, especially for world-state integrity, browser storage,
injection, dependency supply chain, and local network behavior.

## Supported version

There is no released version yet. Security fixes target the latest commit on the
default branch; older commits and personal forks are not supported.

## Reporting a vulnerability

GitHub Private Vulnerability Reporting is not currently available through the
repository's probed API. Until a private channel is enabled:

1. Open a minimal issue titled `Security report: private follow-up requested`.
2. Include only the affected area and a way to continue through your GitHub
   account.
3. Do **not** include an exploit, secret, personal data, private world data, or
   detailed reproduction in the public issue.

The maintainer will acknowledge reports on a best-effort basis and arrange a
private exchange when possible. Repository capabilities may change; if GitHub's
private **Report a vulnerability** action appears, prefer it.

For an active threat to people or GitHub infrastructure, use GitHub's own abuse
or security-reporting channels.

## What to include privately

- affected commit and component;
- impact and required preconditions;
- a minimal reproduction or proof of concept;
- whether data exposure, canonical-state corruption, external network access,
  or credential handling is involved; and
- any known mitigation.

## Security boundaries

The intended pre-alpha loads no remote third-party scripts or analytics and has
no required model provider, public canonical writes, or server credential.
Browser storage is treated as untrusted on load. User and generated prose must
render as inert text, and only validated typed actions may change canonical
Reality.

Do not test against systems or accounts you do not own. Do not upload real
personal, regulated, confidential, or credential-bearing data to a report.
