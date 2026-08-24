# Pull request

## Player or system outcome

<!-- What becomes observably better? Link the issue or evidence. -->

## Boundaries

<!-- List included work, explicit exclusions, and any behavior or data migration. -->

- Included:
- Excluded:
- Reality/cognition/persistence impact:

## Verification

| Check | Result and command |
|---|---|
| Formatting, lint, and typecheck | |
| Unit, deterministic, and property tests | |
| Production build | |
| Critical browser journey | |
| Additional focused checks | |

<!-- Use PASS, FAIL, or NOT RUN with a reason. -->

## Browser evidence

<!-- Required for player-facing changes. Include relevant desktop, laptop, and mobile evidence. A passing build is not a playtest. -->

## Accessibility and performance

- [ ] Consequential actions remain keyboard and semantic-DOM accessible.
- [ ] Reduced-motion behavior was checked where motion changed.
- [ ] Payload, meaningful-display, and frame budgets were measured or unaffected.
- [ ] Weak-device and non-WebGL degradation remains playable.

## Security and privacy

- [ ] Untrusted text and typed authority boundaries remain intact.
- [ ] No credential, telemetry, hosted service, deployment, or new data collection was added unintentionally.
- [ ] Persistence and network behavior were tested if affected.

## Documentation and release notes

- [ ] User or contributor documentation is updated where needed.
- [ ] `CHANGELOG.md` is updated for a notable change, or this is not user-facing.
- [ ] New code, assets, media, and dependencies have recorded origin and compatible license terms, or none were added.

## Risks and reviewer focus

<!-- Name the likeliest regression, untested environment, and files or journeys that deserve careful review. -->
