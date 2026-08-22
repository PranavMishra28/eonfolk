import {
	advancePresentationClock,
	createAuthoredPathPlanner,
	humanoidPose,
	inspectSpatialProjection,
	pointIntersectsBlockedVolume,
	PRESENTATION_HZ,
	projectPresentationResidency,
	projectSpatialScene,
	requiredAnimationClasses,
	riverholdPhysicalScale,
	riverholdSpatialScene,
	semanticScaleForDistance,
	type SpatialCitizenInput,
	type SpatialProjection,
	validateRiverholdSpatialScene,
} from "../../../packages/world-presentation/src/index.js";
import { describe, expect, it } from "vitest";

const source = {
	runId: "run_fixture",
	regionId: "riverhold",
	revision: 3,
	throughSequence: 9,
	stateHash: "a".repeat(64),
} as const;

const seeds = [
	["mara", "Mara Vale", "ledger runner", "market", "investigate"],
	["toma", "Toma Reed", "storekeeper", "market", "trade"],
	["iven", "Iven Holt", "miller", "market", "trade"],
	["sela", "Sela Fen", "water carrier", "spring", "water"],
	["rowan", "Rowan Pike", "woodcutter", "woods", "wood"],
	["neri", "Neri Ash", "forager", "fields", "food"],
	["odo", "Odo Bell", "repair hand", "mill", "mill"],
	["els", "Els Wren", "council clerk", "granary", "council"],
] as const;

const citizens: readonly SpatialCitizenInput[] = seeds.map(
	([slug, name, role, placeId, activityKind]) => ({
		citizenId: `citizen:${slug}`,
		slug,
		name,
		role,
		placeId,
		activity: slug === "mara" ? "checking the tally" : `serving as ${role}`,
		activityKind,
		focal: slug === "mara",
		carriedProp:
			slug === "iven" || slug === "rowan"
				? "logs"
				: slug === "sela"
					? "water"
					: slug === "toma"
						? "grain"
						: slug === "odo"
							? "tool"
							: null,
		canonicalAction: {
			actionId: `behavior:${slug}:3`,
			sourceKind: "current-behavior",
			eventId: null,
			eventSequence: null,
			status: "in-progress",
			kind:
				slug === "toma" || slug === "iven"
					? "exchange"
					: slug === "sela" || slug === "rowan" || slug === "neri"
						? "gather"
						: slug === "odo"
							? "repair"
							: "inspect",
			originPlaceId: placeId,
			destinationPlaceId: placeId,
			affordanceId:
				slug === "mara"
					? "market-ledger"
					: slug === "toma" || slug === "iven"
						? "market-exchange"
						: slug === "sela"
							? "spring-water"
							: slug === "rowan"
								? "woods-wood"
								: slug === "neri"
									? "fields-food"
									: slug === "odo"
										? "mill-repair"
										: "granary-ledger",
			affordanceSlotIndex: slug === "toma" ? 0 : slug === "iven" ? 1 : 0,
			targetId:
				slug === "toma"
					? "citizen:iven"
					: slug === "iven"
						? "citizen:toma"
						: null,
			simulationStart: 1_000,
			simulationEnd: null,
			resultEventId: null,
		},
	}),
);

