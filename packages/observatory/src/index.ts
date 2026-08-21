import type { ChronicleProjection } from "@eonfolk/sim";

export const OBSERVATORY_JSON_LD_VERSION =
	"eonfolk-observatory-jsonld-v2" as const;
export const EONFOLK_SHAPE_SUBSET_VERSION = "eonfolk-shape-subset-v1" as const;
export const EONFOLK_VOCABULARY = "urn:eonfolk:vocab:v2:" as const;

const PROV_NAMESPACE = "http://www.w3.org/ns/prov#" as const;
const XSD_NAMESPACE = "http://www.w3.org/2001/XMLSchema#" as const;

const JSON_LD_CONTEXT = Object.freeze({
	"@version": 1.1 as const,
	prov: PROV_NAMESPACE,
	eon: EONFOLK_VOCABULARY,
	xsd: XSD_NAMESPACE,
});

export type ObservatoryProjectionPurpose =
	| "chronicle-private"
	| "chronicle-public"
	| "implementation-diagnostic";

export type ObservatoryViewerKind =
	| "public"
	| "participant"
	| "citizen"
	| "implementation";

export interface AuthorizedChronicleProjectionInput {
	readonly projectionId: string;
	readonly viewerKind: ObservatoryViewerKind;
	readonly purpose: ObservatoryProjectionPurpose;
	readonly atRevision: number;
	readonly chronicle: ChronicleProjection;
}

export interface ProvJsonLdProjection {
	readonly "@context": typeof JSON_LD_CONTEXT;
	readonly "@id": string;
	readonly "@type": readonly ["prov:Bundle", "eon:AuthorizedProjection"];
	readonly "eon:schemaVersion": typeof OBSERVATORY_JSON_LD_VERSION;
	readonly "@graph": readonly Readonly<Record<string, unknown>>[];
}

export type ShapeViolationCode =
	| "CARDINALITY"
	| "CLOSED_SHAPE"
	| "DANGLING_REFERENCE"
	| "DATATYPE"
	| "DUPLICATE_ID"
	| "INVALID_IRI"
	| "MAX_BYTES"
	| "MAX_NODES"
	| "REMOTE_CONTEXT";

export interface ShapeViolation {
	readonly code: ShapeViolationCode;
	readonly path: string;
	readonly message: string;
}

export interface ShapeValidationResult {
	readonly validatorVersion: typeof EONFOLK_SHAPE_SUBSET_VERSION;
	readonly conforms: boolean;
	readonly violations: readonly ShapeViolation[];
}

export interface ShapeValidationLimits {
	readonly maxBytes: number;
	readonly maxNodes: number;
}

export const DEFAULT_SHAPE_VALIDATION_LIMITS: ShapeValidationLimits =
	Object.freeze({ maxBytes: 65_536, maxNodes: 256 });

