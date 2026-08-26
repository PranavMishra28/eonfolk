import { checkedQuantity } from "@eonfolk/protocol";

import type {
	CivilizationMindState,
	CivilizationReferences,
	CivilizationState,
} from "./types.js";
import { CivilizationError } from "./types.js";

export function identifier(value: string, label: string): string {
	if (
		value.length === 0 ||
		value.length > 128 ||
		!/^[a-z0-9][a-z0-9._:-]*$/u.test(value)
	) {
		throw new CivilizationError(
			"INVALID_INPUT",
			`${label} is not a canonical identifier`,
		);
	}
	return value;
}

export function quantity(value: number, label: string): number {
	try {
		return checkedQuantity(value, label);
	} catch (error) {
		throw new CivilizationError(
			"INVALID_INPUT",
			error instanceof Error ? error.message : `${label} is invalid`,
		);
	}
}

export function positiveQuantity(value: number, label: string): number {
	quantity(value, label);
	if (value === 0) {
		throw new CivilizationError("INVALID_INPUT", `${label} must be positive`);
	}
	return value;
}

export function simulationTime(
	value: number,
	label = "simulationTime",
): number {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new CivilizationError(
			"INVALID_INPUT",
			`${label} must be a non-negative safe integer`,
		);
	}
	return value;
}

function uniqueSorted(
	values: readonly string[],
	label: string,
): readonly string[] {
	const normalized = values.map((value) => identifier(value, label));
	if (new Set(normalized).size !== normalized.length) {
		throw new CivilizationError(
			"INVALID_INPUT",
			`${label} contains a duplicate`,
		);
	}
	return normalized.sort();
}

function normalizeReferences(
	input: CivilizationReferences,
): CivilizationReferences {
	const citizenIds = uniqueSorted(input.citizenIds, "citizenId");
	const siteIds = uniqueSorted(input.siteIds, "siteId");
	const buildingKindsBySite: Record<string, readonly string[]> = {};
	for (const [siteId, kinds] of Object.entries(input.buildingKindsBySite).sort(
		([a], [b]) => a.localeCompare(b),
	)) {
		if (!siteIds.includes(siteId)) {
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`building catalog references unknown site ${siteId}`,
			);
		}
		buildingKindsBySite[siteId] = uniqueSorted(kinds, "buildingKind");
	}
	const capabilitiesByCitizen: Record<
		string,
		Readonly<Record<string, number>>
	> = {};
	for (const [citizenId, capabilities] of Object.entries(
		input.capabilitiesByCitizen,
	).sort(([a], [b]) => a.localeCompare(b))) {
		if (!citizenIds.includes(citizenId)) {
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`capability catalog references unknown citizen ${citizenId}`,
			);
		}
		const normalized: Record<string, number> = {};
		for (const [capabilityId, level] of Object.entries(capabilities).sort(
			([a], [b]) => a.localeCompare(b),
		)) {
			identifier(capabilityId, "capabilityId");
			quantity(level, "capability level");
			if (level > 10_000) {
				throw new CivilizationError(
					"INVALID_INPUT",
					"capability level exceeds 10000 basis points",
				);
			}
			normalized[capabilityId] = level;
		}
		capabilitiesByCitizen[citizenId] = normalized;
	}
	return {
		citizenIds,
		settlementIds: uniqueSorted(input.settlementIds, "settlementId"),
		territoryIds: uniqueSorted(input.territoryIds, "territoryId"),
		siteIds,
		buildingKindsBySite,
		capabilitiesByCitizen,
	};
}

export function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
		for (const child of Object.values(value as Record<string, unknown>))
			deepFreeze(child);
		Object.freeze(value);
	}
	return value;
}

function clonePlain<T>(value: T): T {
	// Frozen values are already isolated canonical state. Reusing them preserves
	// immutability while avoiding quadratic deep copies of append-only histories.
	if (value !== null && typeof value === "object" && Object.isFrozen(value))
		return value;
	if (Array.isArray(value)) {
		return value.map((entry) => clonePlain(entry)) as T;
	}
	if (value !== null && typeof value === "object") {
		const clone: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			clone[key] = clonePlain(child);
		}
		return clone as T;
	}
	return value;
}

