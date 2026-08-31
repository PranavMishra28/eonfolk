import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import {
	advanceGeneratedCameraIntent,
	assertGeneratedAssetBudget,
	cameraEyeMm,
	cameraIntentForGeneratedNavigation,
	conversationVisuallyActive,
	FOLLOW_INDOOR_PEEK_PITCH_DEGREES,
	followLookOccluded,
	followOccluderIds,
	followOccluderVolumes,
	GENERATED_FOLK_BINARY_ASSET,
	generatedCameraFidelity,
	generatedFollowViewportIsCompact,
	generatedNavigationReferencesExist,
	generatedTraversalPointAtTick,
	generatedVisualPhase,
	INITIAL_GENERATED_NAVIGATION,
	parseGeneratedNavigationAction,
	planGeneratedActorTransition,
	poseAtGeneratedPresentationTick,
	poseForGeneratedActor,
	presentedActorActivity,
	presentedActorCopy,
	projectGeneratedEmbodiment,
	projectGeneratedWorldEmbodiment,
	reduceGeneratedNavigation,
	resolveFollowCamera,
	routeArrivalCommitted,
	sampleGeneratedActorPresentation,
	sampleGeneratedActorTransition,
	verifyGeneratedFolkAsset,
} from "../../../apps/web/src/generated-presentation/index.js";
import { runCivilizationExperiment } from "../../../packages/civilization/src/index.js";
import { createReleaseGenesis } from "../../../packages/protocol/src/index.js";
import {
	type GeneratedCivilizationSpatialProjection,
	type GeneratedSpatialActivityInput,
	projectGeneratedCivilizationSpatial,
	type SpatialActorProjection,
} from "../../../packages/world-presentation/src/index.js";
import { generateWorld } from "../../../packages/worldgen/src/index.js";

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
			progressBasisPoints: input.progressBasisPoints,
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
	it("keeps every visible citizen on its authoritative route sample or interaction slot", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});

		expect(model.actors).toHaveLength(projection.spatial.actors.length);
		expect(model.actors.length).toBeGreaterThanOrEqual(3);
		expect(model.actors.some((actor) => actor.grounding.kind === "route")).toBe(
			true,
		);
		expect(model.growth.visibleChangeCount).toBe(0);
		expect(model.projects.every((project) => !project.changed)).toBe(true);
		for (const actor of model.actors) {
			const authoritative = projection.spatial.actors.find(
				(candidate) => candidate.citizenId === actor.citizenId,
			);
			expect(authoritative).toBeDefined();
			if (actor.grounding.kind === "route") {
				expect(actor.grounding.routeId).toBe(
					authoritative?.travelState.routeId,
				);
				expect(actor.grounding.progressBasisPoints).toBe(
					authoritative?.travelState.progressBasisPoints,
				);
				expect(actor.positionMm).toEqual(authoritative?.positionMm);
				continue;
			}
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

	it("proves entrance-to-route-to-entrance topology and replays only the canonical prefix", async () => {
		const base = await fixture();
		const models = [0, 2_500, 5_000, 7_500, 10_000].map(
			(progressBasisPoints) => {
				const routed = routeVariant({ ...base, progressBasisPoints });
				return projectGeneratedEmbodiment({
					current: routed.projection,
					activities: routed.activities,
				});
			},
		);
		const actors = models.map((model) => model.actors[0]!);
		const first = actors[0]!;

		expect(first.grounding.kind).toBe("route");
		expect(first.grounding.routeTopologyNodeIds.length).toBeGreaterThan(
			first.grounding.authoritativeNodeIds.length,
		);
		expect(first.grounding.provesEntranceToEntranceTraversal).toBe(true);
		expect(first.grounding.entranceNodeIds).toHaveLength(2);
		expect(first.grounding.routeTopologyNodeIds[0]).toBe(
			first.grounding.entranceNodeIds[0],
		);
		expect(first.grounding.routeTopologyNodeIds.at(-1)).toBe(
			first.grounding.entranceNodeIds[1],
		);
		expect(
			first.grounding.routeTopologyNodeIds
				.slice(0, -1)
				.every((nodeId, index) =>
					base.projection.scene.edges.some(
						(edge) =>
							edge.edgeId.endsWith(":forward") &&
							edge.fromNodeId === nodeId &&
							edge.toNodeId === first.grounding.routeTopologyNodeIds[index + 1],
					),
				),
		).toBe(true);
		const firstEntrance =
			base.projection.scene.nodes[first.grounding.entranceNodeIds[0]!]!;
		expect(first.grounding.traversalPathMm?.[0]).toEqual({
			x: firstEntrance.x,
			y: firstEntrance.y,
			z: firstEntrance.z,
		});
		const distancesFromOrigin = actors.map((actor) =>
			Math.hypot(
				actor.positionMm.x - firstEntrance.x,
				actor.positionMm.y - firstEntrance.y,
				actor.positionMm.z - firstEntrance.z,
			),
		);
		expect(distancesFromOrigin).toEqual(
			[...distancesFromOrigin].sort((left, right) => left - right),
		);
		const middle = actors[2]!;
		const destination = middle.grounding.traversalPathMm?.at(-1);
		const ticks = [0, 12, 24, 36, 48, 64];
		const sampled = ticks.map((tick) =>
			generatedTraversalPointAtTick(middle.grounding, tick),
		);
		expect(
			new Set(sampled.slice(0, 5).map((value) => JSON.stringify(value))).size,
		).toBe(5);
		expect(sampled.at(-1)).toEqual(
			generatedTraversalPointAtTick(middle.grounding, 48),
		);
		expect(generatedTraversalPointAtTick(middle.grounding, 48)).toEqual(
			destination,
		);
		expect(generatedTraversalPointAtTick(middle.grounding, 96)).toEqual(
			destination,
		);
		expect(models.every((model) => model.limitations.length === 0)).toBe(true);
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
			new Set([
				"wait",
				"locomotion",
				"carry",
				"harvest",
				"inspect",
				"social",
				"repair",
				"life",
				"reaction",
			]),
		);
		expect(
			poseForGeneratedActor({
				animationClass: "repair",
				routineKind: "construct",
				positionMm: { x: 0, y: 0, z: 0 },
			}).family,
		).toBe("construct");
	});

	it("replays a visual lifecycle without reversing route travel", async () => {
		const { projection, activities } = await fixture();
		expect(
			activities.every(
				(activity) => activity.canonicalAction.simulationEnd !== null,
			),
		).toBe(true);
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const conversations = activities.filter(
			(activity) =>
				activity.canonicalAction.kind === "talk" ||
				activity.canonicalAction.kind === "listen",
		);
		for (const activity of conversations) {
			expect(activity.visualLifecycle.simulationEnd).toBeLessThanOrEqual(
				activity.visualLifecycle.performEnd + 86_400,
			);
			expect(activity.canonicalAction.simulationEnd).not.toBeNull();
		}
		const walker =
			model.actors.find((actor) => actor.grounding.kind === "route") ??
			model.actors[0];
		if (walker === undefined) throw new Error("fixture lacks an actor");
		const start = sampleGeneratedActorPresentation({
			actor: walker,
			previous: null,
			slotPointMm: walker.positionMm,
			progress01: 0,
			reducedMotion: false,
		});
		const mid = sampleGeneratedActorPresentation({
			actor: walker,
			previous: null,
			slotPointMm: walker.positionMm,
			progress01: 0.2,
			reducedMotion: false,
		});
		const end = sampleGeneratedActorPresentation({
			actor: walker,
			previous: null,
			slotPointMm: walker.positionMm,
			progress01: 1,
			reducedMotion: false,
		});
		expect(generatedVisualPhase(walker.visualLifecycle, 0)).toBe("travel");
		expect(generatedVisualPhase(walker.visualLifecycle, 1)).not.toBe("travel");
		if (walker.grounding.kind === "route") {
			const origin = walker.grounding.traversalPathMm?.[0];
			const destination = walker.grounding.traversalPathMm?.at(-1);
			const uncommitted = walker.grounding.progressBasisPoints !== 10_000;
			expect(start.positionMm).toEqual(origin);
			expect(mid.positionMm).not.toEqual(origin);
			expect(mid.positionMm).not.toEqual(destination);
			if (uncommitted) {
				expect(generatedVisualPhase(walker.visualLifecycle, 1, false)).toBe(
					"travel",
				);
				expect(end.phase).toBe("travel");
				expect(end.positionMm).not.toEqual(destination);
				expect(end.animationClass).not.toBe("idle");
			} else {
				expect(end.positionMm).toEqual(destination);
			}
		}
		const approached = sampleGeneratedActorPresentation({
			actor: walker,
			previous: {
				...walker,
				positionMm: {
					x: walker.positionMm.x - 12_000,
					y: 0,
					z: walker.positionMm.z,
				},
			},
			slotPointMm: walker.positionMm,
			progress01: 0.1,
			reducedMotion: false,
		});
		expect(approached.positionMm).not.toEqual(walker.positionMm);
		const reduced = sampleGeneratedActorPresentation({
			actor: walker,
			previous: null,
			slotPointMm: walker.positionMm,
			progress01: 0,
			reducedMotion: true,
		});
		if (walker.grounding.kind === "route") {
			const destination = walker.grounding.traversalPathMm?.at(-1);
			if (walker.grounding.progressBasisPoints === 10_000)
				expect(reduced.positionMm).toEqual(destination);
			else expect(reduced.positionMm).not.toEqual(destination);
		} else expect(reduced.positionMm).toEqual(walker.positionMm);
	});

	it("keeps HUD copy on the body and does not claim arrival while the route is uncommitted", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const walker = model.actors.find(
			(actor) => actor.grounding.kind === "route",
		);
		if (walker !== undefined && walker.grounding.kind === "route") {
			expect(routeArrivalCommitted(walker)).toBe(
				walker.grounding.progressBasisPoints === 10_000,
			);
			if (walker.grounding.progressBasisPoints !== 10_000) {
				expect(presentedActorActivity(walker, "Workshop", 1)).toMatch(
					/^(?:walking|carrying) toward Workshop$/u,
				);
				const arrived = sampleGeneratedActorPresentation({
					actor: walker,
					previous: null,
					slotPointMm: walker.positionMm,
					progress01: 1,
					reducedMotion: false,
				});
				expect(arrived.phase).toBe("travel");
				expect(arrived.animationClass).not.toBe("idle");
				expect(arrived.positionMm).not.toEqual(
					walker.grounding.traversalPathMm?.at(-1),
				);
			}
		}
		const inspector = model.actors.find(
			(actor) =>
				actor.grounding.kind !== "route" &&
				(actor.visualLifecycle?.performKind ?? actor.animationClass) ===
					"inspect",
		);
		if (inspector !== undefined) {
			expect(presentedActorActivity(inspector, "Workshop", 0.55)).toContain(
				"inspecting the work at Workshop",
			);
			expect(presentedActorActivity(inspector, "Workshop", 0.55)).not.toContain(
				"walking",
			);
		}
		const speaker = model.actors.find(
			(actor) =>
				actor.visualLifecycle?.performKind === "talk" ||
				actor.visualLifecycle?.performKind === "listen",
		);
		if (speaker?.visualLifecycle !== undefined) {
			expect(conversationVisuallyActive(speaker, 0.3)).toBe(true);
			expect(conversationVisuallyActive(speaker, 1)).toBe(false);
		}
	});

	it("uses one interpolant vocabulary so In words matches a walking body", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const walker = model.actors.find(
			(actor) =>
				actor.grounding.kind === "route" &&
				actor.grounding.progressBasisPoints !== 10_000,
		);
		if (walker === undefined) return;
		const copy = presentedActorCopy(walker, projection, 0.2);
		expect(copy).toMatch(/^(?:walking|carrying) toward /u);
		expect(copy).not.toContain("inspecting the work");
	});

	it("keeps Follow framing on the body and backs the camera out of walls", () => {
		const sample = Object.freeze({
			positionMm: Object.freeze({ x: 0, y: 0, z: 0 }),
			facingDegrees: 0,
		});
		const open = resolveFollowCamera(sample);
		expect(open.targetMm.y).toBeGreaterThanOrEqual(1_200);
		expect(open.distanceMm).toBe(6_200);
		const blocked = resolveFollowCamera(sample, [
			Object.freeze({
				minX: -20_000,
				maxX: 20_000,
				minY: 0,
				maxY: 8_000,
				minZ: -20_000,
				maxZ: 20_000,
			}),
		]);
		expect(blocked.distanceMm).toBeGreaterThan(open.distanceMm);
		expect(blocked.pitchDegrees).toBeLessThanOrEqual(open.pitchDegrees);
	});

	it("frames compact Follow on the chest, farther and higher than desktop", () => {
		const sample = Object.freeze({
			positionMm: Object.freeze({ x: 0, y: 0, z: 0 }),
			facingDegrees: 0,
		});
		const desktop = resolveFollowCamera(sample);
		const phone = resolveFollowCamera(sample, [], 1_520, true);
		expect(generatedFollowViewportIsCompact(390, 844)).toBe(true);
		expect(generatedFollowViewportIsCompact(1_280, 800)).toBe(false);
		expect(phone.targetMm.y).toBeLessThan(desktop.targetMm.y);
		expect(phone.targetMm.y).toBeGreaterThanOrEqual(1_000);
		expect(phone.targetMm.y).toBeLessThanOrEqual(1_400);
		expect(phone.pitchDegrees).toBeLessThan(desktop.pitchDegrees);
		expect(phone.distanceMm).toBeGreaterThan(desktop.distanceMm);
		const eye = cameraEyeMm(
			phone.targetMm,
			phone.yawDegrees,
			phone.pitchDegrees,
			phone.distanceMm,
		);
		expect(eye.y).toBeGreaterThan(desktop.targetMm.y + 2_400);
	});

	it("keeps compact Follow outside a workshop envelope instead of looking at dirt", () => {
		const person = Object.freeze({
			positionMm: Object.freeze({ x: 0, y: 0, z: -3_600 }),
			facingDegrees: 0,
		});
		const workshop = Object.freeze({
			minX: -4_100,
			maxX: 4_100,
			minY: 0,
			maxY: 6_300,
			minZ: -4_100,
			maxZ: 4_100,
		});
		const phone = resolveFollowCamera(person, [workshop], 1_520, true);
		const eye = cameraEyeMm(
			phone.targetMm,
			phone.yawDegrees,
			phone.pitchDegrees,
			phone.distanceMm,
		);
		expect(phone.targetMm.y).toBeGreaterThanOrEqual(1_000);
		expect(phone.targetMm.y).toBeLessThanOrEqual(1_400);
		expect(
			eye.x < workshop.minX ||
				eye.x > workshop.maxX ||
				eye.y > workshop.maxY ||
				eye.z < workshop.minZ ||
				eye.z > workshop.maxZ,
		).toBe(true);
		expect(eye.y).toBeGreaterThan(2_400);
	});

	it("peeks over a workshop ridge so desktop Follow is not a wall clip", () => {
		const person = Object.freeze({
			positionMm: Object.freeze({ x: 0, y: 0, z: 0 }),
			facingDegrees: 90,
		});
		const workshop = Object.freeze({
			occluderId: "building-dawnmere-workshop",
			minX: -4_100,
			maxX: 4_100,
			minY: 0,
			maxY: 6_300,
			minZ: -4_100,
			maxZ: 4_100,
		});
		const framed = resolveFollowCamera(person, [workshop]);
		const eye = cameraEyeMm(
			framed.targetMm,
			framed.yawDegrees,
			framed.pitchDegrees,
			framed.distanceMm,
		);
		expect(framed.targetMm.y).toBeGreaterThanOrEqual(1_200);
		expect(
			eye.x < workshop.minX ||
				eye.x > workshop.maxX ||
				eye.y > workshop.maxY ||
				eye.z < workshop.minZ ||
				eye.z > workshop.maxZ,
		).toBe(true);
		expect(eye.y).toBeGreaterThan(workshop.maxY);
		expect(framed.pitchDegrees).toBe(FOLLOW_INDOOR_PEEK_PITCH_DEGREES);
		expect(followLookOccluded(workshop, eye, framed.targetMm)).toBe(true);
		expect(followOccluderIds(eye, framed.targetMm, [workshop])).toEqual([
			"building-dawnmere-workshop",
		]);
	});

	it("peeks over a mill ridge with the same indoor Follow as Workshop", () => {
		const person = Object.freeze({
			positionMm: Object.freeze({ x: 0, y: 0, z: 0 }),
			facingDegrees: 90,
		});
		const mill = Object.freeze({
			occluderId: "building-dawnmere-mill",
			minX: -5_000,
			maxX: 5_000,
			minY: 0,
			maxY: 7_900,
			minZ: -4_500,
			maxZ: 4_500,
		});
		const framed = resolveFollowCamera(person, [mill]);
		const eye = cameraEyeMm(
			framed.targetMm,
			framed.yawDegrees,
			framed.pitchDegrees,
			framed.distanceMm,
		);
		expect(framed.targetMm.y).toBeGreaterThanOrEqual(1_200);
		expect(
			eye.x < mill.minX ||
				eye.x > mill.maxX ||
				eye.y > mill.maxY ||
				eye.z < mill.minZ ||
				eye.z > mill.maxZ,
		).toBe(true);
		expect(eye.y).toBeGreaterThan(mill.maxY);
		expect(framed.pitchDegrees).toBe(FOLLOW_INDOOR_PEEK_PITCH_DEGREES);
		expect(followLookOccluded(mill, eye, framed.targetMm)).toBe(true);
		expect(followOccluderIds(eye, framed.targetMm, [mill])).toEqual([
			"building-dawnmere-mill",
		]);
	});

	it("peeks over a meeting-hall ridge with the same indoor Follow as Workshop", () => {
		const person = Object.freeze({
			positionMm: Object.freeze({ x: 0, y: 0, z: 0 }),
			facingDegrees: 90,
		});
		const hall = Object.freeze({
			occluderId: "building-dawnmere-meeting-hall",
			minX: -4_640,
			maxX: 4_640,
			minY: 0,
			maxY: 6_300,
			minZ: -3_500,
			maxZ: 3_500,
		});
		const framed = resolveFollowCamera(person, [hall]);
		const eye = cameraEyeMm(
			framed.targetMm,
			framed.yawDegrees,
			framed.pitchDegrees,
			framed.distanceMm,
		);
		expect(framed.targetMm.y).toBeGreaterThanOrEqual(1_200);
		expect(
			eye.x < hall.minX ||
				eye.x > hall.maxX ||
				eye.y > hall.maxY ||
				eye.z < hall.minZ ||
				eye.z > hall.maxZ,
		).toBe(true);
		expect(eye.y).toBeGreaterThan(hall.maxY);
		expect(framed.pitchDegrees).toBe(FOLLOW_INDOOR_PEEK_PITCH_DEGREES);
		expect(followLookOccluded(hall, eye, framed.targetMm)).toBe(true);
		expect(followOccluderIds(eye, framed.targetMm, [hall])).toEqual([
			"building-dawnmere-meeting-hall",
		]);
	});

	it("keeps compact Follow outside a mill envelope instead of looking at dirt", () => {
		const person = Object.freeze({
			positionMm: Object.freeze({ x: 0, y: 0, z: -3_600 }),
			facingDegrees: 0,
		});
		const mill = Object.freeze({
			minX: -5_000,
			maxX: 5_000,
			minY: 0,
			maxY: 7_900,
			minZ: -4_500,
			maxZ: 4_500,
		});
		const phone = resolveFollowCamera(person, [mill], 1_520, true);
		const eye = cameraEyeMm(
			phone.targetMm,
			phone.yawDegrees,
			phone.pitchDegrees,
			phone.distanceMm,
		);
		expect(phone.targetMm.y).toBeGreaterThanOrEqual(1_000);
		expect(phone.targetMm.y).toBeLessThanOrEqual(1_400);
		expect(
			eye.x < mill.minX ||
				eye.x > mill.maxX ||
				eye.y > mill.maxY ||
				eye.z < mill.minZ ||
				eye.z > mill.maxZ,
		).toBe(true);
		expect(eye.y).toBeGreaterThan(2_400);
	});

	it("frames Dawnmere hall indoor Follow from the meeting-hall occluder", async () => {
		const { projection } = await fixture();
		const hallBuilding = projection.local.buildings.find((building) =>
			building.buildingKind.toLowerCase().includes("meeting"),
		);
		expect(hallBuilding).toBeDefined();
		if (hallBuilding === undefined)
			throw new Error("Dawnmere fixture lacks meeting-hall");
		const millBuilding = projection.local.buildings.find((building) =>
			building.buildingKind.toLowerCase().includes("mill"),
		);
		expect(millBuilding).toBeUndefined();
		const volumes = followOccluderVolumes(projection);
		const hall = volumes.find(
			(volume) => volume.occluderId === hallBuilding.buildingId,
		);
		expect(hall).toBeDefined();
		if (hall === undefined) throw new Error("meeting-hall occluder is missing");
		expect(hall.maxX - hall.minX).toBeGreaterThan(8_200);
		const person = Object.freeze({
			positionMm: Object.freeze({
				x: Math.round((hall.minX + hall.maxX) / 2),
				y: 0,
				z: Math.round((hall.minZ + hall.maxZ) / 2),
			}),
			facingDegrees: 90,
		});
		const framed = resolveFollowCamera(person, volumes);
		const eye = cameraEyeMm(
			framed.targetMm,
			framed.yawDegrees,
			framed.pitchDegrees,
			framed.distanceMm,
		);
		expect(framed.pitchDegrees).toBe(FOLLOW_INDOOR_PEEK_PITCH_DEGREES);
		expect(eye.y).toBeGreaterThan(hall.maxY);
		expect(
			eye.x < hall.minX ||
				eye.x > hall.maxX ||
				eye.y > hall.maxY ||
				eye.z < hall.minZ ||
				eye.z > hall.maxZ,
		).toBe(true);
		expect(followOccluderIds(eye, framed.targetMm, volumes)).toContain(
			hallBuilding.buildingId,
		);
		const actorInside = projection.spatial.actors.find((actor) => {
			const x = actor.positionMm.x;
			const y = actor.positionMm.y;
			const z = actor.positionMm.z;
			return (
				x >= hall.minX &&
				x <= hall.maxX &&
				y >= hall.minY &&
				y <= hall.maxY &&
				z >= hall.minZ &&
				z <= hall.maxZ
			);
		});
		if (actorInside !== undefined) {
			const live = resolveFollowCamera(
				{
					positionMm: actorInside.positionMm,
					facingDegrees: 90,
				},
				volumes,
			);
			const liveEye = cameraEyeMm(
				live.targetMm,
				live.yawDegrees,
				live.pitchDegrees,
				live.distanceMm,
			);
			expect(
				liveEye.x < hall.minX ||
					liveEye.x > hall.maxX ||
					liveEye.y > hall.maxY ||
					liveEye.z < hall.minZ ||
					liveEye.z > hall.maxZ,
			).toBe(true);
		}
	});

	it("sizes mill-kind envelopes with mill scale and peeks over the ridge", async () => {
		const { projection } = await fixture();
		const workshop = projection.local.buildings.find((building) =>
			building.buildingKind.toLowerCase().includes("workshop"),
		);
		expect(workshop).toBeDefined();
		if (workshop === undefined)
			throw new Error("Dawnmere fixture lacks workshop");
		const millProjection = {
			...projection,
			local: {
				...projection.local,
				buildings: projection.local.buildings.map((building) =>
					building.buildingId === workshop.buildingId
						? { ...building, buildingKind: "grist-mill" }
						: building,
				),
			},
		};
		const millVolume = followOccluderVolumes(millProjection).find(
			(volume) => volume.occluderId === workshop.buildingId,
		);
		const houseVolume = followOccluderVolumes(projection).find(
			(volume) => volume.occluderId === workshop.buildingId,
		);
		expect(millVolume).toBeDefined();
		expect(houseVolume).toBeDefined();
		if (millVolume === undefined || houseVolume === undefined)
			throw new Error("mill occluder is missing");
		expect(millVolume.maxY).toBeGreaterThan(houseVolume.maxY);
		expect(millVolume.maxX - millVolume.minX).toBeGreaterThan(
			houseVolume.maxX - houseVolume.minX,
		);
		const person = Object.freeze({
			positionMm: Object.freeze({
				x: Math.round((millVolume.minX + millVolume.maxX) / 2),
				y: 0,
				z: Math.round((millVolume.minZ + millVolume.maxZ) / 2),
			}),
			facingDegrees: 90,
		});
		const framed = resolveFollowCamera(person, [millVolume]);
		const eye = cameraEyeMm(
			framed.targetMm,
			framed.yawDegrees,
			framed.pitchDegrees,
			framed.distanceMm,
		);
		expect(framed.pitchDegrees).toBe(FOLLOW_INDOOR_PEEK_PITCH_DEGREES);
		expect(eye.y).toBeGreaterThan(millVolume.maxY);
		expect(
			eye.x < millVolume.minX ||
				eye.x > millVolume.maxX ||
				eye.y > millVolume.maxY ||
				eye.z < millVolume.minZ ||
				eye.z > millVolume.maxZ,
		).toBe(true);
	});

	it("uses an explicit deterministic pose clock without moving canonical positions", () => {
		const positionMm = Object.freeze({ x: 1_200, y: 0, z: -900 });
		const base = poseForGeneratedActor({
			animationClass: "walk",
			positionMm,
		});
		const tickZero = poseAtGeneratedPresentationTick(base, 0, 12, false);
		const tickOne = poseAtGeneratedPresentationTick(base, 8, 12, false);

		expect(tickZero).not.toEqual(tickOne);
		expect(poseAtGeneratedPresentationTick(base, 8, 12, false)).toEqual(
			tickOne,
		);
		expect(poseAtGeneratedPresentationTick(base, 8, 12, true)).toBe(base);
		expect(positionMm).toEqual({ x: 1_200, y: 0, z: -900 });
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
		const intent = cameraIntentForGeneratedNavigation(
			projection,
			model,
			following,
		);

		expect(intent.targetMm).toEqual({
			x: actor.positionMm.x,
			y: actor.positionMm.y + 1_520,
			z: actor.positionMm.z,
		});
		expect(intent.followCitizenId).toBe(actor.citizenId);
		expect(intent.semanticLabel).toContain("Following");
		expect(following.distanceMm).toBe(6_200);
	});

	it("keeps a camera intent when the focused citizen has left", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const intent = cameraIntentForGeneratedNavigation(projection, model, {
			...INITIAL_GENERATED_NAVIGATION,
			focus: Object.freeze({
				kind: "citizen",
				citizenId: "missing-traveller",
			}),
		});
		expect(intent.semanticLabel).toContain("no longer in this settlement");
		expect(intent.followCitizenId).toBeNull();
	});

	it("derives four fidelity classes across region, town and citizen scales", () => {
		expect(generatedCameraFidelity(8_000)).toEqual({
			semanticScale: "citizen",
			fidelityClass: "LOD0",
		});
		expect(generatedCameraFidelity(24_000)).toEqual({
			semanticScale: "citizen",
			fidelityClass: "LOD1",
		});
		expect(generatedCameraFidelity(72_000)).toEqual({
			semanticScale: "town",
			fidelityClass: "LOD2",
		});
		expect(generatedCameraFidelity(140_000)).toEqual({
			semanticScale: "region",
			fidelityClass: "LOD3",
		});
	});

	it("shares bounded pan/orbit state without changing a projected actor", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const before = structuredClone(model);
		const panned = reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
			type: "pan",
			xDeltaMm: 8_000,
			zDeltaMm: -4_000,
		});
		const orbited = reduceGeneratedNavigation(panned, {
			type: "orbit",
			yawDeltaDegrees: 20,
			pitchDeltaDegrees: -8,
		});
		const intent = cameraIntentForGeneratedNavigation(
			projection,
			model,
			orbited,
		);

		expect(orbited.panOffsetMm).toEqual({ x: 8_000, z: -4_000 });
		expect(intent.yawDegrees).toBe(48);
		expect(model).toEqual(before);
	});

	it("advances camera presentation deterministically and honors reduced motion", () => {
		const current = Object.freeze({
			targetMm: Object.freeze({ x: 0, y: 0, z: 0 }),
			distanceMm: 72_000,
			yawDegrees: 350,
			pitchDegrees: -38,
			followCitizenId: null,
			semanticLabel: "current",
		});
		const desired = Object.freeze({
			...current,
			targetMm: Object.freeze({ x: 10_000, y: 0, z: -5_000 }),
			distanceMm: 24_000,
			yawDegrees: 10,
			semanticLabel: "desired",
		});
		const first = advanceGeneratedCameraIntent(current, desired, false);

		expect(first).toEqual(
			advanceGeneratedCameraIntent(current, desired, false),
		);
		expect(first.targetMm).toEqual({ x: 2_600, y: 0, z: -1_300 });
		expect(first.distanceMm).toBe(59_520);
		expect(first.yawDegrees).toBeCloseTo(355.2);
		expect(advanceGeneratedCameraIntent(current, desired, true)).toBe(desired);
		const dtFrame = advanceGeneratedCameraIntent(
			current,
			desired,
			false,
			1 / 60,
		);
		expect(dtFrame.yawDegrees).toBeCloseTo(350.4);
		expect(dtFrame.yawDegrees).not.toBeCloseTo(355.2);
		expect(dtFrame.distanceMm).not.toBe(first.distanceMm);
	});

	it("fails closed on malformed DOM actions and corrupt navigation state", () => {
		expect(
			parseGeneratedNavigationAction({
				type: "select-building",
				buildingId: "building-authoritative",
			}),
		).toEqual({
			type: "select-building",
			buildingId: "building-authoritative",
		});
		expect(
			parseGeneratedNavigationAction({ type: "zoom", deltaMm: Number.NaN }),
		).toBeNull();
		expect(
			parseGeneratedNavigationAction({
				type: "select-building",
				buildingId: "building-authoritative",
				stateHash: "forged-authority",
			}),
		).toBeNull();
		expect(
			parseGeneratedNavigationAction({
				type: "select-citizen",
				citizenId: "citizen_mara",
				stateHash: "forged-authority",
			}),
		).toBeNull();
		expect(
			parseGeneratedNavigationAction({ type: "invent-reality" }),
		).toBeNull();
		expect(() =>
			reduceGeneratedNavigation(
				{
					...INITIAL_GENERATED_NAVIGATION,
					distanceMm: Number.NaN,
				},
				{ type: "overview" },
			),
		).toThrow(/must be finite/u);
	});

	it("admits only authoritative citizen, building, and project identities", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		expect(
			generatedNavigationReferencesExist(
				{ type: "select-citizen", citizenId: "foreign-citizen" },
				model,
				projection,
			),
		).toBe(false);
		expect(
			generatedNavigationReferencesExist(
				{ type: "select-project", projectId: "foreign-project" },
				model,
				projection,
			),
		).toBe(false);
		expect(
			generatedNavigationReferencesExist(
				{ type: "select-building", buildingId: "foreign-building" },
				model,
				projection,
			),
		).toBe(false);
		expect(
			generatedNavigationReferencesExist(
				{ type: "select-citizen", citizenId: model.actors[0]?.citizenId ?? "" },
				model,
				projection,
			),
		).toBe(true);
		expect(
			generatedNavigationReferencesExist(
				{
					type: "select-building",
					buildingId: projection.local.buildings[0]?.buildingId ?? "",
				},
				model,
				projection,
			),
		).toBe(true);
	});

	it("targets authoritative building positions and project sites", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const building = projection.local.buildings[0];
		const project = model.projects[0];
		if (building === undefined || project === undefined)
			throw new Error("fixture lacks contextual objects");
		const buildingIntent = cameraIntentForGeneratedNavigation(
			projection,
			model,
			reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
				type: "select-building",
				buildingId: building.buildingId,
			}),
		);
		expect(buildingIntent.targetMm).toEqual({
			x: building.position.xMillimeters,
			y: building.position.elevationMillimeters,
			z: building.position.yMillimeters,
		});
		expect(buildingIntent.distanceMm).toBe(24_000);
		const site = projection.local.sites.find(
			({ siteId }) => siteId === project.siteId,
		);
		if (site === undefined) throw new Error("fixture project site missing");
		const projectIntent = cameraIntentForGeneratedNavigation(
			projection,
			model,
			reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
				type: "select-project",
				projectId: project.projectId,
			}),
		);
		expect(projectIntent.targetMm).toEqual({
			x: Math.round(
				(site.bounds.minimum.xMillimeters + site.bounds.maximum.xMillimeters) /
					2,
			),
			y: site.bounds.minimum.elevationMillimeters,
			z: Math.round(
				(site.bounds.minimum.yMillimeters + site.bounds.maximum.yMillimeters) /
					2,
			),
		});
	});

	it("restores useful building scale after citizen focus", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const citizen = model.actors[0];
		const building = projection.local.buildings[0];
		if (citizen === undefined || building === undefined)
			throw new Error("fixture lacks a citizen or building");
		const citizenFocus = reduceGeneratedNavigation(
			INITIAL_GENERATED_NAVIGATION,
			{
				type: "select-citizen",
				citizenId: citizen.citizenId,
			},
		);
		expect(citizenFocus.distanceMm).toBe(9_000);

		const buildingFocus = reduceGeneratedNavigation(citizenFocus, {
			type: "select-building",
			buildingId: building.buildingId,
		});

		expect(buildingFocus.distanceMm).toBe(24_000);
		expect(
			cameraIntentForGeneratedNavigation(projection, model, buildingFocus)
				.distanceMm,
		).toBe(24_000);
	});

	it("restores useful project scale after citizen focus", async () => {
		const { projection, activities } = await fixture();
		const model = projectGeneratedEmbodiment({
			current: projection,
			activities,
		});
		const citizen = model.actors[0];
		const project = model.projects[0];
		if (citizen === undefined || project === undefined)
			throw new Error("fixture lacks a citizen or project");
		const citizenFocus = reduceGeneratedNavigation(
			INITIAL_GENERATED_NAVIGATION,
			{
				type: "select-citizen",
				citizenId: citizen.citizenId,
			},
		);
		expect(citizenFocus.distanceMm).toBe(9_000);

		const projectFocus = reduceGeneratedNavigation(citizenFocus, {
			type: "select-project",
			projectId: project.projectId,
		});

		expect(projectFocus.distanceMm).toBe(28_000);
		expect(
			cameraIntentForGeneratedNavigation(projection, model, projectFocus)
				.distanceMm,
		).toBe(28_000);
	});
});

