export type Theme = "light" | "dark";

export function currentTheme(): Theme {
	const attr = document.documentElement.dataset.theme;
	if (attr === "light" || attr === "dark") return attr;
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function applyTheme(theme: Theme) {
	document.documentElement.dataset.theme = theme;
	try {
		localStorage.setItem("graphitepad:theme", theme);
	} catch {
		// Ignore storage errors.
	}
	window.dispatchEvent(new CustomEvent("graphitepad:theme", { detail: theme }));
}

export function toggleTheme() {
	applyTheme(currentTheme() === "dark" ? "light" : "dark");
}

export function useThemeToggle() {
	return toggleTheme;
}
