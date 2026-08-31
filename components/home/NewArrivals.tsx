"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getNewArrivals } from "@/lib/data/products";
import { ProductCard } from "@/components/ui/ProductCard";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

interface NewArrivalsProps {
  locale: string;
}

export function NewArrivals({ locale }: NewArrivalsProps) {
  const t = useTranslations("new_arrivals");
  const isRTL = locale === "ar";
  const sectionRef = useRef<HTMLElement>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", direction: isRTL ? "rtl" : "ltr" },
    [Autoplay({ delay: 4500, stopOnInteraction: false })]
  );

  const newProducts = getNewArrivals();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 80%", once: true },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-surface overflow-hidden relative">
      <div className="container-custom">
        <div className="flex items-center justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-4 h-4 text-[#8D9CF5]" />
              <p className="text-xs font-sans font-bold tracking-widest uppercase text-[#8D9CF5]">{isRTL ? "وصلت للتو" : "Fresh Off The Assembly"}</p>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-white uppercase tracking-tight">{t("title")}</h2>
            <p className="text-[#94A3B8] text-base sm:text-lg mt-2 font-medium">{t("subtitle")}</p>
          </div>
          {/* Carousel navigation */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Previous items"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#10192D] border border-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-[#8D9CF5] hover:shadow-[0_0_15px_rgba(141,156,245,0.3)] transition-all cursor-pointer shadow-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Next items"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#10192D] border border-white/10 flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-[#8D9CF5] hover:shadow-[0_0_15px_rgba(141,156,245,0.3)] transition-all cursor-pointer shadow-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embla carousel */}
        <div ref={emblaRef} className="overflow-hidden -mx-3">
          <div className="flex">
            {newProducts.map((product) => (
              <div
                key={product.id}
                className="flex-none w-full sm:w-1/2 md:w-1/3 lg:w-1/4 px-3"
              >
                <ProductCard product={product} locale={locale} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