const TOP_LEVEL_KEYS = Object.freeze(
	["@context", "@graph", "@id", "@type", "eon:schemaVersion"].sort(),
);
const ACTIVITY_KEYS = Object.freeze(
	[
		"@id",
		"@type",
		"eon:atRevision",
		"eon:purpose",
		"eon:viewerKind",
		"eon:visibilityPolicyVersion",
		"prov:used",
	].sort(),
);
const SENTENCE_KEYS = Object.freeze(
	[
		"@id",
		"@type",
		"eon:relation",
		"eon:text",
		"prov:wasDerivedFrom",
		"prov:wasGeneratedBy",
	].sort(),
);
const EVIDENCE_KEYS = Object.freeze(["@id", "@type", "eon:eventId"].sort());
const TOP_LEVEL_TYPES = Object.freeze([
	"prov:Bundle",
	"eon:AuthorizedProjection",
]);
const ACTIVITY_TYPES = Object.freeze([
	"prov:Activity",
	"eon:ChronicleProjectionActivity",
]);
const SENTENCE_TYPES = Object.freeze(["prov:Entity", "eon:ChronicleSentence"]);
const EVIDENCE_TYPES = Object.freeze([
	"prov:Entity",
	"eon:AuthorizedEventEvidence",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
	const actual = Object.keys(value).sort();
	return (
		actual.length === keys.length &&
		actual.every((key, index) => key === keys[index])
	);
}

function hasExactStrings(value: unknown, expected: readonly string[]): boolean {
	return (
		Array.isArray(value) &&
		value.length === expected.length &&
		value.every((entry, index) => entry === expected[index])
	);
}

function assertScalarText(value: string, label: string, maxCodePoints: number) {
	if (value !== value.normalize("NFC"))
		throw new TypeError(`${label} must be NFC-normalized`);
	const codePoints = [...value];
	if (codePoints.length === 0 || codePoints.length > maxCodePoints)
		throw new RangeError(`${label} is outside its text budget`);
	for (const character of codePoints) {
		const codePoint = character.codePointAt(0)!;
		if (
			codePoint < 0x20 ||
			codePoint === 0x7f ||
			(codePoint >= 0xd800 && codePoint <= 0xdfff)
		)
			throw new TypeError(`${label} contains an invalid code point`);
	}
}

function assertAuthorizedInput(
	input: AuthorizedChronicleProjectionInput,
): void {
	assertScalarText(input.projectionId, "projectionId", 128);
	if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(input.projectionId))
		throw new TypeError("projectionId is invalid");
	if (!Number.isSafeInteger(input.atRevision) || input.atRevision < 0)
		throw new RangeError("atRevision must be a nonnegative safe integer");
	const authorizedPair =
		(input.viewerKind === "public" && input.purpose === "chronicle-public") ||
		((input.viewerKind === "participant" || input.viewerKind === "citizen") &&
			input.purpose === "chronicle-private") ||
		(input.viewerKind === "implementation" &&
			input.purpose === "implementation-diagnostic");
	if (!authorizedPair)
		throw new Error("viewer and purpose are not an authorized projection pair");
	if (input.chronicle.schemaVersion !== "riverhold-chronicle-v1")
		throw new Error("unsupported Chronicle projection version");
	if (input.chronicle.visibilityPolicyVersion !== "riverhold-visibility-v1")
		throw new Error("unsupported visibility policy version");
	if (input.chronicle.sentences.length > 128)
		throw new RangeError("Chronicle sentence count exceeds projection budget");
	for (const sentence of input.chronicle.sentences) {
		assertScalarText(sentence.sentenceId, "sentenceId", 256);
		assertScalarText(sentence.text, "sentence text", 2_048);
		if (sentence.evidenceEventIds.length > 32)
			throw new RangeError("sentence evidence exceeds projection budget");
		for (const eventId of sentence.evidenceEventIds)
			assertScalarText(eventId, "eventId", 256);
		if (
			!(
				["fact", "direct", "trigger", "contributing", "allegation"] as const
			).includes(sentence.relation)
		)
			throw new TypeError("Chronicle relation is unsupported");
	}
}

function encodeUrnComponent(value: string): string {
	return encodeURIComponent(value);
}

function eventUri(eventId: string): string {
	return `urn:eonfolk:event:v2:${encodeUrnComponent(eventId)}`;
}

function sentenceUri(sentenceId: string): string {
	return `urn:eonfolk:chronicle-sentence:v2:${encodeUrnComponent(sentenceId)}`;
}

function projectionUri(projectionId: string): string {
	return `urn:eonfolk:projection:v2:${encodeUrnComponent(projectionId)}`;
}

function activityUri(projectionId: string): string {
	return `urn:eonfolk:projection-activity:v2:${encodeUrnComponent(projectionId)}`;
}

function compareNode(
	left: Readonly<Record<string, unknown>>,
	right: Readonly<Record<string, unknown>>,
): number {
	const leftId = String(left["@id"]);
	const rightId = String(right["@id"]);
	return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
	if (typeof value !== "object" || value === null || Object.isFrozen(value))
		return value;
	for (const child of Object.values(value as Record<string, unknown>))
		deepFreeze(child);
	return Object.freeze(value);
}

/**
 * Projects one already-authorized Chronicle view into a deterministic PROV-O
 * shaped JSON-LD bundle. It accepts no ledger, Reality, Mind, decision record,
 * hash preimage, document loader, or write capability.
 */
