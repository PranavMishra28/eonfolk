import type { GeneratedSponsorCounsel } from "@eonfolk/protocol";
import { useEffect, useMemo, useState } from "react";

import type { GeneratedNavigationAction } from "../../generated-presentation";
import {
	loadGeneratedSponsorAuthority,
	offerGeneratedCounsel,
	sponsorGeneratedCitizen,
	type GeneratedSponsorAuthority,
	type GeneratedSponsorCandidate,
} from "../../generated-sponsor-authority";
import type { GeneratedWorldExperience } from "../../generated-world-runtime";

type SponsorState =
	| Readonly<{ readonly status: "loading" }>
	| Readonly<{
			readonly status: "ready";
			readonly authority: GeneratedSponsorAuthority | null;
	  }>
	| Readonly<{ readonly status: "saving"; readonly label: string }>
	| Readonly<{ readonly status: "error"; readonly message: string }>;

function valueLabel(value: string): string {
	return value.replace(/[-_:]+/gu, " ");
}

function actionLabel(value: string): string {
	return value
		.replace(/([a-z])([A-Z])/gu, "$1 $2")
		.replace(/[-_:]+/gu, " ")
		.toLocaleLowerCase("en-US");
}

function dispositionLabel(
	value: NonNullable<GeneratedSponsorAuthority["decision"]>["disposition"],
): string {
	return {
		accepted: "accepted the direction",
		rejected: "rejected the direction",
		delayed: "delayed the direction",
		reinterpreted: "reinterpreted the direction",
	}[value];
}

function CandidateIdentity({
	candidate,
}: {
	readonly candidate: GeneratedSponsorCandidate;
}) {
	return (
		<article
			className="generated-sponsor-identity"
			aria-label={`${candidate.name} identity`}
		>
			<p className="v1-kicker">ONE AUTONOMOUS PERSON</p>
			<h3>{candidate.name}</h3>
			<p className="generated-sponsor-role">
				{candidate.role} · {candidate.settlementName}
			</p>
			<dl>
				<div>
					<dt>Values</dt>
					<dd>{candidate.valueIds.map(valueLabel).join(" · ")}</dd>
				</div>
				<div>
					<dt>Now</dt>
					<dd>{candidate.activity}</dd>
				</div>
				<div>
					<dt>Tension</dt>
					<dd>{candidate.currentTension}</dd>
				</div>
			</dl>
			<h4>Immediate relationships</h4>
			<ul className="generated-sponsor-relationships">
				{candidate.relationships.map((relationship) => (
					<li key={relationship.relationshipId}>
						<strong>{relationship.otherName}</strong>
						<span>
							{relationship.kind} · trust {relationship.trustBasisPoints} ·
							strain {relationship.strainBasisPoints}
						</span>
					</li>
				))}
			</ul>
		</article>
	);
}

