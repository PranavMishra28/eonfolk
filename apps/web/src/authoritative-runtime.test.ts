import { MemoryPersistence } from "@eonfolk/persistence";
import { describe, expect, it } from "vitest";
import { AuthoritativeRiverholdRuntime } from "./authoritative-runtime";

async function reachCounsel(
	runtime: AuthoritativeRiverholdRuntime,
	intent: "verify-private" | "accuse-now" | "abstain",
) {
	await runtime.dispatch({ kind: "follow-mara" });
	await runtime.dispatch({ kind: "investigate-count" });
	await runtime.dispatch({ kind: "open-counsel" });
	return runtime.dispatch({ kind: "offer-counsel", counsel: intent });
}

describe("authoritative Riverhold application runtime", () => {
	it("commits cognition and world events before exposing a branch projection", async () => {
		const persistence = new MemoryPersistence();
		const runtime = new AuthoritativeRiverholdRuntime({ persistence });
		const initial = await runtime.initialize();
		expect(initial.citizens).toHaveLength(8);
		expect(initial.investigation).toMatchObject({
			ledgerCount: 40,
			openBinCount: 28,
			mismatch: 12,
		});
		const consequence = await reachCounsel(runtime, "accuse-now");
		expect(consequence.branch).toBe("accuse-now");
		expect(consequence.interpretation).toMatchObject({
			counsel: "accuse-now",
			chosenAction: "accuse-now",
			disposition: "accepted",
		});
		const head = await persistence.getHead("run_riverhold_0001", "riverhold");
		expect(head.revision).toBe(2);
		expect(
			await persistence.getDecisionRecord(
				"run_riverhold_0001",
				"riverhold",
				"decision_1_counsel",
			),
		).not.toBeNull();
	});

	it("replays the durable ledger and derives Chronicle evidence from real event IDs", async () => {
		const persistence = new MemoryPersistence();
		const first = new AuthoritativeRiverholdRuntime({ persistence });
		await first.initialize();
		await reachCounsel(first, "verify-private");
		await first.dispatch({ kind: "leave-checkpoint" });
		const returned = await first.dispatch({ kind: "confirm-advance" });
		expect(returned.day).toBe(19);
		expect(returned.secondActions.length).toBeGreaterThan(0);
		const chronicle = await first.dispatch({
			kind: "take-second-action",
			actionId: "publish-verified-count",
		});
		expect(chronicle.chronicle).toHaveLength(3);
		expect(
			chronicle.chronicle
				.flatMap((beat) => beat.evidence)
				.every((evidence) => evidence.eventId.startsWith("event_")),
		).toBe(true);
		expect(JSON.stringify(chronicle)).not.toContain("RV-");

		const recovered = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "chronicle",
		});
		const replayed = await recovered.initialize();
		expect(replayed.branch).toBe("verify-private");
		expect(replayed.chronicle).toHaveLength(3);
		expect(replayed.day).toBe(19);
	});
});
