import type {
	CanonicalActionRef,
	PropKind,
	SpatialProjection,
} from "@eonfolk/world-presentation";

export type CounselIntent = "verify-private" | "accuse-now" | "abstain";
export type Phase =
	| "orientation"
	| "following"
	| "investigated"
	| "counsel"
	| "consequence"
	| "checkpoint"
	| "return-pending"
	| "return"
	| "chronicle";
export type ActivityKind =
	| "water"
	| "wood"
	| "food"
	| "trade"
	| "mill"
	| "investigate"
	| "council";
export type CausalRelation =
	| "direct"
	| "trigger"
	| "contributing"
	| "temporal-predecessor"
	| "response-to"
	| "allegation";

export interface CitizenProjection {
	readonly id: string;
	readonly slug: string;
	readonly name: string;
	readonly role: string;
	readonly activity: string;
	readonly activityKind: ActivityKind;
	readonly placeId: string;
	readonly place: string;
	readonly canonicalAction: CanonicalActionRef;
	readonly carriedProp: PropKind | null;
	readonly focal?: boolean;
}

export interface EvidenceProjection {
	readonly eventId: string;
	readonly label: string;
	readonly relation: CausalRelation;
	readonly mechanism: string;
	readonly visibility: "public" | "patron";
}

export interface ChronicleBeatProjection {
	readonly id: string;
	readonly timeLabel: string;
	readonly eyebrow: string;
	readonly title: string;
	readonly body: string;
	readonly evidence: readonly EvidenceProjection[];
	readonly spatialFocus: Readonly<{
		readonly placeId: string;
		readonly participantIds: readonly string[];
		readonly targetIds: readonly string[];
		readonly sourceEventIds: readonly string[];
	}>;
}

export interface MaraProjection {
	readonly activity: string;
	readonly values: readonly string[];
	readonly belief: string;
	readonly beliefStatus: "uncertain" | "verified" | "disputed";
	readonly relationship: string;
	readonly relationshipBand: "close" | "strained" | "repairing";
	readonly standingPlan: string;
	readonly autonomy: string;
}

export interface InterpretationProjection {
	readonly counsel: CounselIntent;
	readonly chosenAction: CounselIntent;
	readonly disposition:
		| "accepted"
		| "delayed"
		| "rejected"
		| "reinterpreted"
		| "not-applicable";
	readonly publicReason: string;
	readonly decisiveTerms: readonly string[];
}

export interface SecondActionProjection {
	readonly id: string;
	readonly label: string;
	readonly description: string;
}

export interface RiverholdProjection {
	readonly schemaVersion: "riverhold-view-v1";
	readonly phase: Phase;
	readonly day: number;
	readonly timeLabel: string;
	readonly headline: string;
	readonly tension: string;
	readonly citizens: readonly CitizenProjection[];
	readonly spatial: SpatialProjection;
	readonly resources: Readonly<{ food: number; water: number; wood: number }>;
	readonly worldProcesses: Readonly<{ millRepaired: boolean }>;
	readonly worldNotices: readonly string[];
	readonly mara: MaraProjection;
	readonly investigation: Readonly<{
		ledgerCount: number;
		openBinCount: number;
		mismatch: number;
		observed: boolean;
	}>;
	readonly interpretation: InterpretationProjection | null;
	readonly branch: CounselIntent | null;
	readonly consequence: string | null;
	readonly whileAway: readonly string[];
	readonly secondActions: readonly SecondActionProjection[];
	readonly chronicle: readonly ChronicleBeatProjection[];
	readonly storyCard: Readonly<{
		heading: string;
		choice: string;
		followed: string;
		unresolved: string;
	}> | null;
	readonly localSaveNotice: string;
}

export type RiverholdIntent =
	| { readonly kind: "follow-mara" }
	| { readonly kind: "investigate-count" }
	| { readonly kind: "open-counsel" }
	| { readonly kind: "offer-counsel"; readonly counsel: CounselIntent }
	| { readonly kind: "leave-checkpoint" }
	| { readonly kind: "return-to-checkpoint" }
	| { readonly kind: "confirm-advance" }
	| { readonly kind: "take-second-action"; readonly actionId: string };

export interface RiverholdRuntimeBridge {
	getProjection(): RiverholdProjection;
	ready(): Promise<RiverholdProjection>;
	dispatch(intent: RiverholdIntent): Promise<RiverholdProjection>;
	clear(): void;
}

export const counselLabels: Readonly<Record<CounselIntent, string>> = {
	"verify-private": "Verify the count privately",
	"accuse-now": "Raise the mismatch in public",
	abstain: "Offer no advice",
};
