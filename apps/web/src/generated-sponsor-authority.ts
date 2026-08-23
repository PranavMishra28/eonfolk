import type {
	CivilizationExperimentRun,
	CivilizationRelationshipState,
} from "@eonfolk/civilization";
import {
	buildDecisionContext,
	standardBrain,
	validateIntentProposal,
} from "@eonfolk/cognition";
import {
	bytesFromHex,
	type CitizenMindSnapshot,
	type GeneratedChronicleSentence,
	type GeneratedShareArtifact,
	type GeneratedSponsorCounsel,
	type GeneratedSponsorEvent,
	seedPrng,
	stateHash,
	type ActionCatalogEntry,
	type IntentProposal,
} from "@eonfolk/protocol";
import type { GeneratedCivilizationSpatialProjection } from "@eonfolk/world-presentation";

const SPONSOR_SCHEMA_VERSION =
	"eonfolk-generated-sponsor-authority-v1" as const;
const SPONSOR_DATABASE_VERSION = 1;
const SPONSOR_STORE = "generatedSponsorAuthority";
const LOCAL_PRINCIPAL_ID = "local-player";

export interface GeneratedSponsorRelationship {
	readonly relationshipId: string;
	readonly otherCitizenId: string;
	readonly otherName: string;
	readonly kind: CivilizationRelationshipState["kind"];
	readonly direction: "from" | "to";
	readonly trustBasisPoints: number;
	readonly strainBasisPoints: number;
}

export interface GeneratedSponsorCandidate {
	readonly citizenId: string;
	readonly name: string;
	readonly settlementId: string;
	readonly settlementName: string;
	readonly role: string;
	readonly valueIds: readonly string[];
	readonly relationships: readonly GeneratedSponsorRelationship[];
	readonly activity: string;
	readonly currentTension: string;
	readonly sourceReferenceIds: readonly string[];
}

export interface GeneratedSponsorAuthority {
	readonly schemaVersion: typeof SPONSOR_SCHEMA_VERSION;
	readonly revision: 1 | 2;
	readonly worldId: string;
	readonly baseStateHash: string;
	readonly citizen: GeneratedSponsorCandidate;
	readonly patronPrincipalId: typeof LOCAL_PRINCIPAL_ID;
	readonly counsel: GeneratedSponsorCounsel | null;
	readonly decision: null | Readonly<{
		readonly decisionId: string;
		readonly proposalId: string;
		readonly actionId: string;
		readonly actionKind: IntentProposal["action"]["kind"];
		readonly disposition: "accepted" | "rejected" | "delayed" | "reinterpreted";
		readonly publicJustification: string;
		readonly cognitionKind: "standard-brain";
		readonly cognitionVersion: string;
	}>;
	readonly events: readonly GeneratedSponsorEvent[];
	readonly chronicle: readonly GeneratedChronicleSentence[];
	readonly shareArtifact: GeneratedShareArtifact | null;
	readonly unresolvedTension: string;
	readonly authorityHash: string;
}

export interface GeneratedSponsorSource {
	readonly worldId: string;
	readonly worldSeedHex: string;
	readonly stateHash: string;
	readonly simulationTime: number;
	readonly candidates: readonly GeneratedSponsorCandidate[];
	readonly institutionNameBySettlement: Readonly<Record<string, string>>;
}

function words(value: string | null): string {
	return (value ?? "resident").replace(/[-_:]+/gu, " ");
}

function relationFor(
	relationship: CivilizationRelationshipState,
	citizenId: string,
	nameByCitizen: Readonly<Record<string, string>>,
): GeneratedSponsorRelationship {
	const direction = relationship.fromCitizenId === citizenId ? "from" : "to";
	const otherCitizenId =
		direction === "from"
			? relationship.toCitizenId
			: relationship.fromCitizenId;
	return Object.freeze({
		relationshipId: relationship.relationshipId,
		otherCitizenId,
		otherName: nameByCitizen[otherCitizenId] ?? "Another resident",
		kind: relationship.kind,
		direction,
		trustBasisPoints: relationship.trustBasisPoints,
		strainBasisPoints: relationship.strainBasisPoints,
	});
}

