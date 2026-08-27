/// <reference lib="webworker" />

import {
	advanceGeneratedWorldLiveDay,
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
} from "./generated-world-runtime";

type Request = Readonly<{
	id: number;
	kind: "load" | "refresh" | "advance-day";
}>;

self.addEventListener("message", (message: MessageEvent<Request>) => {
	const run =
		message.data.kind === "refresh"
			? refreshGeneratedWorldExperience()
			: message.data.kind === "advance-day"
				? advanceGeneratedWorldLiveDay()
				: loadGeneratedWorldExperience();
	void run.then(
		(experience) =>
			self.postMessage({ id: message.data.id, ok: true, experience }),
		() => self.postMessage({ id: message.data.id, ok: false }),
	);
});
