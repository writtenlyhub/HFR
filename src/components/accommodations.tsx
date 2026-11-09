interface ListingOptionData {
  id: string;
  slug: string;
  title: string;
  bedroomCount: number;
  bathroomCount: number;
  maxGuests: number;
  basePricePerNight: number;
  weekendPricePerNight?: number | null;
  cleaningFee?: number;
  taxPercentage?: number;
  summary: string | null;
  description: string;
  coverImage: string | null;
  isFeatured: boolean;
}

interface AccommodationsProps {
  options: ListingOptionData[];
  onSelectOption?: (slug: string) => void;
}

export function Accommodations({ options }: AccommodationsProps) {
  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12"
      data-purpose="accommodation-options"
      id="accommodations"
    >
      {/* Title lockup */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-block bg-[#F3F4F6] text-neutral-600 text-[11px] font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full mb-3">
          TAILORED CONFIGURATIONS
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-neutral-900 mb-4 font-sans">
          CHOOSE YOUR STAY AT DEV STAYS
        </h2>
        <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
          Three thoughtfully designed accommodation options for every kind of stay.
        </p>

        {/* Shared Inventory Exclusive Privacy Note */}
        <div className="mt-4 inline-flex items-center gap-2 bg-stone-100 border border-stone-200/80 px-4 py-1.5 rounded-full text-xs text-stone-700">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>
            <strong>Guaranteed Exclusive Sanctuary:</strong> Whichever configuration you book, the estate remains completely private for your dates.
          </span>
        </div>
      </div>

      {/* Grid of 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
        {options.map((opt) => {
          const priceNum = Number(opt.basePricePerNight) || 8500;
          const formattedPrice = "₹" + priceNum.toLocaleString("en-IN");

          // Determine guest badge string
          let badgeText = `Up to ${opt.maxGuests} Guests`;
          if (opt.maxGuests >= 10 || opt.slug === "full-estate-buyout") {
            badgeText = `Up to ${opt.maxGuests} Guests · Exclusive Buyout`;
          }

          let buttonText = "Explore Room";
          if (opt.bedroomCount === 2) buttonText = "Explore Rooms";
          if (opt.bedroomCount >= 3 || opt.slug === "full-estate-buyout")
            buttonText = "Explore Villa";

          return (
            <div
              key={opt.id}
              className="bg-white rounded-3xl border border-neutral-200 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-5 group"
            >
              <div>
                {/* Image Frame */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl mb-5 bg-neutral-100">
                  {opt.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opt.coverImage}
                      alt={opt.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-neutral-900 border border-neutral-200 shadow-xs">
                    {badgeText}
                  </div>
                </div>

                {/* Details */}
                <div className="px-2">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">
                      {opt.title}
                    </h3>
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-extrabold text-neutral-900">
                        {formattedPrice}
                      </span>
                      <span className="text-[10px] text-neutral-500 block leading-tight">
                        / night
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mt-2">
                    {opt.summary || opt.description}
                  </p>

                  <div className="flex items-center gap-3 mt-4 text-[11px] text-neutral-500 font-medium">
                    <span>{opt.bedroomCount} {opt.bedroomCount === 1 ? "Bedroom" : "Bedrooms"}</span>
                    <span>•</span>
                    <span>{opt.bathroomCount} {opt.bathroomCount === 1 ? "Bath" : "Baths"}</span>
                    <span>•</span>
                    <span>Heated Plunge Pool</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="px-2 pt-6 mt-auto">
                <a
                  className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white text-xs uppercase tracking-wider font-semibold rounded-full transition-all shadow-sm flex items-center justify-center gap-2 group-hover:gap-3"
                  href={`#sidebar-booking-card`}
                >
                  <span>{buttonText}</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
