import { expect, type Page, test } from "@playwright/test";

const FAULT_KEY = "eonfolk:e2e-generated-world-fault-v1";
const FAULT_APPLIED_KEY = `${FAULT_KEY}:applied`;

type FaultKind =
	| "model-provider"
	| "persistence"
	| "checkpoint"
	| "renderer-webgl"
	| "asset"
	| "navigation"
	| "authoritative-invariant"
	| "latency";

async function injectFault(page: Page, kind: FaultKind): Promise<void> {
	await page.addInitScript(
		({ appliedKey, key, value }) => {
			if (sessionStorage.getItem(appliedKey) !== null) return;
			sessionStorage.setItem(key, value);
			sessionStorage.setItem(appliedKey, "true");
		},
		{ appliedKey: FAULT_APPLIED_KEY, key: FAULT_KEY, value: kind },
	);
}

async function isolateGeneratedWorld(page: Page): Promise<string[]> {
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

async function openFaultedWorld(
	page: Page,
	kind: FaultKind,
): Promise<string[]> {
	const externalRequests = await isolateGeneratedWorld(page);
	await injectFault(page, kind);
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	return externalRequests;
}

async function expectRecoverableWorld(
	page: Page,
	kind: FaultKind,
): Promise<string> {
	const world = page.locator("main.v1-world");
	await expect(world).toHaveAttribute("data-fault-kind", kind, {
		timeout: 30_000,
	});
	await expect(world).toHaveAttribute("data-state-hash", /^[0-9a-f]{64}$/u);
	await expect(page.getByTestId("generated-world-fault-status")).toBeVisible();
	return (await world.getAttribute("data-state-hash")) ?? "";
}

test.describe
	.serial("generated Release Genesis fault matrix @fault", () => {
		test.setTimeout(90_000);

		test("model/provider loss preserves the deterministic Standard Brain world", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "model-provider");
			await expectRecoverableWorld(page, "model-provider");
			await expect(
				page.getByTestId("generated-world-fault-status"),
			).toContainText("deterministic Standard Brain remains authoritative");
			expect(externalRequests).toEqual([]);
		});

		test("persistence loss uses the explicit non-persistent deterministic adapter", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "persistence");
			const stateHash = await expectRecoverableWorld(page, "persistence");
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-persistence",
				"unavailable",
			);
			await page.evaluate((key) => sessionStorage.removeItem(key), FAULT_KEY);
			await page.reload({ waitUntil: "domcontentloaded" });
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				stateHash,
				{ timeout: 30_000 },
			);
			expect(externalRequests).toEqual([]);
		});

		for (const kind of ["checkpoint", "authoritative-invariant"] as const) {
			test(`${kind} failure hides all world facts and recovers only after retry`, async ({
				page,
			}) => {
				const externalRequests = await openFaultedWorld(page, kind);
				const error = page.locator("main.v1-genesis-shell");
				await expect(error).toHaveAttribute("data-fault-kind", kind, {
					timeout: 30_000,
				});
				await expect(error).toHaveAttribute(
					"data-fault-disposition",
					"fail-closed",
				);
				await expect(page.locator("main.v1-world")).toHaveCount(0);
				await expect(
					page.getByRole("heading", {
						name: "No incomplete world is being shown as fact.",
					}),
				).toBeVisible();
				await page
					.getByRole("button", { name: "Retry without the failed local input" })
					.click();
				await expect(page.locator("main.v1-world")).toHaveAttribute(
					"data-state-hash",
					/^[0-9a-f]{64}$/u,
					{ timeout: 30_000 },
				);
				expect(externalRequests).toEqual([]);
			});
		}

		test("renderer/WebGL loss switches to the semantic world without changing authority", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "renderer-webgl");
			const hash = await expectRecoverableWorld(page, "renderer-webgl");
			await expect(page.getByTestId("generated-semantic-world")).toBeVisible();
			await expect(page.getByTestId("generated-world-canvas")).toHaveCount(0);
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				hash,
			);
			expect(externalRequests).toEqual([]);
		});

		test("asset rejection keeps the semantic world usable", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "asset");
			await expectRecoverableWorld(page, "asset");
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-asset-integrity",
				"failed",
			);
			await expect(page.getByTestId("generated-semantic-world")).toBeVisible();
			await page.getByRole("button", { name: "Zoom in" }).click();
			await expect(page.getByTestId("generated-camera-status")).toHaveAttribute(
				"data-semantic-scale",
				/(region|town|citizen)/u,
			);
			expect(externalRequests).toEqual([]);
		});

		test("malformed navigation is rejected without authority or view mutation", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "navigation");
			const hash = await expectRecoverableWorld(page, "navigation");
			const canvas = page.getByTestId("generated-world-canvas");
			await expect(canvas).toHaveAttribute("data-ready", "true", {
				timeout: 20_000,
			});
			await expect(canvas).toHaveAttribute("data-focus-kind", "overview");
			await page.evaluate(() => {
				window.dispatchEvent(
					new CustomEvent("eonfolk:generated-navigation", {
						detail: { type: "zoom", deltaMm: Number.POSITIVE_INFINITY },
					}),
				);
			});
			await expect(canvas).toHaveAttribute("data-focus-kind", "overview");
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				hash,
			);
			expect(externalRequests).toEqual([]);
		});

		test("latency shows no world facts until canonical generation completes", async ({
			page,
		}) => {
			const externalRequests = await openFaultedWorld(page, "latency");
			await expect(
				page.getByRole("heading", {
					name: "Advancing one world through its first year.",
				}),
			).toBeVisible();
			await expect(page.locator("main.v1-world")).toHaveCount(0);
			await expect(page.locator("main.v1-world")).toHaveAttribute(
				"data-state-hash",
				/^[0-9a-f]{64}$/u,
				{ timeout: 30_000 },
			);
			expect(externalRequests).toEqual([]);
		});
	});
