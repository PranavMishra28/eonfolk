/// <reference lib="webworker" />

import {
	advanceGeneratedWorldLiveDay,
	catchUpGeneratedWorldReturnDays,
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
} from "./generated-world-runtime";

type Request =
	| Readonly<{
			readonly id: number;
			readonly kind: "load" | "refresh" | "advance-day";
	  }>
	| Readonly<{
			readonly id: number;
			readonly kind: "catch-up";
			readonly operationId: string;
			readonly additionalDays: number;
	  }>;

self.addEventListener("message", (message: Event) => {
	const data = (message as MessageEvent<Request>).data;
	const run =
		data.kind === "refresh"
			? refreshGeneratedWorldExperience()
			: data.kind === "advance-day"
				? advanceGeneratedWorldLiveDay()
				: data.kind === "catch-up"
					? catchUpGeneratedWorldReturnDays({
							operationId: data.operationId,
							additionalDays: data.additionalDays,
						})
					: loadGeneratedWorldExperience();
	void run.then(
		(experience) => self.postMessage({ id: data.id, ok: true, experience }),
		() => self.postMessage({ id: data.id, ok: false }),
	);
});