/**
 * Produces the sponsor-facing identity from canonical civilization fields only.
 * The tension sentence names its scheduler and measurement sources so the UI
 * never turns presentation copy into a new world fact.
 */
export function projectGeneratedSponsorSource(input: {
	readonly run: CivilizationExperimentRun;
	readonly projections: readonly GeneratedCivilizationSpatialProjection[];
	readonly worldSeedHex: string;
}): GeneratedSponsorSource {
	const nameByCitizen = Object.fromEntries(
		Object.values(input.run.state.citizens).map((citizen) => [
			citizen.citizenId,
			citizen.name,
		]),
	);
	const projectionByCitizen = new Map(
		input.projections.flatMap((projection) =>
			projection.spatial.actors.map(
				(actor) => [actor.citizenId, { actor, projection }] as const,
			),
		),
	);
	const institutionNameBySettlement = Object.freeze(
		Object.fromEntries(
			Object.values(input.run.state.institutions).map((institution) => [
				institution.settlementId,
				institution.name,
			]),
		),
	);
	const candidates = Object.values(input.run.state.citizens)
		.filter(
			(citizen) =>
				projectionByCitizen.has(citizen.citizenId) &&
				institutionNameBySettlement[citizen.settlementId] !== undefined,
		)
		.map((citizen): GeneratedSponsorCandidate => {
			const visible = projectionByCitizen.get(citizen.citizenId);
			if (visible === undefined)
				throw new Error("sponsor candidate lacks a canonical projection");
			const relationships = Object.values(input.run.state.relationships)
				.filter(
					(relationship) =>
						relationship.fromCitizenId === citizen.citizenId ||
						relationship.toCitizenId === citizen.citizenId,
				)
				.map((relationship) =>
					relationFor(relationship, citizen.citizenId, nameByCitizen),
				)
				.sort((left, right) =>
					left.relationshipId.localeCompare(right.relationshipId),
				);
			const highestPressure = Object.entries(
				input.run.metrics.averagePressureBasisPointsByKind,
			).sort(
				(left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
			)[0];
			const activity = visible.actor.semanticLabel;
			const currentTension = highestPressure
				? `${activity} The settlement's highest measured pressure is ${highestPressure[0]} at ${highestPressure[1]} basis points.`
				: `${activity} No measured settlement pressure is available.`;
			return Object.freeze({
				citizenId: citizen.citizenId,
				name: citizen.name,
				settlementId: citizen.settlementId,
				settlementName: visible.projection.local.settlement.name,
				role: words(citizen.primaryRoleId),
				valueIds: Object.freeze([...citizen.valueIds]),
				relationships: Object.freeze(relationships),
				activity,
				currentTension,
				sourceReferenceIds: Object.freeze([
					visible.actor.action.actionId,
					...relationships.map(({ relationshipId }) => relationshipId),
				]),
			});
		})
		.sort((left, right) => left.citizenId.localeCompare(right.citizenId));
	return Object.freeze({
		worldId: input.run.world.identity.worldId,
		worldSeedHex: input.worldSeedHex,
		stateHash: input.run.finalStateHash,
		simulationTime: input.run.metrics.simulationTime,
		candidates: Object.freeze(candidates),
		institutionNameBySettlement,
	});
}

function storeKey(source: GeneratedSponsorSource): string {
	return `${source.worldId}:${source.stateHash}`;
}

async function openDatabase(
	factory: IDBFactory,
	databaseName: string,
): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = factory.open(databaseName, SPONSOR_DATABASE_VERSION);
		request.addEventListener(
			"upgradeneeded",
			() => {
				if (!request.result.objectStoreNames.contains(SPONSOR_STORE))
					request.result.createObjectStore(SPONSOR_STORE);
			},
			{ once: true },
		);
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener(
			"error",
			() => reject(new Error("Sponsor authority storage could not open")),
			{ once: true },
		);
	});
}

async function getStored(database: IDBDatabase, key: string): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(SPONSOR_STORE, "readonly");
		const request = transaction.objectStore(SPONSOR_STORE).get(key);
		request.addEventListener("success", () => resolve(request.result), {
			once: true,
		});
		request.addEventListener(
			"error",
			() => reject(new Error("Sponsor authority could not be read")),
			{ once: true },
		);
	});
}

