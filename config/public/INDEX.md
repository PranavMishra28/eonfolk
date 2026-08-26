# Documentation

Start with the [project overview](../README.md), then use the shortest document
that owns your question.

| Concern | Document |
|---|---|
| Player promise, loop, current mechanics, and exclusions | [Gameplay](GAMEPLAY.md) |
| Runtime, authority, persistence, cognition, and trust boundaries | [Architecture](ARCHITECTURE.md) |
| Local setup, packages, and change rules | [Development](DEVELOPMENT.md) |
| Verification tiers, CI, and blocking behaviors | [Testing](TESTING.md) |
| Keyboard, semantic UI, motion, contrast, and weak-device fallback | [Accessibility](ACCESSIBILITY.md) |
| Payload, display, frame, and population budgets | [Performance](PERFORMANCE.md) |
| Primary research that shaped technical choices | [Research](RESEARCH.md) |
| Sanitized source-release boundary | [Source-release boundary](PUBLICATION.md) |

Community policies live at the repository root:

- [Roadmap](../ROADMAP.md)
- [Contributing](../CONTRIBUTING.md)
- [Code of conduct](../CODE_OF_CONDUCT.md)
- [Security](../SECURITY.md)
- [Support](../SUPPORT.md)
- [Changelog](../CHANGELOG.md)
- [License and third-party notices](../THIRD_PARTY_NOTICES.md)

The TypeScript types, executable tests, and formal model are the final authority
for implemented behavior. Documentation must be updated when those contracts
change.
