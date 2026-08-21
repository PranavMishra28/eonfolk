import { sha256Bytes, tuple, utf8 } from "./canonical.js";

export type PrngState = readonly [number, number, number, number];

const zeroReplacement: PrngState = [
	0x9e37_79b9, 0x243f_6a88, 0xb7e1_5162, 0xdead_beef,
];

function rotateLeft32(value: number, bits: number): number {
	return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

export function xoshiro128StarStar(state: PrngState): {
	readonly value: number;
	readonly state: PrngState;
} {
	let [s0, s1, s2, s3] = state.map((entry) => entry >>> 0) as unknown as [
		number,
		number,
		number,
		number,
	];
	const value = Math.imul(rotateLeft32(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;
	const t = (s1 << 9) >>> 0;
	s2 = (s2 ^ s0) >>> 0;
	s3 = (s3 ^ s1) >>> 0;
	s1 = (s1 ^ s2) >>> 0;
	s0 = (s0 ^ s3) >>> 0;
	s2 = (s2 ^ t) >>> 0;
	s3 = rotateLeft32(s3, 11);
	return { value, state: [s0, s1, s2, s3] };
}

export async function seedPrng(
	worldSeed32: Uint8Array,
	system: string,
	entityId: string,
	purpose: string,
): Promise<PrngState> {
	if (worldSeed32.byteLength !== 32)
		throw new RangeError("world seed must contain 32 bytes");
	const digest = await sha256Bytes(
		tuple("EONFOLK:PRNG-SEED:v2", [
			worldSeed32,
			utf8(system),
			utf8(entityId),
			utf8(purpose),
		]),
	);
	const view = new DataView(
		digest.buffer,
		digest.byteOffset,
		digest.byteLength,
	);
	const state: PrngState = [
		view.getUint32(0, true),
		view.getUint32(4, true),
		view.getUint32(8, true),
		view.getUint32(12, true),
	];
	return state.every((word) => word === 0) ? zeroReplacement : state;
}

export function drawBounded(
	state: PrngState,
	exclusiveUpperBound: number,
): {
	readonly value: number;
	readonly state: PrngState;
} {
	if (
		!Number.isSafeInteger(exclusiveUpperBound) ||
		exclusiveUpperBound <= 0 ||
		exclusiveUpperBound > 0x1_0000_0000
	) {
		throw new RangeError("invalid PRNG bound");
	}
	const draw = xoshiro128StarStar(state);
	return { value: draw.value % exclusiveUpperBound, state: draw.state };
}

export const ZERO_SEED_REPLACEMENT: PrngState = zeroReplacement;
