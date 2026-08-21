export type PersistenceErrorCode =
	| "BATCH_COLLISION"
	| "CATCH_UP_ID_COLLISION"
	| "DECISION_ID_COLLISION"
	| "EVENT_COLLISION"
	| "IDEMPOTENCY_COLLISION"
	| "INVALID_INPUT"
	| "LOCAL_WORLD_LIMIT"
	| "NOT_FOUND"
	| "RANGE_GAP"
	| "RUN_ID_COLLISION"
	| "SNAPSHOT_ID_COLLISION"
	| "STALE_FENCE"
	| "STALE_REVISION"
	| "STALE_STATE"
	| "STALE_WORLD_HEAD"
	| "STORAGE_LIMIT"
	| "UNSUPPORTED_VERSION";

export class PersistenceError extends Error {
	readonly code: PersistenceErrorCode;

	constructor(code: PersistenceErrorCode, message: string) {
		super(message);
		this.name = "PersistenceError";
		this.code = code;
	}
}
