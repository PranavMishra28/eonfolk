/**
 * In-tab serialization for Reality writers. Live days, return catch-up, and
 * sponsorship share one fence so they cannot race the durable head.
 */

let writerChain: Promise<void> = Promise.resolve();

export function withAuthorityWriter<T>(work: () => Promise<T>): Promise<T> {
	let settle!: (value: T | PromiseLike<T>) => void;
	let fail!: (reason: unknown) => void;
	const result = new Promise<T>((resolve, reject) => {
		settle = resolve;
		fail = reject;
	});
	writerChain = writerChain.then(
		async () => {
			try {
				settle(await work());
			} catch (error) {
				fail(error);
			}
		},
		async () => {
			try {
				settle(await work());
			} catch (error) {
				fail(error);
			}
		},
	);
	return result;
}
