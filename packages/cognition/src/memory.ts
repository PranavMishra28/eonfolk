import {
	canRead,
	type CitizenMindSnapshot,
	type DecisionContext,
	type DecisionReason,
	type EpistemicRecord,
	type Visibility,
	type VisibilityContext,
} from "../../protocol/src/index.js";

import { buildDecisionContext } from "./context.js";

export const MEMORY_SCHEMA_VERSION = "eonfolk-memory-v1" as const;
export const MEMORY_RETRIEVAL_VERSION = "eonfolk-memory-retrieval-v1" as const;

export type MemoryKind =
	| "episodic"
	| "semantic"
	| "social"
	| "goal"
	| "commitment"
	| "reflection";

export interface MemoryRecord {
	readonly schemaVersion: typeof MEMORY_SCHEMA_VERSION;
	readonly memoryId: string;
	readonly ownerCitizenId: string;
	readonly kind: MemoryKind;
	readonly proposition: string;
	readonly cueIds: readonly string[];
	readonly relatedCitizenIds: readonly string[];
	readonly goalId: string | null;
	readonly commitmentId: string | null;
	readonly salienceBasisPoints: number;
	readonly confidenceBasisPoints: number;
	readonly createdAtSimulationTime: number;
	readonly reinforcedAtSimulationTime: number;
	readonly createdRevision: number;
	readonly sourceIds: readonly string[];
	readonly visibility: Visibility;
	readonly provenanceVersion: "memory-provenance-v1";
}

export interface MemoryStore {
	readonly schemaVersion: typeof MEMORY_SCHEMA_VERSION;
	readonly ownerCitizenId: string;
	readonly records: Readonly<Record<string, MemoryRecord>>;
}

export interface MemoryRetrievalQuery {
	readonly actorCitizenId: string;
	readonly revision: number;
	readonly simulationTime: number;
	readonly cueIds: readonly string[];
	readonly relationshipCitizenIds: readonly string[];
	readonly activeGoalId: string | null;
	readonly activeCommitmentIds: readonly string[];
	readonly maximumRecords: number;
	readonly maximumBytes: number;
	readonly recencyHorizonSeconds: number;
}

export interface MemoryScore {
	readonly relevance: number;
	readonly recency: number;
	readonly salience: number;
	readonly relationship: number;
	readonly goal: number;
	readonly total: number;
}

export interface RetrievedMemory {
	readonly memory: MemoryRecord;
	readonly score: MemoryScore;
}

export interface MemoryRetrievalResult {
	readonly version: typeof MEMORY_RETRIEVAL_VERSION;
	readonly actorCitizenId: string;
	readonly selected: readonly RetrievedMemory[];
	readonly selectedBytes: number;
	readonly visibleCandidateCount: number;
}

function assertSafeBounded(
	value: number,
	maximum: number,
	label: string,
): void {
	if (!Number.isSafeInteger(value) || value < 0 || value > maximum)
		throw new RangeError(`${label} is outside its bounded integer range`);
}

function assertIdentifier(value: string, label: string): void {
	if (
		value.length === 0 ||
		value.length > 128 ||
		!/^[a-z0-9][a-z0-9._:-]*$/u.test(value)
	)
		throw new Error(`${label} is not a canonical identifier`);
}

function validateMemory(record: MemoryRecord, ownerCitizenId: string): void {
	if (record.schemaVersion !== MEMORY_SCHEMA_VERSION)
		throw new Error("unknown memory schema version");
	if (record.ownerCitizenId !== ownerCitizenId)
		throw new Error("memory owner differs from its store");
	assertIdentifier(record.memoryId, "memoryId");
	if (record.proposition.length === 0 || record.proposition.length > 2_048)
		throw new Error("memory needs an identifier and proposition");
	if (
		record.cueIds.length > 32 ||
		record.relatedCitizenIds.length > 32 ||
		record.sourceIds.length === 0 ||
		record.sourceIds.length > 32
	)
		throw new RangeError("memory metadata exceeds its bounded cardinality");
	assertSafeBounded(record.salienceBasisPoints, 10_000, "memory salience");
	assertSafeBounded(record.confidenceBasisPoints, 10_000, "memory confidence");
	assertSafeBounded(
		record.createdAtSimulationTime,
		Number.MAX_SAFE_INTEGER,
		"memory creation time",
	);
	assertSafeBounded(
		record.reinforcedAtSimulationTime,
		Number.MAX_SAFE_INTEGER,
		"memory reinforcement time",
	);
	assertSafeBounded(
		record.createdRevision,
		Number.MAX_SAFE_INTEGER,
		"memory revision",
	);
	if (record.reinforcedAtSimulationTime < record.createdAtSimulationTime)
		throw new Error("memory reinforcement predates creation");
	if (
		new Set(record.cueIds).size !== record.cueIds.length ||
		new Set(record.relatedCitizenIds).size !== record.relatedCitizenIds.length
	)
		throw new Error("memory cues and related citizens must be unique");
}

