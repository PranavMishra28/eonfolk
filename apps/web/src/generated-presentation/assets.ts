export const GENERATED_FOLK_ASSET = Object.freeze({
	assetId: "eonfolk-folk-proxy-v1",
	url: "/assets/generated/eonfolk-folk-proxy.gltf",
});

export const GENERATED_FOLK_BINARY_ASSET = Object.freeze({
	assetId: "eonfolk-folk-proxy-glb-v1",
	url: "/assets/generated/eonfolk-folk-proxy.glb",
	byteLength: 3_152,
	sha256: "7d738a548521e82f955dbc58fd8214aa99956c3cd79920b7143ceb2f35831330",
});

export const GENERATED_ASSET_MANIFEST_URL =
	"/assets/generated/ASSET_MANIFEST.json";
const GENERATED_ASSET_MANIFEST = Object.freeze({
	byteLength: 2_587,
	sha256: "43e8c051150acd704a1c711d15d27c2de9c01177a937da9cb2cba03fe05b3f74",
});

export interface GeneratedAssetIntegrity {
	readonly status: "verified";
	readonly assetId: string;
	readonly byteLength: number;
	readonly sha256: string;
	readonly rendererIntegration: "procedural-reference-only";
	readonly manifestSha256: string;
}

export function assertGeneratedAssetBudget(
	asset: Readonly<{ readonly byteLength: number }>,
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

/**
 * Verifies the exact repository-authored delivery GLB before the procedural
 * embodied proxy is admitted. The GLB is an integrity-checked visual reference;
 * the current renderer does not parse or render it. The manifest and GLB must
 * both be served from the app's own origin; any mismatch fails closed.
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
			redirect: "error",
		}),
		fetcher(GENERATED_FOLK_BINARY_ASSET.url, {
			cache: "no-store",
			credentials: "same-origin",
			redirect: "error",
		}),
	]);
	if (!manifestResponse.ok)
		throw new Error(
			`generated asset: manifest request failed (${manifestResponse.status})`,
		);
	if (!assetResponse.ok)
		throw new Error(
			`generated asset: GLB request failed (${assetResponse.status})`,
		);
	const [manifestBytes, bytes] = await Promise.all([
		manifestResponse.arrayBuffer(),
		assetResponse.arrayBuffer(),
	]);
	if (manifestBytes.byteLength !== GENERATED_ASSET_MANIFEST.byteLength)
		throw new Error("generated asset: manifest byte length does not match");
	const manifestSha256 = hex(
		await globalThis.crypto.subtle.digest("SHA-256", manifestBytes),
	);
	if (manifestSha256 !== GENERATED_ASSET_MANIFEST.sha256)
		throw new Error("generated asset: manifest digest does not match");
	if (bytes.byteLength !== GENERATED_FOLK_BINARY_ASSET.byteLength)
		throw new Error("generated asset: GLB byte length does not match contract");
	const sha256 = hex(await globalThis.crypto.subtle.digest("SHA-256", bytes));
	if (sha256 !== GENERATED_FOLK_BINARY_ASSET.sha256)
		throw new Error("generated asset: GLB digest does not match contract");
	return Object.freeze({
		status: "verified",
		assetId: GENERATED_FOLK_BINARY_ASSET.assetId,
		byteLength: bytes.byteLength,
		sha256,
		manifestSha256,
		rendererIntegration: "procedural-reference-only",
	});
}
