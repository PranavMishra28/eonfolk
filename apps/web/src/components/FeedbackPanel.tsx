import { useEffect, useMemo, useRef, useState } from "react";
import { browserDiagnostics } from "../diagnostics";
import {
	createLocalFeedbackReport,
	FEEDBACK_EXPECTED_MAX_LENGTH,
	FEEDBACK_HAPPENED_MAX_LENGTH,
	type FeedbackCategory,
	LocalFeedbackQueue,
	type SanitizedFeedbackImage,
	sanitizeFeedbackImage,
} from "../feedback";

export function FeedbackPanel({
	contextLabel = "EONFOLK FEEDBACK",
}: {
	readonly contextLabel?: string;
} = {}) {
	const queue = useMemo(() => new LocalFeedbackQueue(window.localStorage), []);
	const attachmentInput = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [category, setCategory] = useState<FeedbackCategory>("bug");
	const [whatHappened, setWhatHappened] = useState("");
	const [whatExpected, setWhatExpected] = useState("");
	const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
	const [attachment, setAttachment] = useState<SanitizedFeedbackImage | null>(
		null,
	);
	const [attachmentStatus, setAttachmentStatus] = useState("");
	const [queuedReports, setQueuedReports] = useState(() => queue.list());
	const [online, setOnline] = useState(() => navigator.onLine);
	const [status, setStatus] = useState("");

	useEffect(() => {
		const markOnline = () => setOnline(true);
		const markOffline = () => setOnline(false);
		window.addEventListener("online", markOnline);
		window.addEventListener("offline", markOffline);
		return () => {
			window.removeEventListener("online", markOnline);
			window.removeEventListener("offline", markOffline);
		};
	}, []);

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
			if (includeDiagnostics)
				browserDiagnostics.markPerformance("feedback-freeze");
			const report = createLocalFeedbackReport({
				category,
				whatHappened,
				whatExpected,
				diagnostics: includeDiagnostics ? browserDiagnostics.observer() : null,
				attachment,
				reportId: `alpha_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
				createdAtMs: Date.now(),
			});
			setQueuedReports(queue.save(report));
			setWhatHappened("");
			setWhatExpected("");
			setAttachment(null);
			if (attachmentInput.current !== null) attachmentInput.current.value = "";
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
		<section
			className={`feedback-panel${open ? "" : " feedback-panel--closed"}`}
			aria-labelledby="feedback-title"
		>
			<div>
				<p className="eyebrow">{contextLabel}</p>
				<h2 id="feedback-title">What broke the spell?</h2>
				{open && (
					<p>
						Reports stay on this device until a separately configured relay
						exists. Do not include names, email addresses, keys, or private
						information.
					</p>
				)}
				<button
					type="button"
					className="feedback-toggle"
					aria-expanded={open}
					aria-controls="feedback-form"
					onClick={() => setOpen((current) => !current)}
				>
					{open ? "Close feedback" : "Report issue / Save feedback locally"}
				</button>
			</div>
			{open && (
				<div className="feedback-form" id="feedback-form">
					<div
						className="feedback-delivery"
						role="status"
						aria-label="Feedback delivery status"
					>
						<strong>Storage: this browser only</strong>
						<span>Upload: unavailable — no relay is configured</span>
						<span>Connection: {online ? "online" : "offline"}</span>
					</div>
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
							value={whatHappened}
							maxLength={FEEDBACK_HAPPENED_MAX_LENGTH}
							required
							onChange={(event) => setWhatHappened(event.target.value)}
							placeholder="Describe the moment you observed."
						/>
					</label>
					<label>
						<span>What did you expect? (optional)</span>
						<textarea
							className="feedback-expected"
							value={whatExpected}
							maxLength={FEEDBACK_EXPECTED_MAX_LENGTH}
							onChange={(event) => setWhatExpected(event.target.value)}
							placeholder="What would you have expected instead?"
						/>
					</label>
					<label>
						<span>Optional image</span>
						<input
							ref={attachmentInput}
							type="file"
							accept="image/png,image/jpeg,image/webp"
							onChange={(event) =>
								void prepareAttachment(event.target.files?.[0])
							}
						/>
					</label>
					{attachment && (
						<figure className="feedback-preview-frame">
							<img
								className="feedback-preview"
								src={attachment.dataUrl}
								alt="Exact sanitized preview that will be saved with this report"
							/>
							<figcaption>
								This is the exact re-encoded image saved with the local report.
							</figcaption>
							<button
								type="button"
								onClick={() => {
									setAttachment(null);
									setAttachmentStatus("");
									if (attachmentInput.current !== null)
										attachmentInput.current.value = "";
								}}
							>
								Remove image
							</button>
						</figure>
					)}
					{attachmentStatus && <p role="status">{attachmentStatus}</p>}
					<label className="feedback-consent">
						<input
							type="checkbox"
							checked={includeDiagnostics}
							onChange={(event) => setIncludeDiagnostics(event.target.checked)}
						/>
						<span>
							Include bounded structured diagnostics in this report (optional;
							off until checked). Checking this turns on Alpha capture in this
							tab. It never includes raw world state, prompts, hidden reasoning,
							credentials, or browser history.
						</span>
					</label>
					<label className="feedback-consent feedback-unavailable">
						<input type="checkbox" disabled />
						<span>
							Attach recent replay (unavailable). This build does not capture
							replay data for feedback reports.
						</span>
					</label>
					<div className="feedback-actions">
						<button
							type="button"
							className="primary-action"
							disabled={whatHappened.trim().length === 0}
							onClick={save}
						>
							Save feedback locally
						</button>
						{queuedReports.length > 0 && (
							<button
								type="button"
								disabled
								title="No feedback relay is configured"
							>
								Retry upload (relay unavailable)
							</button>
						)}
						{queuedReports.length > 0 && (
							<button
								type="button"
								onClick={() => {
									queue.clear();
									setQueuedReports([]);
									setStatus("Deleted all locally queued feedback.");
								}}
							>
								Delete queued feedback ({queuedReports.length})
							</button>
						)}
					</div>
					{queuedReports.length > 0 && (
						<section className="feedback-queue" aria-label="Saved feedback">
							<p>
								{queuedReports.length} unsent local{" "}
								{queuedReports.length === 1 ? "report" : "reports"}. Reports
								expire after seven days unless you delete them sooner.
							</p>
							<ul>
								{queuedReports.map((report) => (
									<li key={report.reportId}>
										<span>{report.category} · local only</span>
										<button
											type="button"
											onClick={() => {
												setQueuedReports(queue.remove(report.reportId));
												setStatus("Deleted one locally saved report.");
											}}
										>
											Delete this report
										</button>
									</li>
								))}
							</ul>
						</section>
					)}
					{status && (
						<p className="feedback-status" role="status">
							{status}
						</p>
					)}
				</div>
			)}
		</section>
	);
}