export function createMemoryStore(ownerCitizenId: string): MemoryStore {
	assertIdentifier(ownerCitizenId, "memory owner");
	return Object.freeze({
		schemaVersion: MEMORY_SCHEMA_VERSION,
		ownerCitizenId,
		records: Object.freeze({}),
	});
}

function freezeMemory(record: MemoryRecord): MemoryRecord {
	const visibility =
		record.visibility.kind === "participant-private"
			? {
					...record.visibility,
					principalIds: Object.freeze([...record.visibility.principalIds]),
				}
			: record.visibility.kind === "moderator-only"
				? {
						...record.visibility,
						roleIds: Object.freeze([...record.visibility.roleIds]),
					}
				: record.visibility.kind === "implementation-only"
					? {
							...record.visibility,
							testRunIds: Object.freeze([...record.visibility.testRunIds]),
						}
					: { ...record.visibility };
	return Object.freeze({
		...record,
		cueIds: Object.freeze([...record.cueIds]),
		relatedCitizenIds: Object.freeze([...record.relatedCitizenIds]),
		sourceIds: Object.freeze([...record.sourceIds]),
		visibility: Object.freeze(visibility),
	});
}

/** Immutable bounded append; memory proposals do not mutate authoritative Reality. */
export function remember(
	store: MemoryStore,
	record: MemoryRecord,
): MemoryStore {
	if (store.schemaVersion !== MEMORY_SCHEMA_VERSION)
		throw new Error("unknown memory store version");
	validateMemory(record, store.ownerCitizenId);
	if (store.records[record.memoryId] !== undefined)
		throw new Error(`memory ${record.memoryId} already exists`);
	if (Object.keys(store.records).length >= 1_024)
		throw new RangeError("memory store reached its bounded capacity");
	return Object.freeze({
		...store,
		records: Object.freeze({
			...store.records,
			[record.memoryId]: freezeMemory(record),
		}),
	});
}

function overlapCount(
	left: readonly string[],
	right: ReadonlySet<string>,
): number {
	return left.reduce((count, value) => count + (right.has(value) ? 1 : 0), 0);
}

function scoreMemory(
	memory: MemoryRecord,
	query: MemoryRetrievalQuery,
): MemoryScore {
	const cueSet = new Set(query.cueIds);
	const relationshipSet = new Set(query.relationshipCitizenIds);
	const commitmentSet = new Set(query.activeCommitmentIds);
	const relevance = Math.min(
		4_000,
		overlapCount(memory.cueIds, cueSet) * 1_000,
	);
	const age = Math.max(
		0,
		query.simulationTime - memory.reinforcedAtSimulationTime,
	);
	const recency =
		query.recencyHorizonSeconds === 0
			? 0
			: Math.max(
					0,
					2_500 -
						Math.trunc(
							(Math.min(age, query.recencyHorizonSeconds) * 2_500) /
								query.recencyHorizonSeconds,
						),
				);
	const salience = Math.trunc(memory.salienceBasisPoints / 4);
	const relationship =
		overlapCount(memory.relatedCitizenIds, relationshipSet) > 0 ? 1_500 : 0;
	const goal =
		(query.activeGoalId !== null && memory.goalId === query.activeGoalId
			? 1_200
			: 0) +
		(memory.commitmentId !== null && commitmentSet.has(memory.commitmentId)
			? 800
			: 0);
	return {
		relevance,
		recency,
		salience,
		relationship,
		goal,
		total: relevance + recency + salience + relationship + goal,
	};
}

