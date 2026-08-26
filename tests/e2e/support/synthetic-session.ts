import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page } from "./eonfolk-fixture";

const reportDirectory = resolve(
	import.meta.dirname,
	"../../../tmp/synthetic-evaluation",
);

export const SYNTHETIC_DISCLAIMER =
	"SYNTHETIC automated product journey. Not human research. Detects mechanical and labeling failures only. Does not measure fun, attachment, comprehension, adoption, or retention.";

export async function isolateLocalWorld(page: Page): Promise<string[]> {
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

export async function resetGeneratedCheckpoint(page: Page): Promise<void> {
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

export async function openCanonicalWorld(page: Page) {
	await page.goto("/world", { waitUntil: "domcontentloaded" });
	const world = page.locator("main.v1-world");
	await expect(world).not.toHaveAttribute("data-authority-pending", "true", {
		timeout: 30_000,
	});
	await expect(page.getByTestId("generated-world-canvas")).toHaveAttribute(
		"data-ready",
		"true",
		{ timeout: 30_000 },
	);
	return world;
}

export async function selectCanonicalMara(page: Page): Promise<void> {
	await page.locator(".v1-context-panel").hover();
	const resident = page.locator(
		'ul.v1-presence-roster button[data-citizen-id="citizen-01"]',
	);
	await expect(resident).toContainText("Mara Vale");
	await resident.click();
}

export function writeSyntheticReport(input: {
	readonly persona: string;
	readonly stepsCompleted: readonly string[];
	readonly notes: readonly string[];
}): void {
	mkdirSync(reportDirectory, { recursive: true });
	let commit = "unknown";
	try {
		commit = execFileSync("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
		}).trim();
	} catch {
		commit = "unknown";
	}
	const payload = {
		kind: "synthetic-product-evaluation",
		disclaimer: SYNTHETIC_DISCLAIMER,
		commit,
		persona: input.persona,
		startedAt: new Date().toISOString(),
		stepsCompleted: input.stepsCompleted,
		notes: input.notes,
		humanSentimentClaims: "none",
	};
	writeFileSync(
		resolve(reportDirectory, `${input.persona}.json`),
		`${JSON.stringify(payload, null, 2)}\n`,
	);
}
