import type { RiverholdProjection } from "../projection";

export function SemanticWorld({
	projection,
	onCitizen,
}: {
	readonly projection: RiverholdProjection;
	readonly onCitizen: (citizenId: string) => void;
}) {
	return (
		<section className="semantic-world" aria-labelledby="semantic-world-title">
			<div className="semantic-heading">
				<div>
					<p className="eyebrow">SEMANTIC WORLD</p>
					<h2 id="semantic-world-title">Riverhold, in words</h2>
				</div>
				<p>
					All facts and actions shown in the illustrated world are available
					here.
				</p>
			</div>
			<ul
				className="semantic-citizens"
				aria-label="Eight Riverhold citizens and their current activities"
			>
				{projection.citizens.map((citizen) => (
					<li key={citizen.id}>
						<button type="button" onClick={() => onCitizen(citizen.id)}>
							<span
								className={`activity-dot activity-dot--${citizen.activityKind}`}
								aria-hidden="true"
							/>
							<span>
								<strong>{citizen.name}</strong>
								<small>{citizen.role}</small>
								<span>{citizen.activity}</span>
							</span>
						</button>
					</li>
				))}
			</ul>
			<div className="semantic-notices">
				<h3>What changed</h3>
				<ul>
					{projection.worldNotices.map((notice) => (
						<li key={notice}>{notice}</li>
					))}
				</ul>
			</div>
		</section>
	);
}
