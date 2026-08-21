import { recordBytes } from "./codec.js";
import { PersistenceError } from "./errors.js";
import type { JsonValue, PersistenceBounds } from "./types.js";

export const DEFAULT_PERSISTENCE_BOUNDS: PersistenceBounds = Object.freeze({
	maximumBatchesPerRange: 4_096,
	maximumCatchUpChapters: 50_000,
	maximumEventsPerBatch: 32,
	maximumEventsPerRange: 16_384,
	maximumRecordBytes: 262_144,
	maximumSnapshots: 64,
	maximumTotalBytes: 67_108_864,
});

export function resolveBounds(
	overrides?: Partial<PersistenceBounds>,
): PersistenceBounds {
	const bounds = { ...DEFAULT_PERSISTENCE_BOUNDS, ...overrides };
	for (const [name, value] of Object.entries(bounds)) {
		if (!Number.isSafeInteger(value) || value <= 0) {
			throw new PersistenceError(
				"INVALID_INPUT",
				`${name} must be a positive safe integer`,
			);
		}
	}
	if (bounds.maximumEventsPerBatch > 32) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"maximumEventsPerBatch cannot exceed 32",
		);
	}
	if (bounds.maximumCatchUpChapters > 50_000) {
		throw new PersistenceError(
			"INVALID_INPUT",
			"maximumCatchUpChapters cannot exceed 50000",
		);
	}
	return Object.freeze(bounds);
}

export function assertRecordBound(
	value: JsonValue,
	bounds: PersistenceBounds,
	label: string,
): number {
	const bytes = recordBytes(value);
	if (bytes > bounds.maximumRecordBytes) {
		throw new PersistenceError(
			"STORAGE_LIMIT",
			`${label} is ${bytes} bytes; limit is ${bounds.maximumRecordBytes}`,
		);
	}
	return bytes;
}

export function assertTotalBound(
	currentBytes: number,
	deltaBytes: number,
	bounds: PersistenceBounds,
): number {
	const next = currentBytes + deltaBytes;
	if (
		!Number.isSafeInteger(next) ||
		next < 0 ||
		next > bounds.maximumTotalBytes
	) {
		throw new PersistenceError(
			"STORAGE_LIMIT",
			`local world would use ${next} bytes; limit is ${bounds.maximumTotalBytes}`,
		);
	}
	return next;
}
