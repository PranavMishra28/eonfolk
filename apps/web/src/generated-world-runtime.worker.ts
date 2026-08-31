/// <reference lib="webworker" />

import type { LocalWorldAuthorityFenceChoice } from "./generated-world-runtime";
import {
	advanceGeneratedWorldLiveDay,
	applyLocalWorldAuthorityFenceChoice,
	catchUpGeneratedWorldReturnDays,
	loadGeneratedWorldExperience,
	refreshGeneratedWorldExperience,
	rememberLocalWorldAuthorityFenceChoice,
	rememberSkipLocalAuthorityProbe,
} from "./generated-world-runtime";

type Request =
	| Readonly<{
			readonly id: number;
			readonly kind: "load" | "refresh" | "advance-day";
			readonly fenceChoice?: LocalWorldAuthorityFenceChoice;
			readonly skipAuthorityProbe?: true;
	  }>
	| Readonly<{
			readonly id: number;
			readonly kind: "catch-up";
			readonly operationId: string;
			readonly additionalDays: number;
			readonly fenceChoice?: LocalWorldAuthorityFenceChoice;
			readonly skipAuthorityProbe?: true;
	  }>
	| Readonly<{
			readonly id: number;
			readonly kind: "choose-fence";
			readonly choice: LocalWorldAuthorityFenceChoice;
			readonly skipAuthorityProbe?: true;
	  }>;

self.addEventListener("message", (message: Event) => {
	const data = (message as MessageEvent<Request>).data;
	if (data.skipAuthorityProbe === true) rememberSkipLocalAuthorityProbe();
	if (data.kind !== "choose-fence" && data.fenceChoice !== undefined)
		rememberLocalWorldAuthorityFenceChoice(data.fenceChoice);
	const run =
		data.kind === "choose-fence"
			? applyLocalWorldAuthorityFenceChoice(data.choice)
			: data.kind === "refresh"
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
