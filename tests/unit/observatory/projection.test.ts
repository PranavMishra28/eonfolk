import { describe, expect, it } from "vitest";
import {
	EONFOLK_SHAPE_SUBSET_VERSION,
	EONFOLK_VOCABULARY,
	OBSERVATORY_JSON_LD_VERSION,
	projectAuthorizedChronicleToProv,
	validateObservatoryJsonLdProjection,
} from "../../../packages/observatory/src/index.js";
import type { ChronicleProjection } from "../../../packages/sim/src/index.js";

function chronicle(
	sentences: ChronicleProjection["sentences"] = [
		{
			sentenceId: "sentence-visible",
			text: "Mara verified the reserve.",
			evidenceEventIds: ["event-visible"],
			relation: "direct",
		},
	],
): ChronicleProjection {
	return {
		schemaVersion: "riverhold-chronicle-v1",
		visibilityPolicyVersion: "riverhold-visibility-v1",
		branch: "verify-reserve",
		sentences,
		beats: [],
		unresolvedTension: "Will she publish the count?",
		storyCard: "Mara verified the reserve.",
	};
}

function project(value = chronicle()) {
	return projectAuthorizedChronicleToProv({
		projectionId: "projection-visible",
		viewerKind: "participant",
		purpose: "chronicle-private",
		atRevision: 3,
		chronicle: value,
	});
}

describe("authorized Observatory JSON-LD projection", () => {
	it("emits a versioned, embedded JSON-LD 1.1 PROV-O bundle", () => {
		const projection = project();
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

	it("is byte-stable under sentence and evidence input reordering", () => {
		const firstSentence = {
			sentenceId: "sentence-a",
			text: "Mara checked both records.",
			evidenceEventIds: ["event-b", "event-a", "event-b"],
			relation: "direct" as const,
		};
		const secondSentence = {
			sentenceId: "sentence-b",
			text: "Toma answered the allegation.",
			evidenceEventIds: ["event-c"],
			relation: "allegation" as const,
		};
		const forward = project(chronicle([firstSentence, secondSentence]));
		const reversed = project(
			chronicle([
				secondSentence,
				{
					...firstSentence,
					evidenceEventIds: [...firstSentence.evidenceEventIds].reverse(),
				},
			]),
		);
		expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed));
		expect(
			forward["@graph"].filter((node) =>
				String(node["@id"]).includes("event:v2:event-b"),
			),
		).toHaveLength(1);
	});

	it("requires an explicit authorized viewer-purpose pair", () => {
		expect(() =>
			projectAuthorizedChronicleToProv({
				projectionId: "projection-public-mismatch",
				viewerKind: "public",
				purpose: "chronicle-private",
				atRevision: 3,
				chronicle: chronicle(),
			}),
		).toThrow("viewer and purpose are not an authorized projection pair");
	});

	it("rejects conflicting duplicate sentence IDs", () => {
		expect(() =>
			project(
				chronicle([
					{
						sentenceId: "same",
						text: "First authorized sentence.",
						evidenceEventIds: ["event-a"],
						relation: "fact",
					},
					{
						sentenceId: "same",
						text: "Conflicting authorized sentence.",
						evidenceEventIds: ["event-b"],
						relation: "direct",
					},
				]),
			),
		).toThrow("conflicting projected node IDs");
	});

	it("fails closed on remote contexts, duplicate IDs, and dangling references", () => {
		const base = JSON.parse(JSON.stringify(project())) as Record<
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

	it("enforces local node and byte limits without gaining world authority", () => {
		const projection = project({
			...chronicle(),
			wholeStateHash: "hidden-whole-state",
			rawDecisionRecord: { chainOfThought: "must never project" },
		} as ChronicleProjection);
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
