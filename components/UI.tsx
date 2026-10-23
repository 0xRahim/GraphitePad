"use client";

import {
	useEffect,
	useId,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export function useMounted() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return mounted;
}

type ModalProps = {
	title: string;
	children: ReactNode;
	onClose: () => void;
	labelledBy?: string;
};

export function Modal({ title, children, onClose, labelledBy }: ModalProps) {
	const mounted = useMounted();
	const panelRef = useRef<HTMLDivElement>(null);
	const titleId = useId();

	useEffect(() => {
		const previous = document.activeElement as HTMLElement | null;
		const panel = panelRef.current;
		const focusable =
			panel?.querySelector<HTMLElement>(
				"input:not([type='hidden']), textarea, select",
			) ??
			panel?.querySelector<HTMLElement>(
				"button, [tabindex]:not([tabindex='-1'])",
			);
		focusable?.focus();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
				return;
			}
			if (event.key !== "Tab" || !panel) return;
			const items = Array.from(
				panel.querySelectorAll<HTMLElement>(
					"input, textarea, button, select, a[href], [tabindex]:not([tabindex='-1'])",
				),
			).filter((el) => !el.hasAttribute("disabled"));
			if (!items.length) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKey, true);
		return () => {
			document.removeEventListener("keydown", onKey, true);
			previous?.focus?.();
		};
	}, [onClose]);

	if (!mounted) return null;
	return createPortal(
		<div
			className="overlay"
			onPointerDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				ref={panelRef}
				className="modal box"
				role="dialog"
				aria-modal="true"
				aria-labelledby={labelledBy ?? titleId}
			>
				<div className="modal-head">
					<h2 id={titleId}>{title}</h2>
					<button className="mini quiet" onClick={onClose} aria-label="Close">
						✕
					</button>
				</div>
				{children}
			</div>
		</div>,
		document.body,
	);
}

type PromptProps = {
	title: string;
	label: string;
	initial?: string;
	placeholder?: string;
	submitLabel: string;
	onSubmit: (value: string) => Promise<void> | void;
	onClose: () => void;
	children?: ReactNode;
};

export function PromptModal({
	title,
	label,
	initial = "",
	placeholder,
	submitLabel,
	onSubmit,
	onClose,
	children,
}: PromptProps) {
	const [value, setValue] = useState(initial);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		if (!value.trim()) {
			setError("Give it a name first.");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			await onSubmit(value.trim());
			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
			setBusy(false);
		}
	};

	return (
		<Modal title={title} onClose={onClose}>
			<form className="modal-body" onSubmit={submit}>
				<label className="field">
					<span>{label}</span>
					<input
						value={value}
						placeholder={placeholder}
						maxLength={80}
						onChange={(event) => setValue(event.target.value)}
					/>
				</label>
				{children}
				{error ? <p className="form-error">{error}</p> : null}
				<div className="modal-actions">
					<button type="button" className="btn" onClick={onClose} disabled={busy}>
						Cancel
					</button>
					<button type="submit" className="btn on" disabled={busy || !value.trim()}>
						{busy ? "Working…" : submitLabel}
					</button>
				</div>
			</form>
		</Modal>
	);
}

type ConfirmProps = {
	title: string;
	body: string;
	confirmLabel: string;
	onConfirm: () => Promise<void> | void;
	onClose: () => void;
};

export function ConfirmModal({
	title,
	body,
	confirmLabel,
	onConfirm,
	onClose,
}: ConfirmProps) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	return (
		<Modal title={title} onClose={onClose}>
			<div className="modal-body">
				<p className="modal-copy">{body}</p>
				{error ? <p className="form-error">{error}</p> : null}
				<div className="modal-actions">
					<button className="btn" onClick={onClose} disabled={busy}>
						Cancel
					</button>
					<button
						className="btn on"
						disabled={busy}
						onClick={async () => {
							setBusy(true);
							setError(null);
							try {
								await onConfirm();
								onClose();
							} catch (e) {
								setError(e instanceof Error ? e.message : "Something went wrong");
								setBusy(false);
							}
						}}
					>
						{busy ? "Working…" : confirmLabel}
					</button>
				</div>
			</div>
		</Modal>
	);
}

export type MenuItem = {
	label: string;
	onSelect: () => void;
	disabled?: boolean;
};

export function CardMenu({ items, label = "More actions" }: { items: MenuItem[]; label?: string }) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!open) return;
		const onDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("pointerdown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	return (
		<div className="menu-root" ref={rootRef}>
			<button
				className="mini quiet"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={label}
				onClick={(event) => {
					event.stopPropagation();
					setOpen((v) => !v);
				}}
			>
				⋯
			</button>
			{open ? (
				<div className="menu-pop box" role="menu">
					{items.map((item) => (
						<button
							key={item.label}
							role="menuitem"
							className="menu-item"
							disabled={item.disabled}
							onClick={(event) => {
								event.stopPropagation();
								setOpen(false);
								item.onSelect();
							}}
						>
							{item.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
