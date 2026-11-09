export function HouseRules() {
  const rules = [
    {
      icon: "🚪",
      title: "Check-in: 2:00 PM · Checkout: 11:00 AM",
      desc: "Early check-in and late luggage drop accommodated upon prior request. Seamless arrival assisted by our estate caretaker.",
    },
    {
      icon: "🛡️",
      title: "House Rules & Tranquility",
      desc: "Quiet hours after 10:00 PM to respect neighboring diplomatic residences. No unauthorized parties or non-registered overnight guests.",
    },
    {
      icon: "📅",
      title: "Flexible Cancellation Policy",
      desc: "Full refund up to 7 days before check-in. 50% refund between 7 days and 48 hours prior to check-in. Direct booking cancellation guarantees applied.",
    },
  ];

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-200"
      data-purpose="things-to-know"
    >
      <div className="mb-10">
        <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
          Stay Guidelines
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-neutral-900 mt-1 font-sans">
          Important guest information
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
            <p className="text-xs text-neutral-500 leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

