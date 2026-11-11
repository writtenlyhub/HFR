export function LocationSection() {
  const landmarks = [
    { name: "Cafes & Street Food Lanes", time: "2 Mins Walk", icon: "local_cafe" },
    { name: "Birla Mandir & Temples", time: "~5 Mins Drive", icon: "temple_hindu" },
    { name: "MI Road (Shopping & Food)", time: "~8–10 Mins Drive", icon: "shopping_bag" },
    { name: "Hawa Mahal", time: "~12 Mins Drive", icon: "castle" },
    { name: "City Palace Jaipur", time: "~14 Mins Drive", icon: "fort" },
    { name: "Jaipur Railway Station", time: "~15 Mins Drive", icon: "train" },
    {
      name: "Jaipur International Airport (≈9 km)",
      time: "~15–25 Mins Drive",
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

          <div className="space-y-2 pt-1 max-h-[290px] overflow-y-auto pr-1">
            {landmarks.map((l) => (
              <div
                key={l.name}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-200 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-800">
                  <span className="material-symbols-outlined text-[17px] text-neutral-700">
                    {l.icon}
                  </span>
                  <span>{l.name}</span>
                </div>
                <span className="text-xs font-bold text-neutral-900 shrink-0 ml-2">
                  {l.time}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FCFCFC] border border-neutral-200 text-xs text-neutral-700">
            <strong className="text-neutral-900 block mb-0.5">
              Exact Address:
            </strong>
            Raja Park, Central Jaipur, Rajasthan 302004, India. Exact street
            details provided immediately upon reservation confirmation.
          </div>
        </div>

        {/* Right column: Styled Map */}
        <div className="lg:col-span-7">
          <div className="relative w-full h-[380px] sm:h-[460px] rounded-3xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-200">
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
                Dev Stays · Raja Park
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

