import {
	bytesFromHex,
	COGNITION_VERSION,
	DETERMINISM_VERSION,
	ENGINE_VERSION,
	type EpistemicRecord,
	type ExperimentManifest,
	genesisHeadHash,
	manifestHash,
	PROTOCOL_SCHEMA_VERSION,
	REPLAY_VERSION,
	type StandingPlan,
	stableId,
	stateHash,
	type ValuePriority,
} from "../../protocol/src/index.js";
import type { CitizenState, GenesisResult, WorldState } from "./state.js";

const DEFAULT_SEED =
	"000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

interface CitizenSeed {
	readonly slug: string;
	readonly name: string;
	readonly role: string;
	readonly place: string;
	readonly values: readonly [string, string, string];
	readonly need: readonly [number, number, number];
}

const citizenSeeds: readonly CitizenSeed[] = [
	{
		slug: "mara",
		name: "Mara Vale",
		role: "ledger runner",
		place: "market",
		values: ["caution", "candor", "loyalty"],
		need: [2_400, 2_000, 1_200],
	},
	{
		slug: "toma",
		name: "Toma Reed",
		role: "storekeeper",
		place: "market",
		values: ["stewardship", "loyalty", "order"],
		need: [1_600, 2_200, 1_400],
	},
	{
		slug: "iven",
		name: "Iven Holt",
		role: "miller",
		place: "market",
		values: ["craft", "reciprocity", "candor"],
		need: [2_100, 1_800, 1_700],
	},
	{
		slug: "sela",
		name: "Sela Fen",
		role: "water carrier",
		place: "spring",
		values: ["care", "duty", "prudence"],
		need: [2_800, 1_000, 1_500],
	},
	{
		slug: "rowan",
		name: "Rowan Pike",
		role: "woodcutter",
		place: "woods",
		values: ["duty", "craft", "independence"],
		need: [2_000, 2_300, 1_800],
	},
	{
		slug: "neri",
		name: "Neri Ash",
		role: "forager",
		place: "fields",
		values: ["care", "curiosity", "reciprocity"],
		need: [1_900, 2_100, 2_000],
	},
	{
		slug: "odo",
		name: "Odo Bell",
		role: "repair hand",
		place: "mill",
		values: ["craft", "duty", "order"],
		need: [2_500, 2_400, 1_100],
	},
	{
		slug: "els",
		name: "Els Wren",
		role: "council clerk",
		place: "granary",
		values: ["candor", "order", "prudence"],
		need: [2_200, 1_700, 1_900],
	},
];

function rankedValues(
	values: readonly [string, string, string],
): readonly ValuePriority[] {
	return values.map((valueId, index) => ({
		valueId,
		rank: (index + 1) as 1 | 2 | 3,
		weight: [1_000, 650, 350][index] ?? 0,
	}));
}

function plan(planId: string, citizenId: string, slug: string): StandingPlan {
	const step = `${slug}-routine`;
	return {
		planId,
		version: 1,
		citizenId,
		goalType: slug === "mara" ? "reconcile-ledger" : "serve-riverhold",
		targetIds: slug === "mara" ? ["granary", "citizen:toma"] : ["riverhold"],
		steps: [
			{
				stepId: step,
				kind: slug === "mara" ? "investigate-ledger" : "perform-role",
				targetIds: slug === "mara" ? ["granary"] : ["riverhold"],
				status: "active",
				children:
					slug === "mara"
						? [
								{
									stepId: "mara-recount",
									kind: "ask-recount",
									targetIds: ["citizen:iven"],
									status: "pending",
									children: [],
								},
								{
									stepId: "mara-decide",
									kind: "decide-disclosure",
									targetIds: ["citizen:toma"],
									status: "pending",
									children: [],
								},
							]
						: [],
			},
		],
		currentStepId: step,
		commitmentId: slug === "mara" ? "commitment_ledger-accuracy" : null,
		sourceId: "riverhold-genesis-v1",
		startBoundary: 0,
		expiryBoundary: 86_400,
		retriesRemaining: 1,
		replansRemaining: 2,
		status: "active",
	};
}