export function createCivilizationState(
	references: CivilizationReferences,
	initialSimulationTime = 0,
): CivilizationState {
	simulationTime(initialSimulationTime);
	return deepFreeze({
		schemaVersion: "eonfolk-civilization-kernel-v5",
		revision: 0,
		simulationTime: initialSimulationTime,
		references: normalizeReferences(references),
		resourceDefinitions: {},
		storages: {},
		stocks: {},
		recipes: {},
		processes: {},
		processBindings: {},
		projects: {},
		citizens: {},
		relationships: {},
		sponsorships: {},
		patronAbstentions: {},
		minds: {},
		counsels: {},
		counselOutcomes: {},
		households: {},
		institutions: {},
		agreements: {},
		migrations: {},
		migrationJourneys: {},
		migrationRequirements: {},
		foundings: {},
		materializedFoundings: {},
		foundingRequirements: {},
		accountingCheckpoint: null,
		schedulerTotals: {
			completedProductionRuns: 0,
			consumedNeedUnits: 0,
			transportedResourceUnits: 0,
			groundedNeedOutcomes: 0,
			unmetNeedUnits: 0,
		},
		needOutcomes: [],
		materializedProjects: {},
		provenance: [],
		accounting: [],
	});
}

/**
 * Registers the typed Mind snapshot that later cognition decisions must be
 * reconstructed from. This is a genesis/setup operation, not Brain authority.
 */
export function registerCivilizationMind(
	state: CivilizationState,
	mind: CivilizationMindState,
): CivilizationState {
	identifier(mind.citizenId, "mind citizenId");
	if (state.citizens[mind.citizenId] === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`mind references unknown citizen ${mind.citizenId}`,
		);
	if (state.minds[mind.citizenId] !== undefined)
		throw new CivilizationError(
			"ALREADY_EXISTS",
			`mind ${mind.citizenId} already exists`,
		);
	if (
		mind.schemaVersion !== "eonfolk-civilization-mind-v1" ||
		mind.snapshot.citizenId !== mind.citizenId ||
		mind.committedAtRevision !== state.revision ||
		mind.committedAtSimulationTime !== state.simulationTime
	)
		throw new CivilizationError("INVALID_INPUT", "mind commitment is invalid");
	const citizen = state.citizens[mind.citizenId]!;
	if (
		new Set(mind.snapshot.values.map(({ valueId }) => valueId)).size !==
			mind.snapshot.values.length ||
		mind.snapshot.values.length !== citizen.valueIds.length ||
		mind.snapshot.values.some(
			(value) =>
				!citizen.valueIds.includes(value.valueId) ||
				!Number.isSafeInteger(value.weight) ||
				value.weight < 0,
		)
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"mind values are not canonical",
		);
	if (
		new Set(
			mind.snapshot.relationships.map(({ relationshipId }) => relationshipId),
		).size !== mind.snapshot.relationships.length ||
		mind.snapshot.relationships.some((relationship) => {
			const canonical = state.relationships[relationship.relationshipId];
			return (
				canonical === undefined ||
				canonical.fromCitizenId !== mind.citizenId ||
				canonical.fromCitizenId !== relationship.fromCitizenId ||
				canonical.toCitizenId !== relationship.toCitizenId ||
				canonical.familiarityBasisPoints !== relationship.familiarity ||
				canonical.trustBasisPoints !== relationship.trust ||
				canonical.strainBasisPoints !== relationship.strain ||
				relationship.createdRevision > state.revision
			);
		})
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"mind relationships are not canonical",
		);
	const provenanceIds = new Set(state.provenance.map(({ eventId }) => eventId));
	if (
		new Set(mind.snapshot.records.map(({ recordId }) => recordId)).size !==
			mind.snapshot.records.length ||
		mind.snapshot.records.some(
			(record) =>
				record.subjectCitizenId !== mind.citizenId ||
				record.sourceIds.length === 0 ||
				record.sourceIds.some(
					(sourceId) => !citizen.sourceEventIds.includes(sourceId),
				) ||
				record.sourceIds.some((sourceId) => !provenanceIds.has(sourceId)) ||
				record.createdRevision > state.revision ||
				(record.confidence !== null &&
					(!Number.isSafeInteger(record.confidence) ||
						record.confidence < 0 ||
						record.confidence > 10_000)),
		)
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"mind records are not authoritative",
		);
	const plan = mind.snapshot.standingPlan;
	const stepIds = new Set(plan.steps.map(({ stepId }) => stepId));
	if (
		plan.citizenId !== mind.citizenId ||
		plan.status !== "active" ||
		!stepIds.has(plan.currentStepId) ||
		plan.targetIds.some(
			(targetId) =>
				targetId !== mind.citizenId &&
				state.citizens[targetId] === undefined &&
				!state.references.siteIds.includes(targetId) &&
				(plan.sourceId !== "eonfolk-civilization-scheduler-brain-v1" ||
					identifier(targetId, "scheduler plan target") !== targetId),
		) ||
		plan.startBoundary > plan.expiryBoundary
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"mind standing plan is not canonical",
		);
	return evolve(state, {
		minds: { ...state.minds, [mind.citizenId]: clonePlain(mind) },
	});
}

