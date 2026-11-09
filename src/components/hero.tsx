/* eslint-disable @next/next/no-img-element */
interface HeroProps {
  startingPrice?: number;
  headline?: string | null;
  description?: string;
}

export function Hero({
  startingPrice = 8500,
  headline = "DEV STAYS JAIPUR",
  description = "An architectural sanctuary in Jaipur offering independently bookable private suites and exclusive villa buyouts.",
}: HeroProps) {
  const formattedPrice = "₹" + startingPrice.toLocaleString("en-IN");

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-4 pb-4"
      data-purpose="hero-banner"
      id="overview"
    >
      <div className="relative w-full rounded-[2.5rem] overflow-hidden flex flex-col justify-between pt-10 sm:pt-14 pb-14 sm:pb-16 px-6 sm:px-12 lg:px-16 text-white bg-stone-950 shadow-2xl min-h-[580px] lg:min-h-[640px]">
        {/* Background Video with Poster Fallback */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted
            playsInline
            poster="https://lh3.googleusercontent.com/aida-public/AB6AXuD6kKrBTsXZaKC8ruztoO_cLuYvZO__CnPz3lwZNOa3p6OzHrHTyhfA_36D7SgQ-7GJPTiO1KD4AjOsd8AxCVV-uEMvUmE5PaV8OXVXVXh3wa3tvDgbVzepDabRFO_mXvklA5Nb-1sNdEsWLg3WQTjyYN5aCgyQrRrurQHYgZta_OeB2Rzi-PJimECEiAWcVfx8TWVfS8Y7qLYTRr3fZdTvqInYcHycLxTn1ePwBcg"
          >
            <source
              src="https://assets.mixkit.co/videos/preview/mixkit-luxury-villa-exterior-with-pool-at-sunset-42867-large.mp4"
              type="video/mp4"
            />
          </video>
          {/* Subtle architectural gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-stone-950/70"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/45 to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-3xl pt-2">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase leading-[1.08] tracking-tight mb-4 font-sans">
            {headline}
          </h1>
          <p className="text-stone-200 text-sm sm:text-base font-normal leading-relaxed max-w-2xl mb-6 opacity-95">
            {description}
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-stone-200 mb-8 font-medium">
            <span className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
              3 Bespoke Configurations
            </span>
            <span className="text-white/40">•</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
              1 to 10 Guests
            </span>
            <span className="text-white/40">•</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
              Private Courtyard Plunge Pool
            </span>
            <span className="text-white/40">•</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
              Chef on Demand
            </span>
          </div>

          {/* Pricing & CTA Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-baseline gap-2">
              <span className="text-xs uppercase tracking-wider text-neutral-400">
                Starting from
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {formattedPrice}
              </span>
              <span className="text-xs text-stone-200">/ night</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                className="bg-white hover:bg-neutral-100 text-neutral-900 font-semibold px-6 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 group"
                href="#accommodations"
              >
                <span>Explore Accommodations</span>
                <span className="transition-transform group-hover:translate-y-0.5">
                  ↓
                </span>
              </a>
              <a
                className="bg-black/60 hover:bg-black/90 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                href="#sidebar-booking-card"
              >
                <span>Check Availability</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Superhost Verification Pill (Bottom Right) */}
        <div className="relative z-10 self-start sm:self-end mt-8 sm:mt-0 bg-white/95 backdrop-blur-md text-black py-2.5 px-4 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="flex -space-x-2">
            <img
              alt="Host Aparna"
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuALx93u76PuaKYEk6AFQ8V5tF9b2DFahs5YxtPHfeLX0XI6xgE1ebvRKbkZf-vJpcNjWjwLSuwKF0vLsKF73TMRpQ4ESihNYC6LrC-Zdtw4ump2WIHUxHZ1SeWiQcPt0MKgzhRZ6Wh0LAN3Hy1ozclmu4eDRsWxeS26HCmTk3Pqvs1XLn6v7jH5n14yj6_RlBhM-n6BpCKsEB40mUQEs8Av7UjTVAas4Y0kGapKlzrsH-4xTFKsSFao"
            />
            <img
              alt="Guest"
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDux9Ae8sWNnhMvojoxQQAHGKkpZdrVYt_yQGoYmYIEkg6YhczI-I-p59v_Dv3eOAAyRqerfF_CQO59dpOj-YMbvN7eY0KPMVrbtjunaXsWEPGXZaJirItJDdFdQElwsYLKSfhYCo_CyzzZQOlvS39BmWKG3TCoyaDx9QHsvwYaFjZLxo6ouPwoosVDF1bCKNped69ODaPEy0HPzw3EMZ2TO1xfwABirKk_9gqcmSp96VOsrOYzP5Yl"
            />
          </div>
          <div className="border-l border-gray-200 pl-3">
            <div className="text-xs font-bold leading-tight flex items-center gap-1">
              <span>Superhost Rated 4.98</span>
              <span className="text-amber-500">★</span>
            </div>
            <div className="text-[10px] text-neutral-600 font-semibold mt-0.5">
              120+ Verified Reviews · Certified Stay
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
