import { expect, type Page, test } from "./support/eonfolk-fixture";
import { pressTimeControl, waitForEnabledCounsel } from "./support/world-hud";

const linuxSemanticCi = process.env.EONFOLK_ALLOW_LINUX_CI === "1";
const sponsorTransitionTimeout = linuxSemanticCi ? 120_000 : 30_000;

async function isolateLocalWorld(page: Page): Promise<void> {
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.hostname === "127.0.0.1") await route.continue();
		else await route.abort("blockedbyclient");
	});
}

async function resetGeneratedWorld(page: Page): Promise<void> {
	await page.goto("/outside-canon");
	await page.evaluate(
		() =>
			new Promise<void>((resolve, reject) => {
				window.localStorage.removeItem("eonfolk:play:last-active-wall-ms:v1");
				window.localStorage.removeItem(
					"eonfolk:play:pending-return-catch-up-v1",
				);
				const request = indexedDB.deleteDatabase(
					"eonfolk-generated-authority-v8",
				);
				request.addEventListener("success", () => resolve(), { once: true });
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
			}),
	);
}

function actorCoords(
	blob: string | null,
	citizenId: string,
): string | undefined {
	return blob
		?.split(",")
		.find((part) => part.startsWith(`${citizenId}:`))
		?.slice(citizenId.length + 1);
}

