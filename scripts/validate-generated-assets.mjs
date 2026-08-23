import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const GENERATED_ASSET_SCHEMA_VERSION =
	"eonfolk-generated-asset-manifest-v2";
export const GENERATED_ASSET_BUDGET_BYTES = 4 * 1_024 * 1_024;
export const GENERATED_PART_NODE_NAMES = Object.freeze([
	"torso",
	"head",
	"arm-left",
	"arm-right",
	"leg-left",
	"leg-right",
	"task-prop-anchor",
]);

const SOURCE_URL = "/assets/generated/eonfolk-folk-proxy.gltf";
const BINARY_URL = "/assets/generated/eonfolk-folk-proxy.glb";
const RIGHTS =
	"Authored in this repository for EONFOLK; no third-party inputs or downloads; no standalone asset license granted.";
const PRODUCTION_STATUS = "bounded V1 proxy; not final character art";
const INTENDED_ROLE =
	"recognizable humanoid proxy with named pose parts and task-prop anchor";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BINARY_CHUNK = 0x004e4942;

function fail(message) {
	throw new Error(`generated assets: ${message}`);
}

function record(value, label) {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		fail(`${label} must be an object`);
	return value;
}

function exactKeys(value, expected, label) {
	const actual = Object.keys(value).sort();
	const required = [...expected].sort();
	if (
		actual.length !== required.length ||
		actual.some((key, index) => key !== required[index])
	)
		fail(`${label} keys are not the closed schema`);
}

function nonEmptyString(value, label) {
	if (typeof value !== "string" || value.length === 0)
		fail(`${label} must be a non-empty string`);
	return value;
}

function safeInteger(value, label) {
	if (!Number.isSafeInteger(value) || value < 0)
		fail(`${label} must be a non-negative safe integer`);
	return value;
}

function parseJson(bytes, label) {
	try {
		return record(JSON.parse(Buffer.from(bytes).toString("utf8")), label);
	} catch (error) {
		throw new Error(`generated assets: ${label} JSON is malformed`, {
			cause: error,
		});
	}
}

export function generatedAssetSha256(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}

function decodeEmbeddedBuffer(uri, label) {
	const match =
		/^data:application\/octet-stream;base64,([A-Za-z0-9+/]+={0,2})$/u.exec(uri);
	if (match?.[1] === undefined)
		fail(`${label} is not an embedded base64 buffer`);
	const decoded = Buffer.from(match[1], "base64");
	if (decoded.toString("base64") !== match[1])
		fail(`${label} base64 is not canonical`);
	return decoded;
}

function validateNamedNodes(document, label) {
	if (!Array.isArray(document.nodes)) fail(`${label} nodes must be an array`);
	const names = document.nodes.map((value, index) => {
		const node = record(value, `${label} node ${index}`);
		return nonEmptyString(node.name, `${label} node ${index} name`);
	});
	if (new Set(names).size !== names.length)
		fail(`${label} node names duplicate`);
	const expected = new Set(["folk-root", ...GENERATED_PART_NODE_NAMES]);
	if (
		names.length !== expected.size ||
		names.some((name) => !expected.has(name))
	)
		fail(`${label} part-node set does not match the closed contract`);
	const root = record(document.nodes[0], `${label} root node`);
	if (
		root.name !== "folk-root" ||
		!Array.isArray(root.children) ||
		root.children.length !== GENERATED_PART_NODE_NAMES.length ||
		root.children.some((value, index) => value !== index + 1)
	)
		fail(`${label} root hierarchy does not match the closed contract`);
	return names;
}

