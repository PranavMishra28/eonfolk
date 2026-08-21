import type {
	BehaviorFamily,
	CitizenId,
	EpistemicRecord,
	NeedState,
	PatronCovenant,
	RelationshipState,
	ResourceKind,
	StandingPlan,
	ValuePriority,
} from "../../protocol/src/index.js";

export interface PlaceState {
	readonly placeId: string;
	readonly name: string;
	readonly neighbors: readonly string[];
}

export interface ResourceSiteState {
	readonly siteId: string;
	readonly placeId: string;
	readonly resource: ResourceKind;
	readonly quantity: number;
}

export interface CitizenState {
	readonly citizenId: CitizenId;
	readonly slug: string;
	readonly name: string;
	readonly role: string;
	readonly alive: boolean;
	readonly placeId: string;
	readonly inventory: Readonly<Record<ResourceKind, number>>;
	readonly needs: NeedState;
	readonly values: readonly ValuePriority[];
	readonly recordIds: readonly string[];
	readonly standingPlan: StandingPlan;
	readonly currentBehavior: BehaviorFamily;
	readonly actionBudget: number;
}

export interface MillState {
	readonly millId: string;
	readonly placeId: string;
	readonly repaired: boolean;
	readonly woodConsumed: number;
}

export interface ConservationState {
	readonly baseline: Readonly<Record<ResourceKind, number>>;
	readonly consumed: Readonly<Record<ResourceKind, number>>;
}

export interface CounselState {
	readonly interventionId: string;
	readonly citizenId: CitizenId;
	readonly intent: "verify-reserve" | "accuse-publicly";
	readonly eventId: string;
}

export interface WorldState {
	readonly schemaVersion: "riverhold-world-state-v1";
	readonly runId: string;
	readonly regionId: string;
	readonly worldSeedHex: string;
	readonly revision: number;
	readonly simulationTime: number;
	readonly nextSequence: number;
	readonly nextCreationSequence: number;
	readonly places: Readonly<Record<string, PlaceState>>;
	readonly resourceSites: Readonly<Record<string, ResourceSiteState>>;
	readonly citizens: Readonly<Record<CitizenId, CitizenState>>;
	readonly relationships: Readonly<Record<string, RelationshipState>>;
	readonly epistemicRecords: Readonly<Record<string, EpistemicRecord>>;
	readonly covenants: readonly PatronCovenant[];
	readonly settlementInventory: Readonly<Record<ResourceKind, number>>;
	readonly sealedRepairReserve: number;
	readonly publicLedgerFood: number;
	readonly mill: MillState;
	readonly petitionEndorsements: number;
	readonly publicReserveCountsRule: boolean;
	readonly conservation: ConservationState;
	readonly lastCounsel: CounselState | null;
	readonly selectedCounselBranch:
		| "verify-reserve"
		| "accuse-publicly"
		| "follow-plan"
		| null;
}

export interface GenesisResult {
	readonly state: WorldState;
	readonly initialStateHash: string;
	readonly experimentManifest: import("../../protocol/src/index.js").ExperimentManifest;
	readonly genesisWorldHeadHash: string;
}

export function citizenBySlug(state: WorldState, slug: string): CitizenState {
	const citizen = Object.values(state.citizens).find(
		(candidate) => candidate.slug === slug,
	);
	if (citizen === undefined) throw new Error(`unknown citizen slug: ${slug}`);
	return citizen;
}
