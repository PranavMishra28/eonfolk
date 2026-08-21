import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	ACTION_IDS,
	type ActionId,
	CITIZENS,
	GATE_ZERO_TIMING,
	PARTICIPANT_ASSIGNMENTS,
	resolveTreatment,
	TERMINAL_OUTCOMES,
	TREATMENT_IDS,
	TREATMENT_SNAPSHOT,
	TREATMENT_VECTORS,
	TREATMENTS,
	terminalStateBytes,
	VISIBLE_FIXTURE,
	WILLIAMS_ROWS,
} from "./contract";
import { TreatmentConsequence, TreatmentPrototype } from "./TreatmentPrototype";

describe("the fixed Gate 0 treatment contract", () => {
	it("contains exactly six hidden treatments and three intervention tokens", () => {
		expect(TREATMENT_IDS).toEqual(["H", "FAM", "TRI", "FAC", "ECH", "DIR"]);
		expect(ACTION_IDS).toEqual(["verify-private", "accuse-now", "abstain"]);
		expect(TREATMENT_SNAPSHOT.treatmentContractVersion).toBe(
			"gate-0-treatments-v1",
		);
		expect(TREATMENT_VECTORS).toHaveLength(18);
		expect(
			new Set(
				TREATMENT_VECTORS.map(
					({ treatmentId, adviceInput }) => `${treatmentId}:${adviceInput}`,
				),
			).size,
		).toBe(18);
	});

	it("freezes the shared Riverhold facts, cast, relationship, reserve, and timing", () => {
		expect(CITIZENS).toEqual([
			"Mara",
			"Toma",
			"Iven",
			"Sera",
			"Nadi",
			"Owen",
			"Bela",
			"Corin",
		]);
		expect(VISIBLE_FIXTURE.reserveMismatch).toBe(12);
		expect(VISIBLE_FIXTURE.ledgerCount - VISIBLE_FIXTURE.openBinCount).toBe(12);
		expect(VISIBLE_FIXTURE.relationship).toContain("Mara trusts Toma");
		expect(GATE_ZERO_TIMING).toEqual({
			decisionWindowMs: 90_000,
			consequenceDelayMs: 45_000,
			consequenceViewMs: 15_000,
			replayWindowMs: 15_000,
			neutralResetMs: 60_000,
			totalSlotMs: 225_000,
		});
		expect(
			GATE_ZERO_TIMING.decisionWindowMs +
				GATE_ZERO_TIMING.consequenceDelayMs +
				GATE_ZERO_TIMING.consequenceViewMs +
				GATE_ZERO_TIMING.replayWindowMs +
				GATE_ZERO_TIMING.neutralResetMs,
		).toBe(GATE_ZERO_TIMING.totalSlotMs);
	});

	it("changes only the chooser/control structure between treatments", () => {
		expect(TREATMENTS.H.voters).toEqual(["Mara"]);
		expect(TREATMENTS.FAM.voters).toEqual(["Mara", "Toma", "Iven", "Sera"]);
		expect(TREATMENTS.TRI.voters).toEqual(["Mara", "Toma", "Iven"]);
		expect(TREATMENTS.FAC.voters).toEqual([
			"Mara",
			"Toma",
			"Iven",
			"Sera",
			"Nadi",
			"Owen",
		]);
		expect(TREATMENTS.ECH.voters).toEqual(["Mara"]);
		expect(TREATMENTS.DIR.voters).toEqual([]);
		expect(TREATMENTS.H.rule).toBe(TREATMENTS.ECH.rule);
		expect(TREATMENTS.H.postChoiceFocus).toBe("Mara");
		expect(TREATMENTS.ECH.postChoiceFocus).toBe("Iven");
		expect(TREATMENTS.FAM.historyOwner).toBe("household");
		expect(TREATMENTS.TRI.historyOwner).toBe("trio");
		expect(TREATMENTS.FAC.historyOwner).toBe("faction");
		expect(TREATMENTS.DIR.rule).toBe("direct");
		expect(TREATMENTS.DIR.playerAuthorityAfter).toBe("direct");
		expect(
			Object.values(TREATMENTS).every(
				({ covenantCreated }) => covenantCreated === false,
			),
		).toBe(true);
	});

	it("uses the exact six-row Williams counterbalance", () => {
		expect(WILLIAMS_ROWS).toEqual([
			["H", "FAM", "DIR", "TRI", "ECH", "FAC"],
			["FAM", "TRI", "H", "FAC", "DIR", "ECH"],
			["TRI", "FAC", "FAM", "ECH", "H", "DIR"],
			["FAC", "ECH", "TRI", "DIR", "FAM", "H"],
			["ECH", "DIR", "FAC", "H", "TRI", "FAM"],
			["DIR", "H", "ECH", "FAM", "FAC", "TRI"],
		]);
		expect(PARTICIPANT_ASSIGNMENTS).toEqual({
			P01: WILLIAMS_ROWS[0],
			P02: WILLIAMS_ROWS[1],
			P03: WILLIAMS_ROWS[2],
			P04: WILLIAMS_ROWS[3],
			P05: WILLIAMS_ROWS[4],
			P06: WILLIAMS_ROWS[5],
		});
		for (let position = 0; position < 6; position += 1) {
			expect(new Set(WILLIAMS_ROWS.map((row) => row[position]))).toEqual(
				new Set(TREATMENT_IDS),
			);
		}
		const predecessors = new Set<string>();
		for (const row of WILLIAMS_ROWS) {
			for (let index = 1; index < row.length; index += 1)
				predecessors.add(`${row[index - 1]}>${row[index]}`);
		}
		expect(predecessors.size).toBe(30);
	});
});

