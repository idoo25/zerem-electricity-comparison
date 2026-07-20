import type { Metadata } from "next";
import { Rubik, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const openGraphImage = `${siteUrl}/og.png`;

export const metadata: Metadata = {
  title: {
    default: "זרם — השוואת תוכניות חשמל חכמה",
    template: "%s | זרם",
  },
  description: "משווים את כל תוכניות החשמל הציבוריות בישראל מול פרופיל הצריכה שלכם — בדפדפן, בשקיפות וללא שוברים או תנאים נסתרים.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    locale: "he_IL",
    type: "website",
    siteName: "זרם",
    title: "זרם — יודעים איזו תוכנית חשמל באמת מתאימה",
    description: "השוואה אישית לפי פעימות המונה, כולל מע״מ, עמלות וסימולציות יציבות.",
    images: [{ url: openGraphImage, width: 1731, height: 909, alt: "זרם — פחות ניחושים, יותר כסף שנשאר אצלכם" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "זרם — השוואת תוכניות חשמל חכמה",
    description: "23 תוכניות, 7 ספקים והשוואה אישית לפי פעימות המונה.",
    images: [openGraphImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
