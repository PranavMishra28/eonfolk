import {
	AUTHORITY_HEAD_SCHEMA_VERSION,
	AUTHORITY_SNAPSHOT_SCHEMA_VERSION,
	type AuthorityEventRecord,
	type AuthorityHead,
	type AuthoritySnapshotRecord,
	createAuthorityHead,
	createAuthoritySnapshot,
	EMPTY_EVENT_HASH,
	validateAuthorityEventRecord,
} from "@eonfolk/persistence";

const AUTHORITY_DATABASE = "eonfolk-generated-authority-v4";
const RELEASE_GENESIS_RUN_ID = "v1-generated-civilization";
const AUTHORITY_STORES = Object.freeze({
	streams: "authorityStreams",
	events: "authorityEvents",
	snapshots: "authoritySnapshots",
});

export type ResearchEvidenceStatus =
	| Readonly<{
			readonly status: "empty";
			readonly reason: "no-authority" | "no-chronicle-beat";
	  }>
	| Readonly<{
			readonly status: "unavailable";
			readonly reason: "unsupported" | "unverified-authority";
	  }>
	| Readonly<{
			readonly status: "available";
			readonly beat: ResearchEvidenceBeat;
	  }>;

export interface ResearchEvidenceBeat {
	readonly schemaVersion: "eonfolk-research-evidence-beat-v1";
	readonly title: string;
	readonly summary: string;
	readonly citizenId: string;
	readonly citizenName: string;
	readonly acceptedEventIds: readonly string[];
	readonly causalRelation: "contributing-condition" | "temporal-predecessor";
	readonly mechanismId: string;
	readonly provenance: Readonly<{
		readonly eventType: "CivilizationCounselBoundaryCommitted";
		readonly sequence: number;
		readonly simulationTime: number;
		readonly engineVersion: string;
		readonly stateSchemaVersion: string;
		readonly brainKind: "standard" | "model" | null;
		readonly cognitionDecisionId: string | null;
	}>;
	readonly allegation: Readonly<{
		readonly speakerCitizenId: string;
		readonly speakerName: string;
		readonly targetCitizenId: string;
		readonly targetName: string;
		readonly statementRecordId: string;
		readonly relationshipId: string;
		readonly trustDeltaBasisPoints: number;
		readonly strainDeltaBasisPoints: number;
		readonly factualStatus: "allegation-recorded-claim-unproven";
	}> | null;
}

interface ResearchAuthorityRows {
	readonly streams: readonly unknown[];
	readonly events: readonly unknown[];
	readonly snapshots: readonly unknown[];
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function record(value: unknown): UnknownRecord | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}

function identifier(value: unknown): value is string {
	return (
		typeof value === "string" &&
		value.length > 0 &&
		value.length <= 128 &&
		![...value].some((character) => {
			const point = character.codePointAt(0);
			return point !== undefined && (point <= 31 || point === 127);
		})
	);
}

function nonnegativeInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && (value as number) >= 0;
}