async function putStored(
	database: IDBDatabase,
	key: string,
	value: GeneratedSponsorAuthority,
	expectedRevision: 0 | 1,
): Promise<GeneratedSponsorAuthority> {
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(SPONSOR_STORE, "readwrite");
		const store = transaction.objectStore(SPONSOR_STORE);
		const read = store.get(key);
		read.addEventListener(
			"success",
			() => {
				const current = read.result as GeneratedSponsorAuthority | undefined;
				if ((current?.revision ?? 0) !== expectedRevision) {
					transaction.abort();
					reject(new Error("Sponsor authority changed in another tab"));
					return;
				}
				store.put(value, key);
			},
			{ once: true },
		);
		transaction.addEventListener("complete", () => resolve(value), {
			once: true,
		});
		transaction.addEventListener(
			"error",
			() => reject(new Error("Sponsor authority could not be committed")),
			{ once: true },
		);
	});
}

async function event(input: Omit<GeneratedSponsorEvent, "postStateHash">) {
	return Object.freeze({
		...input,
		postStateHash: await stateHash(input),
	}) satisfies GeneratedSponsorEvent;
}

async function withAuthorityHash(
	input: Omit<GeneratedSponsorAuthority, "authorityHash">,
): Promise<GeneratedSponsorAuthority> {
	return Object.freeze({
		...input,
		authorityHash: await stateHash(input),
	});
}

function isAuthority(value: unknown): value is GeneratedSponsorAuthority {
	if (value === null || typeof value !== "object") return false;
	const record = value as Partial<GeneratedSponsorAuthority>;
	return (
		record.schemaVersion === SPONSOR_SCHEMA_VERSION &&
		(record.revision === 1 || record.revision === 2) &&
		typeof record.worldId === "string" &&
		typeof record.baseStateHash === "string" &&
		typeof record.authorityHash === "string" &&
		Array.isArray(record.events) &&
		Array.isArray(record.chronicle)
	);
}

async function validateStored(
	value: unknown,
	source: GeneratedSponsorSource,
): Promise<GeneratedSponsorAuthority | null> {
	if (value === undefined) return null;
	if (!isAuthority(value))
		throw new Error("Sponsor authority schema is invalid");
	const { authorityHash, ...withoutHash } = value;
	if ((await stateHash(withoutHash)) !== authorityHash)
		throw new Error("Sponsor authority hash is invalid");
	if (
		value.worldId !== source.worldId ||
		value.baseStateHash !== source.stateHash ||
		!source.candidates.some(
			(candidate) => candidate.citizenId === value.citizen.citizenId,
		)
	)
		throw new Error("Sponsor authority does not belong to this world state");
	if (
		(value.revision === 1 &&
			(value.counsel !== null ||
				value.decision !== null ||
				value.events.length !== 1)) ||
		(value.revision === 2 &&
			(value.counsel === null ||
				value.decision === null ||
				value.events.length < 4))
	)
		throw new Error("Sponsor authority phase is internally inconsistent");
	const priorEventIds = new Set<string>();
	let expectedPreStateHash = source.stateHash;
	for (const [index, item] of value.events.entries()) {
		if (item.sequence !== index + 1)
			throw new Error("Sponsor authority event sequence is invalid");
		if (
			item.preStateHash !== expectedPreStateHash ||
			item.citizenId !== value.citizen.citizenId ||
			item.settlementId !== value.citizen.settlementId ||
			item.causalParents.some((parent) => !priorEventIds.has(parent.eventId))
		)
			throw new Error("Sponsor authority event linkage is invalid");
		const { postStateHash, ...withoutStateHash } = item;
		if ((await stateHash(withoutStateHash)) !== postStateHash)
			throw new Error("Sponsor authority event hash is invalid");
		priorEventIds.add(item.eventId);
		expectedPreStateHash = item.postStateHash;
	}
	return value;
}

