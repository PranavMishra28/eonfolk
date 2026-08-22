import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	DatabaseSync,
	type SQLInputValue,
	type StatementSync,
} from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type D1Database,
	D1FeedbackRepository,
	type D1PreparedStatement,
} from "../../../apps/feedback-worker/src/index.js";

class SqliteD1Statement implements D1PreparedStatement {
	readonly #statement: StatementSync;
	#values: readonly unknown[] = [];

	constructor(statement: StatementSync) {
		this.#statement = statement;
	}

	bind(...values: readonly unknown[]): D1PreparedStatement {
		this.#values = values;
		return this;
	}

	async first<T>(): Promise<T | null> {
		const row = this.#statement.get(...(this.#values as SQLInputValue[]));
		return row === undefined ? null : (row as T);
	}
}

class SqliteD1Database implements D1Database {
	readonly #database: DatabaseSync;

	constructor(database: DatabaseSync) {
		this.#database = database;
	}

	prepare(query: string): D1PreparedStatement {
		return new SqliteD1Statement(this.#database.prepare(query));
	}
}

function id(value: number): string {
	return `sub_${value.toString(16).padStart(32, "0")}`;
}

function hash(value: number): string {
	return value.toString(16).padStart(64, "0");
}

function reservation(value: number, fingerprint = hash(1), nowMs = 0) {
	return {
		submissionId: id(value),
		fingerprint,
		payloadDigest: hash(value + 10_000),
		payloadJson: JSON.stringify({ id: value }),
		sourceHourKey: hash(900),
		sourceDayKey: hash(901),
		nowMs,
	};
}

describe("D1 feedback repository", () => {
	let database: DatabaseSync;
	let repository: D1FeedbackRepository;

	beforeEach(() => {
		database = new DatabaseSync(":memory:");
		database.exec(
			readFileSync(
				resolve(
					process.cwd(),
					"apps/feedback-worker/migrations/0001_feedback_relay.sql",
				),
				"utf8",
			),
		);
		repository = new D1FeedbackRepository(new SqliteD1Database(database));
	});

	afterEach(() => database.close());

	it("atomically reserves one unique submission and treats concurrent repeats as duplicates", async () => {
		const input = reservation(1);
		const results = await Promise.all([
			repository.reserve(input),
			repository.reserve(input),
			repository.reserve(input),
		]);
		expect(results.map((result) => result.kind).sort()).toEqual([
			"duplicate",
			"duplicate",
			"reserved",
		]);
		const quota = database
			.prepare(
				"SELECT accepted_count FROM feedback_quota WHERE scope = 'global-day' AND bucket_number = 0",
			)
			.get() as { accepted_count: number };
		expect(quota.accepted_count).toBe(1);

		const conflict = await repository.reserve({
			...input,
			payloadDigest: hash(99),
		});
		expect(conflict.kind).toBe("conflict");
	});

	it("enforces fingerprint, daily-global, and true rolling-30-day quotas atomically", async () => {
		for (let value = 1; value <= 20; value += 1) {
			const result = await repository.reserve({
				...reservation(value),
				sourceHourKey: hash(1_000 + value),
				sourceDayKey: hash(2_000 + value),
			});
			expect(result.kind).toBe("reserved");
		}
		expect(
			await repository.reserve({
				...reservation(21),
				sourceHourKey: hash(1_021),
				sourceDayKey: hash(2_021),
			}),
		).toEqual({ kind: "quota", scope: "fingerprint-day" });

		database.exec(
			"UPDATE feedback_quota SET accepted_count = 100 WHERE scope = 'global-day' AND bucket_number = 0",
		);
		const daily = await repository.reserve(reservation(22, hash(22)));
		expect(daily).toEqual({ kind: "quota", scope: "global-day" });

		database.exec("DELETE FROM feedback_quota");
		for (let day = 0; day < 10; day += 1) {
			database
				.prepare(
					"INSERT INTO feedback_quota (scope, bucket_key, bucket_number, accepted_count, updated_at_ms) VALUES ('global-day', 'all', ?, 100, 0)",
				)
				.run(day);
		}
		const rolling = await repository.reserve(
			reservation(23, hash(23), 9 * 86_400_000),
		);
		expect(rolling).toEqual({ kind: "quota", scope: "global-rolling" });

		const rolledOver = await repository.reserve(
			reservation(24, hash(24), 40 * 86_400_000),
		);
		expect(rolledOver.kind).toBe("reserved");
	});

	it("serializes all fingerprints, enforces a one-second mutation gap, and permits lease expiry", async () => {
		const first = await repository.reserve(reservation(1, hash(1), 10_000));
		const second = await repository.reserve(reservation(2, hash(2), 10_000));
		expect(first.kind).toBe("reserved");
		expect(second.kind).toBe("reserved");

		expect(
			await repository.acquireLease({
				fingerprint: hash(1),
				leaseToken: "lease-one",
				nowMs: 10_000,
				leaseUntilMs: 40_000,
			}),
		).toMatchObject({ kind: "acquired" });
		expect(
			await repository.acquireLease({
				fingerprint: hash(2),
				leaseToken: "lease-two",
				nowMs: 10_000,
				leaseUntilMs: 40_000,
			}),
		).toEqual({ kind: "busy", retryAfterSeconds: 1 });

		await repository.markRetryable({
			submissionId: id(1),
			leaseToken: "lease-one",
			nowMs: 10_000,
		});
		expect(
			await repository.acquireLease({
				fingerprint: hash(2),
				leaseToken: "lease-two",
				nowMs: 10_999,
				leaseUntilMs: 40_999,
			}),
		).toEqual({ kind: "busy", retryAfterSeconds: 1 });
		expect(
			await repository.acquireLease({
				fingerprint: hash(2),
				leaseToken: "lease-two",
				nowMs: 11_000,
				leaseUntilMs: 41_000,
			}),
		).toMatchObject({ kind: "acquired" });

		expect(
			await repository.acquireLease({
				fingerprint: hash(1),
				leaseToken: "lease-three",
				nowMs: 41_001,
				leaseUntilMs: 71_001,
			}),
		).toMatchObject({ kind: "acquired" });
	});

	it("atomically reacquires both an expired incident lease and the singleton lease", async () => {
		await repository.reserve(reservation(1, hash(1), 1_000));
		await repository.acquireLease({
			fingerprint: hash(1),
			leaseToken: "lease-one",
			nowMs: 1_000,
			leaseUntilMs: 2_000,
		});
		expect(
			await repository.acquireLease({
				fingerprint: hash(1),
				leaseToken: "lease-two",
				nowMs: 2_001,
				leaseUntilMs: 32_001,
			}),
		).toMatchObject({ kind: "acquired" });
		expect(
			database
				.prepare(
					"SELECT lease_token FROM feedback_delivery_lock WHERE singleton = 1",
				)
				.get(),
		).toEqual({ lease_token: "lease-two" });
		await expect(
			repository.markDelivered({
				submissionId: id(1),
				leaseToken: "lease-one",
				issueNumber: 4,
				commentId: null,
				nowMs: 2_002,
			}),
		).rejects.toThrow(/stale/u);
		expect(
			await repository.markDelivered({
				submissionId: id(1),
				leaseToken: "lease-two",
				issueNumber: 5,
				commentId: null,
				nowMs: 2_003,
			}),
		).toMatchObject({ state: "delivered", issueNumber: 5 });

		await repository.reserve(reservation(2, hash(2), 6_000));
		await repository.acquireLease({
			fingerprint: hash(2),
			leaseToken: "lease-three",
			nowMs: 6_000,
			leaseUntilMs: 7_000,
		});
		expect(
			await repository.acquireLease({
				fingerprint: hash(2),
				leaseToken: "lease-four",
				nowMs: 7_001,
				leaseUntilMs: 37_001,
			}),
		).toMatchObject({ kind: "acquired" });
		await repository.markRetryable({
			submissionId: id(2),
			leaseToken: "lease-four",
			nowMs: 7_002,
		});
		expect(
			database
				.prepare(
					"SELECT state, lease_token FROM feedback_incidents WHERE fingerprint = ?",
				)
				.get(hash(2)),
		).toEqual({ state: "retryable", lease_token: null });
	});

	it("enforces privacy-keyed hourly and daily quotas without partial rows", async () => {
		for (let value = 1; value <= 5; value += 1) {
			const result = await repository.reserve({
				...reservation(value, hash(value)),
				sourceHourKey: hash(700),
				sourceDayKey: hash(701),
			});
			expect(result.kind).toBe("reserved");
		}
		expect(
			await repository.reserve({
				...reservation(6, hash(6)),
				sourceHourKey: hash(700),
				sourceDayKey: hash(701),
			}),
		).toEqual({ kind: "quota", scope: "source-hour" });
		expect(
			database
				.prepare("SELECT COUNT(*) AS count FROM feedback_submissions")
				.get(),
		).toEqual({ count: 5 });

		for (let value = 6; value <= 10; value += 1) {
			const result = await repository.reserve({
				...reservation(value, hash(value), (value - 5) * 3_600_000),
				sourceHourKey: hash(702 + value),
				sourceDayKey: hash(701),
			});
			expect(result.kind).toBe("reserved");
		}
		expect(
			await repository.reserve({
				...reservation(11, hash(11), 6 * 3_600_000),
				sourceHourKey: hash(713),
				sourceDayKey: hash(701),
			}),
		).toEqual({ kind: "quota", scope: "source-day" });
	});

	it("bounds staged prose and thirty-day metadata without purging live leases", async () => {
		const day = 86_400_000;
		await repository.reserve(reservation(1, hash(1), 0));
		await repository.reserve(reservation(2, hash(2), 0));
		await repository.acquireLease({
			fingerprint: hash(2),
			leaseToken: "live-lease",
			nowMs: 40 * day,
			leaseUntilMs: 40 * day + 30_000,
		});
		await repository.cleanup({
			nowMs: 40 * day,
			stagingCutoffMs: 33 * day,
			metadataCutoffMs: 10 * day,
			limit: 100,
		});
		expect(
			database
				.prepare(
					"SELECT submission_id, payload_json FROM feedback_submissions ORDER BY submission_id",
				)
				.all(),
		).toEqual([
			{ submission_id: id(2), payload_json: JSON.stringify({ id: 2 }) },
		]);
		expect(
			database
				.prepare("SELECT fingerprint, lease_token FROM feedback_incidents")
				.all(),
		).toEqual([{ fingerprint: hash(2), lease_token: "live-lease" }]);
		expect(
			database.prepare("SELECT COUNT(*) AS count FROM feedback_quota").get(),
		).toEqual({ count: 0 });
		await repository.cleanup({
			nowMs: 40 * day,
			stagingCutoffMs: 33 * day,
			metadataCutoffMs: 10 * day,
			limit: 100,
		});
		expect(
			database
				.prepare("SELECT COUNT(*) AS count FROM feedback_submissions")
				.get(),
		).toEqual({ count: 1 });
	});

	it("stores issue mapping, clears staged prose on delivery, and rejects a stale completion", async () => {
		await repository.reserve(reservation(1, hash(1), 1_000));
		await repository.acquireLease({
			fingerprint: hash(1),
			leaseToken: "lease-one",
			nowMs: 1_000,
			leaseUntilMs: 31_000,
		});
		const delivered = await repository.markDelivered({
			submissionId: id(1),
			leaseToken: "lease-one",
			issueNumber: 77,
			commentId: null,
			nowMs: 2_000,
		});
		expect(delivered).toMatchObject({
			state: "delivered",
			payloadJson: null,
			issueNumber: 77,
		});
		const incident = database
			.prepare(
				"SELECT state, issue_number, lease_token FROM feedback_incidents WHERE fingerprint = ?",
			)
			.get(hash(1));
		expect(incident).toEqual({
			state: "open",
			issue_number: 77,
			lease_token: null,
		});

		await repository.reserve(reservation(2, hash(2), 3_000));
		await repository.acquireLease({
			fingerprint: hash(2),
			leaseToken: "expired",
			nowMs: 3_000,
			leaseUntilMs: 4_000,
		});
		await expect(
			repository.markDelivered({
				submissionId: id(2),
				leaseToken: "expired",
				issueNumber: 88,
				commentId: null,
				nowMs: 4_001,
			}),
		).rejects.toThrow(/stale/u);
	});
});
