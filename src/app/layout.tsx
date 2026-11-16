import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { getSectionContent, GlobalSeoContent } from "@/lib/content/content-service";
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

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getSectionContent<GlobalSeoContent>("global_seo");
    return {
      title: seo.content.siteTitle,
      description: seo.content.defaultMetaDescription,
      openGraph: {
        title: seo.content.ogTitle || seo.content.siteTitle,
        description: seo.content.ogDescription || seo.content.defaultMetaDescription,
        images: seo.content.defaultOgImageUrl ? [{ url: seo.content.defaultOgImageUrl }] : [],
      },
      robots: {
        index: seo.content.robotsIndex,
        follow: seo.content.robotsFollow,
      },
    };
  } catch {
    return {
      title: "Dev Stays Jaipur · Private 3BHK Villa in Raja Park | Hotel Federation Rajasthan",
      description:
        "Your own private 3BHK villa in Central Jaipur (Raja Park) — 3 king bedrooms, 3 bathrooms, large living room, full kitchen, dining area, veranda & parking for 3-4 cars. Handcrafted with Rajasthani textiles & crochet details.",
    };
  }
}

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
