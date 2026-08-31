import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
	if (
		specifier.endsWith(".js") &&
		(specifier.startsWith("./") || specifier.startsWith("../")) &&
		context.parentURL !== undefined
	) {
		const candidate = join(
			dirname(fileURLToPath(context.parentURL)),
			specifier.replace(/\.js$/u, ".ts"),
		);
		if (existsSync(candidate)) {
			return nextResolve(pathToFileURL(candidate).href, context);
		}
	}
	return nextResolve(specifier, context);
}
