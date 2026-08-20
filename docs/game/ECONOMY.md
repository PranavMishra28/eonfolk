# Resources, ownership, exchange, and production boundary

**Purpose:** define the smallest material economy needed for understandable autonomous behavior and one social consequence.

**Status:** ACCEPTED FOR THE SCENARIO-SCOPED FIRST PROOF

**Authority boundary:** this file owns resource and exchange semantics. [WORLD_MODEL](WORLD_MODEL.md) owns invariants; [GAME_SYSTEMS](GAME_SYSTEMS.md) owns visible scope; engineering simulation owns algorithms.

**Related documents:** [product](../product/PRODUCT.md), [governance](GOVERNANCE.md), [Chronicle fixture](../product/CHRONICLE.md)

## Owned decision

The 001 economy is deliberately not generalized:

- conserved integer quantities: food, water, wood;
- citizen and settlement storage locations with explicit ownership/custody;
- gathering from seeded sites, need-driven consumption, and bounded stable production during catch-up;
- one atomic Riverhold exchange: Iven transfers repair wood while Toma transfers food rations, both between present parties;
- one recipe: two wood plus a work action repairs the mill fixture;
- a 12-food public worker-ration reserve for that repair whose sealed/open classification drives Riverhold's ledger mismatch.

No currency is required. A trade is valid only when both parties own/custody the offered stacks, both accept in the same expected revision, quantities remain nonnegative, and all transfers append atomically or none do.

## Ownership and ledger truth

Ownership, custody, location, accessibility, and intended use are separate fields. Toma moving public grain into a sealed public reserve changes accessibility/location, not ownership. Therefore the Chronicle may report concealment from open-bin view and may not report theft. This distinction is a product truth requirement, not bookkeeping polish.

## Catch-up rule

Stable gathering/consumption may aggregate only while rates, ownership, availability, needs, plans, and access rules stay within declared boundaries. Shortage, failed repair, empty site, exchange, ownership change, plan expiry, death, or scenario shock interrupts aggregation and emits meaningful events/checkpoints.

## Rejected alternatives

Reject currency, prices, market maker, order book, wages, debt, taxes, generalized contracts, supply chains, inventories of dozens of goods, farming seasons, crafting tree, durability system beyond the fixed repair, and player-run economy. Reject floats and implicit resource creation/destruction.

## Reopen evidence

Add a resource or exchange form only if observers cannot understand citizen motives or Riverhold cannot generate the accepted consequence. Generalize economy only after both gates and evidence that material strategy—not additional social clarity—is the missing depth.

## Remaining uncertainty

**PRODUCT HYPOTHESIS:** three resources create enough visible life without feeling like a tutorial sandbox. **UNRESOLVED:** exact rates, reserves, and UI abstraction. Balance is fixture-based, not an economic model claim.

## Resulting implementation behavior

Tests cover conservation, nonnegative quantities, unique custody/location, atomic exchange/idempotency, recipe input/output, aggregation equivalence, and ledger/reserve presentation. No economy SDK, price service, payment rail, wallet, or real asset exists.

## Constraint fit

Three resources, one trade, and one repair fit the 52-hour/M4/$0 proof and keep V1 free. They create no revenue, payment/custody, license business, proprietary data, model/training, partnership, regulated data, or enterprise motion.