test("Play advances a day without pressing Pause first @generated-world", async ({
	page,
}) => {
	test.setTimeout(120_000);
	await isolateLocalWorld(page);
	await resetGeneratedWorld(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await expect(world).toHaveAttribute("data-play-rate", "1");
	expect(Number(await world.getAttribute("data-day-interval-ms"))).toBe(28_000);
	const startDay = Number(await world.getAttribute("data-horizon-days"));
	expect(startDay).toBeGreaterThanOrEqual(1);
	const dayStartedAt = Date.now();
	await expect(world).toHaveAttribute(
		"data-horizon-days",
		String(startDay + 1),
		{
			timeout: 90_000,
		},
	);
	const dayElapsedMs = Date.now() - dayStartedAt;
	expect(dayElapsedMs).toBeGreaterThanOrEqual(22_000);
	expect(dayElapsedMs).toBeLessThan(40_000);
	const peopleOrHappening = await page.evaluate(() => {
		const header = document.querySelector(".v1-world-title")?.textContent ?? "";
		const happening = document.querySelector("[data-happening-id]");
		return { header, hasHappening: happening !== null };
	});
	expect(
		/8 people/u.test(peopleOrHappening.header) ||
			/Orin/u.test(peopleOrHappening.header) ||
			peopleOrHappening.hasHappening,
	).toBe(true);
});

test("sponsoring Mara keeps counsel reachable after a live day @generated-world", async ({
	page,
}) => {
	test.setTimeout(linuxSemanticCi ? 360_000 : 180_000);
	await isolateLocalWorld(page);
	await resetGeneratedWorld(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	const canvas = page.getByTestId("generated-world-canvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 30_000,
	});
	await expect(page.locator(".generated-citizen-labels button")).toHaveCount(1);
	await expect(world).toHaveAttribute("data-play-rate", "1");
	await page.getByTestId("follow-mara").click();
	await expect(canvas).toHaveAttribute("data-following", "true");
	await expect(canvas).toHaveAttribute(
		"data-last-world-pick",
		"citizen:citizen-01",
	);
	await expect
		.poll(async () => {
			const ratio = Number(
				await canvas.getAttribute("data-follow-subject-y-ratio"),
			);
			return Number.isFinite(ratio) ? ratio : Number.NaN;
		})
		.toBeGreaterThanOrEqual(0.22);
	await expect
		.poll(async () =>
			Number(await canvas.getAttribute("data-follow-subject-y-ratio")),
		)
		.toBeLessThanOrEqual(0.78);
	await expect(canvas).toHaveAttribute("data-camera-target", /Mara/u);
	await expect(canvas).not.toHaveAttribute("data-camera-target", /Iven/u);
	const canonical = await canvas.getAttribute("data-actor-positions");
	const rendered = await canvas.getAttribute("data-rendered-actor-positions");
	const maraCanonical = actorCoords(canonical, "citizen-01");
	const ivenCanonical = actorCoords(canonical, "citizen-02");
	const maraRendered = actorCoords(rendered, "citizen-01");
	const ivenRendered = actorCoords(rendered, "citizen-02");
	expect(maraRendered).toBeTruthy();
	if (maraCanonical !== undefined && maraCanonical === ivenCanonical)
		expect(maraRendered).not.toBe(ivenRendered);
	await expect(
		page.locator('.generated-citizen-labels li[data-sponsored="true"]'),
	).toContainText("Mara Vale");
	await page
		.locator('ul.v1-presence-roster button[data-citizen-id="citizen-01"]')
		.click();
	await expect(
		page.getByRole("button", { name: "Sponsor Mara" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Sponsor Mara" }).click();
	await expect(
		page.getByRole("heading", { name: "Choose at Mara's first boundary" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await expect(
		page.getByRole("button", { name: "Check the stores first" }),
	).toBeVisible();
	await expect(world).toHaveAttribute("data-counsel-open", "true");
	await expect(world).toHaveAttribute("data-play-rate", "0");
	await expect(page.locator("footer.v1-world-footer")).toContainText(
		"Paused while you consider advice",
	);
	await expect(page.locator("p.v1-context-role")).not.toContainText(
		"EXPEDITION-STEWARD",
	);
	await expect(page.locator(".v1-context-panel")).not.toContainText(
		"meeting-hall",
	);
	await expect(page.locator(".v1-context-panel")).not.toContainText(
		"This is a named beat, not a silent roster change",
	);
	const time = page.getByRole("navigation", { name: "Time" });
	await expect(time.getByRole("button", { name: "Play" })).toBeDisabled();
	await expect(time.getByRole("button", { name: "Faster" })).toBeDisabled();
	await expect(
		page.getByRole("button", { name: "Keep watching" }),
	).toBeEnabled();
	await page.getByRole("button", { name: "Keep watching" }).click();
	await expect(world).toHaveAttribute("data-counsel-open", "false");
	await expect(time.getByRole("button", { name: "Faster" })).toBeEnabled();
	const dayAfterDismiss = Number(await world.getAttribute("data-horizon-days"));
	await pressTimeControl(page, "Faster");
	await expect(world).toHaveAttribute(
		"data-horizon-days",
		String(dayAfterDismiss + 1),
		{ timeout: 60_000 },
	);
	await pressTimeControl(page, "Pause");
	await expect(world).toHaveAttribute("data-play-rate", "0");
	await expect(canvas).toHaveAttribute("data-render-policy", "continuous");
	await expect(
		page.locator('ul.v1-presence-roster button[data-citizen-id="citizen-01"]'),
	).toHaveAttribute("aria-pressed", "true");
	await page.getByRole("button", { name: "Consider an intervention" }).click();
	await expect(
		page.getByRole("heading", { name: "Choose at Mara's first boundary" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await expect(world).toHaveAttribute("data-counsel-open", "true");
	await page
		.getByRole("button", { name: "Check the stores first" })
		.evaluate((element) => {
			(element as HTMLElement).click();
		});
	const seeDecision = await waitForEnabledCounsel(
		page,
		"See Mara's decision",
		sponsorTransitionTimeout,
	);
	await expect(page.locator("main.v1-world")).not.toContainText(/SP:/u);
	await expect(page.getByRole("alert")).toHaveCount(0);
	await seeDecision.click();
	await expect(
		page.getByRole("heading", { name: "What happened" }),
	).toBeVisible({ timeout: sponsorTransitionTimeout });
	await expect(
		page.locator("header.v1-world-header").getByRole("button", {
			name: "Chronicle",
			exact: true,
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "What happened" }),
	).toBeVisible();
	await expect(page.locator("main.v1-world")).not.toContainText(/SP:/u);
	await expect(page.locator(".v1-context-panel")).toContainText(
		/stores|inspection|recorded/iu,
	);
	await expect(canvas).toHaveAttribute("data-camera-target", /Mara/u);
	await expect(time.getByRole("button", { name: "Faster" })).toBeEnabled();
	await pressTimeControl(page, "Faster");
	await expect(world).toHaveAttribute("data-play-rate", "3");
});

test("In words matches the watched walking body @generated-world", async ({
	page,
}) => {
	test.setTimeout(90_000);
	await isolateLocalWorld(page);
	await resetGeneratedWorld(page);
	await page.goto("/world");
	const world = page.locator("main.v1-world");
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	await page
		.getByRole("navigation", { name: "Time" })
		.getByRole("button", { name: "Pause" })
		.click();
	await expect(world).toHaveAttribute("data-play-rate", "0");
	const watchWalking = await page
		.locator(".generated-scene-activity")
		.evaluateAll((nodes) =>
			nodes.map((node) => ({
				name: node.querySelector("strong")?.textContent?.trim() ?? "",
				activity: node.querySelector("span")?.textContent?.trim() ?? "",
			})),
		);
	await page.getByRole("button", { name: "In words" }).click();
	const people = page.getByRole("group", { name: "People here" });
	const travelCopy = /(?:walking|carrying) toward/u;
	for (const row of watchWalking) {
		if (row.name === "" || !travelCopy.test(row.activity)) continue;
		const person = people.getByRole("button", {
			name: new RegExp(row.name, "u"),
		});
		await expect(person).toContainText(travelCopy);
		await expect(person).not.toContainText("inspecting the work");
	}
	const presented = await page
		.locator("[data-presented-activity]")
		.evaluateAll((nodes) =>
			nodes.map((node) => node.getAttribute("data-presented-activity") ?? ""),
		);
	expect(presented.some((copy) => travelCopy.test(copy))).toBe(true);
	for (const copy of presented) {
		if (travelCopy.test(copy))
			expect(copy).not.toContain("inspecting the work");
	}
});
