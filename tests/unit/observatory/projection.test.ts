import { describe, expect, it } from "vitest";
import {
	authorizeChronicleForObservatory,
	EONFOLK_SHAPE_SUBSET_VERSION,
	EONFOLK_VOCABULARY,
	OBSERVATORY_JSON_LD_VERSION,
	projectAuthorizedChronicleToProv,
	validateObservatoryJsonLdProjection,
} from "../../../packages/observatory/src/index.js";
import { createRiverholdGenesis } from "../../../packages/sim/src/index.js";

async function authorized(
	publicOnly = false,
	includePrivate = false,
	invalidHash = false,
) {
	const genesis = await createRiverholdGenesis();
	const citizens = Object.values(genesis.state.citizens);
	const event = {
		eventId: "event-visible",
		sequence: 1,
		simulationTime: 1,
		eventPayload: {
			kind: "ExchangeCompleted",
			firstCitizenId: citizens[0]!.citizenId,
			secondCitizenId: citizens[1]!.citizenId,
			firstGives: { resource: "food", quantity: 1 },
			secondGives: { resource: "water", quantity: 1 },
			behavior: "trade",
		},
		causalParents: [],
		relatedEvents: [],
		visibility: { kind: "public" },
		eventHash: invalidHash ? "unverified" : "a".repeat(64),
	} as unknown as Parameters<
		typeof authorizeChronicleForObservatory
	>[0]["events"][number];
	const privateEvent = {
		...event,
		eventId: "event-private",
		eventHash: "b".repeat(64),
		sequence: 2,
		eventPayload: {
			kind: "StatementMade",
			speakerId: citizens[0]!.citizenId,
			recipientIds: [citizens[1]!.citizenId],
			proposition: "A private allegation.",
			allegation: true,
		},
		visibility: {
			kind: "participant-private",
			principalIds: ["principal_local_patron"],
		},
	} as unknown as Parameters<
		typeof authorizeChronicleForObservatory
	>[0]["events"][number];
	return authorizeChronicleForObservatory({
		events: includePrivate ? [event, privateEvent] : [event],
		viewer: publicOnly
			? { kind: "public" }
			: { kind: "participant", principalId: "principal_local_patron" },
		purpose: publicOnly ? "chronicle-public" : "chronicle-private",
		atRevision: 3,
		visibilityContext: {
			policyVersion: "riverhold-visibility-v1",
			covenants: genesis.state.covenants,
			localOwnerPrincipalId: "principal_local_patron",
			nonproduction: true,
		},
		citizenNames: Object.fromEntries(
			citizens.map(({ citizenId, name }) => [citizenId, name]),
		),
	});
}

async function project() {
	return projectAuthorizedChronicleToProv({
		projectionId: "projection-visible",
		authorized: await authorized(),
	});
}

