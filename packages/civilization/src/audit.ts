import type { ResourceTypeId, StockOwner } from "@eonfolk/protocol";

import type { AccountingAudit, CivilizationState } from "./types.js";

function ownerKey(owner: StockOwner): string {
	switch (owner.kind) {
		case "citizen":
			return `citizen:${owner.citizenId}`;
		case "household":
			return `household:${owner.householdId}`;
		case "institution":
			return `institution:${owner.institutionId}`;
		case "settlement":
			return `settlement:${owner.settlementId}`;
		case "project":
			return `project:${owner.projectId}`;
	}
}

export function auditCivilizationState(
	state: CivilizationState,
): AccountingAudit {
	const issues: string[] = [];
	const reconstructed: Record<string, number> = {};
	const consumedByProjectResource: Record<string, number> = {};
	const seenEntries = new Set<string>();
	for (const entry of state.accounting) {
		if (seenEntries.has(entry.entryId))
			issues.push(`duplicate accounting entry ${entry.entryId}`);
		seenEntries.add(entry.entryId);
		if (entry.simulationTime > state.simulationTime)
			issues.push(`accounting entry ${entry.entryId} is from the future`);
		if (
			(entry.kind === "recipe-input" || entry.kind === "recipe-output") &&
			(entry.recipeId === null || state.recipes[entry.recipeId] === undefined)
		) {
			issues.push(
				`accounting entry ${entry.entryId} lacks an authorized recipe`,
			);
		}
		if (
			entry.kind === "project-consumption" &&
			(entry.projectId === null ||
				state.projects[entry.projectId] === undefined)
		) {
			issues.push(
				`accounting entry ${entry.entryId} lacks an authorized project`,
			);
		}
		const byResource: Record<string, number> = {};
		for (const delta of entry.stockDeltas) {
			const stock = state.stocks[delta.stockId];
			if (stock === undefined)
				issues.push(
					`accounting entry ${entry.entryId} references missing stock ${delta.stockId}`,
				);
			else
				byResource[stock.resourceTypeId] =
					(byResource[stock.resourceTypeId] ?? 0) + delta.quantityDelta;
			reconstructed[delta.stockId] =
				(reconstructed[delta.stockId] ?? 0) + delta.quantityDelta;
			if ((reconstructed[delta.stockId] ?? 0) < 0)
				issues.push(
					`accounting entry ${entry.entryId} overdraws ${delta.stockId}`,
				);
		}
		if (
			entry.kind === "stock-created" &&
			(entry.stockDeltas.length !== 1 ||
				entry.stockDeltas[0]?.quantityDelta === undefined ||
				entry.stockDeltas[0].quantityDelta < 0)
		)
			issues.push(
				`accounting entry ${entry.entryId} is not a valid stock creation`,
			);
		if (
			entry.kind === "transfer" &&
			Object.values(byResource).some((net) => net !== 0)
		)
			issues.push(
				`accounting entry ${entry.entryId} does not conserve its transferred resource`,
			);
		if (entry.kind === "recipe-input" && entry.recipeId !== null) {
			const recipe = state.recipes[entry.recipeId];
			if (recipe !== undefined)
				for (const flow of recipe.inputs)
					if (byResource[flow.resourceTypeId] !== -flow.quantity)
						issues.push(
							`accounting entry ${entry.entryId} does not match recipe input ${flow.resourceTypeId}`,
						);
		}
		if (entry.kind === "recipe-output" && entry.recipeId !== null) {
			const recipe = state.recipes[entry.recipeId];
			if (recipe !== undefined) {
				const expected: Record<string, number> = {};
				for (const flow of [...recipe.outputs, ...recipe.byproducts])
					expected[flow.resourceTypeId] =
						(expected[flow.resourceTypeId] ?? 0) + flow.quantity;
				for (const [resourceTypeId, expectedQuantity] of Object.entries(
					expected,
				))
					if (byResource[resourceTypeId] !== expectedQuantity)
						issues.push(
							`accounting entry ${entry.entryId} does not match recipe output ${resourceTypeId}`,
						);
			}
		}
		if (entry.kind === "project-consumption" && entry.projectId !== null) {
			for (const [resourceTypeId, net] of Object.entries(byResource))
				consumedByProjectResource[`${entry.projectId}:${resourceTypeId}`] =
					(consumedByProjectResource[`${entry.projectId}:${resourceTypeId}`] ??
						0) - net;
		}
	}

	const totals: Record<ResourceTypeId, number> = {};
	for (const stock of Object.values(state.stocks)) {
		if (state.resourceDefinitions[stock.resourceTypeId] === undefined)
			issues.push(`stock ${stock.stockId} has no resource definition`);
		const storage = state.storages[stock.storageId];
		if (storage === undefined)
			issues.push(`stock ${stock.stockId} has no storage`);
		else {
			if (ownerKey(storage.owner) !== ownerKey(stock.owner))
				issues.push(`stock ${stock.stockId} owner differs from storage owner`);
			if (!storage.acceptedResourceTypeIds.includes(stock.resourceTypeId))
				issues.push(
					`storage ${storage.storageId} rejects ${stock.resourceTypeId}`,
				);
			const capacity = storage.capacityByResource[stock.resourceTypeId];
			if (capacity === undefined || stock.quantity > capacity)
				issues.push(`stock ${stock.stockId} exceeds storage capacity`);
		}
		if (
			stock.quantity < 0 ||
			stock.reservedQuantity < 0 ||
			stock.reservedQuantity > stock.quantity
		)
			issues.push(`stock ${stock.stockId} has invalid quantities`);
		if ((reconstructed[stock.stockId] ?? 0) !== stock.quantity)
			issues.push(
				`stock ${stock.stockId} does not match its accounting history`,
			);
		totals[stock.resourceTypeId] =
			(totals[stock.resourceTypeId] ?? 0) + stock.quantity;
	}
	for (const project of Object.values(state.projects)) {
		const expected: Record<string, number> = {};
		for (const milestone of project.milestones) {
			for (const resource of milestone.resources)
				expected[resource.resourceTypeId] =
					(expected[resource.resourceTypeId] ?? 0) + resource.consumedQuantity;
		}
		for (const [resourceTypeId, consumed] of Object.entries(expected))
			if (
				(consumedByProjectResource[`${project.projectId}:${resourceTypeId}`] ??
					0) !== consumed
			)
				issues.push(
					`project ${project.projectId} consumption accounting differs for ${resourceTypeId}`,
				);
	}

	return {
		ok: issues.length === 0,
		issues: issues.sort(),
		stockTotalsByResource: totals,
		reconstructedStockQuantities: reconstructed,
	};
}

export function assertCivilizationInvariants(state: CivilizationState): void {
	const audit = auditCivilizationState(state);
	if (!audit.ok)
		throw new Error(
			`civilization invariant failure: ${audit.issues.join("; ")}`,
		);
}
