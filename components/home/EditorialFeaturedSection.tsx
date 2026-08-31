"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Truck, Zap } from "lucide-react";
import { site } from "@/lib/data/site";
import { cn } from "@/lib/utils";

interface EditorialFeaturedSectionProps {
  locale: string;
}

export function EditorialFeaturedSection({ locale }: EditorialFeaturedSectionProps) {
  const isRTL = locale === "ar";
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  return (
    <section className="bg-navy text-white py-24 md:py-36 px-6 sm:px-12 md:px-16 overflow-hidden border-t border-white/10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center max-w-[1440px] mx-auto">
        {/* Left Column (6 cols): Grayscale image with Cyan decorative square offset by -48px and scroll reveal */}
        <motion.div
          initial={{ opacity: 0, x: isRTL ? 40 : -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
          className="lg:col-span-6 relative cursor-pointer"
        >
          {/* Decorative Periwinkle Square matching M.SHOP logo gradient with dynamic parallax */}
          <div
            className={cn(
              "absolute w-full h-full bg-gradient-to-br from-[#4063B2]/20 to-[#8D9CF5]/20 rounded-3xl pointer-events-none -top-8 -left-8 md:-top-12 md:-left-12 z-0 transition-transform duration-500 ease-out",
              isRTL && "md:-left-0 md:-right-12"
            )}
            style={{
              transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`,
            }}
          />

          {/* Grayscale Featured Image with 3D tilt */}
          <div
            className="relative z-10 aspect-[4/5] overflow-hidden bg-surface-2 group transition-transform duration-500 ease-out"
            style={{
              transform: `perspective(800px) rotateX(${-mousePos.y * 5}deg) rotateY(${mousePos.x * 6}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/products/asus-rog-g16.jpg"
              alt="ASUS ROG Strix G16 Flagship"
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-navy/20 pointer-events-none" />

            {/* Hover Badge */}
            <div className="absolute bottom-6 left-6 right-6 p-4 bg-navy/85 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-sage">ROG STRIX SCAR 18</p>
                <p className="font-display text-lg text-white">QAR 12,499</p>
              </div>
              <span className="text-xs font-sans font-bold uppercase tracking-widest text-white underline underline-offset-4">
                {isRTL ? "تفاصيل" : "EXPLORE"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Column (6 cols): Sage Anton label, 7xl heading, Taupe body text with scroll reveal */}
        <motion.div
          initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 space-y-8"
        >
          {/* Sage colored Anton Label */}
          <span className="font-display text-sm md:text-base uppercase tracking-widest text-sage block">
            {isRTL ? "التوزيع الرسمي المعتمد في قطر" : "AUTHORIZED GCC DISTRIBUTION"}
          </span>

          {/* 7xl Heading in Anton */}
          <h2 className="font-display text-5xl sm:text-6xl md:text-7xl text-white leading-tight uppercase tracking-tight">
            {isRTL ? (
              <>
                عتاد فائق الأداء <br />
                <span className="text-outline">ومحطات عمل احترافية</span>
              </>
            ) : (
              <>
                ULTRA RIGS & <br />
                <span className="text-outline">WORKSTATIONS</span>
              </>
            )}
          </h2>

          {/* Taupe Body Text */}
          <p className="text-base sm:text-lg text-taupe font-sans leading-relaxed max-w-xl">
            {isRTL
              ? "نربط بين كبرى الشركات العالمية الرائدة مثل ASUS ROG وApple وDell Alienware وSamsung وCorsair وRazer وبين المطورين وصناع المحتوى واللاعبين في قطر بضمان محلي معتمد وتوصيل فوري."
              : "Bridging the pinnacle of global computing hardware with Qatar's visionary tech community. Every workstation, GPU, curved display, and peripheral comes backed with local authorized warranties and express Doha dispatch."}
          </p>

          {/* Trust points strip */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2.5 text-xs font-sans font-semibold uppercase tracking-wider text-sage">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{isRTL ? "ضمان رسمي 100%" : "OFFICIAL GCC WARRANTY"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-sans font-semibold uppercase tracking-wider text-sage">
              <Truck className="w-4 h-4 flex-shrink-0" />
              <span>{isRTL ? "توصيل 1-2 يوم بالدوحة" : "1-2 DAY DOHA DISPATCH"}</span>
            </div>
          </div>

          {/* Arrow Link that shifts +8px right on hover */}
          <div className="pt-4 flex flex-wrap items-center gap-6">
            <Link
              href={`/${locale}/shop`}
              className="group inline-flex items-center gap-4 text-xs font-sans font-bold tracking-widest uppercase text-white hover:text-sage transition-colors duration-300"
            >
              <span>{isRTL ? "استكشف التجميعات ومحطات العمل" : "DISCOVER CUSTOM BUILDS"}</span>
              <ArrowRight
                className={cn(
                  "w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2",
                  isRTL && "rotate-180 group-hover:-translate-x-2"
                )}
              />
            </Link>

            <a
              href={site.contact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-sans font-bold tracking-widest uppercase text-taupe hover:text-white underline underline-offset-4 transition-colors"
            >
              {isRTL ? "استشارة خبير واتساب" : "WHATSAPP HARDWARE DESK"}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
