"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

type Toast = {
	id: number;
	message: string;
	actionLabel?: string;
	onAction?: () => void;
	tone?: "normal" | "error";
};

type ToastApi = {
	show: (
		message: string,
		options?: {
			actionLabel?: string;
			onAction?: () => void;
			tone?: "normal" | "error";
			duration?: number;
		},
	) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used inside ToastProvider");
	return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const idRef = useRef(0);
	const timers = useRef(new Map<number, number>());

	const dismiss = useCallback((id: number) => {
		setToasts((all) => all.filter((t) => t.id !== id));
		const timer = timers.current.get(id);
		if (timer) window.clearTimeout(timer);
		timers.current.delete(id);
	}, []);

	const show = useCallback<ToastApi["show"]>(
		(message, options) => {
			const id = ++idRef.current;
			const toast: Toast = {
				id,
				message,
				actionLabel: options?.actionLabel,
				onAction: options?.onAction,
				tone: options?.tone,
			};
			setToasts((all) => [...all.slice(-2), toast]);
			const timer = window.setTimeout(
				() => dismiss(id),
				options?.duration ?? (options?.tone === "error" ? 9000 : 4800),
			);
			timers.current.set(id, timer);
		},
		[dismiss],
	);

	useEffect(
		() => () => {
			for (const timer of timers.current.values()) window.clearTimeout(timer);
			timers.current.clear();
		},
		[],
	);

	return (
		<ToastContext.Provider value={{ show }}>
			{children}
			<div className="toasts" aria-live="polite">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`toast box ${toast.tone === "error" ? "is-error" : ""}`}
					>
						<span>{toast.message}</span>
						{toast.actionLabel ? (
							<button
								className="mini"
								onClick={() => {
									toast.onAction?.();
									dismiss(toast.id);
								}}
							>
								{toast.actionLabel}
							</button>
						) : null}
						<button
							className="mini quiet"
							aria-label="Dismiss"
							onClick={() => dismiss(toast.id)}
						>
							✕
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}
