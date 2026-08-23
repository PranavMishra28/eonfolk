import { expect, type Locator, type Page, test } from "@playwright/test";

type GeneratedPickTarget = Readonly<{
	readonly id: string;
	readonly x: number;
	readonly y: number;
}>;

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
				const request = indexedDB.deleteDatabase(
					"eonfolk-generated-authority-v3",
				);
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
				readonly stateHash: string;
				readonly simulationTime: number;
			}>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v3", 1);
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
									head: {
										headHash: string;
										stateHash: string;
										simulationTime: number;
									};
								};
								resolve({
									eventCount: requests.events.result,
									operationCount: requests.operations.result,
									receiptCount: requests.receipts.result,
									snapshotCount: requests.snapshots.result,
									headHash: stream.head.headHash,
									stateHash: stream.head.stateHash,
									simulationTime: stream.head.simulationTime,
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
			const exposed: GeneratedPickTarget[] = [];
			for (const target of current) {
				const receivesPointer = await page.evaluate(
					({ absoluteX, absoluteY }) => {
						const host = document.querySelector(
							'[data-testid="generated-world-canvas"]',
						);
						const hit = document.elementFromPoint(absoluteX, absoluteY);
						return host !== null && hit !== null && host.contains(hit);
					},
					{
						absoluteX: bounds.x + target.x,
						absoluteY: bounds.y + target.y,
					},
				);
				if (receivesPointer) exposed.push(target);
			}
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

async function selectSponsorCandidate(page: Page): Promise<string> {
	const residents = page.locator("ul.v1-presence-roster button");
	for (let index = 0; index < (await residents.count()); index += 1) {
		const resident = residents.nth(index);
		await resident.click();
		const sponsor = page.getByRole("button", { name: "Sponsor this person" });
		if (await sponsor.isEnabled()) {
			const citizenId = await resident.getAttribute("data-citizen-id");
			if (citizenId === null) throw new Error("sponsor candidate lacks an id");
			return citizenId;
		}
	}
	throw new Error("no counsel-capable sponsor candidate is visible");
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
	await expect(world).toHaveAttribute(
		"data-world-id",
		"eonfolk-genesis-world-v1",
	);
	await expect(world).toHaveAttribute("data-state-hash", /^[0-9a-f]{64}$/u);
	await expect(world).toHaveAttribute("data-projection-status", "available");
	await expect(world).toHaveAttribute("data-persistence", "indexeddb");
	await expect(world).toHaveAttribute("data-persistence-restored", "true");
	await expect(world).toHaveAttribute("data-catch-up-receipts", "5");
	await expect(world).toHaveAttribute("data-asset-integrity", "verified");
	await expect(world).toHaveAttribute(
		"data-previous-state-hash",
		/^[0-9a-f]{64}$/u,
	);
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-engine", "playcanvas");
	await expect(canvas).toHaveAttribute("data-actor-count", "7");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	await expect(canvas).toHaveAttribute("data-embodiment-schema", /v1$/u);
	await expect(canvas).toHaveAttribute("data-canonical-action-ids", /.+/u);
	await expect(canvas).toHaveAttribute(
		"data-route-segment-count",
		/^[1-9]\d*$/u,
	);
	await expect(canvas).toHaveAttribute("data-actor-route-states", /.+/u);
	await expect(canvas).toHaveAttribute("data-actor-positions", /.+/u);
	await expect(canvas).toHaveAttribute("data-rendered-actor-positions", /.+/u);
	await expect(canvas).toHaveAttribute("data-actor-diagnostics", /.+/u);
	await expect(canvas).toHaveAttribute("data-interaction-count", /^\d+$/u);
	await expect(canvas).toHaveAttribute("data-teleport-count", "0");
	await expect(canvas).toHaveAttribute("data-contradiction-count", "0");
	await expect(canvas).toHaveAttribute("data-citizen-height-mm", "1750");
	await expect(canvas).toHaveAttribute("data-door-height-mm", "2050");
	await expect(canvas).toHaveAttribute("data-road-width-mm", "1800");
	await expect(canvas).toHaveAttribute(
		"data-semantic-scale",
		/^(?:region|town|citizen)$/u,
	);
	await expect(canvas).toHaveAttribute("data-fidelity-class", /^LOD[0-3]$/u);
	await expect(canvas).toHaveAttribute("data-navigation-mode", "smooth");
	const routeStates = (await canvas.getAttribute("data-actor-route-states"))
		?.split(",")
		.filter(Boolean);
	const movingActorCount = Number(
		await canvas.getAttribute("data-moving-actor-count"),
	);
	expect(
		routeStates?.filter((state) => state.includes(":travelling:")).length,
	).toBe(movingActorCount);
	expect(generatedAssetRequests.sort()).toEqual([
		"/assets/generated/ASSET_MANIFEST.json",
		"/assets/generated/eonfolk-folk-proxy.gltf",
	]);

	const stateHashBeforeNavigation = await world.getAttribute("data-state-hash");
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
	const worldTools = page.locator("details.v1-world-tools");
	await worldTools.locator("summary").click();
	await worldTools.getByRole("button", { name: "Settlement overview" }).click();
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

	await page.getByRole("button", { name: "Pause motion" }).click();
	const stateHashBeforePose = await world.getAttribute("data-state-hash");
	const tickBefore = Number(
		await canvas.getAttribute("data-presentation-tick"),
	);
	const positionsBeforePose = await canvas.getAttribute("data-actor-positions");
	await page.getByRole("button", { name: "Step one pose" }).click();
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
	const firstResident = page
		.getByRole("group", { name: "Canonical residents" })
		.getByRole("button")
		.first();
	await firstResident.click();
	await expect(firstResident).toHaveAttribute("aria-pressed", "true");
	await expect(canvas).toHaveAttribute("data-focus-kind", "citizen");
	await page.getByRole("button", { name: "Follow citizen" }).click();
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

test("entry fails closed when canonical IndexedDB cannot open @generated-world", async ({
	page,
}) => {
	await isolateLocalWorld(page);
	await page.goto("/outside-canon");
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				const request = indexedDB.open("eonfolk-generated-authority-v3", 2);
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
				request.addEventListener(
					"success",
					() => {
						request.result.close();
						resolve();
					},
					{ once: true },
				);
			}),
	);
	await page.goto("/");
	await expect(
		page.getByRole("heading", {
			name: "The canonical world could not be opened.",
		}),
	).toBeVisible({ timeout: 20_000 });
	await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
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

test("normal generated world commits sponsorship, counsel, and a factual Chronicle trace @generated-world @generated-target", async ({
	page,
}) => {
	test.setTimeout(240_000);
	const externalRequests = await isolateLocalWorld(page);
	const browserErrors: string[] = [];
	page.on("pageerror", (error) => browserErrors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") browserErrors.push(message.text());
	});
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetGeneratedCheckpoint(page);
	await page.goto("/world");
	const canvas = page.getByTestId("generated-world-canvas");
	const initialFailure = page.getByRole("heading", {
		name: "No incomplete world is shown as fact.",
	});
	await Promise.race([
		canvas.waitFor({ state: "attached", timeout: 20_000 }),
		initialFailure.waitFor({ state: "visible", timeout: 20_000 }),
	]);
	if (await initialFailure.isVisible()) {
		await page.getByText("Technical detail").click();
		throw new Error(
			(await page.locator("main.v1-genesis-shell code").textContent()) ??
				"generated world failed closed",
		);
	}
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	const citizenId = await selectSponsorCandidate(page);
	const sponsor = page.getByRole("button", { name: "Sponsor this person" });
	const initialHash = await page
		.locator("main.v1-world")
		.getAttribute("data-state-hash");
	await expect(sponsor).toBeVisible();
	await sponsor.click();
	await expect(
		page.getByRole("button", { name: "Consider an intervention" }),
	).toBeVisible({ timeout: 20_000 });
	await expect
		.poll(() => page.locator("main.v1-world").getAttribute("data-state-hash"), {
			timeout: 30_000,
		})
		.not.toBe(initialHash);
	await expect(page.getByRole("status")).toContainText(
		"entered a sponsorship covenant with patron:local",
	);
	await page.getByRole("button", { name: "Consider an intervention" }).click();
	await expect(
		page.getByRole("heading", { name: "Choose a consequential counsel" }),
	).toBeVisible();
	await expect(
		page.getByText("There is no account, cloud backup, or recovery copy."),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "Abstain" })).toBeVisible();
	const beforeAbstention = await inspectGeneratedCheckpoint(page);
	await page.getByRole("button", { name: "Abstain" }).click();
	await expect(page.getByRole("status")).toContainText(
		"No canonical command was issued",
	);
	const afterAbstention = await inspectGeneratedCheckpoint(page);
	expect(afterAbstention.headHash).toBe(beforeAbstention.headHash);
	expect(afterAbstention.eventCount).toBe(beforeAbstention.eventCount);
	await page.getByRole("button", { name: "Consider an intervention" }).click();
	await page
		.getByRole("button", {
			name: "Verify the evidence first — delays a conclusion",
		})
		.click();
	await expect(
		page.getByRole("button", { name: "Return at the next decision boundary" }),
	).toBeVisible({ timeout: 20_000 });
	await expect(page.getByRole("status")).toContainText(
		"received counsel to verify reserve",
	);
	await page.reload();
	const boundaryCanvas = page.getByTestId("generated-world-canvas");
	await expect(boundaryCanvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	expect(await selectSponsorCandidate(page)).toBe(citizenId);
	await page.getByRole("button", { name: "Sponsor this person" }).click();
	await expect(
		page.getByRole("button", { name: "Return at the next decision boundary" }),
	).toBeVisible({ timeout: 20_000 });
	await page
		.getByRole("button", { name: "Return at the next decision boundary" })
		.click();
	await expect(
		page.getByRole("button", { name: "Counsel recorded" }),
	).toBeVisible({ timeout: 60_000 });
	await expect(page.getByRole("status")).toContainText(
		"the counsel and chose to",
	);
	await expect(page.getByRole("status")).toContainText(
		"replaced the active transport assignment",
	);
	await expect(
		page.getByRole("heading", { name: "Share this factual trace" }),
	).toBeVisible();
	await page.getByText("Inspect Chronicle evidence").click();
	await expect(
		page.locator("section[aria-label='Shareable factual replay'] code").first(),
	).toBeVisible();
	await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.getByRole("button", { name: "Copy factual trace" }).click();
	await expect(page.getByText("Factual trace copied.")).toBeVisible();
	await page
		.getByRole("button", { name: "Consider a different counsel" })
		.click();
	await page
		.getByRole("button", { name: "Confront them publicly — risks trust" })
		.click();
	await expect(
		page.getByRole("button", { name: "Return at the next decision boundary" }),
	).toBeVisible({ timeout: 20_000 });
	await expect(page.locator("pre[role='status']")).toContainText(
		"received counsel to accuse publicly",
	);
	await expect(
		page.getByRole("button", { name: "Return at the next decision boundary" }),
	).toBeEnabled({ timeout: 60_000 });
	const committed = await inspectGeneratedCheckpoint(page);
	expect(committed).toMatchObject({ eventCount: 10, receiptCount: 10 });
	expect(committed.simulationTime).toBe(366 * 86_400);
	await expect
		.poll(() => page.locator("main.v1-world").getAttribute("data-state-hash"), {
			timeout: 30_000,
		})
		.toBe(committed.stateHash);
	await page.screenshot({
		path: test.info().outputPath("normal-route-sponsor-chronicle.png"),
		fullPage: true,
	});

	await page.reload();
	const reloadedCanvas = page.getByTestId("generated-world-canvas");
	await Promise.race([
		reloadedCanvas.waitFor({ state: "attached", timeout: 20_000 }),
		page
			.getByRole("heading", {
				name: "No incomplete world is being shown as fact.",
			})
			.waitFor({ state: "visible", timeout: 20_000 }),
	]);
	const failure = page.getByRole("heading", {
		name: "No incomplete world is being shown as fact.",
	});
	if (await failure.isVisible()) {
		await page.getByText("Technical detail").click();
		throw new Error(
			(await page.locator("main.v1-genesis-shell code").textContent()) ??
				"generated world failed closed",
		);
	}
	await expect(reloadedCanvas).toHaveAttribute("data-ready", "true", {
		timeout: 20_000,
	});
	expect(
		await page.locator("main.v1-world").getAttribute("data-state-hash"),
	).toBe(committed.stateHash);
	expect(
		await page.locator("main.v1-world").getAttribute("data-simulation-time"),
	).toBe(String(366 * 86_400));
	const reloadedCitizenId = await selectSponsorCandidate(page);
	expect(reloadedCitizenId).toBe(citizenId);
	await expect(page.locator("p.v1-context-role + p")).toContainText(
		"speaking at Commons",
	);
	await page.getByRole("button", { name: "Sponsor this person" }).click();
	await expect(
		page.getByRole("button", { name: "Counsel recorded" }),
	).toBeVisible({ timeout: 20_000 });
	await expect(page.getByRole("status")).toContainText(
		"the counsel and chose to",
	);
	await expect(page.getByRole("status")).toContainText(
		"received counsel to accuse publicly",
	);
	expect(
		await page.locator("main.v1-world").getAttribute("data-state-hash"),
	).toBe(committed.stateHash);
	expect((await inspectGeneratedCheckpoint(page)).headHash).toBe(
		committed.headHash,
	);
	expect(browserErrors).toEqual([]);
	expect(externalRequests).toEqual([]);
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
