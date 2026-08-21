import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

let pageErrors: string[] = [];
const routeLog: Array<{
	readonly action: "allow" | "abort";
	readonly method: string;
	readonly resourceType: string;
	readonly url: string;
}> = [];
const routeLogPath = resolve(
	import.meta.dirname,
	"../../tmp/riverhold-playwright/route-log.json",
);

async function installPageOracles(page: Page) {
	await page.route("**/*", async (route) => {
		const url = new URL(route.request().url());
		const action = url.hostname === "127.0.0.1" ? "allow" : "abort";
		routeLog.push({
			action,
			method: route.request().method(),
			resourceType: route.request().resourceType(),
			url: route.request().url(),
		});
		if (action === "allow") await route.continue();
		else await route.abort("blockedbyclient");
	});
	page.on("console", (message) => {
		if (message.type() === "error") pageErrors.push(message.text());
	});
	page.on("pageerror", (error) => pageErrors.push(error.message));
}

test.beforeEach(async ({ page }) => {
	pageErrors = [];
	await installPageOracles(page);
	await page.goto("/");
	await page.evaluate(() => localStorage.clear());
	await page.reload();
	await expect(page.getByTestId("riverhold-canvas")).toHaveAttribute(
		"data-ready",
		"true",
	);
});

test.afterEach(() => expect(pageErrors).toEqual([]));
test.afterAll(() => {
	mkdirSync(dirname(routeLogPath), { recursive: true });
	writeFileSync(routeLogPath, `${JSON.stringify(routeLog)}\n`);
});

test("complete verify path survives reload and reaches Chronicle and Story Card", async ({
	context,
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
	await expect(
		page.getByText(/Your counsel matched my judgment/i),
	).toBeVisible();
	await expect(page.getByText("Advice aligned", { exact: true })).toBeVisible();
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
	await page.getByRole("button", { name: /Advance Riverhold/i }).dblclick();
	await expect(page.getByText(/WHILE YOU WERE AWAY/i)).toBeVisible();
	await expect(page.getByText(/Day 19/).first()).toBeVisible();
	await page
		.getByRole("button", { name: /Ask Mara to publish the verified count/i })
		.click();
	await expect(
		page.getByRole("heading", { name: /What entered the record/i }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: /YOU ADVISED: verify first/i }),
	).toBeVisible();
	await page.getByRole("button", { name: /Show beat 2/i }).click();
	await expect(
		page.getByRole("heading", {
			name: /Mara Vale independently chose to verify/i,
		}),
	).toBeVisible();
	await page
		.getByRole("button", { name: /Inspect \d+ evidence record/i })
		.click();
	await expect(
		page.getByRole("dialog", { name: /Mara Vale independently chose/i }),
	).toBeVisible();
	await page.getByRole("button", { name: "Close details" }).click();
	await page.getByRole("button", { name: /Show beat 3/i }).click();
	await expect(
		page.getByRole("heading", { name: /Mara Vale recorded a sourced belief/i }),
	).toBeVisible();
	await context.grantPermissions(["clipboard-read", "clipboard-write"], {
		origin: "http://127.0.0.1:4174",
	});
	await page.getByRole("button", { name: "Copy Story Card" }).click();
	await expect(
		page.getByRole("button", { name: "Story Card copied" }),
	).toBeVisible();
	await page.evaluate(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText: () => Promise.reject(new Error("permission denied")),
			},
		});
	});
	await page.getByRole("button", { name: "Story Card copied" }).click();
	await expect(
		page.getByRole("button", {
			name: "Copy unavailable — select the card text",
		}),
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
	await page
		.getByRole("button", { name: /Inspect \d+ evidence records/i })
		.click();
	const evidenceDialog = page.getByRole("dialog", {
		name: /Mara Vale independently chose to make the allegation/i,
	});
	await expect(evidenceDialog).toBeVisible();
	await expect(
		evidenceDialog.getByText(/An allegation is attributed content/i),
	).toBeVisible();
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
	const maraButton = page.getByRole("button", {
		name: /Mara Vale ledger runner/i,
	});
	await maraButton.click();
	await expect(page.getByRole("dialog", { name: "Mara Vale" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Close details" }),
	).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(
		page.getByRole("button", { name: "Close details" }),
	).toBeFocused();
	await page.keyboard.press("Shift+Tab");
	await expect(
		page.getByRole("button", { name: "Close details" }),
	).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(maraButton).toBeFocused();
	await maraButton.click();
	await page.goBack();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(
		page.getByRole("list", { name: /Eight Riverhold citizens/i }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: /Mara Vale ledger runner/i }),
	).toHaveCSS("min-height", "90px");
});

test("shows no world facts while the authoritative worker is delayed", async ({
	page,
}) => {
	await page.evaluate(() => {
		localStorage.setItem(
			"eonfolk:riverhold:checkpoint-v1",
			JSON.stringify({
				schemaVersion: "riverhold-checkpoint-v1",
				branch: "verify-private",
				phase: "chronicle",
			}),
		);
	});
	await page.addInitScript(() => {
		const NativeWorker = window.Worker;
		window.Worker = class DelayedWorker extends NativeWorker {
			override addEventListener(
				type: string,
				listener: EventListenerOrEventListenerObject,
				options?: boolean | AddEventListenerOptions,
			) {
				if (type !== "message") {
					super.addEventListener(type, listener, options);
					return;
				}
				const delayed: EventListener = (event) => {
					window.setTimeout(() => {
						if (typeof listener === "function") listener.call(this, event);
						else listener.handleEvent(event);
					}, 750);
				};
				super.addEventListener(type, delayed, options);
			}
		} as typeof Worker;
	});
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(
		page.getByRole("heading", { name: /Checking Riverhold's durable record/i }),
	).toBeVisible();
	await expect(page.getByText(/YOU ADVISED/i)).toHaveCount(0);
	await expect(
		page.getByRole("region", { name: /Riverhold Story Card/i }),
	).toHaveCount(0);
	await expect(page.getByTestId("riverhold-canvas")).toHaveAttribute(
		"data-ready",
		"true",
	);
	await expect(
		page.getByRole("heading", { name: /Follow one life/i }),
	).toBeVisible();
});

test("a newer tab fences the older writer and remains authoritative", async ({
	context,
	page,
}) => {
	const newer = await context.newPage();
	await installPageOracles(newer);
	await newer.goto("/");
	await expect(newer.getByTestId("riverhold-canvas")).toHaveAttribute(
		"data-ready",
		"true",
	);
	await page.getByRole("button", { name: /Follow Mara/ }).click();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await expect(
		page.getByRole("heading", {
			name: /Riverhold stopped before showing further world state/i,
		}),
	).toBeVisible();
	await expect(page.getByRole("alert")).toContainText(/STALE_FENCE/i);
	await newer.getByRole("button", { name: /Follow Mara/ }).click();
	await newer.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await expect(newer.getByText("OBSERVED", { exact: true })).toBeVisible();
	await newer.close();
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
