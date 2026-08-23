import {
	COGNITION_VERSION,
	type DecisionContext,
	domainHash,
	type IntentProposal,
	proposalHash,
	sha256Hex,
} from "../../protocol/src/index.js";
import type { BrainPort } from "./brain-port.js";

export const MODEL_CHOICE_SCHEMA_VERSION = "eonfolk-model-choice-v1" as const;
export const MODEL_PROMPT_TEMPLATE_VERSION = "eonfolk-model-prompt-v1" as const;

const promptTemplate = [
	"Choose exactly one action from actionCatalog.",
	"Use only the supplied visible records, relationships, values, plan, and public action metadata.",
	"Return one JSON object matching responseSchema, with no Markdown, code, private reasoning, or extra fields.",
	"publicJustification must be 8-180 NFC characters, contain no control characters, and end with punctuation.",
].join("\n");

const responseSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"schemaVersion",
		"actionId",
		"publicJustification",
		"visibleRecordIdsRead",
		"relationshipIdsRead",
		"valueIdsRead",
		"commitmentIdsRead",
		"counselDisposition",
	],
	properties: {
		schemaVersion: { const: MODEL_CHOICE_SCHEMA_VERSION },
		actionId: { type: "string" },
		publicJustification: { type: "string", minLength: 8, maxLength: 180 },
		visibleRecordIdsRead: { type: "array", items: { type: "string" } },
		relationshipIdsRead: { type: "array", items: { type: "string" } },
		valueIdsRead: { type: "array", items: { type: "string" } },
		commitmentIdsRead: { type: "array", items: { type: "string" } },
		counselDisposition: {
			enum: ["accepted", "rejected", "reinterpreted", "not-applicable"],
		},
	},
} as const;

export interface ModelChoiceRequest {
	readonly schemaVersion: "eonfolk-model-choice-request-v1";
	readonly promptTemplateVersion: typeof MODEL_PROMPT_TEMPLATE_VERSION;
	readonly prompt: string;
	readonly context: {
		readonly contextId: string;
		readonly actorId: string;
		readonly revision: number;
		readonly decisionReason: DecisionContext["decisionReason"];
		readonly visibleRecords: readonly {
			readonly recordId: string;
			readonly kind: string;
			readonly proposition: string;
			readonly confidence: number | null;
			readonly sourceIds: readonly string[];
		}[];
		readonly values: DecisionContext["values"];
		readonly relationships: DecisionContext["relationships"];
		readonly activeStandingPlan: DecisionContext["activeStandingPlan"];
		readonly actionCatalog: DecisionContext["actionCatalog"];
		readonly counselIntent: DecisionContext["counselIntent"];
	};
	readonly responseSchema: typeof responseSchema;
}

/**
 * The host-owned transport is the only component allowed to invoke a process.
 * It returns the exact UTF-8 model artifact; the cognition package itself has
 * no filesystem, process, provider SDK, or network authority.
 */
export interface ModelChoiceTransport {
	invoke(request: ModelChoiceRequest, signal?: AbortSignal): Promise<string>;
}

export interface ModelBrainConfiguration {
	readonly provider: string;
	readonly model: string;
	readonly modelVersion: string;
	readonly maxRequestBytes: number;
	readonly maxResponseBytes: number;
}

interface ModelChoice {
	readonly schemaVersion: typeof MODEL_CHOICE_SCHEMA_VERSION;
	readonly actionId: string;
	readonly publicJustification: string;
	readonly visibleRecordIdsRead: readonly string[];
	readonly relationshipIdsRead: readonly string[];
	readonly valueIdsRead: readonly string[];
	readonly commitmentIdsRead: readonly string[];
	readonly counselDisposition:
		| "accepted"
		| "rejected"
		| "reinterpreted"
		| "not-applicable";
}

function assertBoundedLabel(value: string, label: string): void {
	if (
		value.length < 1 ||
		value.length > 128 ||
		value !== value.normalize("NFC") ||
		[...value].some((character) => {
			const code = character.codePointAt(0);
			return code !== undefined && (code <= 0x1f || code === 0x7f);
		})
	)
		throw new TypeError(`${label} is not a bounded safe label`);
}

function assertByteBudget(value: number, label: string): void {
	if (!Number.isSafeInteger(value) || value < 256 || value > 1_048_576)
		throw new RangeError(`${label} is outside the bounded byte range`);
}

