export const GENERATED_FOLK_ASSET = Object.freeze({
	assetId: "eonfolk-folk-proxy-v1",
	url: "/assets/generated/eonfolk-folk-proxy.gltf",
	mediaType: "model/gltf+json",
	byteLength: 3_522,
	sha256: "8314ce09ca546ce516de51c04d444de12f75b92409f1fcbc955068c31da6b533",
	partNodeNames: Object.freeze([
		"torso",
		"head",
		"arm-left",
		"arm-right",
		"leg-left",
		"leg-right",
		"task-prop-anchor",
	]),
	provenance: Object.freeze({
		source: "repository-authored deterministic geometry",
		thirdPartyMaterial: false,
		rights:
			"Authored in this repository for EONFOLK; no third-party inputs or downloads; no standalone asset license granted.",
		productionStatus: "bounded V1 proxy; not final character art",
	}),
});

export const GENERATED_FOLK_BINARY_ASSET = Object.freeze({
	assetId: "eonfolk-folk-proxy-glb-v1",
	url: "/assets/generated/eonfolk-folk-proxy.glb",
	mediaType: "model/gltf-binary",
	byteLength: 2_800,
	sha256: "b08c8222619bee068144d0d8b50e508d74cbde9c95f499916eaa2ff0fc219cfe",
	generatedFrom: GENERATED_FOLK_ASSET.url,
	partNodeNames: GENERATED_FOLK_ASSET.partNodeNames,
	provenance: GENERATED_FOLK_ASSET.provenance,
});

export const GENERATED_ASSET_MANIFEST_URL =
	"/assets/generated/ASSET_MANIFEST.json";

export interface GeneratedAssetIntegrity {
	readonly status: "verified";
	readonly assetId: string;
	readonly byteLength: number;
	readonly sha256: string;
	readonly partNodeNames: readonly string[];
	readonly deterministicBinary: Readonly<{
		readonly assetId: string;
		readonly byteLength: number;
		readonly sha256: string;
	}>;
}

export function assertGeneratedAssetBudget(
	asset: Pick<typeof GENERATED_FOLK_ASSET, "byteLength">,
	maximumBytes = 4 * 1_024 * 1_024,
): void {
	if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1)
		throw new Error("generated asset budget must be a positive integer");
	if (asset.byteLength > maximumBytes)
		throw new Error(
			`generated folk asset exceeds budget: ${asset.byteLength} > ${maximumBytes}`,
		);
}

function hex(bytes: ArrayBuffer): string {
	return [...new Uint8Array(bytes)]
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("");
}

function record(value: unknown, label: string): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		throw new Error(`generated asset: ${label} is malformed`);
	return value as Record<string, unknown>;
}

function exactKeys(
	value: Readonly<Record<string, unknown>>,
	expected: readonly string[],
	label: string,
): void {
	const actual = Object.keys(value).sort();
	const required = [...expected].sort();
	if (
		actual.length !== required.length ||
		actual.some((key, index) => key !== required[index])
	)
		throw new Error(`generated asset: ${label} keys are unsupported`);
}

function matchesPartNodes(value: unknown): boolean {
	return (
		Array.isArray(value) &&
		value.length === GENERATED_FOLK_ASSET.partNodeNames.length &&
		value.every(
			(nodeName, index) =>
				nodeName === GENERATED_FOLK_ASSET.partNodeNames[index],
		)
	);
}

function assertManifestAsset(
	value: Readonly<Record<string, unknown>>,
	expected: typeof GENERATED_FOLK_ASSET | typeof GENERATED_FOLK_BINARY_ASSET,
	role: "authoring-source" | "delivery",
): void {
	exactKeys(
		value,
		[
			"assetId",
			"byteLength",
			"externalDependencies",
			"generatedFrom",
			"generator",
			"intendedRole",
			"mediaType",
			"partNodeNames",
			"path",
			"productionStatus",
			"rights",
			"role",
			"sha256",
			"source",
		],
		`manifest ${role} entry`,
	);
	if (
		value.assetId !== expected.assetId ||
		value.role !== role ||
		value.path !== expected.url ||
		value.mediaType !== expected.mediaType ||
		value.byteLength !== expected.byteLength ||
		value.sha256 !== expected.sha256 ||
		value.generatedFrom !==
			("generatedFrom" in expected ? expected.generatedFrom : null) ||
		value.source !== GENERATED_FOLK_ASSET.provenance.source ||
		value.rights !== GENERATED_FOLK_ASSET.provenance.rights ||
		value.productionStatus !==
			GENERATED_FOLK_ASSET.provenance.productionStatus ||
		!Array.isArray(value.externalDependencies) ||
		value.externalDependencies.length !== 0 ||
		!matchesPartNodes(value.partNodeNames)
	)
		throw new Error(`generated asset: manifest ${role} entry is inconsistent`);
}

