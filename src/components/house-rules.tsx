export function HouseRules() {
  const rules = [
    {
      icon: "🚪",
      title: "Check-in after 14:00 · Checkout before 11:00",
      desc: "Self check-in with dedicated on-site building staff. Quiet residential lane in central Raja Park despite being close to vibrant cafes and city attractions.",
    },
    {
      icon: "🎉",
      title: "Celebrations & Small Events Welcome",
      desc: "Birthday parties, anniversaries, work offsites, and get-togethers are all welcome. Priced for 6 overnight guests; message us to host up to 15 (extra mattresses arranged).",
    },
    {
      icon: "🐾",
      title: "Pet Friendly & Safety Verified",
      desc: "Pet friendly — we love hosting fur babies! Board games and badminton available. Exterior security cameras on property and smoke alarm installed for your safety.",
    },
  ];

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-200"
      data-purpose="things-to-know"
      id="house-rules"
    >
      <div className="mb-10">
        <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
          Good to Know
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-neutral-900 mt-1 font-sans">
          House rules &amp; stay details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {rules.map((r) => (
          <div
            key={r.title}
            className="p-6 bg-white rounded-3xl border border-neutral-200 space-y-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-xl">
              {r.icon}
            </div>
            <h4 className="text-sm font-bold text-neutral-900">{r.title}</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

