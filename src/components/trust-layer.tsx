export function TrustLayer() {
  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3"
      data-purpose="trust-layer"
    >
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200">
          {/* Pillar 1 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                home
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                Private 3BHK Villa
              </div>
              <p className="text-[11px] text-neutral-500">No Shared Spaces</p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:pl-6">
            <div className="w-8 h-8 rounded-full bg-white text-amber-500 flex items-center justify-center shrink-0 border border-neutral-100">
              <span className="material-symbols-outlined text-[18px]">star</span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                5.0 ★ Rating
              </div>
              <p className="text-[11px] text-neutral-500">18 Verified Reviews</p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:pl-6">
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                pin_drop
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                Raja Park, Central Jaipur
              </div>
              <p className="text-[11px] text-neutral-500">
                2-Min Walk to Cafes
              </p>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:pl-6">
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">pets</span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                Pet Friendly Stay
              </div>
              <p className="text-[11px] text-neutral-500">Fur Babies Welcome</p>
            </div>
          </div>

          {/* Pillar 5 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:pl-6 col-span-2 md:col-span-1">
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                local_cafe
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                Warm Host Hospitality
              </div>
              <p className="text-[11px] text-neutral-500">Coffee Always on Us</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