/**
 * Verifies the exact repository-authored asset bytes before the embodied proxy
 * is admitted. The manifest and glTF must both be served from the app's own
 * origin; missing crypto support or any mismatch fails closed.
 */
export async function verifyGeneratedFolkAsset(
	fetcher: typeof fetch = globalThis.fetch,
): Promise<GeneratedAssetIntegrity> {
	if (typeof fetcher !== "function")
		throw new Error("generated asset: fetch is unavailable");
	if (globalThis.crypto?.subtle === undefined)
		throw new Error("generated asset: SHA-256 verification is unavailable");
	const [manifestResponse, assetResponse] = await Promise.all([
		fetcher(GENERATED_ASSET_MANIFEST_URL, {
			cache: "no-store",
			credentials: "same-origin",
		}),
		fetcher(GENERATED_FOLK_ASSET.url, {
			cache: "no-store",
			credentials: "same-origin",
		}),
	]);
	if (!manifestResponse.ok)
		throw new Error(
			`generated asset: manifest request failed (${manifestResponse.status})`,
		);
	if (!assetResponse.ok)
		throw new Error(
			`generated asset: glTF request failed (${assetResponse.status})`,
		);
	const manifest = record(await manifestResponse.json(), "manifest");
	exactKeys(
		manifest,
		["assets", "authoredOn", "budget", "pipeline", "schemaVersion"],
		"manifest",
	);
	if (manifest.schemaVersion !== "eonfolk-generated-asset-manifest-v2")
		throw new Error("generated asset: manifest version is unsupported");
	if (manifest.authoredOn !== "2026-08-23")
		throw new Error(
			"generated asset: manifest provenance date is inconsistent",
		);
	const budget = record(manifest.budget, "manifest budget");
	exactKeys(
		budget,
		["deliveryBytes", "maximumInitialGeneratedAssetBytes", "trackedBytes"],
		"manifest budget",
	);
	if (
		budget.maximumInitialGeneratedAssetBytes !== 4 * 1_024 * 1_024 ||
		budget.deliveryBytes !== GENERATED_FOLK_BINARY_ASSET.byteLength ||
		budget.trackedBytes !==
			GENERATED_FOLK_ASSET.byteLength +
				GENERATED_FOLK_BINARY_ASSET.byteLength ||
		(budget.trackedBytes as number) >
			(budget.maximumInitialGeneratedAssetBytes as number)
	)
		throw new Error("generated asset: manifest budget is inconsistent");
	const pipeline = record(manifest.pipeline, "manifest pipeline");
	exactKeys(
		pipeline,
		[
			"conversion",
			"deliveryPath",
			"determinism",
			"sourcePath",
			"validationCommand",
			"validator",
			"writeCommand",
		],
		"manifest pipeline",
	);
	if (
		pipeline.validator !== "scripts/validate-generated-assets.mjs" ||
		pipeline.writeCommand !== "pnpm assets:write" ||
		pipeline.validationCommand !== "pnpm assets:validate" ||
		pipeline.sourcePath !== GENERATED_FOLK_ASSET.url ||
		pipeline.deliveryPath !== GENERATED_FOLK_BINARY_ASSET.url
	)
		throw new Error("generated asset: manifest pipeline is inconsistent");
	if (!Array.isArray(manifest.assets) || manifest.assets.length !== 2)
		throw new Error("generated asset: manifest assets are malformed");
	const manifestAssets = manifest.assets.map((value, index) =>
		record(value, `manifest asset ${index}`),
	);
	const sourceEntry = manifestAssets.find(
		(value) => value.assetId === GENERATED_FOLK_ASSET.assetId,
	);
	const binaryEntry = manifestAssets.find(
		(value) => value.assetId === GENERATED_FOLK_BINARY_ASSET.assetId,
	);
	if (sourceEntry === undefined || binaryEntry === undefined)
		throw new Error("generated asset: manifest entries are missing");
	assertManifestAsset(sourceEntry, GENERATED_FOLK_ASSET, "authoring-source");
	assertManifestAsset(binaryEntry, GENERATED_FOLK_BINARY_ASSET, "delivery");
	const bytes = await assetResponse.arrayBuffer();
	if (bytes.byteLength !== GENERATED_FOLK_ASSET.byteLength)
		throw new Error(
			"generated asset: glTF byte length does not match contract",
		);
	const sha256 = hex(await globalThis.crypto.subtle.digest("SHA-256", bytes));
	if (sha256 !== GENERATED_FOLK_ASSET.sha256)
		throw new Error("generated asset: glTF digest does not match contract");
	let gltf: Record<string, unknown>;
	try {
		gltf = record(JSON.parse(new TextDecoder().decode(bytes)), "glTF");
	} catch (error) {
		throw new Error("generated asset: glTF JSON is malformed", {
			cause: error,
		});
	}
	const asset = record(gltf.asset, "glTF asset");
	if (
		asset.version !== "2.0" ||
		asset.generator !== "EONFOLK repository-authored proxy asset v1" ||
		asset.copyright !== "Repository-authored; contains no third-party material"
	)
		throw new Error("generated asset: glTF provenance is inconsistent");
	if (
		Object.hasOwn(gltf, "extensionsRequired") ||
		Object.hasOwn(gltf, "extensionsUsed")
	)
		throw new Error("generated asset: glTF extensions are not admitted");
	if (!Array.isArray(gltf.buffers) || gltf.buffers.length !== 1)
		throw new Error("generated asset: glTF buffers are malformed");
	const buffer = record(gltf.buffers[0], "glTF buffer");
	if (
		typeof buffer.uri !== "string" ||
		!buffer.uri.startsWith("data:application/octet-stream;base64,")
	)
		throw new Error("generated asset: glTF contains an external buffer URI");
	if (
		Array.isArray(gltf.images) &&
		gltf.images.some((value, index) => {
			const image = record(value, `glTF image ${index}`);
			return typeof image.uri === "string" && !image.uri.startsWith("data:");
		})
	)
		throw new Error("generated asset: glTF contains an external image URI");
	if (!Array.isArray(gltf.nodes))
		throw new Error("generated asset: glTF nodes are malformed");
	const names = gltf.nodes.map((value, index) => {
		const node = record(value, `glTF node ${index}`);
		return typeof node.name === "string" ? node.name : "";
	});
	const nodeNames = new Set(
		gltf.nodes.map((value, index) => {
			const node = record(value, `glTF node ${index}`);
			return typeof node.name === "string" ? node.name : "";
		}),
	);
	if (
		nodeNames.size !== names.length ||
		nodeNames.size !== GENERATED_FOLK_ASSET.partNodeNames.length + 1 ||
		!nodeNames.has("folk-root")
	)
		throw new Error("generated asset: glTF node contract is not closed");
	for (const nodeName of GENERATED_FOLK_ASSET.partNodeNames)
		if (!nodeNames.has(nodeName))
			throw new Error(`generated asset: glTF is missing ${nodeName}`);
	return Object.freeze({
		status: "verified",
		assetId: GENERATED_FOLK_ASSET.assetId,
		byteLength: bytes.byteLength,
		sha256,
		partNodeNames: GENERATED_FOLK_ASSET.partNodeNames,
		deterministicBinary: Object.freeze({
			assetId: GENERATED_FOLK_BINARY_ASSET.assetId,
			byteLength: GENERATED_FOLK_BINARY_ASSET.byteLength,
			sha256: GENERATED_FOLK_BINARY_ASSET.sha256,
		}),
	});
}