export async function createRiverholdGenesis(
	options: {
		readonly runId?: string;
		readonly regionId?: string;
		readonly worldSeedHex?: string;
		readonly patronPrincipalId?: string;
	} = {},
): Promise<GenesisResult> {
	const runId = options.runId ?? "run_riverhold_0001";
	const regionId = options.regionId ?? "riverhold";
	const worldSeedHex = options.worldSeedHex ?? DEFAULT_SEED;
	const worldSeed = bytesFromHex(worldSeedHex, 32);
	let creationSequence = 1;
	const citizens: Record<string, CitizenState> = {};
	const slugToId = new Map<string, string>();
	for (const seed of citizenSeeds) {
		const citizenId = await stableId("citizen", worldSeed, creationSequence++);
		const planId = await stableId("plan", worldSeed, creationSequence++);
		slugToId.set(seed.slug, citizenId);
		citizens[citizenId] = {
			citizenId,
			slug: seed.slug,
			name: seed.name,
			role: seed.role,
			alive: true,
			placeId: seed.place,
			travel: null,
			inventory: {
				food: seed.slug === "toma" ? 8 : seed.slug === "iven" ? 1 : 2,
				water: seed.slug === "sela" ? 8 : 2,
				wood: seed.slug === "iven" ? 4 : seed.slug === "rowan" ? 3 : 0,
			},
			needs: { hunger: seed.need[0], thirst: seed.need[1], rest: seed.need[2] },
			values: rankedValues(seed.values),
			recordIds: [],
			standingPlan: plan(planId, citizenId, seed.slug),
			currentBehavior:
				seed.slug === "toma" || seed.slug === "iven"
					? "respond-socially"
					: seed.slug === "sela" ||
							seed.slug === "rowan" ||
							seed.slug === "neri"
						? "acquire-resource"
						: "fulfill-plan",
			actionBudget: 1,
		};
	}
	const maraId = slugToId.get("mara");
	const tomaId = slugToId.get("toma");
	const ivenId = slugToId.get("iven");
	if (maraId === undefined || tomaId === undefined || ivenId === undefined)
		throw new Error("Riverhold focal cast missing");

	const relationships: WorldState["relationships"] = {
		"relationship-mara-toma": {
			relationshipId: "relationship-mara-toma",
			fromCitizenId: maraId,
			toCitizenId: tomaId,
			familiarity: 9_000,
			trust: 7_500,
			strain: 800,
			lastMaterialEventId: null,
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: maraId,
			},
			createdRevision: 0,
		},
		"relationship-mara-iven": {
			relationshipId: "relationship-mara-iven",
			fromCitizenId: maraId,
			toCitizenId: ivenId,
			familiarity: 6_000,
			trust: 6_200,
			strain: 400,
			lastMaterialEventId: null,
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: maraId,
			},
			createdRevision: 0,
		},
	};

	const records: Record<string, EpistemicRecord> = {
		"observation-ledger-mismatch": {
			recordId: "observation-ledger-mismatch",
			kind: "observation",
			subjectCitizenId: maraId,
			proposition:
				"The public ledger lists 12 more food than the open bins contain.",
			confidence: 10_000,
			sourceIds: ["riverhold-genesis-ledger"],
			visibility: { kind: "citizen-private", subjectCitizenId: maraId },
			createdRevision: 0,
		},
		"belief-ledger-mismatch": {
			recordId: "belief-ledger-mismatch",
			kind: "belief",
			subjectCitizenId: maraId,
			proposition: "The public food ledger and open-bin count do not match.",
			confidence: 8_000,
			sourceIds: ["observation-ledger-mismatch"],
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: maraId,
			},
			createdRevision: 0,
		},
		"knowledge-repair-order": {
			recordId: "knowledge-repair-order",
			kind: "private-knowledge",
			subjectCitizenId: tomaId,
			proposition: "The sealed 12-food reserve is allocated to mill workers.",
			confidence: 10_000,
			sourceIds: ["riverhold-repair-order"],
			visibility: { kind: "citizen-private", subjectCitizenId: tomaId },
			createdRevision: 0,
		},
		"commitment-ledger-accuracy": {
			recordId: "commitment-ledger-accuracy",
			kind: "commitment",
			subjectCitizenId: maraId,
			proposition: "Reconcile the ledger before making a public claim.",
			confidence: null,
			sourceIds: ["riverhold-mara-role"],
			visibility: {
				kind: "patron-visible-through-covenant",
				subjectCitizenId: maraId,
			},
			createdRevision: 0,
		},
	};
	citizens[maraId] = {
		...citizens[maraId]!,
		recordIds: [
			"observation-ledger-mismatch",
			"belief-ledger-mismatch",
			"commitment-ledger-accuracy",
		],
	};
	citizens[tomaId] = {
		...citizens[tomaId]!,
		recordIds: ["knowledge-repair-order"],
	};

	const settlementInventory = { food: 28, water: 30, wood: 6 } as const;
	const resourceSites = {
		spring: {
			siteId: "spring",
			placeId: "spring",
			resource: "water" as const,
			quantity: 50,
		},
		woods: {
			siteId: "woods",
			placeId: "woods",
			resource: "wood" as const,
			quantity: 40,
		},
		fields: {
			siteId: "fields",
			placeId: "fields",
			resource: "food" as const,
			quantity: 42,
		},
	};
	const citizenTotals = (resource: "food" | "water" | "wood"): number =>
		Object.values(citizens).reduce(
			(sum, citizen) => sum + citizen.inventory[resource],
			0,
		);
	const baseline = {
		food:
			settlementInventory.food +
			resourceSites.fields.quantity +
			citizenTotals("food") +
			12,
		water:
			settlementInventory.water +
			resourceSites.spring.quantity +
			citizenTotals("water"),
		wood:
			settlementInventory.wood +
			resourceSites.woods.quantity +
			citizenTotals("wood"),
	};
	const state: WorldState = {
		schemaVersion: "riverhold-world-state-v1",
		runId,
		regionId,
		worldSeedHex,
		revision: 0,
		simulationTime: 0,
		nextSequence: 1,
		nextCreationSequence: creationSequence,
		places: {
			market: {
				placeId: "market",
				name: "Market Green",
				neighbors: ["granary", "mill", "spring"],
			},
			granary: {
				placeId: "granary",
				name: "Granary",
				neighbors: ["market", "fields"],
			},
			mill: {
				placeId: "mill",
				name: "River Mill",
				neighbors: ["market", "woods"],
			},
			spring: { placeId: "spring", name: "Low Spring", neighbors: ["market"] },
			woods: { placeId: "woods", name: "Alder Woods", neighbors: ["mill"] },
			fields: {
				placeId: "fields",
				name: "North Fields",
				neighbors: ["granary"],
			},
		},
		resourceSites,
		citizens,
		relationships,
		epistemicRecords: records,
		covenants: [
			{
				patronPrincipalId:
					options.patronPrincipalId ?? "principal_local_patron",
				beneficiaryCitizenId: maraId,
				grantRevision: 0,
				revokeRevision: null,
			},
		],
		settlementInventory,
		sealedRepairReserve: 12,
		publicLedgerFood: 40,
		mill: {
			millId: "river-mill",
			placeId: "mill",
			repaired: false,
			woodConsumed: 0,
		},
		petitionEndorsements: 0,
		publicReserveCountsRule: false,
		conservation: { baseline, consumed: { food: 0, water: 0, wood: 0 } },
		lastCounsel: null,
		selectedCounselBranch: null,
		lastReturnResponse: null,
	};
	const initialStateHash = await stateHash(state);
	const manifestWithoutHash = {
		manifestVersion: "eonfolk-experiment-manifest-v1" as const,
		runId,
		regionId,
		runKind: "canonical-local-proof" as const,
		worldSeedHex,
		initialSnapshotRef: {
			runId,
			regionId,
			snapshotId: "snapshot_genesis",
			baseSequence: 0 as const,
			stateHash: initialStateHash,
		},
		initialStateHash,
		engineVersion: ENGINE_VERSION,
		worldSchemaVersion: PROTOCOL_SCHEMA_VERSION,
		determinismVersion: DETERMINISM_VERSION,
		replayVersion: REPLAY_VERSION,
		cognitionVersion: COGNITION_VERSION,
		standardBrainVersion: "riverhold-standard-brain-v1" as const,
		cognitionConfiguration: {
			kind: "standard-brain" as const,
			decisionBudget: 1,
		},
		provider: null,
		model: null,
		modelVersion: null,
		promptTemplateHash: null,
		schemaHash: null,
		artifactHash: null,
		configuredInterventionProtocolIds: [
			"riverhold-patron-counsel-v1",
			"riverhold-confirm-advance-v1",
		],
		parentRunId: null,
		parentSnapshotRef: null,
	};
	const digest = await manifestHash(manifestWithoutHash);
	const experimentManifest: ExperimentManifest = {
		...manifestWithoutHash,
		manifestHash: digest,
	};
	return {
		state,
		initialStateHash,
		experimentManifest,
		genesisWorldHeadHash: await genesisHeadHash(
			runId,
			regionId,
			digest,
			initialStateHash,
		),
	};
}
