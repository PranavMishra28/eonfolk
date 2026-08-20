# Player-facing game systems

**Purpose:** define the smallest set of rules that produces visible life and one consequential social story, while separating primitives, composed systems, and unproven emergence.

**Status:** ACCEPTED AFTER RED TEAM — scenario-scoped proof only

**Authority boundary:** this file owns player-facing mechanics and scope. [WORLD_MODEL](WORLD_MODEL.md) owns facts/invariants; [HUMAN_LOOP](../product/HUMAN_LOOP.md) owns player verbs; engineering authorities own implementation.

**Related documents:** [product](../product/PRODUCT.md), [agent life](AGENT_LIFE.md), [economy](ECONOMY.md), [governance](GOVERNANCE.md)

## Owned decision

Gate A uses exactly these visible systems:

- eight citizens with hunger/thirst/rest pressure and four behavior families: maintain self, acquire resource, fulfill Standing Plan, respond socially;
- movement among a crafted settlement, water, wood, and food sites;
- three conserved resources: food, water, wood;
- gathering and consumption;
- one bilateral exchange tied to Riverhold's repair pressure (Iven transfers wood; Toma transfers food rations; both ownership changes settle atomically);
- one simple scenario conversion (`2 wood + work → repair mill fixture`), not a crafting graph;
- public/private communication as typed messages;
- relationships, sourced beliefs, reputation markers, and Standing Plans sufficient for Riverhold;
- one sponsor/counsel boundary and Chronicle chain in Gate B.

## Primitive → system → emergence boundary

| Layer | Owned examples | Claim discipline |
|---|---|---|
| Primitive | need delta, item quantity, move, observe, message, relationship delta, ownership transfer, plan step, seeded choice | deterministic rule, directly testable |
| Composed system | gathering/consumption, bilateral exchange, repair, trust response, counsel interpretation, bounded catch-up | explainable composition of primitives |
| Candidate emergence | friendship affects supply response; verification changes confrontation; shortage plus reputation yields a civic petition | **PRODUCT HYPOTHESIS** until repeated play shows unplanned yet legible outcomes |

Raw event volume, random dialogue, or a rare combination is not evidence of emergence.

## Proof scenario

Riverhold begins with the spring boundary, a food-ledger mismatch, a sealed worker-ration reserve tied to mill repair, and Mara/Toma's close relationship. Routine systems make citizens visibly live; Mara's investigation changes an authoritative belief. Two advice intents plus abstain branch from the same snapshot into at least three terminal relationship/belief/petition/resource vectors. The petition/rule outcome is one scenario rule, not generalized politics.

## Information design

World actions must be readable without a log: destination/task marker, carried resource, interaction pairing, and state change appear in the scene and semantic list. Raw needs remain inspectable but are not the main surface. Consequential choices expose known facts, sourced beliefs, uncertainty, possible stakes, and why the current actions are legal.

## Rejected alternatives

Reject generalized farming, recipes/tech tree, order book, currency, labor market, housing simulation, combat, disease, reproduction, law/religion/war depth, freeform contracts, terrain generation, direct scheduling, and unrestricted speech. Reject “one of everything” breadth.

## Reopen evidence

Add a system only if Gate A cannot show understandable autonomy or Gate B cannot produce three counterfactual Riverhold consequences with the existing primitives. Remove a system if observers cannot notice/explain it. Exchange and repair must feed the same pressure/characters; they are cut before becoming generic systems.

## Remaining uncertainty

**PRODUCT HYPOTHESIS:** four behavior families are enough to look alive. **UNRESOLVED:** whether a scenario-scoped civic rule feels like genuine system consequence. **UNRESOLVED:** the minimal scene animation required for two-citizen interaction.

## Resulting implementation behavior

Tests prove resource conservation, legal movement, need bounds, exchange atomicity, repair cost, plan transitions, hidden-fact isolation, and replay. Visual review proves eight citizens, three identifiable activities, and one social interaction at all required sizes.

## Constraint fit

The bounded surface is explicitly sized for one builder and 52 hours on M4. It runs locally for $0, without model, training, proprietary data, accounts, payments, partnerships, or server operations.