export function projectAuthorizedChronicleToProv(
	input: AuthorizedChronicleProjectionInput,
): ProvJsonLdProjection {
	assertAuthorizedInput(input);
	const projectionActivityId = activityUri(input.projectionId);
	const usedEvidenceIds = [
		...new Set(
			input.chronicle.sentences.flatMap((sentence) =>
				sentence.evidenceEventIds.map(eventUri),
			),
		),
	].sort();
	const nodes: Readonly<Record<string, unknown>>[] = [
		{
			"@id": projectionActivityId,
			"@type": ["prov:Activity", "eon:ChronicleProjectionActivity"],
			"eon:atRevision": input.atRevision,
			"eon:purpose": input.purpose,
			"eon:viewerKind": input.viewerKind,
			"eon:visibilityPolicyVersion": input.chronicle.visibilityPolicyVersion,
			"prov:used": usedEvidenceIds.map((eventId) => ({ "@id": eventId })),
		},
	];
	for (const sentence of input.chronicle.sentences) {
		const evidenceIds = [...new Set(sentence.evidenceEventIds)]
			.map(eventUri)
			.sort();
		nodes.push({
			"@id": sentenceUri(sentence.sentenceId),
			"@type": ["prov:Entity", "eon:ChronicleSentence"],
			"eon:text": sentence.text,
			"eon:relation": sentence.relation,
			"prov:wasDerivedFrom": evidenceIds.map((eventId) => ({
				"@id": eventId,
			})),
			"prov:wasGeneratedBy": { "@id": projectionActivityId },
		});
		for (const eventId of [...new Set(sentence.evidenceEventIds)].sort()) {
			nodes.push({
				"@id": eventUri(eventId),
				"@type": ["prov:Entity", "eon:AuthorizedEventEvidence"],
				"eon:eventId": eventId,
			});
		}
	}
	const unique = new Map<string, Readonly<Record<string, unknown>>>();
	for (const node of nodes) {
		const id = String(node["@id"]);
		const previous = unique.get(id);
		if (
			previous !== undefined &&
			JSON.stringify(previous) !== JSON.stringify(node)
		)
			throw new Error("conflicting projected node IDs");
		unique.set(id, node);
	}
	const projection = deepFreeze({
		"@context": JSON_LD_CONTEXT,
		"@id": projectionUri(input.projectionId),
		"@type": ["prov:Bundle", "eon:AuthorizedProjection"] as const,
		"eon:schemaVersion": OBSERVATORY_JSON_LD_VERSION,
		"@graph": [...unique.values()].sort(compareNode),
	});
	const validation = validateObservatoryJsonLdProjection(projection);
	if (!validation.conforms)
		throw new Error(
			`projection failed ${EONFOLK_SHAPE_SUBSET_VERSION}: ${validation.violations[0]?.message ?? "unknown violation"}`,
		);
	return projection;
}

function violation(
	code: ShapeViolationCode,
	path: string,
	message: string,
): ShapeViolation {
	return Object.freeze({ code, path, message });
}

function isExpectedContext(value: unknown): boolean {
	return (
		isPlainRecord(value) &&
		hasExactKeys(value, ["@version", "eon", "prov", "xsd"].sort()) &&
		value["@version"] === 1.1 &&
		value.prov === PROV_NAMESPACE &&
		value.eon === EONFOLK_VOCABULARY &&
		value.xsd === XSD_NAMESPACE
	);
}

function isEonfolkUrn(value: unknown): value is string {
	return (
		typeof value === "string" &&
		value.startsWith("urn:eonfolk:") &&
		![...value].some((character) => {
			const codePoint = character.codePointAt(0)!;
			return /\s/u.test(character) || codePoint < 0x20 || codePoint === 0x7f;
		})
	);
}

function referencesFrom(node: Record<string, unknown>): string[] {
	const references: string[] = [];
	const derived = node["prov:wasDerivedFrom"];
	if (Array.isArray(derived)) {
		for (const reference of derived) {
			if (isPlainRecord(reference) && isEonfolkUrn(reference["@id"]))
				references.push(reference["@id"]);
		}
	}
	const generated = node["prov:wasGeneratedBy"];
	if (isPlainRecord(generated) && isEonfolkUrn(generated["@id"]))
		references.push(generated["@id"]);
	const used = node["prov:used"];
	if (Array.isArray(used)) {
		for (const reference of used) {
			if (isPlainRecord(reference) && isEonfolkUrn(reference["@id"]))
				references.push(reference["@id"]);
		}
	}
	return references;
}

