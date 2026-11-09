"use client";

import React from "react";
import { BookingWidget, ListingOptionBrief } from "./booking-widget";

interface AmenityData {
  id: string;
  name: string;
  description: string | null;
  iconName: string | null;
}

interface EstateStoryProps {
  amenities: AmenityData[];
  listingOptions: ListingOptionBrief[];
}

export function EstateStory({ amenities, listingOptions }: EstateStoryProps) {
  const initialSlug =
    listingOptions.find((o) => o.slug === "full-estate-buyout")?.slug ||
    listingOptions[0]?.slug ||
    "royal-suite";

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-200"
      data-purpose="property-story"
      id="estate-story"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Estate Story & Amenities */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
              Heritage Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-neutral-900 mt-1 font-sans">
              AN ARCHITECTURAL HAVEN IN THE PINK CITY
            </h2>
          </div>

          <div className="text-neutral-700 text-sm sm:text-base leading-relaxed space-y-4">
            <p>
              Crafted with locally quarried, hand-chiseled Dholpur sandstone,{" "}
              <strong>Dev Stays</strong> is conceived as a serene residential
              sanctuary in Jaipur’s coveted Civil Lines and Raja Park belt.
              Designed around classic Rajasthani haveli geometry, every sunlit
              corner frames internal courtyards, bougainvillea verandas, and
              peaceful water features.
            </p>
            <p>
              Whether visiting as a solo creative needing quiet desk space, a
              couple seeking an authentic Jaipur retreat, or a multigenerational
              family reserving the entire estate, Dev Stays strikes the balance
              between discrete boutique luxury and genuine warmth.
            </p>
          </div>

          {/* Amenities Grid */}
          <div className="pt-6 border-t border-neutral-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-4">
              Estate Amenities & Services
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-800">
              {amenities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-neutral-200 shadow-xs"
                >
                  <span className="material-symbols-outlined text-xl text-neutral-700">
                    {item.iconName || "stars"}
                  </span>
                  <div>
                    <span className="font-bold block text-neutral-900">
                      {item.name}
                    </span>
                    <span className="text-neutral-500 text-[11px]">
                      {item.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Reusable Booking Widget */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <BookingWidget
            listingOptions={listingOptions}
            initialConfigSlug={initialSlug}
            lockConfiguration={false}
            id="sidebar-booking-card"
          />
        </div>
      </div>
    </section>
  );
}
