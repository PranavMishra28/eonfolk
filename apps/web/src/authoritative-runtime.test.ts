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
		expect(head.revision).toBe(3);
		expect(
			await persistence.getDecisionRecord(
				"run_riverhold_0001",
				"riverhold",
				"decision_2_counsel",
			),
		).not.toBeNull();
	});

	it("replays the durable ledger and derives Chronicle evidence from real event IDs", async () => {
		const persistence = new MemoryPersistence();
		const first = new AuthoritativeRiverholdRuntime({ persistence });
		await first.initialize();
		await reachCounsel(first, "verify-private");
		await first.dispatch({ kind: "leave-checkpoint" });
		const returning = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "return-pending",
		});
		await returning.initialize();
		const returned = await returning.dispatch({ kind: "confirm-advance" });
		expect(returned.day).toBe(19);
		expect(returned.secondActions.length).toBeGreaterThan(0);
		const chronicle = await returning.dispatch({
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
		expect(replayed.storyCard?.heading).toBe("YOU ADVISED: verify first");
	});

	it.each([
		["verify-private", "publish-verified-count", "YOU ADVISED: verify first"],
		["accuse-now", "repair-trust", "YOU ADVISED: speak now"],
		["abstain", "ask-iven", "YOU OFFERED NO ADVICE"],
	] as const)(
		"rehydrates exact %s advice and its canonical return response",
		async (counsel, actionId, expectedHeading) => {
			const persistence = new MemoryPersistence();
			const first = new AuthoritativeRiverholdRuntime({ persistence });
			await first.initialize();
			await reachCounsel(first, counsel);
			await first.dispatch({ kind: "leave-checkpoint" });
			const returning = new AuthoritativeRiverholdRuntime({
				persistence,
				initialPhase: "return-pending",
			});
			await returning.initialize();
			await returning.dispatch({ kind: "confirm-advance" });
			await returning.dispatch({ kind: "take-second-action", actionId });
			const recovered = new AuthoritativeRiverholdRuntime({
				persistence,
				initialPhase: "chronicle",
			});
			const projection = await recovered.initialize();
			expect(projection.storyCard?.heading).toBe(expectedHeading);
			expect(new Set(projection.chronicle.map((beat) => beat.title)).size).toBe(
				3,
			);
			const head = await persistence.getHead("run_riverhold_0001", "riverhold");
			const events = await persistence.getEventRange({
				runId: "run_riverhold_0001",
				regionId: "riverhold",
				fromSequenceInclusive: 1,
				toSequenceExclusive: head.lastSequence + 1,
			});
			expect(
				events.some(
					(event) =>
						(event.data as { kind?: string; eventPayload?: { kind?: string } })
							.eventPayload?.kind === "ReturnResponseRecorded",
				),
			).toBe(true);
		},
	);

	it("recovers a committed catch-up without advancing the same day twice", async () => {
		const persistence = new MemoryPersistence();
		const first = new AuthoritativeRiverholdRuntime({ persistence });
		await first.initialize();
		await reachCounsel(first, "verify-private");
		await first.dispatch({ kind: "leave-checkpoint" });
		const returning = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "return-pending",
		});
		await returning.initialize();
		await returning.dispatch({ kind: "confirm-advance" });
		const headAfterCatchUp = await persistence.getHead(
			"run_riverhold_0001",
			"riverhold",
		);
		const recovered = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "return-pending",
		});
		const projection = await recovered.initialize();
		expect(projection.phase).toBe("return");
		expect(projection.day).toBe(19);
		await expect(
			recovered.dispatch({ kind: "confirm-advance" }),
		).rejects.toThrow("requires phase return-pending");
		const headAfterRetry = await persistence.getHead(
			"run_riverhold_0001",
			"riverhold",
		);
		expect(headAfterRetry.revision).toBe(headAfterCatchUp.revision);
		expect(headAfterRetry.stateHash).toBe(headAfterCatchUp.stateHash);
		expect(headAfterRetry.worldHeadHash).toBe(headAfterCatchUp.worldHeadHash);
	});

	it("fences an older local writer when a second runtime takes ownership", async () => {
		const persistence = new MemoryPersistence();
		const older = new AuthoritativeRiverholdRuntime({ persistence });
		await older.initialize();
		const newer = new AuthoritativeRiverholdRuntime({ persistence });
		await newer.initialize();
		await older.dispatch({ kind: "follow-mara" });
		await expect(
			older.dispatch({ kind: "investigate-count" }),
		).rejects.toMatchObject({ code: "STALE_FENCE" });
		const projection = await newer.dispatch({ kind: "follow-mara" });
		expect(projection.phase).toBe("following");
	});
});
