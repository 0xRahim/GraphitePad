"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Art, ArtKind, Library, Project } from "@/src/shared/types";
import { nowIso } from "@/src/shared/types";
import { createStorage, type StorageAdapter, type SaveArtResult } from "@/lib/storage";
import {
	makeArt,
	makeProject,
	projectOf,
} from "@/lib/library";
import { defaultArtState } from "@/lib/studios/defaults";
import { useToast } from "@/components/Toast";

type LibraryApi = {
	library: Library;
	loading: boolean;
	error: string | null;
	storage: StorageAdapter;
	reload: () => Promise<void>;
	createProject: (name: string) => Promise<Project>;
	createArt: (projectId: string, name: string, kind: ArtKind) => Promise<Art>;
	renameProject: (id: string, name: string) => Promise<void>;
	renameArt: (id: string, name: string) => Promise<void>;
	toggleStar: (id: string) => Promise<void>;
	setProjectStatus: (
		id: string,
		status: "drop" | "trash" | "restore" | "delete",
	) => Promise<void>;
	setArtStatus: (
		id: string,
		status: "drop" | "trash" | "restore" | "delete",
	) => Promise<void>;
	markOpened: (id: string) => Promise<void>;
	saveArtContent: (
		id: string,
		content: unknown,
		thumbnail?: string,
	) => Promise<SaveArtResult>;
	openDataFolder: () => Promise<void>;
};

const LibraryContext = createContext<LibraryApi | null>(null);