describe("world presentation", () => {
	it("locks a measurable human-scale settlement and valid authored affordances", () => {
		expect(validateRiverholdSpatialScene()).toEqual([]);
		expect(riverholdPhysicalScale.citizen.heightMm).toBeGreaterThanOrEqual(
			1_600,
		);
		expect(riverholdPhysicalScale.citizen.heightMm).toBeLessThanOrEqual(1_900);
		expect(riverholdPhysicalScale.door.heightMm).toBeGreaterThanOrEqual(1_950);
		expect(riverholdPhysicalScale.door.heightMm).toBeLessThanOrEqual(2_200);
		expect(riverholdPhysicalScale.house.widthMm).toBeGreaterThan(
			riverholdPhysicalScale.door.widthMm * 5,
		);
		expect(riverholdPhysicalScale.tree.matureHeightMm).toBeGreaterThan(
			riverholdPhysicalScale.house.ridgeHeightMm,
		);
		expect(riverholdPhysicalScale.market.clearDiameterMm).toBeGreaterThan(
			riverholdPhysicalScale.house.widthMm * 3,
		);
		expect(riverholdPhysicalScale.mill.wheelDiameterMm).toBeGreaterThan(
			riverholdPhysicalScale.citizen.heightMm * 2,
		);
		expect(riverholdPhysicalScale.road.primaryWidthMm).toBeGreaterThan(
			riverholdPhysicalScale.road.footpathWidthMm,
		);

		const exchangeWest = riverholdSpatialScene.nodes["market:exchange-west"];
		const exchangeEast = riverholdSpatialScene.nodes["market:exchange-east"];
		expect(exchangeWest).toBeDefined();
		expect(exchangeEast).toBeDefined();
		if (exchangeWest === undefined || exchangeEast === undefined) return;
		expect(exchangeWest.capacity).toBe(1);
		expect(exchangeEast.capacity).toBe(1);
		expect(exchangeWest.facingDegrees).toBe(90);
		expect(exchangeEast.facingDegrees).toBe(-90);
		expect(exchangeWest.waitingNodeIds).toEqual(["market:queue"]);
		expect(exchangeEast.waitingNodeIds).toEqual(["market:queue"]);
		expect(
			Math.hypot(
				exchangeWest.x - exchangeEast.x,
				exchangeWest.z - exchangeEast.z,
			),
		).toBe(riverholdPhysicalScale.interaction.faceToFaceSpacingMm);
	});

	it("keeps camera residency and semantic scale independent of canonical projection", () => {
		const canonical = projectSpatialScene({
			source,
			citizens,
			presentationTick: 45,
		});
		const canonicalSnapshot = structuredClone(canonical);
		const citizenResidency = projectPresentationResidency({
			targetMm: canonical.actors[0]?.positionMm ?? { x: 0, y: 0, z: 0 },
			distanceMm: 18_000,
			selectedCitizenId: "citizen:mara",
		});
		const townResidency = projectPresentationResidency({
			targetMm: { x: 40_000, y: 0, z: 8_000 },
			distanceMm: 64_000,
			selectedCitizenId: "citizen:odo",
		});
		const regionResidency = projectPresentationResidency({
			targetMm: { x: 0, y: 0, z: 0 },
			distanceMm: 180_000,
			selectedCitizenId: null,
		});

		expect(citizenResidency.semanticScale).toBe("citizen");
		expect(townResidency.semanticScale).toBe("town");
		expect(regionResidency.semanticScale).toBe("region");
		expect(semanticScaleForDistance(28_000)).toBe("citizen");
		expect(semanticScaleForDistance(28_001)).toBe("town");
		expect(semanticScaleForDistance(92_001)).toBe("region");
		expect(citizenResidency.selectedCitizenId).toBe("citizen:mara");
		expect(townResidency.selectedCitizenId).toBe("citizen:odo");
		expect(regionResidency.cells.every(({ resident }) => resident)).toBe(true);
		expect(canonical).toEqual(canonicalSnapshot);
		expect(
			projectSpatialScene({ source, citizens, presentationTick: 45 }),
		).toEqual(canonicalSnapshot);
	});

	it("projects a deterministic, truthful, blocked-volume-safe living settlement", () => {
		const first = projectSpatialScene({
			source,
			citizens,
			presentationTick: 0,
		});
		const later = projectSpatialScene({
			source,
			citizens,
			presentationTick: 120,
		});
		expect(
			projectSpatialScene({ source, citizens, presentationTick: 120 }),
		).toEqual(later);
		expect(later.actors).toHaveLength(8);
		expect(later.teleportCount).toBe(0);
		expect(later.contradictionCount).toBe(0);
		expect(first.movingCitizenCount).toBe(0);
		expect(
			later.actors.some((actor) =>
				pointIntersectsBlockedVolume(actor.positionMm),
			),
		).toBe(false);
	});

	it("keeps ordinary movement continuous and executes several meaningful classes", () => {
		const seen = new Set<string>();
		const movingCitizens = citizens.map((citizen) => {
			const movement =
				citizen.slug === "mara"
					? { from: "market", to: "granary", kind: "walk" as const }
					: citizen.slug === "sela"
						? { from: "spring", to: "market", kind: "carry" as const }
						: citizen.slug === "rowan"
							? { from: "woods", to: "mill", kind: "carry" as const }
							: null;
			return movement === null
				? citizen
				: {
						...citizen,
						canonicalAction: {
							...citizen.canonicalAction,
							actionId: `travel:${citizen.slug}`,
							kind: movement.kind,
							originPlaceId: movement.from,
							destinationPlaceId: movement.to,
							targetId: movement.to,
						},
					};
		});
		let previous = projectSpatialScene({
			source,
			citizens: movingCitizens,
			presentationTick: 0,
		});
		for (let tick = 1; tick <= 360; tick += 1) {
			const next = projectSpatialScene({
				source,
				citizens: movingCitizens,
				presentationTick: tick,
			});
			for (const [index, actor] of next.actors.entries()) {
				const prior = previous.actors[index];
				expect(prior).toBeDefined();
				if (prior === undefined) continue;
				const displacement = Math.hypot(
					actor.positionMm.x - prior.positionMm.x,
					actor.positionMm.z - prior.positionMm.z,
				);
				expect(displacement).toBeLessThanOrEqual(80);
				expect(pointIntersectsBlockedVolume(actor.positionMm)).toBe(false);
				seen.add(actor.animationClass);
			}
			previous = next;
		}
		expect(seen.has("walk")).toBe(true);
		expect(seen.has("carry")).toBe(true);
		const stationaryClasses = new Set(
			projectSpatialScene({ source, citizens, presentationTick: 0 })
				.animationClasses,
		);
		expect(stationaryClasses.has("gather")).toBe(true);
		expect(stationaryClasses.has("inspect")).toBe(true);
		expect(stationaryClasses.has("repair")).toBe(true);
	});

	it("sustains ten deterministic seconds of truthful motion and activity", () => {
		const temporalCitizens = citizens.map((citizen) => {
			if (citizen.slug === "toma" || citizen.slug === "iven")
				return {
					...citizen,
					canonicalAction: {
						...citizen.canonicalAction,
						actionId: "exchange:event-8",
						sourceKind: "world-event" as const,
						eventId: "event-8",
						eventSequence: 8,
						status: "committed" as const,
						targetId: citizen.slug === "toma" ? "citizen:iven" : "citizen:toma",
						simulationEnd: 1_050,
						resultEventId: "event-8",
					},
				};
			const travel =
				citizen.slug === "mara"
					? { origin: "market", destination: "granary", kind: "walk" as const }
					: citizen.slug === "sela"
						? {
								origin: "spring",
								destination: "market",
								kind: "carry" as const,
							}
						: citizen.slug === "rowan"
							? { origin: "woods", destination: "mill", kind: "carry" as const }
							: null;
			return travel === null
				? citizen
				: {
						...citizen,
						canonicalAction: {
							...citizen.canonicalAction,
							actionId: `travel:${citizen.slug}`,
							kind: travel.kind,
							originPlaceId: travel.origin,
							destinationPlaceId: travel.destination,
							targetId: travel.destination,
						},
					};
		});
		const actionClasses = new Set<string>();
		const firstPositions = new Map<string, { x: number; z: number }>();
		let previous: SpatialProjection | null = null;

		for (let tick = 0; tick <= PRESENTATION_HZ * 10; tick += 1) {
			const projection = projectSpatialScene({
				source,
				citizens: temporalCitizens,
				presentationTick: tick,
			});
			const inspection = inspectSpatialProjection(projection, previous);
			expect(
				inspection.mismatches,
				`presentation mismatch at tick ${tick}`,
			).toEqual([]);
			expect(projection.movingCitizenCount).toBe(3);
			expect(projection.interactions).toEqual([
				expect.objectContaining({
					participantIds: ["citizen:toma", "citizen:iven"],
					sourceEventId: "event-8",
					sourceSequence: 8,
					status: "committed",
				}),
			]);
			for (const actor of projection.actors) {
				actionClasses.add(actor.animationClass);
				expect(pointIntersectsBlockedVolume(actor.positionMm)).toBe(false);
				if (!firstPositions.has(actor.citizenId))
					firstPositions.set(actor.citizenId, {
						x: actor.positionMm.x,
						z: actor.positionMm.z,
					});
			}
			for (const [index, actor] of projection.actors.entries()) {
				for (const other of projection.actors.slice(index + 1)) {
					const separationMm = Math.hypot(
						actor.positionMm.x - other.positionMm.x,
						actor.positionMm.z - other.positionMm.z,
					);
					expect(
						separationMm,
						`${actor.citizenId} overlaps ${other.citizenId} at tick ${tick}`,
					).toBeGreaterThanOrEqual(600);
				}
			}
			previous = projection;
		}

		expect(actionClasses.size).toBeGreaterThanOrEqual(4);
		expect([...actionClasses]).toEqual(
			expect.arrayContaining([
				"walk",
				"carry",
				"exchange",
				"gather",
				"repair",
				"inspect",
			]),
		);
		expect(
			projectSpatialScene({
				source,
				citizens: temporalCitizens,
				presentationTick: PRESENTATION_HZ * 10,
			}),
		).toEqual(previous);
		for (const citizenId of ["citizen:mara", "citizen:sela", "citizen:rowan"]) {
			const start = firstPositions.get(citizenId);
			const finish = previous?.actors.find(
				(actor) => actor.citizenId === citizenId,
			)?.positionMm;
			expect(start).toBeDefined();
			expect(finish).toBeDefined();
			if (start === undefined || finish === undefined) continue;
			expect(
				Math.hypot(finish.x - start.x, finish.z - start.z),
			).toBeGreaterThanOrEqual(8_900);
		}
	});

	it("binds a paired exchange to one canonical event", () => {
		const withExchange = citizens.map((citizen) =>
			citizen.slug === "toma" || citizen.slug === "iven"
				? {
						...citizen,
						canonicalAction: {
							actionId: "exchange:event-8",
							sourceKind: "world-event" as const,
							eventId: "event-8",
							eventSequence: 8,
							status: "committed" as const,
							kind: "exchange" as const,
							originPlaceId: "market",
							destinationPlaceId: "market",
							affordanceId: "market-exchange",
							affordanceSlotIndex: citizen.slug === "toma" ? 0 : 1,
							targetId:
								citizen.slug === "toma" ? "citizen:iven" : "citizen:toma",
							simulationStart: 1_050,
							simulationEnd: 1_050,
							resultEventId: "event-8",
						},
					}
				: citizen,
		);
		const projection = projectSpatialScene({
			source,
			citizens: withExchange,
			presentationTick: 330,
		});
		expect(projection.interactions).toEqual([
			expect.objectContaining({
				kind: "exchange",
				semanticLabel:
					"Toma Reed and Iven Holt visibly project the linked canonical exchange.",
				sourceEventId: "event-8",
				status: "committed",
			}),
		]);
		expect(projection.canonicalEventLinkCount).toBeGreaterThanOrEqual(3);
	});

	it("projects a committed cross-place move along the authored route without teleporting", () => {
		const withMove = citizens.map((citizen) =>
			citizen.slug === "mara"
				? {
						...citizen,
						placeId: "mill",
						canonicalAction: {
							actionId: "event:event-move",
							sourceKind: "world-event" as const,
							eventId: "event-move",
							eventSequence: 9,
							status: "committed" as const,
							kind: "walk" as const,
							originPlaceId: "spring",
							destinationPlaceId: "mill",
							affordanceId: null,
							affordanceSlotIndex: null,
							targetId: "mill",
							simulationStart: 1_050,
							simulationEnd: 1_050,
							resultEventId: "event-move",
						},
					}
				: citizen,
		);
		const first = projectSpatialScene({
			source,
			citizens: withMove,
			presentationTick: 0,
		});
		const second = projectSpatialScene({
			source,
			citizens: withMove,
			presentationTick: 1,
		});
		const mara = first.actors.find((actor) => actor.slug === "mara");
		expect(mara?.routeNodeIds).toEqual([
			"spring:entry",
			"market:west",
			"market:center",
			"market:east",
			"mill:entry",
		]);
		expect(mara?.positionMm).toEqual(
			expect.objectContaining({ x: -39_000, y: 0, z: 18_000 }),
		);
		expect(inspectSpatialProjection(second, first)).toEqual(
			expect.objectContaining({ teleportCount: 0, contradictionCount: 0 }),
		);
		const completed = projectSpatialScene({
			source,
			citizens: withMove,
			presentationTick: 5_000,
		});
		const completedMara = completed.actors.find(
			(actor) => actor.slug === "mara",
		);
		expect(completedMara?.animationClass).toBe("idle");
		expect(completedMara?.positionMm).toEqual(
			expect.objectContaining({ x: 35_000, y: 0, z: 8_000 }),
		);
		expect(inspectSpatialProjection(completed)).toEqual(
			expect.objectContaining({ teleportCount: 0, contradictionCount: 0 }),
		);
	});

	it("never presents arrival before Reality commits TravelArrived", () => {
		const travelling = citizens.map((citizen) =>
			citizen.slug === "mara"
				? {
						...citizen,
						canonicalAction: {
							...citizen.canonicalAction,
							actionId: "travel:mara:truth-boundary",
							kind: "walk" as const,
							status: "in-progress" as const,
							originPlaceId: "spring",
							destinationPlaceId: "mill",
							affordanceId: null,
							affordanceSlotIndex: null,
							targetId: "mill",
							simulationEnd: 1_180,
							resultEventId: null,
						},
					}
				: citizen,
		);
		const projection = projectSpatialScene({
			source,
			citizens: travelling,
			presentationTick: 50_000,
		});
		const mara = projection.actors.find((actor) => actor.slug === "mara");
		expect(mara?.travelState.status).toBe("travelling");
		expect(mara?.animationClass).toBe("idle");
		expect(mara?.semanticLabel).toContain("waiting outside mill");
		expect(mara?.positionMm).not.toEqual(
			riverholdSpatialScene.nodes["mill:entry"],
		);
	});

	it("starts with a legible paired exchange and covers the required pose graph", () => {
		const initial = projectSpatialScene({
			source,
			citizens,
			presentationTick: 0,
		});
		expect(initial.interactions).toEqual([
			expect.objectContaining({
				kind: "exchange",
				participantIds: ["citizen:toma", "citizen:iven"],
				semanticLabel:
					"Toma Reed and Iven Holt visibly perform a carried-goods exchange; no world result is claimed.",
				status: "in-progress",
			}),
		]);
		const toma = initial.actors.find((actor) => actor.slug === "toma");
		const iven = initial.actors.find((actor) => actor.slug === "iven");
		expect(toma).toBeDefined();
		expect(iven).toBeDefined();
		if (toma !== undefined && iven !== undefined) {
			const delta = Math.abs(toma.facingDegrees - iven.facingDegrees);
			expect(Math.abs(180 - delta)).toBeLessThanOrEqual(1);
		}
		for (const animationClass of requiredAnimationClasses) {
			const pose = humanoidPose(animationClass, 17);
			expect(Object.values(pose).every(Number.isFinite)).toBe(true);
		}
	});

	it("detects injected presentation contradictions and teleports", () => {
		const previous = projectSpatialScene({
			source,
			citizens,
			presentationTick: 1,
		});
		const normal = projectSpatialScene({
			source,
			citizens,
			presentationTick: 2,
		});
		expect(inspectSpatialProjection(normal, previous)).toEqual(
			expect.objectContaining({ teleportCount: 0, contradictionCount: 0 }),
		);
		const first = normal.actors[0];
		expect(first).toBeDefined();
		if (first === undefined) return;
		const injected = {
			...normal,
			actors: [
				{
					...first,
					positionMm: { ...first.positionMm, x: first.positionMm.x + 10_000 },
					animationClass: "talk" as const,
					action: { ...first.action, kind: "repair" as const },
				},
				...normal.actors.slice(1),
			],
		} satisfies SpatialProjection;
		const inspection = inspectSpatialProjection(injected, previous);
		expect(inspection.teleportCount).toBe(1);
		expect(inspection.contradictionCount).toBeGreaterThanOrEqual(1);
		expect(inspection.mismatches.map(({ code }) => code)).toEqual(
			expect.arrayContaining(["teleport", "action-animation-contradiction"]),
		);
	});

	it("plans stable authored paths and clamps long frames", () => {
		const planner = createAuthoredPathPlanner(riverholdSpatialScene);
		expect(
			planner.plan({ fromNodeId: "spring:work", toNodeId: "mill:work" }),
		).toEqual([
			"spring:work",
			"spring:entry",
			"market:west",
			"market:center",
			"market:east",
			"mill:entry",
			"mill:work",
		]);
		expect(
			advancePresentationClock({ tick: 0, accumulatorMs: 0 }, 10_000),
		).toEqual(expect.objectContaining({ tick: 5 }));
	});
});