function validateNode(
	node: unknown,
	path: string,
	violations: ShapeViolation[],
): node is Record<string, unknown> {
	if (!isPlainRecord(node)) {
		violations.push(violation("DATATYPE", path, "graph node must be a record"));
		return false;
	}
	if (!isEonfolkUrn(node["@id"]))
		violations.push(
			violation("INVALID_IRI", `${path}.@id`, "node ID must be an EONFOLK URN"),
		);
	const types = node["@type"];
	if (!Array.isArray(types) || types.length !== 2) {
		violations.push(
			violation(
				"CARDINALITY",
				`${path}.@type`,
				"node requires exactly two types",
			),
		);
		return true;
	}
	const expectedKeys = hasExactStrings(types, ACTIVITY_TYPES)
		? ACTIVITY_KEYS
		: hasExactStrings(types, SENTENCE_TYPES)
			? SENTENCE_KEYS
			: hasExactStrings(types, EVIDENCE_TYPES)
				? EVIDENCE_KEYS
				: null;
	if (expectedKeys === null) {
		violations.push(
			violation("DATATYPE", `${path}.@type`, "node has an unsupported class"),
		);
	} else if (!hasExactKeys(node, expectedKeys)) {
		violations.push(
			violation(
				"CLOSED_SHAPE",
				path,
				"node contains missing or unknown fields",
			),
		);
	}
	if (expectedKeys === ACTIVITY_KEYS) {
		if (
			!Number.isSafeInteger(node["eon:atRevision"]) ||
			Number(node["eon:atRevision"]) < 0
		)
			violations.push(
				violation("DATATYPE", `${path}.eon:atRevision`, "revision is invalid"),
			);
		const purpose = node["eon:purpose"];
		const viewerKind = node["eon:viewerKind"];
		const authorizedPair =
			(viewerKind === "public" && purpose === "chronicle-public") ||
			((viewerKind === "participant" || viewerKind === "citizen") &&
				purpose === "chronicle-private") ||
			(viewerKind === "implementation" &&
				purpose === "implementation-diagnostic");
		if (!authorizedPair)
			violations.push(
				violation(
					"DATATYPE",
					path,
					"activity viewer and purpose are not an authorized pair",
				),
			);
		if (node["eon:visibilityPolicyVersion"] !== "riverhold-visibility-v1")
			violations.push(
				violation(
					"DATATYPE",
					`${path}.eon:visibilityPolicyVersion`,
					"visibility policy is unsupported",
				),
			);
		const used = node["prov:used"];
		if (
			!Array.isArray(used) ||
			used.length > 254 ||
			used.some(
				(reference) =>
					!isPlainRecord(reference) ||
					!hasExactKeys(reference, ["@id"]) ||
					!isEonfolkUrn(reference["@id"]),
			)
		)
			violations.push(
				violation(
					"CARDINALITY",
					`${path}.prov:used`,
					"activity evidence references are invalid or unbounded",
				),
			);
	}
	if (expectedKeys === SENTENCE_KEYS) {
		if (
			typeof node["eon:text"] !== "string" ||
			typeof node["eon:relation"] !== "string"
		)
			violations.push(
				violation(
					"DATATYPE",
					path,
					"sentence text and relation must be strings",
				),
			);
		const derived = node["prov:wasDerivedFrom"];
		if (!Array.isArray(derived) || derived.length > 32)
			violations.push(
				violation(
					"CARDINALITY",
					`${path}.prov:wasDerivedFrom`,
					"evidence count is invalid",
				),
			);
		else if (
			derived.some(
				(reference) =>
					!isPlainRecord(reference) ||
					!hasExactKeys(reference, ["@id"]) ||
					!isEonfolkUrn(reference["@id"]),
			)
		)
			violations.push(
				violation(
					"DATATYPE",
					`${path}.prov:wasDerivedFrom`,
					"evidence references must be closed local IRI records",
				),
			);
		const generated = node["prov:wasGeneratedBy"];
		if (
			!isPlainRecord(generated) ||
			!hasExactKeys(generated, ["@id"]) ||
			!isEonfolkUrn(generated["@id"])
		)
			violations.push(
				violation(
					"DATATYPE",
					`${path}.prov:wasGeneratedBy`,
					"generation reference must be one closed local IRI record",
				),
			);
		if (
			typeof node["eon:relation"] === "string" &&
			!["fact", "direct", "trigger", "contributing", "allegation"].includes(
				node["eon:relation"],
			)
		)
			violations.push(
				violation(
					"DATATYPE",
					`${path}.eon:relation`,
					"causal relation is unsupported",
				),
			);
	}
	if (expectedKeys === EVIDENCE_KEYS) {
		if (typeof node["eon:eventId"] !== "string")
			violations.push(
				violation(
					"DATATYPE",
					`${path}.eon:eventId`,
					"event ID must be a string",
				),
			);
		else if (node["@id"] !== eventUri(node["eon:eventId"]))
			violations.push(
				violation(
					"INVALID_IRI",
					`${path}.@id`,
					"event node ID does not match its authorized event ID",
				),
			);
	}
	return true;
}

