import { expect, type Locator, type Page, test } from "@playwright/test";

type GeneratedPickTarget = Readonly<{
	readonly id: string;
	readonly x: number;
	readonly y: number;
}>;

async function readAttributes(
	locator: Locator,
	names: readonly string[],
): Promise<Readonly<Record<string, string | null>>> {
	return locator.evaluate(
		(element, requestedNames) =>
			Object.fromEntries(
				requestedNames.map((name) => [name, element.getAttribute(name)]),
			),
		[...names],
	);
}

async function isolateLocalWorld(page: Page): Promise<string[]> {
	const externalRequests: string[] = [];
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.hostname === "127.0.0.1") await route.continue();
		else {
			externalRequests.push(route.request().url());
			await route.abort("blockedbyclient");
		}
	});
	return externalRequests;
}

async function resetGeneratedCheckpoint(page: Page): Promise<void> {
	await page.goto("/outside-canon");
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const request = indexedDB.deleteDatabase("eonfolk-generated-authority");
				request.addEventListener("success", () => resolve(), { once: true });
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
			}),
	);
}

async function inspectGeneratedCheckpoint(page: Page) {
	return page.evaluate(
		() =>
			new Promise<{
				readonly eventCount: number;
				readonly operationCount: number;
				readonly receiptCount: number;
				readonly snapshotCount: number;
				readonly headHash: string;
			}>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority", 1);
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
				request.addEventListener(
					"success",
					() => {
						const database = request.result;
						const transaction = database.transaction(
							[
								"authorityStreams",
								"authorityOperations",
								"authorityEvents",
								"authorityReceipts",
								"authoritySnapshots",
							],
							"readonly",
						);
						const requests = {
							streams: transaction.objectStore("authorityStreams").getAll(),
							operations: transaction
								.objectStore("authorityOperations")
								.count(),
							events: transaction.objectStore("authorityEvents").count(),
							receipts: transaction.objectStore("authorityReceipts").count(),
							snapshots: transaction.objectStore("authoritySnapshots").count(),
						};
						transaction.addEventListener(
							"complete",
							() => {
								const stream = requests.streams.result[0] as {
									head: { headHash: string };
								};
								resolve({
									eventCount: requests.events.result,
									operationCount: requests.operations.result,
									receiptCount: requests.receipts.result,
									snapshotCount: requests.snapshots.result,
									headHash: stream.head.headHash,
								});
								database.close();
							},
							{ once: true },
						);
					},
					{ once: true },
				);
			}),
	);
}

async function stableGeneratedPickTargets(
	page: Page,
	canvas: Locator,
): Promise<readonly GeneratedPickTarget[]> {
	let prior: readonly GeneratedPickTarget[] | null = null;
	for (let attempt = 0; attempt < 50; attempt += 1) {
		const encoded = await canvas.getAttribute("data-citizen-pick-targets");
		const current = JSON.parse(
			encoded ?? "[]",
		) as readonly GeneratedPickTarget[];
		if (
			prior !== null &&
			current.length > 0 &&
			current.length === prior.length &&
			current.every((target, index) => {
				const before = prior?.[index];
				return (
					before?.id === target.id &&
					Math.hypot(before.x - target.x, before.y - target.y) < 0.5
				);
			})
		) {
			const bounds = await canvas.boundingBox();
			if (bounds === null) throw new Error("generated canvas has no bounds");
			const exposed = await page.evaluate(
				({ left, top, targets }) => {
					const host = document.querySelector(
						'[data-testid="generated-world-canvas"]',
					);
					if (host === null) return [];
					return targets.filter((target) => {
						const hit = document.elementFromPoint(
							left + target.x,
							top + target.y,
						);
						return hit !== null && host.contains(hit);
					});
				},
				{ left: bounds.x, top: bounds.y, targets: current },
			);
			if (exposed.length > 0) return exposed;
		}
		prior = current;
		await page.waitForTimeout(100);
	}
	throw new Error("generated citizen pick targets did not become stable");
}

