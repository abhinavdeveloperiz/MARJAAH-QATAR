"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowDown } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("hero");

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
      className="relative min-h-[580px] sm:min-h-[660px] lg:h-[90vh] max-h-[960px] overflow-hidden flex flex-col justify-between px-5 sm:px-8 md:px-12 lg:px-16 pt-[72px] sm:pt-[84px] pb-8 sm:pb-12 select-none text-white"
      style={{ backgroundColor: "#060913" }}
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

        {/* Seamless Atmospheric Gradient Blend into Page Background */}
        <div className="absolute inset-x-0 bottom-0 h-44 sm:h-56 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/80 via-45% to-transparent pointer-events-none z-10" />
      </div>

      {/* 2. Central Typography Showcase */}
      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-6xl mx-auto w-full py-8 sm:py-12 md:py-16 pt-16 sm:pt-20"
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
        <p className="mt-4 sm:mt-6 text-xs sm:text-sm md:text-base font-sans text-white/70 max-w-md sm:max-w-lg md:max-w-xl font-normal leading-relaxed text-center px-3">
          {t("subtitle")}
        </p>
      </div>

      {/* 3. Bottom Utility & Scroll Strip */}
      <div className="relative z-20 flex items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-slate-400/20 mt-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#4063B2] flex-shrink-0" />
          <span className="text-[10px] sm:text-xs font-sans font-bold uppercase tracking-wider text-slate-700 dark:text-white/60 truncate">
            {t("tagline")}
          </span>
        </div>

        <button
          onClick={scrollToWorks}
          aria-label="Scroll down"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-300/40 bg-white/80 dark:bg-[#0B1120]/60 hover:bg-[#4063B2] hover:border-[#4063B2] text-slate-700 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer group flex-shrink-0 shadow-sm"
        >
          <ArrowDown className="w-3.5 h-3.5 group-hover:text-white" />
        </button>
      </div>
    </section>
  );
}