export async function loadGeneratedSponsorAuthority(input: {
	readonly source: GeneratedSponsorSource;
	readonly indexedDbFactory: IDBFactory;
	readonly databaseName: string;
}): Promise<GeneratedSponsorAuthority | null> {
	const database = await openDatabase(
		input.indexedDbFactory,
		input.databaseName,
	);
	try {
		return await validateStored(
			await getStored(database, storeKey(input.source)),
			input.source,
		);
	} finally {
		database.close();
	}
}

function candidateFor(
	source: GeneratedSponsorSource,
	citizenId: string,
): GeneratedSponsorCandidate {
	const candidate = source.candidates.find(
		(current) => current.citizenId === citizenId,
	);
	if (candidate === undefined)
		throw new Error("Only a visible canonical resident can be sponsored");
	return candidate;
}

export async function sponsorGeneratedCitizen(input: {
	readonly source: GeneratedSponsorSource;
	readonly citizenId: string;
	readonly indexedDbFactory: IDBFactory;
	readonly databaseName: string;
}): Promise<GeneratedSponsorAuthority> {
	const existing = await loadGeneratedSponsorAuthority(input);
	if (existing !== null) {
		if (existing.citizen.citizenId !== input.citizenId)
			throw new Error("This world state already has a sponsored citizen");
		return existing;
	}
	const authority = await createGeneratedSponsorAuthority(
		input.source,
		input.citizenId,
	);
	const database = await openDatabase(
		input.indexedDbFactory,
		input.databaseName,
	);
	try {
		return await putStored(database, storeKey(input.source), authority, 0);
	} finally {
		database.close();
	}
}

/** Pure constructor used before the first atomic browser commit. */
export async function createGeneratedSponsorAuthority(
	source: GeneratedSponsorSource,
	citizenId: string,
): Promise<GeneratedSponsorAuthority> {
	const citizen = candidateFor(source, citizenId);
	const sponsorship = await event({
		schemaVersion: "eonfolk-generated-sponsor-event-v1",
		eventId: `sponsor-event-${citizen.citizenId}-1`,
		sequence: 1,
		simulationTime: source.simulationTime,
		kind: "SponsorshipEstablished",
		citizenId: citizen.citizenId,
		counterpartyCitizenId: null,
		settlementId: citizen.settlementId,
		effect: {
			kind: "patron-covenant",
			patronPrincipalId: LOCAL_PRINCIPAL_ID,
			beneficiaryCitizenId: citizen.citizenId,
			state: "active",
		},
		publicFact: `${citizen.name} entered a local patron covenant with you.`,
		causalParents: [],
		mechanismId: "local-patron-covenant-v1",
		decisionId: null,
		preStateHash: source.stateHash,
	});
	return withAuthorityHash({
		schemaVersion: SPONSOR_SCHEMA_VERSION,
		revision: 1,
		worldId: source.worldId,
		baseStateHash: source.stateHash,
		citizen,
		patronPrincipalId: LOCAL_PRINCIPAL_ID,
		counsel: null,
		decision: null,
		events: Object.freeze([sponsorship]),
		chronicle: Object.freeze([]),
		shareArtifact: null,
		unresolvedTension: citizen.currentTension,
	});
}