async function selectCanonicalResidentFromCanvas(
	page: Page,
	canvas: Locator,
): Promise<string> {
	for (let round = 0; round < 4; round += 1) {
		const targets = await stableGeneratedPickTargets(page, canvas);
		for (const target of targets) {
			await canvas.click({ position: { x: target.x, y: target.y } });
			await page.waitForTimeout(100);
			const selected = await canvas.getAttribute("data-last-world-pick");
			if (selected === `citizen:${target.id}`) return target.id;
			if (
				selected?.startsWith("citizen:") === true &&
				targets.some(({ id }) => selected === `citizen:${id}`)
			)
				return selected.slice("citizen:".length);
		}
	}
	throw new Error("no exposed canonical citizen accepted a canvas pick");
}

test("generated civilization is the identity-bound canonical /world @generated-world @generated-target", async ({
	page,
}) => {
	test.setTimeout(90_000);
	const externalRequests = await isolateLocalWorld(page);
	const generatedAssetRequests: string[] = [];
	page.on("request", (request) => {
		const path = new URL(request.url()).pathname;
		if (path.startsWith("/assets/generated/"))
			generatedAssetRequests.push(path);
	});
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/");
	await expect(page).toHaveTitle("EONFOLK — A civilization has begun");
	await expect(
		page.getByRole("heading", { name: "A civilization has already begun." }),
	).toBeVisible();
	await expect(page.locator("main.v1-genesis-entry")).toHaveAttribute(
		"data-world-id",
		"eonfolk-genesis-world-v1",
	);
	await expect(page.getByText("Identity hash")).toHaveCount(0);

	await page.getByRole("link", { name: "Enter the living world" }).click();
	await expect(page).toHaveURL(/\/world$/u);
	await expect(page).toHaveTitle("EONFOLK — Canonical generated world");
	await expect(
		page.getByRole("heading", { name: "Dawnmere", level: 1 }),
	).toBeVisible();
	const world = page.locator("main.v1-world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	const worldTruth = await readAttributes(world, [
		"data-world-id",
		"data-state-hash",
		"data-projection-status",
		"data-persistence",
		"data-persistence-restored",
		"data-catch-up-receipts",
		"data-asset-integrity",
		"data-previous-state-hash",
	]);
	expect(worldTruth).toMatchObject({
		"data-world-id": "eonfolk-genesis-world-v1",
		"data-projection-status": "available",
		"data-persistence": "indexeddb",
		"data-persistence-restored": "true",
		"data-catch-up-receipts": "5",
		"data-asset-integrity": "verified",
	});
	expect(worldTruth["data-state-hash"]).toMatch(/^[0-9a-f]{64}$/u);
	expect(worldTruth["data-previous-state-hash"]).toMatch(/^[0-9a-f]{64}$/u);
	const canvasTruth = await readAttributes(canvas, [
		"data-engine",
		"data-actor-count",
		"data-embodiment-schema",
		"data-canonical-action-ids",
		"data-route-segment-count",
		"data-actor-route-states",
		"data-actor-positions",
		"data-rendered-actor-positions",
		"data-actor-diagnostics",
		"data-interaction-count",
		"data-teleport-count",
		"data-contradiction-count",
		"data-citizen-height-mm",
		"data-door-height-mm",
		"data-road-width-mm",
		"data-semantic-scale",
		"data-fidelity-class",
		"data-navigation-mode",
		"data-moving-actor-count",
	]);
	expect(canvasTruth).toMatchObject({
		"data-engine": "playcanvas",
		"data-actor-count": "7",
		"data-interaction-count": "1",
		"data-teleport-count": "0",
		"data-contradiction-count": "0",
		"data-citizen-height-mm": "1750",
		"data-door-height-mm": "2050",
		"data-road-width-mm": "1800",
		"data-navigation-mode": "smooth",
	});
	expect(canvasTruth["data-embodiment-schema"]).toMatch(/v1$/u);
	expect(canvasTruth["data-canonical-action-ids"]).toMatch(/.+/u);
	expect(canvasTruth["data-route-segment-count"]).toMatch(/^[1-9]\d*$/u);
	expect(canvasTruth["data-actor-route-states"]).toMatch(/.+/u);
	expect(canvasTruth["data-actor-positions"]).toMatch(/.+/u);
	expect(canvasTruth["data-rendered-actor-positions"]).toMatch(/.+/u);
	expect(canvasTruth["data-actor-diagnostics"]).toMatch(/.+/u);
	expect(canvasTruth["data-semantic-scale"]).toMatch(
		/^(?:region|town|citizen)$/u,
	);
	expect(canvasTruth["data-fidelity-class"]).toMatch(/^LOD[0-3]$/u);
	const sceneTruth = page.getByTestId("generated-scene-truth");
	await expect(sceneTruth).toBeVisible();
	await expect(sceneTruth).toHaveAttribute(
		"data-interaction-kind",
		"conversation",
	);
	await expect(sceneTruth).toHaveAttribute(
		"data-interaction-status",
		"in-progress",
	);
	await expect(sceneTruth).toHaveAttribute(
		"data-participant-ids",
		"citizen-07,citizen-08",
	);
	await expect(sceneTruth.getByText("Bram Moss + Edda Fen")).toBeVisible();
	await expect(
		sceneTruth
			.getByRole("list", { name: "Other visible work in the scene" })
			.getByRole("listitem"),
	).toHaveCount(4);
	const routeStates = canvasTruth["data-actor-route-states"]
		?.split(",")
		.filter(Boolean);
	const movingActorCount = Number(canvasTruth["data-moving-actor-count"]);
	expect(
		routeStates?.filter((state) => state.includes(":travelling:")).length,
	).toBe(movingActorCount);
	expect(generatedAssetRequests.sort()).toEqual([
		"/assets/generated/ASSET_MANIFEST.json",
		"/assets/generated/eonfolk-folk-proxy.gltf",
	]);

	const stateHashBeforeNavigation = worldTruth["data-state-hash"];
	const canvasBounds = await canvas.boundingBox();
	if (canvasBounds === null) throw new Error("generated canvas has no bounds");
	const distanceBeforeWheel = Number(
		await page
			.getByTestId("generated-camera-status")
			.getAttribute("data-camera-distance-mm"),
	);
	await page.mouse.move(
		canvasBounds.x + canvasBounds.width * 0.45,
		canvasBounds.y + canvasBounds.height * 0.45,
	);
	await page.mouse.wheel(0, -120);
	await expect
		.poll(() =>
			page
				.getByTestId("generated-camera-status")
				.getAttribute("data-camera-distance-mm")
				.then(Number),
		)
		.toBeLessThan(distanceBeforeWheel);
	const targetBeforePan = await canvas.getAttribute("data-camera-target-mm");
	await page.mouse.move(
		canvasBounds.x + canvasBounds.width * 0.42,
		canvasBounds.y + canvasBounds.height * 0.42,
	);
	await page.mouse.down();
	await page.mouse.move(
		canvasBounds.x + canvasBounds.width * 0.34,
		canvasBounds.y + canvasBounds.height * 0.48,
		{ steps: 4 },
	);
	await page.mouse.up();
	await expect
		.poll(() => canvas.getAttribute("data-camera-target-mm"))
		.not.toBe(targetBeforePan);
	await page
		.getByRole("navigation", { name: "Settlements" })
		.getByRole("button", { name: "Dawnmere 7 residents" })
		.click();
	await expect(world).toHaveAttribute(
		"data-state-hash",
		stateHashBeforeNavigation ?? "",
	);

	const pickedCitizenId = await selectCanonicalResidentFromCanvas(page, canvas);
	await expect(canvas).toHaveAttribute(
		"data-last-world-pick",
		`citizen:${pickedCitizenId}`,
	);
	await expect(canvas).toHaveAttribute("data-focus-kind", "citizen");
	await expect(canvas).toHaveAttribute("data-semantic-scale", "citizen");
	await page.getByRole("button", { name: "Back to settlement" }).click();

	const worldTools = page.locator("details.v1-world-tools");
	if (!(await worldTools.evaluate((details) => details.open)))
		await worldTools.locator("summary").click();
	await expect(worldTools).toHaveAttribute("open", "");
	await worldTools.getByRole("button", { name: "Pause motion" }).click();
	const stateHashBeforePose = await world.getAttribute("data-state-hash");
	const tickBefore = Number(
		await canvas.getAttribute("data-presentation-tick"),
	);
	const positionsBeforePose = await canvas.getAttribute("data-actor-positions");
	await worldTools.getByRole("button", { name: "Step one pose" }).click();
	await expect(canvas).toHaveAttribute(
		"data-presentation-tick",
		String(tickBefore + 1),
	);
	await expect(world).toHaveAttribute(
		"data-state-hash",
		stateHashBeforePose ?? "",
	);
	await expect(canvas).toHaveAttribute(
		"data-actor-positions",
		positionsBeforePose ?? "",
	);
	const firstResident = worldTools
		.getByRole("group", { name: "Canonical residents" })
		.getByRole("button")
		.first();
	await firstResident.click();
	await expect(firstResident).toHaveAttribute("aria-pressed", "true");
	await expect(canvas).toHaveAttribute("data-focus-kind", "citizen");
	await worldTools.getByRole("button", { name: "Follow citizen" }).click();
	await expect(canvas).toHaveAttribute("data-following", "true");

	await page.getByRole("button", { name: "Settlements", exact: true }).click();
	await expect(page.getByTestId("generated-world-overview")).toBeVisible();
	await page
		.getByRole("navigation", { name: "Settlements" })
		.getByRole("button", { name: "Second Founding 1 resident" })
		.click();
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-actor-count",
		"1",
	);
	await expect(page.locator("ul.v1-presence-roster button")).toHaveCount(1);
	await expect(page.getByText("Authority", { exact: true })).toHaveCount(0);
	const firstCheckpoint = await inspectGeneratedCheckpoint(page);
	expect(firstCheckpoint).toMatchObject({
		eventCount: 5,
		operationCount: 6,
		receiptCount: 5,
		snapshotCount: 2,
	});
	await page.reload();
	await expect(page.locator("main.v1-world")).toHaveAttribute(
		"data-persistence-restored",
		"true",
	);
	expect((await inspectGeneratedCheckpoint(page)).headHash).toBe(
		firstCheckpoint.headHash,
	);
	expect(externalRequests).toEqual([]);
});

