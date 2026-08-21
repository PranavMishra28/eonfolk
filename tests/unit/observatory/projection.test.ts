import { describe, expect, it } from "vitest";
import { projectAuthorizedChronicleToProv } from "../../../packages/observatory/src/index.js";

describe("authorized Observatory projection", () => {
	it("maps only the supplied Chronicle evidence and never creates world authority", () => {
		const projection = projectAuthorizedChronicleToProv({
			schemaVersion: "riverhold-chronicle-v1",
			visibilityPolicyVersion: "riverhold-visibility-v1",
			branch: "verify-reserve",
			sentences: [
				{
					sentenceId: "sentence-visible",
					text: "Mara verified the reserve.",
					evidenceEventIds: ["event-visible"],
					relation: "direct",
				},
			],
			beats: [],
			unresolvedTension: "Will she publish the count?",
			storyCard: "Mara verified the reserve.",
		});
		const bytes = JSON.stringify(projection);
		expect(bytes).toContain("http://www.w3.org/ns/prov#");
		expect(bytes).toContain("event-visible");
		expect(bytes).not.toContain("stateHash");
		expect(bytes).not.toContain("decisionRecord");
		expect(projection["@graph"]).toHaveLength(2);
	});
});
