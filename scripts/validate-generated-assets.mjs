import { createHash } from "node:crypto";
import {
	lstatSync,
	readdirSync,
	readFileSync,
	realpathSync,
	writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
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
const GENERATED_ASSET_FILENAMES = Object.freeze([
	"ASSET_MANIFEST.json",
	"eonfolk-folk-proxy.gltf",
	"eonfolk-folk-proxy.glb",
]);
const DOCUMENT_KEYS = Object.freeze([
	"accessors",
	"asset",
	"buffers",
	"bufferViews",
	"extras",
	"materials",
	"meshes",
	"nodes",
	"scene",
	"scenes",
]);
const EXPECTED_NODES = Object.freeze([
	null,
	Object.freeze({
		name: "torso",
		mesh: 0,
		translation: [0, 1.05, 0],
		scale: [0.46, 0.68, 0.28],
	}),
	Object.freeze({
		name: "head",
		mesh: 1,
		translation: [0, 1.82, 0],
		scale: [0.33, 0.36, 0.33],
	}),
	Object.freeze({
		name: "arm-left",
		mesh: 2,
		translation: [-0.58, 1.08, 0],
		scale: [0.13, 0.58, 0.14],
	}),
	Object.freeze({
		name: "arm-right",
		mesh: 2,
		translation: [0.58, 1.08, 0],
		scale: [0.13, 0.58, 0.14],
	}),
	Object.freeze({
		name: "leg-left",
		mesh: 3,
		translation: [-0.22, 0.35, 0],
		scale: [0.16, 0.58, 0.18],
	}),
	Object.freeze({
		name: "leg-right",
		mesh: 3,
		translation: [0.22, 0.35, 0],
		scale: [0.16, 0.58, 0.18],
	}),
	Object.freeze({
		name: "task-prop-anchor",
		mesh: 4,
		translation: [0.72, 0.92, 0],
		scale: [0.2, 0.2, 0.2],
	}),
]);
const EXPECTED_MATERIALS = Object.freeze([
	["hearth-cloth", [0.18, 0.42, 0.43, 1], 0.86],
	["warm-skin", [0.78, 0.59, 0.42, 1], 0.92],
	["sleeve", [0.28, 0.33, 0.29, 1], 0.9],
	["boots", [0.16, 0.13, 0.1, 1], 0.96],
	["task-prop", [0.47, 0.3, 0.16, 1], 0.92],
]);
const COMPONENT_BYTES = Object.freeze({ 5123: 2, 5126: 4 });
const ACCESSOR_COMPONENTS = Object.freeze({ SCALAR: 1, VEC3: 3 });
const EXPECTED_POSITION_TUPLES = Object.freeze([
	[-0.5, -0.5, -0.5],
	[0.5, -0.5, -0.5],
	[0.5, 0.5, -0.5],
	[-0.5, 0.5, -0.5],
	[-0.5, -0.5, 0.5],
	[0.5, -0.5, 0.5],
	[0.5, 0.5, 0.5],
	[-0.5, 0.5, 0.5],
]);
const EXPECTED_TRIANGLE_INDICES = Object.freeze([
	0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 5, 4, 0, 1, 5, 1, 6, 5, 1, 2, 6, 2, 7,
	6, 2, 3, 7, 3, 4, 7, 3, 0, 4,
]);

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

function boundedNumber(value, minimum, maximum, label) {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < minimum ||
		value > maximum
	)
		fail(`${label} is outside its admitted finite range`);
	return value;
}

function finiteVector(value, length, label) {
	if (!Array.isArray(value) || value.length !== length)
		fail(`${label} must be a finite ${length}-vector`);
	for (const component of value)
		boundedNumber(component, -Number.MAX_VALUE, Number.MAX_VALUE, label);
	return value;
}

