export function GuestReviews() {
  const categories = [
    { name: "Cleanliness", score: "5.0 ★", icon: "cleaning_services" },
    { name: "Location", score: "5.0 ★", icon: "pin_drop" },
    { name: "Service & Hospitality", score: "5.0 ★", icon: "favorite" },
    { name: "Accuracy", score: "4.9 ★", icon: "check_circle" },
    { name: "Value", score: "4.9 ★", icon: "sell" },
  ];

  const reviews = [
    {
      id: "1",
      name: "Raghav Malhotra",
      tag: "Full Villa Buyout · Family Trip",
      date: "Direct Reservation · October 2025",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBM7Zo7YjqobuMSgB9rCPYMFUX2a7Tr35N6cx69QUQOEVccEGz0Q4HvHBLEqNmdI4apdoqMVucjCSqa8Ws0nTIyu2Q2_tQx166hX2sPNK_nu7Ueq4C_-dQliBAJHlqleOQXh5Lodo9-YiQS7BWGnf1rzWmwUaFhRv6yPvq_k1P2vEht9ZjdH6iEHvgGbCVbiGhhRNYsEkzwlNjhdzEVPxglLDP9T1R2j1A-L7WwR0C6Uf8_rGxq49Hl",
      comment:
        '"Dev Stays exceeded all expectations. Having the entire property private for our 8-person family trip made all the difference. The plunge pool, attentive caretakers, and serene courtyard felt like our personal sanctuary."',
    },
    {
      id: "2",
      name: "Claire Henderson",
      tag: "Royal Suite · Solo Remote Work",
      date: "Airbnb Verified · November 2025",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDux9Ae8sWNnhMvojoxQQAHGKkpZdrVYt_yQGoYmYIEkg6YhczI-I-p59v_Dv3eOAAyRqerfF_CQO59dpOj-YMbvN7eY0KPMVrbtjunaXsWEPGXZaJirItJDdFdQElwsYLKSfhYCo_CyzzZQOlvS39BmWKG3TCoyaDx9QHsvwYaFjZLxo6ouPwoosVDF1bCKNped69ODaPEy0HPzw3EMZ2TO1xfwABirKk_9gqcmSp96VOsrOYzP5Yl",
      comment:
        '"Booked the 1-bedroom suite for a working week in Jaipur. The 300 Mbps Wi-Fi allowed seamless video calls back to London. Aparna and Saksham were kind enough to brew authentic masala chai whenever I worked in the veranda!"',
    },
    {
      id: "3",
      name: "Karan & Shweta",
      tag: "Courtyard Wing · 4 Guests",
      date: "Direct Reservation · December 2025",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDzrPijyOt24n_6rLUKmVI1iam-lmK1Qre3eft7D5dsarr2E-qyxWjo7NiuKt8bCCJsyNZgw7P-R_itSiaapnkkSdEj07dIjZ25zpZaQPI20hYXVWbVoC1wr81CZpDtN2jcquINYvi-DHI_fcQk8JAiEr02SlNYh4Rv-7TgxnT5It68PeCpqWYd5WMzE6c-8rHIkC0fxsd6VX3yvYYQLGPRz-zhIiUk2CyHdPK8VvaQc6VjC0A01wzO",
      comment:
        '"The two-bedroom wing setup gave us plenty of space while travelling with my parents. Excellent breakfasts served in the courtyard and great recommendations for hand-block print studios!"',
    },
  ];

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-200"
      data-purpose="guest-reviews"
      id="reviews"
    >
      {/* Centered Rating Headline */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center justify-center gap-3 mb-2">
          <span className="text-3xl sm:text-4xl">🌿</span>
          <span className="text-4xl sm:text-6xl font-extrabold tracking-tight text-neutral-900 font-sans">
            4.98
          </span>
          <span className="text-3xl sm:text-4xl">🌿</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-neutral-900">
          Guest Favourite & Superhost Certified
        </h3>
        <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-md mx-auto">
          Ranked in the <strong>top 1%</strong> of Rajasthan stays on Airbnb and
          Federation Direct for consistency, hospitality, and serene privacy.
        </p>
      </div>

      {/* Categories Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 py-6 border-y border-neutral-200 mb-10 bg-white rounded-2xl px-6">
        {categories.map((c) => (
          <div
            key={c.name}
            className="text-left border-l-2 pl-3 border-neutral-900"
          >
            <div className="text-xs text-neutral-500">{c.name}</div>
            <div className="text-lg font-bold text-neutral-900 mt-0.5">
              {c.score}
            </div>
            <span className="material-symbols-outlined text-[18px] text-neutral-600 mt-1">
              {c.icon}
            </span>
          </div>
        ))}
      </div>

      {/* 3 Review Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="border border-neutral-200 bg-white rounded-3xl p-6 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.avatar}
                  alt={r.name}
                  className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                />
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
            <span className="text-[10px] text-neutral-400 mt-4 block border-t border-neutral-200 pt-2">
              {r.date}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

