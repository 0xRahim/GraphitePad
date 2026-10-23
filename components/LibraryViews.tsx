"use client";

import type { Art, Project } from "@/src/shared/types";
import { countLabel, formatRelative } from "@/lib/format";
import {
	activeProjects,
	artsForProject,
	artsInProject,
	droppedArts,
	droppedProjects,
	recentArts,
	starredArts,
	trashedArts,
	trashedProjects,
} from "@/lib/library";
import { useLibrary } from "@/components/LibraryProvider";
import {
	ArtCard,
	EmptyState,
	ProjectCard,
	SectionHead,
} from "@/components/LibraryUI";

export type LibraryActions = {
	goProjects: () => void;
	openArt: (art: Art) => void;
	openProject: (project: Project) => void;
	newProject: () => void;
	newArt: (project: Project) => void;
	starArt: (art: Art) => void;
	renameArt: (art: Art) => void;
	dropArt: (art: Art) => void;
	trashArt: (art: Art) => void;
	restoreArt: (art: Art) => void;
	deleteArt: (art: Art) => void;
	renameProject: (project: Project) => void;
	dropProject: (project: Project) => void;
	trashProject: (project: Project) => void;
	restoreProject: (project: Project) => void;
	deleteProject: (project: Project) => void;
};

export function Header({
	kicker,
	title,
	meta,
	actions,
}: {
	kicker: string;
	title: string;
	meta?: string;
	actions?: React.ReactNode;
}) {
	return (
		<header className="main-head">
			<div className="head-copy">
				<span className="kicker">{kicker}</span>
				<h1>{title}</h1>
				{meta ? <span className="head-meta">{meta}</span> : null}
			</div>
			<div className="head-actions">{actions}</div>
		</header>
	);
}

function artMenu(art: Art, actions: LibraryActions) {
	return [
		{ label: "Open", onSelect: () => actions.openArt(art) },
		{ label: art.starred ? "Unstar" : "Star", onSelect: () => actions.starArt(art) },
		{ label: "Rename", onSelect: () => actions.renameArt(art) },
		{ label: "Drop", onSelect: () => actions.dropArt(art) },
		{ label: "Move to Trash", onSelect: () => actions.trashArt(art) },
	];
}

function projectMenu(project: Project, actions: LibraryActions) {
	return [
		{ label: "Open", onSelect: () => actions.openProject(project) },
		{ label: "Rename", onSelect: () => actions.renameProject(project) },
		{ label: "Drop", onSelect: () => actions.dropProject(project) },
		{ label: "Move to Trash", onSelect: () => actions.trashProject(project) },
	];
}

function RecentRail({
	arts,
	actions,
	empty,
}: {
	arts: Art[];
	actions: LibraryActions;
	empty: string;
}) {
	const { library } = useLibrary();
	if (!arts.length) return <p className="section-empty">{empty}</p>;
	return (
		<div className="rail-scroll">
			{arts.map((art) => (
				<ArtCard
					key={art.id}
					art={art}
					project={library.projects.find((p) => p.id === art.projectId)}
					showProject
					compact
					onOpen={() => actions.openArt(art)}
					onStar={() => actions.starArt(art)}
					menu={artMenu(art, actions)}
				/>
			))}
		</div>
	);
}

