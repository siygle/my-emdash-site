import type { APIRoute } from "astro";
import { getEmDashCollection, getSiteSettings } from "emdash";
import { rssResponse, rssXml } from "../../utils/rss";

export const GET: APIRoute = async ({ site, url }) => {
  const siteUrl = site?.toString() || url.origin;
  const settings = await getSiteSettings();
  const { entries } = await getEmDashCollection("posts", {
    orderBy: { published_at: "desc" },
    limit: 30,
  });

  return rssResponse(
    rssXml({
      title: `${settings.title || "Blog"} — Posts`,
      description: settings.tagline || "Blog posts",
      siteUrl,
      selfPath: "/blog/rss.xml",
      channelLink: "/blog",
      items: entries.map((entry: any) => ({
        title: entry.data.title || entry.id,
        url: `/blog/${entry.id}`,
        publishedAt: entry.data.publishedAt,
        excerpt: entry.data.excerpt,
      })),
    }),
  );
};
