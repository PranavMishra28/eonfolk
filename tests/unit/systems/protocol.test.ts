import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	batchHash,
	batchId,
	bytesFromHex,
	catalogHash,
	contextHash,
	decisionRecordHash,
	domainHash,
	eventHash,
	genesisHeadHash,
	hexFromBytes,
	jcs,
	jcsBytes,
	manifestHash,
	normalizeIngressText,
	payloadFingerprint,
	proposalHash,
	seedPrng,
	sha256Hex,
	stableId,
	stateHash,
	tuple,
	u32be,
	utf8,
	xoshiro128StarStar,
	ZERO_SEED_REPLACEMENT,
} from "../../../packages/protocol/src/index.js";
import { GOLDEN } from "../../fixtures/protocol/golden.js";

function referenceTuple(
	tag: string,
	fields: readonly Uint8Array[],
): Uint8Array {
	const framed = [Buffer.from("EONFOLK-TUPLE-v2\0", "ascii")];
	for (const field of [
		Buffer.from(tag, "utf8"),
		...fields.map((value) => Buffer.from(value)),
	]) {
		const size = Buffer.alloc(4);
		size.writeUInt32BE(field.byteLength);
		framed.push(size, field);
	}
	return Uint8Array.from(Buffer.concat(framed));
}

describe("determinism profile", () => {
	it("matches independent state and payload vectors byte-for-byte", async () => {
		const statePreimage = tuple("EONFOLK:STATE:v2", [
			jcsBytes(GOLDEN.state0.value),
		]);
		expect(hexFromBytes(statePreimage)).toBe(GOLDEN.state0.preimageHex);
		expect(await stateHash(GOLDEN.state0.value)).toBe(GOLDEN.state0.hash);
		const payloadPreimage = tuple("EONFOLK:COMMAND-PAYLOAD:v2", [
			jcsBytes(GOLDEN.payload.value),
		]);
		expect(hexFromBytes(payloadPreimage)).toBe(GOLDEN.payload.preimageHex);
		expect(await payloadFingerprint(GOLDEN.payload.value)).toBe(
			GOLDEN.payload.hash,
		);
		expect(
			await sha256Hex(
				referenceTuple("EONFOLK:STATE:v2", [jcsBytes(GOLDEN.state0.value)]),
			),
		).toBe(GOLDEN.state0.hash);
	});

	it("matches stable ID and batch vectors", async () => {
		const seed = bytesFromHex(GOLDEN.seedHex, 32);
		expect(await stableId("citizen", seed, 1)).toBe(GOLDEN.stableCitizenId);
		expect(
			await batchId("run_fixture_0001", "riverhold", 0, "cmd_fixture_0001"),
		).toBe(GOLDEN.batchId);
	});

	it("matches the normative event, genesis-head, and batch-hash vector", async () => {
		const withoutEventHash = {
			batchId: GOLDEN.batchId,
			causalParents: [],
			engineVersion: "1",
			eventId: "event_fixture_0001",
			eventPayload: {
				kind: "Observed",
				observerId: "citizen_mara",
				targetId: "granary",
			},
			postStateHash: GOLDEN.state1.hash,
			preStateHash: GOLDEN.state0.hash,
			provenance: { commandId: "cmd_fixture_0001", kind: "simulation" },
			regionId: "riverhold",
			relatedEvents: [],
			runId: "run_fixture_0001",
			schemaVersion: "1",
			sequence: 1,
			simulationTime: 1,
			visibility: {
				kind: "citizen-private",
				subjectCitizenId: "citizen_mara",
			},
		};
		expect(await eventHash(withoutEventHash)).toBe(GOLDEN.eventHash);
		expect(
			await genesisHeadHash(
				"run_fixture_0001",
				"riverhold",
				"0".repeat(64),
				GOLDEN.state0.hash,
			),
		).toBe(GOLDEN.genesisHead);
		expect(
			await batchHash({
				runId: "run_fixture_0001",
				regionId: "riverhold",
				batchId: GOLDEN.batchId,
				priorWorldHeadHash: GOLDEN.genesisHead,
				firstSequence: 1,
				eventHashes: [GOLDEN.eventHash],
				payloadFingerprint: GOLDEN.payload.hash,
				resultRevision: 1,
				finalStateHash: GOLDEN.state1.hash,
			}),
		).toBe(GOLDEN.batchHash);
	});

	it("matches an independent encoder for every cognitive and manifest hash domain", async () => {
		const fixture = { alpha: 1, nested: { zeta: false }, values: [3, 2, 1] };
		const cases = [
			["EONFOLK:EXPERIMENT-MANIFEST:v1", manifestHash],
			["EONFOLK:DECISION-CONTEXT:v1", contextHash],
			["EONFOLK:ACTION-CATALOG:v1", catalogHash],
			["EONFOLK:INTENT-PROPOSAL:v1", proposalHash],
			["EONFOLK:DECISION-RECORD:v1", decisionRecordHash],
		] as const;
		for (const [domain, implementation] of cases) {
			const independent = createHash("sha256")
				.update(referenceTuple(domain, [Buffer.from(jcs(fixture), "utf8")]))
				.digest("hex");
			expect(await implementation(fixture)).toBe(independent);
			expect(await domainHash(domain, fixture)).toBe(independent);
		}
	});

	it("matches xoshiro replacement and framed seed vectors", async () => {
		let state = ZERO_SEED_REPLACEMENT;
		const outputs: string[] = [];
		for (let index = 0; index < 6; index += 1) {
			const draw = xoshiro128StarStar(state);
			outputs.push(draw.value.toString(16).padStart(8, "0"));
			state = draw.state;
		}
		expect(outputs).toEqual(GOLDEN.zeroReplacementOutputs);
		expect(
			await seedPrng(
				bytesFromHex(GOLDEN.seedHex, 32),
				"study",
				"gate-b",
				"assignment",
			),
		).toEqual(GOLDEN.prngInitialState);
		const digest = createHash("sha256")
			.update(
				referenceTuple("EONFOLK:PRNG-SEED:v2", [
					bytesFromHex(GOLDEN.seedHex),
					utf8("study"),
					utf8("gate-b"),
					utf8("assignment"),
				]),
			)
			.digest("hex");
		expect(digest).toBe(GOLDEN.prngSeedDigest);
	});

	it("eliminates ambiguous tuple concatenations", () => {
		expect(hexFromBytes(tuple("tag", [utf8("ab"), utf8("c")]))).not.toBe(
			hexFromBytes(tuple("tag", [utf8("a"), utf8("bc")])),
		);
		expect(hexFromBytes(tuple("tag", [utf8(""), utf8("abc")]))).not.toBe(
			hexFromBytes(tuple("tag", [utf8("abc"), utf8("")])),
		);
		expect(tuple("tag", [u32be(1)])).toEqual(referenceTuple("tag", [u32be(1)]));
	});

	it("rejects values outside restricted JCS and normalizes ingress once", () => {
		expect(jcs({ z: 0, a: "é" })).toBe('{"a":"é","z":0}');
		expect(
			normalizeIngressText("e\u0301", { maxBytes: 8, maxCodePoints: 2 }),
		).toBe("é");
		expect(() => jcs({ value: 0.5 })).toThrow(/safe integer/u);
		expect(() => jcs({ value: undefined })).toThrow(/undefined/u);
		expect(() => jcs("\ud800")).toThrow(/unpaired/u);
		expect(() =>
			normalizeIngressText("too long", { maxBytes: 2, maxCodePoints: 2 }),
		).toThrow(/budget/u);
	});
});
