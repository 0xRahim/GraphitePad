export function formatRelative(iso: string | null | undefined): string {
	if (!iso) return "";
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return "";
	const diff = Math.max(0, Date.now() - then);
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return "yesterday";
	if (days < 7) return `${days}d ago`;
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: days > 300 ? "numeric" : undefined,
	}).format(new Date(then));
}

export function countLabel(n: number, one: string, many = `${one}s`) {
	return `${n} ${n === 1 ? one : many}`;
}

export function slugify(value: string) {
	return (
		value
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[^\w\s-]/g, "")
			.trim()
			.replace(/\s+/g, "-")
			.slice(0, 64) || "artwork"
	);
}
