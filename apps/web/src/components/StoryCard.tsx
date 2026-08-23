import { useState } from "react";
import type { RiverholdProjection } from "../projection";
import { EonfolkMark } from "./EonfolkMark";

export function StoryCard({
	projection,
}: {
	readonly projection: RiverholdProjection;
}) {
	const [format, setFormat] = useState<"wide" | "portrait">("wide");
	const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
		"idle",
	);
	const card = projection.storyCard;
	if (!card) return null;
	const copy = `${card.heading}\n${card.choice}\n${card.followed}\n${card.unresolved}\n\nRiverhold · Day ${projection.day}`;
	const copyCard = async () => {
		try {
			await navigator.clipboard.writeText(copy);
			setCopyStatus("copied");
		} catch {
			setCopyStatus("failed");
		}
	};
	return (
		<section className="story-section" aria-labelledby="story-title">
			<div className="story-toolbar">
				<div>
					<p className="eyebrow">SHARE THE CONSEQUENCE, NOT THE TECHNOLOGY</p>
					<h2 id="story-title">Riverhold Story Card</h2>
				</div>
				<fieldset className="segmented" aria-label="Story Card aspect ratio">
					<button
						type="button"
						aria-pressed={format === "wide"}
						onClick={() => setFormat("wide")}
					>
						16:9
					</button>
					<button
						type="button"
						aria-pressed={format === "portrait"}
						onClick={() => setFormat("portrait")}
					>
						9:16
					</button>
				</fieldset>
			</div>
			<div
				className={`story-card story-card--${format}`}
				data-testid="story-card"
			>
				<div className="story-sun" aria-hidden="true" />
				<p className="story-place">RIVERHOLD · DAY {projection.day}</p>
				<h3>{card.heading}</h3>
				<div className="story-beats">
					<p>{card.choice}</p>
					<p>{card.followed}</p>
				</div>
				<p className="story-unresolved">{card.unresolved}</p>
				<div className="story-signature">
					<EonfolkMark />
					<p className="story-mark">EONFOLK · a true Riverhold story</p>
				</div>
			</div>
			<button
				className="primary-action"
				type="button"
				onClick={copyCard}
				aria-live="polite"
			>
				{copyStatus === "copied"
					? "Story Card copied"
					: copyStatus === "failed"
						? "Copy unavailable — select the card text"
						: "Copy Story Card"}
			</button>
		</section>
	);
}