export function validateObservatoryJsonLdProjection(
	value: unknown,
	limits: ShapeValidationLimits = DEFAULT_SHAPE_VALIDATION_LIMITS,
): ShapeValidationResult {
	if (
		!Number.isSafeInteger(limits.maxBytes) ||
		limits.maxBytes < 1 ||
		!Number.isSafeInteger(limits.maxNodes) ||
		limits.maxNodes < 1
	)
		throw new RangeError("shape validation limits are invalid");
	const violations: ShapeViolation[] = [];
	let encodedBytes = Number.POSITIVE_INFINITY;
	try {
		encodedBytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
	} catch {
		violations.push(
			violation("DATATYPE", "$", "projection must be finite JSON data"),
		);
	}
	if (encodedBytes > limits.maxBytes)
		violations.push(
			violation("MAX_BYTES", "$", "projection exceeds byte limit"),
		);
	if (!isPlainRecord(value)) {
		violations.push(violation("DATATYPE", "$", "projection must be a record"));
		return deepFreeze({
			validatorVersion: EONFOLK_SHAPE_SUBSET_VERSION,
			conforms: false,
			violations,
		});
	}
	if (!hasExactKeys(value, TOP_LEVEL_KEYS))
		violations.push(
			violation(
				"CLOSED_SHAPE",
				"$",
				"projection contains missing or unknown fields",
			),
		);
	if (!isExpectedContext(value["@context"]))
		violations.push(
			violation(
				"REMOTE_CONTEXT",
				"$.@context",
				"only the embedded JSON-LD 1.1 context is allowed",
			),
		);
	if (!isEonfolkUrn(value["@id"]))
		violations.push(
			violation("INVALID_IRI", "$.@id", "projection ID must be an EONFOLK URN"),
		);
	if (!hasExactStrings(value["@type"], TOP_LEVEL_TYPES))
		violations.push(
			violation(
				"DATATYPE",
				"$.@type",
				"projection requires the closed PROV bundle types",
			),
		);
	if (value["eon:schemaVersion"] !== OBSERVATORY_JSON_LD_VERSION)
		violations.push(
			violation(
				"DATATYPE",
				"$.eon:schemaVersion",
				"schema version is unsupported",
			),
		);
	const graph = value["@graph"];
	if (!Array.isArray(graph)) {
		violations.push(
			violation("DATATYPE", "$.@graph", "graph must be an array"),
		);
	} else {
		if (graph.length < 1)
			violations.push(
				violation("CARDINALITY", "$.@graph", "graph requires an activity node"),
			);
		if (graph.length > limits.maxNodes)
			violations.push(
				violation("MAX_NODES", "$.@graph", "graph exceeds node limit"),
			);
		const ids = new Set<string>();
		const references: { readonly id: string; readonly path: string }[] = [];
		for (const [index, node] of graph.entries()) {
			const path = `$.@graph[${index}]`;
			if (!validateNode(node, path, violations)) continue;
			const id = node["@id"];
			if (typeof id === "string") {
				if (ids.has(id))
					violations.push(
						violation("DUPLICATE_ID", `${path}.@id`, "node ID is duplicated"),
					);
				ids.add(id);
			}
			for (const reference of referencesFrom(node))
				references.push({ id: reference, path });
		}
		for (const reference of references) {
			if (!ids.has(reference.id))
				violations.push(
					violation(
						"DANGLING_REFERENCE",
						reference.path,
						"PROV reference does not resolve inside the authorized bundle",
					),
				);
		}
	}
	violations.sort((left, right) =>
		left.path < right.path
			? -1
			: left.path > right.path
				? 1
				: left.code < right.code
					? -1
					: left.code > right.code
						? 1
						: 0,
	);
	return deepFreeze({
		validatorVersion: EONFOLK_SHAPE_SUBSET_VERSION,
		conforms: violations.length === 0,
		violations,
	});
}
