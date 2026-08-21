import {
	advancePresentationClock,
	createAuthoredPathPlanner,
	pointIntersectsBlockedVolume,
	projectSpatialScene,
	riverholdSpatialScene,
	type SpatialCitizenInput,
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
		canonicalAction: {
			actionId: `behavior:${slug}:3`,
			sourceKind: "current-behavior",
			eventId: null,
			eventSequence: null,
			status: "in-progress",
			kind: "idle",
		},
	}),
);

describe("world presentation", () => {
	it("projects a deterministic, moving, blocked-volume-safe living settlement", () => {
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
		const windowSamples = [30, 60, 90, 120, 180, 240, 300].map(
			(presentationTick) =>
				projectSpatialScene({ source, citizens, presentationTick }),
		);
		expect(
			projectSpatialScene({ source, citizens, presentationTick: 120 }),
		).toEqual(later);
		expect(later.actors).toHaveLength(8);
		expect(later.teleportCount).toBe(0);
		expect(later.contradictionCount).toBe(0);
		expect(
			first.actors.filter((actor, index) =>
				windowSamples.some((sample) => {
					const candidate = sample.actors[index];
					return (
						candidate !== undefined &&
						(candidate.positionMm.x !== actor.positionMm.x ||
							candidate.positionMm.z !== actor.positionMm.z)
					);
				}),
			),
		).toHaveLength(8);
		expect(
			later.actors.some((actor) =>
				pointIntersectsBlockedVolume(actor.positionMm),
			),
		).toBe(false);
	});

	it("keeps ordinary movement continuous and executes several meaningful classes", () => {
		const seen = new Set<string>();
		let previous = projectSpatialScene({
			source,
			citizens,
			presentationTick: 0,
		});
		for (let tick = 1; tick <= 360; tick += 1) {
			const next = projectSpatialScene({
				source,
				citizens,
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
		expect(seen.has("gather")).toBe(true);
		expect(seen.has("inspect")).toBe(true);
		expect(seen.has("repair")).toBe(true);
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
				sourceEventId: "event-8",
				status: "committed",
			}),
		]);
		expect(projection.canonicalEventLinkCount).toBeGreaterThanOrEqual(3);
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
