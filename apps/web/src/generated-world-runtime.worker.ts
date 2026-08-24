/// <reference lib="webworker" />

import {
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
} from "./generated-world-runtime";

type Request = Readonly<{ id: number; kind: "load" | "refresh" }>;

self.addEventListener("message", (message: MessageEvent<Request>) => {
	const run =
		message.data.kind === "refresh"
			? refreshGeneratedWorldExperience()
			: loadGeneratedWorldExperience();
	void run.then(
		(experience) =>
			self.postMessage({ id: message.data.id, ok: true, experience }),
		(error: unknown) =>
			self.postMessage({
				id: message.data.id,
				ok: false,
				error: {
					name: error instanceof Error ? error.name : "Error",
					message:
						error instanceof Error ? error.message : "WORLD_WORKER_FAILED",
					...(typeof error === "object" &&
					error !== null &&
					"code" in error &&
					typeof error.code === "string"
						? { code: error.code }
						: {}),
				},
			}),
	);
});
