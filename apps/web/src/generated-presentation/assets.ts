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
		productionStatus: "bounded V1 proxy; not final character art",
	}),
});

export const GENERATED_ASSET_MANIFEST_URL =
	"/assets/generated/ASSET_MANIFEST.json";

export interface GeneratedAssetIntegrity {
	readonly status: "verified";
	readonly assetId: string;
	readonly byteLength: number;
	readonly sha256: string;
	readonly partNodeNames: readonly string[];
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
	if (manifest.schemaVersion !== "eonfolk-generated-asset-manifest-v1")
		throw new Error("generated asset: manifest version is unsupported");
	if (!Array.isArray(manifest.assets))
		throw new Error("generated asset: manifest assets are malformed");
	const manifestAsset = manifest.assets
		.map((value, index) => record(value, `manifest asset ${index}`))
		.find((value) => value.assetId === GENERATED_FOLK_ASSET.assetId);
	if (
		manifestAsset === undefined ||
		manifestAsset.path !== GENERATED_FOLK_ASSET.url ||
		manifestAsset.mediaType !== GENERATED_FOLK_ASSET.mediaType ||
		manifestAsset.byteLength !== GENERATED_FOLK_ASSET.byteLength ||
		manifestAsset.sha256 !== GENERATED_FOLK_ASSET.sha256 ||
		!Array.isArray(manifestAsset.externalDependencies) ||
		manifestAsset.externalDependencies.length !== 0
	)
		throw new Error("generated asset: manifest entry does not match contract");
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
	if (!Array.isArray(gltf.nodes))
		throw new Error("generated asset: glTF nodes are malformed");
	const nodeNames = new Set(
		gltf.nodes.map((value, index) => {
			const node = record(value, `glTF node ${index}`);
			return typeof node.name === "string" ? node.name : "";
		}),
	);
	for (const nodeName of GENERATED_FOLK_ASSET.partNodeNames)
		if (!nodeNames.has(nodeName))
			throw new Error(`generated asset: glTF is missing ${nodeName}`);
	return Object.freeze({
		status: "verified",
		assetId: GENERATED_FOLK_ASSET.assetId,
		byteLength: bytes.byteLength,
		sha256,
		partNodeNames: GENERATED_FOLK_ASSET.partNodeNames,
	});
}
