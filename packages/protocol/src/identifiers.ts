import {
	base32,
	bytesFromHex,
	jcsBytes,
	sha256Bytes,
	sha256Hex,
	tuple,
	u64be,
	utf8,
} from "./canonical.js";

const typePattern = /^[a-z][a-z0-9-]{0,31}$/u;

export async function stableId(
	type: string,
	worldSeed32: Uint8Array,
	creationSequence: number,
): Promise<string> {
	if (!typePattern.test(type)) throw new TypeError("stable ID type is invalid");
	if (worldSeed32.byteLength !== 32)
		throw new RangeError("world seed must contain 32 bytes");
	const digest = await sha256Bytes(
		tuple("EONFOLK:ID:v2", [utf8(type), worldSeed32, u64be(creationSequence)]),
	);
	return `${type}_${base32(digest)}`;
}

export async function payloadFingerprint(payload: unknown): Promise<string> {
	return sha256Hex(tuple("EONFOLK:COMMAND-PAYLOAD:v2", [jcsBytes(payload)]));
}

export async function stateHash(state: unknown): Promise<string> {
	return sha256Hex(tuple("EONFOLK:STATE:v2", [jcsBytes(state)]));
}

export async function batchId(
	runId: string,
	regionId: string,
	priorRevision: number,
	commandId: string,
): Promise<string> {
	const digest = await sha256Bytes(
		tuple("EONFOLK:BATCH-ID:v2", [
			utf8(runId),
			utf8(regionId),
			u64be(priorRevision),
			utf8(commandId),
		]),
	);
	return `batch_${base32(digest)}`;
}

export async function eventHash(envelopeWithoutHash: unknown): Promise<string> {
	return sha256Hex(tuple("EONFOLK:EVENT:v2", [jcsBytes(envelopeWithoutHash)]));
}

export async function manifestHash(
	manifestWithoutHash: unknown,
): Promise<string> {
	return sha256Hex(
		tuple("EONFOLK:EXPERIMENT-MANIFEST:v1", [jcsBytes(manifestWithoutHash)]),
	);
}

export async function contextHash(
	contextWithoutHash: unknown,
): Promise<string> {
	return sha256Hex(
		tuple("EONFOLK:DECISION-CONTEXT:v1", [jcsBytes(contextWithoutHash)]),
	);
}

export async function catalogHash(catalog: unknown): Promise<string> {
	return sha256Hex(tuple("EONFOLK:ACTION-CATALOG:v1", [jcsBytes(catalog)]));
}

export async function proposalHash(
	proposalWithoutHash: unknown,
): Promise<string> {
	return sha256Hex(
		tuple("EONFOLK:INTENT-PROPOSAL:v1", [jcsBytes(proposalWithoutHash)]),
	);
}

export async function decisionRecordHash(
	recordWithoutHash: unknown,
): Promise<string> {
	return sha256Hex(
		tuple("EONFOLK:DECISION-RECORD:v2", [jcsBytes(recordWithoutHash)]),
	);
}

export async function genesisHeadHash(
	runId: string,
	regionId: string,
	manifestDigest: string,
	initialStateDigest: string,
): Promise<string> {
	return sha256Hex(
		tuple("EONFOLK:GENESIS-HEAD:v2", [
			utf8(runId),
			utf8(regionId),
			bytesFromHex(manifestDigest, 32),
			bytesFromHex(initialStateDigest, 32),
		]),
	);
}

export async function batchHash(input: {
	readonly runId: string;
	readonly regionId: string;
	readonly batchId: string;
	readonly priorWorldHeadHash: string;
	readonly firstSequence: number;
	readonly eventHashes: readonly string[];
	readonly payloadFingerprint: string;
	readonly resultRevision: number;
	readonly finalStateHash: string;
}): Promise<string> {
	const fields = [
		utf8(input.runId),
		utf8(input.regionId),
		utf8(input.batchId),
		bytesFromHex(input.priorWorldHeadHash, 32),
		u64be(input.firstSequence),
		new Uint8Array([
			(input.eventHashes.length >>> 24) & 0xff,
			(input.eventHashes.length >>> 16) & 0xff,
			(input.eventHashes.length >>> 8) & 0xff,
			input.eventHashes.length & 0xff,
		]),
		...input.eventHashes.map((hash) => bytesFromHex(hash, 32)),
		bytesFromHex(input.payloadFingerprint, 32),
		u64be(input.resultRevision),
		bytesFromHex(input.finalStateHash, 32),
	];
	return sha256Hex(tuple("EONFOLK:BATCH-HASH:v2", fields));
}