describe("deterministic chooser and tie math", () => {
	const expected: Readonly<Record<string, ActionId>> = {
		"H:verify-private": "verify-private",
		"H:accuse-now": "verify-private",
		"H:abstain": "abstain",
		"FAM:verify-private": "verify-private",
		"FAM:accuse-now": "accuse-now",
		"FAM:abstain": "abstain",
		"TRI:verify-private": "verify-private",
		"TRI:accuse-now": "verify-private",
		"TRI:abstain": "abstain",
		"FAC:verify-private": "verify-private",
		"FAC:accuse-now": "verify-private",
		"FAC:abstain": "abstain",
		"ECH:verify-private": "verify-private",
		"ECH:accuse-now": "verify-private",
		"ECH:abstain": "abstain",
		"DIR:verify-private": "verify-private",
		"DIR:accuse-now": "accuse-now",
		"DIR:abstain": "abstain",
	};

	for (const treatmentId of TREATMENT_IDS) {
		for (const adviceInput of ACTION_IDS) {
			it(`covers and repeats ${treatmentId} × ${adviceInput}`, () => {
				const first = resolveTreatment(treatmentId, adviceInput);
				const second = resolveTreatment(treatmentId, adviceInput);
				expect(first).toEqual(second);
				expect(first.chosenAction).toBe(
					expected[`${treatmentId}:${adviceInput}`],
				);
				expect(first.chooserScores).toHaveLength(
					TREATMENTS[treatmentId].voters.length,
				);
				for (const chooser of first.chooserScores) {
					expect(chooser.scores).toHaveLength(3);
					expect(chooser.scores.every(Number.isInteger)).toBe(true);
				}
			});
		}
	}

	it("exercises family plurality, family Mara tie-break, trio fixed order, and faction Mara tie-break", () => {
		expect(resolveTreatment("FAM", "verify-private").voteTotals).toEqual({
			"verify-private": 2,
			"accuse-now": 1,
			abstain: 1,
		});
		expect(resolveTreatment("FAM", "abstain").voteTotals).toEqual({
			"verify-private": 2,
			"accuse-now": 0,
			abstain: 2,
		});
		expect(resolveTreatment("FAM", "abstain").chosenAction).toBe("abstain");
		expect(resolveTreatment("TRI", "accuse-now").voteTotals).toEqual({
			"verify-private": 1,
			"accuse-now": 1,
			abstain: 1,
		});
		expect(resolveTreatment("TRI", "accuse-now").chosenAction).toBe(
			"verify-private",
		);
		expect(resolveTreatment("FAC", "accuse-now").voteTotals).toEqual({
			"verify-private": 2,
			"accuse-now": 2,
			abstain: 2,
		});
		expect(resolveTreatment("FAC", "accuse-now").chosenAction).toBe(
			"verify-private",
		);
	});

	it("keeps H and ECH scoring identical and makes DIR execute the selected token without scoring", () => {
		for (const action of ACTION_IDS) {
			expect(resolveTreatment("ECH", action).chooserScores).toEqual(
				resolveTreatment("H", action).chooserScores,
			);
			const direct = resolveTreatment("DIR", action);
			expect(direct.chooserScores).toEqual([]);
			expect(direct.chosenAction).toBe(action);
			expect(direct.disposition).toBe("commanded");
		}
	});
});

describe("terminal outcomes and pure rendering", () => {
	it("binds each chosen action to one independently reproduced SHA-256 and consequence key", () => {
		for (const action of ACTION_IDS) {
			const outcome = TERMINAL_OUTCOMES[action];
			const independentHash = createHash("sha256")
				.update(terminalStateBytes(outcome.state), "utf8")
				.digest("hex");
			expect(outcome.stateHash).toMatch(/^[0-9a-f]{64}$/);
			expect(outcome.stateHash).toBe(independentHash);
			expect(outcome.consequenceKey).toBe(`gate-0.consequence.${action}`);
		}
		for (const vector of TREATMENT_VECTORS) {
			const outcome = TERMINAL_OUTCOMES[vector.chosenAction];
			expect(vector.terminalState).toEqual(outcome.state);
			expect(vector.terminalStateHash).toBe(outcome.stateHash);
			expect(vector.renderedConsequenceKey).toBe(outcome.consequenceKey);
		}
	});

	it("renders an accessible, branding-free treatment without exposing internal treatment IDs", () => {
		for (const treatmentId of TREATMENT_IDS) {
			const html = renderToStaticMarkup(
				<TreatmentPrototype
					onConfirm={() => undefined}
					onSelect={() => undefined}
					selected="verify-private"
					treatmentId={treatmentId}
				/>,
			);
			expect(html).toContain("What everyone can see");
			expect(html).toContain("Mara trusts Toma");
			expect(html).toContain("90 seconds");
			expect(html).not.toContain("EONFOLK");
			expect(html).not.toContain(`data-treatment="${treatmentId}"`);
		}
	});

	it("renders the exact consequence key selected by the resolver", () => {
		for (const vector of TREATMENT_VECTORS) {
			const html = renderToStaticMarkup(
				<TreatmentConsequence vector={vector} />,
			);
			expect(html).toContain(
				`data-consequence-key="${vector.renderedConsequenceKey}"`,
			);
			expect(html).toContain(
				TERMINAL_OUTCOMES[vector.chosenAction].renderedConsequence.replaceAll(
					"'",
					"&#x27;",
				),
			);
		}
	});
});