export function ProjectsView({ actions }: { actions: LibraryActions }) {
	const { library } = useLibrary();
	const projects = activeProjects(library);
	const recent = recentArts(library, 8);
	const starred = starredArts(library).slice(0, 8);
	const artCount = projects.reduce(
		(n, p) => n + artsForProject(library, p.id).length,
		0,
	);

	if (!projects.length) {
		return (
			<>
				<Header
					kicker="Library"
					title="Projects"
					actions={
						<button className="btn on" onClick={actions.newProject}>
							+ New Project
						</button>
					}
				/>
				<div className="scroll-body">
					<EmptyState
						title="No existing projects"
						body="Projects hold your sketches and pixel art. Create one to begin."
						action={
							<button className="btn on big" onClick={actions.newProject}>
								Create New Project
							</button>
						}
					/>
				</div>
			</>
		);
	}

	return (
		<>
			<Header
				kicker="Library"
				title="Projects"
				meta={`${countLabel(projects.length, "project")} · ${countLabel(artCount, "art")}`}
				actions={
					<button className="btn on" onClick={actions.newProject}>
						+ New Project
					</button>
				}
			/>
			<div className="scroll-body">
				<section className="section">
					<SectionHead title="Recent arts" count={String(recent.length)} />
					<RecentRail
						arts={recent}
						actions={actions}
						empty="No art yet. Open a project to make your first piece."
					/>
				</section>
				<section className="section">
					<SectionHead title="Starred arts" count={String(starred.length)} />
					<RecentRail
						arts={starred}
						actions={actions}
						empty="No starred art yet. Star a piece from any project to keep it close."
					/>
				</section>
				<section className="section">
					<SectionHead
						title="All projects"
						count={String(projects.length)}
						action={
							<button className="btn" onClick={actions.newProject}>
								+ New Project
							</button>
						}
					/>
					<div className="project-grid">
						{projects.map((project) => {
							const arts = artsForProject(library, project.id);
							return (
								<ProjectCard
									key={project.id}
									project={project}
									cover={arts[0]}
									count={arts.length}
									onOpen={() => actions.openProject(project)}
									menu={projectMenu(project, actions)}
								/>
							);
						})}
					</div>
				</section>
			</div>
		</>
	);
}

export function StarredView({ actions }: { actions: LibraryActions }) {
	const { library } = useLibrary();
	const arts = starredArts(library);
	return (
		<>
			<Header
				kicker="Library"
				title="Starred"
				meta={countLabel(arts.length, "starred art")}
				actions={
					<button className="btn on" onClick={actions.newProject}>
						+ New Project
					</button>
				}
			/>
			<div className="scroll-body">
				{arts.length ? (
					<div className="art-grid">
						{arts.map((art) => (
							<ArtCard
								key={art.id}
								art={art}
								project={library.projects.find((p) => p.id === art.projectId)}
								showProject
								onOpen={() => actions.openArt(art)}
								onStar={() => actions.starArt(art)}
								menu={artMenu(art, actions)}
							/>
						))}
					</div>
				) : (
					<EmptyState
						title="No starred art"
						body="Star a piece from any project and it will appear here."
					/>
				)}
			</div>
		</>
	);
}

export function DroppedView({ actions }: { actions: LibraryActions }) {
	const { library } = useLibrary();
	const projects = droppedProjects(library);
	const arts = droppedArts(library);
	const total = projects.length + arts.length;
	return (
		<>
			<Header
				kicker="Library"
				title="Dropped"
				meta={`${countLabel(total, "item")} set aside`}
				actions={
					<button className="btn on" onClick={actions.newProject}>
						+ New Project
					</button>
				}
			/>
			<div className="scroll-body">
				{!total ? (
					<EmptyState
						title="Nothing dropped"
						body="Dropped work is set aside, not deleted. Use Drop from any project or art menu."
					/>
				) : (
					<>
						{projects.length ? (
							<section className="section">
								<SectionHead title="Projects" count={String(projects.length)} />
								<div className="project-grid">
									{projects.map((project) => (
										<ProjectCard
											key={project.id}
											project={project}
											cover={artsInProject(library, project.id)[0]}
											count={artsInProject(library, project.id).length}
											statusActions={
												<>
													<button
														className="mini"
														onClick={() => actions.restoreProject(project)}
													>
														Restore
													</button>
													<button
														className="mini"
														onClick={() => actions.trashProject(project)}
													>
														Move to Trash
													</button>
												</>
											}
										/>
									))}
								</div>
							</section>
						) : null}
						{arts.length ? (
							<section className="section">
								<SectionHead title="Arts" count={String(arts.length)} />
								<div className="art-grid">
									{arts.map((art) => (
										<ArtCard
											key={art.id}
											art={art}
											showProject
											onOpen={() => actions.openArt(art)}
											statusActions={
												<>
													<button
														className="mini"
														onClick={() => actions.restoreArt(art)}
													>
														Restore
													</button>
													<button
														className="mini"
														onClick={() => actions.trashArt(art)}
													>
														Move to Trash
													</button>
												</>
											}
										/>
									))}
								</div>
							</section>
						) : null}
					</>
				)}
			</div>
		</>
	);
}

