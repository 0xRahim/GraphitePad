"use client";

import { useEffect, useState } from "react";
import type { Art, Project } from "@/src/shared/types";
import { formatRelative, countLabel } from "@/lib/format";
import { useLibrary } from "@/components/LibraryProvider";
import { BrandMark } from "@/components/BrandMark";
import { toggleTheme } from "@/lib/theme";
import { CardMenu, type MenuItem } from "@/components/UI";
import type { ViewName } from "@/lib/library";

function ThemeButton() {
	const [label, setLabel] = useState("Theme");
	useEffect(() => {
		const update = () => {
			const attr = document.documentElement.dataset.theme;
			const dark =
				attr === "dark" ||
				(!attr && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
			setLabel(dark ? "Light" : "Dark");
		};
		update();
		window.addEventListener("graphitepad:theme", update);
		return () => window.removeEventListener("graphitepad:theme", update);
	}, []);
	return (
		<button className="foot-btn" onClick={toggleTheme} title="Toggle light / dark">
			<span>Theme</span>
			<span className="muted">{label}</span>
		</button>
	);
}

const MENU: Array<{ name: ViewName; label: string }> = [
	{ name: "projects", label: "Projects" },
	{ name: "starred", label: "Starred" },
	{ name: "dropped", label: "Dropped" },
	{ name: "trash", label: "Trash" },
];

export function Sidebar({
	view,
	onNavigate,
	onNewProject,
}: {
	view: ViewName;
	onNavigate: (view: ViewName) => void;
	onNewProject: () => void;
}) {
	const { library, openDataFolder } = useLibrary();
	const projectCount = library.projects.filter((p) => !p.droppedAt && !p.deletedAt).length;
	const activeIds = new Set(
		library.projects
			.filter((p) => !p.droppedAt && !p.deletedAt)
			.map((p) => p.id),
	);
	const starred = library.arts.filter(
		(a) => a.starred && !a.deletedAt && !a.droppedAt && activeIds.has(a.projectId),
	).length;
	const dropped =
		library.projects.filter((p) => p.droppedAt && !p.deletedAt).length +
		library.arts.filter(
			(a) => a.droppedAt && !a.deletedAt && activeIds.has(a.projectId),
		).length;
	const trashed =
		library.projects.filter((p) => p.deletedAt).length +
		library.arts.filter((a) => a.deletedAt && activeIds.has(a.projectId)).length;
	const counts: Record<ViewName, number> = {
		projects: projectCount,
		starred,
		dropped,
		trash: trashed,
	};

	return (
		<aside className="sidebar box">
			<button className="brand" onClick={() => onNavigate("projects")}>
				<span className="brand-lockup">
					<BrandMark className="brand-mark" />
					<span className="brand-name">GraphitePad</span>
				</span>
				<span className="brand-sub">Drawing library</span>
			</button>
			<nav className="nav" aria-label="Library">
				{MENU.map((item) => (
					<button
						key={item.name}
						className={`nav-item ${view === item.name ? "on" : ""}`}
						data-short={item.label.slice(0, 1)}
						onClick={() => onNavigate(item.name)}
						aria-current={view === item.name ? "page" : undefined}
					>
						<span>{item.label}</span>
						<span className="nav-count">{counts[item.name]}</span>
					</button>
				))}
			</nav>
			<div className="sidebar-actions">
				<button className="btn on wide" onClick={onNewProject}>
					+ New Project
				</button>
			</div>
			<div className="sidebar-foot">
				<ThemeButton />
				<button className="foot-btn" onClick={() => void openDataFolder()}>
					<span>Data folder</span>
					<span className="muted">Open</span>
				</button>
				<span className="version">v0.1.0</span>
			</div>
		</aside>
	);
}

export function ArtThumb({
	art,
	compact = false,
}: {
	art: Art;
	compact?: boolean;
}) {
	const [broken, setBroken] = useState(false);
	useEffect(() => setBroken(false), [art.thumbnail]);
	if (art.thumbnail && !broken) {
		return (
			<span className={`thumb ${compact ? "compact" : ""} ${art.kind}`}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={art.thumbnail}
					alt=""
					draggable={false}
					onError={() => setBroken(true)}
				/>
			</span>
		);
	}
	return (
		<span className={`thumb fallback ${compact ? "compact" : ""} ${art.kind}`}>
			<span className="thumb-kind">{art.kind === "sketch" ? "Sketch" : "Pixel"}</span>
			<span className="thumb-hint">No preview yet</span>
		</span>
	);
}

export function ArtCard({
	art,
	project,
	onOpen,
	onStar,
	menu,
	compact = false,
	showProject = false,
	statusActions,
}: {
	art: Art;
	project?: Project;
	onOpen?: () => void;
	onStar?: () => void;
	menu?: MenuItem[];
	compact?: boolean;
	showProject?: boolean;
	statusActions?: React.ReactNode;
}) {
	const meta = [
		art.kind === "sketch" ? "Sketch" : "Pixel",
		showProject && project ? project.name : "",
		formatRelative(art.updatedAt),
	].filter(Boolean);
	return (
		<article className={`card art-card box ${compact ? "compact" : ""}`}>
			<button className="card-open" onClick={onOpen} disabled={!onOpen}>
				<ArtThumb art={art} compact={compact} />
				<span className="card-body">
					<span className="card-title">{art.name}</span>
					<span className="card-meta">
						{meta.map((m, index) => (
							<span key={m + index}>{m}</span>
						))}
					</span>
				</span>
			</button>
			<div className="card-tools">
				{onStar ? (
					<button
						className={`mini star ${art.starred ? "is-starred" : ""}`}
						aria-label={art.starred ? "Unstar art" : "Star art"}
						aria-pressed={art.starred}
						onClick={(event) => {
							event.stopPropagation();
							onStar();
						}}
					>
						{art.starred ? "★" : "☆"}
					</button>
				) : null}
				{menu?.length ? <CardMenu items={menu} /> : null}
			</div>
			{statusActions ? <div className="card-status-actions">{statusActions}</div> : null}
		</article>
	);
}

export function ProjectCard({
	project,
	cover,
	count,
	onOpen,
	menu,
	statusActions,
}: {
	project: Project;
	cover?: Art;
	count: number;
	onOpen?: () => void;
	menu?: MenuItem[];
	statusActions?: React.ReactNode;
}) {
	return (
		<article className="card project-card box">
			<button className="card-open" onClick={onOpen} disabled={!onOpen}>
				<span className="project-cover">
					{cover ? (
						<ArtThumb art={cover} />
					) : (
						<span className="thumb fallback empty-cover">
							<span className="thumb-kind">Empty</span>
							<span className="thumb-hint">No art yet</span>
						</span>
					)}
					<span className="project-count">{countLabel(count, "art")}</span>
				</span>
				<span className="card-body">
					<span className="card-title">{project.name}</span>
					<span className="card-meta">
						<span>{formatRelative(project.updatedAt)}</span>
					</span>
				</span>
			</button>
			{menu?.length ? (
				<div className="card-tools">
					<CardMenu items={menu} />
				</div>
			) : null}
			{statusActions ? <div className="card-status-actions">{statusActions}</div> : null}
		</article>
	);
}

export function SectionHead({
	title,
	count,
	action,
}: {
	title: string;
	count?: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="section-head">
			<h2>
				{title}
				{count ? <span className="section-count">{count}</span> : null}
			</h2>
			{action}
		</div>
	);
}

export function EmptyState({
	title,
	body,
	action,
}: {
	title: string;
	body: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="empty-state">
			<h2>{title}</h2>
			<p>{body}</p>
			{action ? <div className="empty-actions">{action}</div> : null}
		</div>
	);
}

