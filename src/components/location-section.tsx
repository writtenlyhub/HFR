"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Landmark } from "./interactive-location-map";

// Dynamically import InteractiveLocationMap with ssr: false to support Leaflet
const InteractiveLocationMap = dynamic(
  () => import("./interactive-location-map"),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full h-[400px] sm:h-[500px] rounded-3xl overflow-hidden border border-neutral-200 bg-stone-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <span className="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-xs font-semibold">Loading interactive map...</span>
        </div>
      </div>
    ),
  }
);

export function LocationSection() {
  const landmarks: Landmark[] = [
    {
      id: "cafes",
      name: "Cafes & Street Food Lanes",
      time: "2 Mins Walk",
      distance: "200 m",
      mode: "walk",
      icon: "local_cafe",
      coords: [26.8936, 75.8288],
      description:
        "Lively local bakeries, sweet shops, specialty chai stalls & trendy cafes along Raja Park market lanes.",
    },
    {
      id: "birla-mandir",
      name: "Birla Mandir & Temples",
      time: "~5 Mins Drive",
      distance: "1.8 km",
      mode: "drive",
      icon: "temple_hindu",
      coords: [26.8923, 75.8152],
      description:
        "Iconic white marble temple beneath Moti Dungri Fort, beautifully illuminated at sunset.",
    },
    {
      id: "mi-road",
      name: "MI Road (Shopping & Food)",
      time: "~8–10 Mins Drive",
      distance: "3.2 km",
      mode: "drive",
      icon: "shopping_bag",
      coords: [26.9155, 75.813],
      description:
        "Jaipur's historic shopping boulevard with jewellers, block-print textiles, and the legendary Lassiwala.",
    },
    {
      id: "hawa-mahal",
      name: "Hawa Mahal (Palace of Winds)",
      time: "~12 Mins Drive",
      distance: "4.1 km",
      mode: "drive",
      icon: "castle",
      coords: [26.9239, 75.8267],
      description:
        "Iconic 5-storey pink sandstone facade featuring 953 ornate honeycomb jharokhas.",
    },
    {
      id: "city-palace",
      name: "City Palace Jaipur",
      time: "~14 Mins Drive",
      distance: "4.6 km",
      mode: "drive",
      icon: "fort",
      coords: [26.9258, 75.8236],
      description:
        "Royal palace complex with courtyards, museums, and the current residence of Jaipur's royal family.",
    },
    {
      id: "railway-station",
      name: "Jaipur Railway Station",
      time: "~15 Mins Drive",
      distance: "5.8 km",
      mode: "drive",
      icon: "train",
      coords: [26.92, 75.7878],
      description:
        "Jaipur Junction Railway Station connecting all major Indian express and Shatabdi train routes.",
    },
    {
      id: "airport",
      name: "Jaipur International Airport (≈9 km)",
      time: "~15–25 Mins Drive",
      distance: "9.2 km",
      mode: "drive",
      icon: "flight",
      coords: [26.8289, 75.8056],
      description:
        "Direct domestic & international terminal in Sanganer (~9 km south of Raja Park with fast expressway connectivity).",
    },
  ];

  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  const handleToggleLandmark = (l: Landmark) => {
    if (selectedLandmark?.id === l.id) {
      setSelectedLandmark(null);
    } else {
      setSelectedLandmark(l);
    }
  };

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-200"
      data-purpose="location-map"
      id="location"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left column */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
              Central Location
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-neutral-900 mt-1 font-sans">
              RAJA PARK, CENTRAL JAIPUR
            </h2>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
              Stay in the centre of Jaipur in the leafy, well-connected area of
              Raja Park. Right outside your door you’ll find lively local markets,
              cafes, street-food lanes, and small galleries.
            </p>
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              Quiet residential lane despite being in the vibrant city center.
              Offers authentic &ldquo;Pink City&rdquo; flavour with quick cab access to
              all UNESCO heritage sights and the airport (~9 km).
            </p>
          </div>

          {/* Interactive Landmark List */}
          <div className="space-y-2 pt-1 max-h-[300px] overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Nearby Attractions &amp; Distances</span>
              <span className="text-[10px] text-amber-700 font-bold lowercase">
                click to view route
              </span>
            </div>

            {landmarks.map((l) => {
              const isSelected = selectedLandmark?.id === l.id;
              return (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => handleToggleLandmark(l)}
                  className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-300/50 shadow-sm"
                      : "bg-white hover:bg-neutral-50 border-neutral-200 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-800">
                    <span
                      className={`material-symbols-outlined text-[17px] ${
                        isSelected ? "text-amber-700" : "text-neutral-700"
                      }`}
                    >
                      {l.icon}
                    </span>
                    <span className={isSelected ? "text-amber-900 font-bold" : ""}>
                      {l.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-amber-900" : "text-neutral-900"
                      }`}
                    >
                      {l.time}
                    </span>
                    <span
                      className={`text-[11px] transition-transform ${
                        isSelected ? "text-amber-600 rotate-90" : "text-neutral-400"
                      }`}
                    >
                      →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FCFCFC] border border-neutral-200 text-xs text-neutral-700">
            <strong className="text-neutral-900 block mb-0.5">
              Exact Address:
            </strong>
            Raja Park, Central Jaipur, Rajasthan 302004, India. Exact street
            details provided immediately upon reservation confirmation.
          </div>
        </div>

        {/* Right column: Interactive Location Map with Route & Timing */}
        <div className="lg:col-span-7">
          <InteractiveLocationMap
            landmarks={landmarks}
            selectedLandmark={selectedLandmark}
            onSelectLandmark={setSelectedLandmark}
          />
        </div>
      </div>
    </section>
  );
}
