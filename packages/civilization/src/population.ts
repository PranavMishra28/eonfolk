import type { HouseholdState } from "@eonfolk/protocol";

import {
	evolve,
	identifier,
	quantity,
	requireReference,
	simulationTime,
} from "./state.js";
import type {
	CivilizationCitizenState,
	CivilizationRelationshipState,
	CivilizationState,
} from "./types.js";
import { CivilizationError } from "./types.js";

function citizen(
	state: CivilizationState,
	citizenId: string,
): CivilizationCitizenState {
	const value = state.citizens[citizenId];
	if (value === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`citizen ${citizenId} is not registered`,
		);
	return value;
}

function assertBasisPoints(value: number, label: string): void {
	quantity(value, label);
	if (value > 10_000)
		throw new CivilizationError(
			"INVALID_INPUT",
			`${label} exceeds 10000 basis points`,
		);
}

function assertCitizenShape(
	state: CivilizationState,
	value: CivilizationCitizenState,
): void {
	identifier(value.citizenId, "citizenId");
	if (
		value.name.length < 1 ||
		value.name.length > 64 ||
		value.name !== value.name.trim() ||
		[...value.name].some((character) => {
			const codePoint = character.codePointAt(0) ?? 0;
			return codePoint < 32 || codePoint === 127;
		})
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"citizen name must be canonical visible text",
		);
	if (
		value.valueIds.length < 1 ||
		value.valueIds.length > 4 ||
		new Set(value.valueIds).size !== value.valueIds.length
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"citizen values must contain one to four unique identifiers",
		);
	for (const valueId of value.valueIds) identifier(valueId, "citizen valueId");
	requireReference(state.references.citizenIds, value.citizenId, "citizen");
	requireReference(
		state.references.settlementIds,
		value.settlementId,
		"settlement",
	);
	requireReference(state.references.siteIds, value.siteId, "site");
	simulationTime(value.arrivedAtSimulationTime, "citizen arrival");
	simulationTime(value.lastSocialSimulationTime, "last social time");
	if (value.arrivedAtSimulationTime > state.simulationTime)
		throw new CivilizationError(
			"INVALID_INPUT",
			"citizen arrival is from the future",
		);
	if (value.lastSocialSimulationTime > state.simulationTime)
		throw new CivilizationError(
			"INVALID_INPUT",
			"last social time is from the future",
		);
	if (value.departedAtSimulationTime !== null) {
		simulationTime(value.departedAtSimulationTime, "citizen departure");
		if (value.departedAtSimulationTime < value.arrivedAtSimulationTime)
			throw new CivilizationError(
				"INVALID_INPUT",
				"citizen departure predates arrival",
			);
	}
	if (
		(value.residenceState === "departed") !==
		(value.departedAtSimulationTime !== null)
	)
		throw new CivilizationError(
			"INVALID_INPUT",
			"citizen departure state and time differ",
		);
	for (const [label, amount] of [
		["food requirement", value.foodRequiredUnitsPerDay],
		["water requirement", value.waterRequiredUnitsPerDay],
		["labor capacity", value.laborCapacitySecondsPerDay],
		["labor commitment", value.committedLaborSecondsPerDay],
	] as const)
		quantity(amount, label);
	if (value.foodRequiredUnitsPerDay < 1 || value.waterRequiredUnitsPerDay < 1)
		throw new CivilizationError(
			"INVALID_INPUT",
			"daily food and water requirements must be positive",
		);
	if (value.committedLaborSecondsPerDay > value.laborCapacitySecondsPerDay)
		throw new CivilizationError(
			"INVALID_INPUT",
			"labor commitments exceed capacity",
		);
	if (
		value.householdId !== null &&
		state.households[value.householdId] === undefined
	)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`household ${value.householdId} is unknown`,
		);
	if (value.primaryRoleId !== null)
		identifier(value.primaryRoleId, "primaryRoleId");
}

/** Registers one of the finite genesis/reference citizens as a canonical person. */
export function registerCitizen(
	state: CivilizationState,
	value: CivilizationCitizenState,
): CivilizationState {
	if (state.citizens[value.citizenId] !== undefined)
		throw new CivilizationError(
			"ALREADY_EXISTS",
			`citizen ${value.citizenId} already exists`,
		);
	assertCitizenShape(state, value);
	return evolve(state, {
		citizens: { ...state.citizens, [value.citizenId]: { ...value } },
	});
}

/** Forms one household atomically and links each member back to it. */
export function formHousehold(
	state: CivilizationState,
	household: HouseholdState,
): CivilizationState {
	identifier(household.householdId, "householdId");
	if (state.households[household.householdId] !== undefined)
		throw new CivilizationError(
			"ALREADY_EXISTS",
			`household ${household.householdId} already exists`,
		);
	requireReference(
		state.references.settlementIds,
		household.settlementId,
		"settlement",
	);
	const all = [...household.memberCitizenIds, ...household.dependentCitizenIds];
	if (all.length === 0 || new Set(all).size !== all.length)
		throw new CivilizationError(
			"INVALID_INPUT",
			"household residents must be non-empty and unique",
		);
	const members = all.map((citizenId) => citizen(state, citizenId));
	for (const member of members) {
		if (
			member.residenceState !== "resident" ||
			member.settlementId !== household.settlementId
		)
			throw new CivilizationError(
				"INVALID_STATE",
				"household residents must be active in its settlement",
			);
		if (member.householdId !== null)
			throw new CivilizationError(
				"INVALID_STATE",
				`citizen ${member.citizenId} already belongs to a household`,
			);
	}
	for (const storageId of household.sharedStorageIds)
		if (state.storages[storageId] === undefined)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`storage ${storageId} is unknown`,
			);
	for (const commitmentId of household.commitmentIds)
		if (state.agreements[commitmentId] === undefined)
			throw new CivilizationError(
				"INVALID_REFERENCE",
				`agreement ${commitmentId} is unknown`,
			);
	const citizens = { ...state.citizens };
	for (const member of members)
		citizens[member.citizenId] = {
			...member,
			householdId: household.householdId,
		};
	return evolve(state, {
		citizens,
		households: {
			...state.households,
			[household.householdId]: { ...household },
		},
	});
}

