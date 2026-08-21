import type { PersistedFeedbackPayload } from "./contracts.js";

function escapeUntrusted(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("@", "@\u200b");
}

function quote(value: string): string {
	return value
		.split("\n")
		.map((line) => `> ${escapeUntrusted(line)}`)
		.join("\n");
}

export function fingerprintMarker(fingerprint: string): string {
	return `<!-- eonfolk-feedback:fingerprint:${fingerprint} -->`;
}

export function submissionMarker(submissionId: string): string {
	return `<!-- eonfolk-feedback:submission:${submissionId} -->`;
}

function diagnosticsBlock(payload: PersistedFeedbackPayload): string {
	if (payload.diagnostics === undefined) return "_Not shared._";
	return ["```json", JSON.stringify(payload.diagnostics, null, 2), "```"].join(
		"\n",
	);
}

export function issueTitle(payload: PersistedFeedbackPayload): string {
	const code = payload.diagnostics?.errorCode;
	return code === undefined
		? `[Founder Alpha] ${payload.category} feedback`
		: `[Founder Alpha] ${payload.category}: ${code}`;
}

export function issueBody(
	payload: PersistedFeedbackPayload,
	fingerprint: string,
): string {
	return [
		"## Founder Alpha feedback",
		"",
		`Category: \`${payload.category}\``,
		"",
		"### Tester report",
		"",
		quote(payload.text),
		"",
		"### Consented diagnostic projection",
		"",
		diagnosticsBlock(payload),
		"",
		fingerprintMarker(fingerprint),
		submissionMarker(payload.submissionId),
	].join("\n");
}

export function commentBody(payload: PersistedFeedbackPayload): string {
	return [
		"## Additional Founder Alpha report",
		"",
		quote(payload.text),
		"",
		"### Consented diagnostic projection",
		"",
		diagnosticsBlock(payload),
		"",
		submissionMarker(payload.submissionId),
	].join("\n");
}
