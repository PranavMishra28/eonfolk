import type { RiverholdProjection } from "../projection";

export function SemanticWorld({
	projection,
	onCitizen,
	compact = false,
}: {
	readonly projection: RiverholdProjection;
	readonly onCitizen: (citizenId: string) => void;
	readonly compact?: boolean;
}) {
	return (
		<section
			className={`semantic-world${compact ? " semantic-world--compact" : ""}`}
			aria-labelledby={
				compact ? "semantic-world-title-compact" : "semantic-world-title"
			}
		>
			<div className="semantic-heading">
				<div>
					<p className="eyebrow">WORLD IN WORDS</p>
					<h2
						id={
							compact ? "semantic-world-title-compact" : "semantic-world-title"
						}
					>
						Riverhold, in words
					</h2>
				</div>
				<p>
					All facts and actions shown in the illustrated world are available
					here.
				</p>
			</div>
			<dl className="semantic-summary">
				<div>
					<dt>Settlement resources</dt>
					<dd>
						{projection.resources.food} food · {projection.resources.water}{" "}
						water · {projection.resources.wood} wood
					</dd>
				</div>
				<div>
					<dt>Visible interaction or world process</dt>
					<dd>
						{projection.spatial.interactions[0]?.semanticLabel ??
							projection.worldNotices[0]}
					</dd>
				</div>
				<div>
					<dt>River Mill</dt>
					<dd>
						{projection.worldProcesses.millRepaired
							? "The authoritative mill state is repaired."
							: "The authoritative mill state still needs repair."}
					</dd>
				</div>
			</dl>
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
								<span>
									{citizen.activity} · {citizen.place}
								</span>
								<small>
									Visible action: {citizen.canonicalAction.kind} ·{" "}
									{citizen.canonicalAction.status === "committed"
										? `canonical event ${citizen.canonicalAction.eventSequence}`
										: "in progress; no result claimed"}
								</small>
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
