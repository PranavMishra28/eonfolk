import type { CivilizationState } from "@eonfolk/civilization";
import {
	createCivilizationSponsorSnapshotBoundary,
	prepareCivilizationSponsorTransition,
	type CivilizationSponsorEventEnvelope,
} from "@eonfolk/civilization/sponsor";
import { replayCivilizationHistory } from "@eonfolk/persistence";
import {
	createCivilizationSponsorAuthorityAppend,
	createCivilizationSponsorRejectionAppend,
} from "@eonfolk/persistence/civilization-sponsor";
import {
	payloadFingerprint,
	PROTOCOL_SCHEMA_VERSION,
	stateHash,
	type WorldCommand,
	type WorldCommandPayload,
} from "@eonfolk/protocol";
import { projectCivilizationChronicle } from "@eonfolk/sim/civilization-chronicle";
import { BrowserVersionedPersistence } from "./persistence/browser-versioned";
import { GENERATED_CIVILIZATION_RUN_ID } from "./persistence/generated-civilization";

type SponsorPayload = Extract<
	WorldCommandPayload,
	{ kind: "EstablishSponsorship" | "IssueCounsel" | "ResolveCounsel" }
>;

export interface GeneratedSponsorshipResult {
	readonly citizenId: string;
	readonly eventIds: readonly string[];
	readonly idempotent: boolean;
	readonly chronicleTrace: string;
}

/**
 * Lazy canonical action path. Each step reloads the sole durable authority
 * stream, and Standard Brain resolution occurs inside the trusted reducer.
 */
