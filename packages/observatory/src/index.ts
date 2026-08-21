import type { ChronicleProjection } from "@eonfolk/sim";

export interface ProvJsonLdProjection {
	readonly "@context": Readonly<{
		readonly prov: "http://www.w3.org/ns/prov#";
		readonly eon: "https://eonfolk.invalid/ns#";
	}>;
	readonly "@graph": readonly Readonly<Record<string, unknown>>[];
}

function eventUri(eventId: string): string {
	return `urn:eonfolk:event:${encodeURIComponent(eventId)}`;
}

/**
 * Projects an already-authorized Chronicle view into a small PROV-shaped graph.
 * It accepts no raw ledger, Mind, decision record, hashes, or visibility bypass.
 */
export function projectAuthorizedChronicleToProv(
	chronicle: ChronicleProjection,
): ProvJsonLdProjection {
	const graph = chronicle.sentences.flatMap((sentence) => {
		const sentenceId = `urn:eonfolk:chronicle:${encodeURIComponent(sentence.sentenceId)}`;
		const entity = {
			"@id": sentenceId,
			"@type": "prov:Entity",
			"eon:text": sentence.text,
			"eon:relation": sentence.relation,
			"prov:wasDerivedFrom": sentence.evidenceEventIds.map(eventUri),
		};
		const evidence = sentence.evidenceEventIds.map((eventId) => ({
			"@id": eventUri(eventId),
			"@type": "prov:Entity",
			"eon:eventId": eventId,
		}));
		return [entity, ...evidence];
	});
	const unique = new Map<string, Readonly<Record<string, unknown>>>();
	for (const item of graph) unique.set(String(item["@id"]), item);
	return Object.freeze({
		"@context": Object.freeze({
			prov: "http://www.w3.org/ns/prov#",
			eon: "https://eonfolk.invalid/ns#",
		}),
		"@graph": Object.freeze([...unique.values()]),
	});
}
