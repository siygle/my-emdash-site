import type { APIRoute } from "astro";
import { getEmDashCollection, getTermsForEntries } from "emdash";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "5", 10)));

	const { entries } = await getEmDashCollection("posts", {
		orderBy: { published_at: "desc" },
		limit: 500,
	});

	const start = (page - 1) * limit;
	const end = start + limit;
	const pageEntries = entries.slice(start, end);
	const tagsByEntry = await getTermsForEntries(
		"posts",
		pageEntries.map((post) => post.data.id),
		"tag",
	);

	const posts = pageEntries.map((post) => ({
		slug: post.id,
		title: post.data.title,
		date: post.data.publishedAt?.toISOString() ?? post.data.createdAt.toISOString(),
		description: post.data.excerpt || "",
		tags: (tagsByEntry.get(post.data.id) ?? []).map((tag) => ({
			name: tag.label,
			slug: tag.slug,
		})),
	}));

	return new Response(
		JSON.stringify({
			posts,
			page,
			totalPages: Math.ceil(entries.length / limit),
			hasMore: end < entries.length,
		}),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=3600",
			},
		},
	);
};