export function GeneratedSponsorChronicle({
	experience,
	settlementId,
	dispatch,
	onOpenSettlement,
}: {
	readonly experience: GeneratedWorldExperience;
	readonly settlementId: string;
	readonly dispatch: (action: GeneratedNavigationAction) => void;
	readonly onOpenSettlement: (settlementId: string) => void;
}) {
	const [state, setState] = useState<SponsorState>(() => ({
		status: "loading",
	}));
	const localCandidates = useMemo(
		() =>
			experience.sponsorSource.candidates.filter(
				(candidate) => candidate.settlementId === settlementId,
			),
		[experience.sponsorSource.candidates, settlementId],
	);
	const [selectedCitizenId, setSelectedCitizenId] = useState(
		localCandidates[0]?.citizenId ?? "",
	);
	useEffect(() => {
		if (
			!localCandidates.some(
				(candidate) => candidate.citizenId === selectedCitizenId,
			)
		)
			setSelectedCitizenId(localCandidates[0]?.citizenId ?? "");
	}, [localCandidates, selectedCitizenId]);
	useEffect(() => {
		let active = true;
		const factory = experience.sponsorStorage.indexedDbFactory;
		if (factory === null) {
			setState({
				status: "error",
				message:
					"This browser has no IndexedDB authority for a durable covenant.",
			});
			return () => {
				active = false;
			};
		}
		void loadGeneratedSponsorAuthority({
			source: experience.sponsorSource,
			indexedDbFactory: factory,
			databaseName: experience.sponsorStorage.databaseName,
		}).then(
			(authority) => {
				if (!active) return;
				setState({ status: "ready", authority });
				if (authority !== null)
					setSelectedCitizenId(authority.citizen.citizenId);
			},
			() => {
				if (active)
					setState({
						status: "error",
						message:
							"The local covenant failed integrity validation, so no Chronicle is being shown.",
					});
			},
		);
		return () => {
			active = false;
		};
	}, [experience.sponsorSource, experience.sponsorStorage]);
	const authority = state.status === "ready" ? state.authority : null;
	const candidate =
		authority?.citizen ??
		localCandidates.find(
			(current) => current.citizenId === selectedCitizenId,
		) ??
		localCandidates[0];
	const firstCandidate = experience.sponsorSource.candidates[0];
	const focusCitizen = (
		citizenId: string,
		targetSettlementId = settlementId,
	) => {
		if (targetSettlementId !== settlementId)
			onOpenSettlement(targetSettlementId);
		dispatch({ type: "select-citizen", citizenId });
	};
	const sponsor = async () => {
		const factory = experience.sponsorStorage.indexedDbFactory;
		if (candidate === undefined || factory === null) return;
		setState({
			status: "saving",
			label: `Establishing ${candidate.name}'s covenant…`,
		});
		try {
			const next = await sponsorGeneratedCitizen({
				source: experience.sponsorSource,
				citizenId: candidate.citizenId,
				indexedDbFactory: factory,
				databaseName: experience.sponsorStorage.databaseName,
			});
			setState({ status: "ready", authority: next });
			focusCitizen(next.citizen.citizenId, next.citizen.settlementId);
		} catch {
			setState({
				status: "error",
				message: "The covenant was not committed. Reality remains unchanged.",
			});
		}
	};
	const counsel = async (choice: GeneratedSponsorCounsel) => {
		const factory = experience.sponsorStorage.indexedDbFactory;
		if (factory === null) return;
		setState({
			status: "saving",
			label: "The citizen is deciding independently…",
		});
		try {
			const next = await offerGeneratedCounsel({
				source: experience.sponsorSource,
				counsel: choice,
				indexedDbFactory: factory,
				databaseName: experience.sponsorStorage.databaseName,
			});
			setState({ status: "ready", authority: next });
		} catch {
			setState({
				status: "error",
				message:
					"Counsel did not commit. No decision or consequence was invented.",
			});
		}
	};

	return (
		<section
			className="generated-sponsor"
			aria-labelledby="generated-sponsor-title"
			data-authority-revision={authority?.revision ?? 0}
			data-authority-hash={authority?.authorityHash ?? "none"}
		>
			<header>
				<p className="v1-kicker">YOUR COVENANT</p>
				<h2 id="generated-sponsor-title">
					Care about one life. Never command it.
				</h2>
				<p>
					Sponsor one person, understand the pressure they can see, then offer
					one consequential direction they may refuse.
				</p>
			</header>
			{state.status === "loading" ? (
				<p role="status">Checking the local covenant…</p>
			) : state.status === "saving" ? (
				<p role="status" aria-live="polite">
					{state.label}
				</p>
			) : state.status === "error" ? (
				<p className="generated-sponsor-error" role="alert">
					{state.message}
				</p>
			) : authority === null ? (
				localCandidates.length === 0 ? (
					<div className="generated-sponsor-error" role="status">
						<p>
							This settlement has no canonical institution that can own the
							consequence, so sponsorship is not offered here.
						</p>
						{firstCandidate === undefined ? null : (
							<button
								type="button"
								onClick={() => onOpenSettlement(firstCandidate.settlementId)}
							>
								Return to {firstCandidate.settlementName}
							</button>
						)}
					</div>
				) : (
					<>
						<fieldset className="generated-sponsor-people">
							<legend>Choose one resident</legend>
							{localCandidates.map((person) => (
								<button
									key={person.citizenId}
									type="button"
									aria-pressed={person.citizenId === candidate?.citizenId}
									onClick={() => {
										setSelectedCitizenId(person.citizenId);
										focusCitizen(person.citizenId);
									}}
								>
									<strong>{person.name}</strong>
									<small>{person.role}</small>
								</button>
							))}
						</fieldset>
						{candidate === undefined ? null : (
							<>
								<CandidateIdentity candidate={candidate} />
								<button
									className="generated-sponsor-primary"
									type="button"
									onClick={sponsor}
								>
									Sponsor {candidate.name}
								</button>
							</>
						)}
					</>
				)
			) : (
				<>
					<CandidateIdentity candidate={authority.citizen} />
					{authority.decision === null ? (
						<section
							className="generated-counsel"
							aria-labelledby="generated-counsel-title"
						>
							<p className="v1-kicker">GENUINE DECISION BOUNDARY</p>
							<h3 id="generated-counsel-title">
								Offer direction, not control.
							</h3>
							<p>
								The Standard Brain will weigh visible activity, values,
								relationship, commitment, and risk. Your counsel is only one
								contributing condition.
							</p>
							<div>
								<button type="button" onClick={() => counsel("verify-reserve")}>
									Verify the reserve before reallocating
								</button>
								<button
									type="button"
									onClick={() => counsel("raise-allegation-publicly")}
								>
									Raise an allegation publicly now
								</button>
							</div>
						</section>
					) : (
						<>
							<section className="generated-interpretation" aria-live="polite">
								<p className="v1-kicker">INDEPENDENT INTERPRETATION</p>
								<h3>
									{authority.citizen.name}{" "}
									{dispositionLabel(authority.decision.disposition)}.
								</h3>
								<p>{authority.decision.publicJustification}</p>
								<small>
									Standard Brain · {actionLabel(authority.decision.actionKind)}{" "}
									· no model
								</small>
							</section>
							<section
								className="generated-chronicle"
								aria-labelledby="generated-chronicle-title"
							>
								<p className="v1-kicker">FACTUAL CHRONICLE</p>
								<h3 id="generated-chronicle-title">
									What changed, and why we can say it.
								</h3>
								<ol>
									{authority.chronicle.map((sentence) => (
										<li
											key={sentence.sentenceId}
											data-causal-relation={sentence.relation}
										>
											<button
												type="button"
												onClick={() =>
													focusCitizen(
														sentence.focus.citizenId ??
															authority.citizen.citizenId,
														sentence.focus.settlementId,
													)
												}
											>
												<span>{valueLabel(sentence.relation)}</span>
												<strong>{sentence.text}</strong>
												<small>
													{sentence.evidenceEventIds.length} linked authority
													event(s) · focus in world
												</small>
											</button>
										</li>
									))}
								</ol>
								<p className="generated-unresolved">
									<strong>Still unresolved:</strong>{" "}
									{authority.unresolvedTension}
								</p>
							</section>
							{authority.shareArtifact === null ? null : (
								<details className="generated-share-artifact">
									<summary>Open the 15-second factual share</summary>
									<article aria-label="15-second factual share artifact">
										<p className="v1-kicker">15 SECONDS · THREE CAUSAL BEATS</p>
										<h3>{authority.shareArtifact.headline}</h3>
										<ol>
											{authority.shareArtifact.beats.map((beat) => (
												<li key={beat.sentenceId}>{beat.text}</li>
											))}
										</ol>
										<p>
											<strong>Unresolved:</strong>{" "}
											{authority.shareArtifact.unresolvedTension}
										</p>
										<small>
											Canonical path: {authority.shareArtifact.canonicalPath}
										</small>
									</article>
								</details>
							)}
						</>
					)}
				</>
			)}
		</section>
	);
}
