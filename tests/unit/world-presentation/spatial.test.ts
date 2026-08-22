import {
	advancePresentationClock,
	createAuthoredPathPlanner,
	humanoidPose,
	inspectSpatialProjection,
	pointIntersectsBlockedVolume,
	projectSpatialScene,
	requiredAnimationClasses,
	riverholdSpatialScene,
	type SpatialCitizenInput,
	type SpatialProjection,
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
			targetId: null,
			simulationStart: 1_000,
			simulationEnd: null,
			resultEventId: null,
		},
	}),
);

describe("world presentation", () => {
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
