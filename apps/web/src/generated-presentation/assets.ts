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
