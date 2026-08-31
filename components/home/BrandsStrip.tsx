"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Official brand partners organized into columns for vertical flow animation
const column1 = [
  { name: "Dell", color: "#007DB8", category: "Alienware & XPS" },
  { name: "HP", color: "#0096D6", category: "Omen & Victus" },
  { name: "Lenovo", color: "#E2231A", category: "Legion & ThinkPad" },
  { name: "ASUS", color: "#3852BA", category: "ROG & TUF Gaming" },
  { name: "Apple", color: "#E5E7EB", category: "MacBook & Studio" },
];

const column2 = [
  { name: "MSI", color: "#E52535", category: "Stealth & Raider" },
  { name: "Logitech", color: "#00B96B", category: "G Pro Wireless" },
  { name: "Razer", color: "#00FF00", category: "Blade & Chroma" },
  { name: "Samsung", color: "#3B82F6", category: "Odyssey OLED" },
  { name: "Corsair", color: "#FBBF24", category: "Vengeance & Dominator" },
];

const column3 = [
  { name: "Intel", color: "#38BDF8", category: "Core i9 14th Gen" },
  { name: "NVIDIA", color: "#76B900", category: "GeForce RTX 4090" },
  { name: "AMD", color: "#ED1C24", category: "Ryzen & Radeon" },
  { name: "Kingston", color: "#F87171", category: "Fury Beast RGB" },
  { name: "SteelSeries", color: "#FB923C", category: "Apex & Arctis" },
];

const column4 = [
  { name: "ASUS ROG", color: "#EF4444", category: "Maximus & Strix" },
  { name: "BenQ ZOWIE", color: "#A855F7", category: "Esports Displays" },
  { name: "NZXT", color: "#818CF8", category: "Kraken & H-Series" },
  { name: "Western Digital", color: "#0284C7", category: "Black SN850X" },
  { name: "Gigabyte AORUS", color: "#F97316", category: "Master & Elite" },
];

interface BrandsStripProps {
  locale: string;
}