test("settlement overview and semantic people remain keyboard-operable @generated-world", async ({
	page,
}) => {
	await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/world");
	await page.getByRole("button", { name: "Settlements" }).click();
	await expect(page.getByTestId("generated-world-overview")).toBeVisible();
	await expect(page.locator(".generated-settlement-cards article")).toHaveCount(
		2,
	);
	await expect(page.getByText("ORIGIN SETTLEMENT")).toBeVisible();
	await expect(page.getByText("FOUNDED SETTLEMENT")).toBeVisible();

	const dawnmere = page.getByRole("button", { name: "Open Dawnmere" });
	await dawnmere.focus();
	await dawnmere.press("Enter");
	await page.getByRole("button", { name: "World in words" }).click();
	const semantic = page.getByTestId("generated-semantic-world");
	await expect(semantic).toBeVisible();
	await expect(
		semantic
			.getByRole("group", { name: "Canonical residents" })
			.getByRole("button"),
	).toHaveCount(7);
	const citizen = semantic
		.getByRole("group", { name: "Canonical residents" })
		.getByRole("button")
		.first();
	await citizen.focus();
	await citizen.press("Enter");
	await expect(citizen).toHaveAttribute("aria-pressed", "true");
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth + 1,
			),
		)
		.toBe(true);
});

for (const viewport of [
	{ width: 1728, height: 1117 },
	{ width: 1366, height: 768 },
	{ width: 390, height: 844 },
]) {
	test(`generated embodiment remains truthful and operable at ${viewport.width}x${viewport.height} @generated-world`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const externalRequests = await isolateLocalWorld(page);
		await page.setViewportSize(viewport);
		await page.goto("/world");
		const world = page.locator("main.v1-world");
		await expect(world).toHaveAttribute("data-asset-integrity", "verified");
		await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
			"data-ready",
			"true",
			{ timeout: 20_000 },
		);
		await page.getByRole("button", { name: "Reduce motion" }).click();
		await expect(world).toHaveAttribute("data-presentation-playing", "false");
		await page.getByRole("button", { name: "World in words" }).click();
		await expect(page.getByTestId("generated-semantic-world")).toBeVisible();
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth + 1,
				),
			)
			.toBe(true);
		expect(externalRequests).toEqual([]);
	});
}
