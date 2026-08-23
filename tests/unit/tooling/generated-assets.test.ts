import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
	GENERATED_FOLK_ASSET,
	GENERATED_FOLK_BINARY_ASSET,
} from "../../../apps/web/src/generated-presentation/assets.js";
import {
	buildGeneratedGlb,
	createGeneratedAssetManifest,
	generatedAssetSha256,
	parseGeneratedGlb,
	validateGeneratedAssetSet,
	validateGeneratedAssetsOnDisk,
	validateGeneratedSourceGltf,
} from "../../../scripts/validate-generated-assets.mjs";

const assetPath = (name: string) =>
	resolve("apps/web/public/assets/generated", name);

async function trackedAssets() {
	const [manifestBytes, sourceBytes, binaryBytes] = await Promise.all([
		readFile(assetPath("ASSET_MANIFEST.json")),
		readFile(assetPath("eonfolk-folk-proxy.gltf")),
		readFile(assetPath("eonfolk-folk-proxy.glb")),
	]);
	return { manifestBytes, sourceBytes, binaryBytes };
}

function encoded(value: unknown): Buffer {
	return Buffer.from(`${JSON.stringify(value, null, "\t")}\n`, "utf8");
}

describe("generated asset pipeline", () => {
	it("reproduces and validates the tracked self-contained GLB exactly", async () => {
		const assets = await trackedAssets();
		const first = buildGeneratedGlb(assets.sourceBytes);
		const second = buildGeneratedGlb(assets.sourceBytes);

		expect(first).toEqual(second);
		expect(first).toEqual(assets.binaryBytes);
		expect(generatedAssetSha256(first)).toBe(
			GENERATED_FOLK_BINARY_ASSET.sha256,
		);
		expect(assets.sourceBytes.byteLength).toBe(GENERATED_FOLK_ASSET.byteLength);
		expect(generatedAssetSha256(assets.sourceBytes)).toBe(
			GENERATED_FOLK_ASSET.sha256,
		);
		expect(first.byteLength).toBe(GENERATED_FOLK_BINARY_ASSET.byteLength);
		expect(
			encoded(createGeneratedAssetManifest(assets.sourceBytes, first)),
		).toEqual(assets.manifestBytes);
		expect(validateGeneratedAssetSet(assets)).toMatchObject({
			status: "verified",
			deliveryBytes: 2_800,
			externalDependencies: 0,
		});
		expect(validateGeneratedAssetsOnDisk()).toMatchObject({
			trackedBytes: 6_322,
		});
	});

	it("rejects malformed, open, mismatched, and over-budget manifests", async () => {
		const assets = await trackedAssets();
		const manifest = JSON.parse(assets.manifestBytes.toString("utf8"));

		const malformed = Buffer.from("{not-json", "utf8");
		expect(() =>
			validateGeneratedAssetSet({ ...assets, manifestBytes: malformed }),
		).toThrow(/manifest JSON is malformed/u);

		const open = structuredClone(manifest);
		open.unreviewed = true;
		expect(() =>
			validateGeneratedAssetSet({ ...assets, manifestBytes: encoded(open) }),
		).toThrow(/closed schema/u);

		const external = structuredClone(manifest);
		external.assets[0].externalDependencies = ["https://example.invalid/a.bin"];
		expect(() =>
			validateGeneratedAssetSet({
				...assets,
				manifestBytes: encoded(external),
			}),
		).toThrow(/external dependencies/u);

		const lengthMismatch = structuredClone(manifest);
		lengthMismatch.assets[1].byteLength += 1;
		expect(() =>
			validateGeneratedAssetSet({
				...assets,
				manifestBytes: encoded(lengthMismatch),
			}),
		).toThrow(/byte length does not match/u);

		const digestMismatch = structuredClone(manifest);
		digestMismatch.assets[1].sha256 = "0".repeat(64);
		expect(() =>
			validateGeneratedAssetSet({
				...assets,
				manifestBytes: encoded(digestMismatch),
			}),
		).toThrow(/digest does not match/u);

		const overBudget = structuredClone(manifest);
		overBudget.budget.maximumInitialGeneratedAssetBytes = 1;
		expect(() =>
			validateGeneratedAssetSet({
				...assets,
				manifestBytes: encoded(overBudget),
			}),
		).toThrow(/budget is inconsistent or exceeded/u);

		const corruptBinary = Buffer.from(assets.binaryBytes);
		corruptBinary[corruptBinary.length - 1] ^= 0xff;
		expect(() =>
			validateGeneratedAssetSet({
				...assets,
				binaryBytes: corruptBinary,
			}),
		).toThrow(/digest does not match/u);

		expect(() =>
			validateGeneratedAssetSet({
				...assets,
				binaryBytes: assets.binaryBytes.subarray(0, -1),
			}),
		).toThrow(/budget is inconsistent|byte length does not match/u);
	});

	it("rejects external source URIs and missing or duplicated part nodes", async () => {
		const { sourceBytes } = await trackedAssets();
		const source = JSON.parse(sourceBytes.toString("utf8"));

		const external = structuredClone(source);
		external.buffers[0].uri = "https://example.invalid/proxy.bin";
		expect(() => validateGeneratedSourceGltf(encoded(external))).toThrow(
			/embedded base64 buffer/u,
		);

		const missingNode = structuredClone(source);
		missingNode.nodes = missingNode.nodes.filter(
			(node: { name: string }) => node.name !== "arm-right",
		);
		expect(() => validateGeneratedSourceGltf(encoded(missingNode))).toThrow(
			/part-node set/u,
		);

		const duplicateNode = structuredClone(source);
		duplicateNode.nodes[2].name = duplicateNode.nodes[1].name;
		expect(() => validateGeneratedSourceGltf(encoded(duplicateNode))).toThrow(
			/node names duplicate/u,
		);
	});

	it("rejects malformed GLB headers, chunks, JSON, and undeclared bytes", async () => {
		const { binaryBytes } = await trackedAssets();

		const badMagic = Buffer.from(binaryBytes);
		badMagic.writeUInt32LE(0, 0);
		expect(() => parseGeneratedGlb(badMagic)).toThrow(/magic is malformed/u);

		const badLength = Buffer.from(binaryBytes);
		badLength.writeUInt32LE(badLength.byteLength + 4, 8);
		expect(() => parseGeneratedGlb(badLength)).toThrow(
			/declared length does not match/u,
		);

		const badJsonType = Buffer.from(binaryBytes);
		badJsonType.writeUInt32LE(0, 16);
		expect(() => parseGeneratedGlb(badJsonType)).toThrow(
			/first chunk is not JSON/u,
		);

		const badJson = Buffer.from(binaryBytes);
		badJson[20] = "!".charCodeAt(0);
		expect(() => parseGeneratedGlb(badJson)).toThrow(/GLB JSON is malformed/u);

		const badBinaryType = Buffer.from(binaryBytes);
		const binaryHeader = 20 + badBinaryType.readUInt32LE(12);
		badBinaryType.writeUInt32LE(0, binaryHeader + 4);
		expect(() => parseGeneratedGlb(badBinaryType)).toThrow(
			/second chunk is not BIN/u,
		);

		const badBinaryLength = Buffer.from(binaryBytes);
		badBinaryLength.writeUInt32LE(
			badBinaryLength.readUInt32LE(binaryHeader) - 4,
			binaryHeader,
		);
		expect(() => parseGeneratedGlb(badBinaryLength)).toThrow(
			/BIN chunk length is malformed/u,
		);

		expect(parseGeneratedGlb(binaryBytes).binary.byteLength).toBe(168);
	});
});