export function TrashView({ actions }: { actions: LibraryActions }) {
	const { library } = useLibrary();
	const projects = trashedProjects(library);
	const arts = trashedArts(library);
	const total = projects.length + arts.length;
	return (
		<>
			<Header
				kicker="Library"
				title="Trash"
				meta={`${countLabel(total, "item")} in trash`}
				actions={
					<button className="btn on" onClick={actions.newProject}>
						+ New Project
					</button>
				}
			/>
			<div className="scroll-body">
				{!total ? (
					<EmptyState
						title="Trash is empty"
						body="Deleted projects and art wait here until you restore them or delete them forever."
					/>
				) : (
					<>
						<p className="notice">
							Items in Trash can be restored. Deleting forever cannot be undone.
						</p>
						{projects.length ? (
							<section className="section">
								<SectionHead title="Projects" count={String(projects.length)} />
								<div className="project-grid">
									{projects.map((project) => (
										<ProjectCard
											key={project.id}
											project={project}
											cover={artsInProject(library, project.id)[0]}
											count={artsInProject(library, project.id).length}
											statusActions={
												<>
													<button
														className="mini"
														onClick={() => actions.restoreProject(project)}
													>
														Restore
													</button>
													<button
														className="mini"
														onClick={() => actions.deleteProject(project)}
													>
														Delete Forever
													</button>
												</>
											}
										/>
									))}
								</div>
							</section>
						) : null}
						{arts.length ? (
							<section className="section">
								<SectionHead title="Arts" count={String(arts.length)} />
								<div className="art-grid">
									{arts.map((art) => (
										<ArtCard
											key={art.id}
											art={art}
											showProject
											statusActions={
												<>
													<button
														className="mini"
														onClick={() => actions.restoreArt(art)}
													>
														Restore
													</button>
													<button
														className="mini"
														onClick={() => actions.deleteArt(art)}
													>
														Delete Forever
													</button>
												</>
											}
										/>
									))}
								</div>
							</section>
						) : null}
					</>
				)}
			</div>
		</>
	);
}

export function ProjectView({
	projectId,
	actions,
}: {
	projectId: string;
	actions: LibraryActions;
}) {
	const { library } = useLibrary();
	const project = library.projects.find(
		(p) => p.id === projectId && !p.deletedAt && !p.droppedAt,
	);
	if (!project) {
		return (
			<>
				<Header
					kicker="Library"
					title="Project"
					actions={
						<button className="btn" onClick={actions.goProjects}>
							‹ Projects
						</button>
					}
				/>
				<div className="scroll-body">
					<EmptyState
						title="Project not found"
						body="It may have been moved to Trash or deleted."
					/>
				</div>
			</>
		);
	}
	const arts = artsForProject(library, project.id);
	return (
		<>
			<Header
				kicker="Project"
				title={project.name}
				meta={`${countLabel(arts.length, "art")} · updated ${formatRelative(project.updatedAt)}`}
				actions={
					<>
						<button className="btn" onClick={() => actions.renameProject(project)}>
							Rename
						</button>
						<button className="btn" onClick={() => actions.dropProject(project)}>
							Drop
						</button>
						<button className="btn" onClick={() => actions.trashProject(project)}>
							Move to Trash
						</button>
						<button className="btn on" onClick={() => actions.newArt(project)}>
							+ New Art
						</button>
					</>
				}
			/>
			<div className="scroll-body">
				<div className="breadcrumb">
					<button className="crumb" onClick={actions.goProjects}>
						‹ Projects
					</button>
					<span>/</span>
					<span className="crumb current">{project.name}</span>
				</div>
				{arts.length ? (
					<div className="art-grid">
						{arts.map((art) => (
							<ArtCard
								key={art.id}
								art={art}
								onOpen={() => actions.openArt(art)}
								onStar={() => actions.starArt(art)}
								menu={artMenu(art, actions)}
							/>
						))}
					</div>
				) : (
					<EmptyState
						title="No art in this project yet"
						body="Start with a freehand sketch or a crisp pixel piece."
						action={
							<button className="btn on big" onClick={() => actions.newArt(project)}>
								+ Create New Art
							</button>
						}
					/>
				)}
			</div>
		</>
	);
}
