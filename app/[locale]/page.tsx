import type { Metadata } from "next";
import { EditorialHero } from "@/components/home/EditorialHero";
import { QatarTrustStrip } from "@/components/home/QatarTrustStrip";
import { BrandsStrip } from "@/components/home/BrandsStrip";
import { FeaturedCategories } from "@/components/home/FeaturedCategories";
import { EditorialFeaturedSection } from "@/components/home/EditorialFeaturedSection";
import { FlashDeals } from "@/components/home/FlashDeals";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { NewArrivals } from "@/components/home/NewArrivals";
import { NewsletterSection } from "@/components/home/NewsletterSection";

export const metadata: Metadata = {
  title: "M.SHOP Qatar — High-Performance Hardware & Computers",
  description:
    "Qatar's premier destination for high-performance laptops, custom PC components, gaming hardware, and genuine tech accessories with official brand warranties.",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      {/* 1. Signature Editorial Hero */}
      <EditorialHero locale={locale} />

      {/* 2. Qatar Express Trust Badges (Starlink Reference) */}
      <QatarTrustStrip locale={locale} />

      {/* 3. Official Brand Partners (Linked to by scroll indicator) */}
      <div id="selected-works">
        <BrandsStrip locale={locale} />
      </div>

      {/* 3. Featured Categories */}
      <FeaturedCategories locale={locale} />

      {/* 4. Signature Editorial Hardware Feature */}
      <EditorialFeaturedSection locale={locale} />

      {/* 5. Limited-Time Flash Deals */}
      <FlashDeals locale={locale} />

      {/* 6. Featured Hardware Catalog */}
      <FeaturedProducts locale={locale} />

      {/* 7. New Arrivals */}
      <NewArrivals locale={locale} />

      {/* 8. VIP Newsletter & Concierge */}
      <NewsletterSection locale={locale} />
    </>
  );
}
