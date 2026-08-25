#!/usr/bin/env node
/**
 * Upgrade imported newsletter social links into real EmDash Portable Text blocks.
 *
 * Safe default: dry-run only. Use --apply after the social-embeds native plugin
 * is deployed, otherwise `socialEmbed` blocks will not render on the public site.
 *
 * Required env for --apply:
 *   EMDASH_MCP_URL=https://<site>/_emdash/api/mcp
 *   EMDASH_TOKEN=<redacted EmDash personal access token>
 */
import { readFile } from "node:fs/promises";
import { readdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const contentDirArg = process.argv.find((arg) => arg.startsWith("--content-dir="));
const contentDir = contentDirArg
	? contentDirArg.slice("--content-dir=".length)
	: "/home/ferrari/vibe-coding/sy-website/src/content/newsletter";
const endpoint = process.env.EMDASH_MCP_URL;
const token = process.env.EMDASH_TOKEN;
const bskyCachePath = process.env.BSKY_OEMBED_CACHE || "/tmp/emdash-bsky-oembed-cache.json";
const bskyCache = existsSync(bskyCachePath)
	? JSON.parse(readFileSync(bskyCachePath, "utf8"))
	: {};

if (apply && (!endpoint || !token)) {
	throw new Error("--apply requires EMDASH_MCP_URL and EMDASH_TOKEN");
}

let nextId = 1;
async function mcp(name, args) {
	const payload = { jsonrpc: "2.0", id: nextId++, method: "tools/call", params: { name, arguments: args } };
	const res = await fetch(endpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify(payload),
	});
	const text = await res.text();
	let jsonText = text.trim();
	if (jsonText.startsWith("event:") || jsonText.includes("\ndata:")) {
		jsonText = text
			.split(/\r?\n/)
			.filter((line) => line.startsWith("data:"))
			.map((line) => line.slice(5).trim())
			.join("\n");
	}
	const out = JSON.parse(jsonText);
	if (!res.ok || out.error) {
		throw new Error(out.error?.message || `HTTP ${res.status}: ${jsonText.slice(0, 500)}`);
	}
	const content = out.result?.content?.[0]?.text;
	if (typeof content !== "string") return out;
	try {
		return JSON.parse(content);
	} catch {
		return content;
	}
}

