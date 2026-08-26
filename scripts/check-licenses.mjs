import { execFileSync } from "node:child_process";

const allowed = new Set([
	"Apache-2.0",
	"BSD-2-Clause",
	"BSD-3-Clause",
	"ISC",
	"MIT",
	"MIT OR Apache-2.0",
	"MPL-2.0",
	"Python-2.0",
]);
const readReport = (arguments_) =>
	JSON.parse(
		execFileSync("pnpm", ["licenses", "list", ...arguments_, "--json"], {
			encoding: "utf8",
		}),
	);
const report = readReport([]);
const productionReport = readReport(["--prod"]);
const rejected = Object.keys(report).filter((license) => !allowed.has(license));

if (rejected.length > 0) {
	throw new Error(
		`production dependency licenses require review: ${rejected.join(", ")}`,
	);
}

const packages = Object.values(report)
	.flat()
	.flatMap((entry) =>
		entry.versions.map((version) => `${entry.name}@${version}`),
	)
	.sort();
const productionPackages = Object.values(productionReport)
	.flat()
	.flatMap((entry) =>
		entry.versions.map((version) => `${entry.name}@${version}`),
	)
	.sort();

if (packages.length === 0)
	throw new Error("production dependency license report was empty");

process.stdout.write(
	`dependency licenses accepted: ${packages.length} complete / ${productionPackages.length} production packages; ${[
		...Object.keys(report),
	]
		.sort()
		.join(", ")}\n`,
);
