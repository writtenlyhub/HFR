import { InstagramMediaItem, InstagramMediaType } from "./types";

interface MetaGraphMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface MetaGraphResponse {
  data?: MetaGraphMediaItem[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Validates that an external media URL comes from an expected, secure domain
 * to prevent SSRF or untrusted URL injection.
 */
function isValidInstagramMediaUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    const trustedDomains = [
      "cdninstagram.com",
      "instagram.com",
      "fbcdn.net",
      "facebook.com",
    ];
    return trustedDomains.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );
  } catch {
    // If it's a local relative path (like in development/testing), allow it
    return urlStr.startsWith("/");
  }
}

/**
 * Normalizes a raw Meta Graph API media item into our application's standard InstagramMediaItem.
 */
function normalizeMetaMediaItem(raw: MetaGraphMediaItem): InstagramMediaItem | null {
  if (!raw.id || !raw.permalink) {
    return null;
  }

  // Determine media type
  let mediaType: InstagramMediaType = "IMAGE";
  if (raw.media_type === "VIDEO") {
    mediaType = "VIDEO";
  } else if (raw.media_type === "CAROUSEL_ALBUM") {
    mediaType = "CAROUSEL_ALBUM";
  }

  // Detect whether this is a Reel based on permalink pattern or video type
  const isReel =
    mediaType === "VIDEO" &&
    (raw.permalink.includes("/reel/") || raw.permalink.includes("/reels/"));

  // Resolve media and thumbnail URLs safely
  const mediaUrl = raw.media_url || raw.thumbnail_url || "";
  const thumbnailUrl = raw.thumbnail_url || raw.media_url || null;

  // Validate that we have at least one usable visual URL
  const visualUrl = thumbnailUrl || mediaUrl;
  if (!visualUrl || !isValidInstagramMediaUrl(visualUrl)) {
    console.warn(`[InstagramAPI] Discarding item ${raw.id} due to invalid or missing media URL.`);
    return null;
  }

  return {
    id: raw.id,
    mediaType,
    mediaUrl,
    thumbnailUrl,
    permalink: raw.permalink,
    caption: raw.caption || null,
    timestamp: raw.timestamp || new Date().toISOString(),
    isReel,
    likeCount: typeof raw.like_count === "number" ? raw.like_count : undefined,
    commentsCount:
      typeof raw.comments_count === "number" ? raw.comments_count : undefined,
  };
}

export interface FetchLiveInstagramOptions {
  accessToken: string;
  userId?: string;
  apiVersion?: string;
  limit?: number;
}

/**
 * Fetches live media items from Meta's official Instagram Graph API.
 * Never logs or exposes access tokens in messages or error outputs.
 */
export async function fetchLiveInstagramFeed(
  options: FetchLiveInstagramOptions
): Promise<InstagramMediaItem[]> {
  const {
    accessToken,
    userId = "me",
    apiVersion = "v21.0",
    limit = 12,
  } = options;

  if (!accessToken || !accessToken.trim()) {
    throw new Error("Instagram access token is missing or empty.");
  }

  // Standard official Meta Graph API media endpoint for authorized Professional accounts
  const targetId = userId && userId.trim() ? encodeURIComponent(userId.trim()) : "me";
  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp",
    "like_count",
    "comments_count",
  ].join(",");

  const url = new URL(`https://graph.instagram.com/${apiVersion}/${targetId}/media`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(Math.min(limit, 24)));
  url.searchParams.set("access_token", accessToken);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      // Cache at fetch level for 1 hour to prevent Meta rate-limiting
      next: { revalidate: 3600 },
    });
  } catch (netErr: unknown) {
    const errorMsg = netErr instanceof Error ? netErr.message : String(netErr);
    // Sanitize any accidental token leakage from URL strings
    const safeMsg = errorMsg.replace(/access_token=[^&]+/g, "access_token=[REDACTED]");
    throw new Error(`Meta Graph API network error: ${safeMsg}`);
  }

  let json: MetaGraphResponse;
  try {
    json = (await response.json()) as MetaGraphResponse;
  } catch {
    throw new Error(`Meta Graph API returned non-JSON response with HTTP status ${response.status}`);
  }

  if (!response.ok || json.error) {
    const errCode = json.error?.code ?? response.status;
    const errType = json.error?.type ?? "OAuthException";
    const rawMsg = json.error?.message ?? `HTTP error ${response.status}`;
    const safeMsg = rawMsg.replace(/access_token=[^&]+/g, "access_token=[REDACTED]");

    console.error(`[InstagramAPI] Meta Graph API error (Code: ${errCode}, Type: ${errType}):`, safeMsg);
    throw new Error(`Instagram API Error (${errCode}): ${safeMsg}`);
  }

  if (!json.data || !Array.isArray(json.data)) {
    return [];
  }

  // Normalize, filter valid items, and sort by timestamp descending
  const normalized = json.data
    .map(normalizeMetaMediaItem)
    .filter((item): item is InstagramMediaItem => item !== null);

  normalized.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return normalized;
}
