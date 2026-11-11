/* eslint-disable @next/next/no-img-element */
interface HeroProps {
  startingPrice?: number;
  headline?: string | null;
  description?: string;
}

export function Hero({
  startingPrice = 8500,
  headline = "YOUR OWN PRIVATE 3BHK VILLA IN CENTRAL JAIPUR",
  description = "A private 3BHK villa handcrafted with Rajasthani textiles, crochet details, and curated decor. Your peaceful sanctuary in Raja Park — no shared spaces, no other guests.",
}: HeroProps) {
  const formattedPrice = "₹" + startingPrice.toLocaleString("en-IN");

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-2 pb-3"
      data-purpose="hero-banner"
      id="overview"
    >
      <div className="relative w-full rounded-3xl sm:rounded-[2rem] overflow-hidden flex flex-col justify-between py-7 sm:py-9 lg:py-10 px-5 sm:px-10 lg:px-12 text-white bg-stone-950 shadow-xl min-h-[440px] sm:min-h-[480px] lg:min-h-[500px]">
        {/* Background Video with Poster Fallback */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="auto"
            poster="/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg"
          >
            <source
              src="/videos/hero-video.mp4"
              type="video/mp4"
            />
          </video>
          {/* Subtle architectural gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-stone-950/70"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/45 to-transparent"></div>
        </div>

        {/* Hero Content (Headline & Subtitle) */}
        <div className="relative z-10 max-w-3xl pt-1 sm:pt-2">
          <h1 className="text-2xl sm:text-4xl lg:text-[2.75rem] font-extrabold uppercase leading-[1.12] tracking-tight mb-5 sm:mb-6 font-sans">
            {headline}
          </h1>
          <p className="text-stone-200 text-xs sm:text-sm md:text-base font-normal leading-relaxed max-w-2xl opacity-95">
            {description}
          </p>
        </div>

        {/* Bottom Controls Row: Pricing & CTAs (Left) + Superhost Pill (Right) */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pt-6 sm:pt-8 mt-auto">
          {/* Pricing & CTA Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400">
                Starting from
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-white">
                {formattedPrice}
              </span>
              <span className="text-xs text-stone-300">/ night</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <a
                className="bg-white hover:bg-neutral-100 text-neutral-900 font-semibold px-5 py-2.5 sm:py-3 rounded-full text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 group"
                href="#accommodations"
              >
                <span>Explore Accommodations</span>
                <span className="transition-transform group-hover:translate-y-0.5">
                  ↓
                </span>
              </a>
              <a
                className="bg-black/60 hover:bg-black/90 border border-white/30 text-white font-semibold px-5 py-2.5 sm:py-3 rounded-full text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                href="#sidebar-booking-card"
              >
                <span>Check Availability</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Superhost Verification Pill (Bottom Right) */}
          <div className="self-start md:self-end bg-white/95 backdrop-blur-md text-black py-2 px-3.5 rounded-xl flex items-center gap-2.5 shadow-md shrink-0">
            <div className="flex -space-x-1.5">
              <img
                alt="Host Aparna"
                className="w-7 h-7 rounded-full border-2 border-white object-cover"
                src="/images/host/host-aparna.avif"
              />
              <img
                alt="Co-Host Saksham"
                className="w-7 h-7 rounded-full border-2 border-white object-cover"
                src="/images/host/cohost-saksham.avif"
              />
            </div>
            <div className="border-l border-gray-200 pl-2.5">
              <div className="text-[11px] font-bold leading-tight flex items-center gap-1">
                <span>Superhost Rated 5.0</span>
                <span className="text-amber-500 text-xs">★</span>
              </div>
              <div className="text-[9.5px] text-neutral-600 font-semibold mt-0.5">
                18 Reviews · 100% 5-Star Certified
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
