import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const previewOrigin = "http://127.0.0.1:4173";
const routeLogPath = "tmp/gate-0-playwright/route-log.json";
const routeLog: Array<{
	action: "allow" | "abort";
	resourceType: string;
	url: string;
}> = [];
const sha256 = (bytes: Buffer) =>
	createHash("sha256").update(bytes).digest("hex");

test.beforeEach(async ({ context, page }) => {
	await context.route("**/*", async (route) => {
		const request = route.request();
		const entry = {
			action: request.url().startsWith(`${previewOrigin}/`)
				? ("allow" as const)
				: ("abort" as const),
			resourceType: request.resourceType(),
			url: request.url(),
		};
		routeLog.push(entry);
		if (entry.action === "allow") await route.continue();
		else await route.abort("blockedbyclient");
	});
	await page.addInitScript(() => localStorage.clear());
});

test.afterAll(() => {
	mkdirSync("tmp/gate-0-playwright", { recursive: true });
	writeFileSync(routeLogPath, `${JSON.stringify(routeLog)}\n`);
});

function captureRuntimeErrors(page: import("@playwright/test").Page) {
	const errors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(`console:${message.text()}`);
	});
	page.on("pageerror", (error) => errors.push(`page:${error.message}`));
	return errors;
}

const viewports = [
	{ name: "desktop-1728x1117", width: 1728, height: 1117 },
	{ name: "laptop-1366x768", width: 1366, height: 768 },
	{ name: "mobile-390x844", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
	test(`observer projection is useful and operable at ${viewport.name}`, async ({
		page,
	}) => {
		const errors = captureRuntimeErrors(page);
		await page.setViewportSize(viewport);
		await page.goto(`/observer/V01?capture=1`);
		await expect(page.locator(".gate0-visual__canvas")).toHaveAttribute(
			"data-ready",
			"true",
		);
		await expect(page.getByText("Riverhold", { exact: true })).toBeVisible();
		const follow = page.getByRole("button", { name: "Follow Mara" });
		const people = page.getByRole("button", { name: "People" });
		await expect(follow).toBeEnabled();
		await expect(people).toBeEnabled();
		await expect(
			page.getByRole("list", {
				name: "Riverhold citizens and current activities",
			}),
		).toBeAttached();
		await expect(page.locator(".gate0-visual__semantic-world")).toHaveCSS(
			"width",
			"1px",
		);
		await follow.focus();
		await expect(follow).toBeFocused();
		for (const target of [follow, people]) {
			const box = await target.boundingBox();
			expect(box?.width).toBeGreaterThanOrEqual(44);
			expect(box?.height).toBeGreaterThanOrEqual(44);
		}
		await expect(page.locator("canvas")).toHaveCount(1);
		const imagePath = `docs/exec-plans/evidence/001/studies/gate-0/viewports/${viewport.name}.png`;
		const first = await page.screenshot({ animations: "disabled" });
		const second = await page.screenshot({ animations: "disabled" });
		expect(sha256(second)).toBe(sha256(first));
		if (process.env.UPDATE_GATE0_SCREENSHOTS === "1")
			writeFileSync(imagePath, first);
		else expect(sha256(first)).toBe(sha256(readFileSync(imagePath)));
		expect(errors).toEqual([]);
	});
}

test("semantic fallback, reduced motion, keyboard, reflow, and capture isolation", async ({
	page,
}) => {
	const errors = captureRuntimeErrors(page);
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.setViewportSize({ width: 683, height: 768 });
	await page.goto("/observer/V01?capture=1");
	await expect(page.locator(".gate0-visual__canvas")).toHaveAttribute(
		"data-ready",
		"true",
	);
	await expect
		.poll(() =>
			page.evaluate(
				() => matchMedia("(prefers-reduced-motion: reduce)").matches,
			),
		)
		.toBe(true);
	await page.getByRole("button", { name: "People" }).press("Enter");
	await expect(page.locator(".gate0-visual")).toHaveAttribute(
		"data-quality",
		"semantic-markers",
	);
	await expect(page.locator("canvas")).toBeHidden();
	await expect(
		page.getByRole("list", {
			name: "Riverhold citizens and current activities",
		}),
	).toBeVisible();
	await expect(page.getByRole("listitem")).toHaveCount(8);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
		)
		.toBe(true);
	const motion = await page.locator(".gate0-visual").evaluate((root) =>
		Array.from(root.querySelectorAll("*")).flatMap((node) => {
			const style = getComputedStyle(node);
			return [style.animationDuration, style.transitionDuration];
		}),
	);
	expect(motion.every((value) => value === "0s")).toBe(true);
	expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
	expect(errors).toEqual([]);
});

test("product treatment starts only on a verified, enabled hidden variant", async ({
	page,
}) => {
	const errors = captureRuntimeErrors(page);
	await page.goto("/product/P01");
	expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
	await page.getByRole("button", { name: "I agree" }).click();
	await expect(
		page.getByRole("heading", { name: "Follow Mara" }),
	).toBeVisible();
	await expect(page.getByText("EONFOLK")).toHaveCount(0);
	await expect(page.locator("[data-gate0-instrument]")).toHaveAttribute(
		"data-variant",
		"H",
	);
	await expect(page.locator("[data-gate0-instrument]")).toHaveAttribute(
		"data-assignment",
		"P01",
	);
	const advice = page.getByLabel("Ask Mara to verify the count privately");
	await expect(advice).toBeEnabled();
	await advice.check();
	await expect(
		page.getByRole("button", { name: "Confirm advice" }),
	).toBeEnabled();
	expect(errors).toEqual([]);
});

test("affirmative consent is the first durable write and withdrawal is terminal", async ({
	page,
}) => {
	await page.goto("/product/P02");
	await page.getByRole("button", { name: "I do not agree" }).click();
	expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
	await page.goto("/observer/V02");
	await page.getByRole("button", { name: "I agree" }).click();
	await expect(page.getByRole("button", { name: "Follow Mara" })).toBeEnabled();
	await page.getByRole("button", { name: "Stop participation" }).click();
	await expect(
		page.getByRole("heading", { name: "Study ended" }),
	).toBeVisible();
	const record = await page.evaluate(() =>
		JSON.parse(localStorage.getItem("gate0-human-record:V02") ?? "null"),
	);
	expect(record.affirmativeAgreement).toBe(true);
	expect(record.abandoned).toBe(true);
});
