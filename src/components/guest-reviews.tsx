export function GuestReviews() {
  const categories = [
    { name: "Cleanliness", score: "4.9 ★", icon: "cleaning_services" },
    { name: "Location", score: "5.0 ★", icon: "pin_drop" },
    { name: "Communication", score: "5.0 ★", icon: "chat" },
    { name: "Check-in", score: "5.0 ★", icon: "check_circle" },
    { name: "Accuracy", score: "4.9 ★", icon: "verified" },
    { name: "Value", score: "4.9 ★", icon: "sell" },
  ];

  const guestTags = [
    "Location (10)",
    "Hospitality (9)",
    "Nearby (8)",
    "Cleanliness (4)",
    "Accuracy (3)",
    "Family (3)",
    "Comfort (3)",
    "Decor (2)",
  ];

  const reviews = [
    {
      id: "1",
      name: "Sumit",
      initials: "S",
      tag: "Family & Friends Stay",
      date: "Verified Guest Stay",
      comment:
        '"The stay was very good. It is located in a place from where we have lots of options for food. Rooms were clean. Host was responsive over phone and the care taker also active. Very good for family and friends."',
    },
    {
      id: "2",
      name: "Surabhi",
      initials: "S",
      tag: "Leisure Stay · Vibrant Raja Park",
      date: "Verified Guest Stay",
      comment:
        '"A lovely, tastefully decorated property that offers great value for money. The host was very responsive and accommodating, making our stay all the more comfortable. The location is lively and vibrant, yet the property itself remains peaceful and relaxing. The option to order food directly at the property was an added convenience that we really appreciated. Overall, a wonderful stay!"',
    },
    {
      id: "3",
      name: "Kartik",
      initials: "K",
      tag: "Central Jaipur · Near Birla Mandir",
      date: "Verified Guest Stay",
      comment:
        '"Listing is located in central Jaipur very close to Birla Mandir. Everything is as mentioned in the description. Definetely a 5star."',
    },
    {
      id: "4",
      name: "Akanksha",
      initials: "A",
      tag: "Group Trip · Fort Worth, Texas",
      date: "Verified Guest Stay",
      comment:
        '"Wonderful place to stay, quite spacious! And lots of shops nearby. Location is central."',
    },
    {
      id: "5",
      name: "Sarthak",
      initials: "S",
      tag: "Group Stay · Market Accessibility",
      date: "Verified Guest Stay",
      comment:
        '"The villa was very good, liked the amenities usually you write feedback when you have not got that good experience but mine is diff. Writing this feedback just because the villa and the amenities, cleanliness, staff support, market accessibility and the experience staying that was excellent 💯, i will definitely consider this villa again when i’ll visit jaipur in future."',
    },
    {
      id: "6",
      name: "Ritik",
      initials: "R",
      tag: "Weekend Stay",
      date: "Verified Guest Stay",
      comment: '"Great place! Would love to visit again"',
    },
  ];

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-200"
      data-purpose="guest-reviews"
      id="reviews"
    >
      {/* Centered Rating Headline */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center justify-center gap-3 mb-2">
          <span className="text-3xl sm:text-4xl">🌿</span>
          <span className="text-4xl sm:text-6xl font-extrabold tracking-tight text-neutral-900 font-sans">
            5.0
          </span>
          <span className="text-3xl sm:text-4xl">🌿</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">
          Guest Favourite · 100% 5-Star Reviews
        </h3>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-md mx-auto">
          Rated <strong>5.0 out of 5 stars</strong> across all 18 verified
          guest reviews for warm hospitality, cleanliness, and central Raja Park
          location.
        </p>

        {/* Mention tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {guestTags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Categories Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 py-5 border-y border-neutral-200 mb-10 bg-white rounded-2xl px-6">
        {categories.map((c) => (
          <div
            key={c.name}
            className="text-left border-l-2 pl-3 border-neutral-900"
          >
            <div className="text-[11px] text-neutral-500">{c.name}</div>
            <div className="text-base font-bold text-neutral-900 mt-0.5">
              {c.score}
            </div>
          </div>
        ))}
      </div>

      {/* 6 Real Review Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="border border-neutral-200 bg-white rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                  {r.initials}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-neutral-900">{r.name}</h5>
                  <p className="text-[11px] text-neutral-500">{r.tag}</p>
                </div>
              </div>
              <div className="text-xs text-amber-500 mb-2">★★★★★</div>
              <p className="text-neutral-700 text-xs sm:text-sm leading-relaxed">
                {r.comment}
              </p>
            </div>
            <span className="text-[10px] text-neutral-400 mt-4 block border-t border-neutral-200 pt-2 font-mono">
              {r.date}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