function mindFor(authority: GeneratedSponsorAuthority): CitizenMindSnapshot {
	const relationships = authority.citizen.relationships.map((relationship) => ({
		relationshipId: relationship.relationshipId,
		fromCitizenId:
			relationship.direction === "from"
				? authority.citizen.citizenId
				: relationship.otherCitizenId,
		toCitizenId:
			relationship.direction === "from"
				? relationship.otherCitizenId
				: authority.citizen.citizenId,
		familiarity: 5_000,
		trust: relationship.trustBasisPoints,
		strain: relationship.strainBasisPoints,
		lastMaterialEventId: null,
		visibility: { kind: "public" as const },
		createdRevision: 0,
	}));
	return {
		citizenId: authority.citizen.citizenId,
		values: authority.citizen.valueIds.slice(0, 3).map((valueId, index) => ({
			valueId,
			rank: (index + 1) as 1 | 2 | 3,
			weight: 1_200 - index * 200,
		})),
		relationships,
		records: [
			{
				recordId: `${authority.citizen.citizenId}-activity-observation`,
				kind: "observation",
				subjectCitizenId: authority.citizen.citizenId,
				proposition: authority.citizen.activity,
				confidence: 10_000,
				sourceIds: authority.citizen.sourceReferenceIds,
				visibility: { kind: "public" },
				createdRevision: 0,
			},
			{
				recordId: `${authority.citizen.citizenId}-standing-commitment`,
				kind: "commitment",
				subjectCitizenId: authority.citizen.citizenId,
				proposition: "The current scheduler assignment remains active.",
				confidence: null,
				sourceIds: authority.citizen.sourceReferenceIds,
				visibility: { kind: "public" },
				createdRevision: 0,
			},
		],
		standingPlan: {
			planId: `standing-plan-${authority.citizen.citizenId}`,
			version: 1,
			citizenId: authority.citizen.citizenId,
			goalType: "complete-current-scheduler-assignment",
			targetIds: authority.citizen.sourceReferenceIds,
			steps: [
				{
					stepId: "current-assignment",
					kind: "continue-current-assignment",
					targetIds: authority.citizen.sourceReferenceIds,
					status: "active",
					children: [],
				},
			],
			currentStepId: "current-assignment",
			commitmentId: `${authority.citizen.citizenId}-standing-commitment`,
			sourceId: authority.citizen.sourceReferenceIds[0] ?? "current-activity",
			startBoundary: 0,
			expiryBoundary: 2,
			retriesRemaining: 1,
			replansRemaining: 1,
			status: "active",
		},
	};
}

function catalogFor(
	authority: GeneratedSponsorAuthority,
): readonly ActionCatalogEntry[] {
	const relationship = authority.citizen.relationships[0];
	if (relationship === undefined)
		throw new Error("A sponsor decision requires one canonical relationship");
	const evidenceRecordIds = [
		`${authority.citizen.citizenId}-activity-observation`,
	];
	return Object.freeze([
		{
			actionId: "generated-verify-reserve",
			action: {
				kind: "VerifyReserve",
				targetCitizenId: relationship.otherCitizenId,
			},
			publicPreconditions: [
				"a current scheduler assignment is visible",
				"a witnessed reserve check is available",
			],
			publicStakes: [
				"delays any public claim",
				"can improve shared evidence",
				"may alter institutional allocation",
			],
			tags: ["caution", "evidence", "relationship", "counsel"],
			evidenceRecordIds,
			relationshipId: relationship.relationshipId,
			risk: 200,
			counselAffinity: "verify-reserve",
		},
		{
			actionId: "generated-raise-allegation",
			action: {
				kind: "AccusePublicly",
				targetCitizenId: relationship.otherCitizenId,
			},
			publicPreconditions: [
				"the sponsor requested a public allegation",
				"the allegation is not presented as established fact",
			],
			publicStakes: [
				"can trigger an allocation review",
				"risks relationship strain",
				"remains an in-world allegation",
			],
			tags: ["candor", "evidence", "risk", "counsel"],
			evidenceRecordIds,
			relationshipId: relationship.relationshipId,
			risk: 500,
			counselAffinity: "accuse-publicly",
		},
		{
			actionId: "generated-follow-standing-plan",
			action: {
				kind: "FollowStandingPlan",
				planId: `standing-plan-${authority.citizen.citizenId}`,
			},
			publicPreconditions: ["the current assignment remains possible"],
			publicStakes: [
				"keeps the current commitment",
				"defers a new reserve intervention",
			],
			tags: ["commitment", "relationship"],
			evidenceRecordIds: [],
			relationshipId: relationship.relationshipId,
			risk: 100,
			counselAffinity: "neutral",
		},
	]);
}

function disposition(
	proposal: IntentProposal,
): NonNullable<GeneratedSponsorAuthority["decision"]>["disposition"] {
	const value = proposal.explanation.counselDisposition;
	return value === "not-applicable" ? "delayed" : value;
}

