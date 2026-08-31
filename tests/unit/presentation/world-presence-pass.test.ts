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
		expect(embodiment.actors.some((actor) => actor.name === "Mara Vale")).toBe(
			true,
		);
		for (const interaction of projection.spatial.interactions) {
			expect(interaction.participantIds).toHaveLength(2);
			expect(["conversation", "exchange"]).toContain(interaction.kind);
		}
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
		const [app, main, canvas, styles, vite, entry, about] = await Promise.all([
			webSource("V1GenesisApp.tsx"),
			webSource("main.tsx"),
			webSource("generated-world-canvas.tsx"),
			webSource("styles.css"),
			readFile(
				new URL("../../../apps/web/vite.config.ts", import.meta.url),
				"utf8",
			),
			webSource("GenesisEntryApp.tsx"),
			webSource("InformationSurface.tsx"),
		]);

		expect(app).toContain("countNoun(");
		expect(app).toContain('"lives are unfolding"');
		expect(app).toContain("GeneratedSceneTruth");
		expect(app).toContain("projection.spatial.interactions[0]");
		expect(app).toContain("presentedActorCopy");
		expect(app).toContain("visualDayProgress01");
		expect(app).toContain("conversationVisuallyActive");
		expect(app).toContain("Start a fresh local town");
		expect(app).toContain("skip-link");
		expect(app).toContain("Skip to world");
		expect(app).toContain("Standing plan:");
		expect(app).toContain("Standard Brain");
		expect(app).toContain("Local model (optional)");
		expect(app).toContain('href="/about"');
		expect(app).toContain('href="/license"');
		expect(app).toContain("v1-feedback-bug");
		expect(app).toContain("Report an issue — saved only in this browser");
		expect(app).not.toContain("Feedback form — not the Chronicle");
		expect(app).toContain("Fact, belief, and what happened");
		expect(app).toContain("openChronicleRecord");
		expect(app).toContain('data-testid="chronicle-record"');
		expect(app).toContain('data-testid="settlement-switcher"');
		expect(app).not.toContain("openInspectorForChronicle");
		expect(app).not.toContain("This saved town no longer matches");
		expect(app).not.toContain("Seven lives");
		expect(app).not.toContain("Eight lives");
		expect(entry).toContain("countNoun(");
		expect(entry).not.toContain("Eight lives");
		expect(entry).not.toContain("Eight people");
		expect(app).not.toContain("progress basis points");
		expect(app).toContain("generatedWorldCanvasModule ??=");
		expect(main).toContain('normalizedPath === "/world"');
		expect(main).toContain('genesisRoute === "entry"');
		expect(main).toContain('import("./generated-world-client")');
		expect(main).toContain('import("./generated-world-canvas")');
		expect(main).toContain("eonfolk-authority-ready");
		expect(main).not.toContain("425");
		expect(main).toContain('className="v1-genesis-loading"');
		expect(app).toContain("eonfolk-authority-ready");
		expect(app).toContain("void loadGeneratedWorldCanvasModule()");
		expect(app).toContain("WorldAuthorityShell");
		expect(app).toContain('data-world-id="eonfolk-genesis-world-v1"');
		expect(app).toContain('data-authority-pending="true"');
		expect(vite).toContain("webglOnlyPlayCanvasReact()");
		expect(vite).toContain("WebglGraphicsDevice");
		expect(vite).not.toContain("WebgpuGraphicsDevice");
		expect(canvas).toContain(
			'data-environment-context="presentation-only-ground-apron"',
		);
		expect(canvas).toContain("followSubjectYRatio");
		expect(canvas).toContain("followSubjectVisible");
		expect(canvas).toContain("resolveFollowCamera");
		expect(canvas).toContain("generatedFollowViewportIsCompact");
		expect(canvas).toContain("generatedFollowFovDegrees");
		expect(canvas).toContain("followOccluderVolumes");
		expect(canvas).toContain("GhostBuildings");
		expect(canvas).toContain("presentedActorCopy");
		expect(canvas).not.toContain("INTENT_WORDS");
		expect(styles).toContain(
			'main.v1-world[data-view="embodied"] .v1-world-title',
		);
		expect(styles).toMatch(
			/@media \(max-width: 480px\)[\s\S]*?\.v1-world-canvas-frame\s*\{[^}]*height:\s*100dvh/su,
		);
		expect(styles).toContain(".v1-world-tools .generated-camera-status");
		expect(styles).toMatch(
			/\.v1-entry-hero-world\s*\{[^}]*position:\s*relative/su,
		);
		expect(styles).toContain(".v1-information .v1-primary-link");
		expect(entry).toContain("A TOWN THAT REMEMBERS YOU");
		expect(entry).not.toContain("A TOWN THAT CONTINUES WITHOUT YOU");
		expect(entry).toContain("Time in town");
		expect(entry).toContain("moves while Play is on in an open tab");
		expect(entry).toMatch(/you choose\s+whether waited days pass/u);
		expect(app).toContain("can pass if you choose");
		expect(about).toContain("Closing the tab stops");
		expect(about).toContain("pnpm world:authority");
		expect(about).toContain("still choose whether waited days pass");
		expect(entry).toContain('href="/about"');
		expect(entry).toContain('href="/license"');
		expect(main).toContain('normalizedPath === "/about"');
		expect(styles).toContain(".generated-citizen-labels button strong");
		expect(styles).toContain("white-space: nowrap");
		expect(app).toContain("Standing ties");
		expect(app).toContain("Water stores");
		expect(app).toContain("CHRONICLE_RELATION_LABEL");
	});
});
