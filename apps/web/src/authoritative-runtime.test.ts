import {
	type CommitGenesisRequest,
	type CommitGenesisResult,
	type CommitTransitionRequest,
	type CommitTransitionResult,
	type CrashPoint,
	type EventRangeRequest,
	MemoryPersistence,
	PersistenceError,
	type WorldEventRecord,
} from "@eonfolk/persistence";
import type { WorldEventEnvelope } from "@eonfolk/protocol";
import { inspectSpatialProjection } from "@eonfolk/world-presentation";
import { describe, expect, it } from "vitest";
import { AuthoritativeRiverholdRuntime } from "./authoritative-runtime";

class NthTransitionCrash {
	#remaining = 0;

	arm(afterTransition: number): void {
		this.#remaining = afterTransition;
	}

	hit(point: CrashPoint): void {
		if (point !== "transition:after-commit" || this.#remaining === 0) return;
		this.#remaining -= 1;
		if (this.#remaining === 0)
			throw new Error("injected crash after durable transition");
	}
}

class BlockingTransitionPersistence extends MemoryPersistence {
	#blockNext = false;
	#entered: (() => void) | null = null;
	#release: (() => void) | null = null;
	#waitForRelease: Promise<void> | null = null;

	blockNextTransition(): { entered: Promise<void>; release: () => void } {
		this.#blockNext = true;
		const entered = new Promise<void>((resolve) => {
			this.#entered = resolve;
		});
		this.#waitForRelease = new Promise<void>((resolve) => {
			this.#release = resolve;
		});
		return {
			entered,
			release: () => this.#release?.(),
		};
	}

	override async commitTransition(
		request: CommitTransitionRequest,
	): Promise<CommitTransitionResult> {
		if (this.#blockNext) {
			this.#blockNext = false;
			this.#entered?.();
			await this.#waitForRelease;
			this.#waitForRelease = null;
		}
		return super.commitTransition(request);
	}
}

type DurableReadMutator =
	| "batch-outer-data"
	| "batch-data-schema"
	| "event-data-engine"
	| "event-data-schema"
	| "event-outer-data"
	| "manifest-data-version"
	| "manifest-version"
	| "snapshot-data-version"
	| "snapshot-version";

class TamperedReadPersistence extends MemoryPersistence {
	mutator: DurableReadMutator | null = null;

	override async commitGenesis(
		request: CommitGenesisRequest,
	): Promise<CommitGenesisResult> {
		const result = structuredClone(await super.commitGenesis(request));
		if (this.mutator === "manifest-version") {
			return {
				...result,
				manifest: {
					...result.manifest,
					schemaVersion: "eonfolk-experiment-manifest-v99",
				},
			};
		}
		if (this.mutator === "manifest-data-version") {
			return {
				...result,
				manifest: {
					...result.manifest,
					data: {
						...(result.manifest.data as object),
						engineVersion: "future",
					},
				},
			};
		}
		if (this.mutator === "snapshot-version") {
			return {
				...result,
				snapshot: { ...result.snapshot, schemaVersion: "future-snapshot" },
			};
		}
		if (this.mutator === "snapshot-data-version") {
			return {
				...result,
				snapshot: {
					...result.snapshot,
					data: {
						...(result.snapshot.data as object),
						schemaVersion: "future-snapshot",
					},
				},
			};
		}
		return result;
	}

	override async getBatchRange(
		request: Parameters<MemoryPersistence["getBatchRange"]>[0],
	) {
		const records = structuredClone(await super.getBatchRange(request));
		if (this.mutator === "batch-outer-data")
			return records.map((record, index) =>
				index === 0
					? { ...record, firstSequence: record.firstSequence + 1 }
					: record,
			);
		if (this.mutator !== "batch-data-schema") return records;
		return records.map((record, index) =>
			index === 0
				? {
						...record,
						data: { ...(record.data as object), schemaVersion: "future" },
					}
				: record,
		);
	}

