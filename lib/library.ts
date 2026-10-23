import type { Art, ArtKind, Library, Project } from "@/src/shared/types";
import { emptyLibrary, newId, nowIso } from "@/src/shared/types";

export type ViewName = "projects" | "starred" | "dropped" | "trash";

export type Route =
	| { name: ViewName }
	| { name: "project"; id: string }
	| { name: "studio"; id: string };

export function parseHash(hash: string): Route {
	const clean = hash.replace(/^#\/?/, "");
	const [head, id] = clean.split("/");
	if (head === "project" && id) return { name: "project", id };
	if (head === "studio" && id) return { name: "studio", id };
	if (head === "starred" || head === "dropped" || head === "trash") {
		return { name: head };
	}
	return { name: "projects" };
}

export function routeHash(route: Route) {
	if (route.name === "project") return `#/project/${route.id}`;
	if (route.name === "studio") return `#/studio/${route.id}`;
	return `#/${route.name}`;
}

export const byUpdated = (a: { updatedAt: string }, b: { updatedAt: string }) =>
	b.updatedAt.localeCompare(a.updatedAt);

export const activeProjects = (lib: Library) =>
	lib.projects.filter((p) => !p.droppedAt && !p.deletedAt);

export const activeArts = (lib: Library) => {
	const ids = new Set(activeProjects(lib).map((p) => p.id));
	return lib.arts.filter(
		(a) => !a.droppedAt && !a.deletedAt && ids.has(a.projectId),
	);
};

export const recentArts = (lib: Library, limit = 8) =>
	activeArts(lib)
		.slice()
		.sort((a, b) =>
			(b.lastOpenedAt ?? b.updatedAt).localeCompare(
				a.lastOpenedAt ?? a.updatedAt,
			),
		)
		.slice(0, limit);

export const starredArts = (lib: Library) =>
	activeArts(lib)
		.filter((a) => a.starred)
		.sort(byUpdated);

export const droppedProjects = (lib: Library) =>
	lib.projects
		.filter((p) => p.droppedAt && !p.deletedAt)
		.sort((a, b) => (b.droppedAt ?? "").localeCompare(a.droppedAt ?? ""));

export const droppedArts = (lib: Library) => {
	const ids = new Set(activeProjects(lib).map((p) => p.id));
	return lib.arts
		.filter((a) => a.droppedAt && !a.deletedAt && ids.has(a.projectId))
		.sort((a, b) => (b.droppedAt ?? "").localeCompare(a.droppedAt ?? ""));
};

export const trashedProjects = (lib: Library) =>
	lib.projects
		.filter((p) => p.deletedAt)
		.sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));

export const trashedArts = (lib: Library) => {
	const ids = new Set(activeProjects(lib).map((p) => p.id));
	return lib.arts
		.filter((a) => a.deletedAt && ids.has(a.projectId))
		.sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
};

export const artsForProject = (lib: Library, projectId: string) =>
	lib.arts
		.filter((a) => a.projectId === projectId && !a.deletedAt && !a.droppedAt)
		.sort(byUpdated);

export const artsInProject = (lib: Library, projectId: string) =>
	lib.arts.filter((a) => a.projectId === projectId).sort(byUpdated);

export function projectOf(lib: Library, art: Art): Project | undefined {
	return lib.projects.find((p) => p.id === art.projectId);
}

export function makeProject(name: string): Project {
	const time = nowIso();
	return {
		id: newId(),
		name: name.trim() || "Untitled Project",
		createdAt: time,
		updatedAt: time,
		droppedAt: null,
		deletedAt: null,
	};
}

export function makeArt(projectId: string, name: string, kind: ArtKind): Art {
	const time = nowIso();
	return {
		id: newId(),
		projectId,
		name: name.trim() || (kind === "sketch" ? "Untitled Sketch" : "Untitled Pixel"),
		kind,
		createdAt: time,
		updatedAt: time,
		lastOpenedAt: time,
		starred: false,
		droppedAt: null,
		deletedAt: null,
		thumbnail: null,
	};
}

export function defaultLibrary() {
	return emptyLibrary();
}