function actionFact(proposal: IntentProposal, citizenName: string): string {
	switch (proposal.action.kind) {
		case "VerifyReserve":
			return `${citizenName} independently chose a witnessed reserve check.`;
		case "AccusePublicly":
			return `${citizenName} independently chose to raise a public allegation.`;
		case "FollowStandingPlan":
			return `${citizenName} independently kept the current Standing Plan.`;
		default:
			throw new Error(
				"The validated sponsor catalog returned an unknown action",
			);
	}
}

function sponsorActionKind(
	proposal: IntentProposal,
): "VerifyReserve" | "AccusePublicly" | "FollowStandingPlan" {
	if (
		proposal.action.kind !== "VerifyReserve" &&
		proposal.action.kind !== "AccusePublicly" &&
		proposal.action.kind !== "FollowStandingPlan"
	)
		throw new Error("The validated sponsor catalog returned an unknown action");
	return proposal.action.kind;
}

function chronicleFromEvents(
	events: readonly GeneratedSponsorEvent[],
): readonly GeneratedChronicleSentence[] {
	return Object.freeze(
		events.slice(1).map((item) => {
			const relation =
				item.kind === "AllegationRaised"
					? "in-world-allegation"
					: item.kind === "CounselInterpreted"
						? "contributing-condition"
						: item.kind === "InstitutionCommitmentRecorded"
							? (item.causalParents[0]?.relation ?? "direct-cause")
							: "temporal-predecessor";
			return Object.freeze({
				sentenceId: `chronicle-${item.eventId}`,
				text: item.publicFact,
				relation,
				evidenceEventIds: Object.freeze([
					item.eventId,
					...item.causalParents.map(({ eventId }) => eventId),
				]),
				focus: Object.freeze({
					settlementId: item.settlementId,
					citizenId: item.citizenId,
				}),
			}) satisfies GeneratedChronicleSentence;
		}),
	);
}