function validateNoExternalUris(document, label, mode) {
	if (!Array.isArray(document.buffers) || document.buffers.length !== 1)
		fail(`${label} must have exactly one buffer`);
	const buffer = record(document.buffers[0], `${label} buffer`);
	const byteLength = safeInteger(
		buffer.byteLength,
		`${label} buffer byte length`,
	);
	if (byteLength < 1) fail(`${label} buffer must not be empty`);
	if (mode === "source") {
		exactKeys(buffer, ["byteLength", "uri"], `${label} buffer`);
		nonEmptyString(buffer.uri, `${label} buffer URI`);
	} else {
		exactKeys(buffer, ["byteLength"], `${label} buffer`);
	}
	for (const [index, imageValue] of (document.images ?? []).entries()) {
		const image = record(imageValue, `${label} image ${index}`);
		if (Object.hasOwn(image, "uri")) {
			const uri = nonEmptyString(image.uri, `${label} image ${index} URI`);
			if (!uri.startsWith("data:"))
				fail(`${label} contains an external image URI`);
		}
	}
	if (
		Object.hasOwn(document, "extensionsRequired") ||
		Object.hasOwn(document, "extensionsUsed")
	)
		fail(`${label} extensions are not admitted by the V1 contract`);
	return { buffer, byteLength };
}

function validateProvenance(document, label) {
	const asset = record(document.asset, `${label} asset`);
	if (asset.version !== "2.0") fail(`${label} must be glTF 2.0`);
	if (
		asset.generator !== "EONFOLK repository-authored proxy asset v1" ||
		asset.copyright !== "Repository-authored; contains no third-party material"
	)
		fail(`${label} asset provenance does not match the repository contract`);
	const extras = record(document.extras, `${label} extras`);
	exactKeys(extras, ["eonfolk"], `${label} extras`);
	const eonfolk = record(extras.eonfolk, `${label} EONFOLK provenance`);
	exactKeys(
		eonfolk,
		[
			"productionStatus",
			"role",
			"schemaVersion",
			"source",
			"thirdPartyMaterial",
		],
		`${label} EONFOLK provenance`,
	);
	if (
		eonfolk.schemaVersion !== "eonfolk-generated-asset-provenance-v1" ||
		eonfolk.role !== INTENDED_ROLE ||
		eonfolk.source !== "repository-authored deterministic geometry" ||
		eonfolk.thirdPartyMaterial !== false ||
		eonfolk.productionStatus !== PRODUCTION_STATUS
	)
		fail(`${label} EONFOLK provenance values do not match the contract`);
}

function validateGeometryTables(document, label, binaryLength) {
	if (!Array.isArray(document.meshes) || document.meshes.length !== 5)
		fail(`${label} mesh table does not match the proxy contract`);
	if (!Array.isArray(document.accessors) || document.accessors.length !== 2)
		fail(`${label} accessor table does not match the proxy contract`);
	if (!Array.isArray(document.bufferViews) || document.bufferViews.length !== 2)
		fail(`${label} buffer-view table does not match the proxy contract`);
	for (const [index, value] of document.bufferViews.entries()) {
		const view = record(value, `${label} buffer view ${index}`);
		const offset = safeInteger(
			view.byteOffset ?? 0,
			`${label} buffer view ${index} offset`,
		);
		const length = safeInteger(
			view.byteLength,
			`${label} buffer view ${index} length`,
		);
		if (view.buffer !== 0 || offset + length > binaryLength)
			fail(`${label} buffer view ${index} escapes the admitted buffer`);
	}
}

export function validateGeneratedSourceGltf(bytes) {
	const document = parseJson(bytes, "source glTF");
	validateProvenance(document, "source glTF");
	const names = validateNamedNodes(document, "source glTF");
	const { buffer, byteLength } = validateNoExternalUris(
		document,
		"source glTF",
		"source",
	);
	const binary = decodeEmbeddedBuffer(buffer.uri, "source glTF buffer URI");
	if (binary.byteLength !== byteLength)
		fail("source glTF embedded buffer length does not match its declaration");
	validateGeometryTables(document, "source glTF", binary.byteLength);
	return Object.freeze({ document, binary, nodeNames: Object.freeze(names) });
}

function padToFour(bytes, paddingByte) {
	const padding = (4 - (bytes.byteLength % 4)) % 4;
	return padding === 0
		? Buffer.from(bytes)
		: Buffer.concat([Buffer.from(bytes), Buffer.alloc(padding, paddingByte)]);
}

