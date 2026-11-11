"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Share2, Heart } from "lucide-react";

interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  category: string | null;
}

interface PhotoGalleryProps {
  images?: GalleryImage[];
}

export function PhotoGallery({ images = [] }: PhotoGalleryProps) {
  // Default fallback images with authentic property photography
  const defaultGallery: GalleryImage[] = [
    {
      id: "1",
      url: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
      caption: "Grand Living Salon with Rajasthani Crafts & Archways",
      category: "living",
    },
    {
      id: "2",
      url: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
      caption: "Main Bedroom Suite King Bed & Teak Accents",
      category: "bedroom",
    },
    {
      id: "3",
      url: "/images/dining/imgi_67_1ea5b444-ee63-4a50-aff9-d7dbe31eceb2.jpg",
      caption: "Heritage Dining Hall & Colonnade",
      category: "dining",
    },
    {
      id: "4",
      url: "/images/kitchen/imgi_6_48052375-3227-4ddc-bb6f-51b650b76963.jpg",
      caption: "Modern Chef Kitchen with Full Amenities",
      category: "kitchen",
    },
    {
      id: "5",
      url: "/images/patio/2544fbd9-3035-4426-878d-3498cd2963ef.avif",
      caption: "Covered Veranda & Sunlit Colonnade",
      category: "exterior",
    },
  ];

  const galleryList = images.length > 0 ? images : defaultGallery;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  const mainImage = galleryList[0];
  const sideImages = galleryList.slice(1, 5);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    }
  };

  const nextImage = useCallback(() => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % galleryList.length);
    }
  }, [lightboxIndex, galleryList.length]);

  const prevImage = useCallback(() => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + galleryList.length) % galleryList.length);
    }
  }, [lightboxIndex, galleryList.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, nextImage, prevImage]);

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-8 pb-12"
      data-purpose="property-gallery"
      id="gallery"
    >
      <div id="property-gallery" className="sr-only" aria-hidden="true" />
      {/* Header bar */}
      <div className="flex flex-col sm:row sm:items-end justify-between mb-4 gap-2">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
            Visual Tour
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Spaces of Dev Stays
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500">
            Your own private 3BHK villa in Raja Park with hand-crafted
            interiors, front veranda &amp; private parking
          </p>
        </div>

        {/* Share and Save controls */}
        <div className="flex items-center gap-3 text-xs font-semibold text-neutral-700">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 hover:text-black transition-colors"
          >
            <Share2 size={15} />
            <span>{shareFeedback ? "Link Copied!" : "Share"}</span>
          </button>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className={`flex items-center gap-1.5 transition-colors ${
              isSaved ? "text-rose-500" : "hover:text-black"
            }`}
          >
            <Heart size={15} fill={isSaved ? "currentColor" : "none"} />
            <span>{isSaved ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Grid: 7 cols main, 5 cols 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 rounded-3xl overflow-hidden relative">
        {/* Main large image */}
        {mainImage && (
          <div
            onClick={() => setLightboxIndex(0)}
            className="md:col-span-7 relative aspect-[4/3] md:h-[460px] overflow-hidden group cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mainImage.url}
              alt={mainImage.caption || "Dev Stays Main Courtyard"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
            <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-md text-white text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider font-semibold">
              {mainImage.caption || "Central Plunge Pool & Courtyard"}
            </div>
          </div>
        )}

        {/* 4 grid side images */}
        <div className="md:col-span-5 grid grid-cols-2 gap-2.5 h-full md:h-[460px]">
          {sideImages.map((img, idx) => {
            const actualIndex = idx + 1;
            const isLast = idx === sideImages.length - 1;
            return (
              <div
                key={img.id}
                onClick={() => setLightboxIndex(actualIndex)}
                className="relative aspect-square md:h-[224px] overflow-hidden group cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption || `Dev Stays room ${actualIndex}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute bottom-2 left-2 text-[10px] bg-black/90 text-white px-2 py-0.5 rounded font-medium">
                  {img.category === "bedroom"
                    ? "Master Suite"
                    : img.category === "living"
                    ? "Living Salon"
                    : img.category === "dining"
                    ? "Dining Room"
                    : "Terraces"}
                </div>

                {isLast && (
                  <>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(0);
                      }}
                      className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-neutral-900 border border-neutral-300 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        photo_library
                      </span>
                      <span>View All Photos</span>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 transition-all"
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 text-white hover:text-neutral-300 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 transition-colors"
          >
            <X size={22} />
          </button>

          {/* Prev button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-6 text-white hover:text-neutral-300 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 transition-colors"
          >
            <ChevronLeft size={26} />
          </button>

          {/* Next button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-6 text-white hover:text-neutral-300 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 transition-colors"
          >
            <ChevronRight size={26} />
          </button>

          {/* Modal content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl max-h-[85vh] flex flex-col items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galleryList[lightboxIndex].url}
              alt={galleryList[lightboxIndex].caption || "Enlarged property photo"}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="flex items-center justify-between w-full mt-4 px-2">
              <p className="text-white text-sm font-medium tracking-wide">
                {galleryList[lightboxIndex].caption}
              </p>
              <span className="text-xs text-neutral-400 font-mono">
                {lightboxIndex + 1} / {galleryList.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