export function useLibrary() {
	const ctx = useContext(LibraryContext);
	if (!ctx) throw new Error("useLibrary must be used inside LibraryProvider");
	return ctx;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
	const toast = useToast();
	const storage = useMemo(() => createStorage(), []);
	const [library, setLibrary] = useState<Library>({
		version: 1,
		projects: [],
		arts: [],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const libRef = useRef(library);
	const saveChain = useRef<Promise<unknown>>(Promise.resolve());

	const apply = useCallback((next: Library) => {
		libRef.current = next;
		setLibrary(next);
	}, []);

	const persist = useCallback(
		(next: Library) => {
			const run = saveChain.current.then(
				() => storage.saveLibrary(next),
				() => storage.saveLibrary(next),
			);
			saveChain.current = run.catch(() => undefined);
			return run;
		},
		[storage],
	);

	const mutate = useCallback(
		(fn: (current: Library) => Library | null): Library | null => {
			const current = libRef.current;
			const next = fn(current);
			if (!next) return null;
			apply(next);
			persist(next).catch((e: unknown) => {
				toast.show(
					`Couldn't save library: ${e instanceof Error ? e.message : "unknown error"}`,
					{ tone: "error" },
				);
			});
			return next;
		},
		[apply, persist, toast],
	);

	const reload = useCallback(async () => {
		try {
			const loaded = await storage.loadLibrary();
			apply(loaded);
			setError(null);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Couldn't read the library");
		} finally {
			setLoading(false);
		}
	}, [apply, storage]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const createProject = useCallback(
		async (name: string) => {
			const project = makeProject(name);
			const next = mutate((lib) => ({
				...lib,
				projects: [project, ...lib.projects],
			}));
			if (next) {
				await persist(next).catch(() => undefined);
				toast.show("Project created");
			}
			return project;
		},
		[mutate, persist, toast],
	);

	const createArt = useCallback(
		async (projectId: string, name: string, kind: ArtKind) => {
			const art = makeArt(projectId, name, kind);
			const next = mutate((lib) => ({
				...lib,
				arts: [art, ...lib.arts],
				projects: lib.projects.map((p) =>
					p.id === projectId ? { ...p, updatedAt: art.createdAt } : p,
				),
			}));
			if (next) await persist(next).catch(() => undefined);
			await storage.saveArt(art.id, defaultArtState(kind));
			return art;
		},
		[mutate, persist, storage],
	);

	const renameProject = useCallback(
		async (id: string, name: string) => {
			const clean = name.trim().slice(0, 80);
			if (!clean) return;
			const next = mutate((lib) => ({
				...lib,
				projects: lib.projects.map((p) =>
					p.id === id ? { ...p, name: clean, updatedAt: nowIso() } : p,
				),
			}));
			if (next) await persist(next).catch(() => undefined);
		},
		[mutate, persist],
	);

	const renameArt = useCallback(
		async (id: string, name: string) => {
			const clean = name.trim().slice(0, 80);
			if (!clean) return;
			const next = mutate((lib) => ({
				...lib,
				arts: lib.arts.map((a) =>
					a.id === id ? { ...a, name: clean, updatedAt: nowIso() } : a,
				),
			}));
			if (next) await persist(next).catch(() => undefined);
		},
		[mutate, persist],
	);

	const toggleStar = useCallback(
		async (id: string) => {
			const next = mutate((lib) => ({
				...lib,
				arts: lib.arts.map((a) =>
					a.id === id ? { ...a, starred: !a.starred, updatedAt: nowIso() } : a,
				),
			}));
			if (next) await persist(next).catch(() => undefined);
		},
		[mutate, persist],
	);

	const setProjectStatus = useCallback(
		async (id: string, status: "drop" | "trash" | "restore" | "delete") => {
			const current = libRef.current;
			const project = current.projects.find((p) => p.id === id);
			if (!project) return;
			if (status === "delete") {
				const arts = current.arts.filter((a) => a.projectId === id);
				await Promise.all(arts.map((a) => storage.deleteArt(a.id).catch(() => undefined)));
				const next = mutate((lib) => ({
					...lib,
					projects: lib.projects.filter((p) => p.id !== id),
					arts: lib.arts.filter((a) => a.projectId !== id),
				}));
				if (next) await persist(next).catch(() => undefined);
				return;
			}
			const time = nowIso();
			const next = mutate((lib) => ({
				...lib,
				projects: lib.projects.map((p) => {
					if (p.id !== id) return p;
					if (status === "drop")
						return { ...p, droppedAt: time, updatedAt: time };
					if (status === "trash")
						return { ...p, deletedAt: time, updatedAt: time };
					return { ...p, droppedAt: null, deletedAt: null, updatedAt: time };
				}),
			}));
			if (next) await persist(next).catch(() => undefined);
		},
		[mutate, persist, storage],
	);

	const setArtStatus = useCallback(
		async (id: string, status: "drop" | "trash" | "restore" | "delete") => {
			if (status === "delete") {
				await storage.deleteArt(id).catch(() => undefined);
				const next = mutate((lib) => ({
					...lib,
					arts: lib.arts.filter((a) => a.id !== id),
				}));
				if (next) await persist(next).catch(() => undefined);
				return;
			}
			const time = nowIso();
			const next = mutate((lib) => ({
				...lib,
				arts: lib.arts.map((a) => {
					if (a.id !== id) return a;
					if (status === "drop")
						return { ...a, droppedAt: time, updatedAt: time };
					if (status === "trash")
						return { ...a, deletedAt: time, updatedAt: time };
					return { ...a, droppedAt: null, deletedAt: null, updatedAt: time };
				}),
			}));
			if (next) await persist(next).catch(() => undefined);
		},
		[mutate, persist, storage],
	);

	const markOpened = useCallback(
		async (id: string) => {
			const next = mutate((lib) => ({
				...lib,
				arts: lib.arts.map((a) =>
					a.id === id ? { ...a, lastOpenedAt: nowIso() } : a,
				),
			}));
			if (next) await persist(next).catch(() => undefined);
		},
		[mutate, persist],
	);

	const saveArtContent = useCallback(
		async (id: string, content: unknown, thumbnail?: string) => {
			const result = await storage.saveArt(id, content, thumbnail);
			const art = libRef.current.arts.find((a) => a.id === id);
			if (art) {
				libRef.current = {
					...libRef.current,
					arts: libRef.current.arts.map((a) =>
						a.id === id
							? {
									...a,
									updatedAt: result.updatedAt,
									thumbnail: result.thumbnail ?? a.thumbnail,
								}
							: a,
					),
				};
			}
			return result;
		},
		[storage],
	);

	const openDataFolder = useCallback(async () => {
		try {
			await storage.openDataFolder();
		} catch (e) {
			toast.show(e instanceof Error ? e.message : "Couldn't open data folder", {
				tone: "error",
			});
		}
	}, [storage, toast]);

	useEffect(() => {
		if (library.version !== 1) return;
		const title =
			"GraphitePad" + (library.projects.length ? ` — ${library.projects.length} projects` : "");
		void storage.setTitle(title);
	}, [library.projects.length, storage]);

	const value = useMemo<LibraryApi>(
		() => ({
			library,
			loading,
			error,
			storage,
			reload,
			createProject,
			createArt,
			renameProject,
			renameArt,
			toggleStar,
			setProjectStatus,
			setArtStatus,
			markOpened,
			saveArtContent,
			openDataFolder,
		}),
		[
			library,
			loading,
			error,
			storage,
			reload,
			createProject,
			createArt,
			renameProject,
			renameArt,
			toggleStar,
			setProjectStatus,
			setArtStatus,
			markOpened,
			saveArtContent,
			openDataFolder,
		],
	);

	return (
		<LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
	);
}

export function useArtProject(art: Art | null): Project | undefined {
	const { library } = useLibrary();
	return art ? projectOf(library, art) : undefined;
}
