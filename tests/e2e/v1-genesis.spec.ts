import { expect, type Page, test } from "@playwright/test";

const viewports = [
	{ name: "desktop", width: 1728, height: 1117 },
	{ name: "laptop", width: 1366, height: 768 },
	{ name: "mobile", width: 390, height: 844 },
] as const;

async function blockExternalNetwork(page: Page) {
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

async function openLivingWorld(page: Page) {
	await page.goto("/world");
	await expect(page).toHaveTitle("EONFOLK — Genesis World");
	const canvas = page.getByTestId("riverhold-canvas");
	await expect(canvas).toBeVisible();
	await expect(canvas).toHaveAttribute("data-engine", "playcanvas");
	await expect(canvas).toHaveAttribute("data-ready", "true", {
		timeout: 15_000,
	});
	return canvas;
}

test("Release Genesis opens one immutable, account-free living world", async ({
	page,
}) => {
	const externalRequests = await blockExternalNetwork(page);
	await page.setViewportSize(viewports[0]);
	await page.goto("/genesis");
	await expect(page).toHaveTitle("EONFOLK — Release Genesis");

	await expect(
		page.getByRole("heading", { name: "A living place, already in motion." }),
	).toBeVisible();
	await expect(page.getByLabel("Immutable world identity")).toContainText(
		"eonfolk-genesis-world-v1",
	);
	await expect(page.getByLabel("Release proof summary")).toContainText(
		"8 canonical Riverhold citizens",
	);
	await page.getByText("Show the complete fixed seed").click();
	await expect(page.getByTestId("genesis-seed")).toHaveText(/^[0-9a-f]{64}$/u);

	await page.getByRole("link", { name: /^Enter /u }).click();
	await expect(page).toHaveURL(/\/world$/u);
	const canvas = await openLivingWorld(page);
	await expect(
		page.locator("main[data-generated-origin-id='eonfolk-genesis-world-v1']"),
	).toBeVisible();
	await expect(page.locator("main.v1-world")).not.toHaveAttribute(
		"data-world-id",
		"pending",
	);
	await expect(page.getByRole("group", { name: "Eight citizens" })).toHaveCount(
		1,
	);
	await expect(
		page.getByRole("group", { name: "Eight citizens" }).getByRole("button"),
	).toHaveCount(8);
	await expect(canvas).toHaveAttribute("data-interactions", "1");
	expect(externalRequests).toEqual([]);
});

test("typed simulation time changes the visible mill project and settlement head", async ({
	page,
}) => {
	await blockExternalNetwork(page);
	await page.setViewportSize(viewports[1]);
	const canvas = await openLivingWorld(page);
	const project = page.getByTestId("v1-project-state");

	await expect(project).toHaveAttribute("data-project-state", "active");
	await expect(project).toContainText("Repair active at the mill wheel");
	await expect(canvas).toHaveAttribute("data-mill-state", "needs-repair");
	const initialRevision = Number(
		await canvas.getAttribute("data-world-revision"),
	);
	const initialTick = Number(
		await canvas.getAttribute("data-presentation-tick"),
	);
	await expect
		.poll(
			async () => Number(await canvas.getAttribute("data-presentation-tick")),
			{ timeout: 10_000 },
		)
		.toBeGreaterThan(initialTick);
	await expect
		.poll(
			async () => Number(await canvas.getAttribute("data-world-revision")),
			{ timeout: 10_000 },
		)
		.toBeGreaterThan(initialRevision);
	await expect(project).toHaveAttribute("data-project-state", "complete", {
		timeout: 10_000,
	});
	await expect(project).toContainText("Wheel repaired and operational");
	await expect(canvas).toHaveAttribute("data-mill-state", "repaired");
	await expect(canvas).toHaveAttribute("data-teleports", "0");
	await expect(canvas).toHaveAttribute("data-contradictions", "0");
});

test("keyboard navigation reaches people, world camera, motion, and semantic fallback", async ({
	page,
}) => {
	await blockExternalNetwork(page);
	await page.setViewportSize(viewports[1]);
	const canvas = await openLivingWorld(page);

	const neri = page
		.getByRole("group", { name: "Eight citizens" })
		.getByRole("button", { name: /Neri Ash/u });
	await neri.focus();
	await neri.press("Enter");
	await expect(page.getByRole("heading", { name: "Neri Ash" })).toBeVisible();
	await expect(canvas).toHaveAttribute("data-focus-composition", "citizen");
	await expect(canvas).toHaveAttribute("data-focus-subject-visible", "true");
	const neriSubject = await canvas.getAttribute("data-focus-subject");
	expect(neriSubject).toBeTruthy();

	await page.getByRole("button", { name: "World in words" }).click();
	await expect(page.getByTestId("v1-semantic-world")).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Riverhold, in words" }),
	).toBeVisible();
	await expect(
		page.getByLabel("Eight Riverhold citizens and their current activities"),
	).toBeVisible();

	await page.getByRole("button", { name: "Embodied world" }).click();
	await expect(canvas).toBeVisible();
	await page.getByRole("button", { name: "Follow Mara", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Mara Vale" })).toBeVisible();
	await expect(canvas).toHaveAttribute("data-focus-composition", "citizen");
	await expect
		.poll(() => canvas.getAttribute("data-focus-subject"))
		.not.toBe(neriSubject);
	await canvas.focus();
	await canvas.press("Home");
	await expect(canvas).toHaveAttribute("data-focus-composition", "overview");
	await page.getByRole("button", { name: "Reduce motion" }).click();
	await expect(
		page.getByRole("button", { name: "Motion reduced" }),
	).toHaveAttribute("aria-pressed", "true");
	await expect(canvas).toHaveAttribute("data-navigation-mode", "direct");
});

for (const viewport of viewports) {
	test(`${viewport.name} keeps the embodied world dominant without horizontal overflow`, async ({
		page,
	}) => {
		await blockExternalNetwork(page);
		await page.setViewportSize(viewport);
		const canvas = await openLivingWorld(page);
		const bounds = await canvas.boundingBox();
		expect(bounds).not.toBeNull();
		expect(bounds?.width ?? 0).toBeGreaterThan(viewport.width * 0.5);
		expect(bounds?.height ?? 0).toBeGreaterThan(viewport.height * 0.45);
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth + 1,
				),
			)
			.toBe(true);
		await expect(
			page.getByRole("group", { name: "Eight citizens" }).getByRole("button"),
		).toHaveCount(8);
	});
}

test("the existing Founder Alpha route remains the default", async ({
	page,
}) => {
	await blockExternalNetwork(page);
	await page.goto("/");
	await expect(page).toHaveURL(/\/$/u);
	await expect(
		page.getByRole("heading", { name: /Follow one life/u }),
	).toBeVisible();
});