function sha256(value: unknown): value is string {
	return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function exactKeys(value: UnknownRecord, keys: readonly string[]): boolean {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return (
		actual.length === expected.length &&
		actual.every((key, index) => key === expected[index])
	);
}

function keyedValue(value: unknown, streamKey: string): unknown | null {
	const row = record(value);
	if (
		row === null ||
		!exactKeys(row, ["key", "streamKey", "value"]) ||
		!identifier(row.key) ||
		!identifier(row.streamKey)
	)
		throw new Error("authority row is malformed");
	return row.streamKey === streamKey ? row.value : null;
}

async function validHead(value: unknown): Promise<AuthorityHead | null> {
	const head = record(value);
	if (
		head === null ||
		!exactKeys(head, [
			"schemaVersion",
			"runId",
			"regionId",
			"engineVersion",
			"stateSchemaVersion",
			"revision",
			"lastSequence",
			"simulationTime",
			"stateHash",
			"lastEventHash",
			"fencingToken",
			"headHash",
		]) ||
		head.schemaVersion !== AUTHORITY_HEAD_SCHEMA_VERSION ||
		head.runId !== RELEASE_GENESIS_RUN_ID ||
		!identifier(head.regionId) ||
		!identifier(head.engineVersion) ||
		!identifier(head.stateSchemaVersion) ||
		!nonnegativeInteger(head.revision) ||
		!nonnegativeInteger(head.lastSequence) ||
		!nonnegativeInteger(head.simulationTime) ||
		!nonnegativeInteger(head.fencingToken) ||
		!sha256(head.stateHash) ||
		!sha256(head.lastEventHash) ||
		!sha256(head.headHash)
	)
		return null;
	const expected = await createAuthorityHead({
		runId: head.runId,
		regionId: head.regionId,
		engineVersion: head.engineVersion,
		stateSchemaVersion: head.stateSchemaVersion,
		revision: head.revision,
		lastSequence: head.lastSequence,
		simulationTime: head.simulationTime,
		stateHash: head.stateHash,
		lastEventHash: head.lastEventHash,
		fencingToken: head.fencingToken,
	});
	return expected.headHash === head.headHash
		? (head as unknown as AuthorityHead)
		: null;
}

async function validSnapshot(
	value: unknown,
	head: AuthorityHead,
): Promise<AuthoritySnapshotRecord | null> {
	const snapshot = record(value);
	if (
		snapshot === null ||
		!exactKeys(snapshot, [
			"schemaVersion",
			"runId",
			"regionId",
			"engineVersion",
			"stateSchemaVersion",
			"snapshotId",
			"revision",
			"baseSequence",
			"simulationTime",
			"stateHash",
			"lastEventHash",
			"state",
			"snapshotHash",
		]) ||
		snapshot.schemaVersion !== AUTHORITY_SNAPSHOT_SCHEMA_VERSION ||
		snapshot.runId !== head.runId ||
		snapshot.regionId !== head.regionId ||
		snapshot.engineVersion !== head.engineVersion ||
		snapshot.stateSchemaVersion !== head.stateSchemaVersion ||
		!identifier(snapshot.engineVersion) ||
		!identifier(snapshot.stateSchemaVersion) ||
		!identifier(snapshot.snapshotId) ||
		!nonnegativeInteger(snapshot.revision) ||
		snapshot.revision > head.revision ||
		!nonnegativeInteger(snapshot.baseSequence) ||
		snapshot.baseSequence > head.lastSequence ||
		!nonnegativeInteger(snapshot.simulationTime) ||
		snapshot.simulationTime > head.simulationTime ||
		!sha256(snapshot.stateHash) ||
		!sha256(snapshot.lastEventHash) ||
		!sha256(snapshot.snapshotHash)
	)
		return null;
	const expected = await createAuthoritySnapshot({
		runId: snapshot.runId,
		regionId: snapshot.regionId,
		engineVersion: snapshot.engineVersion as string,
		stateSchemaVersion: snapshot.stateSchemaVersion as string,
		snapshotId: snapshot.snapshotId,
		revision: snapshot.revision,
		baseSequence: snapshot.baseSequence,
		simulationTime: snapshot.simulationTime,
		lastEventHash: snapshot.lastEventHash,
		state: snapshot.state as never,
	});
	return expected.snapshotHash === snapshot.snapshotHash &&
		expected.stateHash === snapshot.stateHash
		? (snapshot as unknown as AuthoritySnapshotRecord)
		: null;
}

function sponsorPayload(event: AuthorityEventRecord): UnknownRecord | null {
	if (event.eventType !== "CivilizationSponsorCommandCommitted") return null;
	const payload = record(event.payload);
	const protocolEvent = record(payload?.protocolEvent);
	return record(protocolEvent?.eventPayload);
}

function citizenNames(
	snapshot: AuthoritySnapshotRecord,
): Readonly<Record<string, string>> {
	const state = record(snapshot.state);
	const civilization = record(state?.civilization);
	const citizens = record(civilization?.citizens);
	if (citizens === null) return Object.freeze({});
	const names: Record<string, string> = {};
	for (const [citizenId, value] of Object.entries(citizens)) {
		const citizen = record(value);
		if (identifier(citizenId) && typeof citizen?.name === "string")
			names[citizenId] = citizen.name.slice(0, 80);
	}
	return Object.freeze(names);
}

function boundaryFact(event: AuthorityEventRecord): UnknownRecord | null {
	if (event.eventType !== "CivilizationCounselBoundaryCommitted") return null;
	const payload = record(event.payload);
	if (payload?.transitionKind !== "counsel-boundary") return null;
	const fact = record(payload.fact);
	if (
		fact === null ||
		fact.schemaVersion !== "eonfolk-counsel-boundary-fact-v4" ||
		!identifier(fact.citizenId) ||
		!identifier(fact.interventionId) ||
		!identifier(fact.interpretationEventId) ||
		!(["verify-reserve", "accuse-publicly", "follow-plan"] as const).includes(
			fact.interpretationAction as never,
		) ||
		!(["accepted", "delayed", "rejected", "reinterpreted"] as const).includes(
			fact.interpretationDisposition as never,
		) ||
		!(
			fact.causalRelation === "contributing-condition" ||
			fact.causalRelation === "temporal-predecessor"
		) ||
		!nonnegativeInteger(fact.requiredNeedUnits) ||
		!nonnegativeInteger(fact.consumedNeedUnits) ||
		!nonnegativeInteger(fact.unmetNeedUnits) ||
		!nonnegativeInteger(fact.simulationTime) ||
		record(fact.effect) === null
	)
		return null;
	return fact;
}

function allegationFrom(
	fact: UnknownRecord,
	names: Readonly<Record<string, string>>,
): ResearchEvidenceBeat["allegation"] | undefined {
	const effect = record(fact.effect);
	if (effect === null) return undefined;
	if (effect.kind !== "public-allegation") return null;
	if (
		!identifier(effect.statementRecordId) ||
		!identifier(effect.targetCitizenId) ||
		!identifier(effect.relationshipId) ||
		!nonnegativeInteger(effect.strainDeltaBasisPoints) ||
		!Number.isSafeInteger(effect.trustDeltaBasisPoints) ||
		(effect.trustDeltaBasisPoints as number) > 0
	)
		return undefined;
	const speakerCitizenId = fact.citizenId as string;
	const targetCitizenId = effect.targetCitizenId;
	return Object.freeze({
		speakerCitizenId,
		speakerName: names[speakerCitizenId] ?? speakerCitizenId,
		targetCitizenId,
		targetName: names[targetCitizenId] ?? targetCitizenId,
		statementRecordId: effect.statementRecordId,
		relationshipId: effect.relationshipId,
		trustDeltaBasisPoints: effect.trustDeltaBasisPoints as number,
		strainDeltaBasisPoints: effect.strainDeltaBasisPoints,
		factualStatus: "allegation-recorded-claim-unproven",
	});
}

function summaryFor(
	fact: UnknownRecord,
	citizenName: string,
	allegation: ResearchEvidenceBeat["allegation"],
): string {
	const action = String(fact.interpretationAction).replaceAll("-", " ");
	const disposition = String(fact.interpretationDisposition);
	const consequence =
		allegation === null
			? "The accepted consequence contains no public allegation."
			: `${allegation.speakerName} made a public allegation about ${allegation.targetName}; the record establishes that the allegation was made and that the relationship changed, not that the allegation was true.`;
	return `${citizenName} ${disposition} the counsel and chose to ${action}. ${consequence} The accepted need ledger records ${String(fact.consumedNeedUnits)} of ${String(fact.requiredNeedUnits)} required units consumed and ${String(fact.unmetNeedUnits)} unmet.`;
}

/** Pure, fail-closed projection from already-read authority rows. */
export async function projectResearchEvidence(
	rows: ResearchAuthorityRows,
): Promise<ResearchEvidenceStatus> {
	try {
		const releaseStreams = rows.streams.filter((value) => {
			const stream = record(value);
			return record(stream?.head)?.runId === RELEASE_GENESIS_RUN_ID;
		});
		if (rows.streams.length === 0)
			return Object.freeze({ status: "empty", reason: "no-authority" });
		if (rows.streams.length !== 1 || releaseStreams.length !== 1)
			return Object.freeze({
				status: "unavailable",
				reason: "unverified-authority",
			});
		const stream = record(releaseStreams[0]);
		const head = await validHead(stream?.head);
		if (
			stream === null ||
			head === null ||
			!exactKeys(stream, ["key", "genesis", "head", "operationCount"]) ||
			!nonnegativeInteger(stream.operationCount) ||
			stream.key !== JSON.stringify([head.runId, head.regionId])
		)
			throw new Error("unverified authority stream");
		const streamKey = stream.key as string;
		const events: AuthorityEventRecord[] = [];
		for (const value of rows.events) {
			const candidate = keyedValue(value, streamKey);
			if (candidate === null) continue;
			await validateAuthorityEventRecord(candidate as AuthorityEventRecord);
			const event = candidate as AuthorityEventRecord;
			if (event.runId !== head.runId || event.regionId !== head.regionId)
				throw new Error("event scope mismatch");
			events.push(event);
		}
		events.sort((left, right) => left.sequence - right.sequence);
		if (events.length !== head.lastSequence)
			throw new Error("authority event range is incomplete");
		if (new Set(events.map(({ eventId }) => eventId)).size !== events.length)
			throw new Error("authority event IDs are ambiguous");
		let previousEventHash = EMPTY_EVENT_HASH;
		for (const [index, event] of events.entries()) {
			if (
				event.sequence !== index + 1 ||
				event.previousEventHash !== previousEventHash
			)
				throw new Error("authority event chain is discontinuous");
			previousEventHash = event.eventHash;
		}
		const finalEvent = events.at(-1);
		if (
			finalEvent !== undefined &&
			(finalEvent.eventHash !== head.lastEventHash ||
				finalEvent.postStateHash !== head.stateHash)
		)
			throw new Error("authority head is not bound to its event chain");

		const snapshots: AuthoritySnapshotRecord[] = [];
		for (const value of rows.snapshots) {
			const candidate = keyedValue(value, streamKey);
			if (candidate === null) continue;
			const snapshot = await validSnapshot(candidate, head);
			if (snapshot === null) throw new Error("snapshot integrity failed");
			snapshots.push(snapshot);
		}
		const latestSnapshot = snapshots.sort(
			(left, right) => right.baseSequence - left.baseSequence,
		)[0];
		if (latestSnapshot === undefined) throw new Error("snapshot missing");
		const names = citizenNames(latestSnapshot);

		const boundary = [...events]
			.reverse()
			.find((event) => boundaryFact(event) !== null);
		if (boundary === undefined)
			return Object.freeze({ status: "empty", reason: "no-chronicle-beat" });
		const fact = boundaryFact(boundary);
		if (fact === null) throw new Error("boundary fact missing");
		if (fact.simulationTime !== boundary.simulationTime)
			throw new Error("boundary time is not fact-bound");
		const boundaryVisibility = record(boundary.visibility);
		if (
			boundaryVisibility?.kind !== "patron-visible-through-covenant" ||
			boundaryVisibility.subjectCitizenId !== fact.citizenId
		)
			throw new Error("boundary is not visible through this patron covenant");
		const causalParent = boundary.causalParents[0];
		if (
			causalParent === undefined ||
			causalParent.eventId !== fact.interpretationEventId ||
			causalParent.relation !== fact.causalRelation
		)
			throw new Error("boundary relation is not fact-bound");
		const interpretation = events.find(
			(event) => event.eventId === causalParent.eventId,
		);
		const interpretationPayload =
			interpretation === undefined ? null : sponsorPayload(interpretation);
		if (
			interpretationPayload?.kind !== "CounselInterpreted" ||
			interpretationPayload.citizenId !== fact.citizenId ||
			interpretationPayload.interventionId !== fact.interventionId ||
			interpretationPayload.action !== fact.interpretationAction ||
			interpretationPayload.disposition !== fact.interpretationDisposition
		)
			throw new Error("interpretation event does not support the beat");
		const covenantExists = events.some((event) => {
			const payload = sponsorPayload(event);
			const protocol = record(record(event.payload)?.protocolEvent);
			return (
				payload?.kind === "SponsorshipEstablished" &&
				payload.citizenId === fact.citizenId &&
				payload.patronPrincipalId === "patron:local" &&
				record(protocol?.visibility)?.kind === "public" &&
				event.sequence < boundary.sequence
			);
		});
		if (!covenantExists) throw new Error("local patron cannot read this beat");
		const allegation = allegationFrom(fact, names);
		if (allegation === undefined)
			throw new Error("effect shape is unsupported");
		const citizenId = fact.citizenId as string;
		const citizenName = names[citizenId] ?? citizenId;
		return Object.freeze({
			status: "available",
			beat: Object.freeze({
				schemaVersion: "eonfolk-research-evidence-beat-v1",
				title: `${citizenName}'s later decision boundary`,
				summary: summaryFor(fact, citizenName, allegation),
				citizenId,
				citizenName,
				acceptedEventIds: Object.freeze([
					boundary.eventId,
					...boundary.causalParents.map(({ eventId }) => eventId),
				]),
				causalRelation:
					fact.causalRelation as ResearchEvidenceBeat["causalRelation"],
				mechanismId: boundary.provenance.mechanismId,
				provenance: Object.freeze({
					eventType: "CivilizationCounselBoundaryCommitted",
					sequence: boundary.sequence,
					simulationTime: boundary.simulationTime,
					engineVersion: boundary.engineVersion,
					stateSchemaVersion: boundary.stateSchemaVersion,
					brainKind: boundary.provenance.brainKind,
					cognitionDecisionId: boundary.provenance.cognitionDecisionId,
				}),
				allegation,
			}),
		});
	} catch {
		return Object.freeze({
			status: "unavailable",
			reason: "unverified-authority",
		});
	}
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener(
			"error",
			() => reject(request.error ?? new Error("authority read failed")),
			{ once: true },
		);
	});
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.addEventListener("complete", () => resolve(), { once: true });
		transaction.addEventListener(
			"abort",
			() => reject(transaction.error ?? new Error("authority read aborted")),
			{ once: true },
		);
		transaction.addEventListener(
			"error",
			() => reject(transaction.error ?? new Error("authority read failed")),
			{ once: true },
		);
	});
}

