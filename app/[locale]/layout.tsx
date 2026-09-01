import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "react-hot-toast";
import { EditorialNavbar } from "@/components/layout/EditorialNavbar";
import { EditorialFooter } from "@/components/layout/EditorialFooter";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WhatsAppWidget } from "@/components/ui/WhatsAppWidget";
import { JsonLd } from "@/components/seo/JsonLd";
import { ThemeScript } from "@/app/theme-script";
import { notFound } from "next/navigation";

const locales = ["en"];
const siteUrl = "https://marjaah.qa";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | M.SHOP — Marjaah Trading Qatar",
    default: "M.SHOP Qatar | High-Performance Hardware & Custom PCs in Doha",
  },
  description:
    "Qatar's premier online store for high-performance laptops, custom PC gaming rigs, graphics cards (RTX 4090), OLED displays, and genuine tech accessories with same-day Doha delivery.",
  keywords: [
    "M.SHOP Qatar",
    "M SHOP",
    "Marjaah Trading",
    "computers Qatar",
    "laptops Doha",
    "gaming PC Qatar",
    "custom PC build Doha",
    "RTX 4090 Qatar",
    "ASUS ROG Doha",
    "Alienware Qatar",
    "MacBook Pro Doha",
    "Starlink Qatar tech",
    "computer accessories Qatar",
    "Doha tech store",
  ],
  authors: [{ name: "M.SHOP Qatar", url: siteUrl }],
  creator: "M.SHOP Qatar",
  publisher: "Marjaah Trading",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/en",
    languages: {
      "en-QA": "/en",
      "x-default": "/en",
    },
  },
  icons: {
    icon: "/images/logo-icon.png",
    shortcut: "/images/logo-icon.png",
    apple: "/images/logo-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_QA",
    url: siteUrl,
    siteName: "M.SHOP Qatar — Marjaah Trading",
    title: "M.SHOP Qatar | High-Performance Hardware & Custom PCs",
    description:
      "Order high-performance gaming rigs, laptops, and original hardware in Qatar with 100% official brand warranty and same-day Doha delivery.",
    images: [
      {
        url: "/images/hero-station.jpg",
        width: 1200,
        height: 630,
        alt: "M.SHOP Qatar Luxury Tech Workstation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "M.SHOP Qatar | High-Performance Hardware & Custom PCs",
    description:
      "Order high-performance gaming rigs, laptops, and original hardware in Qatar with 100% official brand warranty and same-day Doha delivery.",
    images: ["/images/hero-station.jpg"],
    creator: "@marjaah_qa",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body suppressHydrationWarning>
        <JsonLd locale={locale} />
        <NextIntlClientProvider messages={messages}>
          <div className="flex flex-col min-h-screen" style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}>
            <EditorialNavbar locale={locale} />
            <main className="flex-1">{children}</main>
            <EditorialFooter locale={locale} />
            <CartDrawer />
            <WhatsAppWidget />
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "toast-custom",
              style: {
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "16px",
              },
              duration: 3000,
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
