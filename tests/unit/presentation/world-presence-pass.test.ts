import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { buildGeneratedWorldExperience } from "../../../apps/web/src/generated-world-runtime.js";

const webSource = (path: string) =>
	readFile(new URL(`../../../apps/web/src/${path}`, import.meta.url), "utf8");

describe("bounded world-presence pass", () => {
	it("offers several truthful, place-grounded activities for the default settlement", async () => {
		const experience = await buildGeneratedWorldExperience();
		const projection = experience.projections[0];
		const embodiment = experience.embodiments[0];
		if (projection === undefined || embodiment === undefined)
			throw new Error("generated experience lacks its origin settlement");

		expect(embodiment.actors.length).toBe(projection.spatial.actors.length);
		expect(embodiment.actors.length).toBeGreaterThanOrEqual(3);
		expect(
			new Set(embodiment.actors.map(({ animationClass }) => animationClass))
				.size,
		).toBeGreaterThanOrEqual(3);
		for (const actor of embodiment.actors) {
			expect(
				projection.local.sites.some(({ siteId }) => siteId === actor.placeId),
			).toBe(true);
		}
		expect(projection.spatial.interactions).toHaveLength(1);
		expect(projection.spatial.interactions[0]).toMatchObject({
			participantIds: ["citizen-07", "citizen-08"],
			kind: "conversation",
			status: "in-progress",
		});
	});

	it("keeps the runtime proxy claim honest and interactions projection-owned", async () => {
		const [canvas, proxy] = await Promise.all([
			webSource("generated-world-canvas.tsx"),
			webSource("components/generated/GeneratedFolkProxy.tsx"),
		]);

		expect(canvas).toContain('data-folk-renderer="procedural-typed-proxy"');
		expect(canvas).toContain("data-folk-reference-asset");
		expect(canvas).not.toContain("data-runtime-folk-asset");
		expect(proxy).toContain("The glTF is not rendered");
		expect(proxy).not.toContain("useModel(");
		expect(proxy).not.toContain("<Container");
		expect(canvas).not.toContain("socialPeer");
		expect(canvas).toContain("projection.spatial.interactions.map");
		expect(canvas).toContain("interaction.interactionId");
		expect(canvas).toContain("actor.interactionTarget === null");
	});

	it("keeps human copy, world dominance, and mobile access explicit", async () => {
		const [app, main, canvas, styles, vite] = await Promise.all([
			webSource("V1GenesisApp.tsx"),
			webSource("main.tsx"),
			webSource("generated-world-canvas.tsx"),
			webSource("styles.css"),
			readFile(
				new URL("../../../apps/web/vite.config.ts", import.meta.url),
				"utf8",
			),
		]);

		expect(app).toContain("{model.actors.length} lives are unfolding");
		expect(app).toContain("GeneratedSceneTruth");
		expect(app).toContain("projection.spatial.interactions[0]");
		expect(app).toContain("PROP_WORDS[actor.prop]");
		expect(app).not.toContain("Seven lives");
		expect(app).not.toContain("progress basis points");
		expect(app).toContain("generatedWorldCanvasModule ??=");
		expect(main).toContain('normalizedPath === "/world"');
		expect(main).toContain('genesisRoute === "entry"');
		expect(main).toContain('import("./generated-world-client")');
		expect(main).toContain('import("./generated-world-canvas")');
		expect(main).toContain('className="v1-genesis-loading"');
		expect(app).toContain("void loadGeneratedWorldCanvasModule()");
		expect(vite).toContain("webglOnlyPlayCanvasReact()");
		expect(vite).toContain("WebglGraphicsDevice");
		expect(vite).not.toContain("WebgpuGraphicsDevice");
		expect(canvas).toContain(
			'data-environment-context="presentation-only-ground-apron"',
		);
		expect(canvas).toContain("GENERATED_FOLK_SOURCE_HEIGHT_UNITS * 1_000");
		expect(styles).toMatch(
			/\.v1-world-canvas-frame\s*\{[^}]*height:\s*55svh/su,
		);
		expect(styles).toContain(".v1-world-tools .generated-camera-status");
	});
});
