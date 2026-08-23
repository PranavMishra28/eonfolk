import {
	type AuthorityEventRecord,
	createAuthorityEvent,
	createAuthorityHead,
	createAuthoritySnapshot,
	hashAuthoritativeState,
} from "@eonfolk/persistence";
import { describe, expect, it } from "vitest";

import { projectResearchEvidence } from "./research-evidence";

const runId = "v1-generated-civilization";
const regionId = "riverhold-release-genesis";
const engineVersion = "release-genesis-engine-v1";
const stateSchemaVersion = "release-genesis-state-v1";
const streamKey = JSON.stringify([runId, regionId]);
const initialHash = "0".repeat(64);

async function event(
	input: Readonly<{
		sequence: number;
		eventId: string;
		eventType: string;
		previousEventHash: string;
		preStateHash: string;
		postStateHash: string;
		payload: unknown;
		causalParents?: AuthorityEventRecord["causalParents"];
		mechanismId: string;
	}>,
): Promise<AuthorityEventRecord> {
	return await createAuthorityEvent({
		runId,
		regionId,
		engineVersion,
		stateSchemaVersion,
		appendId: `append-${String(input.sequence)}`,
		batchId: `batch-${String(input.sequence)}`,
		eventId: input.eventId,
		sequence: input.sequence,
		simulationTime: input.sequence * 60,
		eventType: input.eventType,
		causalParents: input.causalParents ?? [],
		visibility:
			input.eventType === "CivilizationCounselBoundaryCommitted"
				? {
						kind: "patron-visible-through-covenant",
						subjectCitizenId: "citizen-01",
					}
				: { kind: "patron-visible-through-covenant" },
		provenance: {
			mechanismId: input.mechanismId,
			cognitionDecisionId:
				input.eventType === "CivilizationCounselBoundaryCommitted"
					? "decision-mara-01"
					: null,
			brainKind:
				input.eventType === "CivilizationCounselBoundaryCommitted"
					? "standard"
					: null,
		},
		preStateHash: input.preStateHash,
		postStateHash: input.postStateHash,
		previousEventHash: input.previousEventHash,
		payload: input.payload as never,
	});
}

async function acceptedRows(options?: Readonly<{ withoutBoundary?: boolean }>) {
	const finalState = {
		civilization: {
			citizens: {
				"citizen-01": { name: "Mara Vale" },
				"citizen-02": { name: "Toma Reed" },
			},
		},
	};
	const finalStateHash = await hashAuthoritativeState(finalState);
	const sponsored = await event({
		sequence: 1,
		eventId: "event-sponsorship-mara",
		eventType: "CivilizationSponsorCommandCommitted",
		previousEventHash: initialHash,
		preStateHash: initialHash,
		postStateHash: "1".repeat(64),
		mechanismId: "sponsor.SponsorshipEstablished.v1",
		payload: {
			protocolEvent: {
				visibility: { kind: "public" },
				eventPayload: {
					kind: "SponsorshipEstablished",
					citizenId: "citizen-01",
					patronPrincipalId: "patron:local",
				},
			},
		},
	});
	const interpreted = await event({
		sequence: 2,
		eventId: "event-interpretation-mara",
		eventType: "CivilizationSponsorCommandCommitted",
		previousEventHash: sponsored.eventHash,
		preStateHash: sponsored.postStateHash,
		postStateHash: options?.withoutBoundary ? finalStateHash : "2".repeat(64),
		mechanismId: "sponsor.CounselInterpreted.v1",
		payload: {
			protocolEvent: {
				visibility: { kind: "patron-visible-through-covenant" },
				eventPayload: {
					kind: "CounselInterpreted",
					citizenId: "citizen-01",
					interventionId: "intervention-market-01",
					action: "accuse-publicly",
					disposition: "accepted",
				},
			},
		},
	});
	const events = [sponsored, interpreted];
	if (!options?.withoutBoundary) {
		events.push(
			await event({
				sequence: 3,
				eventId: "event-boundary-mara",
				eventType: "CivilizationCounselBoundaryCommitted",
				previousEventHash: interpreted.eventHash,
				preStateHash: interpreted.postStateHash,
				postStateHash: finalStateHash,
				mechanismId: "civilization.scheduler.counsel-boundary.v1",
				causalParents: [
					{
						eventId: interpreted.eventId,
						relation: "contributing-condition",
					},
				],
				payload: {
					transitionKind: "counsel-boundary",
					fact: {
						schemaVersion: "eonfolk-counsel-boundary-fact-v4",
						citizenId: "citizen-01",
						interventionId: "intervention-market-01",
						interpretationEventId: interpreted.eventId,
						interpretationAction: "accuse-publicly",
						interpretationDisposition: "accepted",
						causalRelation: "contributing-condition",
						requiredNeedUnits: 4,
						consumedNeedUnits: 3,
						unmetNeedUnits: 1,
						simulationTime: 180,
						effect: {
							kind: "public-allegation",
							statementRecordId: "statement-market-01",
							targetCitizenId: "citizen-02",
							relationshipId: "relationship-mara-toma",
							trustDeltaBasisPoints: -400,
							strainDeltaBasisPoints: 600,
						},
					},
				},
			}),
		);
	}
	const lastEvent = events.at(-1);
	if (lastEvent === undefined) throw new Error("fixture event missing");
	const head = await createAuthorityHead({
		runId,
		regionId,
		engineVersion,
		stateSchemaVersion,
		revision: events.length,
		lastSequence: events.length,
		simulationTime: lastEvent.simulationTime,
		stateHash: finalStateHash,
		lastEventHash: lastEvent.eventHash,
		fencingToken: 1,
	});
	const snapshot = await createAuthoritySnapshot({
		runId,
		regionId,
		engineVersion,
		stateSchemaVersion,
		snapshotId: "snapshot-current",
		revision: head.revision,
		baseSequence: head.lastSequence,
		simulationTime: head.simulationTime,
		lastEventHash: head.lastEventHash,
		state: finalState,
	});
	return {
		streams: [
			{ key: streamKey, genesis: {}, head, operationCount: events.length },
		],
		events: events.map((value) => ({
			key: JSON.stringify([runId, regionId, value.sequence]),
			streamKey,
			value,
		})),
		snapshots: [
			{
				key: JSON.stringify([runId, regionId, snapshot.snapshotId]),
				streamKey,
				value: snapshot,
			},
		],
	};
}

