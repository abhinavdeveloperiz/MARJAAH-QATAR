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
      <section className="container-custom pt-28 md:pt-36 pb-12 md:pb-16 border-b border-border-color">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4063B2]/10 border border-[#4063B2]/20 text-[#4063B2] text-xs font-bold tracking-widest uppercase mb-6 font-display">
            <Sparkles className="w-3.5 h-3.5" />
            {isRTL ? "من نحن — M.SHOP قطر" : "ABOUT M.SHOP QATAR"}
          </div>

          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none mb-6" style={{ color: "var(--text-primary)" }}>
            {isRTL ? about.headingAr : about.heading}
          </h1>

          <p className="text-xl sm:text-2xl text-[#4063B2] font-semibold font-display leading-snug">
            {isRTL ? about.taglineAr : about.tagline}
          </p>
        </div>
      </section>

      {/* Main Editorial Content (From Template Structure) */}
      <section className="container-custom py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Narrative Column (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-6 text-lg md:text-xl leading-relaxed font-medium" style={{ color: "var(--text-secondary)" }}>
              {(isRTL ? about.paragraphsAr : about.paragraphs).map((paragraph, i) => (
                <p key={i} className="text-slate-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-border-color">
              {[
                { num: "5,000+", label: isRTL ? "منتج متوفر" : "Hardware Units" },
                { num: "50+", label: isRTL ? "ماركة عالمية" : "Global Brands" },
                { num: "1-2", label: isRTL ? "أيام التوصيل" : "Days Delivery" },
                { num: "100%", label: isRTL ? "أصالة وضمان" : "Official Warranty" },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-2xl bg-surface border border-border-color shadow-sm">
                  <p className="text-2xl sm:text-3xl font-black text-[#4063B2] font-display mb-1">{stat.num}</p>
                  <p className="text-slate-600 text-xs font-semibold">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Authorized Brands & Hardware Expertise (5 cols) */}
          <div className="lg:col-span-5 space-y-10">
            {/* Authorized Brand Partners */}
            <div className="bg-surface rounded-3xl p-8 border border-border-color shadow-sm">
              <p className="text-[#4063B2] text-xs font-bold uppercase tracking-widest font-sans mb-6">
                {isRTL ? "شركاء الماركات الرسمية" : "Authorized Brand Partners"}
              </p>
              <ul className="space-y-3.5">
                {about.clients.map((brand) => (
                  <li key={brand} className="flex items-center gap-3 text-base sm:text-lg font-bold font-display" style={{ color: "var(--text-primary)" }}>
                    <CheckCircle className="w-4 h-4 text-[#4063B2] flex-shrink-0" />
                    <span>{brand}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hardware Domains & Expertise */}
            <div className="bg-surface rounded-3xl p-8 border border-border-color shadow-sm">
              <p className="text-[#4063B2] text-xs font-bold uppercase tracking-widest font-sans mb-6">
                {isRTL ? "مجالات التخصص" : "Hardware Capabilities"}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {about.expertise.map((item) => (
                  <span
                    key={item}
                    className="text-xs font-bold font-sans px-3.5 py-2 rounded-xl bg-surface-2 border border-surface-3 text-slate-700 hover:text-[#4063B2] hover:border-[#4063B2]/40 transition-colors"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Contact CTA */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#4063B2]/10 via-surface to-[#8D9CF5]/10 border border-[#4063B2]/30 text-center shadow-sm">
              <h3 className="text-xl font-bold font-display mb-2" style={{ color: "var(--text-primary)" }}>
                {isRTL ? "هل تحتاج إلى استشارة لمؤسستك أو شركتك؟" : "Need Corporate Procurement in Qatar?"}
              </h3>
              <p className="text-sm font-medium mb-6" style={{ color: "var(--text-secondary)" }}>
                {isRTL ? "تواصل مباشرة مع خبرائنا عبر الواتساب للحصول على استشارة فورية" : "Connect directly with our hardware specialists for immediate corporate or personal advice."}
              </p>
              <Link href={`/${locale}/contact`} className="btn-primary justify-center w-full shadow-md">
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
