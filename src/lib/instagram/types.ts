export type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

export interface InstagramMediaItem {
  /** Unique Instagram Media ID */
  id: string;
  /** Media classification: Photo, Video/Reel, or Multi-photo Carousel */
  mediaType: InstagramMediaType;
  /** Primary media URL (direct CDN URL or public asset path) */
  mediaUrl: string;
  /** Thumbnail image URL (especially critical for VIDEO / Reel posts) */
  thumbnailUrl?: string | null;
  /** Direct Instagram permalink to the post or Reel */
  permalink: string;
  /** Caption text describing the post */
  caption?: string | null;
  /** ISO 8601 creation timestamp */
  timestamp: string;
  /** Flag denoting whether the video post is formatted as an Instagram Reel */
  isReel?: boolean;
  /** Approximate like count (if available from Graph API) */
  likeCount?: number;
  /** Approximate comments count (if available from Graph API) */
  commentsCount?: number;
  /** Short location or tag if present */
  locationName?: string | null;
}

export interface InstagramFeedResult {
  /** Indicates whether the retrieval succeeded */
  success: boolean;
  /** List of Instagram media items */
  data: InstagramMediaItem[];
  /** Whether the returned items are sourced from the mock provider */
  isMock: boolean;
  /** Target profile username */
  username: string;
  /** Canonical Instagram profile URL */
  profileUrl: string;
  /** ISO timestamp when the feed was retrieved/cached */
  timestamp: string;
  /** Optional error message if the live API or network failed */
  error?: string | null;
  /** Optional warning/note describing fallback behavior */
  warning?: string | null;
}

export interface InstagramConfig {
  useMock: boolean;
  accessToken?: string;
  userId?: string;
  apiVersion: string;
  cacheTtlSeconds: number;
  profileUrl: string;
  username: string;
}
