# Source-release boundary

This repository is a sanitized source snapshot of the EONFOLK pre-alpha. It
contains the local game, its reproducible tests, current product media, and the
public documentation needed to understand or contribute to it.

The source release does not include a hosted game, accounts, telemetry,
multiplayer, payments, production operations, or private engineering evidence.
The original private development history was intentionally excluded because it
contains machine-local paths and internal planning records that are irrelevant
to using the project. `PUBLICATION_MANIFEST.json` binds every exported file to
the accepted private source tree without exposing that history.

Any future release must be produced from an accepted source tree, verify from a
fresh install, and retain the same license, asset-provenance, privacy, security,
and no-model behavior described by the reader documentation. A source release
does not imply that a public service exists or that the pre-alpha has been
validated for long-term player retention.