export function buildGeneratedGlb(sourceBytes) {
	const source = validateGeneratedSourceGltf(sourceBytes);
	const document = structuredClone(source.document);
	delete document.buffers[0].uri;
	const json = padToFour(Buffer.from(JSON.stringify(document), "utf8"), 0x20);
	const binary = padToFour(source.binary, 0x00);
	const totalLength = 12 + 8 + json.byteLength + 8 + binary.byteLength;
	const output = Buffer.alloc(totalLength);
	output.writeUInt32LE(GLB_MAGIC, 0);
	output.writeUInt32LE(2, 4);
	output.writeUInt32LE(totalLength, 8);
	output.writeUInt32LE(json.byteLength, 12);
	output.writeUInt32LE(GLB_JSON_CHUNK, 16);
	json.copy(output, 20);
	const binaryHeader = 20 + json.byteLength;
	output.writeUInt32LE(binary.byteLength, binaryHeader);
	output.writeUInt32LE(GLB_BINARY_CHUNK, binaryHeader + 4);
	binary.copy(output, binaryHeader + 8);
	return output;
}

export function parseGeneratedGlb(bytes) {
	const input = Buffer.from(bytes);
	if (input.byteLength < 28) fail("GLB is shorter than its required chunks");
	if (input.readUInt32LE(0) !== GLB_MAGIC) fail("GLB magic is malformed");
	if (input.readUInt32LE(4) !== 2) fail("GLB version is unsupported");
	if (input.readUInt32LE(8) !== input.byteLength)
		fail("GLB declared length does not match its bytes");
	const jsonLength = input.readUInt32LE(12);
	if (input.readUInt32LE(16) !== GLB_JSON_CHUNK)
		fail("GLB first chunk is not JSON");
	if (
		jsonLength < 2 ||
		jsonLength % 4 !== 0 ||
		20 + jsonLength + 8 > input.length
	)
		fail("GLB JSON chunk length is malformed");
	const jsonChunk = input.subarray(20, 20 + jsonLength);
	const jsonText = jsonChunk.toString("utf8");
	const trimmedJson = jsonText.replace(/ +$/u, "");
	if (jsonText.length - trimmedJson.length > 3)
		fail("GLB JSON padding exceeds three spaces");
	let document;
	try {
		document = record(JSON.parse(trimmedJson), "GLB document");
	} catch (error) {
		throw new Error("generated assets: GLB JSON is malformed", {
			cause: error,
		});
	}
	const binaryHeader = 20 + jsonLength;
	const binaryLength = input.readUInt32LE(binaryHeader);
	if (input.readUInt32LE(binaryHeader + 4) !== GLB_BINARY_CHUNK)
		fail("GLB second chunk is not BIN");
	if (
		binaryLength % 4 !== 0 ||
		binaryHeader + 8 + binaryLength !== input.byteLength
	)
		fail("GLB BIN chunk length is malformed");
	validateProvenance(document, "GLB");
	const names = validateNamedNodes(document, "GLB");
	const { byteLength } = validateNoExternalUris(document, "GLB", "binary");
	if (binaryLength - byteLength < 0 || binaryLength - byteLength > 3)
		fail("GLB BIN chunk does not match its declared buffer length");
	const binary = input.subarray(
		binaryHeader + 8,
		binaryHeader + 8 + byteLength,
	);
	validateGeometryTables(document, "GLB", binary.byteLength);
	return Object.freeze({ document, binary, nodeNames: Object.freeze(names) });
}

function assetManifestEntry({
	assetId,
	role,
	path,
	mediaType,
	bytes,
	generatedFrom,
	generator,
}) {
	return Object.freeze({
		assetId,
		role,
		path,
		mediaType,
		byteLength: bytes.byteLength,
		sha256: generatedAssetSha256(bytes),
		generatedFrom,
		source: "repository-authored deterministic geometry",
		generator,
		rights: RIGHTS,
		externalDependencies: Object.freeze([]),
		partNodeNames: GENERATED_PART_NODE_NAMES,
		intendedRole: INTENDED_ROLE,
		productionStatus: PRODUCTION_STATUS,
	});
}

