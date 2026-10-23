"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Art, ArtKind, Project } from "@/src/shared/types";
import type { Route, ViewName } from "@/lib/library";
import { parseHash, routeHash } from "@/lib/library";
import { useLibrary } from "@/components/LibraryProvider";
import { LibraryProvider } from "@/components/LibraryProvider";
import { ToastProvider, useToast } from "@/components/Toast";
import { Sidebar } from "@/components/LibraryUI";
import {
	DroppedView,
	ProjectView,
	ProjectsView,
	StarredView,
	TrashView,
	type LibraryActions,
} from "@/components/LibraryViews";
import { PromptModal, ConfirmModal } from "@/components/UI";
import { CreateArtDialog } from "@/components/CreateArtDialog";
import { StudioHost } from "@/components/studios/StudioHost";

type Dialog =
	| { type: "new-project" }
	| { type: "rename-project"; project: Project }
	| { type: "rename-art"; art: Art }
	| { type: "new-art"; project: Project }
	| { type: "delete-project"; project: Project }
	| { type: "delete-art"; art: Art }
	| null;

function useHashRoute() {
	const [route, setRoute] = useState<Route>({ name: "projects" });
	useEffect(() => {
		const update = () => setRoute(parseHash(window.location.hash));
		update();
		window.addEventListener("hashchange", update);
		return () => window.removeEventListener("hashchange", update);
	}, []);
	const navigate = useCallback((next: Route) => {
		const hash = routeHash(next);
		if (window.location.hash === hash) {
			setRoute(next);
		} else {
			window.location.hash = hash;
		}
	}, []);
	return { route, navigate };
}

