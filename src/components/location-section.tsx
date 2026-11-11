export function LocationSection() {
  const landmarks = [
    { name: "City Palace & Hawa Mahal", time: "12 Mins", icon: "castle" },
    { name: "Amber Fort & Jal Mahal", time: "20 Mins", icon: "fort" },
    {
      name: "Jaipur International Airport (JAI)",
      time: "25 Mins",
      icon: "flight",
    },
  ];

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
              Prime Enclave
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-neutral-900 mt-1 font-sans">
              CIVIL LINES & RAJA PARK
            </h2>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
              Situated within Jaipur’s greenest and safest diplomatic
              residential zone, Dev Stays offers swift access to both UNESCO
              heritage monuments and boutique cafes.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {landmarks.map((l) => (
              <div
                key={l.name}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200"
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-800">
                  <span className="material-symbols-outlined text-[18px] text-neutral-700">
                    {l.icon}
                  </span>
                  <span>{l.name}</span>
                </div>
                <span className="text-xs font-bold text-neutral-900">
                  {l.time}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-[#FCFCFC] border border-neutral-200 text-xs text-neutral-700">
            <strong className="text-neutral-900 block mb-1">
              Bespoke Curated Itineraries:
            </strong>
            Our concierge arranges private sunrise heritage walks, blue pottery
            workshops in Sanganer, and royal dinner reservations.
          </div>
        </div>

        {/* Right column: Styled Map */}
        <div className="lg:col-span-7">
          <div className="relative w-full h-[380px] sm:h-[440px] rounded-3xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/exterior/85623348-92e6-4ea3-9185-a80f57f90c47.avif"
              alt="Dev Stays Jaipur Villa Facade & Enclave Location"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-neutral-900/10 pointer-events-none"></div>

            {/* Pulsing Location Marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-neutral-900/20 animate-ping absolute -top-1"></div>
              <div className="w-14 h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-2xl border-4 border-white">
                <span className="material-symbols-outlined text-2xl">home</span>
              </div>
              <div className="mt-2 bg-white/95 px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wider text-black shadow-md border border-neutral-100 uppercase whitespace-nowrap">
                Dev Stays Jaipur
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

