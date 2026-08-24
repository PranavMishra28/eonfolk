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
		() => self.postMessage({ id: message.data.id, ok: false }),
	);
});
