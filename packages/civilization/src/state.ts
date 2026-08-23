import { checkedQuantity } from "@eonfolk/protocol";

import type { CivilizationReferences, CivilizationState } from "./types.js";
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
		schemaVersion: "eonfolk-civilization-kernel-v3",
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
		households: {},
		institutions: {},
		agreements: {},
		migrations: {},
		migrationJourneys: {},
		migrationRequirements: {},
		foundings: {},
		materializedFoundings: {},
		foundingRequirements: {},
		provenance: [],
		accounting: [],
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
