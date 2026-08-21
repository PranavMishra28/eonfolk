export type JsonPrimitive = boolean | null | number | string;

export type JsonValue =
	| JsonPrimitive
	| { readonly [key: string]: JsonValue }
	| readonly JsonValue[];

export interface ExperimentManifest {
	readonly schemaVersion: string;
	readonly runId: string;
	readonly regionId: string;
	readonly runKind: "canonical-local-proof";
	readonly manifestHash: string;
	readonly parentRunId: null;
	readonly data: JsonValue;
}

export interface WorldHead {
	readonly runId: string;
	readonly regionId: string;
	readonly revision: number;
	readonly lastSequence: number;
	readonly stateHash: string;
	readonly worldHeadHash: string;
	readonly fencingToken: number;
}

export interface WorldBatchRecord {
	readonly schemaVersion: string;
	readonly runId: string;
	readonly regionId: string;
	readonly batchId: string;
	readonly commandId: string;
	readonly payloadFingerprint: string;
	readonly previousWorldHeadHash: string;
	readonly firstSequence: number;
	readonly eventCount: number;
	readonly resultRevision: number;
	readonly finalStateHash: string;
	readonly batchHash: string;
	readonly eventHashes: readonly string[];
	readonly data: JsonValue;
}

export interface WorldEventRecord {
	readonly schemaVersion: string;
	readonly runId: string;
	readonly regionId: string;
	readonly batchId: string;
	readonly commandId: string;
	readonly eventId: string;
	readonly sequence: number;
	readonly preStateHash: string;
	readonly postStateHash: string;
	readonly eventHash: string;
	readonly data: JsonValue;
}

export interface DecisionRecord {
	readonly schemaVersion: string;
	readonly runId: string;
	readonly regionId: string;
	readonly decisionId: string;
	readonly decisionRecordHash: string;
	readonly data: JsonValue;
}

export interface CommandReceipt {
	readonly schemaVersion: string;
	readonly runId: string;
	readonly regionId: string;
	readonly commandId: string;
	readonly payloadFingerprint: string;
	readonly outcome: "accepted" | "rejected";
	readonly observedRevision: number;
	readonly resultingRevision: number;
	readonly resultingStateHash: string;
	readonly resultingWorldHeadHash: string;
	readonly fencingToken: number;
	readonly batchId: string | null;
	readonly fromSequenceInclusive: number | null;
	readonly toSequenceExclusive: number | null;
	readonly rejectionCode: string | null;
	readonly data: JsonValue;
}

export interface CatchUpOperationRecord {
	readonly schemaVersion: "eonfolk-catch-up-receipt-v1";
	readonly runId: string;
	readonly regionId: string;
	readonly operationId: string;
	readonly confirmationId: string;
	readonly planHash: string;
	readonly totalChapters: number;
	readonly nextChapter: number;
	readonly status: "in-progress" | "complete" | "rejected";
	readonly initialRevision: number;
	readonly currentRevision: number;
	readonly initialStateHash: string;
	readonly currentStateHash: string;
	readonly initialWorldHeadHash: string;
	readonly currentWorldHeadHash: string;
	readonly finalRevision: number | null;
	readonly finalStateHash: string | null;
	readonly finalWorldHeadHash: string | null;
	readonly rejectionCode: string | null;
}

export interface SnapshotRecord {
	readonly schemaVersion: string;
	readonly runId: string;
	readonly regionId: string;
	readonly snapshotId: string;
	readonly baseSequence: number;
	readonly createdAtRevision: number;
	readonly stateHash: string;
	readonly baseWorldHeadHash: string;
	readonly data: JsonValue;
}

export interface CommitGenesisRequest {
	readonly manifest: ExperimentManifest;
	readonly head: WorldHead;
	readonly snapshot: SnapshotRecord;
}

export interface CommitGenesisResult {
	readonly manifest: ExperimentManifest;
	readonly head: WorldHead;
	readonly snapshot: SnapshotRecord;
	readonly idempotent: boolean;
}

export interface CommitTransitionRequest {
	readonly runId: string;
	readonly regionId: string;
	readonly expectedRevision: number;
	readonly expectedStateHash: string;
	readonly expectedWorldHeadHash: string;
	readonly fencingToken: number;
	readonly batch: WorldBatchRecord;
	readonly events: readonly WorldEventRecord[];
	readonly receipt: CommandReceipt;
	readonly decision: DecisionRecord | null;
	readonly postHead: WorldHead;
}

export interface CommitTransitionResult {
	readonly receipt: CommandReceipt;
	readonly head: WorldHead;
	readonly idempotent: boolean;
}