function encodedBytes(value: unknown): number {
	return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/** Visibility is applied before scoring, so hidden records cannot perturb rank or ties. */
export function retrieveMemories(
	store: MemoryStore,
	query: MemoryRetrievalQuery,
	visibilityContext: VisibilityContext,
): MemoryRetrievalResult {
	if (
		store.schemaVersion !== MEMORY_SCHEMA_VERSION ||
		store.ownerCitizenId !== query.actorCitizenId
	)
		throw new Error("memory retrieval actor differs from store owner");
	assertSafeBounded(
		query.revision,
		Number.MAX_SAFE_INTEGER,
		"retrieval revision",
	);
	assertSafeBounded(
		query.simulationTime,
		Number.MAX_SAFE_INTEGER,
		"retrieval time",
	);
	assertSafeBounded(query.maximumRecords, 32, "retrieval record budget");
	assertSafeBounded(query.maximumBytes, 65_536, "retrieval byte budget");
	assertSafeBounded(
		query.recencyHorizonSeconds,
		Number.MAX_SAFE_INTEGER,
		"retrieval recency horizon",
	);
	if (query.maximumRecords < 1 || query.maximumBytes < 1)
		throw new RangeError("memory retrieval budgets must be positive");
	const viewer = { kind: "citizen" as const, citizenId: query.actorCitizenId };
	const candidates = Object.values(store.records)
		.filter(
			(memory) =>
				memory.reinforcedAtSimulationTime <= query.simulationTime &&
				canRead(
					viewer,
					"decision-context",
					{
						createdRevision: memory.createdRevision,
						visibility: memory.visibility,
					},
					query.revision,
					visibilityContext,
				) === "allow",
		)
		.map((memory) => ({ memory, score: scoreMemory(memory, query) }))
		.sort(
			(left, right) =>
				right.score.total - left.score.total ||
				right.memory.reinforcedAtSimulationTime -
					left.memory.reinforcedAtSimulationTime ||
				left.memory.memoryId.localeCompare(right.memory.memoryId),
		);
	const selected: RetrievedMemory[] = [];
	let selectedBytes = 0;
	for (const candidate of candidates) {
		if (selected.length >= query.maximumRecords) break;
		const bytes = encodedBytes(candidate);
		if (selectedBytes + bytes > query.maximumBytes) continue;
		selected.push(candidate);
		selectedBytes += bytes;
	}
	return {
		version: MEMORY_RETRIEVAL_VERSION,
		actorCitizenId: query.actorCitizenId,
		selected,
		selectedBytes,
		visibleCandidateCount: candidates.length,
	};
}

function epistemicKind(kind: MemoryKind): EpistemicRecord["kind"] {
	switch (kind) {
		case "episodic":
		case "reflection":
			return "memory";
		case "semantic":
		case "goal":
			return "belief";
		case "social":
			return "reputation";
		case "commitment":
			return "commitment";
	}
}

export function retrievedMemoryRecords(
	result: MemoryRetrievalResult,
): readonly EpistemicRecord[] {
	return result.selected.map(({ memory }) => ({
		recordId: memory.memoryId,
		kind: epistemicKind(memory.kind),
		subjectCitizenId: memory.ownerCitizenId,
		proposition: memory.proposition,
		confidence: memory.confidenceBasisPoints,
		sourceIds: memory.sourceIds,
		visibility: memory.visibility,
		createdRevision: memory.createdRevision,
	}));
}

/** Builds a DecisionContext whose memory-class records are exactly the bounded retrieval result. */
export async function buildMemoryAwareDecisionContext(input: {
	readonly contextId: string;
	readonly actorMind: CitizenMindSnapshot;
	readonly memoryStore: MemoryStore;
	readonly retrieval: Omit<
		MemoryRetrievalQuery,
		"actorCitizenId" | "revision" | "simulationTime"
	>;
	readonly runId: string;
	readonly regionId: string;
	readonly revision: number;
	readonly simulationTime: number;
	readonly decisionReason: DecisionReason;
	readonly actionCatalog: Parameters<
		typeof buildDecisionContext
	>[0]["actionCatalog"];
	readonly visibilityContext: VisibilityContext;
	readonly counselIntent: "verify-reserve" | "accuse-publicly" | null;
	readonly budgets?: Parameters<typeof buildDecisionContext>[0]["budgets"];
}): Promise<{
	readonly context: DecisionContext;
	readonly retrieval: MemoryRetrievalResult;
}> {
	const retrieval = retrieveMemories(
		input.memoryStore,
		{
			...input.retrieval,
			actorCitizenId: input.actorMind.citizenId,
			revision: input.revision,
			simulationTime: input.simulationTime,
		},
		input.visibilityContext,
	);
	const memoryIds = new Set(Object.keys(input.memoryStore.records));
	const actorMind = {
		...input.actorMind,
		records: [
			...input.actorMind.records.filter(
				(record) => record.kind !== "memory" && !memoryIds.has(record.recordId),
			),
			...retrievedMemoryRecords(retrieval),
		],
	};
	const context = await buildDecisionContext({
		contextId: input.contextId,
		actorMind,
		runId: input.runId,
		regionId: input.regionId,
		revision: input.revision,
		simulationTime: input.simulationTime,
		decisionReason: input.decisionReason,
		actionCatalog: input.actionCatalog,
		visibilityContext: input.visibilityContext,
		counselIntent: input.counselIntent,
		...(input.budgets === undefined ? {} : { budgets: input.budgets }),
	});
	return { context, retrieval };
}