function parseFrontmatter(raw) {
	const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
	const fm = { title: "", date: "", description: "", tags: [] };
	if (!match) return { fm, body: raw };
	let currentKey = null;
	for (const line of match[1].split(/\r?\n/)) {
		const key = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
		if (key) {
			currentKey = key[1];
			let value = key[2].trim().replace(/^["']|["']$/g, "");
			if (currentKey === "tags") fm.tags = [];
			else fm[currentKey] = value;
			continue;
		}
		const item = line.match(/^\s*-\s*(.*)$/);
		if (item && currentKey === "tags") fm.tags.push(item[1].trim().replace(/^["']|["']$/g, ""));
	}
	return { fm, body: raw.slice(match[0].length) };
}

function detectEmbed(url) {
	const twitter = url.match(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([^/\s)]+)\/status\/(\d+)/i);
	if (twitter) return { platform: "twitter", id: twitter[2], user: twitter[1] };
	const bsky = url.match(/^https?:\/\/bsky\.app\/profile\/([^/\s)]+)\/post\/([^/\s)]+)/i);
	if (bsky) return { platform: "bluesky", id: bsky[2], user: bsky[1] };
	const youtube = url.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
	if (youtube) return { platform: "youtube", id: youtube[1] };
	return null;
}

function blockFence(block) {
	return `<!--ec:block ${JSON.stringify(block)} -->`;
}

function key(prefix, value) {
	let h = 0;
	for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
	return `${prefix}${Math.abs(h).toString(36)}`;
}

async function getBlueskyOembed(url) {
	if (bskyCache[url]) return bskyCache[url];
	try {
		const res = await fetch(`https://embed.bsky.app/oembed?url=${encodeURIComponent(url)}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		const uri = String(data.html || "").match(/data-bluesky-uri="([^"]+)"/)?.[1];
		const cid = String(data.html || "").match(/data-bluesky-cid="([^"]+)"/)?.[1];
		bskyCache[url] = { uri, cid, title: data.author_name ? `Bluesky post by ${data.author_name}` : "Bluesky post" };
	} catch (error) {
		bskyCache[url] = { error: String(error?.message || error) };
	}
	writeFileSync(bskyCachePath, JSON.stringify(bskyCache, null, 2));
	return bskyCache[url];
}

async function transformBody(body, stats) {
	const out = [];
	for (const line of body.split(/\r?\n/)) {
		let match = line.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
		if (match) {
			const [, alt, url] = match;
			const embed = detectEmbed(url);
			if (embed?.platform === "youtube") {
				stats.youtube++;
				out.push(blockFence({ _type: "embed", _key: key("yt", url), url, provider: "youtube", caption: alt || undefined }));
				continue;
			}
			if (embed?.platform === "twitter") {
				stats.twitter++;
				out.push(blockFence({ _type: "socialEmbed", _key: key("tw", url), platform: "twitter", url, title: alt || "X/Twitter post" }));
				continue;
			}
			if (embed?.platform === "bluesky") {
				stats.bluesky++;
				const meta = await getBlueskyOembed(url);
				out.push(blockFence({
					_type: "socialEmbed",
					_key: key("bs", url),
					platform: "bluesky",
					url,
					title: alt || meta.title || "Bluesky post",
					uri: meta.uri,
					cid: meta.cid,
				}));
				if (!meta.uri || !meta.cid) stats.blueskyFallback++;
				continue;
			}
		}

		match = line.match(/^\s*\[\]\(([^)]+)\)\s*$/);
		if (match) {
			stats.emptyLinks++;
			out.push(`[${match[1]}](${match[1]})`);
			continue;
		}

		out.push(line);
	}
	return out.join("\n").trim();
}

function makeExcerpt(description, body) {
	if (description?.trim()) return description.trim();
	return body.replace(/[#>*_`\[\]()!-]/g, "").replace(/\s+/g, " ").trim().slice(0, 180);
}

const files = readdirSync(contentDir)
	.filter((file) => file.endsWith(".md"))
	.sort((a, b) => Number(a.match(/-(\d+)\.md$/)?.[1] || 0) - Number(b.match(/-(\d+)\.md$/)?.[1] || 0));

const summary = { total: files.length, updated: 0, failed: 0, stats: { twitter: 0, bluesky: 0, blueskyFallback: 0, youtube: 0, emptyLinks: 0 }, items: [] };

for (const file of files) {
	const slug = file.replace(/\.md$/, "");
	const raw = await readFile(path.join(contentDir, file), "utf8");
	const { fm, body } = parseFrontmatter(raw);
	const before = { ...summary.stats };
	const transformed = await transformBody(body, summary.stats);
	const content = transformed;
	const itemStats = Object.fromEntries(Object.entries(summary.stats).map(([k, v]) => [k, v - before[k]]));
	try {
		if (apply) {
			await mcp("content_update", {
				collection: "posts",
				id: slug,
				data: { title: fm.title || slug, excerpt: makeExcerpt(fm.description, transformed), content },
				publishedAt: fm.date ? `${fm.date}T00:00:00+08:00` : undefined,
				taxonomies: { category: ["newsletter"], tag: ["newsletter"] },
			});
		}
		summary.updated++;
		summary.items.push({ slug, status: apply ? "updated" : "dry-run", ...itemStats });
		console.log(`${apply ? "OK" : "DRY"} ${slug} ${JSON.stringify(itemStats)}`);
	} catch (error) {
		summary.failed++;
		summary.items.push({ slug, status: "failed", error: String(error?.message || error), ...itemStats });
		console.error(`FAIL ${slug}: ${error?.message || error}`);
	}
}

writeFileSync("/tmp/emdash-newsletter-social-embed-upgrade.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ apply, total: summary.total, updated: summary.updated, failed: summary.failed, stats: summary.stats }, null, 2));
if (summary.failed) process.exitCode = 1;