/** Removes one resident from a household without creating or deleting people. */
export function leaveHousehold(
	state: CivilizationState,
	citizenId: string,
): CivilizationState {
	const current = citizen(state, citizenId);
	if (current.householdId === null)
		throw new CivilizationError(
			"INVALID_STATE",
			"citizen does not belong to a household",
		);
	const household = state.households[current.householdId];
	if (household === undefined)
		throw new CivilizationError(
			"INVALID_REFERENCE",
			`household ${current.householdId} is unknown`,
		);
	const updated = {
		...household,
		memberCitizenIds: household.memberCitizenIds.filter(
			(candidate) => candidate !== citizenId,
		),
		dependentCitizenIds: household.dependentCitizenIds.filter(
			(candidate) => candidate !== citizenId,
		),
	};
	const households = { ...state.households };
	if (
		updated.memberCitizenIds.length === 0 &&
		updated.dependentCitizenIds.length === 0
	)
		delete households[household.householdId];
	else households[household.householdId] = updated;
	return evolve(state, {
		citizens: {
			...state.citizens,
			[citizenId]: { ...current, householdId: null },
		},
		households,
	});
}

/** Bounded departure: updates one known person and never creates population. */
export function departCitizen(
	state: CivilizationState,
	citizenId: string,
	atSimulationTime: number,
): CivilizationState {
	simulationTime(atSimulationTime);
	const current = citizen(state, citizenId);
	if (current.residenceState !== "resident")
		throw new CivilizationError(
			"INVALID_STATE",
			"only a resident citizen may depart",
		);
	if (current.householdId !== null)
		throw new CivilizationError(
			"PREREQUISITE_UNMET",
			"citizen must leave their household before departure",
		);
	return evolve(
		state,
		{
			citizens: {
				...state.citizens,
				[citizenId]: {
					...current,
					residenceState: "departed",
					departedAtSimulationTime: atSimulationTime,
				},
			},
		},
		atSimulationTime,
	);
}

/** Bounded return/arrival for an already-known person. */
export function arriveCitizen(
	state: CivilizationState,
	input: {
		readonly citizenId: string;
		readonly settlementId: string;
		readonly siteId: string;
	},
	atSimulationTime: number,
): CivilizationState {
	simulationTime(atSimulationTime);
	const current = citizen(state, input.citizenId);
	if (current.residenceState !== "departed")
		throw new CivilizationError(
			"INVALID_STATE",
			"only a departed citizen may arrive",
		);
	requireReference(
		state.references.settlementIds,
		input.settlementId,
		"settlement",
	);
	requireReference(state.references.siteIds, input.siteId, "site");
	return evolve(
		state,
		{
			citizens: {
				...state.citizens,
				[input.citizenId]: {
					...current,
					settlementId: input.settlementId,
					siteId: input.siteId,
					residenceState: "resident",
					arrivedAtSimulationTime: atSimulationTime,
					departedAtSimulationTime: null,
				},
			},
		},
		atSimulationTime,
	);
}

export function registerRelationship(
	state: CivilizationState,
	relationship: CivilizationRelationshipState,
): CivilizationState {
	identifier(relationship.relationshipId, "relationshipId");
	if (state.relationships[relationship.relationshipId] !== undefined)
		throw new CivilizationError(
			"ALREADY_EXISTS",
			`relationship ${relationship.relationshipId} already exists`,
		);
	if (relationship.fromCitizenId === relationship.toCitizenId)
		throw new CivilizationError(
			"INVALID_INPUT",
			"relationship cannot target the same citizen",
		);
	citizen(state, relationship.fromCitizenId);
	citizen(state, relationship.toCitizenId);
	for (const [label, value] of [
		["familiarity", relationship.familiarityBasisPoints],
		["trust", relationship.trustBasisPoints],
		["strain", relationship.strainBasisPoints],
	] as const)
		assertBasisPoints(value, label);
	simulationTime(
		relationship.lastInteractionSimulationTime,
		"relationship interaction time",
	);
	if (relationship.lastInteractionSimulationTime > state.simulationTime)
		throw new CivilizationError(
			"INVALID_INPUT",
			"relationship interaction is from the future",
		);
	if (
		Object.values(state.relationships).some(
			(value) =>
				value.fromCitizenId === relationship.fromCitizenId &&
				value.toCitizenId === relationship.toCitizenId,
		)
	)
		throw new CivilizationError(
			"ALREADY_EXISTS",
			"directed citizen relationship already exists",
		);
	return evolve(state, {
		relationships: {
			...state.relationships,
			[relationship.relationshipId]: { ...relationship },
		},
	});
}
