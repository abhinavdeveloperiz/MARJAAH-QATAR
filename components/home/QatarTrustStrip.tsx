"use client";

import { Truck, ShieldCheck, CreditCard, Headphones } from "lucide-react";
import { useTranslations } from "next-intl";

interface QatarTrustStripProps {
  locale: string;
}

export function QatarTrustStrip({ locale }: QatarTrustStripProps) {
  const t = useTranslations("trust");

  const trustFeatures = [
    {
      icon: Truck,
      titleKey: "fast_delivery" as const,
      glowColor: "from-blue-500/20 to-[#8D9CF5]/20",
    },
    {
      icon: ShieldCheck,
      titleKey: "warranty" as const,
      glowColor: "from-emerald-500/20 to-[#8D9CF5]/20",
    },
    {
      icon: CreditCard,
      titleKey: "secure_payment" as const,
      glowColor: "from-purple-500/20 to-[#BB9AED]/20",
    },
    {
      icon: Headphones,
      titleKey: "genuine" as const,
      glowColor: "from-[#8D9CF5]/20 to-pink-500/20",
    },
  ];

  return (
    <section className="pt-4 sm:pt-6 pb-8 sm:pb-12 relative z-20" style={{ backgroundColor: "var(--bg-base)", borderBottom: "1px solid var(--border-color)" }}>
      <div className="container-custom">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {trustFeatures.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="group relative p-4 sm:p-5 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(64,99,178,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                }}
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${item.glowColor} border border-[#8D9CF5]/30 flex items-center justify-center flex-shrink-0 shadow-sm`} style={{ color: "var(--color-accent)" }}>
                    <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold font-sans text-xs sm:text-sm uppercase tracking-tight transition-colors" style={{ color: "var(--text-primary)" }}>
                      {t(item.titleKey)}
                    </h3>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
