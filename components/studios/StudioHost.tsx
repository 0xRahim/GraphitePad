"use client";

import { useEffect, useRef, useState } from "react";
import type { Art } from "@/src/shared/types";
import type { StorageAdapter, SaveArtResult } from "@/lib/storage";
import { SketchStudio } from "@/components/studios/SketchStudio";
import { PixelStudio } from "@/components/studios/PixelStudio";

type StudioProps = {
	initialData: unknown;
	onBack: () => void;
	onSave: (content: unknown, thumbnail?: string) => Promise<SaveArtResult>;
	onExport: (filename: string, dataUrl: string) => Promise<{ path?: string }>;
	onReveal: (path: string) => Promise<void>;
};

export function StudioHost({
	art,
	onBack,
	storage,
	saveArtContent,
}: {
	art: Art;
	onBack: () => void;
	storage: StorageAdapter;
	saveArtContent: (
		id: string,
		content: unknown,
		thumbnail?: string,
	) => Promise<SaveArtResult>;
}) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [initialData, setInitialData] = useState<unknown>(null);
	const current = useRef({ saveArtContent, storage });
	current.current = { saveArtContent, storage };

	useEffect(() => {
		let alive = true;
		setLoading(true);
		setError(null);
		storage
			.loadArt(art.id)
			.then((envelope) => {
				if (!alive) return;
				if (!envelope) throw new Error("Artwork data is missing.");
				setInitialData(envelope.data);
				setLoading(false);
			})
			.catch((e) => {
				if (!alive) return;
				setError(e instanceof Error ? e.message : "Couldn't open the art");
				setLoading(false);
			});
		return () => {
			alive = false;
		};
	}, [art.id, storage]);

	const save = async (content: unknown, thumbnail?: string) =>
		current.current.saveArtContent(art.id, content, thumbnail);

	const exportPng = async (filename: string, dataUrl: string) =>
		current.current.storage.exportPng(filename, dataUrl);

	if (loading) return <div className="studio-loading">Opening art…</div>;
	if (error)
		return (
			<div className="studio-loading">
				<p>{error}</p>
				<button className="btn" onClick={onBack}>
					‹ Back to project
				</button>
			</div>
		);

	const common: StudioProps = {
		initialData,
		onBack,
		onSave: save,
		onExport: exportPng,
		onReveal: (path) => current.current.storage.revealPath(path),
	};

	return art.kind === "sketch" ? (
		<SketchStudio art={art} {...common} />
	) : (
		<PixelStudio art={art} {...common} />
	);
}
