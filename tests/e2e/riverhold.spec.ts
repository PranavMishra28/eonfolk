import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

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
	await page.getByRole("button", { name: /Review Mara's choices/i }).click();
	await page.getByText("Verify the count privately", { exact: true }).click();
	await page.getByRole("button", { name: "Offer counsel" }).click();
	await expect(
		page.getByRole("heading", { name: /She accepted your counsel/i }),
	).toBeVisible();
	await expect(
		page.getByText(/Your counsel matched my judgment/i),
	).toBeVisible();
	await expect(page.getByText("Advice aligned", { exact: true })).toBeVisible();
	await expect(page.getByText(/Your advice influenced her/i)).toBeVisible();
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
	const chronicleTextFloors = await page.evaluate(() => ({
		factual: [
			...document.querySelectorAll(
				".replay-stage p:not(.beat-time), .replay-track button, .story-beats p, .story-unresolved, .semantic-summary dd, .semantic-citizens span:last-child",
			),
		].map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
		secondary: [
			...document.querySelectorAll(
				".beat-time, .replay-track span, .story-place, .story-mark, .semantic-summary dt, .semantic-citizens small, footer span",
			),
		].map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
	}));
	expect(Math.min(...chronicleTextFloors.factual)).toBeGreaterThanOrEqual(16);
	expect(Math.min(...chronicleTextFloors.secondary)).toBeGreaterThanOrEqual(14);
});

test("feedback stays local, sanitizes its image, requires consent for diagnostics, and can be deleted", async ({
	page,
}) => {
	const panel = page.getByRole("region", { name: "What broke the spell?" });
	await panel
		.getByRole("button", { name: "Report issue / Save feedback locally" })
		.click();
	await panel
		.getByLabel("What happened?")
		.fill(
			"The relationship consequence was clear. Contact player@example.com with ghp_abcdefghijklmnopqrstuvwxyz123456",
		);
	await panel
		.getByLabel("What did you expect? (optional)")
		.fill("A plain-language warning before the transition.");
	await expect(panel.getByLabel("Feedback delivery status")).toContainText(
		"Storage: this browser only",
	);
	await expect(panel.getByLabel("Feedback delivery status")).toContainText(
		"Upload: unavailable",
	);
	await expect(panel.getByLabel(/Attach recent replay/i)).toBeDisabled();
	await panel.getByLabel(/Include bounded structured diagnostics/i).check();
	await panel.getByLabel("Optional image").setInputFiles({
		name: "moment.png",
		mimeType: "image/png",
		buffer: Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
			"base64",
		),
	});
	await expect(panel.getByText(/Sanitized to 1×1/i)).toBeVisible();
	const preview = panel.getByRole("img", {
		name: /Exact sanitized preview that will be saved/i,
	});
	await expect(preview).toBeVisible();
	await expect(
		panel.getByText(/exact re-encoded image saved with the local report/i),
	).toBeVisible();
	const previewSource = await preview.getAttribute("src");
	expect(previewSource).not.toBeNull();
	await panel.getByRole("button", { name: "Save feedback locally" }).click();
	await expect(
		panel.getByText(
			/No feedback relay is configured, so nothing was uploaded/i,
		),
	).toBeVisible();
	await expect(
		panel.getByRole("button", { name: /Delete queued feedback \(1\)/i }),
	).toBeVisible();
	const stored = await page.evaluate(() =>
		localStorage.getItem("eonfolk:founder-alpha-feedback:v1"),
	);
	expect(stored).not.toContain("player@example.com");
	expect(stored).not.toContain("ghp_");
	expect(stored).not.toContain("prompt");
	expect(stored).toContain("What happened:");
	expect(stored).toContain("What I expected:");
	expect(stored).toContain(previewSource);
	await expect(
		panel.getByRole("button", { name: /Retry upload/i }),
	).toBeDisabled();
	await page.context().setOffline(true);
	await expect(panel.getByLabel("Feedback delivery status")).toContainText(
		"Connection: offline",
	);
	await page.context().setOffline(false);
	await panel
		.getByRole("button", { name: /Delete queued feedback \(1\)/i })
		.click();
	await expect(
		panel.getByText(/Deleted all locally queued feedback/i),
	).toBeVisible();
});