export function createGeneratedAssetManifest(sourceBytes, binaryBytes) {
	return Object.freeze({
		schemaVersion: GENERATED_ASSET_SCHEMA_VERSION,
		authoredOn: "2026-08-23",
		budget: Object.freeze({
			maximumInitialGeneratedAssetBytes: GENERATED_ASSET_BUDGET_BYTES,
			trackedBytes: sourceBytes.byteLength + binaryBytes.byteLength,
			deliveryBytes: binaryBytes.byteLength,
		}),
		pipeline: Object.freeze({
			validator: "scripts/validate-generated-assets.mjs",
			writeCommand: "pnpm assets:write",
			validationCommand: "pnpm assets:validate",
			sourcePath: SOURCE_URL,
			deliveryPath: BINARY_URL,
			conversion:
				"deterministic embedded-data glTF 2.0 to self-contained GLB 2.0",
			determinism:
				"GLB and manifest bytes are pure functions of the tracked source glTF and this validator version",
		}),
		assets: Object.freeze([
			assetManifestEntry({
				assetId: "eonfolk-folk-proxy-v1",
				role: "authoring-source",
				path: SOURCE_URL,
				mediaType: "model/gltf+json",
				bytes: sourceBytes,
				generatedFrom: null,
				generator:
					"repository-authored glTF 2.0 JSON with embedded cuboid geometry; no Blender authorship claimed",
			}),
			assetManifestEntry({
				assetId: "eonfolk-folk-proxy-glb-v1",
				role: "delivery",
				path: BINARY_URL,
				mediaType: "model/gltf-binary",
				bytes: binaryBytes,
				generatedFrom: SOURCE_URL,
				generator:
					"scripts/validate-generated-assets.mjs deterministic glTF-to-GLB conversion",
			}),
		]),
	});
}

function validateManifestEntry(value, index, files) {
	const entry = record(value, `manifest asset ${index}`);
	exactKeys(
		entry,
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
		`manifest asset ${index}`,
	);
	const path = nonEmptyString(entry.path, `manifest asset ${index} path`);
	if (!/^\/assets\/generated\/[a-z0-9-]+\.(?:gltf|glb)$/u.test(path))
		fail(`manifest asset ${index} path escapes the generated asset boundary`);
	if (
		!Array.isArray(entry.externalDependencies) ||
		entry.externalDependencies.length !== 0
	)
		fail(`manifest asset ${index} has external dependencies`);
	if (
		!Array.isArray(entry.partNodeNames) ||
		entry.partNodeNames.length !== GENERATED_PART_NODE_NAMES.length ||
		entry.partNodeNames.some(
			(name, nameIndex) => name !== GENERATED_PART_NODE_NAMES[nameIndex],
		)
	)
		fail(`manifest asset ${index} part-node contract does not match`);
	if (
		entry.source !== "repository-authored deterministic geometry" ||
		entry.rights !== RIGHTS ||
		entry.intendedRole !== INTENDED_ROLE ||
		entry.productionStatus !== PRODUCTION_STATUS
	)
		fail(`manifest asset ${index} provenance or rights do not match`);
	const fileBytes = files.get(path);
	if (fileBytes === undefined) fail(`manifest asset ${index} file is missing`);
	if (
		safeInteger(entry.byteLength, `manifest asset ${index} byte length`) !==
		fileBytes.byteLength
	)
		fail(`manifest asset ${index} byte length does not match file`);
	if (!/^[0-9a-f]{64}$/u.test(entry.sha256))
		fail(`manifest asset ${index} digest is malformed`);
	if (entry.sha256 !== generatedAssetSha256(fileBytes))
		fail(`manifest asset ${index} digest does not match file`);
	return entry;
}

