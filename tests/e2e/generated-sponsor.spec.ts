import { expect, type Page, test } from "@playwright/test";
import { stateHash } from "../../packages/protocol/src/index.js";

const WORLD_DATABASE = "eonfolk-generated-authority";
const SPONSOR_DATABASE = "eonfolk-generated-sponsor-authority";

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

async function resetAuthority(page: Page): Promise<void> {
	await page.goto("/outside-canon");
	await page.evaluate(
		(databaseNames) =>
			Promise.all(
				databaseNames.map(
					(databaseName) =>
						new Promise<void>((resolve, reject) => {
							const request = indexedDB.deleteDatabase(databaseName);
							request.addEventListener("success", () => resolve(), {
								once: true,
							});
							request.addEventListener("error", () => reject(request.error), {
								once: true,
							});
						}),
				),
			),
		[WORLD_DATABASE, SPONSOR_DATABASE],
	);
}

async function sponsorRecord(page: Page): Promise<unknown> {
	return page.evaluate(
		({ databaseName }) =>
			new Promise((resolve, reject) => {
				const request = indexedDB.open(databaseName, 1);
				request.addEventListener("error", () => reject(request.error), {
					once: true,
				});
				request.addEventListener(
					"success",
					() => {
						const database = request.result;
						const transaction = database.transaction(
							"generatedSponsorAuthority",
							"readonly",
						);
						const stored = transaction
							.objectStore("generatedSponsorAuthority")
							.getAll();
						transaction.addEventListener(
							"complete",
							() => {
								resolve(stored.result[0]);
								database.close();
							},
							{ once: true },
						);
					},
					{ once: true },
				);
			}),
		{ databaseName: SPONSOR_DATABASE },
	);
}

test("generated sponsor counsel persists one factual Chronicle and returns to the world", async ({
	page,
}) => {
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 1366, height: 768 });
	await resetAuthority(page);
	await page.goto("/world");
	await expect(page.getByRole("heading", { name: "Dawnmere" })).toBeVisible();
	const sponsor = page.locator(".generated-sponsor");
	await expect(
		sponsor.getByRole("heading", {
			name: "Care about one life. Never command it.",
		}),
	).toBeVisible();
	await expect(
		sponsor.getByRole("heading", { name: "Iven Rook" }),
	).toBeVisible();
	await expect(sponsor.getByText("reliability · care")).toBeVisible();
	await expect(sponsor.getByText(/highest measured pressure/u)).toBeVisible();
	await expect(sponsor.getByText("Mara Vale")).toBeVisible();

	await sponsor.getByRole("button", { name: "Sponsor Iven Rook" }).click();
	await expect(
		sponsor.getByRole("heading", { name: "Offer direction, not control." }),
	).toBeVisible();
	await sponsor
		.getByRole("button", { name: "Verify the reserve before reallocating" })
		.click();
	await expect(
		sponsor.getByRole("heading", {
			name: "Iven Rook accepted the direction.",
		}),
	).toBeVisible();
	await expect(
		sponsor.getByText(/Standard Brain · verify reserve · no model/u),
	).toBeVisible();
	await expect(
		sponsor.getByRole("heading", {
			name: "What changed, and why we can say it.",
		}),
	).toBeVisible();
	const chronicle = sponsor.locator(".generated-chronicle");
	await expect(chronicle.getByRole("listitem")).toHaveCount(3);
	await expect(
		chronicle.getByText(/Six hours later, Origin Council recorded/u),
	).toBeVisible();
	await expect(chronicle.getByText("contributing condition")).toBeVisible();
	await expect(chronicle.getByText("direct cause")).toBeVisible();
	const consequence = chronicle.getByRole("button").last();
	await consequence.click();
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-focus-kind",
		"citizen",
	);

	await sponsor
		.getByText("Open the 15-second factual share", { exact: true })
		.click();
	await expect(
		sponsor.getByRole("article", { name: "15-second factual share artifact" }),
	).toBeVisible();
	await expect(
		sponsor.getByText("15 SECONDS · THREE CAUSAL BEATS"),
	).toBeVisible();
	const beforeReload = (await sponsorRecord(page)) as {
		readonly authorityHash: string;
		readonly baseStateHash: string;
		readonly events: readonly ({ readonly postStateHash: string } & Record<
			string,
			unknown
		>)[];
		readonly [key: string]: unknown;
	};
	const { authorityHash: storedHash, ...withoutAuthorityHash } = beforeReload;
	expect(await stateHash(withoutAuthorityHash)).toBe(storedHash);
	for (const storedEvent of beforeReload.events) {
		const { postStateHash, ...withoutStateHash } = storedEvent;
		expect(await stateHash(withoutStateHash)).toBe(postStateHash);
	}
	expect(beforeReload.baseStateHash).toBe(
		await page.locator("main.v1-world").getAttribute("data-state-hash"),
	);
	const authorityHash = await sponsor.getAttribute("data-authority-hash");
	await page.reload();
	await expect(page.locator(".generated-sponsor")).toHaveAttribute(
		"data-authority-revision",
		"2",
	);
	await expect(page.locator(".generated-sponsor")).toHaveAttribute(
		"data-authority-hash",
		authorityHash ?? "",
	);
	await expect(
		page.getByRole("heading", { name: "Iven Rook accepted the direction." }),
	).toBeVisible();
	expect(await sponsorRecord(page)).toEqual(beforeReload);
	expect(externalRequests).toEqual([]);
});

test("mobile keyboard counsel can be refused without turning an allegation into fact", async ({
	page,
}) => {
	const externalRequests = await isolateLocalWorld(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await resetAuthority(page);
	await page.goto("/world");
	const sponsor = page.locator(".generated-sponsor");
	const iven = sponsor.getByRole("button", {
		name: "Iven Rook provisioner",
	});
	await iven.focus();
	await iven.press("Enter");
	const sponsorIven = sponsor.getByRole("button", {
		name: "Sponsor Iven Rook",
	});
	await sponsorIven.focus();
	await sponsorIven.press("Enter");
	const allegation = sponsor.getByRole("button", {
		name: "Raise an allegation publicly now",
	});
	await allegation.focus();
	await allegation.press("Enter");
	await expect(
		sponsor.getByRole("heading", {
			name: "Iven Rook rejected the direction.",
		}),
	).toBeVisible();
	await expect(
		sponsor
			.locator(".generated-chronicle")
			.getByText(/kept its existing allocation commitment/u),
	).toBeVisible();
	await expect(
		sponsor.locator('[data-causal-relation="in-world-allegation"]'),
	).toHaveCount(0);
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth + 1,
			),
		)
		.toBe(true);
	expect(externalRequests).toEqual([]);
});
