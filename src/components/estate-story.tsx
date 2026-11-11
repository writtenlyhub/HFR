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
              Your Home Away From Home
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-neutral-900 mt-1 font-sans">
              YOUR OWN PRIVATE 3BHK VILLA IN CENTRAL JAIPUR
            </h2>
          </div>

          <div className="text-neutral-700 text-sm sm:text-base leading-relaxed space-y-4">
            <p className="text-base sm:text-lg font-medium text-neutral-900">
              <strong>Dev Stays (@devstays.jaipur)</strong> is your own private
              villa in the heart of Raja Park, Jaipur — no shared spaces, no
              other guests. Just your group, your home, your rules.
            </p>

            <p>
              Every corner has been handcrafted with Rajasthani textiles,
              crochet details, antique touches, indoor plants, and curated decor
              that guests describe as <em>&ldquo;beautiful, warm, and nostalgic.&rdquo;</em>{" "}
              I&apos;ve personally set it up like my own home ❤️
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="p-4 rounded-2xl bg-white border border-neutral-200">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-700">bed</span>
                  <span>The Villa</span>
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Three king bedrooms, each with a private attached bathroom
                  (hot water), air conditioning, and fast Wi-Fi throughout. A large
                  living room with 3 sofas for family dinners and game nights.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-700">soup_kitchen</span>
                  <span>Kitchen &amp; Dining</span>
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Fully equipped with fridge, RO water purifier, gas stove,
                  microwave, and cooking essentials. An on-site food ordering menu is
                  also available if you prefer not to cook.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-700">deck</span>
                  <span>Veranda &amp; Parking</span>
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Private street-facing veranda shaded by a beautiful old tree
                  with seating for morning chai. Dedicated gated parking for 3-4
                  cars inside the property.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-neutral-200">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-700">celebration</span>
                  <span>Events &amp; Groups</span>
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Birthday parties, anniversaries, work offsites, and
                  get-togethers are all welcome. Priced for 6 overnight guests;
                  can host up to 15 with arranged extra mattresses.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 border-l-2 border-neutral-900 pl-3.5 italic">
              &ldquo;Walkable to top Raja Park cafes (2-min walk) and 10–25 minutes
              to major Jaipur attractions. Pet friendly — we love hosting fur
              babies! Board games and badminton available.&rdquo;
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
