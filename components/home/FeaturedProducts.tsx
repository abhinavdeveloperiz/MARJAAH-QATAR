"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Sparkles } from "lucide-react";
import { getFeaturedProducts } from "@/lib/data/products";
import { ProductCard } from "@/components/ui/ProductCard";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface FeaturedProductsProps {
  locale: string;
}

export function FeaturedProducts({ locale }: FeaturedProductsProps) {
  const t = useTranslations("featured");
  const isRTL = locale === "ar";
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  const featured = getFeaturedProducts().slice(0, 8);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 35 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: "power4.out",
          scrollTrigger: { trigger: headingRef.current, start: "top 85%", once: true },
        }
      );
      gsap.fromTo(
        ".featured-card",
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: "power3.out",
          scrollTrigger: { trigger: ".featured-grid", start: "top 80%", once: true },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-surface relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="container-custom relative z-10">
        {/* Heading */}
        <div ref={headingRef} className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-4 h-4 text-[#8D9CF5]" />
              <p className="text-xs font-sans font-bold tracking-widest uppercase text-[#8D9CF5]">{isRTL ? "مختارة بعناية للمحترفين" : "Curated For Performance"}</p>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-white uppercase tracking-tight">{t("title")}</h2>
            <p className="text-[#94A3B8] text-base sm:text-lg mt-2 font-medium">{t("subtitle")}</p>
          </div>
          <Link
            href={`/${locale}/shop`}
            className="text-xs font-sans font-bold tracking-widest uppercase text-[#8D9CF5] hover:text-[#BB9AED] flex items-center gap-2 font-display text-sm flex-shrink-0 transition-colors"
          >
            {t("view_all")}
            <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="featured-grid grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featured.map((product) => (
            <div key={product.id} className="featured-card">
              <ProductCard product={product} locale={locale} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
