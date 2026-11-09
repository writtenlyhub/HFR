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
  title: "Dev Stay, Jaipur | Hotel Federation Rajasthan",
  description:
    "An architectural sanctuary in Jaipur offering independently bookable private suites and exclusive villa buyouts with private plunge pool and dedicated concierge.",
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
