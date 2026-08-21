import { expect, test } from "@playwright/test";

let pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
	pageErrors = [];
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		if (url.hostname === "127.0.0.1") await route.continue();
		else await route.abort("blockedbyclient");
	});
	page.on("console", (message) => {
		if (message.type() === "error") pageErrors.push(message.text());
	});
	page.on("pageerror", (error) => pageErrors.push(error.message));
	await page.goto("/");
	await page.evaluate(() => localStorage.clear());
	await page.reload();
	await expect(page.getByTestId("riverhold-canvas")).toHaveAttribute(
		"data-ready",
		"true",
	);
});

test.afterEach(() => expect(pageErrors).toEqual([]));

test("complete verify path survives reload and reaches Chronicle and Story Card", async ({
	page,
}) => {
	await expect(
		page.getByRole("heading", { name: /Follow one life/i }),
	).toBeVisible();
	await expect(
		page
			.getByRole("list", { name: /Eight Riverhold citizens/i })
			.getByRole("listitem"),
	).toHaveCount(8);

	await page.getByRole("button", { name: /Follow Mara/ }).click();
	await expect(page.getByText(/She acts for herself/i)).toBeVisible();
	await expect(page.getByText(/saved only in this browser/i)).toBeVisible();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await expect(page.getByText("OBSERVED", { exact: true })).toBeVisible();
	await expect(page.getByText(/has not observed theft/i)).toBeVisible();
	await page
		.getByRole("button", { name: /Reach the counsel boundary/i })
		.click();
	await page.getByText("Verify the count privately", { exact: true }).click();
	await page.getByRole("button", { name: "Offer counsel" }).click();
	await expect(
		page.getByRole("heading", { name: /She accepted your counsel/i }),
	).toBeVisible();
	await expect(page.getByText(/contributing input/i)).toBeVisible();
	await page
		.getByRole("button", { name: /Leave Riverhold at checkpoint/i })
		.click();
	await page.getByRole("button", { name: /Return to Riverhold/i }).click();
	await expect(
		page
			.getByLabel("Current Riverhold decision")
			.getByRole("heading", { name: /Riverhold changed while you were gone/i }),
	).toBeVisible();
	await expect(page.getByText(/While you were away/i)).toHaveCount(0);
	await page.getByRole("button", { name: /Advance Riverhold/i }).click();
	await expect(page.getByText(/WHILE YOU WERE AWAY/i)).toBeVisible();
	await page
		.getByRole("button", { name: /Ask Mara to publish the verified count/i })
		.click();
	await expect(
		page.getByRole("heading", { name: /What entered the record/i }),
	).toBeVisible();
	await page
		.getByRole("button", { name: /Inspect \d+ evidence record/i })
		.first()
		.click();
	await expect(
		page.getByRole("dialog", { name: /Mara Vale independently chose/i }),
	).toBeVisible();
	await page.getByRole("button", { name: "Close details" }).click();
	await page.getByRole("button", { name: /Show beat 2/i }).click();
	await expect(
		page.getByRole("heading", { name: /Mara Vale recorded a sourced belief/i }),
	).toBeVisible();
	await page.getByRole("button", { name: "Copy Story Card" }).click();
	await expect(
		page.getByRole("button", { name: "Story Card copied" }),
	).toBeVisible();
});

test("accuse path preserves allegation language and offers trust repair", async ({
	page,
}) => {
	await page.getByRole("button", { name: /Follow Mara/ }).click();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await page
		.getByRole("button", { name: /Reach the counsel boundary/i })
		.click();
	await page.getByText("Raise the mismatch in public", { exact: true }).click();
	await page.getByRole("button", { name: "Offer counsel" }).click();
	await expect(
		page.getByText(/three petition endorsements followed/i),
	).toBeVisible();
	await page.getByRole("button", { name: /Leave Riverhold/i }).click();
	await expect(
		page.getByRole("heading", { name: /Riverhold can continue from here/i }),
	).toBeVisible();
	await page.reload();
	await page.getByRole("button", { name: /Advance Riverhold/i }).click();
	await expect(
		page.getByRole("button", { name: /Counsel Mara to repair the trust/i }),
	).toBeVisible();
	await page
		.getByRole("button", { name: /Counsel Mara to repair the trust/i })
		.click();
	await page.getByRole("button", { name: /Show beat 2/i }).click();
	await expect(page.getByText(/allegation, not proof/i)).toBeVisible();
});

test("mobile, keyboard, semantic parity, Back, and reduced motion remain functional", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.reload();
	await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
	await page.keyboard.press("Tab");
	await page.keyboard.press("Enter");
	await page.getByRole("button", { name: /Mara Vale ledger runner/i }).click();
	await expect(page.getByRole("dialog", { name: "Mara Vale" })).toBeVisible();
	await page.goBack();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(
		page.getByRole("list", { name: /Eight Riverhold citizens/i }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: /Mara Vale ledger runner/i }),
	).toHaveCSS("min-height", "90px");
});

test("required desktop, laptop, mobile, and 200% text layouts do not overflow", async ({
	page,
}) => {
	for (const viewport of [
		{ width: 1728, height: 1117 },
		{ width: 1366, height: 768 },
		{ width: 390, height: 844 },
	]) {
		await page.setViewportSize(viewport);
		await page.reload();
		await expect(page.getByTestId("riverhold-canvas")).toHaveAttribute(
			"data-ready",
			"true",
		);
		const width = await page.evaluate(() => ({
			client: document.documentElement.clientWidth,
			scroll: document.documentElement.scrollWidth,
		}));
		expect(width.scroll).toBeLessThanOrEqual(width.client);
		await expect(
			page.getByRole("button", { name: /Follow Mara/ }),
		).toBeVisible();
	}
	await page.evaluate(() => {
		document.documentElement.style.fontSize = "200%";
	});
	await expect(page.getByRole("button", { name: /Follow Mara/ })).toBeVisible();
	const zoomed = await page.evaluate(() => ({
		client: document.documentElement.clientWidth,
		scroll: document.documentElement.scrollWidth,
	}));
	expect(zoomed.scroll).toBeLessThanOrEqual(zoomed.client);
});
