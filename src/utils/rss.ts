export function escapeXml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export type RssItem = {
  title: string;
  url: string;
  publishedAt?: Date | null;
  excerpt?: string | null;
};

export function rssXml(opts: {
  title: string;
  description: string;
  siteUrl: string;
  selfPath: string;
  channelLink: string;
  language?: string;
  items: RssItem[];
}): string {
  const siteUrl = opts.siteUrl.replace(/\/$/, "");
  const selfUrl = `${siteUrl}${opts.selfPath}`;
  const channelLink = opts.channelLink.startsWith("http") ? opts.channelLink : `${siteUrl}${opts.channelLink}`;
  const items = opts.items
    .map((item) => {
      const link = item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`;
      const title = escapeXml(item.title || "Untitled");
      const description = item.excerpt ? escapeXml(item.excerpt) : "";
      const pubDate = item.publishedAt ? `<pubDate>${item.publishedAt.toUTCString()}</pubDate>` : "";
      return `    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      ${pubDate}
      ${description ? `<description>${description}</description>` : ""}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(opts.title)}</title>
    <description>${escapeXml(opts.description)}</description>
    <link>${escapeXml(channelLink)}</link>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>
    <language>${opts.language || "en"}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

export function rssResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
