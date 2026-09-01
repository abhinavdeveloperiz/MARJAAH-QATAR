import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { categories } from "@/lib/data/categories";
import { getProductsByCategory } from "@/lib/data/products";
import { ShopClient } from "@/components/shop/ShopClient";
import { ChevronRight, Sparkles, ShieldCheck, Truck } from "lucide-react";

export async function generateStaticParams() {
  return categories.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category: categorySlug } = await params;
  const cat = categories.find((c) => c.slug === categorySlug);

  if (!cat) return { title: "Category Not Found | M.SHOP Qatar" };

  const isRTL = locale === "ar";
  const title = isRTL
    ? `تسوق ${cat.nameAr} في قطر | M.SHOP`
    : `Buy ${cat.name} in Qatar — Best Prices & Official Warranty | M.SHOP`;
  const description = isRTL
    ? `تصفح أفضل تشكيلة من ${cat.nameAr} الأصلية في قطر مع توصيل فوري في الدوحة وضمان رسمي معتمد.`
    : `Browse the best collection of genuine ${cat.name} in Qatar with express Doha delivery and official GCC warranty.`;

  return {
    title,
    description,
    keywords: [
      cat.name,
      cat.nameAr,
      "Qatar",
      "Doha",
      "M.SHOP",
      "buy online",
      "best prices in Qatar",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: cat.image || "/images/hero-station.jpg",
          width: 1200,
          height: 630,
          alt: cat.name,
        },
      ],
    },
    alternates: {
      canonical: `/${locale}/shop/${categorySlug}`,
      languages: {
        "en-QA": `/en/shop/${categorySlug}`,
        "ar-QA": `/ar/shop/${categorySlug}`,
      },
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category: categorySlug } = await params;
  const cat = categories.find((c) => c.slug === categorySlug);

  if (!cat) notFound();

  const isRTL = locale === "ar";
  const categoryProducts = getProductsByCategory(categorySlug);

  return (
    <div className="min-h-screen bg-base pt-[72px]">
      {/* Category Hero Header */}
      <section className="relative border-b border-white/10 bg-gradient-to-b from-[#10192D]/90 via-[#0B1120]/95 to-dark-300 overflow-hidden">
        <div className="container-custom py-8 md:py-12 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-sans font-medium text-white/50">
                <Link href={`/${locale}`} className="hover:text-white transition-colors">
                  {isRTL ? "الرئيسية" : "Home"}
                </Link>
                <ChevronRight className={isRTL ? "w-3 h-3 rotate-180 text-white/30" : "w-3 h-3 text-white/30"} />
                <Link href={`/${locale}/shop`} className="hover:text-white transition-colors">
                  {isRTL ? "المتجر" : "Shop"}
                </Link>
                <ChevronRight className={isRTL ? "w-3 h-3 rotate-180 text-white/30" : "w-3 h-3 text-white/30"} />
                <span className="text-[#8D9CF5] font-semibold">{isRTL ? cat.nameAr : cat.name}</span>
              </nav>

              <div className="space-y-2">
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white uppercase tracking-tight">
                  {isRTL ? cat.nameAr : cat.name}
                </h1>
                <p className="text-[#94A3B8] text-sm sm:text-base font-medium leading-relaxed">
                  {isRTL
                    ? `تصفح أحدث وأقوى موديلات ${cat.nameAr} الأصلية المتوفرة حالياً في قطر مع خدمة التوصيل السريع بالدوحة.`
                    : `Discover the ultimate selection of high-performance ${cat.name} available in Qatar with official brand warranties.`}
                </p>
              </div>
            </div>

            {/* Quick Trust Badges */}
            <div className="flex items-center gap-4 text-xs font-sans font-semibold text-white/70 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>{isRTL ? "ضمان رسمي" : "Official Warranty"}</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="inline-flex items-center gap-1.5 text-[#8D9CF5]">
                <Truck className="w-4 h-4" />
                <span>{isRTL ? "توصيل بالدوحة" : "Doha Dispatch"}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="container-custom py-8 md:py-12">
        <ShopClient initialCategory={categorySlug} locale={locale} />
      </section>
    </div>
  );
}
