import type { APIRoute } from "astro";
import { getEmDashCollection, getSiteSettings } from "emdash";
import { rssResponse, rssXml } from "../utils/rss";

export const GET: APIRoute = async ({ site, url }) => {
  const siteUrl = site?.toString() || url.origin;
  const settings = await getSiteSettings();
  const [{ entries: posts }, { entries: issues }] = await Promise.all([
    getEmDashCollection("posts", { orderBy: { published_at: "desc" }, limit: 20 }),
    getEmDashCollection("newsletter", { orderBy: { published_at: "desc" }, limit: 20 }),
  ]);

  const items = [
    ...posts.map((entry: any) => ({
      title: entry.data.title || entry.id,
      url: `/blog/${entry.id}`,
      publishedAt: entry.data.publishedAt as Date | null,
      excerpt: entry.data.excerpt as string | null,
    })),
    ...issues.map((entry: any) => ({
      title: entry.data.title || entry.id,
      url: `/newsletter/${entry.id}`,
      publishedAt: entry.data.publishedAt as Date | null,
      excerpt: entry.data.excerpt as string | null,
    })),
  ].sort((a, b) => {
    const at = a.publishedAt ? a.publishedAt.getTime() : 0;
    const bt = b.publishedAt ? b.publishedAt.getTime() : 0;
    return bt - at;
  });

  return rssResponse(
    rssXml({
      title: settings.title || "Site RSS",
      description: settings.tagline || "Posts and newsletter issues",
      siteUrl,
      selfPath: "/rss.xml",
      channelLink: "/",
      items,
    }),
  );
};
