import {
	expect,
	type Locator,
	type Page,
	test,
} from "./support/eonfolk-fixture";

const linuxSemanticCi = process.env.EONFOLK_ALLOW_LINUX_CI === "1";
const sponsorTransitionTimeout = linuxSemanticCi ? 120_000 : 30_000;

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
					"eonfolk-generated-authority-v7",
				);
				request.addEventListener("success", () => resolve(), { once: true });
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
			}),
	);
}

async function openCanonicalWorld(page: Page) {
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-persistence", "indexeddb", {
		timeout: 30_000,
	});
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	return world;
}

async function tabTo(page: Page, locator: Locator): Promise<void> {
	for (let step = 0; step < 120; step += 1) {
		if (await locator.evaluate((element) => element === document.activeElement))
			return;
		await page.keyboard.press("Tab");
	}
	throw new Error("keyboard focus did not reach the requested control");
}

async function pressByKeyboard(page: Page, locator: Locator): Promise<void> {
	await tabTo(page, locator);
	await expect(locator).toBeFocused();
	await page.keyboard.press("Enter");
}

async function expectTouchFloor(locator: Locator): Promise<void> {
	const box = await locator.boundingBox();
	expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
	expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
}

test("the canonical semantic sponsor journey is keyboard-only through Chronicle-to-world focus @generated-world", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 420_000 : 240_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await resetGeneratedCheckpoint(page);
	const world = await openCanonicalWorld(page);
	const initialHash = await world.getAttribute("data-state-hash");

	const words = page.getByRole("button", { name: "World in words" });
	await expectTouchFloor(words);
	await pressByKeyboard(page, words);
	await expect(words).toHaveAttribute("aria-pressed", "true");
	const residents = page
		.getByTestId("generated-semantic-world")
		.getByRole("group", { name: "Canonical residents" });
	const mara = residents.locator('button[data-citizen-id="citizen-01"]');
	await expectTouchFloor(mara);
	await pressByKeyboard(page, mara);
	await expect(mara).toHaveAttribute("aria-pressed", "true");

	const sponsor = page.getByRole("button", { name: "Sponsor this person" });
	await expectTouchFloor(sponsor);
	await pressByKeyboard(page, sponsor);
	const consider = page.getByRole("button", {
		name: "Consider an intervention",
	});
	await expect(consider).toBeEnabled({ timeout: sponsorTransitionTimeout });
	await expectTouchFloor(consider);
	await pressByKeyboard(page, consider);
	const abstain = page.getByRole("button", {
		name: "Abstain — close this boundary without counsel",
	});
	await expectTouchFloor(abstain);
	await pressByKeyboard(page, abstain);
	await expect(
		page.getByText(/first boundary is durably closed/iu),
	).toBeVisible({ timeout: sponsorTransitionTimeout });

	const leave = page.getByRole("button", {
		name: "Leave Dawnmere at this checkpoint",
	});
	await expectTouchFloor(leave);
	await pressByKeyboard(page, leave);
	const returnButton = page.getByRole("button", {
		name: "Return to Dawnmere",
	});
	await expectTouchFloor(returnButton);
	await pressByKeyboard(page, returnButton);
	const advance = page.getByRole("button", {
		name: "Continue to Mara's independent outcome",
	});
	await expect(advance).toBeEnabled({ timeout: sponsorTransitionTimeout });
	await expectTouchFloor(advance);
	await pressByKeyboard(page, advance);
	await expect(
		page.getByRole("heading", { name: "What happened" }),
	).toBeVisible({
		timeout: sponsorTransitionTimeout,
	});
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("independently continued the active Standing Plan");
	await expect(
		page.getByRole("list", { name: "Chronicle beats" }),
	).toContainText("not recorded as its cause");

	const evidence = page
		.getByRole("region", { name: "Shareable factual replay" })
		.getByText("Exact event evidence");
	await pressByKeyboard(page, evidence);
	const eventLink = page
		.getByRole("region", { name: "Shareable factual replay" })
		.getByRole("link", { name: "Open event in world" })
		.first();
	const eventLinkBox = await eventLink.boundingBox();
	const resolvedHash = await world.getAttribute("data-state-hash");
	expect(resolvedHash).not.toBe(initialHash);
	await pressByKeyboard(page, eventLink);
	await expect(page).toHaveURL(/focus-kind=event/u);
	await expect(world).toHaveAttribute("data-state-hash", resolvedHash ?? "");
	await expect(
		page.getByRole("region", { name: "Chronicle event focus" }),
	).toContainText("Mara Vale");
	expect(eventLinkBox?.height ?? 0).toBeGreaterThanOrEqual(44);
	expect(eventLinkBox?.width ?? 0).toBeGreaterThanOrEqual(44);
	expect(externalRequests).toEqual([]);
});

test("manual reduced motion persists and critical mobile controls meet the 44px floor @generated-world", async ({
	page,
}) => {
	await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await resetGeneratedCheckpoint(page);
	await openCanonicalWorld(page);
	const toggle = page.getByRole("button", { name: "Reduce motion" });
	await expectTouchFloor(toggle);
	await toggle.click();
	await expect(page.locator("main.v1-world")).toHaveClass(/v1-reduced-motion/u);
	await expect(page.locator("main.v1-world")).toHaveAttribute(
		"data-presentation-playing",
		"false",
	);
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await expect(
		page.getByRole("button", { name: "Motion reduced" }),
	).toBeVisible();
	await expect(page.locator("main.v1-world")).toHaveClass(/v1-reduced-motion/u);
});

