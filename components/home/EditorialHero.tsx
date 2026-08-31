"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface EditorialHeroProps {
  locale: string;
}

export function EditorialHero({ locale }: EditorialHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Scroll-driven Parallax with GSAP ScrollTrigger
  useEffect(() => {
    if (!containerRef.current || !imageRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(imageRef.current, {
        yPercent: 20,
        scale: 1.12,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const scrollToWorks = () => {
    const worksElement = document.getElementById("selected-works");
    if (worksElement) {
      worksElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[580px] sm:min-h-[660px] lg:h-[90vh] max-h-[960px] bg-[#060913] text-white overflow-hidden flex flex-col justify-between px-5 sm:px-8 md:px-12 lg:px-16 pt-5 sm:pt-8 pb-5 sm:pb-8 select-none border-b border-white/10"
    >
      {/* Dynamic Parallax Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          ref={imageRef}
          className="absolute -top-[15%] -left-[10%] -right-[10%] -bottom-[15%] bg-cover bg-center bg-no-repeat transition-transform duration-700 ease-out"
          style={{
            backgroundImage: "url('/images/hero-station.jpg')",
            transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 15}px) scale(1.08)`,
            filter: "brightness(0.65) contrast(1.2) saturate(1.1)",
          }}
        />

        {/* Ambient Floating Glow Aura */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] lg:w-[800px] h-[350px] sm:h-[500px] bg-gradient-to-tr from-[#4063B2]/25 via-[#8D9CF5]/20 to-[#BB9AED]/15 rounded-full blur-[120px] sm:blur-[150px] transition-transform duration-1000 ease-out pointer-events-none"
          style={{
            transform: `translate(${-mousePos.x * 35}px, ${-mousePos.y * 35}px)`,
          }}
        />

        {/* Cyber Grid Background Matrix */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(141,156,245,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(141,156,245,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] sm:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Cinematic Vignettes & Depth Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060913]/90 via-[#060913]/55 to-[#060913] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(6,9,19,0.92)_100%)] pointer-events-none" />
      </div>

      {/* 1. Top 3-Column Specimen Editorial Header (Matching Reference Poster Style) */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-4 pt-1 sm:pt-2 border-b border-white/10 pb-3 sm:pb-4 text-left">
        {/* Col 1 */}
        <div className="space-y-0.5">
          <p className="text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <span className="text-[#8D9CF5] font-black text-sm">›</span> HIGH-PERFORMANCE TECH
          </p>
          <p className="text-[10px] sm:text-[11px] font-sans text-white/50 leading-tight hidden sm:block">
            Custom rigs, workstations & genuine components.
          </p>
        </div>

        {/* Col 2 */}
        <div className="space-y-0.5">
          <p className="text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <span className="text-[#8D9CF5] font-black text-sm">›</span> ©MARJAAH TRADING
          </p>
          <p className="text-[10px] sm:text-[11px] font-sans text-white/50 leading-tight hidden sm:block">
            Official authorized GCC hardware showroom.
          </p>
        </div>

        {/* Col 3 */}
        <div className="space-y-0.5 hidden md:block text-right">
          <p className="text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider text-white flex items-center justify-end gap-1.5">
            <span className="text-[#8D9CF5] font-black text-sm">›</span> 2026 EDITION
          </p>
          <p className="text-[10px] sm:text-[11px] font-sans text-white/50 leading-tight">
            Same-day Doha dispatch with full warranty.
          </p>
        </div>
      </div>

      {/* 2. Central Typography Showcase */}
      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-6xl mx-auto w-full py-4 sm:py-6 md:py-8"
        style={{
          transform: `perspective(1000px) rotateX(${-mousePos.y * 2}deg) rotateY(${mousePos.x * 2.5}deg) translateZ(10px)`,
        }}
      >
        {/* Monumental Headline */}
        <div className="relative inline-flex items-center justify-center my-auto select-none px-2 sm:px-6">
          <h1 className="font-guminert text-[18vw] sm:text-[15vw] md:text-[13vw] lg:text-[11vw] xl:text-[10vw] font-bold leading-[0.92] tracking-[-0.03em] uppercase drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            <span className="bg-gradient-to-b from-white via-[#E0E7FF] to-[#8D9CF5] bg-clip-text text-transparent transition-all duration-300 hover:brightness-125 cursor-default font-extrabold">
              MARJAAH
            </span>
          </h1>
        </div>

        {/* Balanced Subtitle */}
        <p className="mt-4 sm:mt-6 mb-6 sm:mb-8 text-xs sm:text-sm md:text-base font-sans text-white/70 max-w-md sm:max-w-lg md:max-w-xl font-normal leading-relaxed text-center px-3">
          Qatar&apos;s premier destination for custom gaming rigs, RTX 40-series workstations, OLED monitors, and authentic tech hardware with official GCC warranty.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
          <Link
            href={`/${locale}/shop`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#4063B2] via-[#5A7BE8] to-[#8D9CF5] hover:from-[#36529A] hover:to-[#7B8BE5] text-white font-sans font-bold text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(141,156,245,0.35)] hover:shadow-[0_0_40px_rgba(141,156,245,0.6)] transition-all duration-300 group cursor-pointer"
          >
            <span>EXPLORE CATALOG</span>
            <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>

          <Link
            href={`/${locale}/shop/gaming-pcs`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#0B1120]/80 hover:bg-white/10 border border-white/20 hover:border-[#8D9CF5]/60 text-white/90 hover:text-white font-sans font-bold text-xs sm:text-sm tracking-wider uppercase backdrop-blur-xl transition-all duration-300 shadow-md cursor-pointer"
          >
            <span>CUSTOM PC RIGS</span>
          </Link>
        </div>
      </div>

      {/* 3. Bottom Utility & Scroll Strip */}
      <div className="relative z-10 flex items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-white/10 mt-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#8D9CF5] flex-shrink-0" />
          <span className="text-[10px] sm:text-xs font-sans font-bold uppercase tracking-wider text-white/50 truncate">
            M.SHOP • QATAR&apos;S HARDWARE AUTHORITY
          </span>
        </div>

        <button
          onClick={scrollToWorks}
          aria-label="Scroll down"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/15 bg-[#0B1120]/60 hover:bg-[#8D9CF5] hover:border-[#8D9CF5] text-white/60 hover:text-[#060913] flex items-center justify-center transition-all duration-300 cursor-pointer group flex-shrink-0"
        >
          <ArrowDown className="w-3.5 h-3.5 group-hover:text-[#060913]" />
        </button>
      </div>
    </section>
  );
}