export function BrandsStrip({ locale }: BrandsStripProps) {
  const t = useTranslations("brands");
  const isRTL = locale === "ar";

  // Duplicate arrays for seamless vertical infinite looping
  const col1Items = [...column1, ...column1, ...column1];
  const col2Items = [...column2, ...column2, ...column2];
  const col3Items = [...column3, ...column3, ...column3];
  const col4Items = [...column4, ...column4, ...column4];

  return (
    <section className="py-20 bg-navy border-y border-white/10 overflow-hidden relative select-none">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: Heading & Description (4 cols) */}
          <div className="lg:col-span-4 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4063B2]/20 border border-[#8D9CF5]/40 text-[#8D9CF5] text-xs font-bold uppercase tracking-widest font-sans shadow-[0_0_12px_rgba(141,156,245,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-[#8D9CF5]" />
              {isRTL ? "شركاء التقنية المعتمدون" : "AUTHORIZED GCC PARTNERS"}
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase font-display leading-tight tracking-tight">
                {isRTL ? "أفضل العلامات التجارية" : "TOP BRANDS WE CARRY"}
              </h2>
              <p className="text-white/60 text-sm sm:text-base font-sans font-medium mt-3 leading-relaxed max-w-md mx-auto lg:mx-0">
                {isRTL
                  ? "نوفر أحدث الأجهزة والمكونات الأصلية 100% من كبرى الشركات العالمية الرائدة بضمان رسمي وتوصيل فوري في قطر."
                  : "Direct authorization and official warranty across global computing titans, gaming pioneers, and hardware innovators in Doha."}
              </p>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href={`/${locale}/shop`}
                className="btn-primary group text-xs py-3 px-6 rounded-xl"
              >
                <span>{isRTL ? "استعراض جميع الماركات" : "EXPLORE ALL BRANDS"}</span>
                <ArrowRight className={cn("w-3.5 h-3.5 transition-transform group-hover:translate-x-1", isRTL && "rotate-180 group-hover:-translate-x-1")} />
              </Link>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-3 pt-2 text-xs font-medium text-white/50">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{isRTL ? "منتجات أصلية مع ضمان محلي" : "100% Genuine with Local Warranty"}</span>
            </div>
          </div>

          {/* Right Column: 4-Column Vertical Flowing Waterfall (8 cols) */}
          <div className="lg:col-span-8 relative h-[380px] sm:h-[420px] rounded-3xl overflow-hidden bg-[#0B1120]/80 border border-white/10 p-3 sm:p-4 backdrop-blur-md">
            
            {/* Top & Bottom Smooth Gradient Fade Masks */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#070B14] via-[#070B14]/80 to-transparent z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#070B14] via-[#070B14]/80 to-transparent z-20 pointer-events-none" />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 h-full">
              
              {/* Column 1: Vertical Flow UP */}
              <div className="relative overflow-hidden group">
                <div className="vertical-marquee-up flex flex-col gap-3 group-hover:[animation-play-state:paused]">
                  {col1Items.map((brand, i) => (
                    <BrandCard key={`col1-${brand.name}-${i}`} brand={brand} locale={locale} />
                  ))}
                </div>
              </div>

              {/* Column 2: Vertical Flow DOWN */}
              <div className="relative overflow-hidden group">
                <div className="vertical-marquee-down flex flex-col gap-3 group-hover:[animation-play-state:paused]">
                  {col2Items.map((brand, i) => (
                    <BrandCard key={`col2-${brand.name}-${i}`} brand={brand} locale={locale} />
                  ))}
                </div>
              </div>

              {/* Column 3: Vertical Flow UP (hidden on tiny screens) */}
              <div className="relative overflow-hidden group hidden sm:block">
                <div className="vertical-marquee-up-slow flex flex-col gap-3 group-hover:[animation-play-state:paused]">
                  {col3Items.map((brand, i) => (
                    <BrandCard key={`col3-${brand.name}-${i}`} brand={brand} locale={locale} />
                  ))}
                </div>
              </div>

              {/* Column 4: Vertical Flow DOWN (hidden on mobile/tablet) */}
              <div className="relative overflow-hidden group hidden md:block">
                <div className="vertical-marquee-down-slow flex flex-col gap-3 group-hover:[animation-play-state:paused]">
                  {col4Items.map((brand, i) => (
                    <BrandCard key={`col4-${brand.name}-${i}`} brand={brand} locale={locale} />
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Scoped CSS for 60fps hardware-accelerated vertical flow animations */}
      <style jsx>{`
        @keyframes verticalScrollUp {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-33.333%);
          }
        }

        @keyframes verticalScrollDown {
          0% {
            transform: translateY(-33.333%);
          }
          100% {
            transform: translateY(0);
          }
        }

        .vertical-marquee-up {
          animation: verticalScrollUp 18s linear infinite;
          will-change: transform;
        }

        .vertical-marquee-down {
          animation: verticalScrollDown 22s linear infinite;
          will-change: transform;
        }

        .vertical-marquee-up-slow {
          animation: verticalScrollUp 24s linear infinite;
          will-change: transform;
        }

        .vertical-marquee-down-slow {
          animation: verticalScrollDown 20s linear infinite;
          will-change: transform;
        }
      `}</style>
    </section>
  );
}

function BrandCard({ brand, locale }: { brand: { name: string; color: string; category: string }; locale: string }) {
  return (
    <Link
      href={`/${locale}/shop?brand=${encodeURIComponent(brand.name)}`}
      className="flex flex-col justify-center p-3.5 sm:p-4 rounded-2xl bg-[#10192D] border border-white/10 hover:border-[#8D9CF5]/70 hover:bg-[#16223D] hover:shadow-[0_0_20px_rgba(141,156,245,0.25)] transition-all duration-300 shadow-md group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-sm sm:text-base font-black font-display tracking-tight transition-transform duration-300 group-hover:scale-105"
          style={{ color: brand.color }}
        >
          {brand.name}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#8D9CF5] transition-colors" />
      </div>
      <p className="text-[11px] font-sans font-medium text-white/50 group-hover:text-white/80 transition-colors truncate">
        {brand.category}
      </p>
    </Link>
  );
}
