import { InstagramFeedResult, InstagramMediaItem, InstagramConfig } from "./types";
import { MOCK_INSTAGRAM_MEDIA } from "./mock-data";
import { fetchLiveInstagramFeed } from "./instagram-api";

/**
 * In-memory server-side cache structure.
 * Survives across requests within a Node.js process / serverless instance container.
 */
interface CacheEntry {
  result: InstagramFeedResult;
  expiresAt: number;
}

let memoryCache: CacheEntry | null = null;

/**
 * Resolves Instagram environment configuration with safe defaults.
 */
export function getInstagramConfig(): InstagramConfig {
  const useMockEnv = process.env.INSTAGRAM_USE_MOCK;
  // If explicitly set to "false", live API mode is strictly enforced.
  // Otherwise, defaults to mock mode so development/staging is never blocked.
  const useMock = useMockEnv !== "false";

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const userId = process.env.INSTAGRAM_USER_ID?.trim() || "me";
  const apiVersion = process.env.INSTAGRAM_API_VERSION?.trim() || "v21.0";

  const rawTtl = parseInt(process.env.INSTAGRAM_CACHE_TTL_SECONDS || "1800", 10);
  const cacheTtlSeconds = Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : 1800; // default 30 mins

  const profileUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_PROFILE_URL ||
    process.env.INSTAGRAM_PROFILE_URL ||
    "https://instagram.com/devstays.jaipur";

  // Extract clean username from profile URL or default
  const usernameMatch = profileUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  const username = usernameMatch ? usernameMatch[1] : "devstays.jaipur";

  return {
    useMock,
    accessToken,
    userId,
    apiVersion,
    cacheTtlSeconds,
    profileUrl,
    username,
  };
}

/**
 * Fetches the Instagram feed according to current environment configuration.
 *
 * Implements server-side in-memory caching and stale-while-revalidate fallback:
 * 1. Returns valid cached data immediately without hitting external APIs.
 * 2. If mock mode is active, serves the rich DevStay mock dataset.
 * 3. If live mode is active, calls Meta Graph API and updates the cache.
 * 4. If live API fails (e.g. expired token, network issue), returns the stale cache
 *    if available, or a graceful safe empty response with error details.
 * 5. THE HOMEPAGE NEVER CRASHES due to Instagram API errors.
 */
export async function getInstagramFeed(options?: {
  forceRefresh?: boolean;
  limit?: number;
}): Promise<InstagramFeedResult> {
  const config = getInstagramConfig();
  const now = Date.now();
  const limit = options?.limit || 8;

  // 1. Check in-memory cache if not explicitly forcing refresh
  if (
    !options?.forceRefresh &&
    memoryCache &&
    memoryCache.expiresAt > now &&
    memoryCache.result.isMock === config.useMock
  ) {
    return {
      ...memoryCache.result,
      data: memoryCache.result.data.slice(0, limit),
    };
  }

  // 2. Mock Provider Branch
  if (config.useMock) {
    const mockResult: InstagramFeedResult = {
      success: true,
      data: MOCK_INSTAGRAM_MEDIA.slice(0, limit),
      isMock: true,
      username: config.username,
      profileUrl: config.profileUrl,
      timestamp: new Date().toISOString(),
      warning:
        "Using mock Instagram data (INSTAGRAM_USE_MOCK=true). Connect Meta API credentials to enable live feed.",
    };

    // Cache mock response
    memoryCache = {
      result: mockResult,
      expiresAt: now + config.cacheTtlSeconds * 1000,
    };

    return mockResult;
  }

  // 3. Live Instagram Graph API Branch
  if (!config.accessToken) {
    const missingCredsResult: InstagramFeedResult = {
      success: false,
      data: [],
      isMock: false,
      username: config.username,
      profileUrl: config.profileUrl,
      timestamp: new Date().toISOString(),
      error:
        "Instagram access token is not configured (INSTAGRAM_ACCESS_TOKEN is missing). Set INSTAGRAM_USE_MOCK=true to use mock data.",
    };
    return missingCredsResult;
  }

  try {
    const liveMedia = await fetchLiveInstagramFeed({
      accessToken: config.accessToken,
      userId: config.userId,
      apiVersion: config.apiVersion,
      limit: Math.max(limit, 12),
    });

    const liveResult: InstagramFeedResult = {
      success: true,
      data: liveMedia.slice(0, limit),
      isMock: false,
      username: config.username,
      profileUrl: config.profileUrl,
      timestamp: new Date().toISOString(),
    };

    // Save to memory cache with configured TTL
    memoryCache = {
      result: liveResult,
      expiresAt: now + config.cacheTtlSeconds * 1000,
    };

    return liveResult;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[InstagramProvider] Failed to fetch live Instagram feed:", errMsg);

    // Stale-while-revalidate fallback: if previous cache exists, return it with a warning
    if (memoryCache && memoryCache.result.data.length > 0) {
      console.warn("[InstagramProvider] Serving stale cached Instagram feed due to live API error.");
      return {
        ...memoryCache.result,
        data: memoryCache.result.data.slice(0, limit),
        warning: `Serving cached data: ${errMsg}`,
      };
    }

    // Graceful fallback: return empty data with safe error message (homepage will not crash)
    return {
      success: false,
      data: [],
      isMock: false,
      username: config.username,
      profileUrl: config.profileUrl,
      timestamp: new Date().toISOString(),
      error: errMsg,
    };
  }
}
