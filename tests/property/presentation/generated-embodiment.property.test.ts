import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { GeneratedEmbodiedActor } from "../../../apps/web/src/generated-presentation/index.js";
import {
	INITIAL_GENERATED_NAVIGATION,
	planGeneratedActorTransition,
	reduceGeneratedNavigation,
	sampleGeneratedActorTransition,
} from "../../../apps/web/src/generated-presentation/index.js";

function routeActor(input: {
	readonly x: number;
	readonly z: number;
	readonly progressBasisPoints: number;
}): GeneratedEmbodiedActor {
	return {
		citizenId: "property-citizen",
		settlementId: "settlement-a",
		name: "Property citizen",
		role: "walker",
		placeId: "site-a",
		actionId: "route-action",
		animationClass: "walk",
		pose: {
			family: "locomotion",
			torsoPitchDegrees: 5,
			leftArmPitchDegrees: -24,
			rightArmPitchDegrees: 24,
			leftLegPitchDegrees: 26,
			rightLegPitchDegrees: -26,
		},
		prop: null,
		positionMm: { x: input.x, y: 0, z: input.z },
		facingDegrees: 0,
		grounding: {
			kind: "route",
			authoritativeNodeIds: ["route:waypoint:0", "route:waypoint:1"],
			routeTopologyNodeIds: [
				"entrance-a",
				"route:waypoint:0",
				"route:waypoint:1",
				"entrance-b",
			],
			entranceNodeIds: ["entrance-a", "entrance-b"],
			interactionSlotId: null,
			routeId: "route",
			progressBasisPoints: input.progressBasisPoints,
			provesEntranceToEntranceTraversal: false,
		},
		interactionTarget: null,
		focal: false,
		identityVariant: 1,
		semanticLabel: "Property citizen is walking",
	};
}

describe("generated embodiment properties", () => {
	const deep = process.env.EONFOLK_PROPERTY_PROFILE === "deep";

	it("samples monotonic authoritative transitions inside their metric bounds", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -500_000, max: 500_000 }),
				fc.integer({ min: -500_000, max: 500_000 }),
				fc.integer({ min: -500_000, max: 500_000 }),
				fc.integer({ min: -500_000, max: 500_000 }),
				fc.integer({ min: 0, max: 9_999 }),
				fc.integer({ min: 0, max: 10_000 }),
				(fromX, fromZ, toX, toZ, startProgress, sampleProgress) => {
					const previous = routeActor({
						x: fromX,
						z: fromZ,
						progressBasisPoints: startProgress,
					});
					const current = routeActor({
						x: toX,
						z: toZ,
						progressBasisPoints: startProgress + 1,
					});
					if (fromX === toX && fromZ === toZ) return;
					const transition = planGeneratedActorTransition(previous, current);
					const sample = sampleGeneratedActorTransition(
						transition,
						sampleProgress,
					);
					expect(sample.x).toBeGreaterThanOrEqual(Math.min(fromX, toX));
					expect(sample.x).toBeLessThanOrEqual(Math.max(fromX, toX));
					expect(sample.z).toBeGreaterThanOrEqual(Math.min(fromZ, toZ));
					expect(sample.z).toBeLessThanOrEqual(Math.max(fromZ, toZ));
					expect(
						sampleGeneratedActorTransition(transition, sampleProgress),
					).toEqual(sample);
				},
			),
			{ numRuns: deep ? 1_000 : 100 },
		);
	});

	it("keeps semantic zoom and orbit within explicit camera bounds", () => {
		fc.assert(
			fc.property(
				fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true }),
				fc.double({ min: -1_000, max: 1_000, noNaN: true }),
				fc.double({ min: -1_000, max: 1_000, noNaN: true }),
				(zoomDelta, yawDelta, pitchDelta) => {
					const zoomed = reduceGeneratedNavigation(
						INITIAL_GENERATED_NAVIGATION,
						{ type: "zoom", deltaMm: zoomDelta },
					);
					const orbited = reduceGeneratedNavigation(zoomed, {
						type: "orbit",
						yawDeltaDegrees: yawDelta,
						pitchDeltaDegrees: pitchDelta,
					});
					expect(orbited.distanceMm).toBeGreaterThanOrEqual(8_000);
					expect(orbited.distanceMm).toBeLessThanOrEqual(180_000);
					expect(orbited.yawDegrees).toBeGreaterThanOrEqual(0);
					expect(orbited.yawDegrees).toBeLessThan(360);
					expect(orbited.pitchDegrees).toBeGreaterThanOrEqual(-75);
					expect(orbited.pitchDegrees).toBeLessThanOrEqual(-18);
				},
			),
			{ numRuns: deep ? 1_000 : 100 },
		);
	});
});
