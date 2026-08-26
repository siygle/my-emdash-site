const BLUESKY_API = 'https://public.api.bsky.app/xrpc';

// Types for Bluesky API responses
export interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface BlueskyFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{
    $type: string;
    uri?: string;
    did?: string;
    tag?: string;
  }>;
}

export interface BlueskyImage {
  thumb: string;
  fullsize: string;
  alt: string;
  aspectRatio?: { width: number; height: number };
}

export interface BlueskyExternal {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

export interface BlueskyEmbedView {
  $type: string;
  images?: BlueskyImage[];
  external?: BlueskyExternal;
  record?: {
    $type: string;
    uri: string;
    cid: string;
    author: BlueskyAuthor;
    value: {
      text: string;
      createdAt: string;
    };
  };
}

export interface BlueskyRecord {
  $type: string;
  createdAt: string;
  text: string;
  facets?: BlueskyFacet[];
  embed?: {
    $type: string;
    external?: BlueskyExternal;
    images?: Array<{ alt: string; image: { ref: { $link: string } } }>;
  };
  reply?: {
    parent: { uri: string; cid: string };
    root: { uri: string; cid: string };
  };
}

export interface BlueskyPost {
  uri: string;
  cid: string;
  author: BlueskyAuthor;
  record: BlueskyRecord;
  embed?: BlueskyEmbedView;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  indexedAt: string;
}

export interface BlueskyFeedItem {
  post: BlueskyPost;
  reply?: {
    root: BlueskyPost;
    parent: BlueskyPost;
  };
  reason?: {
    $type: string;
  };
}

export interface BlueskyThreadNode {
  $type: string;
  post?: BlueskyPost;
  parent?: BlueskyThreadNode;
  replies?: BlueskyThreadNode[];
  notFound?: boolean;
  blocked?: boolean;
}

export interface ProcessedFeedItem {
  isThread: boolean;
  post: BlueskyPost;
  threadPosts?: BlueskyPost[]; // For threads: [root, ...parents, current]
}

export interface ProcessedFeed {
  items: ProcessedFeedItem[];
  error?: string;
}

// Fetch author feed
export async function getAuthorFeed(
  actor: string,
  limit: number = 7
): Promise<BlueskyFeedItem[]> {
  const url = new URL(`${BLUESKY_API}/app.bsky.feed.getAuthorFeed`);
  url.searchParams.set('actor', actor);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('filter', 'posts_and_author_threads');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status}`);
  }

  const data = await response.json() as { feed?: BlueskyFeedItem[] };
  return data.feed || [];
}

// Fetch a specific thread
export async function getPostThread(
  uri: string,
  depth: number = 6
): Promise<BlueskyThreadNode | null> {
  const url = new URL(`${BLUESKY_API}/app.bsky.feed.getPostThread`);
  url.searchParams.set('uri', uri);
  url.searchParams.set('depth', depth.toString());
  url.searchParams.set('parentHeight', '80');

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error(`Failed to fetch thread ${uri}: ${response.status}`);
    return null;
  }

  const data = await response.json() as { thread?: BlueskyThreadNode };
  return data.thread || null;
}

// Flatten a thread node to array of posts (root to current)
function flattenThreadToAncestors(node: BlueskyThreadNode): BlueskyPost[] {
  const posts: BlueskyPost[] = [];

  // Walk up the parent chain
  function collectParents(n: BlueskyThreadNode | undefined) {
    if (!n || !n.post) return;
    if (n.parent) {
      collectParents(n.parent);
    }
    posts.push(n.post);
  }

  collectParents(node);
  return posts;
}

// Main function: fetch feed and resolve threads
export async function getFeedWithThreads(
  actor: string,
  limit: number = 7
): Promise<ProcessedFeed> {
  try {
    const feedItems = await getAuthorFeed(actor, limit);

    // Filter out reposts and identify unique thread roots
    const threadRoots = new Map<string, string>(); // rootUri -> first post uri that needs it
    const processedItems: ProcessedFeedItem[] = [];

    for (const item of feedItems) {
      // Skip reposts
      if (item.reason?.$type === 'app.bsky.feed.defs#reasonRepost') {
        continue;
      }

      const post = item.post;
      const reply = post.record.reply;

      if (reply) {
        // This post is part of a thread - track the root
        if (!threadRoots.has(reply.root.uri)) {
          threadRoots.set(reply.root.uri, post.uri);
        }
      }

      processedItems.push({
        isThread: !!reply,
        post,
      });
    }

    // Fetch all unique threads in parallel
    const threadPromises = Array.from(threadRoots.keys()).map(async (rootUri) => {
      // Find any post in this thread to fetch the full thread
      const anyPostInThread = processedItems.find(
        (item) => item.post.record.reply?.root.uri === rootUri
      );
      if (!anyPostInThread) return null;

      const thread = await getPostThread(anyPostInThread.post.uri);
      return { rootUri, thread };
    });

    const threadResults = await Promise.all(threadPromises);

    // Map root URIs to flattened thread posts
    const threadMap = new Map<string, BlueskyPost[]>();
    for (const result of threadResults) {
      if (result && result.thread) {
        const posts = flattenThreadToAncestors(result.thread);
        if (posts.length > 0) {
          threadMap.set(result.rootUri, posts);
        }
      }
    }

    // Update processed items with thread data
    for (const item of processedItems) {
      if (item.isThread && item.post.record.reply) {
        const threadPosts = threadMap.get(item.post.record.reply.root.uri);
        if (threadPosts && threadPosts.length > 1) {
          item.threadPosts = threadPosts;
        } else {
          // Thread fetch failed or only one post, show as single
          item.isThread = false;
        }
      }
    }

    // Deduplicate: if multiple posts from same thread, keep only the latest one
    // Also skip standalone posts whose URI is the root of a thread being shown
    const seenThreads = new Set<string>();
    const deduplicatedItems: ProcessedFeedItem[] = [];

    // First pass: identify all thread roots that will be shown as threads
    const shownThreadRoots = new Set<string>();
    for (const item of processedItems) {
      if (item.isThread && item.threadPosts && item.post.record.reply) {
        shownThreadRoots.add(item.post.record.reply.root.uri);
      }
    }

    for (const item of processedItems) {
      if (item.isThread && item.post.record.reply) {
        const rootUri = item.post.record.reply.root.uri;
        if (seenThreads.has(rootUri)) {
          continue; // Skip duplicate thread entries
        }
        seenThreads.add(rootUri);
      } else {
        // Standalone post - check if it's a thread root that will be shown as part of a thread
        if (shownThreadRoots.has(item.post.uri)) {
          continue; // Skip standalone root posts when their thread is being shown
        }
      }
      deduplicatedItems.push(item);
    }

    return { items: deduplicatedItems };
  } catch (error) {
    console.error('Error fetching Bluesky feed:', error);
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Failed to load posts',
    };
  }
}

// Helper: Convert post URI to bsky.app URL
export function getPostUrl(uri: string, handle: string): string {
  // URI format: at://did:plc:xxx/app.bsky.feed.post/rkey
  const parts = uri.split('/');
  const rkey = parts[parts.length - 1];
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

// Helper: Format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 7) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  if (diffDay > 0) return `${diffDay}d`;
  if (diffHour > 0) return `${diffHour}h`;
  if (diffMin > 0) return `${diffMin}m`;
  return 'now';
}

// Helper: Render rich text with facets (links, mentions, hashtags)
export function renderRichText(text: string, facets?: BlueskyFacet[]): string {
  if (!facets || facets.length === 0) {
    return escapeHtml(text);
  }

  // Convert text to byte array for accurate slicing with facet byte indices
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(text);

  // Sort facets by start index (descending) to process from end to start
  const sortedFacets = [...facets].sort(
    (a, b) => b.index.byteStart - a.index.byteStart
  );

  let result = bytes;

  for (const facet of sortedFacets) {
    const { byteStart, byteEnd } = facet.index;
    const feature = facet.features[0];
    if (!feature) continue;

    const segment = decoder.decode(result.slice(byteStart, byteEnd));
    let replacement = escapeHtml(segment);

    if (feature.$type === 'app.bsky.richtext.facet#link' && feature.uri) {
      replacement = `<a href="${escapeHtml(feature.uri)}" target="_blank" rel="noopener noreferrer" class="bsky-link">${escapeHtml(segment)}</a>`;
    } else if (feature.$type === 'app.bsky.richtext.facet#mention' && feature.did) {
      const handle = segment.startsWith('@') ? segment.slice(1) : segment;
      replacement = `<a href="https://bsky.app/profile/${escapeHtml(handle)}" target="_blank" rel="noopener noreferrer" class="bsky-link">${escapeHtml(segment)}</a>`;
    } else if (feature.$type === 'app.bsky.richtext.facet#tag' && feature.tag) {
      replacement = `<a href="https://bsky.app/hashtag/${encodeURIComponent(feature.tag)}" target="_blank" rel="noopener noreferrer" class="bsky-link">${escapeHtml(segment)}</a>`;
    }

    // Replace the segment
    const before = result.slice(0, byteStart);
    const after = result.slice(byteEnd);
    const replacementBytes = encoder.encode(replacement);
    result = new Uint8Array([...before, ...replacementBytes, ...after]);
  }

  return decoder.decode(result);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
