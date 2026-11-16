"use client";

import React from "react";
import { BookingWidget, ListingOptionBrief } from "./booking-widget";
import {
  Bed,
  UtensilsCrossed,
  Car,
  PartyPopper,
  Sparkles,
} from "lucide-react";

interface AmenityData {
  id: string;
  name: string;
  description: string | null;
  iconName: string | null;
}

interface EstateStoryProps {
  amenities: AmenityData[];
  listingOptions: ListingOptionBrief[];
  cmsContent?: {
    badge?: string;
    headline?: string;
    description?: string;
    brandStory?: string;
    highlights?: Array<{
      title: string;
      detail: string;
      iconName?: string;
    }>;
  };
}

export function EstateStory({ amenities, listingOptions, cmsContent }: EstateStoryProps) {
  const initialSlug =
    listingOptions.find((o) => o.slug === "full-estate-buyout")?.slug ||
    listingOptions[0]?.slug ||
    "royal-suite";

  const defaultHighlights = [
    {
      icon: Bed,
      title: "The Villa",
      detail:
        "Three king bedrooms, private attached bathrooms (24/7 hot water), AC & spacious family living room.",
    },
    {
      icon: UtensilsCrossed,
      title: "Kitchen & Dining",
      detail:
        "Full kitchen with fridge, RO water, gas stove, microwave & an on-site local food ordering menu.",
    },
    {
      icon: Car,
      title: "Veranda & Parking",
      detail:
        "Street-facing tree-shaded veranda for morning chai + dedicated gated parking for 3–4 cars.",
    },
    {
      icon: PartyPopper,
      title: "Events & Gatherings",
      detail:
        "Priced for 6 overnight guests; welcomes get-togethers, offsites & celebrations for up to 15.",
    },
  ];

  const highlights = cmsContent?.highlights && cmsContent.highlights.length > 0
    ? cmsContent.highlights.map((h, i) => ({
        icon: defaultHighlights[i % defaultHighlights.length]?.icon || Bed,
        title: h.title,
        detail: h.detail,
      }))
    : defaultHighlights;

  const badge = cmsContent?.badge || "Private Estate · Raja Park, Jaipur";
  const headline = cmsContent?.headline || "Your Own Private 3BHK Sanctuary";
  const description =
    cmsContent?.description ||
    "An entire private villa in the heart of Raja Park reserved exclusively for your group — no shared spaces, no other guests. Handcrafted with warm Rajasthani textiles, crochet accents, indoor plants, and antique character.";

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-100"
      data-purpose="property-story"
      id="estate-story"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Estate Story & Refined Features */}
        <div className="lg:col-span-7 space-y-8">
          {/* Header */}
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{badge}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 leading-tight">
              {headline}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-normal">
              {description}
            </p>
          </div>

          {/* 4 Core Villa Highlights in a Clean Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-neutral-50/70 border border-neutral-200/70 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-800 shrink-0">
                      <IconComponent className="w-4 h-4 text-amber-700" />
                    </div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed pl-9.5">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Estate Amenities & Services (Restored) */}
          <div className="pt-6 border-t border-neutral-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-4">
              Estate Amenities &amp; Services
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
