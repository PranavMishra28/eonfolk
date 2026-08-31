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
	if (state.schemaVersion !== "eonfolk-civilization-kernel-v5")
		issues.push(
			`unsupported civilization schema ${String(state.schemaVersion)}`,
		);
	const householdByCitizen = new Map<string, string>();
	for (const [citizenId, citizen] of Object.entries(state.citizens)) {
		if (citizen.citizenId !== citizenId)
			issues.push(`citizen key ${citizenId} differs from its identifier`);
		if (!state.references.citizenIds.includes(citizenId))
			issues.push(`citizen ${citizenId} lacks a genesis reference`);
		if (
			citizen.name.length < 1 ||
			citizen.name !== citizen.name.trim() ||
			citizen.valueIds.length < 1 ||
			new Set(citizen.valueIds).size !== citizen.valueIds.length
		)
			issues.push(`citizen ${citizenId} lacks canonical identity`);
		if (!state.references.settlementIds.includes(citizen.settlementId))
			issues.push(`citizen ${citizenId} has an unknown settlement`);
		if (!state.references.siteIds.includes(citizen.siteId))
			issues.push(`citizen ${citizenId} has an unknown site`);
		if (
			citizen.foodRequiredUnitsPerDay < 1 ||
			citizen.waterRequiredUnitsPerDay < 1 ||
			citizen.committedLaborSecondsPerDay < 0 ||
			citizen.committedLaborSecondsPerDay > citizen.laborCapacitySecondsPerDay
		)
			issues.push(`citizen ${citizenId} has invalid needs or labor`);
		if (
			(citizen.residenceState === "departed") !==
			(citizen.departedAtSimulationTime !== null)
		)
			issues.push(`citizen ${citizenId} has inconsistent departure state`);
	}
	for (const [householdId, household] of Object.entries(state.households)) {
		const residents = [
			...household.memberCitizenIds,
			...household.dependentCitizenIds,
		];
		if (residents.length === 0 || new Set(residents).size !== residents.length)
			issues.push(`household ${householdId} has invalid residents`);
		for (const citizenId of residents) {
			const prior = householdByCitizen.get(citizenId);
			if (prior !== undefined)
				issues.push(
					`citizen ${citizenId} belongs to households ${prior} and ${householdId}`,
				);
			householdByCitizen.set(citizenId, householdId);
			const citizen = state.citizens[citizenId];
			if (citizen !== undefined && citizen.householdId !== householdId)
				issues.push(
					`citizen ${citizenId} does not link back to household ${householdId}`,
				);
		}
	}
	for (const [relationshipId, relationship] of Object.entries(
		state.relationships,
	)) {
		if (relationship.relationshipId !== relationshipId)
			issues.push(
				`relationship key ${relationshipId} differs from its identifier`,
			);
		if (
			state.citizens[relationship.fromCitizenId] === undefined ||
			state.citizens[relationship.toCitizenId] === undefined ||
			relationship.fromCitizenId === relationship.toCitizenId
		)
			issues.push(`relationship ${relationshipId} has invalid citizens`);
		if (
			[
				relationship.familiarityBasisPoints,
				relationship.trustBasisPoints,
				relationship.strainBasisPoints,
			].some(
				(value) => !Number.isSafeInteger(value) || value < 0 || value > 10_000,
			)
		)
			issues.push(`relationship ${relationshipId} has invalid ratings`);
	}
	for (const [citizenId, mind] of Object.entries(state.minds)) {
		const citizen = state.citizens[citizenId];
		if (
			mind.schemaVersion !== "eonfolk-civilization-mind-v1" ||
			mind.citizenId !== citizenId ||
			mind.snapshot.citizenId !== citizenId ||
			citizen === undefined
		)
			issues.push(`mind ${citizenId} has invalid identity`);
		if (
			!Number.isSafeInteger(mind.committedAtRevision) ||
			mind.committedAtRevision < 0 ||
			mind.committedAtRevision >= state.revision ||
			!Number.isSafeInteger(mind.committedAtSimulationTime) ||
			mind.committedAtSimulationTime < 0 ||
			mind.committedAtSimulationTime > state.simulationTime
		)
			issues.push(`mind ${citizenId} has an invalid commitment boundary`);
		if (
			citizen !== undefined &&
			(mind.snapshot.values.length !== citizen.valueIds.length ||
				new Set(mind.snapshot.values.map(({ valueId }) => valueId)).size !==
					mind.snapshot.values.length ||
				mind.snapshot.values.some(
					(value) =>
						!citizen.valueIds.includes(value.valueId) ||
						!Number.isSafeInteger(value.weight) ||
						value.weight < 0,
				))
		)
			issues.push(`mind ${citizenId} has invalid values`);
		for (const relationship of mind.snapshot.relationships) {
			const canonical = state.relationships[relationship.relationshipId];
			if (
				canonical === undefined ||
				canonical.fromCitizenId !== citizenId ||
				canonical.fromCitizenId !== relationship.fromCitizenId ||
				canonical.toCitizenId !== relationship.toCitizenId ||
				canonical.familiarityBasisPoints !== relationship.familiarity ||
				canonical.trustBasisPoints !== relationship.trust ||
				canonical.strainBasisPoints !== relationship.strain
			)
				issues.push(
					`mind ${citizenId} has stale relationship ${relationship.relationshipId}`,
				);
		}
		const provenanceIds = new Set(
			state.provenance.map(({ eventId }) => eventId),
		);
		for (const record of mind.snapshot.records)
			if (
				record.subjectCitizenId !== citizenId ||
				record.sourceIds.length === 0 ||
				record.sourceIds.some(
					(sourceId) =>
						!state.citizens[citizenId]?.sourceEventIds.includes(sourceId),
				) ||
				record.sourceIds.some((sourceId) => !provenanceIds.has(sourceId))
			)
				issues.push(
					`mind ${citizenId} has unauthoritative record ${record.recordId}`,
				);
		if (
			mind.snapshot.standingPlan.citizenId !== citizenId ||
			mind.snapshot.standingPlan.status !== "active" ||
			mind.snapshot.standingPlan.targetIds.some(
				(targetId) =>
					targetId !== citizenId &&
					state.citizens[targetId] === undefined &&
					!state.references.siteIds.includes(targetId) &&
					((mind.snapshot.standingPlan.sourceId !==
						"eonfolk-civilization-scheduler-brain-v1" &&
						mind.snapshot.standingPlan.sourceId !== "routine-planner-v1") ||
						!/^[a-z0-9][a-z0-9._:-]*$/u.test(targetId)),
			)
		)
			issues.push(`mind ${citizenId} has another citizen's standing plan`);
	}
	const sponsoredCitizens = new Set<string>();
	const sponsorPrincipals = new Set<string>();
	if (
		Object.keys(state.sponsorships).length > state.references.citizenIds.length
	)
		issues.push("sponsorship count exceeds the finite citizen population");
	for (const [covenantId, sponsorship] of Object.entries(state.sponsorships)) {
		if (
			sponsorship.schemaVersion !== "eonfolk-civilization-sponsorship-v1" ||
			sponsorship.covenantId !== covenantId
		)
			issues.push(`sponsorship ${covenantId} has invalid identity`);
		const beneficiary = state.citizens[sponsorship.beneficiaryCitizenId];
		if (
			beneficiary === undefined ||
			!state.references.settlementIds.includes(sponsorship.settlementId)
		)
			issues.push(`sponsorship ${covenantId} has invalid locality`);
		if (
			!Number.isSafeInteger(sponsorship.establishedAtSimulationTime) ||
			sponsorship.establishedAtSimulationTime < 0 ||
			sponsorship.establishedAtSimulationTime > state.simulationTime
		)
			issues.push(`sponsorship ${covenantId} has invalid establishment time`);
		if (
			!Number.isSafeInteger(sponsorship.establishedAtRevision) ||
			sponsorship.establishedAtRevision < 1 ||
			sponsorship.establishedAtRevision > state.revision
		)
			issues.push(`sponsorship ${covenantId} has invalid grant revision`);
		if (
			beneficiary !== undefined &&
			!beneficiary.sourceEventIds.includes(sponsorship.sourceEventId)
		)
			issues.push(`sponsorship ${covenantId} lacks its citizen source event`);
		if (
			!state.provenance.some(
				(provenance) =>
					provenance.eventId === sponsorship.sourceEventId &&
					provenance.mechanismId === "sponsor.covenant.established.v1",
			)
		)
			issues.push(`sponsorship ${covenantId} lacks canonical provenance`);
		if (sponsoredCitizens.has(sponsorship.beneficiaryCitizenId))
			issues.push(
				`citizen ${sponsorship.beneficiaryCitizenId} has multiple sponsorships`,
			);
		if (sponsorPrincipals.has(sponsorship.patronPrincipalId))
			issues.push(
				`patron ${sponsorship.patronPrincipalId} has multiple sponsorships`,
			);
		sponsoredCitizens.add(sponsorship.beneficiaryCitizenId);
		sponsorPrincipals.add(sponsorship.patronPrincipalId);
	}
	for (const [abstentionId, abstention] of Object.entries(
		state.patronAbstentions,
	)) {
		const sponsorship = state.sponsorships[abstention.covenantId];
		if (
			abstention.schemaVersion !==
				"eonfolk-civilization-patron-abstention-v1" ||
			abstention.abstentionId !== abstentionId ||
			abstention.reason !== "withhold-counsel" ||
			sponsorship?.beneficiaryCitizenId !== abstention.citizenId ||
			sponsorship.patronPrincipalId !== abstention.patronPrincipalId ||
			abstention.recordedAtSimulationTime > state.simulationTime ||
			abstention.recordedAtRevision > state.revision ||
			!state.provenance.some(
				(provenance) =>
					provenance.eventId === abstention.sourceEventId &&
					provenance.mechanismId === "sponsor.patron.abstained.v1",
			)
		)
			issues.push(`patron abstention ${abstentionId} is not authoritative`);
	}
	for (const [interventionId, counsel] of Object.entries(state.counsels)) {
		const sponsorship = state.sponsorships[counsel.covenantId];
		if (
			counsel.schemaVersion !== "eonfolk-civilization-counsel-v1" ||
			counsel.interventionId !== interventionId ||
			sponsorship === undefined ||
			sponsorship.beneficiaryCitizenId !== counsel.citizenId
		)
			issues.push(`counsel ${interventionId} has invalid authority`);
		if (
			!Number.isSafeInteger(counsel.issuedAtSimulationTime) ||
			counsel.issuedAtSimulationTime < 0 ||
			counsel.issuedAtSimulationTime > state.simulationTime ||
			(counsel.intent !== "verify-reserve" &&
				counsel.intent !== "accuse-publicly")
		)
			issues.push(`counsel ${interventionId} has invalid issue semantics`);
		if (
			!state.provenance.some(
				(provenance) =>
					provenance.eventId === counsel.sourceEventId &&
					provenance.mechanismId === "sponsor.counsel.issued.v1",
			)
		)
			issues.push(`counsel ${interventionId} lacks canonical provenance`);
		const counseledCitizen = state.citizens[counsel.citizenId];
		if (
			counseledCitizen === undefined ||
			!counseledCitizen.sourceEventIds.includes(counsel.sourceEventId)
		)
			issues.push(`counsel ${interventionId} lacks its citizen source event`);
		if (
			counsel.resolution !== null &&
			(counsel.resolution.decisionId.length === 0 ||
				counsel.resolution.proposalId.length === 0 ||
				(counsel.resolution.action !== "verify-reserve" &&
					counsel.resolution.action !== "accuse-publicly" &&
					counsel.resolution.action !== "follow-plan") ||
				(counsel.resolution.disposition !== "accepted" &&
					counsel.resolution.disposition !== "delayed" &&
					counsel.resolution.disposition !== "rejected" &&
					counsel.resolution.disposition !== "reinterpreted") ||
				!counseledCitizen?.sourceEventIds.includes(
					counsel.resolution.sourceEventId,
				))
		)
			issues.push(`counsel ${interventionId} has invalid resolution semantics`);
		if (
			counsel.resolution !== null &&
			!state.provenance.some(
				(provenance) =>
					provenance.eventId === counsel.resolution?.sourceEventId &&
					provenance.mechanismId === "brain.counsel.interpreted.v1",
			)
		)
			issues.push(`counsel ${interventionId} lacks resolution provenance`);
	}
	for (const [outcomeId, outcome] of Object.entries(state.counselOutcomes)) {
		const counsel = state.counsels[outcome.interventionId];
		if (
			outcome.schemaVersion !== "eonfolk-civilization-counsel-outcome-v1" ||
			outcome.outcomeId !== outcomeId ||
			counsel?.citizenId !== outcome.citizenId ||
			counsel.resolution?.sourceEventId !== outcome.interpretationEventId ||
			outcome.recordedAtSimulationTime > state.simulationTime ||
			outcome.recordedAtRevision > state.revision ||
			!state.provenance.some(
				(provenance) =>
					provenance.eventId === outcome.sourceEventId &&
					provenance.mechanismId ===
						"civilization.scheduler.counsel-outcome.v1",
			)
		)
			issues.push(`counsel outcome ${outcomeId} is not authoritative`);
		if (outcome.effect.kind === "reserve-inspection") {
			const effect = outcome.effect;
			const record = state.minds[outcome.citizenId]?.snapshot.records.find(
				(candidate) => candidate.recordId === effect.observationRecordId,
			);
			if (
				record?.kind !== "observation" ||
				!record.sourceIds.includes(outcome.sourceEventId) ||
				effect.stockObservations.length === 0 ||
				effect.stockObservations.some(
					(observation) =>
						state.stocks[observation.stockId]?.resourceTypeId !==
							observation.resourceTypeId || observation.quantity < 0,
				)
			)
				issues.push(`counsel outcome ${outcomeId} has invalid inspection`);
		} else if (outcome.effect.kind === "public-allegation") {
			const effect = outcome.effect;
			const relationship = state.relationships[effect.relationshipId];
			const record = state.minds[outcome.citizenId]?.snapshot.records.find(
				(candidate) => candidate.recordId === effect.statementRecordId,
			);
			if (
				record?.kind !== "message-claim" ||
				record.visibility.kind !== "public" ||
				relationship?.fromCitizenId !== outcome.citizenId ||
				relationship.toCitizenId !== effect.targetCitizenId ||
				!relationship.sourceEventIds.includes(outcome.sourceEventId)
			)
				issues.push(`counsel outcome ${outcomeId} has invalid allegation`);
		}
	}
	for (const [institutionId, institution] of Object.entries(
		state.institutions,
	)) {
		for (const role of institution.roles) {
			const active = institution.memberships.filter(
				(membership) =>
					membership.roleId === role.roleId &&
					membership.leftAtSimulationTime === null,
			);
			if (active.length > role.capacity)
				issues.push(
					`institution ${institutionId} exceeds role ${role.roleId} capacity`,
				);
			if (
				new Set(active.map(({ citizenId }) => citizenId)).size !== active.length
			)
				issues.push(
					`institution ${institutionId} repeats an active membership`,
				);
		}
	}
	const reconstructed: Record<string, number> = {
		...(state.accountingCheckpoint?.stockQuantities ?? {}),
	};
	const consumedByProjectResource: Record<string, number> = {
		...(state.accountingCheckpoint?.consumedByProjectResource ?? {}),
	};
	if (
		state.accountingCheckpoint !== null &&
		state.accountingCheckpoint.simulationTime > state.simulationTime
	)
		issues.push("accounting checkpoint is from the future");
	for (const [stockId, checkpointQuantity] of Object.entries(
		state.accountingCheckpoint?.stockQuantities ?? {},
	))
		if (state.stocks[stockId] === undefined || checkpointQuantity < 0)
			issues.push(`accounting checkpoint has invalid stock ${stockId}`);
	for (const value of Object.values(state.schedulerTotals))
		if (!Number.isSafeInteger(value) || value < 0)
			issues.push("scheduler totals contain an invalid quantity");
	const consumedByCitizenTime: Record<string, number> = {};
	const consumedByCitizenTimeResource: Record<string, number> = {};
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
		if (
			entry.kind === "need-consumption" &&
			(entry.subjectCitizenId === undefined ||
				state.citizens[entry.subjectCitizenId] === undefined)
		)
			issues.push(
				`accounting entry ${entry.entryId} lacks a need subject citizen`,
			);
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
			(entry.kind === "transfer" || entry.kind === "transport") &&
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
		if (entry.kind === "need-consumption") {
			if (Object.values(byResource).some((net) => net > 0))
				issues.push(
					`accounting entry ${entry.entryId} creates a consumed need resource`,
				);
			if (entry.subjectCitizenId !== undefined)
				consumedByCitizenTime[
					`${entry.subjectCitizenId}:${entry.simulationTime}`
				] = -Object.values(byResource).reduce((sum, net) => sum + net, 0);
			if (entry.subjectCitizenId !== undefined)
				for (const [resourceTypeId, net] of Object.entries(byResource))
					consumedByCitizenTimeResource[
						`${entry.subjectCitizenId}:${entry.simulationTime}:${resourceTypeId}`
					] = -net;
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
	const seenNeedOutcomes = new Set<string>();
	for (const outcome of state.needOutcomes) {
		if (seenNeedOutcomes.has(outcome.outcomeId))
			issues.push(`duplicate need outcome ${outcome.outcomeId}`);
		seenNeedOutcomes.add(outcome.outcomeId);
		if (state.citizens[outcome.citizenId] === undefined)
			issues.push(`need outcome ${outcome.outcomeId} has unknown citizen`);
		if (
			outcome.outcomeId !==
			`need:${outcome.citizenId}:${outcome.evaluatedAtSimulationTime}`
		)
			issues.push(`need outcome ${outcome.outcomeId} has a non-canonical id`);
		if (outcome.evaluatedAtSimulationTime > state.simulationTime)
			issues.push(`need outcome ${outcome.outcomeId} is from the future`);
		if (
			outcome.foodConsumedUnits < 0 ||
			outcome.foodConsumedUnits > outcome.foodRequiredUnits ||
			outcome.waterConsumedUnits < 0 ||
			outcome.waterConsumedUnits > outcome.waterRequiredUnits
		)
			issues.push(`need outcome ${outcome.outcomeId} has invalid quantities`);
		if (
			outcome.foodResourceTypeIds.length === 0 ||
			outcome.waterResourceTypeIds.length === 0 ||
			outcome.foodResourceTypeIds.some((resourceTypeId) =>
				outcome.waterResourceTypeIds.includes(resourceTypeId),
			)
		)
			issues.push(
				`need outcome ${outcome.outcomeId} has invalid resource classes`,
			);
		const expectedConsumed =
			outcome.foodConsumedUnits + outcome.waterConsumedUnits;
		if (
			(consumedByCitizenTime[
				`${outcome.citizenId}:${outcome.evaluatedAtSimulationTime}`
			] ?? 0) !== expectedConsumed
		)
			issues.push(`need outcome ${outcome.outcomeId} differs from accounting`);
		const consumedFor = (resourceTypeIds: readonly string[]) =>
			resourceTypeIds.reduce(
				(sum, resourceTypeId) =>
					sum +
					(consumedByCitizenTimeResource[
						`${outcome.citizenId}:${outcome.evaluatedAtSimulationTime}:${resourceTypeId}`
					] ?? 0),
				0,
			);
		if (consumedFor(outcome.foodResourceTypeIds) !== outcome.foodConsumedUnits)
			issues.push(
				`need outcome ${outcome.outcomeId} has wrong food accounting`,
			);
		if (
			consumedFor(outcome.waterResourceTypeIds) !== outcome.waterConsumedUnits
		)
			issues.push(
				`need outcome ${outcome.outcomeId} has wrong water accounting`,
			);
		for (const stockId of outcome.sourceStockIds)
			if (state.stocks[stockId] === undefined)
				issues.push(
					`need outcome ${outcome.outcomeId} has unknown source stock`,
				);
		if (new Set(outcome.sourceStockIds).size !== outcome.sourceStockIds.length)
			issues.push(`need outcome ${outcome.outcomeId} repeats a source stock`);
	}
	for (const key of Object.keys(consumedByCitizenTime)) {
		const separator = key.lastIndexOf(":");
		const citizenId = key.slice(0, separator);
		const atSimulationTime = Number(key.slice(separator + 1));
		if (
			!state.needOutcomes.some(
				(outcome) =>
					outcome.citizenId === citizenId &&
					outcome.evaluatedAtSimulationTime === atSimulationTime,
			)
		)
			issues.push(`need accounting ${key} has no outcome`);
	}
	for (const [projectId, materialization] of Object.entries(
		state.materializedProjects,
	)) {
		const project = state.projects[projectId];
		if (
			project === undefined ||
			project.state !== "completed" ||
			project.siteId !== materialization.siteId ||
			materialization.projectId !== projectId ||
			materialization.materializedAtSimulationTime > state.simulationTime ||
			(project.endedAtSimulationTime !== null &&
				materialization.materializedAtSimulationTime <
					project.endedAtSimulationTime)
		)
			issues.push(
				`materialized project ${projectId} is not physically complete`,
			);
		if (
			!(
				state.references.buildingKindsBySite[materialization.siteId] ?? []
			).includes(materialization.buildingKind)
		)
			issues.push(
				`materialized project ${projectId} lacks its building reference`,
			);
	}
	for (const [migrationId, journey] of Object.entries(
		state.migrationJourneys,
	)) {
		const migration = state.migrations[migrationId];
		if (migration === undefined) {
			issues.push(`journey ${migrationId} has no migration`);
			continue;
		}
		if (
			journey.routeCellIds.length < 2 ||
			journey.traversalUnitsByLeg.length !== journey.routeCellIds.length - 1
		)
			issues.push(`journey ${migrationId} has invalid route shape`);
		if (
			journey.currentLegIndex < 0 ||
			journey.currentLegIndex > journey.traversalUnitsByLeg.length
		)
			issues.push(`journey ${migrationId} has invalid leg index`);
		const recomputedTotal = journey.traversalUnitsByLeg.reduce(
			(total, units) => total + units,
			0,
		);
		const recomputedCompleted =
			journey.traversalUnitsByLeg
				.slice(0, journey.currentLegIndex)
				.reduce((total, units) => total + units, 0) +
			journey.currentLegProgressUnits;
		if (
			journey.traversalUnitsByLeg.some(
				(units) => !Number.isSafeInteger(units) || units <= 0,
			) ||
			recomputedTotal !== journey.totalTraversalUnits ||
			recomputedCompleted !== journey.completedTraversalUnits ||
			journey.completedTraversalUnits > journey.totalTraversalUnits
		)
			issues.push(`journey ${migrationId} has invalid traversal accounting`);
		const activeLeg = journey.traversalUnitsByLeg[journey.currentLegIndex];
		if (
			journey.currentLegProgressUnits < 0 ||
			(activeLeg === undefined
				? journey.currentLegProgressUnits !== 0
				: journey.currentLegProgressUnits >= activeLeg)
		)
			issues.push(`journey ${migrationId} has invalid leg progress`);
		const complete =
			journey.currentLegIndex === journey.traversalUnitsByLeg.length;
		if ((migration.state === "arrived") !== complete)
			issues.push(`journey ${migrationId} arrival differs from traversal`);
	}
	for (const [foundingId, settlementId] of Object.entries(
		state.materializedFoundings,
	)) {
		const founding = state.foundings[foundingId];
		if (founding === undefined || founding.state !== "viable")
			issues.push(`materialized founding ${foundingId} is not viable`);
		else if (founding.proposedSettlementId !== settlementId)
			issues.push(`materialized founding ${foundingId} has wrong settlement`);
		if (!state.references.settlementIds.includes(settlementId))
			issues.push(`materialized settlement ${settlementId} lacks a reference`);
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
