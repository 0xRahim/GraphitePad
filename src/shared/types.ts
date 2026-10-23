export type ArtKind = "sketch" | "pixel";

export type Project = {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	droppedAt: string | null;
	deletedAt: string | null;
};

export type Art = {
	id: string;
	projectId: string;
	name: string;
	kind: ArtKind;
	createdAt: string;
	updatedAt: string;
	lastOpenedAt: string | null;
	starred: boolean;
	droppedAt: string | null;
	deletedAt: string | null;
	thumbnail: string | null;
};

export type Library = {
	version: 1;
	projects: Project[];
	arts: Art[];
};

export type ArtEnvelope = {
	version: 1;
	kind: ArtKind;
	updatedAt: string;
	data: unknown;
};

export type SketchState = Record<string, unknown>;
export type PixelState = Record<string, unknown>;

export const emptyLibrary = (): Library => ({
	version: 1,
	projects: [],
	arts: [],
});

export const newId = () =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const nowIso = () => new Date().toISOString();