async function reachVerifyCounsel(page: Page) {
	await page.getByRole("button", { name: /Follow Mara/ }).click();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await page.getByRole("button", { name: /Review Mara's choices/i }).click();
	await page.getByText("Verify the count privately", { exact: true }).click();
}

async function tabTo(page: Page, locator: Locator) {
	for (let step = 0; step < 80; step += 1) {
		if (await locator.evaluate((element) => element === document.activeElement))
			return;
		await page.keyboard.press("Tab");
	}
	throw new Error("Keyboard focus did not reach the requested control");
}

test("browser recovers a counsel issue committed before worker failure without issuing it twice", async ({
	page,
}) => {
	await reachVerifyCounsel(page);
	await page.evaluate(() =>
		sessionStorage.setItem("eonfolk:e2e-crash-after-transition", "1"),
	);
	await page.getByRole("button", { name: "Offer counsel" }).click();
	await expect(
		page.getByRole("heading", {
			name: /Riverhold stopped before showing further world state/i,
		}),
	).toBeVisible();

	await page.reload();
	await expect(
		page.getByRole("heading", { name: /What risk should Mara take/i }),
	).toBeVisible();
	await page.getByText("Verify the count privately", { exact: true }).click();
	await page.getByRole("button", { name: "Offer counsel" }).click();
	await expect(
		page.getByRole("heading", { name: /She accepted your counsel/i }),
	).toBeVisible();
	await expect(
		page.getByText(/Your counsel matched my judgment/i),
	).toBeVisible();
});

test("browser rehydrates the durable decision receipt after a resolve commit failure", async ({
	page,
}) => {
	await reachVerifyCounsel(page);
	await page.evaluate(() =>
		sessionStorage.setItem("eonfolk:e2e-crash-after-transition", "2"),
	);
	await page.getByRole("button", { name: "Offer counsel" }).click();
	await expect(
		page.getByRole("heading", {
			name: /Riverhold stopped before showing further world state/i,
		}),
	).toBeVisible();

	await page.reload();
	await expect(
		page.getByRole("heading", { name: /She accepted your counsel/i }),
	).toBeVisible();
	await expect(
		page.getByText(/Your counsel matched my judgment/i),
	).toBeVisible();
	await expect(page.getByText("Advice aligned", { exact: true })).toBeVisible();
});

test("accuse path preserves allegation language and offers trust repair", async ({
	page,
}) => {
	await page.getByRole("button", { name: /Follow Mara/ }).click();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await page.getByRole("button", { name: /Review Mara's choices/i }).click();
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
	const worldViewToggle = page.getByRole("button", { name: "Use list view" });
	await worldViewToggle.focus();
	await page.keyboard.press("Enter");
	const maraButton = page.getByRole("button", {
		name: /Mara Vale ledger runner/i,
	});
	await maraButton.click();
	await expect(page.getByRole("dialog", { name: "Mara Vale" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Mara Vale" })).toBeFocused();
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
	await expect(page.getByText(/Reproduction ID:/i)).toContainText(
		/inc_[a-f0-9]{24}/u,
	);
	await expect(
		page.getByRole("button", {
			name: "Report issue / Save feedback locally",
		}),
	).toBeVisible();
	await newer.getByRole("button", { name: /Follow Mara/ }).click();
	await newer.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await expect(newer.getByText("OBSERVED", { exact: true })).toBeVisible();
	await newer.close();
});

test("safe-stop redacts a raw worker error while keeping a local report path", async ({
	page,
}) => {
	await page.addInitScript(() => {
		const canary = "Bearer ghp_abcdefghijklmnopqrstuvwxyz123456 private-state";
		window.Worker = class FailedWorker {
			addEventListener(
				type: string,
				listener: EventListenerOrEventListenerObject,
			) {
				if (type !== "error") return;
				window.setTimeout(() => {
					const event = new ErrorEvent("error", { message: canary });
					if (typeof listener === "function") listener(event);
					else listener.handleEvent(event);
				}, 0);
			}
			postMessage() {}
			terminate() {}
		} as unknown as typeof Worker;
	});
	await page.reload({ waitUntil: "domcontentloaded" });
	await expect(
		page.getByRole("heading", {
			name: /Riverhold stopped before showing further world state/i,
		}),
	).toBeVisible();
	await expect(page.getByText(/Reproduction ID:/i)).toContainText(
		/inc_[a-f0-9]{24}/u,
	);
	await expect(
		page.getByRole("button", {
			name: "Report issue / Save feedback locally",
		}),
	).toBeVisible();
	await expect(page.locator("body")).not.toContainText("ghp_");
	await expect(page.locator("body")).not.toContainText("private-state");
});

test("required layouts and a CDP 200% browser-zoom equivalent reflow without lost actions", async ({
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
	const cdp = await page.context().newCDPSession(page);
	await cdp.send("Emulation.setDeviceMetricsOverride", {
		width: 195,
		height: 422,
		deviceScaleFactor: 2,
		mobile: false,
	});
	await page.reload();
	await expect(page.getByRole("button", { name: /Follow Mara/ })).toBeVisible();
	const zoomed = await page.evaluate(() => ({
		client: document.documentElement.clientWidth,
		scroll: document.documentElement.scrollWidth,
		scale: window.devicePixelRatio,
	}));
	expect(zoomed.scale).toBe(2);
	expect(zoomed.scroll).toBeLessThanOrEqual(zoomed.client);
	await page.screenshot({
		path: resolve(
			import.meta.dirname,
			"../../tmp/riverhold-playwright/zoom-200-mobile.png",
		),
		fullPage: true,
	});
});

test("mobile arrival keeps the world dominant and the opening action in the first viewport", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.reload();
	await expect(page.getByTestId("riverhold-canvas")).toHaveAttribute(
		"data-ready",
		"true",
	);
	const geometry = await page.evaluate(() => {
		const header = document.querySelector(".topbar")?.getBoundingClientRect();
		const world = document
			.querySelector(".world-stage")
			?.getBoundingClientRect();
		const action = [...document.querySelectorAll("button")]
			.find((button) => button.textContent?.includes("Follow Mara"))
			?.getBoundingClientRect();
		return {
			headerBottom: header?.bottom ?? 0,
			worldHeight: world?.height ?? 0,
			actionTop: action?.top ?? Number.POSITIVE_INFINITY,
			actionBottom: action?.bottom ?? Number.POSITIVE_INFINITY,
			viewportHeight: window.innerHeight,
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		};
	});
	expect(
		geometry.worldHeight / (geometry.viewportHeight - geometry.headerBottom),
	).toBeGreaterThanOrEqual(0.55);
	expect(geometry.actionTop).toBeGreaterThanOrEqual(0);
	expect(geometry.actionBottom).toBeLessThanOrEqual(geometry.viewportHeight);
	expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
	const textFloors = await page.evaluate(() => ({
		factual: [
			...document.querySelectorAll(".world-notice, .lede, .arrival-facts span"),
		].map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
		secondary: [
			...document.querySelectorAll(
				".resource-ribbon small, .eyebrow, .microcopy",
			),
		].map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
	}));
	expect(Math.min(...textFloors.factual)).toBeGreaterThanOrEqual(16);
	expect(Math.min(...textFloors.secondary)).toBeGreaterThanOrEqual(14);

	await page.getByRole("button", { name: /Follow Mara/ }).click();
	const peek = page.locator(".phase-panel--following");
	await expect(peek).toBeVisible();
	const peekHeight = await peek.evaluate(
		(element) => element.getBoundingClientRect().height,
	);
	expect(peekHeight).toBeLessThanOrEqual(
		(844 - geometry.headerBottom) * 0.35 + 1,
	);
	await expect(peek.getByText("Mara", { exact: true })).toBeVisible();
	await expect(peek.getByText(/acts for herself/i)).toBeVisible();
	await expect(peek.getByText(/saved only in this browser/i)).toBeVisible();
	await expect(
		peek.getByRole("button", { name: /Check why Mara doubts/i }),
	).toBeVisible();
});

test("counsel presents its grounding and all three stakes in one state", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole("button", { name: /Follow Mara/ }).click();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await page.getByRole("button", { name: /Review Mara's choices/i }).click();
	const panel = page.getByLabel("Current Riverhold decision");
	const context = panel.getByRole("region", {
		name: "What Mara knows and cares about",
	});
	await expect(context).toContainText(/40 food.*28.*12-unit gap/i);
	await expect(context).toContainText(/caution.*candor.*loyalty/i);
	await expect(context).toContainText(
		/Reconcile the ledger.*reconcile-ledger/i,
	);
	await expect(context).toContainText(/Mara trusts Toma/i);
	await expect(context).toContainText(/reason is not known/i);
	await expect(panel.getByText(/saved only in this browser/i)).toBeVisible();
	for (const name of [
		"Verify the count privately",
		"Raise the mismatch in public",
		"Offer no advice",
	]) {
		await expect(
			panel.getByRole("radio", { name: new RegExp(name, "i") }),
		).toBeVisible();
	}
	await expect(
		panel.getByText(/public count may stay wrong longer/i),
	).toBeVisible();
	await expect(
		panel.getByText(/unverified allegation may damage trust/i),
	).toBeVisible();
	await expect(panel.getByText(/uncertainty may survive/i)).toBeVisible();
	const counselFactFloor = await panel
		.locator(
			".counsel-context p, .local-disclosure, .counsel-card small, .counsel-card em",
		)
		.evaluateAll((elements) =>
			elements.map((element) =>
				Number.parseFloat(getComputedStyle(element).fontSize),
			),
		);
	expect(Math.min(...counselFactFloor)).toBeGreaterThanOrEqual(16);
});

test("fact badges pass normal-text contrast and focus survives forced colors", async ({
	page,
}) => {
	await page.getByRole("button", { name: /Follow Mara/ }).click();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	const ratios = await page
		.locator(".fact-badge, .belief-badge, .claim-badge")
		.evaluateAll((elements) => {
			const rgb = (value: string) =>
				(value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
			const luminance = ([red = 0, green = 0, blue = 0]: number[]) => {
				const linear = [red, green, blue].map((channel) => {
					const normalized = channel / 255;
					return normalized <= 0.04045
						? normalized / 12.92
						: ((normalized + 0.055) / 1.055) ** 2.4;
				});
				return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
			};
			return elements.map((element) => {
				const style = getComputedStyle(element);
				const first = luminance(rgb(style.color));
				const second = luminance(rgb(style.backgroundColor));
				return (
					(Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
				);
			});
		});
	for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
	await page.getByRole("button", { name: /Review Mara's choices/i }).click();
	await page.emulateMedia({ forcedColors: "active" });
	const verify = page.getByRole("radio", {
		name: /Verify the count privately/i,
	});
	await tabTo(page, verify);
	await expect(verify.locator("..")).toHaveCSS("outline-style", "solid");
	await expect(verify.locator("..")).toHaveCSS("outline-width", "3px");
});

test("the complete critical journey is keyboard-only and modal focus is isolated and restored", async ({
	page,
}) => {
	const follow = page.getByRole("button", { name: /Follow Mara/ });
	await tabTo(page, follow);
	await page.keyboard.press("Enter");
	const investigate = page.getByRole("button", {
		name: /Check why Mara doubts/i,
	});
	await tabTo(page, investigate);
	await page.keyboard.press("Enter");
	const openCounsel = page.getByRole("button", {
		name: /Review Mara's choices/i,
	});
	await tabTo(page, openCounsel);
	await page.keyboard.press("Enter");
	const verify = page.getByRole("radio", {
		name: /Verify the count privately/i,
	});
	await tabTo(page, verify);
	const visibleCard = verify.locator("..");
	await expect(visibleCard).toHaveCSS("outline-style", "double");
	await expect(visibleCard).toHaveCSS("outline-width", "4px");
	await page.keyboard.press("Space");
	await expect(verify).toBeChecked();
	const offer = page.getByRole("button", { name: "Offer counsel" });
	await tabTo(page, offer);
	await page.keyboard.press("Enter");
	const leave = page.getByRole("button", {
		name: /Leave Riverhold at checkpoint/i,
	});
	await tabTo(page, leave);
	await page.keyboard.press("Enter");
	const returnButton = page.getByRole("button", {
		name: /Return to Riverhold/i,
	});
	await tabTo(page, returnButton);
	await page.keyboard.press("Enter");
	const advance = page.getByRole("button", { name: /Advance Riverhold/i });
	await tabTo(page, advance);
	await page.keyboard.press("Enter");
	const nextRisk = page.getByRole("button", {
		name: /Ask Mara to publish the verified count/i,
	});
	await tabTo(page, nextRisk);
	await page.keyboard.press("Enter");
	const beatTwo = page.getByRole("button", { name: /Show beat 2/i });
	await tabTo(page, beatTwo);
	await page.keyboard.press("Enter");
	const evidence = page.getByRole("button", {
		name: /Inspect \d+ evidence record/i,
	});
	await tabTo(page, evidence);
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog");
	const heading = dialog.getByRole("heading");
	await expect(heading).toBeFocused();
	await expect(page.locator("main#world")).toHaveAttribute("inert", "");
	await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
	await page.keyboard.press("Tab");
	await expect(
		dialog.getByRole("button", { name: "Close details" }),
	).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(evidence).toBeFocused();
});

test("remembered words view and renderer failure preserve a fully playable journey", async ({
	page,
}) => {
	await page.evaluate(() =>
		sessionStorage.setItem("eonfolk:e2e-renderer-failure", "1"),
	);
	await page.reload();
	await expect(
		page.getByText(/illustrated view could not start/i),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Riverhold world in words" }),
	).toBeVisible();
	await expect(page.getByTestId("riverhold-canvas")).toHaveCount(0);
	await expect(
		page.getByRole("list", { name: /Eight Riverhold citizens/i }),
	).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole("button", { name: "Use illustrated view" }),
	).toBeVisible();

	await page.getByRole("button", { name: /Follow Mara/ }).click();
	await page.getByRole("button", { name: /Check why Mara doubts/i }).click();
	await page.getByRole("button", { name: /Review Mara's choices/i }).click();
	await page.getByRole("radio", { name: /Offer no advice/i }).check();
	await page.getByRole("button", { name: "Offer counsel" }).click();
	await page
		.getByRole("button", { name: /Leave Riverhold at checkpoint/i })
		.click();
	await page.getByRole("button", { name: /Return to Riverhold/i }).click();
	await page.getByRole("button", { name: /Advance Riverhold/i }).click();
	await page.getByRole("button", { name: /Keep observing/i }).click();
	await expect(
		page.getByRole("heading", { name: /What entered the record/i }),
	).toBeVisible();
	await page.getByRole("button", { name: /Show beat 2/i }).click();
	await page
		.getByRole("button", { name: /Inspect \d+ evidence record/i })
		.click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(
		page.getByRole("region", { name: /Riverhold Story Card/i }),
	).toBeVisible();
	await page.getByRole("button", { name: /Save feedback locally/i }).click();
	await expect(page.getByLabel("Feedback delivery status")).toContainText(
		"browser only",
	);
});

test("manual reduced motion persists, removes root smooth scrolling, and touch targets meet the floor", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.reload();
	const toggle = page.getByRole("button", { name: "Reduce motion" });
	await toggle.click();
	await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
	await expect(page.locator(".app-shell")).toHaveClass(/reduced-motion/);
	await page.reload();
	await expect(
		page.getByRole("button", { name: "Motion reduced" }),
	).toBeVisible();
	await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");

	for (const locator of [
		page.getByRole("link", { name: "EONFOLK Riverhold home" }),
		page.getByRole("button", { name: "Motion reduced" }),
		page.getByRole("button", { name: "Use list view" }),
		page.getByRole("button", { name: /Follow Mara/ }),
	]) {
		const box = await locator.boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
		expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
	}
});
