import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import {
	projectGeneratedCivilizationSpatial,
	type GeneratedCivilizationSpatialProjection,
	type GeneratedSpatialActivityInput,
	type SpatialActorProjection,
} from "../../../packages/world-presentation/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";
import {
	GENERATED_FOLK_ASSET,
	INITIAL_GENERATED_NAVIGATION,
	assertGeneratedAssetBudget,
	cameraIntentForGeneratedNavigation,
	planGeneratedActorTransition,
	poseForGeneratedActor,
	projectGeneratedEmbodiment,
	projectGeneratedWorldEmbodiment,
	reduceGeneratedNavigation,
	sampleGeneratedActorTransition,
} from "../../../apps/web/src/generated-presentation/index.js";

const SEED = "8f3d02e493af5d37d9bc7f5ddc57d98b3e42a59b0a606cdfc516d42ac032579f";

async function fixture() {
	const world = await generateWorld({
		releaseGenesis: await createReleaseGenesis({
			releaseId: "generated-embodiment-unit",
			seedHex: SEED,
		}),
	});
	const run = await runCivilizationExperiment({ world, horizonDays: 30 });
	const settlementId = run.seedConditions.originSettlementId;
	const activities = run.activities.filter((activity) => {
		const citizen = run.state.citizens[activity.citizenId];
		return citizen?.settlementId === settlementId;
	});
	const projection = projectGeneratedCivilizationSpatial({
		world: run.world,
		civilization: run.state,
		checkpoint: run,
		settlementId,
		activities,
		presentationTick: run.metrics.simulationTime * 30,
	});
	const allProjections = Object.values(run.world.settlements)
		.map(({ value }) => value.settlementId)
		.sort()
		.map((candidateSettlementId) =>
			projectGeneratedCivilizationSpatial({
				world: run.world,
				civilization: run.state,
				checkpoint: run,
				settlementId: candidateSettlementId,
				activities: run.activities,
				presentationTick: run.metrics.simulationTime * 30,
			}),
		);
	return {
		projection,
		activities,
		allProjections,
		allActivities: run.activities,
		population: run.metrics.residentPopulation,
	};
}

function routeVariant(input: {
	readonly projection: GeneratedCivilizationSpatialProjection;
	readonly activities: readonly GeneratedSpatialActivityInput[];
	readonly progressBasisPoints: number;
}) {
	const route = input.projection.local.routes[0];
	const actor = input.projection.spatial.actors[0];
	if (route === undefined || actor === undefined)
		throw new Error("fixture lacks a route or actor");
	const waypointIndex =
		input.progressBasisPoints < 5_000 ? 0 : route.waypoints.length - 1;
	const waypoint = route.waypoints[waypointIndex];
	if (waypoint === undefined) throw new Error("fixture route lacks a waypoint");
	const action = {
		...actor.action,
		actionId: `route-action-${input.progressBasisPoints}`,
		kind: "walk" as const,
		originPlaceId: route.fromSiteId,
		destinationPlaceId: route.toSiteId,
		affordanceId: null,
		affordanceSlotIndex: null,
	};
	const routeActor: SpatialActorProjection = {
		...actor,
		placeId: route.fromSiteId,
		positionMm: {
			x: waypoint.xMillimeters,
			y: waypoint.elevationMillimeters,
			z: waypoint.yMillimeters,
		},
		routeNodeIds: route.waypoints.map(
			(_, index) => `${route.routeId}:waypoint:${index}`,
		),
		animationClass: "walk",
		travelState: {
			status: "travelling",
			originPlaceId: route.fromSiteId,
			destinationPlaceId: route.toSiteId,
			routeId: route.routeId,
			targetId: null,
		},
		action,
	};
	const routeActivity: GeneratedSpatialActivityInput = {
		schemaVersion: "eonfolk-generated-spatial-activity-v1",
		citizenId: actor.citizenId,
		canonicalAction: action,
		location: {
			kind: "route",
			routeId: route.routeId,
			progressBasisPoints: input.progressBasisPoints,
		},
		projectId: null,
		carriedProp: null,
		focal: actor.focal,
	};
	return {
		projection: {
			...input.projection,
			spatial: {
				...input.projection.spatial,
				actors: [routeActor, ...input.projection.spatial.actors.slice(1)],
			},
		},
		activities: [
			routeActivity,
			...input.activities.filter(
				(activity) => activity.citizenId !== actor.citizenId,
			),
		],
	};
}

