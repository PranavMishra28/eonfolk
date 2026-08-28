import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
	test as base,
	expect,
	type Locator,
	type Page,
	type Request,
} from "@playwright/test";

const allowedOrigin = "http://127.0.0.1:4174";
const routeLogDirectory = resolve(
	import.meta.dirname,
	"../../../tmp/dawnmere-playwright",
);

function workerIndex(): string {
	const workerIndexEnv = process.env.TEST_WORKER_INDEX ?? "";
	return /^(?:0|[1-9]\d*)$/u.test(workerIndexEnv) ? workerIndexEnv : "0";
}

function workerRouteLogPath(): string {
	return resolve(routeLogDirectory, `route-log-w${workerIndex()}.json`);
}

function workerNetlogPath(): string {
	return resolve(routeLogDirectory, `netlog-w${workerIndex()}.json`);
}

type RouteLogEntry = Readonly<{
	action: "allow" | "deny";
	method: string;
	resourceType: string;
	url: string;
}>;

function appendRouteLog(entries: readonly RouteLogEntry[]): void {
	if (entries.length === 0) return;
	const routeLogPath = workerRouteLogPath();
	mkdirSync(dirname(routeLogPath), { recursive: true });
	const previous = existsSync(routeLogPath)
		? (JSON.parse(readFileSync(routeLogPath, "utf8")) as RouteLogEntry[])
		: [];
	if (!Array.isArray(previous)) throw new Error("invalid Dawnmere route log");
	const temporaryPath = `${routeLogPath}.${process.pid}.tmp`;
	writeFileSync(
		temporaryPath,
		`${JSON.stringify([...previous, ...entries])}\n`,
	);
	renameSync(temporaryPath, routeLogPath);
}

export const test = base.extend<{ routeAudit: undefined }>({
	launchOptions: async ({ launchOptions }, use) => {
		const netlogPath = workerNetlogPath();
		mkdirSync(dirname(netlogPath), { recursive: true });
		const args = (launchOptions.args ?? []).filter(
			(argument) => !argument.startsWith("--log-net-log="),
		);
		await use({
			...launchOptions,
			args: [...args, `--log-net-log=${netlogPath}`],
		});
	},
	routeAudit: [
		async ({ context, page }, use) => {
			const entries: RouteLogEntry[] = [];
			const observedPages = new Set<Page>();
			const onRequest = (request: Request) => {
				const url = request.url();
				let action: RouteLogEntry["action"] = "deny";
				try {
					action = new URL(url).origin === allowedOrigin ? "allow" : "deny";
				} catch {
					// An unparsable request is evidence of a denied destination.
				}
				entries.push({
					action,
					method: request.method(),
					resourceType: request.resourceType(),
					url,
				});
			};
			const observePage = (candidate: Page) => {
				if (observedPages.has(candidate)) return;
				observedPages.add(candidate);
				candidate.on("request", onRequest);
			};
			observePage(page);
			context.on("page", observePage);
			try {
				await use(undefined);
			} finally {
				context.off("page", observePage);
				for (const observedPage of observedPages)
					observedPage.off("request", onRequest);
				appendRouteLog(entries);
			}
		},
		{ auto: true },
	],
});

export type { Locator, Page };
export { expect };
