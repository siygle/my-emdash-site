interface IssueLike {
	id?: string;
	slug?: string;
	data?: { title?: string };
}

export function getIssueNumber(entry: IssueLike): string {
	const raw = entry.slug || entry.id || entry.data?.title || "";
	return raw.match(/(?:-|#)(\d+)(?:$|\b)/)?.[1] || "";
}

export function getIssueNumberValue(entry: IssueLike): number {
	return Number(getIssueNumber(entry)) || 0;
}

export function formatDateShort(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return "";
	const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
	return `${mon} ${d.getDate()}`;
}

export function formatDateFull(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return "";
	return d
		.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
		.toUpperCase();
}

interface TermLike {
	label?: string;
	slug?: string;
}

export function getTopTags(tags: TermLike[] | undefined, max = 3): TermLike[] {
	return (tags || [])
		.filter((tag) => {
			const value = (tag.slug || tag.label || "").toLowerCase();
			return value !== "newsletter" && value !== "news";
		})
		.slice(0, max);
}
