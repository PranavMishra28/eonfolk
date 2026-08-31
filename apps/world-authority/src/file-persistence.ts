import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
	type AppendAuthorityBatchRequest,
	type AppendAuthorityBatchResult,
	type AuthorityAppendReceipt,
	type AuthorityEventRangeRequest,
	type AuthorityEventRecord,
	type AuthorityHead,
	type AuthorityScope,
	type AuthoritySnapshotRecord,
	FILE_AUTHORITY_STORES_VERSION,
	type InitializeAuthorityRequest,
	type InitializeAuthorityResult,
	MemoryVersionedPersistence,
	PersistenceError,
	type RecordRejectedAuthorityCommandRequest,
	type SaveAuthoritySnapshotRequest,
	type SerializedAuthorityStores,
	VERSIONED_PERSISTENCE_PORT_VERSION,
	type VersionedPersistencePort,
} from "@eonfolk/persistence";

export class FileVersionedPersistence implements VersionedPersistencePort {
	readonly portVersion = VERSIONED_PERSISTENCE_PORT_VERSION;
	readonly #inner = new MemoryVersionedPersistence();
	readonly #path: string;
	#writeChain: Promise<void> = Promise.resolve();

	private constructor(path: string) {
		this.#path = path;
	}

	static async open(path: string): Promise<FileVersionedPersistence> {
		const port = new FileVersionedPersistence(path);
		try {
			const raw = await readFile(path, "utf8");
			const parsed = JSON.parse(raw) as SerializedAuthorityStores;
			if (parsed.schemaVersion !== FILE_AUTHORITY_STORES_VERSION) {
				throw new PersistenceError(
					"UNSUPPORTED_VERSION",
					"file authority stores are an unknown version",
				);
			}
			port.#inner.importStores(parsed);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		return port;
	}

	async initialize(
		request: InitializeAuthorityRequest,
	): Promise<InitializeAuthorityResult> {
		const result = await this.#inner.initialize(request);
		await this.#flush();
		return result;
	}

	loadHead(scope: AuthorityScope): Promise<AuthorityHead> {
		return this.#inner.loadHead(scope);
	}

	async acquireWriterFence(
		scope: AuthorityScope,
		expectedFencingToken: number,
	): Promise<AuthorityHead> {
		const result = await this.#inner.acquireWriterFence(
			scope,
			expectedFencingToken,
		);
		await this.#flush();
		return result;
	}

	async appendEventBatch(
		request: AppendAuthorityBatchRequest,
	): Promise<AppendAuthorityBatchResult> {
		const result = await this.#inner.appendEventBatch(request);
		await this.#flush();
		return result;
	}

	async recordRejectedCommand(
		request: RecordRejectedAuthorityCommandRequest,
	): Promise<AppendAuthorityBatchResult> {
		const result = await this.#inner.recordRejectedCommand(request);
		await this.#flush();
		return result;
	}

	getAppendReceipt(
		scope: AuthorityScope,
		appendId: string,
	): Promise<AuthorityAppendReceipt | null> {
		return this.#inner.getAppendReceipt(scope, appendId);
	}

	getEventRange(
		request: AuthorityEventRangeRequest,
	): Promise<readonly AuthorityEventRecord[]> {
		return this.#inner.getEventRange(request);
	}

	async saveSnapshot(
		request: SaveAuthoritySnapshotRequest,
	): Promise<AuthoritySnapshotRecord> {
		const result = await this.#inner.saveSnapshot(request);
		await this.#flush();
		return result;
	}

	loadSnapshot(
		scope: AuthorityScope,
		snapshotId: string,
	): Promise<AuthoritySnapshotRecord> {
		return this.#inner.loadSnapshot(scope, snapshotId);
	}

	loadLatestSnapshot(scope: AuthorityScope): Promise<AuthoritySnapshotRecord> {
		return this.#inner.loadLatestSnapshot(scope);
	}

	async #flush(): Promise<void> {
		const payload = `${JSON.stringify(this.#inner.exportStores())}\n`;
		this.#writeChain = this.#writeChain.then(async () => {
			await mkdir(dirname(this.#path), { recursive: true });
			const temporary = `${this.#path}.tmp`;
			await writeFile(temporary, payload, "utf8");
			await rename(temporary, this.#path);
		});
		await this.#writeChain;
	}
}