export async function sponsorGeneratedCitizen(input: {
	readonly citizenId: string;
	readonly regionId: string;
	readonly databaseName: string;
	readonly indexedDbFactory?: IDBFactory;
	readonly includeCounsel?: boolean;
}): Promise<GeneratedSponsorshipResult> {
	const port = await BrowserVersionedPersistence.open({
		factory: input.indexedDbFactory,
		databaseName: input.databaseName,
	});
	const scope = {
		runId: GENERATED_CIVILIZATION_RUN_ID,
		regionId: input.regionId,
	};
	const covenantId = `covenant:${input.citizenId}`;
	const interventionId = `intervention:${input.citizenId}:standing-plan`;
	const decisionId = `decision:${scope.runId}:${input.regionId}:${interventionId}`;
	const proposalId = `proposal:${scope.runId}:${input.regionId}:${interventionId}`;
	const committedEvents: CivilizationSponsorEventEnvelope[] = [];
	const eventRevisions: Record<string, number> = {};
	let allIdempotent = true;

	const commit = async (
		commandId: string,
		principal: WorldCommand["principal"],
		payload: SponsorPayload,
	): Promise<CivilizationState> => {
		const fingerprint = await payloadFingerprint(payload);
		const prior = await port.getAppendReceipt(scope, commandId);
		if (prior !== null) {
			const receipt = prior.commandReceipt as {
				readonly payloadFingerprint?: unknown;
				readonly outcome?: unknown;
				readonly rejectionCode?: unknown;
			} | null;
			if (
				receipt?.payloadFingerprint !== fingerprint ||
				(receipt.outcome !== "accepted" && receipt.outcome !== "rejected")
			)
				throw new Error("durable sponsor receipt is malformed");
			if (receipt.outcome === "rejected")
				throw new Error(
					`${payload.kind} was rejected: ${String(receipt.rejectionCode)}`,
				);
		} else allIdempotent = false;

		const [head, snapshot] = await Promise.all([
			port.loadHead(scope),
			port.loadLatestSnapshot(scope),
		]);
		const replay = await replayCivilizationHistory(port, {
			...scope,
			snapshotId: snapshot.snapshotId,
			toSequenceExclusive: head.lastSequence + 1,
		});
		if (replay.state.civilization === null)
			throw new Error("generated authority has no civilization state");
		const civilization = replay.state
			.civilization as unknown as CivilizationState;
		if (prior !== null) return civilization;

		const command: WorldCommand<SponsorPayload> = {
			schemaVersion: PROTOCOL_SCHEMA_VERSION,
			commandId,
			payloadFingerprint: fingerprint,
			expectedRevision: civilization.revision,
			principal,
			runId: scope.runId,
			regionId: scope.regionId,
			payload,
		};
		const transition = await prepareCivilizationSponsorTransition({
			state: civilization,
			runId: scope.runId,
			regionId: scope.regionId,
			priorWorldHeadHash: head.lastEventHash,
			nextSequence: head.lastSequence + 1,
			snapshotBoundary: await createCivilizationSponsorSnapshotBoundary({
				snapshotId: `runtime:${String(head.revision)}`,
				runId: scope.runId,
				regionId: scope.regionId,
				stateHash: await stateHash(civilization),
				revision: civilization.revision,
				simulationTime: civilization.simulationTime,
				nextSequence: head.lastSequence + 1,
				baseWorldHeadHash: head.lastEventHash,
			}),
			authoritativeHeaders: [],
			fencingToken: head.fencingToken,
			command,
			authoritativeHistory: [],
		});
		if (!transition.accepted || transition.events[0] === undefined) {
			const rejection = await createCivilizationSponsorRejectionAppend({
				state: replay.state,
				head,
				commandReceipt: transition.receipt,
				decisionRecord: transition.committedDecisionRecord,
			});
			await port.appendEventBatch(rejection.request);
			throw new Error(
				`${payload.kind} rejected: ${transition.receipt.rejectionCode}`,
			);
		}
		const event = transition.events[0];
		const append = await createCivilizationSponsorAuthorityAppend({
			state: replay.state,
			head,
			protocolEvent: event,
			commandReceipt: transition.receipt,
			decisionRecord: transition.committedDecisionRecord,
			postCivilization: transition.postState,
		});
		await port.appendEventBatch(append.request);
		committedEvents.push(event);
		eventRevisions[event.eventId] = transition.postState.revision;
		return transition.postState;
	};

	try {
		let finalCivilization = await commit(
			`sponsor:${input.citizenId}`,
			{
				kind: "patron",
				principalId: "patron:local",
				beneficiaryCitizenId: input.citizenId,
			},
			{
				kind: "EstablishSponsorship",
				covenantId,
				citizenId: input.citizenId,
			},
		);
		if (input.includeCounsel === true) {
			await commit(
				`counsel:${input.citizenId}:standing-plan`,
				{
					kind: "patron",
					principalId: "patron:local",
					beneficiaryCitizenId: input.citizenId,
				},
				{
					kind: "IssueCounsel",
					interventionId,
					citizenId: input.citizenId,
					intent: "verify-reserve",
				},
			);
			finalCivilization = await commit(
				`resolve:${input.citizenId}:standing-plan:1`,
				{ kind: "citizen", principalId: input.citizenId },
				{
					kind: "ResolveCounsel",
					citizenId: input.citizenId,
					interventionId,
					decisionId,
					proposalId,
					action: "follow-plan",
				},
			);
		}
		const covenant = finalCivilization.sponsorships[covenantId];
		if (covenant === undefined)
			throw new Error("canonical sponsorship disappeared during counsel");
		const chronicle = projectCivilizationChronicle({
			events: committedEvents,
			eventRevisions,
			viewer: { kind: "participant", principalId: "patron:local" },
			purpose: "chronicle-private",
			atRevision: finalCivilization.revision,
			visibilityContext: {
				policyVersion: "riverhold-visibility-v1",
				localOwnerPrincipalId: "patron:local",
				nonproduction: true,
				covenants: [
					{
						patronPrincipalId: covenant.patronPrincipalId,
						beneficiaryCitizenId: covenant.beneficiaryCitizenId,
						grantRevision: covenant.establishedAtRevision,
						revokeRevision: null,
					},
				],
			},
			citizenNames: Object.fromEntries(
				Object.values(finalCivilization.citizens).map(({ citizenId, name }) => [
					citizenId,
					name,
				]),
			),
		});
		return {
			citizenId: input.citizenId,
			eventIds: committedEvents.map(({ eventId }) => eventId),
			idempotent: allIdempotent,
			chronicleTrace:
				chronicle.storyCard ||
				(input.includeCounsel === true
					? "The counsel and interpretation were already recorded."
					: "The sponsorship was already recorded."),
		};
	} finally {
		port.close();
	}
}
