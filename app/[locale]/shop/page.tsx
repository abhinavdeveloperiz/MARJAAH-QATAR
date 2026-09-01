import type { Metadata } from "next";
import Link from "next/link";
import { ShopClient } from "@/components/shop/ShopClient";
import { Sparkles, ChevronRight, ShieldCheck, Truck, Cpu } from "lucide-react";
import { products } from "@/lib/data/products";

export const metadata: Metadata = {
  title: "Shop All Products | M.SHOP Qatar",
  description: "Browse all premium computers, gaming rigs, and authentic accessories in Qatar with official warranty.",
};

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  const isRTL = locale === "ar";
  const totalCount = products.length;

  return (
    <div className="min-h-screen pt-[72px]" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Premium Hero Shop Header */}
      <section className="relative overflow-hidden" style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-surface)" }}>
        {/* Subtle Ambient Glow Effect */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-10 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container-custom py-8 md:py-12 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            {/* Left Content */}
            <div className="space-y-4 max-w-2xl">
              {/* Refined Breadcrumb & Badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-sans font-medium text-slate-500">
                  <Link href={`/${locale}`} className="hover:text-[#4063B2] transition-colors">
                    {isRTL ? "الرئيسية" : "Home"}
                  </Link>
                  <ChevronRight className={isRTL ? "w-3 h-3 rotate-180 text-slate-400" : "w-3 h-3 text-slate-400"} />
                  <span className="text-[#4063B2] font-semibold">{isRTL ? "المتجر" : "Shop"}</span>
                </nav>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4063B2]/10 border border-[#4063B2]/20 text-[#4063B2] text-[11px] font-bold tracking-wider uppercase">
                  <Sparkles className="w-3 h-3 text-[#4063B2]" />
                  {isRTL ? "المتجر الرسمي بقطر" : "OFFICIAL QATAR CATALOG"}
                </span>
              </div>

              {/* Title */}
              <div>
                <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase leading-none" style={{ color: "var(--text-primary)" }}>
                  {isRTL ? "جميع المنتجات والمعدات" : "ALL PRODUCTS"}
                </h1>
                <p className="text-sm sm:text-base font-sans font-medium mt-2.5 max-w-xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {isRTL
                    ? "استكشف أحدث الحواسيب المحمولة، والمعدات الاحترافية، وإكسسوارات الجيمنج مع ضمان رسمي وتوصيل فوري في الدوحة."
                    : "Explore high-performance laptops, desktop apparatus, gaming peripherals, and genuine accessories with official local warranty."}
                </p>
              </div>
            </div>

            {/* Right Trust Stats Strip */}
            <div className="flex items-center gap-4 sm:gap-6 pt-2 lg:pt-0 border-t border-border-color lg:border-t-0">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-2 border border-border-color shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-[#4063B2]/10 flex items-center justify-center flex-shrink-0 text-[#4063B2]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm font-display leading-tight" style={{ color: "var(--text-primary)" }}>{totalCount}+ {isRTL ? "منتج" : "Units"}</p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{isRTL ? "أجهزة أصلية" : "Genuine Stock"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-2 border border-border-color shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm font-display leading-tight" style={{ color: "var(--text-primary)" }}>{isRTL ? "1-2 يوم" : "1-2 Days"}</p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{isRTL ? "توصيل الدوحة" : "Qatar Express"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog & Filter Grid */}
      <ShopClient locale={locale} initialCategory={category} />
    </div>
  );
}
