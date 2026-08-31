"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Sparkles } from "lucide-react";
import { categories } from "@/lib/data/categories";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface FeaturedCategoriesProps {
  locale: string;
}

export function FeaturedCategories({ locale }: FeaturedCategoriesProps) {
  const t = useTranslations("categories");
  const isRTL = locale === "ar";
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  const featuredCats = categories.filter((c) => c.featured);

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
        ".cat-card",
        { opacity: 0, y: 45, scale: 0.94 },
        {
          opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: ".cat-grid", start: "top 80%", once: true },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-dark-300 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container-custom relative z-10">
        {/* Heading */}
        <div ref={headingRef} className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#8D9CF5]" />
              <p className="text-xs font-sans font-bold tracking-widest uppercase text-[#8D9CF5]">{isRTL ? "تصفح الفئات" : "Explore Collections"}</p>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-white uppercase tracking-tight">{t("title")}</h2>
            <p className="text-[#94A3B8] text-base sm:text-lg mt-2 font-medium">{t("subtitle")}</p>
          </div>
          <Link
            href={`/${locale}/shop`}
            className="text-xs font-sans font-bold tracking-widest uppercase text-[#8D9CF5] hover:text-[#BB9AED] flex items-center gap-2 flex-shrink-0 transition-colors"
          >
            {t("view_all")}
            <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
          </Link>
        </div>

        {/* Category Grid */}
        <div className="cat-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {/* Large feature card */}
          <div className="cat-card col-span-2 md:col-span-1 lg:col-span-2 row-span-2">
            <Link href={`/${locale}/shop/${featuredCats[0].slug}`}>
              <div className="category-card h-[400px] group relative rounded-3xl overflow-hidden border border-[#4063B2]/30 hover:border-[#8D9CF5] hover:shadow-[0_0_30px_rgba(141,156,245,0.3)] transition-all duration-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredCats[0].image}
                  alt={featuredCats[0].name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-300 via-dark-300/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="badge bg-[#4063B2]/30 text-[#8D9CF5] border border-[#8D9CF5]/40 text-xs mb-2 inline-block shadow-sm">
                    {featuredCats[0].productCount}+ {isRTL ? "منتج" : "products"}
                  </span>
                  <h3 className="text-white text-3xl font-black font-display mb-2">
                    {isRTL ? featuredCats[0].nameAr : featuredCats[0].name}
                  </h3>
                  <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span className="text-[#8D9CF5] text-sm font-bold font-sans tracking-wider uppercase">{isRTL ? "تسوق الآن" : "Shop Collection"}</span>
                    <ArrowRight className="w-4 h-4 text-[#8D9CF5]" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Regular category cards */}
          {featuredCats.slice(1, 5).map((cat) => (
            <div key={cat.id} className="cat-card">
              <Link href={`/${locale}/shop/${cat.slug}`}>
                <div className="category-card h-[190px] group relative rounded-2xl overflow-hidden border border-white/10 hover:border-[#8D9CF5]/70 hover:shadow-[0_0_20px_rgba(141,156,245,0.25)] transition-all duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-300/90 via-dark-300/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-[10px] text-[#8D9CF5] font-bold font-sans tracking-wider uppercase">
                      {cat.productCount}+ {isRTL ? "منتج" : "items"}
                    </span>
                    <h3 className="text-white text-lg font-bold font-display leading-tight group-hover:text-[#8D9CF5] transition-colors">
                      {isRTL ? cat.nameAr : cat.name}
                    </h3>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
