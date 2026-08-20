# World structure and topology

**Purpose:** define canon, region bounds, local-first semantics, mature entry, stagnation, and later private forks.

**Status:** DECISION PROPOSED

**Authority boundary:** this file owns product topology. [WORLD_MODEL](../game/WORLD_MODEL.md) owns simulation ontology; [PROGRESSION](PROGRESSION.md) owns continuity; engineering authorities own persistence adapters.

**Related documents:** [product](PRODUCT.md), [tournament](../research/GAME_DESIGN_RESEARCH.md), [distribution](DISTRIBUTION.md), [Chronicle](CHRONICLE.md)

## Owned decision

The long-term product has **one bounded canonical region**: a named, finite geography whose event order is authoritative and whose citizens, artifacts, property, relationships, and institutions persist. Later regions may exist only after operations evidence. A private World Fork is a snapshot-derived counterfactual that never writes back to canon.

The 001 proof implements no public shared world. One local save is treated as the player's semantic canon and stored in IndexedDB behind `PersistencePort`. This proves causal continuity without pretending that a server exists.

## Boundaries

- Region: one settlement and its immediately modeled resource sites; no seamless planet.
- Population: eight in the slice, practical rendering at twelve; long-term scale reopens after measurement.
- Time: seeded simulation time advanced by commands/scheduler and bounded catch-up, never wall-clock authority in the simulation.
- Canon: append-only accepted events plus versioned snapshots; presentation never changes facts.
- Crossing: cross-region messages/migration are interruption boundaries in the contract, not slice features.
- Fork: exact snapshot + event interval + versions + seed; clearly labeled private counterfactual; no canonical merges, resources, reputation, or leaderboard effect.

## Canonical region behavior

Canon supplies common consequence, not real-time obligation. Citizens use Standing Plans and Standard Brain while a running/catch-up simulation advances. Stable production may aggregate; death, shortage, ownership change, plan expiry, institution change, and cross-region messages stop aggregation. Public canon later requires a region authority and moderation boundary; it is not authorized by the local proof.

## Newcomer relevance

Entry begins with one low-status/currently consequential citizen, not a history exam. The UI reveals only facts causally relevant to their present tension. Mature regions must continually produce roles through maintenance, apprenticeship, vacancies, migration, contested precedent, and lost/found artifacts. If newcomers need empty land, privileged currency, or a reset region, the topology has failed.

## Stagnation behavior

Detect equilibrium by meaningful-state changes, not raw event count. If a configured era contains no change to relationship polarity, ownership, role, Standing Plan, scarcity boundary, or institution, introduce only a seeded systemic pressure from modeled conditions and expose its provenance. Never use hidden model-authored drama. For the first slice, the Riverhold shortage is the sole crafted pressure and no adaptive director exists.

## Private World Fork policy

Forks answer “what might have happened?” without corrupting “what did happen?” A replay of recorded canon is factual. A fork is counterfactual. Its presentation must show fork origin, command difference, engine/schema versions, and a visible non-canon label. Share artifacts may compare two histories only if both were actually simulated; otherwise alternative outcome is “unknown.” Implementation is deferred past both gates.

## Rejected alternatives

Reject a planet-scale launch, multiple public shards, peer-to-peer canon, World Fork merges, reset seasons, always-on real-time need decay, and player-owned emergency production dependencies. Reject treating the local save as evidence that a public region server is operational.

## Reopen evidence

Reopen one-region canon if concurrency/operations measurements make it unsafe, newcomers cannot find meaningful stakes, or private forks produce stronger attachment with no canon. Reopen local-first only if Gate A/B fundamentally require another human in the same live world—evidence not currently present.

## Remaining uncertainty

**PRODUCT HYPOTHESIS:** a bounded region feels alive rather than small. **UNRESOLVED:** public region population/concurrency, moderation, fork demand, and mature-world entry quality. All require post-gate spikes or players.

## Resulting implementation behavior

The slice builds one hand-authored settlement layout, one deterministic seed, local event/snapshot persistence, controlled catch-up, and replay. It defines server replacement boundaries but includes no Cloudflare adapter, account, network protocol, deployment, public write, multiple region, or fork.

## Constraint fit

Local canon fits 52 hours, M4, $0, free use, and no owned infrastructure. It creates no credential, regulated data, payment, partnership, proprietary dataset, enterprise, or training dependency.
