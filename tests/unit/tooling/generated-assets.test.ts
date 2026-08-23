import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { GENERATED_FOLK_BINARY_ASSET } from "../../../apps/web/src/generated-presentation/assets.js";
import {
	buildGeneratedGlb,
	createGeneratedAssetManifest,
	generatedAssetSha256,
	parseGeneratedGlb,
	validateGeneratedAssetPaths,
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
		expect(assets.sourceBytes.byteLength).toBe(3_929);
		expect(generatedAssetSha256(assets.sourceBytes)).toBe(
			"3056495e5471989dfce1eb41982f74760c89c457f6b00aec44f2c469ae0cc624",
		);
		expect(first.byteLength).toBe(GENERATED_FOLK_BINARY_ASSET.byteLength);
		expect(
			encoded(createGeneratedAssetManifest(assets.sourceBytes, first)),
		).toEqual(assets.manifestBytes);
		expect(validateGeneratedAssetSet(assets)).toMatchObject({
			status: "verified",
			deliveryBytes: 3_152,
			externalDependencies: 0,
		});
		expect(validateGeneratedAssetsOnDisk()).toMatchObject({
			trackedBytes: 7_081,
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

		const falseConversion = structuredClone(manifest);
		falseConversion.pipeline.conversion = "opaque converter output";
		expect(() =>
			validateGeneratedAssetSet({
				...assets,
				manifestBytes: encoded(falseConversion),
			}),
		).toThrow(/pipeline contract does not match/u);

		const falseDeterminism = structuredClone(manifest);
		falseDeterminism.pipeline.determinism = "claimed deterministic";
		expect(() =>
			validateGeneratedAssetSet({
				...assets,
				manifestBytes: encoded(falseDeterminism),
			}),
		).toThrow(/pipeline contract does not match/u);

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

	it("rejects broken scene, mesh, primitive, accessor, and binary semantics", async () => {
		const { sourceBytes } = await trackedAssets();
		const source = JSON.parse(sourceBytes.toString("utf8"));

		const wrongScene = structuredClone(source);
		wrongScene.scenes[0].nodes = [1];
		expect(() => validateGeneratedSourceGltf(encoded(wrongScene))).toThrow(
			/scene does not select the folk root/u,
		);

		const wrongNodeMesh = structuredClone(source);
		wrongNodeMesh.nodes[1].mesh = 4;
		expect(() => validateGeneratedSourceGltf(encoded(wrongNodeMesh))).toThrow(
			/transform is outside the proxy contract/u,
		);

		const invalidTranslation = structuredClone(source);
		invalidTranslation.nodes[1].translation = "not-a-vector";
		expect(() =>
			validateGeneratedSourceGltf(encoded(invalidTranslation)),
		).toThrow(/finite 3-vector/u);

		const invalidRotation = structuredClone(source);
		invalidRotation.nodes[1].rotation = [0, 0, 0, 2];
		expect(() => validateGeneratedSourceGltf(encoded(invalidRotation))).toThrow(
			/transform is outside the proxy contract/u,
		);

		const invalidScale = structuredClone(source);
		invalidScale.nodes[1].scale = [0, 0.68, 0.28];
		expect(() => validateGeneratedSourceGltf(encoded(invalidScale))).toThrow(
			/transform is outside the proxy contract/u,
		);

		const wrongPrimitive = structuredClone(source);
		wrongPrimitive.meshes[0].primitives[0].attributes.POSITION = 1;
		expect(() => validateGeneratedSourceGltf(encoded(wrongPrimitive))).toThrow(
			/primitive references are invalid/u,
		);

		const accessorEscape = structuredClone(source);
		accessorEscape.accessors[0].count = 9;
		expect(() => validateGeneratedSourceGltf(encoded(accessorEscape))).toThrow(
			/accessor 0 escapes its buffer view/u,
		);

		const viewEscape = structuredClone(source);
		viewEscape.bufferViews[1].byteOffset = 160;
		expect(() => validateGeneratedSourceGltf(encoded(viewEscape))).toThrow(
			/buffer view 1 escapes the admitted buffer/u,
		);

		const unapprovedStride = structuredClone(source);
		unapprovedStride.bufferViews[0].byteStride = 16;
		expect(() =>
			validateGeneratedSourceGltf(encoded(unapprovedStride)),
		).toThrow(/buffer view 0 keys are not the closed schema/u);

		const missingPosition = structuredClone(source);
		const prefix = "data:application/octet-stream;base64,";
		const geometry = Buffer.from(
			missingPosition.buffers[0].uri.slice(prefix.length),
			"base64",
		);
		geometry.writeUInt16LE(8, 96);
		missingPosition.buffers[0].uri = `${prefix}${geometry.toString("base64")}`;
		expect(() => validateGeneratedSourceGltf(encoded(missingPosition))).toThrow(
			/index accessor references a missing position/u,
		);

		const lyingBounds = structuredClone(source);
		const lyingGeometry = Buffer.from(
			lyingBounds.buffers[0].uri.slice(prefix.length),
			"base64",
		);
		lyingGeometry.writeFloatLE(99, 0);
		lyingBounds.buffers[0].uri = `${prefix}${lyingGeometry.toString("base64")}`;
		expect(() => validateGeneratedSourceGltf(encoded(lyingBounds))).toThrow(
			/declared position bounds do not match/u,
		);

		const nonFinitePosition = structuredClone(source);
		const nonFiniteGeometry = Buffer.from(
			nonFinitePosition.buffers[0].uri.slice(prefix.length),
			"base64",
		);
		nonFiniteGeometry.writeFloatLE(Number.NaN, 0);
		nonFinitePosition.buffers[0].uri = `${prefix}${nonFiniteGeometry.toString("base64")}`;
		expect(() =>
			validateGeneratedSourceGltf(encoded(nonFinitePosition)),
		).toThrow(/outside its admitted finite range/u);

		const interiorVertex = structuredClone(source);
		const interiorGeometry = Buffer.from(
			interiorVertex.buffers[0].uri.slice(prefix.length),
			"base64",
		);
		interiorGeometry.writeFloatLE(0, 0);
		interiorVertex.buffers[0].uri = `${prefix}${interiorGeometry.toString("base64")}`;
		expect(() => validateGeneratedSourceGltf(encoded(interiorVertex))).toThrow(
			/positions do not match the admitted cube corners/u,
		);

		for (const mutate of [
			(geometry: Buffer) => {
				for (let index = 0; index < 3; index += 1)
					geometry.writeUInt16LE(
						geometry.readUInt16LE(96 + index * 2),
						102 + index * 2,
					);
			},
			(geometry: Buffer) => {
				const second = geometry.readUInt16LE(98);
				geometry.writeUInt16LE(geometry.readUInt16LE(100), 98);
				geometry.writeUInt16LE(second, 100);
			},
			(geometry: Buffer) => geometry.writeUInt16LE(1, 100),
			(geometry: Buffer) => geometry.writeUInt16LE(7, 96),
		]) {
			const hostileTopology = structuredClone(source);
			const hostileGeometry = Buffer.from(
				hostileTopology.buffers[0].uri.slice(prefix.length),
				"base64",
			);
			mutate(hostileGeometry);
			hostileTopology.buffers[0].uri = `${prefix}${hostileGeometry.toString("base64")}`;
			expect(() =>
				validateGeneratedSourceGltf(encoded(hostileTopology)),
			).toThrow(
				/indices do not match the admitted cuboid topology and winding/u,
			);
		}
	});

	it("rejects unapproved top-level tables and malformed materials", async () => {
		const { sourceBytes } = await trackedAssets();
		const source = JSON.parse(sourceBytes.toString("utf8"));
		for (const key of [
			"animations",
			"cameras",
			"images",
			"samplers",
			"skins",
			"textures",
			"extensions",
			"extensionsRequired",
			"extensionsUsed",
		]) {
			const unapproved = structuredClone(source);
			unapproved[key] =
				key === "cameras"
					? [{ type: "perspective", perspective: { yfov: 1, znear: 0.1 } }]
					: [];
			expect(() => validateGeneratedSourceGltf(encoded(unapproved))).toThrow(
				/keys are not the closed schema/u,
			);
		}

		const malformedMaterial = structuredClone(source);
		malformedMaterial.materials[0].pbrMetallicRoughness = "invalid";
		expect(() =>
			validateGeneratedSourceGltf(encoded(malformedMaterial)),
		).toThrow(/PBR must be an object/u);

		const outOfRangeColor = structuredClone(source);
		outOfRangeColor.materials[0].pbrMetallicRoughness.baseColorFactor[3] = 1.1;
		expect(() => validateGeneratedSourceGltf(encoded(outOfRangeColor))).toThrow(
			/outside its admitted finite range/u,
		);

		const outOfRangeMetallic = structuredClone(source);
		outOfRangeMetallic.materials[0].pbrMetallicRoughness.metallicFactor = -0.1;
		expect(() =>
			validateGeneratedSourceGltf(encoded(outOfRangeMetallic)),
		).toThrow(/outside its admitted finite range/u);

		const wrongDoubleSided = structuredClone(source);
		wrongDoubleSided.materials[0].doubleSided = true;
		expect(() =>
			validateGeneratedSourceGltf(encoded(wrongDoubleSided)),
		).toThrow(/outside the proxy contract/u);
	});

	it("rejects symlinked files and generated directories that escape root", async () => {
		const assets = await trackedAssets();
		const scratch = await mkdtemp(join(tmpdir(), "eonfolk-assets-"));
		const outside = await mkdtemp(join(tmpdir(), "eonfolk-assets-outside-"));
		try {
			const directory = join(scratch, "apps/web/public/assets/generated");
			await mkdir(directory, { recursive: true });
			await Promise.all([
				writeFile(join(directory, "ASSET_MANIFEST.json"), assets.manifestBytes),
				writeFile(
					join(directory, "eonfolk-folk-proxy.gltf"),
					assets.sourceBytes,
				),
				writeFile(
					join(directory, "eonfolk-folk-proxy.glb"),
					assets.binaryBytes,
				),
			]);
			expect(validateGeneratedAssetPaths(scratch)).toBe(directory);
			const outsideGlb = join(outside, "outside.glb");
			await writeFile(outsideGlb, assets.binaryBytes);

			const extraFile = join(directory, "unreviewed.bin");
			await writeFile(extraFile, "not admitted");
			expect(() => validateGeneratedAssetPaths(scratch)).toThrow(
				/unexpected generated asset entry/u,
			);
			await rm(extraFile);

			const extraSymlink = join(directory, "outside-link.glb");
			await symlink(outsideGlb, extraSymlink);
			expect(() => validateGeneratedAssetPaths(scratch)).toThrow(
				/must not be a symlink/u,
			);
			await rm(extraSymlink);

			const extraDirectory = join(directory, "unreviewed-directory");
			await mkdir(extraDirectory);
			expect(() => validateGeneratedAssetPaths(scratch)).toThrow(
				/unexpected generated asset entry|must be a regular file/u,
			);
			await rm(extraDirectory, { recursive: true });

			await rm(join(directory, "eonfolk-folk-proxy.glb"));
			await symlink(outsideGlb, join(directory, "eonfolk-folk-proxy.glb"));
			expect(() => validateGeneratedAssetPaths(scratch)).toThrow(
				/must not be a symlink/u,
			);

			await rm(join(scratch, "apps/web/public/assets"), { recursive: true });
			await mkdir(join(scratch, "apps/web/public/assets"), { recursive: true });
			await symlink(outside, directory);
			expect(() => validateGeneratedAssetPaths(scratch)).toThrow(
				/directory must be a real directory|escapes/u,
			);
		} finally {
			await rm(scratch, { recursive: true, force: true });
			await rm(outside, { recursive: true, force: true });
		}
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
		const binaryStart = 28 + binaryBytes.readUInt32LE(12);
		const interiorVertex = Buffer.from(binaryBytes);
		interiorVertex.writeFloatLE(0, binaryStart);
		expect(() => parseGeneratedGlb(interiorVertex)).toThrow(
			/positions do not match the admitted cube corners/u,
		);

		const repeatedTriangle = Buffer.from(binaryBytes);
		for (let index = 0; index < 3; index += 1)
			repeatedTriangle.writeUInt16LE(
				repeatedTriangle.readUInt16LE(binaryStart + 96 + index * 2),
				binaryStart + 102 + index * 2,
			);
		expect(() => parseGeneratedGlb(repeatedTriangle)).toThrow(
			/indices do not match the admitted cuboid topology and winding/u,
		);

		const reversedWinding = Buffer.from(binaryBytes);
		const secondIndex = reversedWinding.readUInt16LE(binaryStart + 98);
		reversedWinding.writeUInt16LE(
			reversedWinding.readUInt16LE(binaryStart + 100),
			binaryStart + 98,
		);
		reversedWinding.writeUInt16LE(secondIndex, binaryStart + 100);
		expect(() => parseGeneratedGlb(reversedWinding)).toThrow(
			/indices do not match the admitted cuboid topology and winding/u,
		);

		const degenerateTriangle = Buffer.from(binaryBytes);
		degenerateTriangle.writeUInt16LE(1, binaryStart + 100);
		expect(() => parseGeneratedGlb(degenerateTriangle)).toThrow(
			/indices do not match the admitted cuboid topology and winding/u,
		);

		const arbitraryInRangeIndex = Buffer.from(binaryBytes);
		arbitraryInRangeIndex.writeUInt16LE(7, binaryStart + 96);
		expect(() => parseGeneratedGlb(arbitraryInRangeIndex)).toThrow(
			/indices do not match the admitted cuboid topology and winding/u,
		);
		for (const length of [0, 1, 11, 12, 19, 20, 27, 28, 100, 1_024])
			expect(() =>
				parseGeneratedGlb(binaryBytes.subarray(0, length)),
			).toThrow();
	});
});
