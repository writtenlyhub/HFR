export function MeetHost() {
  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-200"
      data-purpose="meet-your-host"
      id="host"
    >
      <div className="mb-10">
        <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
          Warm Rajasthan Hospitality
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-neutral-900 mt-1 font-sans">
          Meet your host
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Host Card */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-6 pb-6 border-b border-neutral-200">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuALx93u76PuaKYEk6AFQ8V5tF9b2DFahs5YxtPHfeLX0XI6xgE1ebvRKbkZf-vJpcNjWjwLSuwKF0vLsKF73TMRpQ4ESihNYC6LrC-Zdtw4ump2WIHUxHZ1SeWiQcPt0MKgzhRZ6Wh0LAN3Hy1ozclmu4eDRsWxeS26HCmTk3Pqvs1XLn6v7jH5n14yj6_RlBhM-n6BpCKsEB40mUQEs8Av7UjTVAas4Y0kGapKlzrsH-4xTFKsSFao"
                alt="Aparna"
                className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md"
              />
              <span className="absolute bottom-0 right-0 bg-amber-400 text-black rounded-full p-1 text-[12px] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[14px]">
                  verified
                </span>
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-neutral-900 leading-tight">
                Aparna
              </h3>
              <div className="text-xs text-neutral-500 font-semibold flex items-center gap-1 mt-0.5">
                <span>Superhost · 12 Years Hosting</span>
              </div>
              <p className="text-[11px] text-amber-800 font-medium mt-1">
                Hospitality &amp; Crochet Artist
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 pt-6 text-center">
            <div>
              <div className="text-xl font-bold text-neutral-900 leading-none">
                18
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-1">
                Reviews
              </div>
            </div>
            <div className="border-x border-neutral-200">
              <div className="text-xl font-bold text-neutral-900 leading-none">
                5.0★
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-1">
                Rating
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-neutral-900 leading-none">
                30+
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-1">
                Yrs in Hospitality
              </div>
            </div>
          </div>

          {/* Host Quick Details */}
          <div className="mt-6 pt-5 border-t border-neutral-100 space-y-2 text-xs text-neutral-600">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Response Rate:</span>
              <span className="font-bold text-neutral-900">100%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Response Time:</span>
              <span className="font-bold text-neutral-900">Within an hour</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Fun Fact:</span>
              <span className="font-medium text-neutral-800">
                I make the cutest crochet accessories
              </span>
            </div>
          </div>
        </div>

        {/* Narrative & Co-Host info */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h4 className="text-lg font-bold text-neutral-900">
              Namaste! Welcome to Dev Stays in Raja Park, Jaipur
            </h4>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
              I’m Aparna :) After 30+ years in hospitality, I’ve opened a cozy
              home in Jaipur for everyone. I&apos;ve travelled around the country
              and I love meeting new people — <strong>coffee is always on the house!</strong>
            </p>
            <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
              Reach out to me to enjoy Jaipur like a local: drivers, cab support,
              local guides, custom Jaipur itineraries — anything that you need at all,
              just ask.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-neutral-200">
            <h5 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
              Dedicated Co-Host &amp; Concierge
            </h5>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXLVlXyM-vQ16dmS0DcEfEN8uh6VNmKA_9nMqHNj7_RBlCOQjjmUAsneJi0-AA_8BMxWNg8XItN41sveL6CoiMUMPwEJ08LG8iZFSJv5p_wItSML3ipDVZ-9RjMYV3eAf-3c7kNb3Hw_wHd7zULTmtVjriJJ1NIKDhAn047BQ1p1Y6t0j7KpzgTrwbXw8B3jWF52UHhVstmIad8V6bUGG4wK0dR-rERLZ3iVlYxvF7OWJCD9RZ44S6"
                alt="Saksham"
                className="w-10 h-10 rounded-full object-cover border border-neutral-200"
              />
              <div>
                <span className="text-sm font-semibold text-neutral-800 block">
                  Saksham
                </span>
                <span className="text-xs text-neutral-500">
                  Concierge &amp; Guest Experience Lead
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <a
              className="bg-black hover:bg-neutral-800 text-white text-xs uppercase tracking-wider font-semibold px-6 py-3.5 rounded-full transition-colors shadow-sm inline-flex items-center gap-2"
              href="https://wa.me/911412894400"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Message Host on WhatsApp</span>
              <span>↗</span>
            </a>
            <a
              className="border border-neutral-300 hover:border-black text-neutral-800 hover:text-black text-xs uppercase tracking-wider font-semibold px-5 py-3.5 rounded-full transition-colors inline-flex items-center gap-1.5"
              href="https://instagram.com/devstays.jaipur"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Follow @devstays.jaipur</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

