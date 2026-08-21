import type {
	ReadPurpose,
	Viewer,
	VisibilityContext,
	VisibleRecord,
} from "./types.js";

function covenantActive(
	context: VisibilityContext,
	principalId: string,
	citizenId: string,
	revision: number,
): boolean {
	return context.covenants.some(
		(covenant) =>
			covenant.patronPrincipalId === principalId &&
			covenant.beneficiaryCitizenId === citizenId &&
			covenant.grantRevision <= revision &&
			(covenant.revokeRevision === null || revision < covenant.revokeRevision),
	);
}

export function canRead(
	viewer: Viewer,
	purpose: ReadPurpose,
	record: Pick<VisibleRecord, "createdRevision" | "visibility">,
	atRevision: number,
	context: VisibilityContext,
): "allow" | "deny" {
	if (context.policyVersion !== "riverhold-visibility-v1") return "deny";
	if (!Number.isSafeInteger(atRevision) || atRevision < record.createdRevision)
		return "deny";

	const visibility = record.visibility;
	if (viewer.kind === "citizen" && purpose === "decision-context") {
		if (visibility.kind === "public") return "allow";
		if (
			visibility.kind === "citizen-private" &&
			visibility.subjectCitizenId === viewer.citizenId
		)
			return "allow";
		if (
			visibility.kind === "patron-visible-through-covenant" &&
			visibility.subjectCitizenId === viewer.citizenId
		)
			return "allow";
		return "deny";
	}

	if (
		viewer.kind === "participant" &&
		[
			"semantic-ui",
			"patron-view",
			"chronicle-private",
			"replay-private",
		].includes(purpose)
	) {
		if (visibility.kind === "public") return "allow";
		if (
			visibility.kind === "participant-private" &&
			visibility.principalIds.includes(viewer.principalId)
		) {
			return "allow";
		}
		if (
			visibility.kind === "patron-visible-through-covenant" &&
			covenantActive(
				context,
				viewer.principalId,
				visibility.subjectCitizenId,
				atRevision,
			)
		)
			return "allow";
		return "deny";
	}

	if (viewer.kind === "public" && purpose === "chronicle-public") {
		return visibility.kind === "public" ? "allow" : "deny";
	}

	if (viewer.kind === "participant" && purpose === "export-owner") {
		if (viewer.principalId !== context.localOwnerPrincipalId) return "deny";
		return visibility.kind === "moderator-only" ||
			visibility.kind === "implementation-only"
			? "deny"
			: "allow";
	}

	if (viewer.kind === "moderator" && purpose === "moderation") {
		if (visibility.kind === "public") return "allow";
		return visibility.kind === "moderator-only" &&
			visibility.roleIds.includes(viewer.roleId)
			? "allow"
			: "deny";
	}

	if (
		viewer.kind === "implementation" &&
		purpose === "implementation-diagnostic" &&
		context.nonproduction
	) {
		if (visibility.kind === "implementation-only") {
			return visibility.testRunIds.includes(viewer.testRunId)
				? "allow"
				: "deny";
		}
		return "allow";
	}
	return "deny";
}
