import { describe, expect, it } from "vitest";
import type { CounselIntent } from "./projection";
import {
	createRiverholdRuntimeBridge,
	riverholdRuntimeContract,
} from "./runtime";

class MemoryStorage implements Storage {
	readonly values = new Map<string, string>();
	get length() {
		return this.values.size;
	}
	clear() {
		this.values.clear();
	}
	getItem(key: string) {
		return this.values.get(key) ?? null;
	}
	key(index: number) {
		return [...this.values.keys()][index] ?? null;
	}
	removeItem(key: string) {
		this.values.delete(key);
	}
	setItem(key: string, value: string) {
		this.values.set(key, value);
	}
}

async function reachBranch(
	branch: CounselIntent,
	storage = new MemoryStorage(),
) {
	const bridge = createRiverholdRuntimeBridge(storage);
	await bridge.dispatch({ kind: "follow-mara" });
	await bridge.dispatch({ kind: "investigate-count" });
	await bridge.dispatch({ kind: "open-counsel" });
	const projection = await bridge.dispatch({
		kind: "offer-counsel",
		counsel: branch,
	});
	return { bridge, projection, storage };
}

describe("Riverhold projection bridge", () => {
	it("begins with eight active citizens and immutable local projections", () => {
		const projection = createRiverholdRuntimeBridge(
			new MemoryStorage(),
		).getProjection();
		expect(projection.phase).toBe("orientation");
		expect(projection.citizens).toHaveLength(8);
		expect(new Set(projection.citizens.map(({ name }) => name)).size).toBe(8);
		expect(Object.isFrozen(projection)).toBe(true);
		expect(Object.isFrozen(projection.citizens)).toBe(true);
		expect(projection.localSaveNotice).toContain("only in this browser");
	});

	it("keeps investigation facts, beliefs, and unknown claims distinct", async () => {
		const bridge = createRiverholdRuntimeBridge(new MemoryStorage());
		await bridge.dispatch({ kind: "follow-mara" });
		const projection = await bridge.dispatch({ kind: "investigate-count" });
		expect(projection.investigation).toEqual({
			ledgerCount: 48,
			openBinCount: 36,
			mismatch: 12,
			observed: true,
		});
		expect(projection.mara.beliefStatus).toBe("uncertain");
		expect(projection.mara.belief).not.toMatch(/theft is true|stole/i);
	});

	it("produces three materially different projected consequences without hashes", async () => {
		const outcomes = await Promise.all(
			(["verify-private", "accuse-now", "abstain"] as const).map(
				async (branch) => (await reachBranch(branch)).projection,
			),
		);
		expect(new Set(outcomes.map(({ consequence }) => consequence)).size).toBe(
			3,
		);
		expect(
			new Set(
				outcomes.map(
					({ mara }) => `${mara.beliefStatus}|${mara.relationshipBand}`,
				),
			).size,
		).toBe(3);
		expect(outcomes[0]?.interpretation?.decisiveTerms).toContain(
			"Trust in Toma",
		);
		expect(outcomes[2]?.interpretation?.disposition).toBe("not-applicable");
		expect(JSON.stringify(outcomes)).not.toContain("StateHash");
	});

	it("restores the checkpoint into a changed-world-first return", async () => {
		const { bridge, storage } = await reachBranch("accuse-now");
		await bridge.dispatch({ kind: "leave-checkpoint" });
		const resumed = createRiverholdRuntimeBridge(storage).getProjection();
		expect(resumed.phase).toBe("return-pending");
		expect(resumed.day).toBe(19);
		expect(resumed.whileAway).toHaveLength(0);
		const advanced = await createRiverholdRuntimeBridge(storage).dispatch({
			kind: "confirm-advance",
		});
		expect(advanced.whileAway).toHaveLength(3);
		expect(advanced.secondActions.map(({ id }) => id)).toContain(
			"repair-trust",
		);
	});

	it("supplies Chronicle claims with typed evidence rather than inferring causality in UI", async () => {
		const { bridge } = await reachBranch("accuse-now");
		await bridge.dispatch({ kind: "leave-checkpoint" });
		await bridge.dispatch({ kind: "confirm-advance" });
		const projection = await bridge.dispatch({
			kind: "take-second-action",
			actionId: "repair-trust",
		});
		expect(projection.chronicle).toHaveLength(3);
		expect(
			projection.chronicle
				.flatMap(({ evidence }) => evidence)
				.every(
					({ mechanism, relation }) =>
						mechanism.length > 0 && relation.length > 0,
				),
		).toBe(true);
		expect(projection.chronicle[1]?.body).toContain("allegation, not proof");
		expect(projection.storyCard?.unresolved).toContain("friendship");
	});

	it("rejects a second action that is not legal for the selected branch", async () => {
		const { bridge } = await reachBranch("verify-private");
		await bridge.dispatch({ kind: "leave-checkpoint" });
		await bridge.dispatch({ kind: "confirm-advance" });
		await expect(
			bridge.dispatch({
				kind: "take-second-action",
				actionId: "repair-trust",
			}),
		).rejects.toThrow("not available in this branch");
	});

	it("publishes an intentionally narrow replacement boundary", () => {
		expect(riverholdRuntimeContract.projectionSchema).toBe("riverhold-view-v1");
		expect(riverholdRuntimeContract.boundary).toContain(
			"Authoritative packages will replace",
		);
		expect(riverholdRuntimeContract.acceptedIntentKinds).toContain(
			"offer-counsel",
		);
	});
});