/** Persists a later scheduler-owned Mind checkpoint without changing its plan semantics. */
export function replaceCivilizationMind(
	state: CivilizationState,
	mind: CivilizationMindState,
): CivilizationState {
	const prior = state.minds[mind.citizenId];
	if (prior === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`mind ${mind.citizenId} does not exist`,
		);
	if (mind.snapshot.standingPlan.version < prior.snapshot.standingPlan.version)
		throw new CivilizationError(
			"INVALID_INPUT",
			"mind standing plan version cannot move backwards",
		);
	const { [mind.citizenId]: _removed, ...remaining } = state.minds;
	return registerCivilizationMind(
		deepFreeze({ ...state, minds: remaining }),
		mind,
	);
}

export function appendBuildingKindReference(
	state: CivilizationState,
	siteId: string,
	buildingKind: string,
	patch: Partial<
		Omit<CivilizationState, "schemaVersion" | "revision" | "references">
	>,
	atSimulationTime = state.simulationTime,
): CivilizationState {
	simulationTime(atSimulationTime);
	requireReference(state.references.siteIds, siteId, "site");
	identifier(buildingKind, "buildingKind");
	if (atSimulationTime < state.simulationTime)
		throw new CivilizationError(
			"INVALID_INPUT",
			"simulation time cannot move backwards",
		);
	const existing = state.references.buildingKindsBySite[siteId] ?? [];
	return deepFreeze({
		...state,
		...clonePlain(patch),
		references: normalizeReferences({
			...state.references,
			buildingKindsBySite: {
				...state.references.buildingKindsBySite,
				[siteId]: existing.includes(buildingKind)
					? existing
					: [...existing, buildingKind],
			},
		}),
		revision: state.revision + 1,
		simulationTime: atSimulationTime,
	});
}

export function evolve(
	state: CivilizationState,
	patch: Partial<
		Omit<CivilizationState, "schemaVersion" | "revision" | "references">
	>,
	atSimulationTime = state.simulationTime,
): CivilizationState {
	simulationTime(atSimulationTime);
	if (atSimulationTime < state.simulationTime) {
		throw new CivilizationError(
			"INVALID_INPUT",
			"simulation time cannot move backwards",
		);
	}
	const isolatedPatch = clonePlain(patch);
	return deepFreeze({
		...state,
		...isolatedPatch,
		revision: state.revision + 1,
		simulationTime: atSimulationTime,
	});
}

export function appendSettlementReference(
	state: CivilizationState,
	settlementId: string,
	patch: Partial<
		Omit<CivilizationState, "schemaVersion" | "revision" | "references">
	>,
	atSimulationTime = state.simulationTime,
): CivilizationState {
	simulationTime(atSimulationTime);
	identifier(settlementId, "settlementId");
	if (atSimulationTime < state.simulationTime)
		throw new CivilizationError(
			"INVALID_INPUT",
			"simulation time cannot move backwards",
		);
	if (state.references.settlementIds.includes(settlementId))
		throw new CivilizationError(
			"ALREADY_EXISTS",
			`settlement ${settlementId} already exists`,
		);
	return deepFreeze({
		...state,
		...clonePlain(patch),
		references: normalizeReferences({
			...state.references,
			settlementIds: [...state.references.settlementIds, settlementId],
		}),
		revision: state.revision + 1,
		simulationTime: atSimulationTime,
	});
}

export function appendSettlementAndSiteReferences(
	state: CivilizationState,
	settlementId: string,
	siteId: string,
	patch: Partial<
		Omit<CivilizationState, "schemaVersion" | "revision" | "references">
	>,
	atSimulationTime = state.simulationTime,
): CivilizationState {
	simulationTime(atSimulationTime);
	identifier(settlementId, "settlementId");
	identifier(siteId, "siteId");
	if (atSimulationTime < state.simulationTime)
		throw new CivilizationError(
			"INVALID_INPUT",
			"simulation time cannot move backwards",
		);
	if (state.references.settlementIds.includes(settlementId))
		throw new CivilizationError(
			"ALREADY_EXISTS",
			`settlement ${settlementId} already exists`,
		);
	if (state.references.siteIds.includes(siteId))
		throw new CivilizationError(
			"ALREADY_EXISTS",
			`site ${siteId} already exists`,
		);
	return deepFreeze({
		...state,
		...clonePlain(patch),
		references: normalizeReferences({
			...state.references,
			settlementIds: [...state.references.settlementIds, settlementId],
			siteIds: [...state.references.siteIds, siteId],
			buildingKindsBySite: {
				...state.references.buildingKindsBySite,
				[siteId]: [],
			},
		}),
		revision: state.revision + 1,
		simulationTime: atSimulationTime,
	});
}

export function requireReference(
	values: readonly string[],
	value: string,
	label: string,
): void {
	if (!values.includes(value)) {
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`${label} ${value} is unknown`,
		);
	}
}