function LibraryApp() {
	const { route, navigate } = useHashRoute();
	const {
		library,
		loading,
		error,
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
		storage,
	} = useLibrary();
	const toast = useToast();
	const [dialog, setDialog] = useState<Dialog>(null);
	const routeKey = route.name === "project" || route.name === "studio" ? `${route.name}:${route.id}` : route.name;
	const previousRoute = useRef<string>("");

	useEffect(() => {
		if (previousRoute.current && previousRoute.current !== routeKey) {
			if (!routeKey.startsWith("studio:")) void reload();
		}
		previousRoute.current = routeKey;
	}, [routeKey, reload]);

	useEffect(() => {
		if (route.name === "project") {
			const project = library.projects.find((p) => p.id === route.id);
			void storage.setTitle(
				project ? `GraphitePad — ${project.name}` : "GraphitePad — Project",
			);
		} else if (route.name === "studio") {
			const art = library.arts.find((a) => a.id === route.id);
			void storage.setTitle(art ? `GraphitePad — ${art.name}` : "GraphitePad");
		} else {
			void storage.setTitle("GraphitePad");
		}
	}, [route, library.arts, library.projects, storage]);

	const go = useCallback(
		(name: ViewName) => {
			navigate({ name });
			setDialog(null);
		},
		[navigate],
	);

	const openProject = useCallback(
		(project: Project) => {
			if (!project.id) return go("projects");
			navigate({ name: "project", id: project.id });
		},
		[go, navigate],
	);

	const openArt = useCallback(
		(art: Art) => {
			void markOpened(art.id);
			navigate({ name: "studio", id: art.id });
		},
		[markOpened, navigate],
	);

	const actions = useMemo<LibraryActions>(
		() => ({
			goProjects: () => go("projects"),
			openArt,
			openProject,
			newProject: () => setDialog({ type: "new-project" }),
			newArt: (project) => setDialog({ type: "new-art", project }),
			starArt: (art) => void toggleStar(art.id),
			renameArt: (art) => setDialog({ type: "rename-art", art }),
			dropArt: (art) => {
				void setArtStatus(art.id, "drop").then(() =>
					toast.show("Art moved to Dropped", {
						actionLabel: "Undo",
						onAction: () => void setArtStatus(art.id, "restore"),
					}),
				);
			},
			trashArt: (art) => {
				void setArtStatus(art.id, "trash").then(() =>
					toast.show("Art moved to Trash", {
						actionLabel: "Undo",
						onAction: () => void setArtStatus(art.id, "restore"),
					}),
				);
			},
			restoreArt: (art) => {
				void setArtStatus(art.id, "restore").then(() =>
					toast.show("Art restored"),
				);
			},
			deleteArt: (art) => setDialog({ type: "delete-art", art }),
			renameProject: (project) => setDialog({ type: "rename-project", project }),
			dropProject: (project) => {
				void setProjectStatus(project.id, "drop").then(() =>
					toast.show("Project moved to Dropped", {
						actionLabel: "Undo",
						onAction: () => void setProjectStatus(project.id, "restore"),
					}),
				);
			},
			trashProject: (project) => {
				void setProjectStatus(project.id, "trash").then(() =>
					toast.show("Project moved to Trash", {
						actionLabel: "Undo",
						onAction: () => void setProjectStatus(project.id, "restore"),
					}),
				);
			},
			restoreProject: (project) => {
				void setProjectStatus(project.id, "restore").then(() =>
					toast.show("Project restored"),
				);
			},
			deleteProject: (project) => setDialog({ type: "delete-project", project }),
		}),
		[go, openArt, openProject, setArtStatus, setProjectStatus, toast, toggleStar],
	);

	if (route.name === "studio") {
		const art = library.arts.find((a) => a.id === route.id);
		if (!art) {
			return (
				<div className="studio-missing">
					<p>Art not found.</p>
					<button className="btn" onClick={() => go("projects")}>
						‹ Projects
					</button>
				</div>
			);
		}
		return (
			<StudioHost
				art={art}
				onBack={() => navigate({ name: "project", id: art.projectId })}
				storage={storage}
				saveArtContent={saveArtContent}
			/>
		);
	}

	return (
		<div className="app">
			<Sidebar
				view={route.name === "project" ? "projects" : route.name}
				onNavigate={go}
				onNewProject={() => setDialog({ type: "new-project" })}
			/>
			<main className="main">
				{loading ? (
					<div className="center-note">Opening library…</div>
				) : error ? (
					<div className="center-note">
						<p>{error}</p>
						<button className="btn" onClick={() => void reload()}>
							Retry
						</button>
					</div>
				) : route.name === "projects" ? (
					<ProjectsView actions={actions} />
				) : route.name === "starred" ? (
					<StarredView actions={actions} />
				) : route.name === "dropped" ? (
					<DroppedView actions={actions} />
				) : route.name === "trash" ? (
					<TrashView actions={actions} />
				) : route.name === "project" ? (
					<ProjectView projectId={route.id} actions={actions} />
				) : (
					<ProjectsView actions={actions} />
				)}
			</main>

			{dialog?.type === "new-project" ? (
				<PromptModal
					title="New project"
					label="Project name"
					placeholder="Collection name"
					submitLabel="Create Project"
					onClose={() => setDialog(null)}
					onSubmit={async (name) => {
						const project = await createProject(name);
						go("projects");
						openProject(project);
					}}
				/>
			) : null}

			{dialog?.type === "rename-project" ? (
				<PromptModal
					title="Rename project"
					label="Project name"
					initial={dialog.project.name}
					submitLabel="Save"
					onClose={() => setDialog(null)}
					onSubmit={async (name) => {
						await renameProject(dialog.project.id, name);
					}}
				/>
			) : null}

			{dialog?.type === "rename-art" ? (
				<PromptModal
					title="Rename art"
					label="Art name"
					initial={dialog.art.name}
					submitLabel="Save"
					onClose={() => setDialog(null)}
					onSubmit={async (name) => {
						await renameArt(dialog.art.id, name);
					}}
				/>
			) : null}

			{dialog?.type === "new-art" ? (
				<CreateArtDialog
					project={dialog.project}
					onClose={() => setDialog(null)}
					onCreate={async (kind: ArtKind, name: string) => {
						const art = await createArt(dialog.project.id, name, kind);
						navigate({ name: "studio", id: art.id });
					}}
				/>
			) : null}

			{dialog?.type === "delete-project" ? (
				<ConfirmModal
					title="Delete project forever?"
					body={`“${dialog.project.name}” and every art inside it will be permanently removed. This cannot be undone.`}
					confirmLabel="Delete Forever"
					onClose={() => setDialog(null)}
					onConfirm={async () => {
						await setProjectStatus(dialog.project.id, "delete");
						toast.show("Project deleted");
					}}
				/>
			) : null}

			{dialog?.type === "delete-art" ? (
				<ConfirmModal
					title="Delete art forever?"
					body={`“${dialog.art.name}” will be permanently removed. This cannot be undone.`}
					confirmLabel="Delete Forever"
					onClose={() => setDialog(null)}
					onConfirm={async () => {
						await setArtStatus(dialog.art.id, "delete");
						toast.show("Art deleted");
					}}
				/>
			) : null}

		</div>
	);
}

export default function App() {
	return (
		<ToastProvider>
			<LibraryProvider>
				<LibraryApp />
			</LibraryProvider>
		</ToastProvider>
	);
}
