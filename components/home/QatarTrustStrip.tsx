"use client";

import { Truck, ShieldCheck, CreditCard, Headphones } from "lucide-react";

interface QatarTrustStripProps {
  locale: string;
}

export function QatarTrustStrip({ locale }: QatarTrustStripProps) {
  const trustFeatures = [
    {
      icon: Truck,
      title: "Express Doha Delivery",
      desc: "Same-day or next-day dispatch across Qatar",
      glowColor: "from-blue-500/20 to-[#8D9CF5]/20",
    },
    {
      icon: ShieldCheck,
      title: "100% Official Warranty",
      desc: "Full manufacturer coverage with local GCC support",
      glowColor: "from-emerald-500/20 to-[#8D9CF5]/20",
    },
    {
      icon: CreditCard,
      title: "Flexible Payment Options",
      desc: "Cash on Delivery, Apple Pay, Cards & Instalments",
      glowColor: "from-purple-500/20 to-[#BB9AED]/20",
    },
    {
      icon: Headphones,
      title: "Dedicated Tech Support",
      desc: "Direct 24/7 WhatsApp consultation & product assistance",
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
                <div className="flex items-center sm:items-start gap-3.5 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${item.glowColor} border border-[#8D9CF5]/30 flex items-center justify-center flex-shrink-0 shadow-sm`} style={{ color: "var(--color-accent)" }}>
                    <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold font-sans text-xs sm:text-sm tracking-tight transition-colors" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs font-sans mt-0.5 leading-snug" style={{ color: "var(--text-secondary)" }}>
                      {item.desc}
                    </p>
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
