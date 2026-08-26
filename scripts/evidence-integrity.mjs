import { createHash } from "node:crypto";

export function canonicalJson(value) {
	if (value === null || typeof value === "boolean" || typeof value === "string")
		return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value))
			throw new Error("canonical JSON rejects non-finite numbers");
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		if (Object.keys(value).length !== value.length)
			throw new Error("canonical JSON rejects sparse or extended arrays");
		return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
	}
	if (
		typeof value !== "object" ||
		![Object.prototype, null].includes(Object.getPrototypeOf(value))
	)
		throw new Error("canonical JSON supports only JSON objects and values");
	return `{${Object.keys(value)
		.sort()
		.map((key) => {
			if (value[key] === undefined)
				throw new Error("canonical JSON rejects undefined object fields");
			return `${JSON.stringify(key)}:${canonicalJson(value[key])}`;
		})
		.join(",")}}`;
}

export function sha256Bytes(value) {
	return createHash("sha256").update(value).digest("hex");
}

export function contentSha256(value, hashField = "outputSha256") {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		throw new Error("content hash requires an object");
	const content = Object.fromEntries(
		Object.entries(value).filter(([key]) => key !== hashField),
	);
	return sha256Bytes(canonicalJson(content));
}
