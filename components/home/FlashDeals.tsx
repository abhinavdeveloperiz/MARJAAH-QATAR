"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Zap, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { getOnSaleProducts } from "@/lib/data/products";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart";
import toast from "react-hot-toast";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface FlashDealsProps {
  locale: string;
}


export function FlashDeals({ locale }: FlashDealsProps) {
  const t = useTranslations("flash_deals");
  const isRTL = locale === "ar";
  const sectionRef = useRef<HTMLElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const saleProducts = getOnSaleProducts().slice(0, 4);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0 },
        {
          opacity: 1, duration: 0.8, ease: "power2.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true },
        }
      );
      gsap.fromTo(
        ".deal-card",
        { opacity: 0, x: isRTL ? -35 : 35 },
        {
          opacity: 1, x: 0, stagger: 0.1, duration: 0.6, ease: "power3.out",
          scrollTrigger: { trigger: ".deals-row", start: "top 75%", once: true },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [isRTL]);

  return (
    <section
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
      style={{ backgroundColor: "var(--bg-surface)" }}
    >
      {/* Background glow */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[350px] bg-primary-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[450px] h-[250px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(141,156,245,0.3)]" style={{ backgroundColor: "rgba(64,99,178,0.2)", border: "1px solid rgba(141,156,245,0.4)" }}>
                <Zap className="w-4 h-4 fill-current" style={{ color: "var(--color-accent)" }} />
              </div>
              <p className="text-xs font-sans font-bold tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>{isRTL ? "عروض حصرية محدودة" : "Limited Time Drops"}</p>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>{t("title")}</h2>
            <p className="mt-2 font-medium" style={{ color: "var(--text-secondary)" }}>{t("subtitle")}</p>
          </div>
        </div>

        {/* Deal Cards */}
        <div className="deals-row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {saleProducts.map((product) => {
            const discount = product.originalPrice
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
              : 0;
            return (
              <div key={product.id} className="deal-card">
                <Link href={`/${locale}/product/${product.slug}`}>
                  <div className="rounded-2xl overflow-hidden hover:border-[rgba(141,156,245,0.5)] transition-all duration-300 group hover:shadow-glow-accent" style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--bg-surface-3)" }}>
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-dark-200 to-dark-100 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector(".fallback-placeholder")) {
                            const placeholder = document.createElement("div");
                            placeholder.className = "fallback-placeholder w-full h-full flex flex-col items-center justify-center p-4 text-center select-none";
                            placeholder.innerHTML = `
                              <div class="w-12 h-12 rounded-xl bg-surface-2/80 border border-white/10 flex items-center justify-center mb-1.5 shadow-inner">
                                <svg class="w-6 h-6 text-cyan-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                              </div>
                              <span class="text-[10px] font-bold text-muted uppercase tracking-wider">${product.brand}</span>
                            `;
                            parent.appendChild(placeholder);
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 text-transparent select-none"
                      />
                      {/* Discount badge */}
                      <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 bg-gradient-to-r from-cyan-500 to-primary-500 text-dark-300 text-xs font-black px-3 py-1 rounded-lg font-display shadow-glow-cyan pointer-events-none z-10">
                        -{discount}%
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-5">
                      <p className="text-xs font-bold mb-1 font-display uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>{product.brand}</p>
                      <h3 className="text-sm font-semibold line-clamp-2 mb-3 leading-snug" style={{ color: "var(--text-primary)" }}>
                        {isRTL ? product.nameAr : product.name}
                      </h3>
                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="font-black text-lg font-display" style={{ color: "var(--text-primary)" }}>QAR {product.price.toLocaleString()}</span>
                        <span className="text-xs line-through font-medium" style={{ color: "var(--text-secondary)" }}>QAR {product.originalPrice?.toLocaleString()}</span>
                      </div>
                      {/* Savings */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-success text-xs font-bold">
                          Save QAR {((product.originalPrice || 0) - product.price).toLocaleString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            addItem({
                              id: product.id, name: product.name, nameAr: product.nameAr,
                              price: product.price, originalPrice: product.originalPrice,
                              image: product.images[0], quantity: 1, slug: product.slug,
                              brand: product.brand, inStock: product.inStock,
                            });
                            toast.success("Added to cart!");
                          }}
                          className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 hover:from-primary-400 hover:to-cyan-400 flex items-center justify-center transition-all duration-200 shadow-glow-primary text-white"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href={`/${locale}/offers`} className="btn-accent px-8 py-3.5 text-sm inline-flex">
            {t("shop_deals")}
            <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
          </Link>
        </div>
      </div>
    </section>
  );
}
