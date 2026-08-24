import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	createCognitiveDecisionRecord,
	releaseDecisionTrace,
	standardBrain,
} from "../../packages/cognition/src/index.js";
import {
	bytesFromHex,
	jcs,
	seedPrng,
	stateHash,
	type VisibilityContext,
} from "../../packages/protocol/src/index.js";
import { riverholdDecisionFixture } from "../fixtures/riverhold/index.js";

type ReleaseInput = Parameters<typeof releaseDecisionTrace>[0];

async function traceInput(
	hiddenSecret: string,
	mode: "complete" | "missing" | "revoked",
): Promise<ReleaseInput> {
	const fixture = await riverholdDecisionFixture({
		counselIntent: "verify-reserve",
		hiddenSecret,
	});
	const prng = await seedPrng(
		bytesFromHex(fixture.genesis.state.worldSeedHex, 32),
		"standard-brain",
		fixture.context.actorId,
		"timing-noninterference",
	);
	const { proposal } = await standardBrain(fixture.context, {
		proposalId: "proposal-timing",
		prngState: prng,
	});
	const record = await createCognitiveDecisionRecord({
		decisionId: "decision-timing",
		decisionBoundaryId: "boundary-timing",
		wholePreStateHash: await stateHash(fixture.genesis.state),
		context: fixture.context,
		proposal,
		failureCode: null,
		validator: { stage: "committed", outcome: "accepted", reason: "accepted" },
		proposedCommandId: "cmd-timing",
		receiptRef: "cmd-timing",
		acceptedEventInterval: {
			fromSequenceInclusive: 1,
			toSequenceExclusive: 1,
			eventIds: [],
		},
	});
	const revokedContext: VisibilityContext = {
		...fixture.visibilityContext,
		covenants: fixture.visibilityContext.covenants.map((covenant) => ({
			...covenant,
			revokeRevision: 0,
		})),
	};
	return {
		record,
		proposal,
		recordsById:
			mode === "missing"
				? {}
				: Object.fromEntries(
						fixture.mind.records.map((entry) => [entry.recordId, entry]),
					),
		relationshipsById:
			mode === "missing"
				? {}
				: Object.fromEntries(
						fixture.mind.relationships.map((entry) => [
							entry.relationshipId,
							entry,
						]),
					),
		eventsById: {},
		viewer: {
			kind: "participant",
			principalId: "principal_local_patron",
		},
		purpose: "patron-view",
		atRevision: 0,
		visibilityContext:
			mode === "revoked" ? revokedContext : fixture.visibilityContext,
	};
}

function percentile(
	values: readonly number[],
	percentileValue: number,
): number {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)]!;
}

describe("decision-trace timing noninterference", () => {
	it("uses one minimum-release surface across hidden, missing, and revoked inputs", async () => {
		const inputs = {
			"hidden-a": await traceInput("secret A", "complete"),
			"hidden-b": await traceInput("secret B", "complete"),
			missing: await traceInput("secret A", "missing"),
			revoked: await traceInput("secret A", "revoked"),
		} as const;
		const names = Object.keys(inputs) as Array<keyof typeof inputs>;
		const outputs = Object.fromEntries(
			await Promise.all(
				names.map(async (name) => [
					name,
					await releaseDecisionTrace(inputs[name]),
				]),
			),
		);
		expect(jcs(outputs["hidden-a"])).toBe(jcs(outputs["hidden-b"]));
		expect(outputs.revoked).toEqual({
			outcome: "denied",
			error: "ACTION_UNAVAILABLE",
		});
		expect(jcs(outputs.missing)).not.toContain("hidden-toma-secret");

		for (let warmup = 0; warmup < 20; warmup += 1)
			for (const name of names) await releaseDecisionTrace(inputs[name]);

		const samples = Object.fromEntries(
			names.map((name) => [name, [] as number[]]),
		) as Record<(typeof names)[number], number[]>;
		for (let cycle = 0; cycle < 200; cycle += 1) {
			for (const name of names) {
				const started = performance.now();
				await releaseDecisionTrace(inputs[name]);
				samples[name].push(performance.now() - started);
			}
		}
		const summary = Object.fromEntries(
			names.map((name) => [
				name,
				{
					medianMs: percentile(samples[name], 0.5),
					p95Ms: percentile(samples[name], 0.95),
					minimumMs: Math.min(...samples[name]),
				},
			]),
		) as unknown as Record<(typeof names)[number], Record<string, number>>;
		const medians = names.map((name) => summary[name].medianMs!);
		const p95s = names.map((name) => summary[name].p95Ms!);
		expect(
			Math.min(...names.map((name) => summary[name].minimumMs!)),
		).toBeGreaterThanOrEqual(50);
		expect(Math.max(...medians) - Math.min(...medians)).toBeLessThanOrEqual(5);
		expect(Math.max(...p95s) - Math.min(...p95s)).toBeLessThanOrEqual(5);
		const evidence = {
			schemaVersion: "eonfolk-decision-trace-timing-v1",
			warmupCycles: 20,
			measuredCycles: 200,
			minimumReleaseMs: 50,
			maximumMedianAndP95SpreadMs: 5,
			summary,
		};
		const outputDirectory = resolve("tmp");
		mkdirSync(outputDirectory, { recursive: true });
		writeFileSync(
			resolve(outputDirectory, "eonfolk-decision-trace-timing.json"),
			`${JSON.stringify(evidence, null, 2)}\n`,
		);
		process.stdout.write(`${JSON.stringify(evidence)}\n`);
	}, 60_000);
});
