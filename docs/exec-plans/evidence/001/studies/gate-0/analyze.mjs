import { readFile } from "node:fs/promises";
import { analyzeGate0Evidence } from "../../../../../../tests/prototypes/gate-0/study/analyze.ts";

export async function analyze(path, studyCommit, manifestHash) {
	const snapshot = JSON.parse(
		await readFile(new URL("./snapshot.jcs.json", import.meta.url), "utf8"),
	);
	return analyzeGate0Evidence(
		await readFile(path),
		{ studyCommit, manifestHash },
		snapshot.answerKey,
	);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
	const [, , path, studyCommit, manifestHash] = process.argv;
	if (!path || !studyCommit || !manifestHash)
		throw new Error("usage: analyze.mjs SOURCE STUDY_COMMIT MANIFEST_HASH");
	process.stdout.write(
		`${JSON.stringify(await analyze(path, studyCommit, manifestHash))}\n`,
	);
}