export interface CommitRejectedCommandRequest {
	readonly runId: string;
	readonly regionId: string;
	readonly fencingToken: number;
	readonly receipt: CommandReceipt;
	readonly decision: DecisionRecord | null;
}

export interface AppendRejectedDecisionRequest {
	readonly runId: string;
	readonly regionId: string;
	readonly fencingToken: number;
	readonly decision: DecisionRecord;
}

export interface BeginCatchUpRequest {
	readonly record: CatchUpOperationRecord;
	readonly fencingToken: number;
}

export interface CommitCatchUpChapterRequest {
	readonly operationId: string;
	readonly planHash: string;
	readonly chapterOrdinal: number;
	readonly transition: CommitTransitionRequest;
}

export interface SaveSnapshotRequest {
	readonly snapshot: SnapshotRecord;
	readonly fencingToken: number;
}

export interface BatchRangeRequest {
	readonly runId: string;
	readonly regionId: string;
	readonly fromRevisionInclusive: number;
	readonly toRevisionExclusive: number;
}

export interface EventRangeRequest {
	readonly runId: string;
	readonly regionId: string;
	readonly fromSequenceInclusive: number;
	readonly toSequenceExclusive: number;
}

export interface ReplayRangeRequest extends EventRangeRequest {
	readonly snapshotId: string;
}

export interface ReplayRange {
	readonly snapshot: SnapshotRecord;
	readonly batches: readonly WorldBatchRecord[];
	readonly events: readonly WorldEventRecord[];
}

export type CrashPoint =
	| "catch-up-begin:after-commit"
	| "catch-up-begin:before-commit"
	| "catch-up-chapter:after-commit"
	| "catch-up-chapter:before-commit"
	| "fence:after-commit"
	| "fence:before-commit"
	| "genesis:after-commit"
	| "genesis:before-commit"
	| "genesis:before-write"
	| "rejected-command:after-commit"
	| "rejected-command:before-commit"
	| "rejected-decision:after-commit"
	| "rejected-decision:before-commit"
	| "snapshot:after-commit"
	| "snapshot:before-commit"
	| "transition:after-commit"
	| "transition:before-commit"
	| "transition:before-write";

export interface CrashInjector {
	hit(point: CrashPoint): void;
}

export interface PersistenceBounds {
	readonly maximumBatchesPerRange: number;
	readonly maximumCatchUpChapters: number;
	readonly maximumEventsPerBatch: number;
	readonly maximumEventsPerRange: number;
	readonly maximumRecordBytes: number;
	readonly maximumSnapshots: number;
	readonly maximumTotalBytes: number;
}

export interface PersistencePort {
	commitGenesis(request: CommitGenesisRequest): Promise<CommitGenesisResult>;
	getExperimentManifest(runId: string): Promise<ExperimentManifest>;
	getHead(runId: string, regionId: string): Promise<WorldHead>;
	getCommandReceipt(
		runId: string,
		regionId: string,
		commandId: string,
	): Promise<CommandReceipt | null>;
	getDecisionRecord(
		runId: string,
		regionId: string,
		decisionId: string,
	): Promise<DecisionRecord | null>;
	getCatchUpOperationReceipt(
		runId: string,
		regionId: string,
		operationId: string,
	): Promise<CatchUpOperationRecord | null>;
	commitTransition(
		request: CommitTransitionRequest,
	): Promise<CommitTransitionResult>;
	commitRejectedCommand(
		request: CommitRejectedCommandRequest,
	): Promise<CommandReceipt>;
	appendRejectedDecision(
		request: AppendRejectedDecisionRequest,
	): Promise<DecisionRecord>;
	beginCatchUpOperation(
		request: BeginCatchUpRequest,
	): Promise<CatchUpOperationRecord>;
	commitCatchUpChapter(
		request: CommitCatchUpChapterRequest,
	): Promise<CatchUpOperationRecord>;
	acquireFencingToken(
		runId: string,
		regionId: string,
		expectedToken: number,
	): Promise<WorldHead>;
	loadSnapshot(
		runId: string,
		regionId: string,
		snapshotId: string,
	): Promise<SnapshotRecord>;
	saveSnapshot(request: SaveSnapshotRequest): Promise<SnapshotRecord>;
	getBatchRange(
		request: BatchRangeRequest,
	): Promise<readonly WorldBatchRecord[]>;
	getEventRange(
		request: EventRangeRequest,
	): Promise<readonly WorldEventRecord[]>;
	getReplayRange(request: ReplayRangeRequest): Promise<ReplayRange>;
}
