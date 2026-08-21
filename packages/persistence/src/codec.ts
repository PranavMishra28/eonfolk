import { PersistenceError } from "./errors.js";
import type { JsonValue } from "./types.js";

const textEncoder = new TextEncoder();

function fail(message: string): never {
	throw new PersistenceError("INVALID_INPUT", message);
}

function encode(value: JsonValue, seen: Set<object>): string {
	if (value === null) return "null";
	if (typeof value === "boolean" || typeof value === "string")
		return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isSafeInteger(value))
			fail("persisted numbers must be safe integers");
		return String(value);
	}
	if (typeof value !== "object") fail("persisted values must be JSON values");
	if (seen.has(value)) fail("persisted values must not contain cycles");
	seen.add(value);
	try {
		if (Array.isArray(value)) {
			const encodedItems: string[] = [];
			for (let index = 0; index < value.length; index += 1) {
				if (!(index in value)) fail("persisted arrays must not contain holes");
				encodedItems.push(encode(value[index] as JsonValue, seen));
			}
			return `[${encodedItems.join(",")}]`;
		}
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) {
			fail("persisted objects must have a plain prototype");
		}
		const objectValue = value as { readonly [key: string]: JsonValue };
		const entries = Object.keys(objectValue)
			.sort()
			.map(
				(key) =>
					`${JSON.stringify(key)}:${encode(objectValue[key] as JsonValue, seen)}`,
			);
		return `{${entries.join(",")}}`;
	} finally {
		seen.delete(value);
	}
}

export function canonicalJson(value: JsonValue): string {
	return encode(value, new Set<object>());
}

export function recordBytes(value: JsonValue): number {
	return textEncoder.encode(canonicalJson(value)).byteLength;
}

export function cloneValue<T>(value: T): T {
	return structuredClone(value);
}

export function recordsEqual(left: JsonValue, right: JsonValue): boolean {
	return canonicalJson(left) === canonicalJson(right);
}

export function compoundKey(...parts: readonly (number | string)[]): string {
	return JSON.stringify(parts);
}
