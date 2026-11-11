import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dev Stays Jaipur · Private 3BHK Villa in Raja Park | Hotel Federation Rajasthan",
  description:
    "Your own private 3BHK villa in Central Jaipur (Raja Park) — 3 king bedrooms, 3 bathrooms, large living room, full kitchen, dining area, veranda & parking for 3-4 cars. Handcrafted with Rajasthani textiles & crochet details.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${playfair.variable} scroll-smooth antialiased`}
    >
      <body className="bg-[#FCFCFC] text-[#111215] font-sans antialiased selection:bg-black selection:text-white min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
