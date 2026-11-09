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
                verified
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                Verified Luxury Stay
              </div>
              <p className="text-[11px] text-neutral-500">Inspected & Approved</p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:pl-6">
            <div className="w-8 h-8 rounded-full bg-white text-amber-500 flex items-center justify-center shrink-0 border border-neutral-100">
              <span className="material-symbols-outlined text-[18px]">star</span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                4.98 ★ Rating
              </div>
              <p className="text-[11px] text-neutral-500">120+ Verified Reviews</p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:pl-6">
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                shield
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                Federation Certified
              </div>
              <p className="text-[11px] text-neutral-500">
                Rajasthan Quality Standards
              </p>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:pl-6">
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                100% Direct Booking
              </div>
              <p className="text-[11px] text-neutral-500">Zero Hidden OTA Fees</p>
            </div>
          </div>

          {/* Pillar 5 */}
          <div className="flex items-center gap-3 pt-2 lg:pt-0 lg:pl-6 col-span-2 md:col-span-1">
            <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                support_agent
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                24/7 Estate Concierge
              </div>
              <p className="text-[11px] text-neutral-500">Dedicated Caretaker</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

