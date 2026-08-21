import { chromium } from "@playwright/test";

const target = new URL(process.argv[2] ?? "http://127.0.0.1:5173");
if (!new Set(["127.0.0.1", "localhost", "[::1]"]).has(target.hostname)) {
	throw new Error("pnpm diagnose is restricted to a loopback observer");
}

const browser = await chromium.launch({ headless: true });
try {
	const page = await browser.newPage();
	await page.route("**/*", async (route) => {
		const requestUrl = new URL(route.request().url());
		if (requestUrl.origin === target.origin) await route.continue();
		else await route.abort("blockedbyclient");
	});
	await page.goto(target.href, { waitUntil: "domcontentloaded" });
	await page.getByTestId("riverhold-canvas").waitFor({ state: "visible" });
	const projection = await page.evaluate(() => {
		if (typeof window.__EONFOLK_OBSERVER__ !== "function") {
			throw new Error(
				"Local observer is unavailable; start the app with pnpm dev:observe",
			);
		}
		return window.__EONFOLK_OBSERVER__();
	});
	process.stdout.write(`${JSON.stringify(projection, null, 2)}\n`);
} finally {
	await browser.close();
}
