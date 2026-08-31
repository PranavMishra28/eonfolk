/**
 * Resolve TypeScript sources that import sibling `.js` specifiers.
 * Lets `pnpm world:authority` run package sources without a build step.
 */
export async function resolve(specifier, context, nextResolve) {
	if (typeof specifier === "string" && specifier.endsWith(".js")) {
		try {
			return await nextResolve(specifier, context);
		} catch {
			return await nextResolve(specifier.replace(/\.js$/u, ".ts"), context);
		}
	}
	return nextResolve(specifier, context);
}