export function validateGeneratedAssetSet({
	manifestBytes,
	sourceBytes,
	binaryBytes,
}) {
	const manifest = parseJson(manifestBytes, "manifest");
	exactKeys(
		manifest,
		["assets", "authoredOn", "budget", "pipeline", "schemaVersion"],
		"manifest",
	);
	if (manifest.schemaVersion !== GENERATED_ASSET_SCHEMA_VERSION)
		fail("manifest schema version is unsupported");
	if (manifest.authoredOn !== "2026-08-23")
		fail("manifest authorship date is not the fixed provenance date");
	const budget = record(manifest.budget, "manifest budget");
	exactKeys(
		budget,
		["deliveryBytes", "maximumInitialGeneratedAssetBytes", "trackedBytes"],
		"manifest budget",
	);
	if (
		budget.maximumInitialGeneratedAssetBytes !== GENERATED_ASSET_BUDGET_BYTES ||
		budget.trackedBytes !== sourceBytes.byteLength + binaryBytes.byteLength ||
		budget.deliveryBytes !== binaryBytes.byteLength ||
		budget.trackedBytes > budget.maximumInitialGeneratedAssetBytes ||
		budget.deliveryBytes > budget.maximumInitialGeneratedAssetBytes
	)
		fail("manifest budget is inconsistent or exceeded");
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
	const expected = createGeneratedAssetManifest(sourceBytes, binaryBytes);
	if (JSON.stringify(pipeline) !== JSON.stringify(expected.pipeline))
		fail("manifest pipeline contract does not match the validator");
	if (!Array.isArray(manifest.assets) || manifest.assets.length !== 2)
		fail("manifest must contain exactly the source and delivery assets");
	const files = new Map([
		[SOURCE_URL, Buffer.from(sourceBytes)],
		[BINARY_URL, Buffer.from(binaryBytes)],
	]);
	const entries = manifest.assets.map((entry, index) =>
		validateManifestEntry(entry, index, files),
	);
	if (JSON.stringify(entries) !== JSON.stringify(expected.assets))
		fail("manifest asset entries do not match the generated contract");
	const source = validateGeneratedSourceGltf(sourceBytes);
	const binary = parseGeneratedGlb(binaryBytes);
	if (!Buffer.from(source.binary).equals(Buffer.from(binary.binary)))
		fail("GLB geometry bytes do not equal the source glTF geometry bytes");
	const generated = buildGeneratedGlb(sourceBytes);
	if (!generated.equals(Buffer.from(binaryBytes)))
		fail("GLB bytes are not the deterministic source transformation");
	return Object.freeze({
		status: "verified",
		schemaVersion: GENERATED_ASSET_SCHEMA_VERSION,
		sourceBytes: sourceBytes.byteLength,
		deliveryBytes: binaryBytes.byteLength,
		trackedBytes: sourceBytes.byteLength + binaryBytes.byteLength,
		partNodeNames: GENERATED_PART_NODE_NAMES,
		externalDependencies: 0,
	});
}

export function validateGeneratedAssetsOnDisk(root = ROOT) {
	const directory = resolve(root, "apps/web/public/assets/generated");
	return validateGeneratedAssetSet({
		manifestBytes: readFileSync(resolve(directory, "ASSET_MANIFEST.json")),
		sourceBytes: readFileSync(resolve(directory, "eonfolk-folk-proxy.gltf")),
		binaryBytes: readFileSync(resolve(directory, "eonfolk-folk-proxy.glb")),
	});
}

export function writeGeneratedAssets(root = ROOT) {
	const directory = resolve(root, "apps/web/public/assets/generated");
	const sourceBytes = readFileSync(
		resolve(directory, "eonfolk-folk-proxy.gltf"),
	);
	const binaryBytes = buildGeneratedGlb(sourceBytes);
	const manifest = createGeneratedAssetManifest(sourceBytes, binaryBytes);
	writeFileSync(resolve(directory, "eonfolk-folk-proxy.glb"), binaryBytes);
	writeFileSync(
		resolve(directory, "ASSET_MANIFEST.json"),
		`${JSON.stringify(manifest, null, "\t")}\n`,
	);
	return validateGeneratedAssetsOnDisk(root);
}

function main() {
	const write = process.argv.includes("--write");
	const unknown = process.argv
		.slice(2)
		.filter((argument) => argument !== "--write");
	if (unknown.length > 0)
		fail("usage: validate-generated-assets.mjs [--write]");
	const report = write
		? writeGeneratedAssets()
		: validateGeneratedAssetsOnDisk();
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) main();
