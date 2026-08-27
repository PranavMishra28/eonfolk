import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import {
	generatedCameraFidelity,
	INITIAL_GENERATED_NAVIGATION,
	reduceGeneratedNavigation,
} from "../../../apps/web/src/generated-presentation/navigation.js";

const source = (path: string) =>
	readFile(new URL(`../../../apps/web/src/${path}`, import.meta.url), "utf8");

describe("world-as-product presentation", () => {
	it("makes region, town, and citizen scale materially different", () => {
		expect(generatedCameraFidelity(140_000).semanticScale).toBe("region");
		expect(generatedCameraFidelity(48_000).semanticScale).toBe("town");
		expect(generatedCameraFidelity(16_000).semanticScale).toBe("citizen");

		const citizen = reduceGeneratedNavigation(INITIAL_GENERATED_NAVIGATION, {
			type: "select-citizen",
			citizenId: "citizen-01",
		});
		expect(citizen.distanceMm).toBe(9_000);
		expect(generatedCameraFidelity(citizen.distanceMm).semanticScale).toBe(
			"citizen",
		);
		const following = reduceGeneratedNavigation(citizen, {
			type: "toggle-follow",
		});
		expect(following.distanceMm).toBe(18_000);
		expect(
			reduceGeneratedNavigation(following, { type: "toggle-follow" })
				.distanceMm,
		).toBe(9_000);
		expect(
			reduceGeneratedNavigation(
				{ ...INITIAL_GENERATED_NAVIGATION, distanceMm: 140_000 },
				{ type: "overview" },
			).distanceMm,
		).toBe(38_000);
	});

	it("keeps human and building dimensions on the authoritative metric scale", async () => {
		const canvas = await source("generated-world-canvas.tsx");
		expect(canvas).toContain("GENERATED_FOLK_SOURCE_HEIGHT_UNITS * 1_000");
		expect(canvas).toContain("scale.citizen.heightMm");
		expect(canvas).toContain("scale.door.heightMm / 1_000");
		expect(canvas).toContain("scale.road.footpathWidthMm / 1_000");
		expect(canvas).toContain("VernacularBuilding");
		expect(canvas).toContain("scale.mill.widthMm");
		const actorScale = canvas.match(/const actorScale\s*=\s*([^;]+);/u)?.[1];
		expect(actorScale).toBeDefined();
		expect(actorScale).toContain("scale.citizen.heightMm");
		expect(actorScale).not.toContain("fidelity");
		for (const kind of [
			"resource",
			"production",
			"storage",
			"civic",
			"residential",
		])
			expect(canvas).toContain(`kind === "${kind}"`);
		expect(canvas).not.toContain("GeneratedProjectProxy");
	});

	it("labels cosmetic life while grounding consequential activity in projections", async () => {
		const [canvas, people] = await Promise.all([
			source("generated-world-canvas.tsx"),
			source("components/generated/GeneratedFolkProxy.tsx"),
		]);
		expect(canvas).toContain(
			'data-environment-authority="cosmetic-never-reality"',
		);
		expect(canvas).toContain("projection.scene.edges");
		expect(canvas).toContain("projection.local.buildings.map");
		expect(canvas).toContain("projection.spatial.interactions.map");
		expect(canvas).toContain("renderedActorPoint(projection, actor)");
		expect(people).toContain("function PhysicalAction");
		expect(people).not.toContain("ActivityBeacon");
		expect(people).not.toContain("SocialGesture");
	});

	it("keeps the world dominant and offers mobile visual degradation", async () => {
		const styles = await source("styles.css");
		expect(styles).toMatch(
			/\.v1-context-panel\s*\{[^}]*width:\s*min\(20rem, 24vw\)/su,
		);
		expect(styles).toContain("overflow-wrap: anywhere");
		expect(styles).toContain(':not([data-focus-kind="overview"])');
		expect(styles).toMatch(
			/@media \(max-width: 720px\)[\s\S]*?\.v1-world-canvas-frame\s*\{[^}]*height:\s*58svh/su,
		);
		expect(styles).toContain("touch-action: none");
	});
});
