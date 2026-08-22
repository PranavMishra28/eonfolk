import { useEffect, useState } from "react";
import type { ChronicleBeatProjection } from "../projection";

export function Chronicle({
	beats,
	reducedMotion,
	onEvidence,
	onShowInWorld,
}: {
	readonly beats: readonly ChronicleBeatProjection[];
	readonly reducedMotion: boolean;
	readonly onEvidence: (beat: ChronicleBeatProjection) => void;
	readonly onShowInWorld: (beat: ChronicleBeatProjection) => void;
}) {
	const [index, setIndex] = useState(0);
	const [playing, setPlaying] = useState(false);
	const beat = beats[index] ?? beats[0];

	useEffect(() => {
		if (reducedMotion) setPlaying(false);
	}, [reducedMotion]);

	useEffect(() => {
		if (!playing || reducedMotion || index >= beats.length - 1) return;
		const timer = window.setTimeout(
			() => setIndex((value) => Math.min(value + 1, beats.length - 1)),
			2_400,
		);
		return () => window.clearTimeout(timer);
	}, [beats.length, index, playing, reducedMotion]);

	if (!beat) return null;
	return (
		<section className="chronicle" aria-labelledby="chronicle-title">
			<div className="chronicle-heading">
				<div>
					<p className="eyebrow">THE CHRONICLE · THREE MOMENTS</p>
					<h2 id="chronicle-title">What entered the record</h2>
				</div>
				<p className="chronicle-note">
					The order of the story does not prove what caused what. Open Evidence
					for the exact recorded links.
				</p>
			</div>
			<div className="replay-stage" aria-live="polite">
				<div className="replay-ornament" aria-hidden="true">
					<span>{index + 1}</span>
				</div>
				<div>
					<p className="beat-time">
						{beat.timeLabel} · {beat.eyebrow}
					</p>
					<h3>{beat.title}</h3>
					<p>{beat.body}</p>
					<div className="chronicle-actions">
						<button
							className="text-button"
							type="button"
							onClick={() => onShowInWorld(beat)}
						>
							Show in Riverhold
						</button>
						<button
							className="text-button"
							type="button"
							onClick={() => onEvidence(beat)}
						>
							Inspect {beat.evidence.length} evidence{" "}
							{beat.evidence.length === 1 ? "record" : "records"}
						</button>
					</div>
				</div>
			</div>
			<fieldset className="replay-track" aria-label="Replay beats">
				{beats.map((item, beatIndex) => (
					<button
						key={item.id}
						className={beatIndex === index ? "active" : ""}
						type="button"
						onClick={() => {
							setIndex(beatIndex);
							setPlaying(false);
						}}
						aria-label={`Show beat ${beatIndex + 1}: ${item.title}`}
					>
						<span>{item.timeLabel}</span>
						{item.title}
					</button>
				))}
			</fieldset>
			<fieldset className="replay-controls" aria-label="Replay controls">
				<button
					type="button"
					onClick={() => {
						setIndex((value) => Math.max(0, value - 1));
						setPlaying(false);
					}}
					disabled={index === 0}
				>
					Previous
				</button>
				<button
					type="button"
					onClick={() => setPlaying((value) => !value)}
					aria-pressed={playing}
					disabled={reducedMotion}
				>
					{reducedMotion
						? "Play disabled by reduced motion"
						: playing
							? "Pause"
							: "Play"}
				</button>
				<button
					type="button"
					onClick={() => {
						setIndex((value) => Math.min(beats.length - 1, value + 1));
						setPlaying(false);
					}}
					disabled={index === beats.length - 1}
				>
					Next
				</button>
			</fieldset>
		</section>
	);
}
