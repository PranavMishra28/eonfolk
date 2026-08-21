import { describe, expect, it } from "vitest";
import {
	canRead,
	type ReadPurpose,
	type Viewer,
	type Visibility,
	type VisibilityContext,
} from "../../../packages/protocol/src/index.js";

const context: VisibilityContext = {
	policyVersion: "riverhold-visibility-v1",
	covenants: [
		{
			patronPrincipalId: "patron",
			beneficiaryCitizenId: "mara",
			grantRevision: 2,
			revokeRevision: 5,
		},
	],
	localOwnerPrincipalId: "owner",
	nonproduction: true,
};

function read(
	viewer: Viewer,
	purpose: ReadPurpose,
	visibility: Visibility,
	revision = 3,
	createdRevision = 0,
) {
	return canRead(
		viewer,
		purpose,
		{ visibility, createdRevision },
		revision,
		context,
	);
}

describe("riverhold-visibility-v1", () => {
	it("implements covenant grant and exclusive revoke boundaries", () => {
		const protectedRecord = {
			kind: "patron-visible-through-covenant",
			subjectCitizenId: "mara",
		} as const;
		expect(
			read(
				{ kind: "participant", principalId: "patron" },
				"patron-view",
				protectedRecord,
				1,
			),
		).toBe("deny");
		expect(
			read(
				{ kind: "participant", principalId: "patron" },
				"patron-view",
				protectedRecord,
				2,
			),
		).toBe("allow");
		expect(
			read(
				{ kind: "participant", principalId: "patron" },
				"patron-view",
				protectedRecord,
				4,
			),
		).toBe("allow");
		expect(
			read(
				{ kind: "participant", principalId: "patron" },
				"patron-view",
				protectedRecord,
				5,
			),
		).toBe("deny");
	});

	it("denies every unlisted viewer/purpose pair", () => {
		expect(read({ kind: "public" }, "patron-view", { kind: "public" })).toBe(
			"deny",
		);
		expect(
			read({ kind: "citizen", citizenId: "mara" }, "chronicle-public", {
				kind: "public",
			}),
		).toBe("deny");
		expect(
			read({ kind: "participant", principalId: "patron" }, "decision-context", {
				kind: "public",
			}),
		).toBe("deny");
		expect(
			read({ kind: "moderator", roleId: "mod" }, "patron-view", {
				kind: "public",
			}),
		).toBe("deny");
	});

	it("keeps citizen-private knowledge with its exact subject", () => {
		const privateRecord = {
			kind: "citizen-private",
			subjectCitizenId: "mara",
		} as const;
		expect(
			read(
				{ kind: "citizen", citizenId: "mara" },
				"decision-context",
				privateRecord,
			),
		).toBe("allow");
		expect(
			read(
				{ kind: "citizen", citizenId: "toma" },
				"decision-context",
				privateRecord,
			),
		).toBe("deny");
		expect(
			read(
				{ kind: "participant", principalId: "patron" },
				"patron-view",
				privateRecord,
			),
		).toBe("deny");
	});

	it("respects creation revision and nonproduction implementation subjects", () => {
		expect(
			read({ kind: "public" }, "chronicle-public", { kind: "public" }, 2, 3),
		).toBe("deny");
		expect(
			read(
				{ kind: "implementation", testRunId: "test-a" },
				"implementation-diagnostic",
				{ kind: "implementation-only", testRunIds: ["test-a"] },
			),
		).toBe("allow");
		expect(
			read(
				{ kind: "implementation", testRunId: "test-b" },
				"implementation-diagnostic",
				{ kind: "implementation-only", testRunIds: ["test-a"] },
			),
		).toBe("deny");
	});
});