function exactKeys(
	value: Record<string, unknown>,
	expected: readonly string[],
): boolean {
	const actual = Object.keys(value).sort();
	const sorted = [...expected].sort();
	return (
		actual.length === sorted.length &&
		actual.every((key, index) => key === sorted[index])
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, maximum: number): value is string[] {
	return (
		Array.isArray(value) &&
		value.length <= maximum &&
		value.every((item) => typeof item === "string")
	);
}

function parseChoice(raw: string, context: DecisionContext): ModelChoice {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new TypeError("model artifact is not one JSON object");
	}
	if (
		!isRecord(parsed) ||
		!exactKeys(parsed, [
			"schemaVersion",
			"actionId",
			"publicJustification",
			"visibleRecordIdsRead",
			"relationshipIdsRead",
			"valueIdsRead",
			"commitmentIdsRead",
			"counselDisposition",
		]) ||
		parsed.schemaVersion !== MODEL_CHOICE_SCHEMA_VERSION ||
		typeof parsed.actionId !== "string" ||
		typeof parsed.publicJustification !== "string" ||
		!stringArray(parsed.visibleRecordIdsRead, context.budgets.maxRecords) ||
		!stringArray(parsed.relationshipIdsRead, 128) ||
		!stringArray(parsed.valueIdsRead, 128) ||
		!stringArray(parsed.commitmentIdsRead, context.budgets.maxRecords) ||
		!["accepted", "rejected", "reinterpreted", "not-applicable"].includes(
			String(parsed.counselDisposition),
		)
	)
		throw new TypeError("model artifact violates the closed choice schema");
	return parsed as unknown as ModelChoice;
}

function requestFor(context: DecisionContext): ModelChoiceRequest {
	return {
		schemaVersion: "eonfolk-model-choice-request-v1",
		promptTemplateVersion: MODEL_PROMPT_TEMPLATE_VERSION,
		prompt: promptTemplate,
		context: {
			contextId: context.contextId,
			actorId: context.actorId,
			revision: context.revision,
			decisionReason: context.decisionReason,
			visibleRecords: context.visibleRecords.map((record) => ({
				recordId: record.recordId,
				kind: record.kind,
				proposition: record.proposition,
				confidence: record.confidence,
				sourceIds: record.sourceIds,
			})),
			values: context.values,
			relationships: context.relationships,
			activeStandingPlan: context.activeStandingPlan,
			actionCatalog: context.actionCatalog,
			counselIntent: context.counselIntent,
		},
		responseSchema,
	};
}

export function createModelBrain(
	configuration: ModelBrainConfiguration,
	transport: ModelChoiceTransport,
): BrainPort {
	assertBoundedLabel(configuration.provider, "provider");
	assertBoundedLabel(configuration.model, "model");
	assertBoundedLabel(configuration.modelVersion, "modelVersion");
	assertByteBudget(configuration.maxRequestBytes, "maxRequestBytes");
	assertByteBudget(configuration.maxResponseBytes, "maxResponseBytes");
	return {
		async propose(context, signal): Promise<IntentProposal> {
			const request = requestFor(context);
			const requestBytes = new TextEncoder().encode(JSON.stringify(request));
			if (requestBytes.byteLength > configuration.maxRequestBytes)
				throw new RangeError("model request exceeds its byte budget");
			const raw = await transport.invoke(request, signal);
			const artifactBytes = new TextEncoder().encode(raw);
			if (artifactBytes.byteLength > configuration.maxResponseBytes)
				throw new RangeError("model artifact exceeds its byte budget");
			const choice = parseChoice(raw, context);
			const catalogEntry = context.actionCatalog.find(
				(entry) => entry.actionId === choice.actionId,
			);
			if (catalogEntry === undefined)
				throw new TypeError("model selected an unavailable action");
			const artifactHash = await sha256Hex(artifactBytes);
			const withoutHash = {
				schemaVersion: "eonfolk-intent-proposal-v1" as const,
				proposalId: `proposal-model-${artifactHash.slice(0, 24)}`,
				contextId: context.contextId,
				actorId: context.actorId,
				revision: context.revision,
				actionId: choice.actionId,
				action: catalogEntry.action,
				planProposal: null,
				memoryProposal: null,
				provenance: {
					cognitionKind: "model" as const,
					cognitionVersion: COGNITION_VERSION,
					provider: configuration.provider,
					model: configuration.model,
					modelVersion: configuration.modelVersion,
					promptTemplateHash: await domainHash(
						"EONFOLK:MODEL-PROMPT-TEMPLATE:v1",
						{ version: MODEL_PROMPT_TEMPLATE_VERSION, promptTemplate },
					),
					proposalSchemaHash: await domainHash(
						"EONFOLK:MODEL-CHOICE-SCHEMA:v1",
						responseSchema,
					),
					artifactHash,
				},
				publicJustification: choice.publicJustification,
				explanation: {
					selectedActionId: choice.actionId,
					templateId: "model-proposal-v1",
					decisiveReasonCodes: [],
					visibleRecordIdsRead: choice.visibleRecordIdsRead,
					relationshipIdsRead: choice.relationshipIdsRead,
					valueIdsRead: choice.valueIdsRead,
					commitmentIdsRead: choice.commitmentIdsRead,
					scoreTerms: [],
					totalScore: 0,
					tieBreak: { used: false, draw: null, tiedActionIds: [] },
					counselDisposition: choice.counselDisposition,
					discardedCandidates: [],
				},
			};
			return {
				...withoutHash,
				proposalHash: await proposalHash(withoutHash),
			};
		},
	};
}
