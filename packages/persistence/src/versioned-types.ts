import type { JsonValue } from "./types.js";

export const VERSIONED_PERSISTENCE_PORT_VERSION =
	"eonfolk-persistence-port-v3" as const;
export const AUTHORITY_HEAD_SCHEMA_VERSION =
	"eonfolk-authority-head-v1" as const;
export const AUTHORITY_EVENT_SCHEMA_VERSION =
	"eonfolk-authority-event-v1" as const;
export const AUTHORITY_SNAPSHOT_SCHEMA_VERSION =
	"eonfolk-authority-snapshot-v1" as const;
export const AUTHORITY_APPEND_SCHEMA_VERSION =
	"eonfolk-authority-append-v2" as const;
export const AUTHORITY_REJECTION_SCHEMA_VERSION =
	"eonfolk-authority-rejection-v1" as const;
export const AUTHORITY_APPEND_RECEIPT_SCHEMA_VERSION =
	"eonfolk-authority-append-receipt-v2" as const;
export const AUTHORITY_GENESIS_SCHEMA_VERSION =
	"eonfolk-authority-genesis-v1" as const;
export const EMPTY_EVENT_HASH = "0".repeat(64);

/**
 * V1 deliberately has no automatic upcaster. Unknown bytes fail closed until a
 * separately reviewed migration can prove semantic and hash equivalence.
 */
export const PERSISTENCE_MIGRATION_POLICY = Object.freeze({
	mode: "exact-only",
	portVersion: VERSIONED_PERSISTENCE_PORT_VERSION,
	supportedRecordVersions: Object.freeze({
		append: AUTHORITY_APPEND_SCHEMA_VERSION,
		appendReceipt: AUTHORITY_APPEND_RECEIPT_SCHEMA_VERSION,
		rejection: AUTHORITY_REJECTION_SCHEMA_VERSION,
		event: AUTHORITY_EVENT_SCHEMA_VERSION,
		genesis: AUTHORITY_GENESIS_SCHEMA_VERSION,
		head: AUTHORITY_HEAD_SCHEMA_VERSION,
		snapshot: AUTHORITY_SNAPSHOT_SCHEMA_VERSION,
	}),
} as const);

export interface AuthorityScope {
	readonly runId: string;
	readonly regionId: string;
}

export interface AuthorityHead extends AuthorityScope {
	readonly schemaVersion: typeof AUTHORITY_HEAD_SCHEMA_VERSION;
	readonly engineVersion: string;
	readonly stateSchemaVersion: string;
	readonly revision: number;
	readonly lastSequence: number;
	readonly simulationTime: number;
	readonly stateHash: string;
	readonly lastEventHash: string;
	readonly fencingToken: number;
	readonly headHash: string;
}

export type AuthorityCausalRelation =
	| "direct-cause"
	| "trigger"
	| "contributing-condition"
	| "temporal-predecessor"
	| "allegation";

export interface AuthorityCausalParent {
	readonly eventId: string;
	readonly relation: AuthorityCausalRelation;
}

export interface AuthorityEventProvenance {
	readonly mechanismId: string;
	readonly cognitionDecisionId: string | null;
	readonly brainKind: "standard" | "model" | null;
}

export interface AuthorityEventRecord extends AuthorityScope {
	readonly schemaVersion: typeof AUTHORITY_EVENT_SCHEMA_VERSION;
	readonly engineVersion: string;
	readonly stateSchemaVersion: string;
	readonly appendId: string;
	readonly batchId: string;
	readonly eventId: string;
	readonly sequence: number;
	readonly simulationTime: number;
	readonly eventType: string;
	readonly causalParents: readonly AuthorityCausalParent[];
	readonly visibility: JsonValue;
	readonly provenance: AuthorityEventProvenance;
	readonly preStateHash: string;
	readonly postStateHash: string;
	readonly previousEventHash: string;
	readonly payload: JsonValue;
	readonly eventHash: string;
}

export interface AuthoritySnapshotRecord extends AuthorityScope {
	readonly schemaVersion: typeof AUTHORITY_SNAPSHOT_SCHEMA_VERSION;
	readonly engineVersion: string;
	readonly stateSchemaVersion: string;
	readonly snapshotId: string;
	readonly revision: number;
	readonly baseSequence: number;
	readonly simulationTime: number;
	readonly stateHash: string;
	readonly lastEventHash: string;
	readonly state: JsonValue;
	readonly snapshotHash: string;
}

export interface InitializeAuthorityRequest extends AuthorityScope {
	readonly schemaVersion: typeof AUTHORITY_GENESIS_SCHEMA_VERSION;
	readonly genesisId: string;
	readonly head: AuthorityHead;
	readonly snapshot: AuthoritySnapshotRecord;
}