async function openExistingDatabase(factory: IDBFactory): Promise<IDBDatabase> {
	const request = factory.open(AUTHORITY_DATABASE);
	let upgraded = false;
	request.addEventListener(
		"upgradeneeded",
		() => {
			upgraded = true;
			request.transaction?.abort();
		},
		{ once: true },
	);
	try {
		const database = await requestValue(request);
		if (upgraded) {
			database.close();
			throw new Error("authority did not exist");
		}
		return database;
	} catch (error) {
		if (upgraded) throw new Error("authority did not exist");
		throw error;
	}
}

/** Opens only an already-existing database and performs one readonly transaction. */
export async function readCurrentReleaseGenesisEvidence(
	factory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<ResearchEvidenceStatus> {
	if (factory === undefined || typeof factory.databases !== "function")
		return Object.freeze({ status: "unavailable", reason: "unsupported" });
	try {
		const databases = await factory.databases();
		if (!databases.some(({ name }) => name === AUTHORITY_DATABASE))
			return Object.freeze({ status: "empty", reason: "no-authority" });
		const database = await openExistingDatabase(factory);
		try {
			for (const store of Object.values(AUTHORITY_STORES))
				if (!database.objectStoreNames.contains(store))
					throw new Error("authority store missing");
			const transaction = database.transaction(
				Object.values(AUTHORITY_STORES),
				"readonly",
			);
			const done = transactionDone(transaction);
			const [streams, events, snapshots] = await Promise.all([
				requestValue(
					transaction.objectStore(AUTHORITY_STORES.streams).getAll(),
				),
				requestValue(transaction.objectStore(AUTHORITY_STORES.events).getAll()),
				requestValue(
					transaction.objectStore(AUTHORITY_STORES.snapshots).getAll(),
				),
			]);
			await done;
			return await projectResearchEvidence({ streams, events, snapshots });
		} finally {
			database.close();
		}
	} catch {
		return Object.freeze({
			status: "unavailable",
			reason: "unverified-authority",
		});
	}
}
