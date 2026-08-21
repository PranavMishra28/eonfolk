const textEncoder = new TextEncoder();

export type RestrictedJson =
	| null
	| boolean
	| number
	| string
	| readonly RestrictedJson[]
	| { readonly [key: string]: RestrictedJson };

export type TupleField = Uint8Array;

function assertScalarText(value: string, label: string): void {
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = value.charCodeAt(index + 1);
			if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) {
				throw new TypeError(`${label} contains an unpaired high surrogate`);
			}
			index += 1;
		} else if (code >= 0xdc00 && code <= 0xdfff) {
			throw new TypeError(`${label} contains an unpaired low surrogate`);
		}
	}
}

export function normalizeIngressText(
	value: string,
	limits: { readonly maxBytes: number; readonly maxCodePoints: number },
): string {
	assertScalarText(value, "text");
	const normalized = value.normalize("NFC");
	if (textEncoder.encode(normalized).byteLength > limits.maxBytes) {
		throw new RangeError("text exceeds its UTF-8 byte budget");
	}
	if ([...normalized].length > limits.maxCodePoints) {
		throw new RangeError("text exceeds its code-point budget");
	}
	return normalized;
}

function serialize(value: unknown, path: string, seen: Set<object>): string {
	if (value === null) return "null";
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "string") {
		assertScalarText(value, path);
		return JSON.stringify(value);
	}
	if (typeof value === "number") {
		if (!Number.isSafeInteger(value)) {
			throw new TypeError(`${path} must be a safe integer`);
		}
		return JSON.stringify(value);
	}
	if (typeof value !== "object") {
		throw new TypeError(`${path} is outside the restricted JCS domain`);
	}
	if (seen.has(value)) throw new TypeError(`${path} contains a cycle`);
	seen.add(value);
	try {
		if (Array.isArray(value)) {
			return `[${value.map((entry, index) => serialize(entry, `${path}[${index}]`, seen)).join(",")}]`;
		}
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) {
			throw new TypeError(`${path} must be a plain record`);
		}
		const record = value as Record<string, unknown>;
		const keys = Object.keys(record).sort();
		const members: string[] = [];
		for (const key of keys) {
			assertScalarText(key, `${path} key`);
			const entry = record[key];
			if (entry === undefined)
				throw new TypeError(`${path}.${key} is undefined`);
			members.push(
				`${JSON.stringify(key)}:${serialize(entry, `${path}.${key}`, seen)}`,
			);
		}
		return `{${members.join(",")}}`;
	} finally {
		seen.delete(value);
	}
}

/** RFC 8785 key ordering and JSON spelling, restricted to safe integers. */
export function jcs(value: unknown): string {
	return serialize(value, "$", new Set());
}

export function utf8(value: string): Uint8Array {
	assertScalarText(value, "tuple string");
	return textEncoder.encode(value.normalize("NFC"));
}

export function bytesFromHex(
	value: string,
	expectedBytes?: number,
): Uint8Array {
	if (!/^(?:[0-9a-f]{2})*$/u.test(value))
		throw new TypeError("hex must be lowercase and even length");
	const result = Uint8Array.from(
		value.match(/../gu)?.map((part) => Number.parseInt(part, 16)) ?? [],
	);
	if (expectedBytes !== undefined && result.byteLength !== expectedBytes) {
		throw new RangeError(`expected ${expectedBytes} bytes`);
	}
	return result;
}

export function hexFromBytes(value: Uint8Array): string {
	return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function u32be(value: number): Uint8Array {
	if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
		throw new RangeError("u32 is outside range");
	}
	const result = new Uint8Array(4);
	new DataView(result.buffer).setUint32(0, value, false);
	return result;
}

export function u64be(value: number | bigint): Uint8Array {
	const integer = typeof value === "number" ? BigInt(value) : value;
	if (
		(typeof value === "number" &&
			(!Number.isSafeInteger(value) || value < 0)) ||
		integer < 0n ||
		integer > 0xffff_ffff_ffff_ffffn
	) {
		throw new RangeError("u64 is outside range");
	}
	const result = new Uint8Array(8);
	new DataView(result.buffer).setBigUint64(0, integer, false);
	return result;
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array {
	const byteLength = parts.reduce((total, part) => total + part.byteLength, 0);
	const result = new Uint8Array(byteLength);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.byteLength;
	}
	return result;
}

export function tuple(tag: string, fields: readonly TupleField[]): Uint8Array {
	const prefix = utf8("EONFOLK-TUPLE-v2");
	const framed = [prefix, Uint8Array.of(0)];
	for (const field of [utf8(tag), ...fields]) {
		if (field.byteLength > 0xffff_ffff)
			throw new RangeError("tuple field is too large");
		framed.push(u32be(field.byteLength), field);
	}
	return concatenate(framed);
}

export function jcsBytes(value: unknown): Uint8Array {
	return utf8(jcs(value));
}

export async function sha256Bytes(value: Uint8Array): Promise<Uint8Array> {
	const cryptoApi = globalThis.crypto;
	if (cryptoApi?.subtle === undefined)
		throw new Error("WebCrypto SHA-256 is unavailable");
	const copy = Uint8Array.from(value);
	return new Uint8Array(await cryptoApi.subtle.digest("SHA-256", copy.buffer));
}

export async function sha256Hex(value: Uint8Array): Promise<string> {
	return hexFromBytes(await sha256Bytes(value));
}

const base32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";

export function base32(value: Uint8Array): string {
	let accumulator = 0;
	let bits = 0;
	let result = "";
	for (const byte of value) {
		accumulator = (accumulator << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			result += base32Alphabet[(accumulator >>> bits) & 31];
		}
	}
	if (bits > 0) result += base32Alphabet[(accumulator << (5 - bits)) & 31];
	return result;
}

export async function domainHash(
	domain: string,
	value: unknown,
): Promise<string> {
	return sha256Hex(tuple(domain, [jcsBytes(value)]));
}

export function checkedInt32(value: number, label = "integer"): number {
	if (!Number.isInteger(value) || value < -0x8000_0000 || value > 0x7fff_ffff) {
		throw new RangeError(`${label} exceeds signed 32-bit bounds`);
	}
	return value;
}

export function checkedQuantity(value: number, label = "quantity"): number {
	if (!Number.isInteger(value) || value < 0 || value > 0x7fff_ffff) {
		throw new RangeError(
			`${label} must be a non-negative signed 32-bit integer`,
		);
	}
	return value;
}

export function fixedPointMultiply(value: number, basisPoints: number): number {
	checkedInt32(value, "fixed-point value");
	checkedInt32(basisPoints, "basis points");
	const product = value * basisPoints;
	if (!Number.isSafeInteger(product))
		throw new RangeError("fixed-point multiplication is unsafe");
	return checkedInt32(Math.trunc(product / 10_000), "fixed-point result");
}
