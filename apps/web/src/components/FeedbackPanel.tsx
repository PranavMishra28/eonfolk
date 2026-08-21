import { useMemo, useState } from "react";
import { browserDiagnostics } from "../diagnostics";
import {
	createLocalFeedbackReport,
	type FeedbackCategory,
	LocalFeedbackQueue,
	type SanitizedFeedbackImage,
	sanitizeFeedbackImage,
} from "../feedback";

export function FeedbackPanel() {
	const queue = useMemo(() => new LocalFeedbackQueue(window.localStorage), []);
	const [category, setCategory] = useState<FeedbackCategory>("bug");
	const [text, setText] = useState("");
	const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
	const [attachment, setAttachment] = useState<SanitizedFeedbackImage | null>(
		null,
	);
	const [attachmentStatus, setAttachmentStatus] = useState("");
	const [queued, setQueued] = useState(() => queue.list().length);
	const [status, setStatus] = useState("");

	const prepareAttachment = async (file: File | undefined) => {
		if (file === undefined) {
			setAttachment(null);
			setAttachmentStatus("");
			return;
		}
		setAttachmentStatus("Sanitizing image…");
		try {
			const sanitized = await sanitizeFeedbackImage(file);
			setAttachment(sanitized);
			setAttachmentStatus(
				`Sanitized to ${sanitized.width}×${sanitized.height}, ${Math.ceil(sanitized.byteLength / 1024)} KB. Review the preview before saving.`,
			);
		} catch (error) {
			setAttachment(null);
			setAttachmentStatus(
				error instanceof Error ? error.message : "Image sanitization failed.",
			);
		}
	};

	const save = () => {
		try {
			if (includeDiagnostics) browserDiagnostics.enableAlphaCapture();
			const report = createLocalFeedbackReport({
				category,
				text,
				diagnostics: includeDiagnostics ? browserDiagnostics.observer() : null,
				attachment,
				reportId: `alpha_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
				createdAtMs: Date.now(),
			});
			setQueued(queue.save(report).length);
			setText("");
			setAttachment(null);
			setAttachmentStatus("");
			setStatus(
				"Saved only in this browser. No feedback relay is configured, so nothing was uploaded.",
			);
		} catch (error) {
			setStatus(
				error instanceof Error ? error.message : "Feedback could not be saved.",
			);
		}
	};

	return (
		<section className="feedback-panel" aria-labelledby="feedback-title">
			<div>
				<p className="eyebrow">FOUNDER ALPHA FEEDBACK</p>
				<h2 id="feedback-title">What broke the spell?</h2>
				<p>
					Reports stay on this device until a separately configured relay
					exists. Do not include names, email addresses, keys, or private
					information.
				</p>
			</div>
			<div className="feedback-form">
				<label>
					<span>Kind of feedback</span>
					<select
						value={category}
						onChange={(event) =>
							setCategory(event.target.value as FeedbackCategory)
						}
					>
						<option value="bug">Something broke</option>
						<option value="confusing">Something was unclear</option>
						<option value="idea">I wanted another option</option>
						<option value="story">A moment stayed with me</option>
					</select>
				</label>
				<label>
					<span>What happened?</span>
					<textarea
						value={text}
						maxLength={1200}
						required
						onChange={(event) => setText(event.target.value)}
						placeholder="Describe the moment and what you expected."
					/>
				</label>
				<label>
					<span>Optional image</span>
					<input
						type="file"
						accept="image/png,image/jpeg,image/webp"
						onChange={(event) =>
							void prepareAttachment(event.target.files?.[0])
						}
					/>
				</label>
				{attachment && (
					<img
						className="feedback-preview"
						src={attachment.dataUrl}
						alt="Sanitized attachment preview"
					/>
				)}
				{attachmentStatus && <p role="status">{attachmentStatus}</p>}
				<label className="feedback-consent">
					<input
						type="checkbox"
						checked={includeDiagnostics}
						onChange={(event) => setIncludeDiagnostics(event.target.checked)}
					/>
					<span>
						Attach bounded structured diagnostics. This never includes raw world
						state, prompts, hidden reasoning, credentials, or browser history.
					</span>
				</label>
				<div className="feedback-actions">
					<button
						type="button"
						className="primary-action"
						disabled={text.trim().length === 0}
						onClick={save}
					>
						Save feedback locally
					</button>
					{queued > 0 && (
						<button
							type="button"
							onClick={() => {
								queue.clear();
								setQueued(0);
								setStatus("Deleted all locally queued feedback.");
							}}
						>
							Delete queued feedback ({queued})
						</button>
					)}
				</div>
				{status && (
					<p className="feedback-status" role="status">
						{status}
					</p>
				)}
			</div>
		</section>
	);
}
