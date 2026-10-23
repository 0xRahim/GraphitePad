import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Utils } from "electrobun/main";
import type { ArtEnvelope, Library } from "../shared/types";
import { emptyLibrary } from "../shared/types";

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,80}$/;

let queue: Promise<unknown> = Promise.resolve();
let cachedRoot: string | null = null;

export function dataRoot() {
	if (!cachedRoot) cachedRoot = join(Utils.paths.userData, "library");
	return cachedRoot;
}

export function isValidId(id: string) {
	return ID_RE.test(id);
}

async function ensureDirs() {
	const root = dataRoot();
	await mkdir(join(root, "arts"), { recursive: true });
	await mkdir(join(root, "thumbs"), { recursive: true });
	return root;
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
	const run = queue.then(fn, fn);
	queue = run.catch(() => undefined);
	return run;
}

async function readJson<T>(path: string): Promise<T | null> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch {
		return null;
	}
}

async function writeJsonAtomic(path: string, value: unknown) {
	await mkdir(dirname(path), { recursive: true });
	const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
	await writeFile(tmp, JSON.stringify(value), "utf8");
	await rename(tmp, path);
}

export async function loadLibrary(): Promise<Library> {
	return enqueue(async () => {
		const root = await ensureDirs();
		const path = join(root, "library.json");
		const lib = await readJson<Library>(path);
		if (lib && Array.isArray(lib.projects) && Array.isArray(lib.arts)) {
			return lib;
		}
		const backup = await readJson<Library>(`${path}.bak`);
		if (backup && Array.isArray(backup.projects) && Array.isArray(backup.arts)) {
			return backup;
		}
		return emptyLibrary();
	});
}

export async function saveLibrary(library: Library): Promise<Library> {
	return enqueue(async () => {
		const root = await ensureDirs();
		const path = join(root, "library.json");
		const previous = await readJson<Library>(path);
		if (previous) {
			await writeFile(`${path}.bak`, JSON.stringify(previous), "utf8");
		}
		await writeJsonAtomic(path, library);
		return library;
	});
}

export async function loadArt(id: string): Promise<ArtEnvelope | null> {
	if (!isValidId(id)) throw new Error("Invalid art id");
	return enqueue(async () => {
		const root = await ensureDirs();
		return readJson<ArtEnvelope>(join(root, "arts", `${id}.json`));
	});
}

export type SaveArtResult = {
	ok: true;
	updatedAt: string;
	thumbnail: string | null;
};

export async function saveArt(
	id: string,
	content: unknown,
	thumbnail?: string,
): Promise<SaveArtResult> {
	if (!isValidId(id)) throw new Error("Invalid art id");
	const raw = JSON.stringify(content);
	if (raw.length > 120 * 1024 * 1024) {
		throw new Error("Artwork is too large to save (120MB limit)");
	}
	return enqueue(async () => {
		const root = await ensureDirs();
		const now = new Date().toISOString();
		const envelope: ArtEnvelope = {
			version: 1,
			kind: (content as { kind?: "sketch" | "pixel" })?.kind ?? "sketch",
			updatedAt: now,
			data: content,
		};
		await writeJsonAtomic(join(root, "arts", `${id}.json`), envelope);

		let thumbnailUrl: string | null = null;
		if (thumbnail && thumbnail.startsWith("data:image/")) {
			const comma = thumbnail.indexOf(",");
			if (comma > 0) {
				const b64 = thumbnail.slice(comma + 1);
				if (b64.length > 24 * 1024 * 1024) {
					throw new Error("Thumbnail is too large");
				}
				const png = Buffer.from(b64, "base64");
				await writeFile(join(root, "thumbs", `${id}.png`), png);
				thumbnailUrl = `/api/thumb/${id}?v=${Date.now()}`;
			}
		}

		const lib = (await readJson<Library>(join(root, "library.json"))) ?? emptyLibrary();
		const art = lib.arts.find((a) => a.id === id);
		if (art) {
			art.updatedAt = now;
			if (thumbnailUrl) art.thumbnail = thumbnailUrl;
			await writeJsonAtomic(join(root, "library.json"), lib);
		}
		return {
			ok: true as const,
			updatedAt: now,
			thumbnail: art?.thumbnail ?? null,
		};
	});
}

export async function deleteArtFile(id: string) {
	if (!isValidId(id)) throw new Error("Invalid art id");
	return enqueue(async () => {
		const root = await ensureDirs();
		await unlink(join(root, "arts", `${id}.json`)).catch(() => undefined);
		await unlink(join(root, "thumbs", `${id}.png`)).catch(() => undefined);
		return { ok: true };
	});
}

export async function readThumb(id: string) {
	if (!isValidId(id)) return null;
	const path = join(dataRoot(), "thumbs", `${id}.png`);
	try {
		return await readFile(path);
	} catch {
		return null;
	}
}

function safeFilename(name: string) {
	const cleaned = name
		.replace(/[\\/:*?"<>|]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 120);
	return cleaned || "artwork";
}

export async function exportPng(filename: string, dataUrl: string) {
	const comma = dataUrl.indexOf(",");
	if (comma < 0 || !dataUrl.startsWith("data:image/png;base64,")) {
		throw new Error("Expected a PNG data URL");
	}
	const buffer = Buffer.from(dataUrl.slice(comma + 1), "base64");
	const dir = join(Utils.paths.pictures, "GraphitePad");
	await mkdir(dir, { recursive: true });
	const name = `${safeFilename(filename.replace(/\.png$/i, ""))}.png`;
	const path = join(dir, name);
	await writeFile(path, buffer);
	return { ok: true as const, path };
}

export async function revealPath(pathToReveal: string) {
	const root = dataRoot();
	const pictures = join(Utils.paths.pictures, "GraphitePad");
	if (!pathToReveal.startsWith(root) && !pathToReveal.startsWith(pictures)) {
		throw new Error("Refusing to reveal a path outside GraphitePad");
	}
	const utils = Utils as unknown as {
		showItemInFolder?: (p: string) => void;
		openPath?: (p: string) => void;
	};
	if (utils.showItemInFolder) {
		utils.showItemInFolder(pathToReveal);
	} else if (utils.openPath) {
		utils.openPath(dirname(pathToReveal));
	}
	return { ok: true as const };
}

export async function openDataFolder() {
	const utils = Utils as unknown as { openPath?: (p: string) => void };
	await mkdir(dataRoot(), { recursive: true });
	utils.openPath?.(dataRoot());
	return { ok: true as const };
}
