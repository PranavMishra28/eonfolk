import { describe, expect, it } from "vitest";
import {
	inspectSpatialProjection,
	projectSpatialScene,
	riverholdSpatialScene,
	type SpatialCitizenInput,
} from "../../../packages/world-presentation/src/index.js";

const source = {
	runId: "run_living_world_fixture",
	regionId: "riverhold",
	revision: 12,
	throughSequence: 31,
	stateHash: "d".repeat(64),
} as const;

function citizen(
	slug: string,
	name: string,
	placeId: string,
	canonicalAction: SpatialCitizenInput["canonicalAction"],
	carriedProp: SpatialCitizenInput["carriedProp"] = null,
): SpatialCitizenInput {
	return {
		citizenId: `citizen:${slug}`,
		slug,
		name,
		role: `${slug} role`,
		placeId,
		activity: `performing ${canonicalAction.kind}`,
		activityKind: canonicalAction.kind === "repair" ? "mill" : "trade",
		focal: slug === "mara",
		carriedProp,
		canonicalAction,
	};
}

const action = (
	id: string,
	kind: SpatialCitizenInput["canonicalAction"]["kind"],
	originPlaceId: string,
	destinationPlaceId: string,
	overrides: Partial<SpatialCitizenInput["canonicalAction"]> = {},
): SpatialCitizenInput["canonicalAction"] => ({
	actionId: id,
	sourceKind: "current-behavior",
	eventId: null,
	eventSequence: null,
	status: "in-progress",
	kind,
	originPlaceId,
	destinationPlaceId,
	affordanceId: null,
	affordanceSlotIndex: null,
	targetId: destinationPlaceId,
	simulationStart: 0,
	simulationEnd: null,
	resultEventId: null,
	...overrides,
});

const citizens: readonly SpatialCitizenInput[] = [
	citizen(
		"mara",
		"Mara Vale",
		"market",
		action("walk:mara", "walk", "market", "granary"),
	),
	citizen(
		"toma",
		"Toma Reed",
		"market",
		action("exchange:31", "exchange", "market", "market", {
			affordanceId: "market-exchange",
			affordanceSlotIndex: 0,
			targetId: "citizen:iven",
		}),
		"grain",
	),
	citizen(
		"iven",
		"Iven Holt",
		"market",
		action("exchange:31", "exchange", "market", "market", {
			affordanceId: "market-exchange",
			affordanceSlotIndex: 1,
			targetId: "citizen:toma",
		}),
		"logs",
	),
	citizen(
		"sela",
		"Sela Fen",
		"spring",
		action("carry:sela", "carry", "spring", "market"),
		"water",
	),
	citizen(
		"rowan",
		"Rowan Pike",
		"woods",
		action("carry:rowan", "carry", "woods", "mill"),
		"logs",
	),
	citizen(
		"neri",
		"Neri Ash",
		"fields",
		action("gather:neri", "gather", "fields", "fields", {
			affordanceId: "fields-food",
		}),
	),
	citizen(
		"odo",
		"Odo Bell",
		"mill",
		action("repair:odo", "repair", "mill", "mill", {
			affordanceId: "mill-repair",
		}),
		"tool",
	),
	citizen(
		"els",
		"Els Wren",
		"granary",
		action("inspect:els", "inspect", "granary", "granary", {
			affordanceId: "granary-ledger",
		}),
	),
];

describe("temporal living-world projection", () => {
	it("moves only actors with typed travel along authored entrances and routes", () => {
		const first = projectSpatialScene({
			source,
			citizens,
			presentationTick: 0,
		});
		const later = projectSpatialScene({
			source,
			citizens,
			presentationTick: 180,
		});

		expect(first.actors).toHaveLength(8);
		expect(later.actors.map(({ citizenId }) => citizenId)).toEqual(
			first.actors.map(({ citizenId }) => citizenId),
		);
		for (const citizenId of ["citizen:mara", "citizen:sela", "citizen:rowan"]) {
			const before = first.actors.find(
				(actor) => actor.citizenId === citizenId,
			);
			const after = later.actors.find((actor) => actor.citizenId === citizenId);
			expect(before).toBeDefined();
			expect(after).toBeDefined();
			expect(after?.positionMm).not.toEqual(before?.positionMm);
			expect(after?.routeNodeIds.length).toBeGreaterThan(1);
		}
		expect(
			later.actors.find(({ citizenId }) => citizenId === "citizen:mara")
				?.routeNodeIds,
		).toContain("granary:entry");
		expect(
			later.actors.find(({ citizenId }) => citizenId === "citizen:sela")
				?.routeNodeIds,
		).toContain("spring:entry");
		expect(
			later.actors.find(({ citizenId }) => citizenId === "citizen:rowan")
				?.routeNodeIds,
		).toContain("mill:entry");
		expect(inspectSpatialProjection(later, first).mismatches).toEqual([]);
	});

	it("grounds work and social states in reserved authored affordances", () => {
		const projection = projectSpatialScene({
			source,
			citizens,
			presentationTick: 60,
		});
		const odo = projection.actors.find(
			({ citizenId }) => citizenId === "citizen:odo",
		);
		const work = riverholdSpatialScene.nodes["mill:work"];
		expect(odo?.animationClass).toBe("repair");
		expect(odo?.prop).toBe("tool");
		expect(odo?.positionMm).toMatchObject({ x: work?.x, z: work?.z });
		expect(projection.interactions).toHaveLength(1);
		expect(projection.interactions[0]?.participantIds).toEqual([
			"citizen:toma",
			"citizen:iven",
		]);
		expect(projection.teleportCount).toBe(0);
		expect(projection.contradictionCount).toBe(0);
	});
});