describe("generated embodiment projection", () => {
	it("keeps every visible citizen on its authoritative interaction slot", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});

		expect(model.actors).toHaveLength(projection.spatial.actors.length);
		expect(model.actors.length).toBeGreaterThanOrEqual(3);
		expect(
			model.actors.every((actor) => actor.grounding.kind !== "route"),
		).toBe(true);
		expect(model.growth.visibleChangeCount).toBe(0);
		expect(model.projects.every((project) => !project.changed)).toBe(true);
		for (const actor of model.actors) {
			const nodeId = actor.grounding.interactionSlotId;
			if (nodeId === null) throw new Error("expected interaction slot");
			const node = projection.scene.nodes[nodeId];
			expect(node).toBeDefined();
			expect(actor.positionMm).toEqual({
				x: node?.x,
				y: node?.y,
				z: node?.z,
			});
		}
	});

	it("accounts for all eight canonical residents across the generated world", async () => {
		const { allProjections, allActivities, population } = await fixture();
		const world = projectGeneratedWorldEmbodiment({
			current: allProjections,
			activities: allActivities,
		});

		expect(population).toBe(8);
		expect(world.visibleCitizenCount).toBe(population);
		expect(world.actors).toHaveLength(8);
		expect(new Set(world.actors.map((actor) => actor.citizenId)).size).toBe(8);
		expect(new Set(world.actors.map((actor) => actor.settlementId)).size).toBe(
			2,
		);
	});

	it("exposes full grounded route topology while reporting the upstream connector gap", async () => {
		const base = await fixture();
		const routed = routeVariant({
			...base,
			progressBasisPoints: 0,
		});
		const model = projectGeneratedEmbodiment({
			current: routed.projection,
			activities: routed.activities,
		});
		const actor = model.actors[0];
		if (actor === undefined) throw new Error("fixture lacks actor");

		expect(actor.grounding.kind).toBe("route");
		expect(actor.grounding.routeTopologyNodeIds.length).toBeGreaterThan(
			actor.grounding.authoritativeNodeIds.length,
		);
		expect(actor.grounding.provesEntranceToEntranceTraversal).toBe(false);
		expect(model.limitations).toEqual([
			expect.stringContaining("not expose entrance-connector progress"),
		]);
	});

	it("allows only monotonic same-route interpolation and samples it deterministically", async () => {
		const base = await fixture();
		const from = routeVariant({ ...base, progressBasisPoints: 0 });
		const to = routeVariant({ ...base, progressBasisPoints: 10_000 });
		const fromActor = projectGeneratedEmbodiment({
			current: from.projection,
			activities: from.activities,
		}).actors[0];
		const toActor = projectGeneratedEmbodiment({
			current: to.projection,
			activities: to.activities,
		}).actors[0];
		if (fromActor === undefined || toActor === undefined)
			throw new Error("fixture lacks transition actors");

		const transition = planGeneratedActorTransition(fromActor, toActor);
		expect(transition.kind).toBe("grounded-route");
		expect(sampleGeneratedActorTransition(transition, 0)).toEqual(
			fromActor.positionMm,
		);
		expect(sampleGeneratedActorTransition(transition, 10_000)).toEqual(
			toActor.positionMm,
		);
		expect(() => planGeneratedActorTransition(toActor, fromActor)).toThrow(
			/refusing teleport/u,
		);
	});

	it("maps every canonical animation class into visibly distinct pose families", () => {
		const classes = [
			"idle",
			"walk",
			"carry",
			"gather",
			"inspect",
			"talk",
			"listen",
			"exchange",
			"repair",
			"eat-rest",
			"react",
		] as const;
		const families = new Set(
			classes.map(
				(animationClass) =>
					poseForGeneratedActor({
						animationClass,
						positionMm: { x: 0, y: 0, z: 0 },
					}).family,
			),
		);
		expect(families).toEqual(
			new Set(["locomotion", "carry", "work", "social", "life", "reaction"]),
		);
	});

	it("drives project stage and growth markers from projection deltas", async () => {
		const { projection, activities } = await fixture();
		const currentProject = projection.projects[0];
		if (currentProject === undefined) throw new Error("fixture lacks project");
		const previous: GeneratedCivilizationSpatialProjection = {
			...projection,
			projects: projection.projects.map((project, index) =>
				index === 0
					? {
							...project,
							state: "resourcing",
							progressBasisPoints: Math.max(
								0,
								project.progressBasisPoints - 2_500,
							),
						}
					: project,
			),
			local: {
				...projection.local,
				buildings: projection.local.buildings.slice(1),
			},
		};
		const model = projectGeneratedEmbodiment({
			current: projection,
			previous,
			activities,
		});

		expect(model.projects[0]?.changed).toBe(true);
		expect(model.projects[0]?.progressDeltaBasisPoints).toBeGreaterThanOrEqual(
			0,
		);
		expect(model.growth.addedBuildingIds).toHaveLength(1);
		expect(model.growth.visibleChangeCount).toBeGreaterThan(0);
	});
});

describe("generated navigation parity", () => {
	it("uses one state for semantic selection, zoom and follow", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const actor = model.actors[0];
		if (actor === undefined) throw new Error("fixture lacks actor");
		const selected = reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
			type: "select-citizen",
			citizenId: actor.citizenId,
		});
		const following = reduceGeneratedNavigation(selected, {
			type: "toggle-follow",
		});
		const intent = cameraIntentForGeneratedNavigation(model, following);

		expect(intent.targetMm).toEqual(actor.positionMm);
		expect(intent.followCitizenId).toBe(actor.citizenId);
		expect(intent.semanticLabel).toContain("Following");
	});
});

describe("generated asset provenance", () => {
	it("tracks an embedded, external-request-free glTF well under the mobile budget", async () => {
		const bytes = await readFile(
			new URL(
				"../../../public/assets/generated/eonfolk-folk-proxy.gltf",
				import.meta.url,
			),
		);
		const gltf = JSON.parse(bytes.toString("utf8")) as {
			readonly buffers: readonly Readonly<{ readonly uri: string }>[];
		};
		expect(bytes.byteLength).toBe(GENERATED_FOLK_ASSET.byteLength);
		expect(createHash("sha256").update(bytes).digest("hex")).toBe(
			GENERATED_FOLK_ASSET.sha256,
		);
		expect(gltf.buffers.every((buffer) => buffer.uri.startsWith("data:"))).toBe(
			true,
		);
		expect(GENERATED_FOLK_ASSET.provenance.thirdPartyMaterial).toBe(false);
		expect(() =>
			assertGeneratedAssetBudget(GENERATED_FOLK_ASSET),
		).not.toThrow();
	});
});