/** One deterministic, validated decision boundary; no model path exists here. */
export async function resolveGeneratedCounsel(input: {
	readonly source: GeneratedSponsorSource;
	readonly authority: GeneratedSponsorAuthority;
	readonly counsel: GeneratedSponsorCounsel;
}): Promise<GeneratedSponsorAuthority> {
	if (input.authority.revision !== 1 || input.authority.decision !== null)
		throw new Error(
			"Sponsor counsel has already crossed its decision boundary",
		);
	if (
		input.authority.worldId !== input.source.worldId ||
		input.authority.baseStateHash !== input.source.stateHash
	)
		throw new Error("Sponsor counsel is bound to a different world state");
	const counselIntent =
		input.counsel === "verify-reserve" ? "verify-reserve" : "accuse-publicly";
	const mind = mindFor(input.authority);
	const context = await buildDecisionContext({
		contextId: `generated-context-${input.authority.citizen.citizenId}-1`,
		actorMind: mind,
		runId: input.source.worldId,
		regionId: input.authority.citizen.settlementId,
		revision: 1,
		simulationTime: input.source.simulationTime,
		decisionReason: "sponsor-counsel",
		actionCatalog: catalogFor(input.authority),
		visibilityContext: {
			policyVersion: "riverhold-visibility-v1",
			covenants: [
				{
					patronPrincipalId: LOCAL_PRINCIPAL_ID,
					beneficiaryCitizenId: input.authority.citizen.citizenId,
					grantRevision: 1,
					revokeRevision: null,
				},
			],
			localOwnerPrincipalId: LOCAL_PRINCIPAL_ID,
			nonproduction: true,
		},
		counselIntent,
	});
	const prngState = await seedPrng(
		bytesFromHex(input.source.worldSeedHex, 32),
		"generated-standard-brain",
		input.authority.citizen.citizenId,
		`decision-${input.source.stateHash}`,
	);
	const decisionId = `generated-decision-${input.authority.citizen.citizenId}-1`;
	const proposalId = `generated-proposal-${input.authority.citizen.citizenId}-1`;
	const { proposal } = await standardBrain(context, { proposalId, prngState });
	if ((await validateIntentProposal(context, proposal)) !== "accepted")
		throw new Error("Standard Brain proposal failed post-cognition validation");
	const relationship = input.authority.citizen.relationships[0];
	if (relationship === undefined)
		throw new Error("A resolved sponsor decision lost its relationship source");
	const prior = input.authority.events.at(-1);
	if (prior === undefined) throw new Error("Sponsor covenant event is missing");
	const offered = await event({
		schemaVersion: "eonfolk-generated-sponsor-event-v1",
		eventId: `sponsor-event-${input.authority.citizen.citizenId}-2`,
		sequence: 2,
		simulationTime: input.source.simulationTime,
		kind: "CounselOffered",
		citizenId: input.authority.citizen.citizenId,
		counterpartyCitizenId: relationship.otherCitizenId,
		settlementId: input.authority.citizen.settlementId,
		effect: { kind: "counsel", counsel: input.counsel },
		publicFact:
			input.counsel === "verify-reserve"
				? `You counselled ${input.authority.citizen.name} to verify the shared reserve before changing its allocation.`
				: `You counselled ${input.authority.citizen.name} to raise a public allegation about the shared reserve.`,
		causalParents: [
			{ eventId: prior.eventId, relation: "temporal-predecessor" },
		],
		mechanismId: "sponsor-counsel-v1",
		decisionId: null,
		preStateHash: prior.postStateHash,
	});
	const interpreted = await event({
		schemaVersion: "eonfolk-generated-sponsor-event-v1",
		eventId: `sponsor-event-${input.authority.citizen.citizenId}-3`,
		sequence: 3,
		simulationTime: input.source.simulationTime + 900,
		kind: "CounselInterpreted",
		citizenId: input.authority.citizen.citizenId,
		counterpartyCitizenId: relationship.otherCitizenId,
		settlementId: input.authority.citizen.settlementId,
		effect: {
			kind: "independent-decision",
			actionKind: sponsorActionKind(proposal),
			disposition: disposition(proposal),
		},
		publicFact: `${actionFact(proposal, input.authority.citizen.name)} ${proposal.publicJustification}`,
		causalParents: [
			{ eventId: offered.eventId, relation: "contributing-condition" },
		],
		mechanismId: "standard-brain-decision-v1",
		decisionId,
		preStateHash: offered.postStateHash,
	});
	const additions: GeneratedSponsorEvent[] = [offered, interpreted];
	let consequenceParent = interpreted;
	if (proposal.action.kind === "AccusePublicly") {
		const allegation = await event({
			schemaVersion: "eonfolk-generated-sponsor-event-v1",
			eventId: `sponsor-event-${input.authority.citizen.citizenId}-4`,
			sequence: 4,
			simulationTime: input.source.simulationTime + 1_800,
			kind: "AllegationRaised",
			citizenId: input.authority.citizen.citizenId,
			counterpartyCitizenId: relationship.otherCitizenId,
			settlementId: input.authority.citizen.settlementId,
			effect: {
				kind: "allegation",
				subjectCitizenId: relationship.otherCitizenId,
				truthStatus: "in-world-allegation",
			},
			publicFact: `${input.authority.citizen.name} alleged in-world that ${relationship.otherName} had mishandled the shared reserve; the Chronicle does not assert that claim as fact.`,
			causalParents: [
				{ eventId: interpreted.eventId, relation: "direct-cause" },
			],
			mechanismId: "public-statement-v1",
			decisionId,
			preStateHash: interpreted.postStateHash,
		});
		additions.push(allegation);
		consequenceParent = allegation;
	}
	const institutionName =
		input.source.institutionNameBySettlement[
			input.authority.citizen.settlementId
		];
	if (institutionName === undefined)
		throw new Error("Sponsor consequence requires a canonical institution");
	const consequenceSequence = additions.length + 2;
	const consequence = await event({
		schemaVersion: "eonfolk-generated-sponsor-event-v1",
		eventId: `sponsor-event-${input.authority.citizen.citizenId}-${consequenceSequence}`,
		sequence: consequenceSequence,
		simulationTime: input.source.simulationTime + 21_600,
		kind: "InstitutionCommitmentRecorded",
		citizenId: input.authority.citizen.citizenId,
		counterpartyCitizenId: relationship.otherCitizenId,
		settlementId: input.authority.citizen.settlementId,
		effect: {
			kind: "institution-commitment",
			institutionName,
			commitmentKind:
				proposal.action.kind === "VerifyReserve"
					? "witnessed-reserve-check"
					: proposal.action.kind === "AccusePublicly"
						? "allocation-review"
						: "existing-allocation-scheduled-review",
			state: "active",
			effectiveSimulationTime: input.source.simulationTime + 21_600,
		},
		publicFact:
			proposal.action.kind === "VerifyReserve"
				? `Six hours later, ${institutionName} recorded a witnessed reserve check before its next allocation.`
				: proposal.action.kind === "AccusePublicly"
					? `Six hours later, ${institutionName} opened an allocation review in response to the recorded allegation.`
					: `Six hours later, ${institutionName} kept its existing allocation commitment until the scheduled review.`,
		causalParents: [
			{
				eventId: consequenceParent.eventId,
				relation:
					proposal.action.kind === "AccusePublicly"
						? "trigger"
						: "direct-cause",
			},
		],
		mechanismId: "institution-response-v1",
		decisionId,
		preStateHash: consequenceParent.postStateHash,
	});
	additions.push(consequence);
	const events = Object.freeze([...input.authority.events, ...additions]);
	const chronicle = chronicleFromEvents(events);
	const counselSentence = chronicle.find((sentence) =>
		sentence.evidenceEventIds.includes(offered.eventId),
	);
	const choiceSentence = chronicle.find((sentence) =>
		sentence.evidenceEventIds.includes(interpreted.eventId),
	);
	const consequenceSentence = chronicle.at(-1);
	if (
		counselSentence === undefined ||
		choiceSentence === undefined ||
		consequenceSentence === undefined
	)
		throw new Error("Sponsor Chronicle lacks its three authoritative beats");
	const unresolvedTension =
		proposal.action.kind === "VerifyReserve"
			? `What will ${input.authority.citizen.name} do when the witnessed count is complete?`
			: proposal.action.kind === "AccusePublicly"
				? `Can ${input.authority.citizen.name} repair trust before the allocation review?`
				: `Will the scheduled review arrive before the measured pressure worsens?`;
	const shareArtifact: GeneratedShareArtifact = Object.freeze({
		schemaVersion: "eonfolk-generated-share-artifact-v1",
		durationSeconds: 15,
		headline: `${input.authority.citizen.name} made the choice. The world kept the consequence.`,
		beats: Object.freeze([
			counselSentence,
			choiceSentence,
			consequenceSentence,
		]) as readonly [
			GeneratedChronicleSentence,
			GeneratedChronicleSentence,
			GeneratedChronicleSentence,
		],
		unresolvedTension,
		canonicalPath: "/world",
	});
	const { authorityHash: _priorAuthorityHash, ...priorAuthority } =
		input.authority;
	return withAuthorityHash({
		...priorAuthority,
		revision: 2,
		counsel: input.counsel,
		decision: Object.freeze({
			decisionId,
			proposalId,
			actionId: proposal.actionId,
			actionKind: proposal.action.kind,
			disposition: disposition(proposal),
			publicJustification: proposal.publicJustification,
			cognitionKind: "standard-brain",
			cognitionVersion: proposal.provenance.cognitionVersion,
		}),
		events,
		chronicle,
		shareArtifact,
		unresolvedTension,
	});
}

export async function offerGeneratedCounsel(input: {
	readonly source: GeneratedSponsorSource;
	readonly counsel: GeneratedSponsorCounsel;
	readonly indexedDbFactory: IDBFactory;
	readonly databaseName: string;
}): Promise<GeneratedSponsorAuthority> {
	const existing = await loadGeneratedSponsorAuthority(input);
	if (existing === null)
		throw new Error("Sponsor a citizen before counselling");
	if (existing.revision === 2) {
		if (existing.counsel !== input.counsel)
			throw new Error("This decision boundary already has different counsel");
		return existing;
	}
	const resolved = await resolveGeneratedCounsel({
		source: input.source,
		authority: existing,
		counsel: input.counsel,
	});
	const database = await openDatabase(
		input.indexedDbFactory,
		input.databaseName,
	);
	try {
		return await putStored(database, storeKey(input.source), resolved, 1);
	} finally {
		database.close();
	}
}
