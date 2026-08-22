import { jcs } from "@eonfolk/protocol";
import type { DiagnosticEvent } from "./types";

const encoder = new TextEncoder();

function eventBytes(event: DiagnosticEvent): number {
	return encoder.encode(jcs(event)).byteLength;
}

export class DiagnosticRingBuffer {
	readonly #maximumEvents: number;
	readonly #maximumBytes: number;
	#events: DiagnosticEvent[] = [];
	#byteLength = 0;
	#dropped = 0;

	constructor(input: {
		readonly maximumEvents: number;
		readonly maximumBytes: number;
	}) {
		if (!Number.isInteger(input.maximumEvents) || input.maximumEvents < 1)
			throw new RangeError("maximumEvents must be positive");
		if (!Number.isInteger(input.maximumBytes) || input.maximumBytes < 512)
			throw new RangeError("maximumBytes must be at least 512");
		this.#maximumEvents = input.maximumEvents;
		this.#maximumBytes = input.maximumBytes;
	}

	push(event: DiagnosticEvent): boolean {
		const bytes = eventBytes(event);
		if (bytes > this.#maximumBytes) {
			this.#dropped += 1;
			return false;
		}
		while (
			this.#events.length >= this.#maximumEvents ||
			this.#byteLength + bytes > this.#maximumBytes
		) {
			const removed = this.#events.shift();
			if (!removed) break;
			this.#byteLength -= eventBytes(removed);
			this.#dropped += 1;
		}
		this.#events.push(event);
		this.#byteLength += bytes;
		return true;
	}

	snapshot(): Readonly<{
		readonly events: readonly DiagnosticEvent[];
		readonly byteLength: number;
		readonly droppedEvents: number;
	}> {
		return Object.freeze({
			events: Object.freeze([...this.#events]),
			byteLength: this.#byteLength,
			droppedEvents: this.#dropped,
		});
	}
}
