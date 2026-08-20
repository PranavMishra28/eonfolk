import type { ChangeEvent } from "react";
import {
	ACTION_IDS,
	ACTION_LABELS,
	type ActionId,
	GATE_ZERO_TIMING,
	TERMINAL_OUTCOMES,
	TREATMENTS,
	type TreatmentId,
	type TreatmentVector,
	VISIBLE_FIXTURE,
} from "./contract";

export interface AdviceChooserProps {
	readonly selected: ActionId | null;
	readonly onSelect: (action: ActionId) => void;
	readonly idPrefix?: string;
}

export function AdviceChooser({
	selected,
	onSelect,
	idPrefix = "gate-zero-advice",
}: AdviceChooserProps) {
	const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
		onSelect(event.target.value as ActionId);

	return (
		<fieldset>
			<legend>What advice do you give?</legend>
			{ACTION_IDS.map((action) => {
				const inputId = `${idPrefix}-${action}`;
				return (
					<div key={action}>
						<input
							checked={selected === action}
							id={inputId}
							name={idPrefix}
							onChange={handleChange}
							type="radio"
							value={action}
						/>
						<label htmlFor={inputId}>{ACTION_LABELS[action]}</label>
					</div>
				);
			})}
		</fieldset>
	);
}

export interface TreatmentPrototypeProps extends AdviceChooserProps {
	readonly treatmentId: TreatmentId;
	readonly onConfirm: () => void;
}

export function TreatmentPrototype({
	treatmentId,
	selected,
	onSelect,
	onConfirm,
	idPrefix,
}: TreatmentPrototypeProps) {
	const treatment = TREATMENTS[treatmentId];
	const headingId = `${idPrefix ?? "gate-zero"}-heading`;

	return (
		<article aria-labelledby={headingId}>
			<header>
				<p>Market count review</p>
				<h1 id={headingId}>{treatment.participantFocus}</h1>
				<p>{treatment.authorityDescription}</p>
			</header>

			<section aria-labelledby={`${headingId}-facts`}>
				<h2 id={`${headingId}-facts`}>What everyone can see</h2>
				<ul>
					{VISIBLE_FIXTURE.facts.map((fact) => (
						<li key={fact}>{fact}</li>
					))}
				</ul>
				<p>{VISIBLE_FIXTURE.publicJustification}</p>
			</section>

			<AdviceChooser
				idPrefix={idPrefix}
				onSelect={onSelect}
				selected={selected}
			/>
			<p>
				You have {GATE_ZERO_TIMING.decisionWindowMs / 1_000} seconds to decide.
			</p>
			<button disabled={selected === null} onClick={onConfirm} type="button">
				Confirm advice
			</button>
		</article>
	);
}

export function TreatmentConsequence({
	vector,
}: {
	readonly vector: TreatmentVector;
}) {
	const outcome = TERMINAL_OUTCOMES[vector.chosenAction];
	return (
		<section
			aria-live="polite"
			data-consequence-key={vector.renderedConsequenceKey}
		>
			<h2>What happened</h2>
			<p>{outcome.renderedConsequence}</p>
			<p>Mara chose: {ACTION_LABELS[vector.chosenAction]}.</p>
		</section>
	);
}
