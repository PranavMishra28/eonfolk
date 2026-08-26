import { execFileSync, spawnSync } from "node:child_process";
import {
	chmodSync,
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { contentSha256, sha256Bytes } from "./evidence-integrity.mjs";

const source = realpathSync(process.cwd());
const outputArgument = process.argv[2];
if (outputArgument === undefined || !isAbsolute(outputArgument))
	throw new Error(
		"usage: node scripts/export-public-release.mjs /absolute/new/path",
	);

const output = resolve(outputArgument);
if (existsSync(output))
	throw new Error("public export target must not already exist");
if (
	output === source ||
	output.startsWith(`${source}${sep}`) ||
	source.startsWith(`${output}${sep}`)
)
	throw new Error("public export target must be outside the source repository");

for (const arguments_ of [
	["diff", "--quiet"],
	["diff", "--cached", "--quiet"],
]) {
	const result = spawnSync("git", arguments_, { cwd: source });
	if (result.status !== 0)
		throw new Error("public export requires a clean tracked source tree");
}

const publicRootFiles = new Set([
	".env.example",
	".gitignore",
	".markdownlint-cli2.jsonc",
	".npmrc",
	".nvmrc",
	"CHANGELOG.md",
	"CODE_OF_CONDUCT.md",
	"CONTRIBUTING.md",
	"LICENSE",
	"NOTICE",
	"README.md",
	"ROADMAP.md",
	"SECURITY.md",
	"SUPPORT.md",
	"THIRD_PARTY_NOTICES.md",
	"biome.json",
	"pnpm-lock.yaml",
	"pnpm-workspace.yaml",
	"references.bib",
	"tsconfig.base.json",
]);
const publicDocs = new Set([
	"docs/ACCESSIBILITY.md",
	"docs/ARCHITECTURE.md",
	"docs/DEVELOPMENT.md",
	"docs/GAMEPLAY.md",
	"docs/PERFORMANCE.md",
	"docs/TESTING.md",
]);
const publicScripts = new Set([
	"scripts/benchmark-diagnostics-browser.mjs",
	"scripts/benchmark-diagnostics.mjs",
	"scripts/benchmark-persistence.mjs",
	"scripts/benchmark-presentation-stress.mjs",
	"scripts/benchmark-web.mjs",
	"scripts/check-bibliography.mjs",
	"scripts/check-boundaries.mjs",
	"scripts/check-diff.mjs",
	"scripts/check-doc-links.mjs",
	"scripts/check-formal.mjs",
	"scripts/check-licenses.mjs",
	"scripts/check-runtime.mjs",
	"scripts/check-targeted-mutations.mjs",
	"scripts/diagnose.mjs",
	"scripts/evidence-integrity.mjs",
	"scripts/formal-toolchain.mjs",
	"scripts/measure-bundle.mjs",
	"scripts/ollama-bounded-adapter.mjs",
	"scripts/typecheck.mjs",
	"scripts/validate-browser-cohort.mjs",
	"scripts/validate-browser-cohort.rb",
	"scripts/validate-generated-assets.mjs",
	"scripts/validate-web-network.mjs",
]);
const excludedTests = new Set([
	"tests/unit/scripts/ci-evidence.test.ts",
	"tests/unit/scripts/evidence-scripts.test.ts",
	"tests/unit/tooling/v1-github-evidence.test.ts",
	"tests/unit/tooling/v1-readiness.test.ts",
	"tests/unit/tooling/verification-tier.test.ts",
]);
const privateRootFiles = new Set([
	".github/actionlint.yaml",
	".github/workflows/ci.yml",
	".gitleaks.toml",
	"AGENTS.md",
	"docs/INDEX.md",
	"docs/PUBLICATION.md",
	"docs/RESEARCH.md",
	"package.json",
	"packages/persistence/README.md",
]);
const privatePrefixes = [
	"config/public/",
	"docs/agentic/",
	"docs/decisions/",
	"docs/design/",
	"docs/engineering/",
	"docs/exec-plans/",
	"docs/game/",
	"docs/generated/",
	"docs/product/",
	"docs/quality/",
	"docs/research/",
	"docs/reviews/",
];
const privateScripts = new Set([
	"scripts/check-gitleaks-neighbor.mjs",
	"scripts/check-v1-readiness.mjs",
	"scripts/export-public-release.mjs",
	"scripts/freeze-dependency-cohort.mjs",
	"scripts/generate-repo-inventory.mjs",
	"scripts/record-physical-device-evidence.mjs",
	"scripts/run-verification-tier.mjs",
	"scripts/v1-github-evidence.mjs",
	"scripts/validate-dependency-cohort.mjs",
]);

function included(path) {
	if (
		publicRootFiles.has(path) ||
		publicDocs.has(path) ||
		publicScripts.has(path)
	)
		return true;
	if (
		path.startsWith(".github/ISSUE_TEMPLATE/") ||
		path === ".github/dependabot.yml" ||
		path === ".github/pull_request_template.md" ||
		path.startsWith("apps/web/") ||
		path.startsWith("packages/") ||
		path.startsWith("formal/") ||
		path.startsWith("docs/media/") ||
		(path.startsWith("tests/") && !excludedTests.has(path))
	)
		return path !== "packages/persistence/README.md";
	return false;
}

function intentionallyPrivate(path) {
	return (
		privateRootFiles.has(path) ||
		privateScripts.has(path) ||
		excludedTests.has(path) ||
		privatePrefixes.some((prefix) => path.startsWith(prefix))
	);
}

const tracked = execFileSync("git", ["ls-files", "-z"], {
	cwd: source,
})
	.toString("utf8")
	.split("\0")
	.filter(Boolean);
const unclassified = tracked.filter(
	(path) => !included(path) && !intentionallyPrivate(path),
);
if (unclassified.length > 0)
	throw new Error(`unclassified tracked paths:\n${unclassified.join("\n")}`);
const selected = tracked.filter(included).sort();

for (const path of selected) {
	const from = resolve(source, path);
	if (lstatSync(from).isSymbolicLink())
		throw new Error(`public export rejects symbolic link: ${path}`);
	const to = resolve(output, path);
	mkdirSync(dirname(to), { recursive: true });
	copyFileSync(from, to);
	const mode = statSync(from).mode & 0o777;
	if ((mode & 0o111) !== 0) chmodSync(to, 0o755);
}

const mapped = [
	["config/public/package.json", "package.json"],
	["config/public/ci.yml", ".github/workflows/ci.yml"],
	["config/public/gitleaks.toml", ".gitleaks.toml"],
	["config/public/INDEX.md", "docs/INDEX.md"],
	["config/public/PUBLICATION.md", "docs/PUBLICATION.md"],
	["config/public/RESEARCH.md", "docs/RESEARCH.md"],
];
for (const [fromPath, toPath] of mapped) {
	const to = resolve(output, toPath);
	mkdirSync(dirname(to), { recursive: true });
	copyFileSync(resolve(source, fromPath), to);
}

const forbiddenText = [
	"/Users/pranav",
	".codex/attachments",
	"Mega PR",
	"GOAL.md",
	"RESUME.md",
	"pasted-text",
	"subagent",
];
for (const path of [...selected, ...mapped.map(([, value]) => value)]) {
	if (/\.(?:glb|png|gif|webp|mp4)$/u.test(path)) continue;
	const contents = readFileSync(resolve(output, path), "utf8");
	for (const marker of forbiddenText) {
		if (contents.includes(marker))
			throw new Error(
				`public export rejects internal marker ${marker}: ${path}`,
			);
	}
}

const files = [...selected, ...mapped.map(([, path]) => path)]
	.sort()
	.map((path) => ({
		path,
		sha256: sha256Bytes(readFileSync(resolve(output, path))),
	}));
const manifest = {
	schemaVersion: "eonfolk-public-export-v1",
	sourceTree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
		cwd: source,
		encoding: "utf8",
	}).trim(),
	files,
};
writeFileSync(
	resolve(output, "PUBLICATION_MANIFEST.json"),
	`${JSON.stringify({ ...manifest, manifestSha256: contentSha256(manifest) }, null, 2)}\n`,
);

process.stdout.write(
	`public export created: ${relative(dirname(output), output)}; ${files.length} files\n`,
);
