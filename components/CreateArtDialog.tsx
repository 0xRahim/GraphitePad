"use client";

import { useState } from "react";
import type { ArtKind, Project } from "@/src/shared/types";
import { Modal } from "@/components/UI";

const TYPES: Array<{
	kind: ArtKind;
	title: string;
	tagline: string;
	features: string[];
}> = [
	{
		kind: "sketch",
		title: "Sketch",
		tagline: "Graphite, charcoal, ink — freehand drawing on paper.",
		features: ["7 brushes and erasers", "Layers, guides and references", "Steady strokes and mirroring"],
	},
	{
		kind: "pixel",
		title: "Pixel",
		tagline: "Crisp pixels, palettes, and animation frames.",
		features: ["Infinite pixel canvas", "DB32 and classic palettes", "Timeline, tiling and symmetry"],
	},
];

export function CreateArtDialog({
	project,
	onClose,
	onCreate,
}: {
	project: Project;
	onClose: () => void;
	onCreate: (kind: ArtKind, name: string) => Promise<void>;
}) {
	const [kind, setKind] = useState<ArtKind>("sketch");
	const [name, setName] = useState("Untitled Sketch");
	const [touched, setTouched] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const choose = (next: ArtKind) => {
		setKind(next);
		if (!touched) {
			setName(next === "sketch" ? "Untitled Sketch" : "Untitled Pixel");
		}
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		if (!name.trim()) {
			setError("Give the artwork a name first.");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			await onCreate(kind, name.trim());
			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Couldn't create the art");
			setBusy(false);
		}
	};

	return (
		<Modal title="Create new art" onClose={onClose}>
			<form className="modal-body" onSubmit={submit}>
				<p className="modal-copy">
					Choose a studio for <strong>{project.name}</strong>.
				</p>
				<div className="type-grid" role="radiogroup" aria-label="Art type">
					{TYPES.map((type) => (
						<button
							type="button"
							key={type.kind}
							role="radio"
							aria-checked={kind === type.kind}
							className={`type-card ${kind === type.kind ? "on" : ""}`}
							onClick={() => choose(type.kind)}
						>
							<span className="type-top">
								<span className="type-title">{type.title}</span>
								<span className="type-mark">{kind === type.kind ? "Selected" : ""}</span>
							</span>
							<span className="type-tagline">{type.tagline}</span>
							<span className="type-features">
								{type.features.map((feature) => (
									<span key={feature}>{feature}</span>
								))}
							</span>
						</button>
					))}
				</div>
				<label className="field">
					<span>Name</span>
					<input
						value={name}
						maxLength={80}
						onChange={(event) => {
							setTouched(true);
							setName(event.target.value);
						}}
					/>
				</label>
				{error ? <p className="form-error">{error}</p> : null}
				<div className="modal-actions">
					<button type="button" className="btn" onClick={onClose} disabled={busy}>
						Cancel
					</button>
					<button type="submit" className="btn on" disabled={busy || !name.trim()}>
						{busy ? "Creating…" : "+ Create Art"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