describe("Release Genesis research evidence projection", () => {
	it("projects a verified accepted beat without promoting its allegation", async () => {
		const result = await projectResearchEvidence(await acceptedRows());
		expect(result.status).toBe("available");
		if (result.status !== "available") return;
		expect(result.beat).toMatchObject({
			citizenId: "citizen-01",
			citizenName: "Mara Vale",
			acceptedEventIds: ["event-boundary-mara", "event-interpretation-mara"],
			causalRelation: "contributing-condition",
			mechanismId: "civilization.scheduler.counsel-boundary.v1",
			allegation: {
				speakerName: "Mara Vale",
				targetName: "Toma Reed",
				factualStatus: "allegation-recorded-claim-unproven",
			},
		});
		expect(result.beat.summary).toContain("not that the allegation was true");
	});

	it("fails closed when a causal relation is altered after acceptance", async () => {
		const rows = await acceptedRows();
		const boundaryRow = rows.events[2];
		if (boundaryRow === undefined) throw new Error("fixture boundary missing");
		const boundary = boundaryRow.value;
		const result = await projectResearchEvidence({
			...rows,
			events: [
				...rows.events.slice(0, 2),
				{
					...boundaryRow,
					value: {
						...boundary,
						causalParents: [
							{
								eventId: "event-interpretation-mara",
								relation: "temporal-predecessor",
							},
						],
					},
				},
			],
		});
		expect(result).toEqual({
			status: "unavailable",
			reason: "unverified-authority",
		});
	});

	it("rejects a self-hashed snapshot detached from its accepted base event", async () => {
		const rows = await acceptedRows();
		const originalRow = rows.snapshots[0];
		if (originalRow === undefined) throw new Error("fixture snapshot missing");
		const original = originalRow.value;
		const forged = await createAuthoritySnapshot({
			runId: original.runId,
			regionId: original.regionId,
			engineVersion: original.engineVersion,
			stateSchemaVersion: original.stateSchemaVersion,
			snapshotId: original.snapshotId,
			revision: original.revision,
			baseSequence: original.baseSequence,
			simulationTime: original.simulationTime,
			lastEventHash: original.lastEventHash,
			state: {
				civilization: {
					citizens: {
						"citizen-01": { name: "Forged Mara" },
						"citizen-02": { name: "Forged Toma" },
					},
				},
			},
		});
		expect(forged.stateHash).not.toBe(original.stateHash);
		const result = await projectResearchEvidence({
			...rows,
			snapshots: [{ ...originalRow, value: forged }],
		});
		expect(result).toEqual({
			status: "unavailable",
			reason: "unverified-authority",
		});
	});

	it("reports an honest empty state before a consequence is accepted", async () => {
		const result = await projectResearchEvidence(
			await acceptedRows({ withoutBoundary: true }),
		);
		expect(result).toEqual({ status: "empty", reason: "no-chronicle-beat" });
	});
});