test("forced colors and a 200 percent zoom equivalent retain visible focus and reflow @generated-world", async ({
	page,
	context,
}) => {
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
	await openCanonicalWorld(page);
	const words = page.getByRole("button", { name: "World in words" });
	await tabTo(page, words);
	await expect(words).toBeFocused();
	expect(
		await words.evaluate((element) => getComputedStyle(element).outlineStyle),
	).not.toBe("none");
	await page.keyboard.press("Enter");
	await expect(page.getByTestId("generated-semantic-world")).toBeVisible();

	const cdp = await context.newCDPSession(page);
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 195,
		height: 422,
		deviceScaleFactor: 2,
		mobile: false,
	});
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth + 1,
			),
		)
		.toBe(true);
	await expect(
		page.getByRole("button", { name: "World in words" }),
	).toBeVisible();
	expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
	expect(externalRequests).toEqual([]);
});

test("mobile arrival is world-dominant with an opening action in the first viewport @generated-world", async ({
	page,
}) => {
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await openCanonicalWorld(page);
	const geometry = await page.evaluate(() => {
		const stage = document
			.querySelector(".v1-world-canvas-frame")
			?.getBoundingClientRect();
		const action = [...document.querySelectorAll("button")]
			.find((button) => button.textContent?.trim() === "World in words")
			?.getBoundingClientRect();
		return {
			stageHeight: stage?.height ?? 0,
			actionTop: action?.top ?? Number.POSITIVE_INFINITY,
			actionBottom: action?.bottom ?? Number.POSITIVE_INFINITY,
			viewportHeight: window.innerHeight,
			clientWidth: document.documentElement.clientWidth,
			scrollWidth: document.documentElement.scrollWidth,
		};
	});
	expect(geometry.stageHeight / geometry.viewportHeight).toBeGreaterThanOrEqual(
		0.5,
	);
	expect(geometry.actionTop).toBeGreaterThanOrEqual(0);
	expect(geometry.actionBottom).toBeLessThanOrEqual(geometry.viewportHeight);
	expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
	expect(externalRequests).toEqual([]);
});

test("the current world sustains a truthful watched eleven-second lifecycle @generated-world", async ({
	page,
}) => {
	test.setTimeout(45_000);
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 1366, height: 768 });
	const world = await openCanonicalWorld(page);
	const canvas = page.getByTestId("generated-world-canvas");
	const initialHash = await world.getAttribute("data-state-hash");
	const initialTick = Number(
		await canvas.getAttribute("data-presentation-tick"),
	);
	const renderedPositions = new Set<string>();
	const animationClasses = new Set<string>();
	let maximumInteractions = 0;
	for (let sample = 0; sample < 44; sample += 1) {
		const state = await canvas.evaluate((element) => ({
			animations: element.dataset.animationClasses ?? "",
			interactions: Number(element.dataset.interactionCount),
			rendered: element.dataset.renderedActorPositions ?? "",
		}));
		renderedPositions.add(state.rendered);
		for (const animation of state.animations.split(","))
			if (animation !== "") animationClasses.add(animation);
		maximumInteractions = Math.max(maximumInteractions, state.interactions);
		await page.waitForTimeout(250);
	}
	const finalTick = Number(await canvas.getAttribute("data-presentation-tick"));
	expect(finalTick).toBeGreaterThan(initialTick);
	expect(renderedPositions.size).toBeGreaterThanOrEqual(3);
	expect(animationClasses.size).toBeGreaterThanOrEqual(3);
	expect(maximumInteractions).toBeGreaterThanOrEqual(1);
	await expect(canvas).toHaveAttribute("data-teleport-count", "0");
	await expect(canvas).toHaveAttribute("data-contradiction-count", "0");
	await expect(world).toHaveAttribute("data-state-hash", initialHash ?? "");
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await expect(world).toHaveAttribute("data-state-hash", initialHash ?? "");
	expect(externalRequests).toEqual([]);
});

test("no world facts render while the authoritative worker response is delayed @generated-world", async ({
	page,
}) => {
	const externalRequests = await isolateLocalWorld(page);
	await page.route(
		/\/assets\/generated-world-runtime\.worker-[^/]+\.js$/u,
		async (route) => {
			const response = await route.fetch();
			const body = await response.text();
			await route.fulfill({
				response,
				body: `const __eonfolkPostMessage = self.postMessage.bind(self); self.postMessage = (...args) => setTimeout(() => __eonfolkPostMessage(...args), 1800);\n${body}`,
			});
		},
	);
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	await expect(
		page.getByRole("heading", {
			name: "Advancing one world through its first year.",
		}),
	).toBeVisible();
	await page.waitForTimeout(1_200);
	await expect(page.locator("main.v1-world")).toHaveCount(0);
	await expect(page.locator("body")).not.toContainText("Mara Vale");
	await expect(page.locator("body")).not.toContainText("Sponsor this person");
	await expect(page.locator("body")).not.toContainText("Review Chronicle");
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	expect(externalRequests).toEqual([]);
});
