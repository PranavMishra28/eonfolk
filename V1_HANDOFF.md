# V1 handoff

**Purpose:** Bind the exact-candidate Release Genesis evidence and state honest limitations after the frozen-SHA lattice.

**Status:** PREMERGE CANDIDATE CONTROL

**Authority boundary:** This file does not amend GOAL.md requirement text, frozen software, or Reality. It reports the completed premerge lattice.

## Exact identities

| Item | Value |
|---|---|
| initialReviewSha | `3b07af7828d6b5774472295e92f52620719afe44` |
| frozenCandidateSha | `9500762b4510fcd7580b4bb9268f1c3146bafdba` |
| Hosted Verify on frozen SHA | run `32925814317` |
| Target-Mac intermediate | run `32934694679` attempt 1 |
| DEEP outputSha256 | `6abcf037bc2861912f271915194f113ab2988caa9e60c28813fed52fdd9a3067` |
| Intermediate runner | `eonfolk-deep-20260825n8q2` (id 25), observed absent after the job |

## What the lattice proved

The six independent reviews inspected `initialReviewSha`. Accepted P0/P1 findings were closed on the frozen candidate, principally by `b7738df`, then confirmed against the exact DEEP PASS. Target-Mac 32-step DEEP ran as non-admin `eonfolk-ci` on the ephemeral nonce runner and produced a hosted-finalized PASS whose source start/end commit is the frozen SHA.

## Honest limitations

- Premerge receipts remain `PREMERGE_CANDIDATE_CONTROL`. Hosted Verify still executes candidate scripts; compensating controls are frozen-control checkout, CONTROL_PATHS comparison, inert evidence checkout, and human review of this tail.
- Reviewer agent/session IDs are self-reported, not cryptographic.
- The Mac runner-absence probe is a coordinator `gh api` observation, not a cryptographic proof that no other runner existed.
- Accuse-accepted public allegation remains Mara-gated; the return action is Chronicle focus, not a second first-boundary WorldCommand.
- Human studies, physical-device, screen-reader, live-provider, deployment, and spend remain not run / not deployed.
- The mandatory post-merge row is a fresh push-to-`main` reattestation of the two-parent merge commit.

## Operator next step after merge

Keep `feat/v1-civilization` until the push-to-main run is green, then clean tags/worktrees whose unique heads are tag-reachable.