describe("authorized Observatory JSON-LD projection", () => {
	it("emits a versioned, embedded JSON-LD 1.1 PROV subset bundle", async () => {
		const projection = await project();
		const bytes = JSON.stringify(projection);
		expect(projection["@context"]).toEqual({
			"@version": 1.1,
			prov: "http://www.w3.org/ns/prov#",
			eon: EONFOLK_VOCABULARY,
			xsd: "http://www.w3.org/2001/XMLSchema#",
		});
		expect(projection["eon:schemaVersion"]).toBe(OBSERVATORY_JSON_LD_VERSION);
		expect(projection["@graph"]).toHaveLength(3);
		expect(bytes).toContain("event-visible");
		expect(bytes).toContain("prov:wasGeneratedBy");
		expect(bytes).not.toContain("stateHash");
		expect(bytes).not.toContain("decisionRecord");
		const validation = validateObservatoryJsonLdProjection(projection);
		expect(validation).toEqual({
			validatorVersion: EONFOLK_SHAPE_SUBSET_VERSION,
			conforms: true,
			violations: [],
		});
		expect(Object.isFrozen(projection)).toBe(true);
		expect(Object.isFrozen(projection["@graph"])).toBe(true);
	});

	it("is byte-stable for the same authorized source", async () => {
		const artifact = await authorized();
		const forward = projectAuthorizedChronicleToProv({
			projectionId: "same",
			authorized: artifact,
		});
		const reversed = projectAuthorizedChronicleToProv({
			projectionId: "same",
			authorized: artifact,
		});
		expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed));
		expect(
			forward["@graph"].filter((node) =>
				String(node["@id"]).includes("event:v2:event-visible"),
			),
		).toHaveLength(1);
	});

	it("requires an opaque visibility-authorized artifact", () => {
		expect(() =>
			projectAuthorizedChronicleToProv({
				projectionId: "projection-public-mismatch",
				authorized: {} as never,
			}),
		).toThrow("not authorized");
	});

	it("binds viewer identity, purpose, revision, policy, and event evidence", async () => {
		const participant = await authorized();
		const publicArtifact = await authorized(true);
		expect(participant.viewerId).toBe("participant:principal_local_patron");
		expect(publicArtifact.viewerId).toBe("public");
		expect(participant.sourceDigest).toMatch(/^[0-9a-f]{64}$/u);
		expect(participant.policyVersion).toBe("riverhold-visibility-v1");
		expect(participant.authorizedEventIds).toEqual(["event-visible"]);
		const projection = projectAuthorizedChronicleToProv({
			projectionId: "bound",
			authorized: participant,
		});
		expect(JSON.stringify(projection)).toContain(participant.sourceDigest);
		expect(JSON.stringify(projection)).toContain(participant.viewerId);
	});

	it("does not relabel private event evidence as public", async () => {
		const participant = await authorized(false, true);
		const publicArtifact = await authorized(true, true);
		expect(participant.authorizedEventIds).toContain("event-private");
		expect(publicArtifact.authorizedEventIds).not.toContain("event-private");
		const publicProjection = projectAuthorizedChronicleToProv({
			projectionId: "public-safe",
			authorized: publicArtifact,
		});
		expect(JSON.stringify(publicProjection)).not.toContain("event-private");
		expect(JSON.stringify(publicProjection)).not.toContain(
			"private allegation",
		);
	});

	it("rejects a cloned authorization symbol with private Chronicle content", async () => {
		const participant = await authorized(false, true);
		expect(JSON.stringify(participant)).toContain("private allegation");
		const authorizationSymbols = Object.getOwnPropertySymbols(participant);
		expect(authorizationSymbols).toHaveLength(1);
		const forgedPublicArtifact = Object.freeze({
			...participant,
			[authorizationSymbols[0]!]: true,
			viewerId: "public",
			viewerKind: "public",
			purpose: "chronicle-public",
		});
		expect(() =>
			projectAuthorizedChronicleToProv({
				projectionId: "forged-public-private-canary",
				authorized: forgedPublicArtifact as never,
			}),
		).toThrow("not authorized");
	});

	it("rejects Chronicle evidence that lacks a verified source event hash", async () => {
		await expect(authorized(false, false, true)).rejects.toThrow(
			"does not resolve to a hashed source event",
		);
	});

	it("fails closed on remote contexts, duplicate IDs, and dangling references", async () => {
		const base = JSON.parse(JSON.stringify(await project())) as Record<
			string,
			unknown
		>;
		const remote = structuredClone(base);
		remote["@context"] = "https://example.invalid/context";
		expect(
			validateObservatoryJsonLdProjection(remote).violations.map(
				(entry) => entry.code,
			),
		).toContain("REMOTE_CONTEXT");

		const duplicate = structuredClone(base);
		const duplicateGraph = duplicate["@graph"] as Record<string, unknown>[];
		duplicateGraph.push(structuredClone(duplicateGraph[0]!));
		expect(
			validateObservatoryJsonLdProjection(duplicate).violations.map(
				(entry) => entry.code,
			),
		).toContain("DUPLICATE_ID");

		const dangling = structuredClone(base);
		const danglingGraph = dangling["@graph"] as Record<string, unknown>[];
		dangling["@graph"] = danglingGraph.filter(
			(node) => !String(node["@id"]).includes("event:v2:"),
		);
		expect(
			validateObservatoryJsonLdProjection(dangling).violations.map(
				(entry) => entry.code,
			),
		).toContain("DANGLING_REFERENCE");
	});

	it("enforces local node and byte limits without gaining world authority", async () => {
		const projection = await project();
		const bytes = JSON.stringify(projection);
		expect(bytes).not.toContain("hidden-whole-state");
		expect(bytes).not.toContain("chainOfThought");
		expect(
			validateObservatoryJsonLdProjection(projection, {
				maxBytes: 16,
				maxNodes: 2,
			}).violations.map((entry) => entry.code),
		).toEqual(expect.arrayContaining(["MAX_BYTES", "MAX_NODES"]));
	});
});