function parseJson(bytes, label) {
	try {
		const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		return record(JSON.parse(text), label);
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
	exactKeys(root, ["children", "name"], `${label} root node`);
	if (
		root.name !== "folk-root" ||
		!Array.isArray(root.children) ||
		root.children.length !== GENERATED_PART_NODE_NAMES.length ||
		root.children.some((value, index) => value !== index + 1)
	)
		fail(`${label} root hierarchy does not match the closed contract`);
	if (
		document.scene !== 0 ||
		!Array.isArray(document.scenes) ||
		document.scenes.length !== 1
	)
		fail(`${label} selected scene does not match the closed contract`);
	const scene = record(document.scenes[0], `${label} scene 0`);
	exactKeys(scene, ["name", "nodes"], `${label} scene 0`);
	if (
		scene.name !== "EONFOLK folk proxy" ||
		!Array.isArray(scene.nodes) ||
		scene.nodes.length !== 1 ||
		scene.nodes[0] !== 0
	)
		fail(`${label} scene does not select the folk root`);
	for (const [index, expected] of EXPECTED_NODES.entries()) {
		const node = record(document.nodes[index], `${label} node ${index}`);
		if (expected === null) {
			if (Object.hasOwn(node, "mesh"))
				fail(`${label} root node must not bind a mesh`);
		} else {
			exactKeys(
				node,
				["mesh", "name", "rotation", "scale", "translation"],
				`${label} node ${index}`,
			);
			const translation = finiteVector(
				node.translation,
				3,
				`${label} node ${index} translation`,
			);
			const rotation = finiteVector(
				node.rotation,
				4,
				`${label} node ${index} rotation`,
			);
			const scale = finiteVector(node.scale, 3, `${label} node ${index} scale`);
			if (
				node.name !== expected.name ||
				node.mesh !== expected.mesh ||
				JSON.stringify(translation) !== JSON.stringify(expected.translation) ||
				JSON.stringify(rotation) !== JSON.stringify([0, 0, 0, 1]) ||
				JSON.stringify(scale) !== JSON.stringify(expected.scale) ||
				scale.some((component) => component <= 0)
			)
				fail(`${label} node ${index} transform is outside the proxy contract`);
		}
	}
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
	return { buffer, byteLength };
}

function validateProvenance(document, label) {
	const asset = record(document.asset, `${label} asset`);
	exactKeys(asset, ["copyright", "generator", "version"], `${label} asset`);
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

function validateGeometryTables(document, label, binaryBytes) {
	const binary = Buffer.from(binaryBytes);
	if (!Array.isArray(document.meshes) || document.meshes.length !== 5)
		fail(`${label} mesh table does not match the proxy contract`);
	if (!Array.isArray(document.accessors) || document.accessors.length !== 2)
		fail(`${label} accessor table does not match the proxy contract`);
	if (!Array.isArray(document.bufferViews) || document.bufferViews.length !== 2)
		fail(`${label} buffer-view table does not match the proxy contract`);
	const admittedViews = [];
	for (const [index, value] of document.bufferViews.entries()) {
		const view = record(value, `${label} buffer view ${index}`);
		exactKeys(
			view,
			["buffer", "byteLength", "byteOffset", "target"],
			`${label} buffer view ${index}`,
		);
		const offset = safeInteger(
			view.byteOffset ?? 0,
			`${label} buffer view ${index} offset`,
		);
		const length = safeInteger(
			view.byteLength,
			`${label} buffer view ${index} length`,
		);
		if (
			view.buffer !== 0 ||
			length < 1 ||
			offset % 4 !== 0 ||
			offset > binary.byteLength - length ||
			view.target !== (index === 0 ? 34962 : 34963)
		)
			fail(`${label} buffer view ${index} escapes the admitted buffer`);
		admittedViews.push({ offset, length });
	}
	const [positionsView, indicesView] = admittedViews;
	if (
		positionsView === undefined ||
		indicesView === undefined ||
		positionsView.offset !== 0 ||
		positionsView.length !== 96 ||
		indicesView.offset !== 96 ||
		indicesView.length !== 72 ||
		binary.byteLength !== 168 ||
		positionsView.offset + positionsView.length > indicesView.offset
	)
		fail(`${label} buffer views overlap or are out of order`);
	for (const [index, value] of document.accessors.entries()) {
		const accessor = record(value, `${label} accessor ${index}`);
		exactKeys(
			accessor,
			index === 0
				? ["bufferView", "componentType", "count", "max", "min", "type"]
				: ["bufferView", "componentType", "count", "type"],
			`${label} accessor ${index}`,
		);
		const bufferView = safeInteger(
			accessor.bufferView,
			`${label} accessor ${index} buffer view`,
		);
		const componentBytes = COMPONENT_BYTES[accessor.componentType];
		const componentCount = ACCESSOR_COMPONENTS[accessor.type];
		const count = safeInteger(
			accessor.count,
			`${label} accessor ${index} count`,
		);
		const admittedView = admittedViews[bufferView];
		const accessorBytes = count * componentBytes * componentCount;
		if (
			admittedView === undefined ||
			componentBytes === undefined ||
			componentCount === undefined ||
			count < 1 ||
			!Number.isSafeInteger(accessorBytes) ||
			admittedView.offset % componentBytes !== 0 ||
			accessorBytes !== admittedView.length
		)
			fail(`${label} accessor ${index} escapes its buffer view`);
	}
	const positions = record(document.accessors[0], `${label} position accessor`);
	const indices = record(document.accessors[1], `${label} index accessor`);
	const declaredMinimum = finiteVector(
		positions.min,
		3,
		`${label} position minimum`,
	);
	const declaredMaximum = finiteVector(
		positions.max,
		3,
		`${label} position maximum`,
	);
	if (
		declaredMinimum.some(
			(value, component) => value > declaredMaximum[component],
		)
	)
		fail(`${label} declared position bounds are inverted`);
	if (
		positions.bufferView !== 0 ||
		positions.componentType !== 5126 ||
		positions.count !== 8 ||
		positions.type !== "VEC3" ||
		JSON.stringify(declaredMinimum) !== JSON.stringify([-0.5, -0.5, -0.5]) ||
		JSON.stringify(declaredMaximum) !== JSON.stringify([0.5, 0.5, 0.5]) ||
		indices.bufferView !== 1 ||
		indices.componentType !== 5123 ||
		indices.count !== 36 ||
		indices.type !== "SCALAR"
	)
		fail(`${label} accessor semantics do not match the proxy contract`);
	const meshNames = [
		"woven-torso",
		"warm-head",
		"sleeved-arm",
		"grounded-leg",
		"task-prop",
	];
	if (!Array.isArray(document.materials) || document.materials.length !== 5)
		fail(`${label} material table does not match the proxy contract`);
	for (const [index, value] of document.materials.entries()) {
		const material = record(value, `${label} material ${index}`);
		exactKeys(
			material,
			["alphaMode", "doubleSided", "name", "pbrMetallicRoughness"],
			`${label} material ${index}`,
		);
		const pbr = record(
			material.pbrMetallicRoughness,
			`${label} material ${index} PBR`,
		);
		exactKeys(
			pbr,
			["baseColorFactor", "metallicFactor", "roughnessFactor"],
			`${label} material ${index} PBR`,
		);
		const baseColor = finiteVector(
			pbr.baseColorFactor,
			4,
			`${label} material ${index} base color`,
		);
		for (const [componentIndex, component] of baseColor.entries())
			boundedNumber(
				component,
				0,
				1,
				`${label} material ${index} base color ${componentIndex}`,
			);
		const metallic = boundedNumber(
			pbr.metallicFactor,
			0,
			1,
			`${label} material ${index} metallic factor`,
		);
		const roughness = boundedNumber(
			pbr.roughnessFactor,
			0,
			1,
			`${label} material ${index} roughness factor`,
		);
		const expected = EXPECTED_MATERIALS[index];
		if (
			expected === undefined ||
			material.name !== expected[0] ||
			material.alphaMode !== "OPAQUE" ||
			material.doubleSided !== false ||
			JSON.stringify(baseColor) !== JSON.stringify(expected[1]) ||
			metallic !== 0 ||
			roughness !== expected[2]
		)
			fail(`${label} material ${index} is outside the proxy contract`);
	}
	for (const [index, value] of document.meshes.entries()) {
		const mesh = record(value, `${label} mesh ${index}`);
		exactKeys(mesh, ["name", "primitives"], `${label} mesh ${index}`);
		if (
			mesh.name !== meshNames[index] ||
			!Array.isArray(mesh.primitives) ||
			mesh.primitives.length !== 1
		)
			fail(`${label} mesh ${index} does not match the closed contract`);
		const primitive = record(
			mesh.primitives[0],
			`${label} mesh ${index} primitive`,
		);
		exactKeys(
			primitive,
			["attributes", "indices", "material"],
			`${label} mesh ${index} primitive`,
		);
		const attributes = record(
			primitive.attributes,
			`${label} mesh ${index} primitive attributes`,
		);
		exactKeys(attributes, ["POSITION"], `${label} mesh ${index} attributes`);
		if (
			attributes.POSITION !== 0 ||
			primitive.indices !== 1 ||
			primitive.material !== index
		)
			fail(`${label} mesh ${index} primitive references are invalid`);
	}
	const actualMinimum = [
		Number.POSITIVE_INFINITY,
		Number.POSITIVE_INFINITY,
		Number.POSITIVE_INFINITY,
	];
	const actualMaximum = [
		Number.NEGATIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	];
	const actualPositions = [];
	for (let vertex = 0; vertex < 8; vertex += 1) {
		const tuple = [];
		for (let component = 0; component < 3; component += 1) {
			const value = binary.readFloatLE(
				positionsView.offset + vertex * 12 + component * 4,
			);
			boundedNumber(
				value,
				-Number.MAX_VALUE,
				Number.MAX_VALUE,
				`${label} position ${vertex}:${component}`,
			);
			actualMinimum[component] = Math.min(actualMinimum[component], value);
			actualMaximum[component] = Math.max(actualMaximum[component], value);
			tuple.push(value);
		}
		actualPositions.push(tuple);
	}
	if (
		JSON.stringify(actualMinimum) !== JSON.stringify(declaredMinimum) ||
		JSON.stringify(actualMaximum) !== JSON.stringify(declaredMaximum)
	)
		fail(`${label} declared position bounds do not match binary geometry`);
	if (
		JSON.stringify(actualPositions) !== JSON.stringify(EXPECTED_POSITION_TUPLES)
	)
		fail(`${label} positions do not match the admitted cube corners`);
	if (indices.count % 3 !== 0)
		fail(`${label} triangle index count is malformed`);
	const actualIndices = [];
	for (
		let offset = indicesView.offset;
		offset < indicesView.offset + 72;
		offset += 2
	) {
		const index = binary.readUInt16LE(offset);
		if (index >= 8)
			fail(`${label} index accessor references a missing position`);
		actualIndices.push(index);
	}
	for (let offset = 0; offset < actualIndices.length; offset += 3) {
		const first = actualPositions[actualIndices[offset]];
		const second = actualPositions[actualIndices[offset + 1]];
		const third = actualPositions[actualIndices[offset + 2]];
		if (first === undefined || second === undefined || third === undefined)
			fail(`${label} triangle references a missing position`);
		const firstEdge = second.map(
			(value, component) => value - first[component],
		);
		const secondEdge = third.map(
			(value, component) => value - first[component],
		);
		const normal = [
			firstEdge[1] * secondEdge[2] - firstEdge[2] * secondEdge[1],
			firstEdge[2] * secondEdge[0] - firstEdge[0] * secondEdge[2],
			firstEdge[0] * secondEdge[1] - firstEdge[1] * secondEdge[0],
		];
		const areaSquared = normal.reduce(
			(total, component) => total + component * component,
			0,
		);
		if (!Number.isFinite(areaSquared) || areaSquared <= 0)
			fail(`${label} triangle ${offset / 3} must have nonzero area`);
		const centroid = first.map(
			(value, component) => (value + second[component] + third[component]) / 3,
		);
		const outwardDot = normal.reduce(
			(total, component, index) => total + component * centroid[index],
			0,
		);
		if (!Number.isFinite(outwardDot) || outwardDot <= 0)
			fail(`${label} triangle ${offset / 3} must have an outward normal`);
	}
	if (
		JSON.stringify(actualIndices) !== JSON.stringify(EXPECTED_TRIANGLE_INDICES)
	)
		fail(
			`${label} indices do not match the admitted cuboid topology and winding`,
		);
}

export function validateGeneratedSourceGltf(bytes) {
	const document = parseJson(bytes, "source glTF");
	exactKeys(document, DOCUMENT_KEYS, "source glTF document");
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
	validateGeometryTables(document, "source glTF", binary);
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
	let jsonText;
	try {
		jsonText = new TextDecoder("utf-8", { fatal: true }).decode(jsonChunk);
	} catch (error) {
		throw new Error("generated assets: GLB JSON is not valid UTF-8", {
			cause: error,
		});
	}
	const trimmedJson = jsonText.trimEnd();
	const jsonPadding = jsonText.slice(trimmedJson.length);
	if (!/^ {0,3}$/u.test(jsonPadding))
		fail("GLB JSON padding is not zero to three spaces");
	let document;
	try {
		document = record(JSON.parse(trimmedJson), "GLB document");
	} catch (error) {
		throw new Error("generated assets: GLB JSON is malformed", {
			cause: error,
		});
	}
	exactKeys(document, DOCUMENT_KEYS, "GLB document");
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
	for (let offset = byteLength; offset < binaryLength; offset += 1)
		if (input[binaryHeader + 8 + offset] !== 0)
			fail("GLB BIN padding is not zero-filled");
	validateGeometryTables(document, "GLB", binary);
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

function isInside(parent, candidate) {
	const path = relative(parent, candidate);
	return path === "" || (!path.startsWith(`..${sep}`) && path !== "..");
}

export function validateGeneratedAssetPaths(root = ROOT) {
	const rootPath = realpathSync(root);
	const directory = resolve(root, "apps/web/public/assets/generated");
	const directoryStat = lstatSync(directory);
	if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink())
		fail("generated asset directory must be a real directory");
	const directoryPath = realpathSync(directory);
	if (!isInside(rootPath, directoryPath))
		fail("generated asset directory escapes the repository root");
	const entries = readdirSync(directory).sort();
	for (const filename of entries) {
		const path = resolve(directory, filename);
		const stat = lstatSync(path);
		if (stat.isSymbolicLink()) fail(`${filename} must not be a symlink`);
		if (!GENERATED_ASSET_FILENAMES.includes(filename))
			fail(`${filename} is an unexpected generated asset entry`);
		if (!stat.isFile()) fail(`${filename} must be a regular file`);
	}
	const expectedEntries = [...GENERATED_ASSET_FILENAMES].sort();
	if (
		entries.length !== expectedEntries.length ||
		entries.some((entry, index) => entry !== expectedEntries[index])
	)
		fail(
			"generated asset directory does not contain exactly the admitted files",
		);
	for (const filename of expectedEntries) {
		const path = resolve(directory, filename);
		const realPath = realpathSync(path);
		if (
			dirname(realPath) !== directoryPath ||
			!isInside(directoryPath, realPath)
		)
			fail(`${filename} escapes the generated asset directory`);
	}
	return directory;
}

export function validateGeneratedAssetsOnDisk(root = ROOT) {
	const directory = validateGeneratedAssetPaths(root);
	return validateGeneratedAssetSet({
		manifestBytes: readFileSync(resolve(directory, "ASSET_MANIFEST.json")),
		sourceBytes: readFileSync(resolve(directory, "eonfolk-folk-proxy.gltf")),
		binaryBytes: readFileSync(resolve(directory, "eonfolk-folk-proxy.glb")),
	});
}

export function writeGeneratedAssets(root = ROOT) {
	const directory = validateGeneratedAssetPaths(root);
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
