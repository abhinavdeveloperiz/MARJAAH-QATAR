import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cpu, Shield, Award, Users, CheckCircle, Sparkles } from "lucide-react";
import { site } from "@/lib/data/site";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRTL = locale === "ar";
  return {
    title: isRTL ? "من نحن | M.SHOP — مرجع للتجارة قطر" : "About Us | M.SHOP — Marjaah Trading Qatar",
    description: isRTL
      ? "تعرف على متجر M.SHOP ومرجع للتجارة — الموزع الرائد للحواسيب فائقة الأداء وقطع الألعاب في دولة قطر."
      : "Learn about M.SHOP and Marjaah Trading — Qatar's premier destination for high-performance workstations and authentic PC hardware in Doha.",
    alternates: {
      canonical: `/${locale}/about`,
      languages: {
        "en-QA": "/en/about",
        "ar-QA": "/ar/about",
      },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isRTL = locale === "ar";
  const { about } = site;

  return (
    <div className="min-h-screen bg-base">
      {/* Header Section */}
      <section
        className="container-custom pt-24 sm:pt-28 md:pt-36 pb-12 md:pb-16 border-b border-border-color"
      >
        <div className="max-w-4xl space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4063B2]/10 border border-[#4063B2]/20 text-[#4063B2] text-[11px] sm:text-xs font-bold tracking-widest uppercase font-display">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRTL ? "من نحن — M.SHOP قطر" : "ABOUT M.SHOP QATAR"}</span>
          </div>

          <h1
            className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight uppercase leading-none"
            style={{ color: "var(--text-primary)" }}
          >
            {isRTL ? about.headingAr : about.heading}
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-[#4063B2] font-bold font-display leading-snug">
            {isRTL ? about.taglineAr : about.tagline}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="container-custom py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Narrative Column (7 cols) */}
          <div className="lg:col-span-7 space-y-10">
            {/* Story Paragraphs */}
            <div className="space-y-6 text-base sm:text-lg md:text-xl font-medium leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {(isRTL ? about.paragraphsAr : about.paragraphs).map((paragraph, i) => (
                <p key={i} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Quick Stats Grid */}
            <div className="pt-8 border-t border-border-color">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { num: "5,000+", label: isRTL ? "منتج متوفر" : "Hardware Units" },
                  { num: "50+", label: isRTL ? "ماركة عالمية" : "Global Brands" },
                  { num: "1-2", label: isRTL ? "أيام التوصيل" : "Days Delivery" },
                  { num: "100%", label: isRTL ? "أصالة وضمان" : "Official Warranty" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-color shadow-sm flex flex-col justify-between"
                  >
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#4063B2] font-display mb-1">
                      {stat.num}
                    </p>
                    <p
                      className="text-xs font-bold uppercase tracking-wider font-sans"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            {/* Authorized Brand Partners */}
            <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border-color shadow-sm space-y-5">
              <span className="text-[#4063B2] text-xs font-bold uppercase tracking-widest font-sans block">
                {isRTL ? "شركاء الماركات الرسمية" : "Authorized Brand Partners"}
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {about.clients.map((brand) => (
                  <li
                    key={brand}
                    className="flex items-center gap-3 text-sm sm:text-base font-bold font-display"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <CheckCircle className="w-4 h-4 text-[#4063B2] flex-shrink-0" />
                    <span>{brand}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hardware Domains & Expertise */}
            <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border-color shadow-sm space-y-5">
              <span className="text-[#4063B2] text-xs font-bold uppercase tracking-widest font-sans block">
                {isRTL ? "مجالات التخصص" : "Hardware Capabilities"}
              </span>
              <div className="flex flex-wrap gap-2">
                {about.expertise.map((item) => (
                  <span
                    key={item}
                    className="text-xs font-bold font-sans px-3.5 py-2 rounded-xl bg-surface-2 border border-border-color transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
