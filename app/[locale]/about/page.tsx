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
      {/* Header Section from Template */}
      <section className="container-custom pt-28 md:pt-36 pb-12 md:pb-16 border-b border-surface-3">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 font-display">
            <Sparkles className="w-3.5 h-3.5" />
            {isRTL ? "من نحن — M.SHOP قطر" : "ABOUT M.SHOP QATAR"}
          </div>

          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white leading-none mb-6">
            {isRTL ? about.headingAr : about.heading}
          </h1>

          <p className="text-xl sm:text-2xl text-cyan-400 font-semibold font-display leading-snug">
            {isRTL ? about.taglineAr : about.tagline}
          </p>
        </div>
      </section>

      {/* Main Editorial Content (From Template Structure) */}
      <section className="container-custom py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Narrative Column (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-6 text-lg md:text-xl leading-relaxed text-muted font-medium">
              {(isRTL ? about.paragraphsAr : about.paragraphs).map((paragraph, i) => (
                <p key={i} className="text-white/90">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-surface-3">
              {[
                { num: "5,000+", label: isRTL ? "منتج متوفر" : "Hardware Units" },
                { num: "50+", label: isRTL ? "ماركة عالمية" : "Global Brands" },
                { num: "1-2", label: isRTL ? "أيام التوصيل" : "Days Delivery" },
                { num: "100%", label: isRTL ? "أصالة وضمان" : "Official Warranty" },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-2xl bg-surface border border-white/5">
                  <p className="text-2xl sm:text-3xl font-black text-cyan-400 font-display mb-1">{stat.num}</p>
                  <p className="text-muted text-xs font-semibold">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Authorized Brands & Hardware Expertise (5 cols) */}
          <div className="lg:col-span-5 space-y-10">
            {/* Authorized Brand Partners */}
            <div className="bg-[#10192D]/90 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-lg">
              <p className="text-[#8D9CF5] text-xs font-bold uppercase tracking-widest font-sans mb-6">
                {isRTL ? "شركاء الماركات الرسمية" : "Authorized Brand Partners"}
              </p>
              <ul className="space-y-3.5">
                {about.clients.map((brand) => (
                  <li key={brand} className="flex items-center gap-3 text-base sm:text-lg font-bold font-display text-white">
                    <CheckCircle className="w-4 h-4 text-[#8D9CF5] flex-shrink-0" />
                    <span>{brand}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hardware Domains & Expertise */}
            <div className="bg-[#10192D]/90 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-lg">
              <p className="text-[#8D9CF5] text-xs font-bold uppercase tracking-widest font-sans mb-6">
                {isRTL ? "مجالات التخصص" : "Hardware Capabilities"}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {about.expertise.map((item) => (
                  <span
                    key={item}
                    className="text-xs font-bold font-sans px-3.5 py-2 rounded-xl bg-[#16223D] border border-white/5 text-[#94A3B8] hover:text-white hover:border-[#8D9CF5]/40 transition-colors"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Contact CTA */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#4063B2]/30 via-[#10192D] to-[#8D9CF5]/20 border border-[#8D9CF5]/30 text-center">
              <h3 className="text-xl font-bold font-display text-white mb-2">
                {isRTL ? "هل تحتاج إلى تجميعة مخصصة؟" : "Need Custom Procurement in Qatar?"}
              </h3>
              <p className="text-[#94A3B8] text-sm font-medium mb-6">
                {isRTL ? "تواصل مباشرة مع خبرائنا عبر الواتساب للحصول على استشارة فورية" : "Connect directly with our hardware specialists for immediate corporate or personal advice."}
              </p>
              <Link href={`/${locale}/contact`} className="btn-primary justify-center w-full shadow-lg">
                {isRTL ? "تواصل معنا" : "Contact Specialists"}
                <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
