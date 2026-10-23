import type { ArtEnvelope, Library } from "@/src/shared/types";
import { emptyLibrary } from "@/src/shared/types";

const browserLibraryKey = "graphitepad:library:v1";
const browserArtKey = (id: string) => `graphitepad:art:${id}`;

function readBrowserLibrary(): Library {
	try {
		const raw = localStorage.getItem(browserLibraryKey);
		if (!raw) return emptyLibrary();
		const parsed = JSON.parse(raw) as Library;
		if (!parsed || parsed.version !== 1) return emptyLibrary();
		return parsed;
	} catch {
		return emptyLibrary();
	}
}

function writeBrowserLibrary(lib: Library) {
	localStorage.setItem(browserLibraryKey, JSON.stringify(lib));
}

export type SaveArtResult = {
	updatedAt: string;
	thumbnail: string | null;
};

export type StorageAdapter = {
	desktop: boolean;
	loadLibrary(): Promise<Library>;
	saveLibrary(lib: Library): Promise<void>;
	loadArt(id: string): Promise<ArtEnvelope | null>;
	saveArt(id: string, content: unknown, thumbnail?: string): Promise<SaveArtResult>;
	deleteArt(id: string): Promise<void>;
	exportPng(filename: string, dataUrl: string): Promise<{ path?: string }>;
	revealPath(path: string): Promise<void>;
	openDataFolder(): Promise<void>;
	setTitle(title: string): Promise<void>;
};

function makeBrowserAdapter(): StorageAdapter {
	return {
		desktop: false,
		async loadLibrary() {
			return readBrowserLibrary();
		},
		async saveLibrary(lib) {
			writeBrowserLibrary(lib);
		},
		async loadArt(id) {
			try {
				const raw = localStorage.getItem(browserArtKey(id));
				return raw ? (JSON.parse(raw) as ArtEnvelope) : null;
			} catch {
				return null;
			}
		},
		async saveArt(id, content, thumbnail) {
			const now = new Date().toISOString();
			const envelope: ArtEnvelope = {
				version: 1,
				kind: (content as { kind?: "sketch" | "pixel" })?.kind ?? "sketch",
				updatedAt: now,
				data: content,
			};
			localStorage.setItem(browserArtKey(id), JSON.stringify(envelope));
			const lib = readBrowserLibrary();
			const art = lib.arts.find((a) => a.id === id);
			if (art) {
				art.updatedAt = now;
				if (thumbnail) art.thumbnail = thumbnail;
				writeBrowserLibrary(lib);
			}
			return { updatedAt: now, thumbnail: art?.thumbnail ?? null };
		},
		async deleteArt(id) {
			localStorage.removeItem(browserArtKey(id));
		},
		async exportPng(filename, dataUrl) {
			const a = document.createElement("a");
			a.href = dataUrl;
			a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
			a.click();
			return {};
		},
		async revealPath() {},
		async openDataFolder() {},
		async setTitle(title) {
			document.title = title;
		},
	};
}

function makeDesktopAdapter(apiBase: string, token: string): StorageAdapter {
	const request = async (path: string, init?: RequestInit) => {
		const res = await fetch(`${apiBase}${path}`, {
			...init,
			headers: {
				"Content-Type": "application/json",
				"X-GraphitePad-Token": token,
				...(init?.headers ?? {}),
			},
		});
		if (!res.ok) {
			let message = `Request failed (${res.status})`;
			try {
				const body = (await res.json()) as { error?: string };
				if (body.error) message = body.error;
			} catch {
				// keep fallback
			}
			throw new Error(message);
		}
		return res;
	};
	const cleanThumb = (src: string | null) => {
		if (!src || src.startsWith("data:")) return src;
		try {
			const url = new URL(src, window.location.href);
			if (url.pathname.startsWith("/api/thumb/")) {
				const v = url.searchParams.get("v");
				return `${url.pathname}${v ? `?v=${encodeURIComponent(v)}` : ""}`;
			}
		} catch {
			// Keep external thumbnails untouched.
		}
		return src;
	};
	const thumbUrl = (src: string) =>
		`${apiBase}${src}${src.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
	const normalizeThumb = (lib: Library): Library => ({
		...lib,
		arts: lib.arts.map((art) => ({
			...art,
			thumbnail:
				art.thumbnail && art.thumbnail.startsWith("/api/")
					? thumbUrl(art.thumbnail)
					: art.thumbnail,
		})),
	});
	return {
		desktop: true,
		async loadLibrary() {
			const res = await request("/api/library");
			return normalizeThumb((await res.json()) as Library);
		},
		async saveLibrary(lib) {
			const diskLib: Library = {
				...lib,
				arts: lib.arts.map((art) => ({
					...art,
					thumbnail: cleanThumb(art.thumbnail),
				})),
			};
			await request("/api/library", {
				method: "PUT",
				body: JSON.stringify(diskLib),
			});
		},
		async loadArt(id) {
			const res = await request(`/api/art/${encodeURIComponent(id)}`);
			return (await res.json()) as ArtEnvelope | null;
		},
		async saveArt(id, content, thumbnail) {
			const res = await request(`/api/art/${encodeURIComponent(id)}`, {
				method: "PUT",
				body: JSON.stringify({ content, thumbnail }),
			});
			const body = (await res.json()) as {
				updatedAt: string;
				thumbnail: string | null;
			};
			return {
				...body,
				thumbnail:
					body.thumbnail && body.thumbnail.startsWith("/api/")
						? thumbUrl(body.thumbnail)
						: body.thumbnail,
			};
		},
		async deleteArt(id) {
			await request(`/api/art/${encodeURIComponent(id)}`, { method: "DELETE" });
		},
		async exportPng(filename, dataUrl) {
			const res = await request("/api/export", {
				method: "POST",
				body: JSON.stringify({ filename, dataUrl }),
			});
			return (await res.json()) as { path?: string };
		},
		async revealPath(path) {
			await request("/api/reveal", {
				method: "POST",
				body: JSON.stringify({ path }),
			});
		},
		async openDataFolder() {
			await request("/api/open-data", { method: "POST" });
		},
		async setTitle(title) {
			await request("/api/title", {
				method: "POST",
				body: JSON.stringify({ title }),
			}).catch(() => undefined);
		},
	};
}

export function createStorage(): StorageAdapter {
	if (typeof window === "undefined") return makeBrowserAdapter();
	const params = new URLSearchParams(window.location.search);
	const apiBase = params.get("api") ?? "";
	const token = params.get("token") ?? "";
	if (apiBase || token) return makeDesktopAdapter(apiBase, token);
	return makeBrowserAdapter();
}