describe("generated asset provenance", () => {
	it("tracks an embedded, external-request-free glTF well under the mobile budget", async () => {
		const bytes = await readFile(
			new URL(
				"../../../apps/web/public/assets/generated/eonfolk-folk-proxy.gltf",
				import.meta.url,
			),
		);
		const gltf = JSON.parse(bytes.toString("utf8")) as {
			readonly buffers: readonly Readonly<{ readonly uri: string }>[];
			readonly extras: {
				readonly eonfolk: { readonly thirdPartyMaterial: boolean };
			};
		};
		expect(bytes.byteLength).toBe(3_929);
		expect(createHash("sha256").update(bytes).digest("hex")).toBe(
			"a639294bb1ae71731265f510089d72bef0677ed5de64c98c70724ad5fce64179",
		);
		expect(gltf.buffers.every((buffer) => buffer.uri.startsWith("data:"))).toBe(
			true,
		);
		expect(gltf.extras.eonfolk.thirdPartyMaterial).toBe(false);
		expect(() =>
			assertGeneratedAssetBudget({ byteLength: bytes.byteLength }),
		).not.toThrow();
	});

	it("admits only the exact manifest-bound bytes", async () => {
		const [manifestBytes, assetBytes] = await Promise.all([
			readFile(
				new URL(
					"../../../apps/web/public/assets/generated/ASSET_MANIFEST.json",
					import.meta.url,
				),
			),
			readFile(
				new URL(
					"../../../apps/web/public/assets/generated/eonfolk-folk-proxy.glb",
					import.meta.url,
				),
			),
		]);
		const requests: string[] = [];
		const requestOptions: RequestInit[] = [];
		const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			requests.push(url);
			requestOptions.push(init ?? {});
			return url.endsWith("ASSET_MANIFEST.json")
				? new Response(manifestBytes, { status: 200 })
				: new Response(assetBytes, { status: 200 });
		};

		const integrity = await verifyGeneratedFolkAsset(fetcher as typeof fetch);
		expect(requests).toEqual([
			"/assets/generated/ASSET_MANIFEST.json",
			"/assets/generated/eonfolk-folk-proxy.glb",
		]);
		expect(requestOptions).toEqual([
			{ cache: "no-store", credentials: "same-origin", redirect: "error" },
			{ cache: "no-store", credentials: "same-origin", redirect: "error" },
		]);
		expect(integrity).toMatchObject({
			status: "verified",
			assetId: GENERATED_FOLK_BINARY_ASSET.assetId,
			byteLength: GENERATED_FOLK_BINARY_ASSET.byteLength,
			sha256: GENERATED_FOLK_BINARY_ASSET.sha256,
			manifestSha256:
				"aff11f20ba04bd2d8591f61f9bb4cb3dd5fce601f5557a808b50a3d5acecd4ee",
			rendererIntegration: "procedural-reference-only",
		});

		await expect(
			verifyGeneratedFolkAsset((async (input: RequestInfo | URL) => {
				const url = String(input);
				return url.endsWith("ASSET_MANIFEST.json")
					? new Response(manifestBytes, { status: 200 })
					: new Response(new Uint8Array(assetBytes.length), { status: 200 });
			}) as typeof fetch),
		).rejects.toThrow(/byte length|digest/u);

		const manifest = JSON.parse(manifestBytes.toString("utf8"));
		manifest.pipeline.determinism = "trust these unverified words";
		await expect(
			verifyGeneratedFolkAsset((async (input: RequestInfo | URL) => {
				const url = String(input);
				return url.endsWith("ASSET_MANIFEST.json")
					? new Response(JSON.stringify(manifest), { status: 200 })
					: new Response(assetBytes, { status: 200 });
			}) as typeof fetch),
		).rejects.toThrow(/manifest byte length|manifest digest/u);

		const sameLengthManifestCorruption = Buffer.from(manifestBytes);
		const firstManifestByte = sameLengthManifestCorruption[0];
		if (firstManifestByte === undefined)
			throw new Error("generated asset manifest must not be empty");
		sameLengthManifestCorruption[0] = firstManifestByte ^ 1;
		await expect(
			verifyGeneratedFolkAsset((async (input: RequestInfo | URL) => {
				const url = String(input);
				return url.endsWith("ASSET_MANIFEST.json")
					? new Response(sameLengthManifestCorruption, { status: 200 })
					: new Response(assetBytes, { status: 200 });
			}) as typeof fetch),
		).rejects.toThrow(/manifest digest/u);
	});
});
