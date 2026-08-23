import { describe, expect, it } from "vitest";

import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import {
	createReleaseGenesis,
	jcs,
	stateHash,
} from "../../../packages/protocol/src/index.js";
import {
	projectGeneratedCivilizationSpatial,
	type GeneratedSpatialActivityInput,
	type GeneratedSpatialCivilizationInput,
} from "../../../packages/world-presentation/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

const SEEDS = [
	"8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f",
	"102030405060708090a0b0c0d0e0f000112233445566778899aabbccddeeff00",
	"ffeeddccbbaa9988776655443322110000f0e0d0c0b0a0908070605040302010",
] as const;

async function checkpoint(seedHex: string = SEEDS[0], ordinal = 0) {
	const world = await generateWorld({
		releaseGenesis: await createReleaseGenesis({
			releaseId: `spatial-adapter-${ordinal}`,
			seedHex,
		}),
	});
	return runCivilizationExperiment({ world, horizonDays: 30 });
}

function withCitizens(
	run: Awaited<ReturnType<typeof checkpoint>>,
	count = 1,
): GeneratedSpatialCivilizationInput {
	const originSettlementId = run.seedConditions.originSettlementId;
	const project = Object.values(run.state.projects)[0];
	const fallbackSiteId = Object.values(run.world.settlements).find(
		(record) => record.value.settlementId === originSettlementId,
	)?.value.siteIds[0];
	const siteId = project?.siteId ?? fallbackSiteId;
	if (siteId === null || siteId === undefined)
		throw new Error("fixture lacks a canonical citizen site");
	const citizenIds = Array.from(
		{ length: count },
		(_, index) =>
			run.state.references.citizenIds[index] ??
			`projected-citizen-${String(index + 1).padStart(2, "0")}`,
	);
	return {
		...run.state,
		references: {
			...run.state.references,
			citizenIds: [
				...run.state.references.citizenIds,
				...citizenIds.filter(
					(citizenId) => !run.state.references.citizenIds.includes(citizenId),
				),
			].sort(),
		},
		citizens: Object.fromEntries(
			citizenIds.map((citizenId) => [
				citizenId,
				{
					schemaVersion: "eonfolk-civilization-social-v1" as const,
					citizenId,
					settlementId: originSettlementId,
					siteId,
					householdId: null,
					primaryRoleId: "builder",
					residenceState: "resident" as const,
				},
			]),
		),
	};
}

function slotActivity(input: {
	readonly run: Awaited<ReturnType<typeof checkpoint>>;
	readonly state: GeneratedSpatialCivilizationInput;
	readonly citizenId: string;
	readonly ordinal?: number;
}): GeneratedSpatialActivityInput {
	const citizen = input.state.citizens[input.citizenId];
	if (citizen === undefined) throw new Error("fixture lacks citizen");
	const slot = Object.values(input.run.world.interactionSlots)
		.map((record) => record.value)
		.filter((candidate) => candidate.siteId === citizen.siteId)
		.sort((left, right) =>
			left.interactionSlotId.localeCompare(right.interactionSlotId),
		)[0];
	if (slot === undefined) throw new Error("fixture lacks a grounded slot");
	return {
		schemaVersion: "eonfolk-generated-spatial-activity-v1",
		citizenId: citizen.citizenId,
		canonicalAction: {
			actionId: `scheduler-action-${input.ordinal ?? 0}`,
			sourceKind: "current-behavior",
			eventId: null,
			eventSequence: null,
			status: "in-progress",
			kind: "inspect",
			originPlaceId: citizen.siteId,
			destinationPlaceId: citizen.siteId,
			affordanceId: slot.interactionSlotId,
			affordanceSlotIndex: 0,
			targetId: null,
			simulationStart: input.state.simulationTime,
			simulationEnd: null,
			resultEventId: null,
		},
		location: {
			kind: "interaction-slot",
			interactionSlotId: slot.interactionSlotId,
		},
		projectId: null,
		carriedProp: null,
		focal: (input.ordinal ?? 0) === 0,
	};
}

