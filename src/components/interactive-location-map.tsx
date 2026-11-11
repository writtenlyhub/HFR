"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export interface Landmark {
  id: string;
  name: string;
  time: string;
  distance: string;
  mode: "walk" | "drive";
  icon: string;
  coords: [number, number];
  description: string;
}

interface InteractiveMapProps {
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  onSelectLandmark: (landmark: Landmark | null) => void;
  hotelCoords?: [number, number];
}

const DEFAULT_HOTEL_COORDS: [number, number] = [26.8928, 75.827];

export default function InteractiveLocationMap({
  landmarks,
  selectedLandmark,
  onSelectLandmark,
  hotelCoords = DEFAULT_HOTEL_COORDS,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent duplicate initialization
    if (mapInstanceRef.current) return;

    // Create map with sensitive scrollWheelZoom disabled to prevent getting lost when scrolling the page
    const map = L.map(mapContainerRef.current, {
      center: hotelCoords,
      zoom: 15,
      minZoom: 11,
      maxZoom: 18,
      scrollWheelZoom: false, // Prevents accidental zoom while user scrolls page
      doubleClickZoom: true,
      zoomControl: false, // Custom placed zoom controls
    });

    // Standard OpenStreetMap tiles (free, reliable, no API key required)
    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    ).addTo(map);

    // Zoom control at bottom right
    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    // Hotel Villa Custom Marker
    const hotelIcon = L.divIcon({
      className: "custom-hotel-marker",
      html: `
        <div class="relative flex flex-col items-center">
          <div class="absolute w-12 h-12 bg-neutral-900/20 rounded-full animate-ping -top-1"></div>
          <div class="w-11 h-11 rounded-full bg-neutral-950 text-white flex items-center justify-center shadow-2xl border-[3px] border-white z-20">
            <span class="material-symbols-outlined text-[20px] text-amber-400">home</span>
          </div>
          <div class="mt-1.5 bg-neutral-950 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-md border border-white/20 whitespace-nowrap z-20">
            Dev Stays
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const hotelMarker = L.marker(hotelCoords, {
      icon: hotelIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    hotelMarker.bindPopup(
      `<div class="p-1 text-center font-sans">
        <strong class="text-neutral-900 block text-xs">Dev Stays Jaipur</strong>
        <span class="text-[11px] text-neutral-600">Your Private 3BHK Villa in Raja Park</span>
      </div>`
    );

    // Landmark Markers
    landmarks.forEach((landmark) => {
      const landmarkIcon = L.divIcon({
        className: `custom-landmark-marker marker-${landmark.id}`,
        html: `
          <div class="relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
            <div class="w-8 h-8 rounded-full bg-white text-neutral-800 border-2 border-neutral-300 flex items-center justify-center shadow-md">
              <span class="material-symbols-outlined text-[16px]">${landmark.icon}</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(landmark.coords, {
        icon: landmarkIcon,
      }).addTo(map);

      marker.on("click", () => {
        onSelectLandmark(landmark);
      });

      markersRef.current[landmark.id] = marker;
    });

    mapInstanceRef.current = map;

    // Handle initial resize
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [hotelCoords, landmarks, onSelectLandmark]);

  // 2. Handle Selected Landmark & Route Drawing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old polyline if exists
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    // Update marker styling (active vs normal)
    landmarks.forEach((l) => {
      const isSelected = selectedLandmark?.id === l.id;
      const marker = markersRef.current[l.id];
      if (marker) {
        const iconHtml = `
          <div class="relative flex flex-col items-center cursor-pointer transition-transform ${
            isSelected ? "scale-125 z-30" : "hover:scale-110"
          }">
            <div class="w-8 h-8 rounded-full ${
              isSelected
                ? "bg-amber-600 text-white border-2 border-white ring-4 ring-amber-300/80 shadow-xl"
                : "bg-white text-neutral-800 border-2 border-neutral-300 shadow-md"
            } flex items-center justify-center transition-all">
              <span class="material-symbols-outlined text-[16px]">${l.icon}</span>
            </div>
            ${
              isSelected
                ? `<div class="mt-1 bg-amber-600 text-white px-2 py-0.5 rounded-md text-[9.5px] font-bold shadow-md whitespace-nowrap">${l.name}</div>`
                : ""
            }
          </div>
        `;
        marker.setIcon(
          L.divIcon({
            className: `custom-landmark-marker marker-${l.id}`,
            html: iconHtml,
            iconSize: isSelected ? [36, 36] : [32, 32],
            iconAnchor: isSelected ? [18, 18] : [16, 16],
          })
        );
      }
    });

    if (selectedLandmark) {
      // Draw attractive dashed route between hotel and selected landmark
      const polyline = L.polyline([hotelCoords, selectedLandmark.coords], {
        color: "#d97706", // Amber 600
        weight: 4,
        dashArray: "6, 8",
        opacity: 0.9,
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Fit bounds with generous padding so both hotel and destination are clearly visible
      const bounds = L.latLngBounds([hotelCoords, selectedLandmark.coords]);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
        duration: 1.0,
      });
    }
  }, [selectedLandmark, hotelCoords, landmarks]);

  // Recenter to Hotel Villa Function
  const handleRecenter = () => {
    onSelectLandmark(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(hotelCoords, 15, {
        animate: true,
        duration: 1.2,
      });
    }
  };

  const directionsUrl = selectedLandmark
    ? `https://www.google.com/maps/dir/?api=1&origin=${hotelCoords[0]},${hotelCoords[1]}&destination=${selectedLandmark.coords[0]},${selectedLandmark.coords[1]}`
    : `https://maps.google.com/?q=Raja+Park+Jaipur+Rajasthan+302004`;

  return (
    <div className="relative w-full h-[400px] sm:h-[500px] rounded-3xl overflow-hidden border border-neutral-200 shadow-md bg-stone-100">
      {/* Map DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left: Hotel Info or Active Route Card */}
      <div className="absolute top-4 left-4 right-16 sm:right-auto z-10 max-w-sm pointer-events-auto">
        {!selectedLandmark ? (
          // Default Villa Location Badge
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-md border border-neutral-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">home</span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                Dev Stays · Raja Park
              </div>
              <div className="text-[10px] text-neutral-500 font-medium">
                Central Jaipur, Rajasthan 302004
              </div>
            </div>
            <a
              href="https://maps.google.com/?q=Raja+Park+Jaipur+Rajasthan+302004"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 shrink-0"
            >
              <span>Directions</span>
              <span>↗</span>
            </a>
          </div>
        ) : (
          // Active Route & Timing Card
          <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-lg border border-amber-200/90 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                <span className="truncate">Dev Stays → {selectedLandmark.name}</span>
              </div>
              <button
                onClick={handleRecenter}
                title="Clear route and recenter on hotel"
                className="w-5 h-5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <span>⏱</span>
                <span>{selectedLandmark.time}</span>
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full">
                <span>📏</span>
                <span>{selectedLandmark.distance}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-neutral-500">
                {selectedLandmark.mode === "walk" ? "🚶 Walk" : "🚗 Cab / Drive"}
              </span>
            </div>

            <p className="text-[11px] text-neutral-600 leading-snug line-clamp-2">
              {selectedLandmark.description}
            </p>

            <div className="pt-1 flex items-center gap-2">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-[11px] py-1.5 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Live Navigation in Google Maps</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Prominent "Recenter on Hotel" Floating Button */}
      <button
        onClick={handleRecenter}
        title="Reset map view and recenter on Dev Stays Villa"
        className="absolute top-4 right-4 z-10 bg-white hover:bg-neutral-50 active:scale-95 text-neutral-900 font-bold text-xs px-3.5 py-2 rounded-2xl shadow-md border border-neutral-200/90 flex items-center gap-1.5 transition-all cursor-pointer group"
      >
        <span className="material-symbols-outlined text-[16px] text-amber-600 group-hover:rotate-180 transition-transform duration-500">
          my_location
        </span>
        <span className="hidden sm:inline">Back to Hotel</span>
        <span className="sm:hidden">Reset</span>
      </button>

      {/* Bottom helper pill */}
      <div className="absolute bottom-3 left-4 z-10 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-neutral-600 font-medium shadow-xs border border-neutral-200/80 flex items-center gap-1.5 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Click any nearby place to inspect route &amp; travel times</span>
      </div>
    </div>
  );
}
