"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Bed,
  Bath,
  Maximize2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  X,
  Clock,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Header } from "./header";
import { Footer } from "./footer";
import { BookingWidget, ListingOptionBrief } from "./booking-widget";

export interface RoomImage {
  id: string;
  url: string;
  caption?: string | null;
  category?: string | null;
  isCover?: boolean;
}

export interface RoomData {
  id: string;
  slug: string;
  title: string;
  bedroomCount: number;
  bathroomCount: number;
  maxGuests: number;
  basePricePerNight: number;
  weekendPricePerNight?: number | null;
  cleaningFee?: number;
  taxPercentage?: number;
  description: string;
  summary?: string | null;
  coverImage?: string | null;
  bedConfiguration?: string | null;
  sizeSqFt?: number | null;
  highlights?: string[];
  amenitiesList?: string[];
  images?: RoomImage[];
}

export interface PropertyData {
  id: string;
  name: string;
  slug: string;
  headline?: string | null;
  description?: string | null;
  address: string;
  city: string;
  state: string;
  checkInTime: string;
  checkOutTime: string;
  houseRules?: string | null;
  cancellationPolicy?: string | null;
  images?: RoomImage[];
}

export interface AccommodationDetailViewProps {
  property: PropertyData;
  room: RoomData;
  allListingOptions: ListingOptionBrief[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session?: any;
}

export function AccommodationDetailView({
  property,
  room,
  allListingOptions,
  session,
}: AccommodationDetailViewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Combine room dedicated images with property shared images to build full gallery
  const roomImages = room.images && room.images.length > 0 ? room.images : [];
  const propertyImages = property.images && property.images.length > 0 ? property.images : [];

  // Deduplicate gallery
  const allImagesMap = new Map<string, RoomImage>();
  if (room.coverImage) {
    allImagesMap.set(room.coverImage, {
      id: "cover",
      url: room.coverImage,
      caption: `${room.title} — Primary Suite`,
    });
  }
  roomImages.forEach((img) => allImagesMap.set(img.url, img));
  propertyImages.forEach((img) => {
    if (!allImagesMap.has(img.url)) {
      allImagesMap.set(img.url, img);
    }
  });

  const fullGallery = Array.from(allImagesMap.values());
  const displayPhotos = fullGallery.slice(0, 5);

  const getRouteSlug = (slug: string) => {
    return slug === "full-estate-buyout" ? "full-estate" : slug;
  };

  const otherOptions = allListingOptions.filter((o) => o.slug !== room.slug);

  const scrollToBooking = () => {
    const el = document.getElementById("accommodation-booking-widget");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-neutral-900 font-sans">
      <Header session={session} />

      <main className="flex-1 pb-24 lg:pb-16">
        {/* 1. Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-4">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-neutral-500 font-medium"
          >
            <Link href="/" className="hover:text-black transition-colors">
              Home
            </Link>
            <ChevronRight size={13} className="text-neutral-400" />
            <Link
              href="/properties/dev-stays-jaipur"
              className="hover:text-black transition-colors"
            >
              {property.name}
            </Link>
            <ChevronRight size={13} className="text-neutral-400" />
            <span className="text-neutral-900 font-bold truncate">
              {room.title}
            </span>
          </nav>
        </div>

        {/* 2. Accommodation Hero Title & Header */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-200">
                  {room.maxGuests >= 10 ? "Full Buyout" : "Private Suite"}
                </span>
                <span className="text-xs text-neutral-500 flex items-center gap-1">
                  <MapPin size={13} className="text-amber-700" />
                  <span>Civil Lines, Jaipur</span>
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck size={14} />
                  <span>Guaranteed Private Estate</span>
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-neutral-900 font-sans">
                {room.title}
              </h1>

              <p className="text-neutral-600 text-sm sm:text-base max-w-2xl leading-relaxed">
                {room.summary || room.description}
              </p>
            </div>

            <div className="text-left md:text-right shrink-0 bg-white md:bg-transparent p-4 md:p-0 rounded-2xl border md:border-0 border-neutral-200">
              <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                ₹{Number(room.basePricePerNight).toLocaleString("en-IN")}
                <span className="text-xs sm:text-sm font-normal text-neutral-500">
                  {" "}/ night
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                + {room.taxPercentage || 12}% GST · Exclusive Sanctuary
              </p>
            </div>
          </div>
        </section>

        {/* 3. Dedicated Photo Gallery Mosaic */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 mb-10">
          <div className="relative rounded-3xl overflow-hidden shadow-sm border border-neutral-200 bg-neutral-100">
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[360px] sm:h-[460px] lg:h-[540px]">
              {/* Primary Large Cover Photo */}
              <div
                className="md:col-span-2 md:row-span-2 relative overflow-hidden group cursor-pointer"
                onClick={() => {
                  setActivePhotoIdx(0);
                  setLightboxOpen(true);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayPhotos[0]?.url || room.coverImage || ""}
                  alt={displayPhotos[0]?.caption || room.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white text-xs font-medium">
                    {displayPhotos[0]?.caption || room.title}
                  </span>
                </div>
              </div>

              {/* Secondary Photos */}
              {displayPhotos.slice(1, 5).map((photo, idx) => (
                <div
                  key={photo.id || idx}
                  className="relative overflow-hidden group cursor-pointer hidden md:block"
                  onClick={() => {
                    setActivePhotoIdx(idx + 1);
                    setLightboxOpen(true);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || `${room.title} photo ${idx + 2}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-white text-[11px] truncate">
                      {photo.caption || "Estate View"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* View All Photos Badge Button */}
            <button
              type="button"
              onClick={() => {
                setActivePhotoIdx(0);
                setLightboxOpen(true);
              }}
              className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md hover:bg-white text-neutral-900 text-xs font-semibold px-4 py-2 rounded-full border border-neutral-300 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>View All {fullGallery.length} Photos</span>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* 4. Main Two-Column Content Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column (Details, Specs, Sleeping, Amenities, House Rules) */}
            <div className="lg:col-span-7 space-y-10">
              {/* Quick Specs Pill Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white border border-neutral-200/90 rounded-2xl flex items-center gap-3">
                  <Users className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase tracking-wider">
                      CAPACITY
                    </span>
                    <span className="text-xs font-bold text-neutral-900">
                      Up to {room.maxGuests} Guests
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-neutral-200/90 rounded-2xl flex items-center gap-3">
                  <Bed className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase tracking-wider">
                      BEDROOMS
                    </span>
                    <span className="text-xs font-bold text-neutral-900">
                      {room.bedroomCount} {room.bedroomCount === 1 ? "Bedroom" : "Bedrooms"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-neutral-200/90 rounded-2xl flex items-center gap-3">
                  <Bath className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase tracking-wider">
                      BATHROOMS
                    </span>
                    <span className="text-xs font-bold text-neutral-900">
                      {room.bathroomCount} {room.bathroomCount === 1 ? "Bathroom" : "Bathrooms"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-neutral-200/90 rounded-2xl flex items-center gap-3">
                  <Maximize2 className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase tracking-wider">
                      SPACE
                    </span>
                    <span className="text-xs font-bold text-neutral-900">
                      {room.sizeSqFt || 450} sq ft
                    </span>
                  </div>
                </div>
              </div>

              {/* Shared Inventory Exclusivity Guarantee Banner */}
              <div className="p-4 bg-stone-100 border border-stone-200 rounded-2xl flex items-start gap-3.5 text-xs text-stone-700">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-neutral-900 text-sm">
                    The Dev Stays Shared Sanctuary Guarantee
                  </h4>
                  <p className="mt-0.5 leading-relaxed text-neutral-600">
                    When you reserve this configuration, our automated shared-inventory system exclusively locks the physical estate (<code className="text-xs font-mono font-bold text-neutral-800">DEV-MAIN-ESTATE</code>) for your stay. You will never share the courtyard, plunge pool, or estate grounds with strangers.
                  </p>
                </div>
              </div>

              {/* Detailed Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2">
                  About This Accommodation
                </h3>
                <div className="text-neutral-700 text-sm sm:text-base leading-relaxed space-y-3 font-light">
                  <p>{room.description}</p>
                  <p>
                    Nestled within Jaipur’s diplomatic enclave, every architectural detail has been hand-chiseled from local Dholpur sandstone. Guests enjoy high ceilings, authentic Rajasthani jharokha arches, sun-dappled bougainvillea terraces, and seamless access to the heated courtyard plunge pool.
                  </p>
                </div>
              </div>

              {/* Room Specific Highlights */}
              {room.highlights && room.highlights.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2">
                    Accommodation Highlights
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {room.highlights.map((highlight, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-neutral-200/80 shadow-2xs"
                      >
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span className="text-neutral-800 font-medium leading-relaxed">
                          {highlight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sleeping Arrangements */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2">
                  Sleeping Arrangements
                </h3>
                <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                      <Bed size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm">
                        {room.bedConfiguration || "1 King Bed"}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Handcrafted teak bed frame with 400-thread Egyptian cotton linen
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-neutral-600">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Custom Teak Mattress</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Plush Feather Pillows</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Bedside Reading Lamps</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Room Amenities & Facilities */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2">
                  Amenities & In-Room Comforts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(
                    room.amenitiesList || [
                      "300 Mbps Enterprise Wi-Fi",
                      "Climate Control & Air Conditioning",
                      "Rain Shower & Italian Marble Bath",
                      "Garden Veranda Seating",
                      "Daily Housekeeping",
                      "Complimentary Breakfast",
                      "Electric Kettle & Chai Bar",
                      "Plunge Pool Access",
                    ]
                  ).map((amenity, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-neutral-200/80"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-neutral-800 font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* House Rules & Policies */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2">
                  Stay Policies & House Rules
                </h3>
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 text-xs text-neutral-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-neutral-200">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-neutral-500" />
                      <div>
                        <span className="font-bold text-neutral-900 block">Check-in</span>
                        <span>From {property.checkInTime || "14:00 PM"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-neutral-500" />
                      <div>
                        <span className="font-bold text-neutral-900 block">Check-out</span>
                        <span>By {property.checkOutTime || "11:00 AM"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-neutral-900">Cancellation Policy:</p>
                    <p className="text-neutral-600 leading-relaxed">
                      {property.cancellationPolicy ||
                        "Full refund up to 7 days before check-in. 50% refund between 7 days and 48 hours prior to check-in. Direct booking cancellation guarantees applied."}
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-neutral-200 text-neutral-600 text-[11px]">
                    <p>• Quiet hours after 10:00 PM to respect neighboring residences.</p>
                    <p>• Smoking permitted in outdoor garden courtyards only.</p>
                    <p>• No unauthorized outside parties without prior host consent.</p>
                  </div>
                </div>
              </div>

              {/* Compare / Explore Other Configurations */}
              {otherOptions.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Explore Alternatives
                      </span>
                      <h3 className="text-lg font-bold text-neutral-900">
                        Other Configurations at Dev Stays
                      </h3>
                    </div>
                    <Link
                      href="/properties/dev-stays-jaipur"
                      className="text-xs text-amber-800 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>View Estate Overview</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {otherOptions.map((opt) => (
                      <Link
                        key={opt.id}
                        href={`/properties/dev-stays-jaipur/${getRouteSlug(opt.slug)}`}
                        className="bg-white border border-neutral-200 rounded-2xl p-4 hover:border-amber-700 hover:shadow-md transition-all group block"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-neutral-900 group-hover:text-amber-800 transition-colors">
                            {opt.title}
                          </h4>
                          <span className="text-xs font-bold text-neutral-900">
                            ₹{Number(opt.basePricePerNight).toLocaleString("en-IN")}/nt
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2 mb-3">
                          Up to {opt.maxGuests || 5} Guests · {opt.bedroomCount || 2} Bedrooms · Heated Plunge Pool
                        </p>
                        <div className="text-[11px] font-semibold text-neutral-900 flex items-center gap-1 group-hover:gap-2 transition-all">
                          <span>View Detail Page</span>
                          <span>→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Pre-Selected Locked Booking Widget */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <BookingWidget
                listingOptions={allListingOptions}
                initialConfigSlug={room.slug}
                lockConfiguration={true}
                id="accommodation-booking-widget"
              />
            </div>
          </div>
        </section>
      </main>

      {/* 5. Mobile Floating Bottom Booking Bar (visible on < lg screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-4 py-3 shadow-2xl flex items-center justify-between">
        <div>
          <span className="text-lg font-extrabold text-neutral-900">
            ₹{Number(room.basePricePerNight).toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-neutral-500"> / night</span>
          <p className="text-[10px] text-neutral-500 truncate max-w-[150px]">
            {room.title} · Up to {room.maxGuests} Guests
          </p>
        </div>

        <button
          type="button"
          onClick={scrollToBooking}
          className="px-6 py-3 bg-black hover:bg-neutral-800 text-white text-xs uppercase tracking-wider font-semibold rounded-full shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <span>Reserve Now</span>
          <span>→</span>
        </button>
      </div>

      {/* 6. Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in">
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-4 border-b border-neutral-800">
            <div>
              <h3 className="font-bold text-sm sm:text-base">{room.title}</h3>
              <p className="text-xs text-neutral-400">
                Photo {activePhotoIdx + 1} of {fullGallery.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="text-neutral-400 hover:text-white p-2 text-2xl cursor-pointer"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center max-w-5xl max-h-[75vh] w-full p-2 my-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullGallery[activePhotoIdx]?.url || room.coverImage || ""}
              alt={fullGallery[activePhotoIdx]?.caption || room.title}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
            />
          </div>

          <div className="w-full max-w-5xl text-center text-white py-3">
            <p className="text-xs text-neutral-300">
              {fullGallery[activePhotoIdx]?.caption || room.title}
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() =>
                  setActivePhotoIdx((prev) =>
                    prev > 0 ? prev - 1 : fullGallery.length - 1
                  )
                }
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded-full cursor-pointer"
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setActivePhotoIdx((prev) =>
                    prev < fullGallery.length - 1 ? prev + 1 : 0
                  )
                }
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded-full cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