	override async getEventRange(
		request: EventRangeRequest,
	): Promise<readonly WorldEventRecord[]> {
		const records = structuredClone(await super.getEventRange(request));
		return records.map((record, index) => {
			if (index !== 0) return record;
			if (this.mutator === "event-data-engine")
				return {
					...record,
					data: { ...(record.data as object), engineVersion: "future" },
				} as WorldEventRecord;
			if (this.mutator === "event-data-schema")
				return {
					...record,
					data: { ...(record.data as object), schemaVersion: "future" },
				} as WorldEventRecord;
			if (this.mutator === "event-outer-data")
				return { ...record, sequence: record.sequence + 1 };
			return record;
		});
	}
}

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
	it("persists each watched-world boundary before publishing it and reloads the exact durable head", async () => {
		const persistence = new BlockingTransitionPersistence();
		const runtime = new AuthoritativeRiverholdRuntime({ persistence });
		const initial = await runtime.initialize();
		expect(initial.spatial.source.revision).toBe(0);
		const gate = persistence.blockNextTransition();
		let published = false;
		const pending = runtime.advanceWatchedWorld(30).then((projection) => {
			published = true;
			return projection;
		});
		await gate.entered;
		expect(published).toBe(false);
		expect(
			(await persistence.getHead("run_riverhold_0001", "riverhold")).revision,
		).toBe(0);
		gate.release();
		const first = await pending;
		expect(first?.spatial.source.revision).toBe(1);
		expect(first?.spatial.presentationTick).toBe(30 * 30);
		expect(first?.worldProcesses.millRepaired).toBe(true);
		expect(inspectSpatialProjection(first!.spatial).mismatches).toEqual([]);

		for (let boundary = 2; boundary <= 8; boundary += 1)
			await runtime.advanceWatchedWorld(30);
		const durableHead = await persistence.getHead(
			"run_riverhold_0001",
			"riverhold",
		);
		const durableEvents = await persistence.getEventRange({
			runId: "run_riverhold_0001",
			regionId: "riverhold",
			fromSequenceInclusive: 1,
			toSequenceExclusive: durableHead.lastSequence + 1,
		});
		const eventKinds = durableEvents.map(
			(record) =>
				(record.data as unknown as WorldEventEnvelope).eventPayload.kind,
		);
		expect(eventKinds).toEqual(
			expect.arrayContaining([
				"ExchangeCompleted",
				"MillRepaired",
				"TravelArrived",
				"ResourceGathered",
			]),
		);
		expect(
			eventKinds.filter((kind) => kind === "ExchangeCompleted"),
		).toHaveLength(1);
		expect(eventKinds.filter((kind) => kind === "MillRepaired")).toHaveLength(
			1,
		);

		const recovered = new AuthoritativeRiverholdRuntime({ persistence });
		const reloaded = await recovered.initialize();
		expect(reloaded.spatial.source.revision).toBe(durableHead.revision);
		expect(reloaded.spatial.source.throughSequence).toBe(
			durableHead.lastSequence,
		);
		expect(reloaded.spatial.source.stateHash).toBe(durableHead.stateHash);
		expect(reloaded.spatial.presentationTick).toBe(240 * 30);
		expect(
			reloaded.citizens
				.filter(
					(citizen) =>
						citizen.canonicalAction.status === "in-progress" &&
						(citizen.canonicalAction.kind === "exchange" ||
							citizen.canonicalAction.kind === "repair" ||
							citizen.canonicalAction.kind === "gather"),
				)
				.map((citizen) => citizen.slug),
		).toEqual([]);
	});

	it("does not auto-advance an explicitly unconfirmed return boundary", async () => {
		const persistence = new MemoryPersistence();
		const runtime = new AuthoritativeRiverholdRuntime({ persistence });
		await runtime.initialize();
		await reachCounsel(runtime, "verify-private");
		await runtime.dispatch({ kind: "leave-checkpoint" });
		await runtime.dispatch({ kind: "return-to-checkpoint" });
		const before = runtime.diagnosticWorldHead();
		expect(await runtime.advanceWatchedWorld(30)).toBeNull();
		expect(runtime.diagnosticWorldHead()).toEqual(before);
	});

	it("safe-stops instead of publishing a stale candidate after an idempotent race", async () => {
		const persistence = new BlockingTransitionPersistence();
		const runtimeA = new AuthoritativeRiverholdRuntime({ persistence });
		await runtimeA.initialize();
		await runtimeA.dispatch({ kind: "follow-mara" });
		const gate = persistence.blockNextTransition();
		const blocked = runtimeA.dispatch({ kind: "investigate-count" });
		await gate.entered;

		const runtimeB = new AuthoritativeRiverholdRuntime({ persistence });
		await runtimeB.initialize();
		await runtimeB.dispatch({ kind: "follow-mara" });
		await runtimeB.dispatch({ kind: "investigate-count" });
		await runtimeB.dispatch({ kind: "open-counsel" });
		await runtimeB.dispatch({
			kind: "offer-counsel",
			counsel: "verify-private",
		});
		gate.release();

		await expect(blocked).rejects.toMatchObject({
			name: "PersistenceError",
			code: "STALE_WORLD_HEAD",
		});
		expect(() => runtimeA.diagnosticWorldHead()).toThrow(PersistenceError);
		await expect(
			runtimeA.dispatch({ kind: "open-counsel" }),
		).rejects.toMatchObject({ code: "STALE_WORLD_HEAD" });
		const durable = await persistence.getHead(
			"run_riverhold_0001",
			"riverhold",
		);
		expect(durable.revision).toBe(3);
	});

	it.each([
		"manifest-version",
		"manifest-data-version",
		"snapshot-version",
		"snapshot-data-version",
		"batch-data-schema",
		"batch-outer-data",
		"event-data-engine",
		"event-data-schema",
		"event-outer-data",
	] as const)(
		"fails closed on unsupported or incoherent durable %s",
		async (mutator) => {
			const persistence = new TamperedReadPersistence();
			const first = new AuthoritativeRiverholdRuntime({ persistence });
			await first.initialize();
			await first.dispatch({ kind: "follow-mara" });
			await first.dispatch({ kind: "investigate-count" });
			const before = await persistence.getHead(
				"run_riverhold_0001",
				"riverhold",
			);
			persistence.mutator = mutator;
			const reloaded = new AuthoritativeRiverholdRuntime({ persistence });
			await expect(reloaded.initialize()).rejects.toBeInstanceOf(
				PersistenceError,
			);
			persistence.mutator = null;
			const after = await persistence.getHead(
				"run_riverhold_0001",
				"riverhold",
			);
			expect(after.revision).toBe(before.revision);
			expect(after.stateHash).toBe(before.stateHash);
			expect(after.worldHeadHash).toBe(before.worldHeadHash);
			expect(after.fencingToken).toBe(before.fencingToken);
		},
	);

	it("commits cognition and world events before exposing a branch projection", async () => {
		const persistence = new MemoryPersistence();
		const runtime = new AuthoritativeRiverholdRuntime({ persistence });
		const initial = await runtime.initialize();
		expect(initial.citizens).toHaveLength(8);
		const citizen = (slug: string) => {
			const value = initial.citizens.find(
				(candidate) => candidate.slug === slug,
			);
			if (value === undefined)
				throw new Error(`missing projected citizen ${slug}`);
			return value;
		};
		expect(citizen("toma").canonicalAction).toMatchObject({
			kind: "exchange",
			status: "in-progress",
			affordanceId: "market-exchange",
			affordanceSlotIndex: 0,
			targetId: citizen("iven").id,
		});
		expect(citizen("iven").canonicalAction).toMatchObject({
			kind: "exchange",
			status: "in-progress",
			affordanceId: "market-exchange",
			affordanceSlotIndex: 1,
			targetId: citizen("toma").id,
		});
		for (const [slug, originPlaceId, destinationPlaceId] of [
			["sela", "market", "spring"],
			["rowan", "mill", "woods"],
			["neri", "granary", "fields"],
		] as const)
			expect(citizen(slug).canonicalAction).toMatchObject({
				kind: "carry",
				status: "in-progress",
				originPlaceId,
				destinationPlaceId,
				affordanceId: null,
			});
		expect(initial.worldNotices[0]).toMatch(
			/Iven Holt.*Toma Reed.*bilateral exchange/i,
		);
		expect(initial.investigation).toMatchObject({
			ledgerCount: 40,
			openBinCount: 28,
			mismatch: 12,
		});
		const consequence = await reachCounsel(runtime, "accuse-now");
		expect(consequence.branch).toBe("abstain");
		expect(consequence.interpretation).toMatchObject({
			counsel: "accuse-now",
			chosenAction: "abstain",
			disposition: "rejected",
		});
		expect(consequence.interpretation?.decisiveTerms).toContain(
			"Standing Plan",
		);
		expect(consequence.interpretation?.publicReason).toMatch(
			/^I will keep my plan: /,
		);
		expect(consequence.worldNotices).toContain(
			"One citizen independently endorsed an audit petition",
		);
		expect(consequence.consequence).toContain("independently endorsed");
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
		expect(chronicle.chronicle.map((beat) => beat.timeLabel)).toEqual([
			"00:00",
			"00:06",
			"00:12",
		]);
		expect(chronicle.chronicle[2]?.title).toContain("recorded trust");
		expect(
			chronicle.chronicle
				.flatMap((beat) => beat.evidence)
				.every((evidence) => evidence.eventId.startsWith("event_")),
		).toBe(true);
		const knownPlaces = new Set([
			"market",
			"granary",
			"fields",
			"spring",
			"woods",
			"mill",
		]);
		for (const beat of chronicle.chronicle) {
			expect(knownPlaces.has(beat.spatialFocus.placeId)).toBe(true);
			expect(beat.spatialFocus.sourceEventIds.length).toBeGreaterThan(0);
			expect(new Set(beat.spatialFocus.sourceEventIds)).toEqual(
				new Set(beat.evidence.map((evidence) => evidence.eventId)),
			);
			expect(beat.spatialFocus.participantIds.length).toBeGreaterThan(0);
		}
		expect(JSON.stringify(chronicle)).not.toContain("RV-");

		const recovered = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "chronicle",
		});
		const replayed = await recovered.initialize();
		expect(replayed.branch).toBe("verify-private");
		expect(replayed.chronicle).toHaveLength(3);
		expect(replayed.chronicle.map((beat) => beat.spatialFocus)).toEqual(
			chronicle.chronicle.map((beat) => beat.spatialFocus),
		);
		expect(replayed.day).toBe(19);
		expect(replayed.storyCard?.heading).toBe("YOU ADVISED: verify first");
	});

	it("keeps Chronicle focus at the event-time place after its participant travels and reloads", async () => {
		const persistence = new MemoryPersistence();
		const runtime = new AuthoritativeRiverholdRuntime({ persistence });
		await runtime.initialize();
		await reachCounsel(runtime, "verify-private");
		for (let boundary = 0; boundary < 4; boundary += 1)
			await runtime.advanceWatchedWorld(30);
		await runtime.dispatch({ kind: "leave-checkpoint" });
		await runtime.dispatch({ kind: "return-to-checkpoint" });
		await runtime.dispatch({ kind: "confirm-advance" });
		const chronicle = await runtime.dispatch({
			kind: "take-second-action",
			actionId: "publish-verified-count",
		});
		const mara = chronicle.citizens.find((citizen) => citizen.slug === "mara");
		expect(mara?.placeId).toBe("granary");
		const marketBeat = chronicle.chronicle.find(
			(beat) =>
				beat.spatialFocus.participantIds.includes(mara!.id) &&
				beat.spatialFocus.placeId === "market",
		);
		expect(marketBeat).toBeDefined();
		expect(marketBeat?.spatialFocus.sourceEventIds).toEqual(
			marketBeat?.evidence.map((evidence) => evidence.eventId),
		);

		const recovered = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "chronicle",
		});
		const replayed = await recovered.initialize();
		expect(
			replayed.citizens.find((citizen) => citizen.slug === "mara")?.placeId,
		).toBe("granary");
		expect(replayed.chronicle.map((beat) => beat.spatialFocus)).toEqual(
			chronicle.chronicle.map((beat) => beat.spatialFocus),
		);
	});

	it.each([
		["verify-private", "publish-verified-count", "YOU ADVISED: verify first"],
		["accuse-now", "ask-iven", "YOU ADVISED: speak now"],
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

	it("derives committed consequence and Chronicle phases instead of trusting stale UI state", async () => {
		const persistence = new MemoryPersistence();
		const first = new AuthoritativeRiverholdRuntime({ persistence });
		await first.initialize();
		await reachCounsel(first, "abstain");
		const afterCounselCrash = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "orientation",
		});
		const consequence = await afterCounselCrash.initialize();
		expect(consequence.phase).toBe("consequence");
		await expect(
			afterCounselCrash.dispatch({
				kind: "offer-counsel",
				counsel: "accuse-now",
			}),
		).rejects.toThrow("requires phase counsel");
		await afterCounselCrash.dispatch({ kind: "leave-checkpoint" });
		const returning = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "return-pending",
		});
		await returning.initialize();
		await returning.dispatch({ kind: "confirm-advance" });
		await returning.dispatch({
			kind: "take-second-action",
			actionId: "ask-iven",
		});
		const afterResponseCrash = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "return",
		});
		const chronicle = await afterResponseCrash.initialize();
		expect(chronicle.phase).toBe("chronicle");
		expect(chronicle.storyCard?.heading).toBe("YOU OFFERED NO ADVICE");
		await expect(
			afterResponseCrash.dispatch({
				kind: "take-second-action",
				actionId: "observe",
			}),
		).rejects.toThrow("requires phase return");
	});

	it("resumes a counsel issue committed before a crash without issuing it twice", async () => {
		const crash = new NthTransitionCrash();
		const persistence = new MemoryPersistence({ crashInjector: crash });
		const first = new AuthoritativeRiverholdRuntime({ persistence });
		await first.initialize();
		await first.dispatch({ kind: "follow-mara" });
		await first.dispatch({ kind: "investigate-count" });
		await first.dispatch({ kind: "open-counsel" });
		crash.arm(1);
		await expect(
			first.dispatch({ kind: "offer-counsel", counsel: "verify-private" }),
		).rejects.toThrow("injected crash");

		const recovered = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "orientation",
		});
		const pending = await recovered.initialize();
		expect(pending.phase).toBe("counsel");
		await expect(
			recovered.dispatch({ kind: "offer-counsel", counsel: "accuse-now" }),
		).rejects.toThrow("different counsel intent is already durably pending");
		const consequence = await recovered.dispatch({
			kind: "offer-counsel",
			counsel: "verify-private",
		});
		expect(consequence.interpretation).toMatchObject({
			counsel: "verify-private",
			chosenAction: "verify-private",
			disposition: "accepted",
		});
		const finalHead = await persistence.getHead(
			"run_riverhold_0001",
			"riverhold",
		);
		const events = await persistence.getEventRange({
			runId: "run_riverhold_0001",
			regionId: "riverhold",
			fromSequenceInclusive: 1,
			toSequenceExclusive: finalHead.lastSequence + 1,
		});
		expect(
			events.filter(
				(event) =>
					(event.data as { eventPayload?: { kind?: string } }).eventPayload
						?.kind === "CounselIssued",
			),
		).toHaveLength(1);
	});

	it("rehydrates the durable interpretation after a resolve commit crash", async () => {
		const crash = new NthTransitionCrash();
		const persistence = new MemoryPersistence({ crashInjector: crash });
		const first = new AuthoritativeRiverholdRuntime({ persistence });
		await first.initialize();
		await first.dispatch({ kind: "follow-mara" });
		await first.dispatch({ kind: "investigate-count" });
		await first.dispatch({ kind: "open-counsel" });
		crash.arm(2);
		await expect(
			first.dispatch({ kind: "offer-counsel", counsel: "verify-private" }),
		).rejects.toThrow("injected crash");

		const recovered = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "orientation",
		});
		const consequence = await recovered.initialize();
		expect(consequence.phase).toBe("consequence");
		expect(consequence.interpretation).toMatchObject({
			counsel: "verify-private",
			chosenAction: "verify-private",
			disposition: "accepted",
			publicReason: expect.stringContaining("matched my judgment"),
		});
		expect(consequence.interpretation?.decisiveTerms).toContain(
			"Advice aligned",
		);
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

	it("does not mistake watched-world cadence for player journey progress after reload", async () => {
		const persistence = new MemoryPersistence();
		const first = new AuthoritativeRiverholdRuntime({ persistence });
		await first.initialize();
		await first.advanceWatchedWorld(60);

		const reloaded = new AuthoritativeRiverholdRuntime({
			persistence,
			initialPhase: "orientation",
		});
		const projection = await reloaded.initialize();

		expect(projection.phase).toBe("orientation");
		expect(projection.day).toBe(18);
	});
});
