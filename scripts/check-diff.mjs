import { spawnSync } from "node:child_process";

function git(arguments_) {
	const result = spawnSync("git", arguments_, { encoding: "utf8" });
	if (result.status !== 0)
		throw new Error(
			(
				result.stderr ||
				result.stdout ||
				`git ${arguments_.join(" ")} failed`
			).trim(),
		);
	return result.stdout.trim();
}

function existingCommit(candidate) {
	if (!candidate || /^0+$/u.test(candidate)) return null;
	const result = spawnSync("git", ["cat-file", "-e", `${candidate}^{commit}`], {
		encoding: "utf8",
	});
	return result.status === 0 ? candidate : null;
}

function fallbackBase(head) {
	for (const candidate of ["origin/main", "main"]) {
		if (existingCommit(candidate) === null) continue;
		const result = spawnSync("git", ["merge-base", candidate, head], {
			encoding: "utf8",
		});
		if (result.status === 0 && result.stdout.trim().length > 0)
			return result.stdout.trim();
	}
	throw new Error("diff check could not resolve a main-branch merge base");
}

const head =
	existingCommit(process.env.EONFOLK_DIFF_HEAD_SHA) ??
	git(["rev-parse", "HEAD"]);
const base =
	existingCommit(process.env.EONFOLK_DIFF_BASE_SHA) ?? fallbackBase(head);

git(["diff", "--check", base, head]);
git(["diff", "--check"]);
process.stdout.write(`diff check ok: ${base}..${head}\n`);
