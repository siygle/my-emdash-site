import type { APIRoute } from "astro";
import { getEmDashCollection, getSiteSettings } from "emdash";
import { rssResponse, rssXml } from "../../utils/rss";

export const GET: APIRoute = async ({ site, url }) => {
  const siteUrl = site?.toString() || url.origin;
  const settings = await getSiteSettings();
  const { entries } = await getEmDashCollection("newsletter", {
    orderBy: { published_at: "desc" },
    limit: 30,
  });

  return rssResponse(
    rssXml({
      title: `${settings.title || "Newsletter"} — Newsletter`,
      description: settings.tagline || "Newsletter issues",
      siteUrl,
      selfPath: "/newsletter/rss.xml",
      channelLink: "/newsletter",
      language: "zh-Hant",
      items: entries.map((entry: any) => ({
        title: entry.data.title || entry.id,
        url: `/newsletter/${entry.id}`,
        publishedAt: entry.data.publishedAt,
        excerpt: entry.data.excerpt,
      })),
    }),
  );
};