export interface InitializeAuthorityResult {
	readonly head: AuthorityHead;
	readonly snapshot: AuthoritySnapshotRecord;
	readonly idempotent: boolean;
}

export interface AppendAuthorityBatchRequest extends AuthorityScope {
	readonly schemaVersion: typeof AUTHORITY_APPEND_SCHEMA_VERSION;
	readonly appendId: string;
	readonly batchId: string;
	readonly expectedRevision: number;
	readonly expectedLastSequence: number;
	readonly expectedStateHash: string;
	readonly expectedLastEventHash: string;
	readonly fencingToken: number;
	readonly events: readonly AuthorityEventRecord[];
	/** Canonical command receipt bytes committed with the batch, when applicable. */
	readonly commandReceipt?: JsonValue | null;
	/** Final cognition decision bytes committed with the batch, when applicable. */
	readonly decisionRecord?: JsonValue | null;
}

/** A fenced receipt-only rejection. Reality, sequence, revision, and head do not move. */
export interface RecordRejectedAuthorityCommandRequest extends AuthorityScope {
	readonly schemaVersion: typeof AUTHORITY_REJECTION_SCHEMA_VERSION;
	readonly appendId: string;
	readonly expectedRevision: number;
	readonly expectedLastSequence: number;
	readonly expectedStateHash: string;
	readonly expectedLastEventHash: string;
	readonly fencingToken: number;
	readonly commandReceipt: JsonValue;
	readonly decisionRecord?: JsonValue | null;
}

export interface AuthorityAppendReceipt extends AuthorityScope {
	readonly schemaVersion: typeof AUTHORITY_APPEND_RECEIPT_SCHEMA_VERSION;
	readonly appendId: string;
	readonly appendHash: string;
	readonly batchId: string;
	readonly revision: number;
	readonly fromSequenceInclusive: number;
	readonly toSequenceExclusive: number;
	readonly resultingStateHash: string;
	readonly resultingLastEventHash: string;
	readonly commandReceipt: JsonValue | null;
	readonly decisionRecord: JsonValue | null;
	readonly receiptHash: string;
}

export interface AppendAuthorityBatchResult {
	readonly head: AuthorityHead;
	readonly receipt: AuthorityAppendReceipt;
	readonly idempotent: boolean;
}

export interface AuthorityEventRangeRequest extends AuthorityScope {
	readonly fromSequenceInclusive: number;
	readonly toSequenceExclusive: number;
}

export interface SaveAuthoritySnapshotRequest {
	readonly snapshot: AuthoritySnapshotRecord;
	readonly fencingToken: number;
}

export type VersionedCrashPoint =
	| "authority-append:after-commit"
	| "authority-append:before-commit"
	| "authority-rejection:after-commit"
	| "authority-rejection:before-commit"
	| "authority-fence:after-commit"
	| "authority-fence:before-commit"
	| "authority-genesis:after-commit"
	| "authority-genesis:before-commit"
	| "authority-snapshot:after-commit"
	| "authority-snapshot:before-commit";

export interface VersionedCrashInjector {
	hit(point: VersionedCrashPoint): void;
}

export interface VersionedPersistencePort {
	readonly portVersion: typeof VERSIONED_PERSISTENCE_PORT_VERSION;
	initialize(
		request: InitializeAuthorityRequest,
	): Promise<InitializeAuthorityResult>;
	loadHead(scope: AuthorityScope): Promise<AuthorityHead>;
	acquireWriterFence(
		scope: AuthorityScope,
		expectedFencingToken: number,
	): Promise<AuthorityHead>;
	appendEventBatch(
		request: AppendAuthorityBatchRequest,
	): Promise<AppendAuthorityBatchResult>;
	recordRejectedCommand(
		request: RecordRejectedAuthorityCommandRequest,
	): Promise<AppendAuthorityBatchResult>;
	getAppendReceipt(
		scope: AuthorityScope,
		appendId: string,
	): Promise<AuthorityAppendReceipt | null>;
	getEventRange(
		request: AuthorityEventRangeRequest,
	): Promise<readonly AuthorityEventRecord[]>;
	saveSnapshot(
		request: SaveAuthoritySnapshotRequest,
	): Promise<AuthoritySnapshotRecord>;
	loadSnapshot(
		scope: AuthorityScope,
		snapshotId: string,
	): Promise<AuthoritySnapshotRecord>;
	loadLatestSnapshot(scope: AuthorityScope): Promise<AuthoritySnapshotRecord>;
}

export interface AuthorityReplayRequest extends AuthorityScope {
	readonly snapshotId: string;
	readonly toSequenceExclusive: number;
}

export interface AuthorityReplayResult<TState extends JsonValue> {
	readonly state: TState;
	readonly events: readonly AuthorityEventRecord[];
	readonly stateHash: string;
	readonly lastEventHash: string;
}
