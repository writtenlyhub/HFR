"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  InstagramMediaItem,
  InstagramFeedResult,
} from "@/lib/instagram/types";
import { Play, Layers, Film, Heart, MessageCircle, ExternalLink } from "lucide-react";

/**
 * Clean, lightweight Instagram SVG icon matching Lucide styling.
 */
export function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export interface InstagramFeedProps {
  /** Optional pre-fetched feed result from server component */
  initialData?: InstagramFeedResult | null;
  /** Explicit array of media items if used in custom contexts */
  items?: InstagramMediaItem[];
  /** Canonical Instagram profile URL */
  profileUrl?: string;
  /** Instagram handle without @ */
  username?: string;
  /** Main section heading (default: "Follow Our Journey") */
  heading?: string;
  /** Supporting subtitle text */
  subheading?: string;
  /** Maximum number of items to display (default: 8) */
  limit?: number;
  /** Optional extra classes for container styling */
  className?: string;
}

export function InstagramFeed({
  initialData,
  items: directItems,
  profileUrl: propProfileUrl,
  username: propUsername,
  heading = "Follow Our Journey",
  subheading = "Discover the moments, experiences, and beautiful spaces that make DevStay special.",
  limit = 8,
  className = "",
}: InstagramFeedProps) {
  const [feedItems, setFeedItems] = useState<InstagramMediaItem[]>(
    directItems || initialData?.data?.slice(0, limit) || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    !directItems && !initialData
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const profileUrl =
    propProfileUrl ||
    initialData?.profileUrl ||
    "https://instagram.com/devstays.jaipur";
  const username =
    propUsername || initialData?.username || "devstays.jaipur";

  // Client-side fetch if no initial data was provided by the server
  useEffect(() => {
    if (directItems || initialData) return;

    let isMounted = true;
    async function fetchClientFeed() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/instagram/feed?limit=${limit}`);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const json: InstagramFeedResult = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setFeedItems(json.data.slice(0, limit));
          } else {
            setLoadError(json.error || "Unable to load Instagram feed");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setLoadError(msg);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchClientFeed();
    return () => {
      isMounted = false;
    };
  }, [directItems, initialData, limit]);

  return (
    <section
      id="instagram"
      className={`pt-24 pb-20 bg-white border-t border-neutral-100 scroll-mt-24 overflow-hidden ${className}`}
      data-purpose="instagram-gallery"
    >
      {/* Section Header (Centered max-w Container) */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] font-bold tracking-[0.2em] text-neutral-600 uppercase shadow-2xs">
              <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
              <span>INSTAGRAM · @{username.toUpperCase()}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
              {heading}
            </h2>
            <p className="text-sm md:text-base text-neutral-600 leading-relaxed font-normal">
              {subheading}
            </p>
          </div>

          {/* Follow Button */}
          <div className="shrink-0">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 bg-neutral-900 hover:bg-black text-white px-6 py-3 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              aria-label={`Follow @${username} on Instagram (opens in new tab)`}
            >
              <InstagramIcon className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
              <span>Follow @{username}</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
            </a>
          </div>
        </div>

        {/* Loading Skeleton State */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: limit }).map((_, idx) => (
              <div
                key={`ig-skel-${idx}`}
                className="aspect-square bg-neutral-100 animate-pulse rounded-2xl border border-neutral-200/60"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && feedItems.length === 0 && (
          <div className="text-center py-16 px-6 bg-[#FAFAFA] rounded-2xl border border-neutral-200/80 max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center mx-auto text-neutral-700">
              <InstagramIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">
              Moments Coming Soon
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-md mx-auto">
              Follow our official Instagram account @{username} to stay updated with
              guest stories, estate glimpses, and Jaipur travel recommendations.
            </p>
            {loadError && (
              <p className="text-[11px] text-neutral-400 font-mono">
                Note: {loadError}
              </p>
            )}
            <div className="pt-2">
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-neutral-900 text-white px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-neutral-800 transition"
              >
                <InstagramIcon className="w-3.5 h-3.5" />
                <span>Visit @{username}</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Dual-Row Motion Marquee (Opposite Direction Movement) */}
      {!isLoading && feedItems.length > 0 && (
        <div className="relative w-full overflow-hidden space-y-4 md:space-y-5 pt-2">
          {/* Left & Right Vignette Fade Masks */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 md:w-40 bg-gradient-to-r from-white via-white/85 to-transparent z-30"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 md:w-40 bg-gradient-to-l from-white via-white/85 to-transparent z-30"
            aria-hidden="true"
          />

          {/* Row 1: Smooth Infinite Glide Towards the LEFT */}
          <div className="flex overflow-hidden select-none">
            <div className="animate-marquee-left flex items-center gap-4 md:gap-5">
              {[
                ...feedItems.filter((_, idx) => idx % 2 === 0),
                ...feedItems.filter((_, idx) => idx % 2 === 0),
                ...feedItems.filter((_, idx) => idx % 2 === 0),
                ...feedItems.filter((_, idx) => idx % 2 === 0),
              ].map((item, idx) => (
                <div
                  key={`row1-${item.id}-${idx}`}
                  className="w-[220px] sm:w-[260px] md:w-[290px] flex-shrink-0"
                >
                  <InstagramMediaCard item={item} />
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Smooth Infinite Glide Towards the RIGHT (Opposite Direction) */}
          <div className="flex overflow-hidden select-none">
            <div className="animate-marquee-right flex items-center gap-4 md:gap-5">
              {[
                ...feedItems.filter((_, idx) => idx % 2 !== 0),
                ...feedItems.filter((_, idx) => idx % 2 !== 0),
                ...feedItems.filter((_, idx) => idx % 2 !== 0),
                ...feedItems.filter((_, idx) => idx % 2 !== 0),
              ].map((item, idx) => (
                <div
                  key={`row2-${item.id}-${idx}`}
                  className="w-[220px] sm:w-[260px] md:w-[290px] flex-shrink-0"
                >
                  <InstagramMediaCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Individual Instagram Media Card with non-overlapping tags and refined luxury hover overlay.
 */
function InstagramMediaCard({ item }: { item: InstagramMediaItem }) {
  const [imageError, setImageError] = useState(false);
  const visualUrl = item.thumbnailUrl || item.mediaUrl;

  const isVideoOrReel = item.isReel || item.mediaType === "VIDEO";
  const isCarousel = item.mediaType === "CAROUSEL_ALBUM";

  return (
    <a
      href={item.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/80 shadow-xs hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
      aria-label={
        item.caption
          ? `Instagram post: ${item.caption.slice(0, 80)}`
          : "View post on Instagram"
      }
    >
      {/* Media Image / Thumbnail */}
      {!imageError && visualUrl ? (
        <img
          src={visualUrl}
          alt={item.caption || "DevStay Instagram post"}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-neutral-400 bg-neutral-100">
          <InstagramIcon className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-[11px] font-medium text-center">
            View on Instagram
          </span>
        </div>
      )}

      {/* Top Media Tags Bar (Non-overlapping & Cleanly Separated) */}
      <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Instagram Brand Tag on Hover */}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 inline-flex items-center gap-1.5 bg-black/75 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs uppercase tracking-wider border border-white/10">
          <InstagramIcon className="w-3 h-3 text-pink-400" />
          <span>DevStay</span>
        </span>

        {/* Right: Media Type Badge (Always visible, perfectly seated without overlap) */}
        <div className="ml-auto">
          {isVideoOrReel && (
            <span className="inline-flex items-center gap-1.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-xs border border-white/15">
              {item.isReel ? (
                <>
                  <Film className="w-3 h-3 text-amber-300" />
                  <span>Reel</span>
                </>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5 fill-white text-white" />
                  <span>Video</span>
                </>
              )}
            </span>
          )}

          {isCarousel && (
            <span className="inline-flex items-center gap-1.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-xs border border-white/15">
              <Layers className="w-3 h-3 text-amber-300" />
              <span>Album</span>
            </span>
          )}
        </div>
      </div>

      {/* Desktop Hover Overlay (Bottom Gradient with Caption & Metrics - Zero Tag Collisions) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 text-white z-20 pointer-events-none">
        {/* Center: Frosted Glass View Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>

        {/* Bottom Details */}
        <div className="space-y-2 relative z-10">
          {item.caption && (
            <p className="text-xs text-neutral-200 line-clamp-2 leading-snug font-normal drop-shadow-xs">
              {item.caption}
            </p>
          )}

          <div className="flex items-center justify-between text-[11px] text-neutral-300 pt-1.5 border-t border-white/15">
            {/* Likes & Comments */}
            <div className="flex items-center gap-3">
              {typeof item.likeCount === "number" && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />
                  <span>{item.likeCount}</span>
                </span>
              )}
              {typeof item.commentsCount === "number" && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <MessageCircle className="w-3 h-3 text-neutral-300" />
                  <span>{item.commentsCount}</span>
                </span>
              )}
            </div>

            <span className="text-[10px] font-semibold text-amber-300 flex items-center gap-1 group-hover:underline">
              <span>View Post</span>
              <span>↗</span>
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
