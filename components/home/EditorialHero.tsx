"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowDown } from "lucide-react";
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
      className="relative min-h-[640px] sm:min-h-[720px] lg:h-[92vh] max-h-[960px] overflow-hidden flex flex-col justify-between px-5 sm:px-8 md:px-12 lg:px-16 pt-[84px] sm:pt-[96px] md:pt-[104px] pb-6 sm:pb-8 select-none"
      style={{ backgroundColor: "var(--bg-base)", borderBottom: "1px solid var(--border-color)", color: "var(--text-primary)" }}
    >
      {/* Dynamic Parallax Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          ref={imageRef}
          className="absolute -top-[15%] -left-[10%] -right-[10%] -bottom-[15%] bg-cover bg-center bg-no-repeat transition-transform duration-700 ease-out opacity-15 mix-blend-multiply"
          style={{
            backgroundImage: "url('/images/hero-station.jpg')",
            transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 15}px) scale(1.08)`,
            filter: "grayscale(20%) contrast(1.1)",
          }}
        />

        {/* Ambient Floating Glow Aura */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] lg:w-[850px] h-[350px] sm:h-[500px] bg-gradient-to-tr from-[#4063B2]/15 via-[#8D9CF5]/10 to-[#BB9AED]/10 rounded-full blur-[120px] sm:blur-[160px] transition-transform duration-1000 ease-out pointer-events-none"
          style={{
            transform: `translate(${-mousePos.x * 35}px, ${-mousePos.y * 35}px)`,
          }}
        />

        {/* Cyber Grid Background Matrix */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(64,99,178,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(64,99,178,0.06)_1px,transparent_1px)] bg-[size:3rem_3rem] sm:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Cinematic Vignettes & Depth Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)]/60 via-transparent to-[var(--bg-base)] pointer-events-none" />
      </div>

      {/* 1. Top 3-Column Specimen Editorial Header (Positioned Below Fixed Navbar) */}
      <div
        className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-4 pt-1 sm:pt-2 border-b pb-3 sm:pb-4 text-left"
        style={{ borderColor: "var(--border-color)" }}
      >
        {/* Col 1 */}
        <div className="space-y-0.5">
          <p className="text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--color-primary)" }}>
            <span className="font-black text-sm">›</span> HIGH-PERFORMANCE TECH
          </p>
          <p className="text-[10px] sm:text-[11px] font-sans leading-tight hidden sm:block" style={{ color: "var(--text-secondary)" }}>
            Custom rigs, workstations &amp; genuine components.
          </p>
        </div>

        {/* Col 2 */}
        <div className="space-y-0.5">
          <p className="text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--color-primary)" }}>
            <span className="font-black text-sm">›</span> ©MARJAAH TRADING
          </p>
          <p className="text-[10px] sm:text-[11px] font-sans leading-tight hidden sm:block" style={{ color: "var(--text-secondary)" }}>
            Official authorized GCC hardware showroom.
          </p>
        </div>

        {/* Col 3 */}
        <div className="space-y-0.5 hidden md:block text-right">
          <p className="text-[11px] sm:text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-end gap-1.5" style={{ color: "var(--color-primary)" }}>
            <span className="font-black text-sm">›</span> 2026 EDITION
          </p>
          <p className="text-[10px] sm:text-[11px] font-sans leading-tight" style={{ color: "var(--text-secondary)" }}>
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
          <h1 className="font-guminert text-[18vw] sm:text-[15vw] md:text-[13vw] lg:text-[11vw] xl:text-[10vw] font-bold leading-[0.92] tracking-[-0.03em] uppercase drop-shadow-[0_15px_35px_rgba(64,99,178,0.18)]">
            <span className="bg-gradient-to-b from-[#0D1326] via-[#1A2747] to-[#4063B2] bg-clip-text text-transparent transition-all duration-300 hover:brightness-125 cursor-default font-extrabold">
              MARJAAH
            </span>
          </h1>
        </div>

        {/* Balanced Subtitle */}
        <p className="mt-4 sm:mt-6 text-xs sm:text-sm md:text-base font-sans max-w-md sm:max-w-lg md:max-w-xl font-normal leading-relaxed text-center px-3" style={{ color: "var(--text-secondary)" }}>
          Qatar&apos;s premier destination for custom gaming rigs, RTX 40-series workstations, OLED monitors, and authentic tech hardware with official GCC warranty.
        </p>
      </div>

      {/* 3. Bottom Utility & Scroll Strip */}
      <div
        className="relative z-10 flex items-center justify-between gap-3 pt-3 sm:pt-4 border-t mt-auto"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#4063B2] flex-shrink-0" />
          <span className="text-[10px] sm:text-xs font-sans font-bold uppercase tracking-wider truncate" style={{ color: "var(--text-secondary)" }}>
            M.SHOP • QATAR&apos;S HARDWARE AUTHORITY
          </span>
        </div>

        <button
          onClick={scrollToWorks}
          aria-label="Scroll down"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border bg-white hover:bg-[#4063B2] hover:border-[#4063B2] hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer group flex-shrink-0 shadow-sm"
          style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
        >
          <ArrowDown className="w-3.5 h-3.5 group-hover:text-white" />
        </button>
      </div>
    </section>
  );
}
