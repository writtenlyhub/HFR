"use client";

import { useState } from "react";

export function InquiryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        notes: "",
      });
    }, 6000);
  };

  return (
    <section
      className="w-full pt-20 pb-0 overflow-hidden relative"
      data-purpose="cta-banner"
      id="contact"
      style={{
        background:
          "linear-gradient(rgb(108, 153, 198) 0%, rgb(136, 177, 216) 35%, rgb(166, 198, 226) 65%, rgb(200, 221, 237) 100%)",
      }}
    >
      <div id="direct-booking" className="sr-only" aria-hidden="true" />
      <div id="inquire" className="sr-only" aria-hidden="true" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
        <div className="inline-flex items-center px-5 py-2 rounded-full bg-white/30 backdrop-blur-md text-white text-xs font-semibold uppercase tracking-wider mb-6">
          Get in Touch
        </div>

        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight uppercase max-w-2xl mx-auto text-center leading-tight mb-4 font-sans">
          YOUR JAIPUR STAY STARTS HERE
        </h2>

        <p className="text-white/90 text-sm md:text-base max-w-xl mx-auto text-center font-normal leading-relaxed mb-12">
          Planning your Jaipur getaway? Reserve Dev Stay directly with Hotel
          Federation Rajasthan for the best rate and personal concierge care.
        </p>

        {/* Reservation Inquire Card */}
        <div className="rounded-[2rem] bg-white p-8 md:p-12 shadow-xl max-w-4xl mx-auto mb-16 relative z-10 text-left">
          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-neutral-900">
                Thank You, {formData.firstName}!
              </h3>
              <p className="text-sm text-neutral-600 max-w-md mx-auto">
                Our estate concierge team has received your request and will
                reach out via WhatsApp/email with date availability and booking
                details within 1 hour.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-gray-200 py-3 text-sm focus:outline-none focus:border-black text-gray-800 placeholder-gray-400"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-gray-200 py-3 text-sm focus:outline-none focus:border-black text-gray-800 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-gray-200 py-3 text-sm focus:outline-none focus:border-black text-gray-800 placeholder-gray-400"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number / WhatsApp"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-gray-200 py-3 text-sm focus:outline-none focus:border-black text-gray-800 placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  placeholder="Planned Dates, Number of Guests, or Special Meal Requests"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-gray-200 py-3 text-sm focus:outline-none focus:border-black text-gray-800 placeholder-gray-400 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-8 py-4 bg-black text-white text-sm font-semibold rounded-full hover:bg-neutral-800 transition-colors shadow-md active:scale-98"
              >
                Check Availability & Book
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

