import { bytesFromHex, domainHash, normalizeIngressText } from "./canonical.js";

export const RELEASE_GENESIS_SCHEMA_VERSION =
	"eonfolk-release-genesis-v1" as const;
export const WORLD_SCHEMA_VERSION = "eonfolk-world-v1" as const;
export const SIMULATION_VERSION = "eonfolk-simulation-v1" as const;
export const GENERATOR_VERSION = "eonfolk-generator-v1" as const;
export const CONTENT_VERSION = "eonfolk-content-v1" as const;
export const COGNITION_DEFAULT_VERSION =
	"eonfolk-cognition-standard-v1" as const;

export interface ReleaseGenesisVersions {
	readonly worldSchema: string;
	readonly simulation: string;
	readonly generator: string;
	readonly content: string;
	readonly cognitionDefault: string;
}

export interface ReleaseGenesis {
	readonly schemaVersion: typeof RELEASE_GENESIS_SCHEMA_VERSION;
	readonly releaseId: string;
	readonly seedHex: string;
	readonly versions: ReleaseGenesisVersions;
	readonly genesisHash: string;
}

export interface ExperimentWorldIdentity {
	readonly worldId: string;
	readonly releaseGenesisHash: string;
	readonly parentWorldId: string | null;
	readonly treatmentId: string;
	readonly identityHash: string;
}

const identifierPattern = /^[a-z][a-z0-9-]{0,63}$/u;

function canonicalIdentifier(value: string, label: string): string {
	const normalized = normalizeIngressText(value, {
		maxBytes: 64,
		maxCodePoints: 64,
	});
	if (!identifierPattern.test(normalized)) {
		throw new TypeError(`${label} must be a canonical lowercase identifier`);
	}
	return normalized;
}

function canonicalVersion(value: string, label: string): string {
	return canonicalIdentifier(value, label);
}

export async function createReleaseGenesis(input: {
	readonly releaseId: string;
	readonly seedHex: string;
	readonly versions?: Partial<ReleaseGenesisVersions>;
}): Promise<ReleaseGenesis> {
	bytesFromHex(input.seedHex, 32);
	const releaseId = canonicalIdentifier(input.releaseId, "releaseId");
	const versions: ReleaseGenesisVersions = {
		worldSchema: canonicalVersion(
			input.versions?.worldSchema ?? WORLD_SCHEMA_VERSION,
			"worldSchema",
		),
		simulation: canonicalVersion(
			input.versions?.simulation ?? SIMULATION_VERSION,
			"simulation",
		),
		generator: canonicalVersion(
			input.versions?.generator ?? GENERATOR_VERSION,
			"generator",
		),
		content: canonicalVersion(
			input.versions?.content ?? CONTENT_VERSION,
			"content",
		),
		cognitionDefault: canonicalVersion(
			input.versions?.cognitionDefault ?? COGNITION_DEFAULT_VERSION,
			"cognitionDefault",
		),
	};
	const identity = {
		schemaVersion: RELEASE_GENESIS_SCHEMA_VERSION,
		releaseId,
		seedHex: input.seedHex,
		versions,
	};
	return {
		...identity,
		genesisHash: await domainHash("EONFOLK:RELEASE-GENESIS:v1", identity),
	};
}

export async function createExperimentWorldIdentity(input: {
	readonly worldId: string;
	readonly releaseGenesisHash: string;
	readonly parentWorldId?: string | null;
	readonly treatmentId: string;
}): Promise<ExperimentWorldIdentity> {
	bytesFromHex(input.releaseGenesisHash, 32);
	const identity = {
		worldId: canonicalIdentifier(input.worldId, "worldId"),
		releaseGenesisHash: input.releaseGenesisHash,
		parentWorldId:
			input.parentWorldId === undefined || input.parentWorldId === null
				? null
				: canonicalIdentifier(input.parentWorldId, "parentWorldId"),
		treatmentId: canonicalIdentifier(input.treatmentId, "treatmentId"),
	};
	return {
		...identity,
		identityHash: await domainHash("EONFOLK:EXPERIMENT-WORLD:v1", identity),
	};
}