describe("generated civilization spatial adapter", () => {
	it("fails closed honestly when canonical people lack scheduler activities", async () => {
		const run = await checkpoint();
		const projection = projectGeneratedCivilizationSpatial({
			world: run.world,
			civilization: run.state,
			checkpoint: run,
			settlementId: run.seedConditions.originSettlementId,
			presentationTick: 0,
		});

		expect(run.state.references.citizenIds).toHaveLength(8);
		expect(Object.keys(run.state.citizens)).toHaveLength(8);
		expect(projection.availability).toEqual({
			status: "unavailable",
			reasons: ["canonical-activities-unavailable"],
		});
		expect(projection.spatial.actors).toEqual([]);
		expect(projection.local.sites.length).toBeGreaterThan(0);
		expect(projection.scene.places).not.toEqual({});
	});

	it("requires scheduler-owned activities instead of fabricating current actions", async () => {
		const run = await checkpoint();
		const state = withCitizens(run);
		const projection = projectGeneratedCivilizationSpatial({
			world: run.world,
			civilization: state,
			checkpoint: run,
			settlementId: run.seedConditions.originSettlementId,
			presentationTick: 17,
		});

		expect(projection.availability).toEqual({
			status: "unavailable",
			reasons: ["canonical-activities-unavailable"],
		});
		expect(projection.spatial.actors).toEqual([]);
	});

	it("unifies canonical sites, buildings, entrances, routes, projects, citizens and activities", async () => {
		const run = await checkpoint();
		const state = withCitizens(run);
		const citizen = Object.values(state.citizens)[0];
		if (citizen === undefined) throw new Error("fixture lacks citizen");
		const activity = slotActivity({ run, state, citizenId: citizen.citizenId });
		const project = Object.values(state.projects)[0];
		if (
			project?.siteId !== citizen.siteId ||
			!project.participantCitizenIds.includes(citizen.citizenId)
		)
			throw new Error("fixture lacks a citizen-grounded project");
		const groundedActivity = { ...activity, projectId: project.projectId };
		const projection = projectGeneratedCivilizationSpatial({
			world: run.world,
			civilization: state,
			checkpoint: run,
			settlementId: run.seedConditions.originSettlementId,
			activities: [groundedActivity],
			presentationTick: 23,
		});

		expect(projection.availability).toEqual({
			status: "available",
			reasons: [],
		});
		expect(projection.spatial.actors).toHaveLength(1);
		expect(projection.spatial.actors[0]?.citizenId).toBe(citizen.citizenId);
		expect(projection.spatial.actors[0]?.name).toBe(citizen.citizenId);
		expect(projection.spatial.actors[0]?.action).toEqual(
			groundedActivity.canonicalAction,
		);
		expect(projection.spatial.actors[0]?.action).not.toBe(
			groundedActivity.canonicalAction,
		);
		expect(projection.projects.map(({ projectId }) => projectId)).toEqual(
			Object.values(state.projects)
				.filter(
					(candidate) =>
						candidate.settlementId === run.seedConditions.originSettlementId &&
						candidate.siteId !== null,
				)
				.map(({ projectId }) => projectId)
				.sort(),
		);
		expect(Object.keys(projection.scene.places).sort()).toEqual(
			projection.local.sites.map(({ siteId }) => siteId).sort(),
		);
		for (const building of projection.local.buildings) {
			const entrance = projection.scene.nodes[building.entranceSlotId];
			expect(entrance?.affordance).toBe("entrance");
			expect(entrance?.placeId).toBe(building.siteId);
		}
		for (const route of projection.local.routes) {
			expect(
				projection.scene.edges.some((edge) =>
					edge.edgeId.startsWith(`${route.routeId}:segment:`),
				),
			).toBe(true);
		}
		if (activity.location.kind !== "interaction-slot")
			throw new Error("fixture activity is not slot-grounded");
		const actorNode =
			projection.scene.nodes[activity.location.interactionSlotId];
		expect(projection.spatial.actors[0]?.positionMm).toEqual({
			x: actorNode?.x,
			y: actorNode?.y,
			z: actorNode?.z,
		});
		(groundedActivity.canonicalAction as { actionId: string }).actionId =
			"mutated-after-projection";
		expect(projection.spatial.actors[0]?.action.actionId).toBe(
			"scheduler-action-0",
		);
	});

	it("grounds route progress in canonical waypoint geometry", async () => {
		const run = await checkpoint();
		const state = withCitizens(run);
		const citizenId = Object.keys(state.citizens)[0];
		const route = Object.values(run.world.routes)
			.map((record) => record.value)
			.sort((left, right) => left.routeId.localeCompare(right.routeId))[0];
		if (citizenId === undefined || route === undefined)
			throw new Error("fixture lacks route actor");
		const citizen = state.citizens[citizenId];
		if (citizen === undefined) throw new Error("fixture lacks citizen");
		const routeState: GeneratedSpatialCivilizationInput = {
			...state,
			citizens: {
				...state.citizens,
				[citizenId]: { ...citizen, siteId: route.fromSiteId },
			},
		};
		const activity: GeneratedSpatialActivityInput = {
			schemaVersion: "eonfolk-generated-spatial-activity-v1",
			citizenId,
			canonicalAction: {
				actionId: "scheduler-route-action",
				sourceKind: "current-behavior",
				eventId: null,
				eventSequence: null,
				status: "in-progress",
				kind: "walk",
				originPlaceId: route.fromSiteId,
				destinationPlaceId: route.toSiteId,
				affordanceId: null,
				affordanceSlotIndex: null,
				targetId: null,
				simulationStart: routeState.simulationTime,
				simulationEnd: null,
				resultEventId: null,
			},
			location: {
				kind: "route",
				routeId: route.routeId,
				progressBasisPoints: 5_000,
			},
			projectId: null,
			carriedProp: null,
			focal: true,
		};
		const projection = projectGeneratedCivilizationSpatial({
			world: run.world,
			civilization: routeState,
			checkpoint: run,
			settlementId: run.seedConditions.originSettlementId,
			activities: [activity],
			presentationTick: 100,
		});
		const actor = projection.spatial.actors[0];

		expect(actor?.travelState).toMatchObject({
			status: "travelling",
			routeId: route.routeId,
		});
		expect(actor?.routeNodeIds).toEqual(
			route.waypoints.map((_, index) => `${route.routeId}:waypoint:${index}`),
		);
		expect(actor?.positionMm).not.toEqual({
			x: route.waypoints[0]?.xMillimeters,
			y: route.waypoints[0]?.elevationMillimeters,
			z: route.waypoints[0]?.yMillimeters,
		});

		const arrivedState: GeneratedSpatialCivilizationInput = {
			...routeState,
			citizens: {
				...routeState.citizens,
				[citizenId]: { ...citizen, siteId: route.toSiteId },
			},
		};
		const arrived = projectGeneratedCivilizationSpatial({
			world: run.world,
			civilization: arrivedState,
			checkpoint: run,
			settlementId: run.seedConditions.originSettlementId,
			activities: [
				{
					...activity,
					canonicalAction: {
						...activity.canonicalAction,
						status: "committed",
						simulationEnd: arrivedState.simulationTime,
					},
					location: {
						kind: "route",
						routeId: route.routeId,
						progressBasisPoints: 10_000,
					},
				},
			],
			presentationTick: 101,
		});
		expect(arrived.spatial.actors[0]?.travelState.status).toBe("arrived");
		expect(arrived.spatial.actors[0]?.positionMm).toEqual({
			x: route.waypoints.at(-1)?.xMillimeters,
			y: route.waypoints.at(-1)?.elevationMillimeters,
			z: route.waypoints.at(-1)?.yMillimeters,
		});
	});

	it("is deterministic across seeds and never mutates world or civilization Reality", async () => {
		for (const [index, seed] of SEEDS.entries()) {
			const run = await checkpoint(seed, index);
			const worldBytes = jcs(run.world);
			const stateBytes = jcs(run.state);
			const worldHash = await stateHash(run.world);
			const civilizationHash = await stateHash(run.state);
			const input = {
				world: run.world,
				civilization: run.state,
				checkpoint: run,
				settlementId: run.seedConditions.originSettlementId,
				presentationTick: 41,
			} as const;

			expect(projectGeneratedCivilizationSpatial(input)).toEqual(
				projectGeneratedCivilizationSpatial(input),
			);
			expect(jcs(run.world)).toBe(worldBytes);
			expect(jcs(run.state)).toBe(stateBytes);
			expect(await stateHash(run.world)).toBe(worldHash);
			expect(await stateHash(run.state)).toBe(civilizationHash);
		}
	});

	it("caps the typed projection at eight actors without changing canonical population", async () => {
		const run = await checkpoint();
		const state = withCitizens(run, 9);
		const activities = Object.keys(state.citizens).map((citizenId, ordinal) =>
			slotActivity({ run, state, citizenId, ordinal }),
		);
		const projection = projectGeneratedCivilizationSpatial({
			world: run.world,
			civilization: state,
			checkpoint: run,
			settlementId: run.seedConditions.originSettlementId,
			activities,
			presentationTick: 0,
		});

		expect(Object.keys(state.citizens)).toHaveLength(9);
		expect(projection.spatial.actors).toHaveLength(8);
		expect(projection.omitted).toMatchObject({ citizens: 1, activities: 1 });
	});

	it("rejects checkpoint, record, reference, route, and entrance identity mismatches", async () => {
		const run = await checkpoint();
		const base = {
			world: run.world,
			civilization: run.state,
			checkpoint: run,
			settlementId: run.seedConditions.originSettlementId,
			presentationTick: 0,
		} as const;
		expect(() =>
			projectGeneratedCivilizationSpatial({
				...base,
				checkpoint: { ...run, worldIdentityHash: "0".repeat(64) },
			}),
		).toThrow(/another generated world/u);

		const mismatchedWorld = structuredClone(run.world) as typeof run.world & {
			sites: Record<string, (typeof run.world.sites)[string]>;
		};
		const [siteKey, siteRecord] =
			Object.entries(mismatchedWorld.sites)[0] ?? [];
		if (siteKey === undefined || siteRecord === undefined)
			throw new Error("fixture lacks site");
		delete mismatchedWorld.sites[siteKey];
		mismatchedWorld.sites[`${siteKey}-wrong`] = siteRecord;
		expect(() =>
			projectGeneratedCivilizationSpatial({ ...base, world: mismatchedWorld }),
		).toThrow(/site key .* mismatched identity/u);

		const entranceWorld = structuredClone(run.world);
		const building = Object.values(entranceWorld.buildings)[0]?.value;
		if (building === undefined) throw new Error("fixture lacks building");
		(building as { entranceSlotId: string }).entranceSlotId =
			"missing-entrance";
		expect(() =>
			projectGeneratedCivilizationSpatial({ ...base, world: entranceWorld }),
		).toThrow(/lacks its canonical entrance/u);

		const routeWorld = structuredClone(run.world);
		const route = Object.values(routeWorld.routes)[0]?.value;
		if (route === undefined) throw new Error("fixture lacks route");
		(route as { toSiteId: string }).toSiteId = "missing-site";
		expect(() =>
			projectGeneratedCivilizationSpatial({ ...base, world: routeWorld }),
		).toThrow(/missing local site|not grounded at local sites/u);

		const state = withCitizens(run);
		const citizenId = Object.keys(state.citizens)[0];
		if (citizenId === undefined) throw new Error("fixture lacks citizen");
		const citizen = state.citizens[citizenId];
		if (citizen === undefined) throw new Error("fixture lacks citizen record");
		const badCitizenState: GeneratedSpatialCivilizationInput = {
			...state,
			citizens: {
				...state.citizens,
				[citizenId]: { ...citizen, siteId: "missing-site" },
			},
		};
		expect(() =>
			projectGeneratedCivilizationSpatial({
				...base,
				civilization: badCitizenState,
			}),
		).toThrow(/citizen .* references missing site/u);

		const activity = slotActivity({ run, state, citizenId });
		expect(() =>
			projectGeneratedCivilizationSpatial({
				...base,
				civilization: state,
				activities: [{ ...activity, projectId: "missing-project" }],
			}),
		).toThrow(/is not grounded in its project/u);
	});
});
