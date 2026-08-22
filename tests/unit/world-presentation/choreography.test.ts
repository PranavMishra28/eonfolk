import {
	chronicleCameraComposition,
	workToolForAction,
	type CanonicalActionRef,
} from "../../../packages/world-presentation/src/index.js";
import { describe, expect, it } from "vitest";

const action = (
	kind: CanonicalActionRef["kind"],
	destinationPlaceId: string,
	affordanceId: string | null = null,
): CanonicalActionRef => ({
	actionId: "action:test",
	sourceKind: "current-behavior",
	eventId: null,
	eventSequence: null,
	status: "in-progress",
	kind,
	originPlaceId: "market",
	destinationPlaceId,
	affordanceId,
	affordanceSlotIndex: null,
	targetId: null,
	simulationStart: 0,
	simulationEnd: null,
	resultEventId: null,
});

describe("world choreography", () => {
	it("derives readable equipment only from the accepted typed action", () => {
		expect(
			workToolForAction(action("inspect", "market", "market-ledger")),
		).toBe("ledger");
		expect(workToolForAction(action("repair", "mill", "mill-repair"))).toBe(
			"mallet",
		);
		expect(workToolForAction(action("walk", "spring"))).toBe("bucket");
		expect(workToolForAction(action("walk", "woods"))).toBe("axe");
		expect(workToolForAction(action("walk", "fields"))).toBe("basket");
		expect(workToolForAction(action("walk", "granary"))).toBeNull();
		expect(workToolForAction(action("idle", "market"))).toBeNull();
		expect(workToolForAction(action("inspect", "market"))).toBeNull();
	});

	it("keeps the three Chronicle beats compositionally nonidentical", () => {
		const compositions = ["beat:1", "beat:2", "beat:3"].map(
			chronicleCameraComposition,
		);
		expect(new Set(compositions.map(({ key }) => key)).size).toBe(3);
		expect(new Set(compositions.map(({ distanceM }) => distanceM)).size).toBe(
			3,
		);
		expect(new Set(compositions.map(({ yawDegrees }) => yawDegrees)).size).toBe(
			3,
		);
	});
});
