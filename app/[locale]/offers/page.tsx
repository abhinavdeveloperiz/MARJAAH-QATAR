import type { Metadata } from "next";
import { getOnSaleProducts } from "@/lib/data/products";
import { ProductCard } from "@/components/ui/ProductCard";
import { Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Offers & Deals",
  description: "Shop the best deals on computers and accessories in Qatar. Limited-time offers.",
};

export default async function OffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isRTL = locale === "ar";
  const saleProducts = getOnSaleProducts();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="relative pt-28 md:pt-36 pb-16 md:pb-20 overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
        <div className="container-custom relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-[#4063B2]/10 border border-[#4063B2]/20 text-[#4063B2] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            <Zap className="w-4 h-4 fill-current" />
            {isRTL ? "عروض محدودة" : "Limited Time Offers"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 uppercase tracking-tight font-display" style={{ color: "var(--text-primary)" }}>
            {isRTL ? "العروض والتخفيضات" : "Deals & Offers"}
          </h1>
          <p className="text-lg max-w-xl mx-auto font-medium" style={{ color: "var(--text-secondary)" }}>
            {isRTL
              ? "أفضل الأسعار على التقنية في قطر. لا تفوّت هذه العروض!"
              : "Best prices on tech in Qatar. Don't miss out!"}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="font-semibold text-lg font-display" style={{ color: "var(--text-primary)" }}>
              {saleProducts.length} {isRTL ? "منتج بخصم" : "products on sale"}
            </span>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {saleProducts.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      </div>
    </div>
  );
}
