"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { Mail, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

interface NewsletterSectionProps {
  locale: string;
}

export function NewsletterSection({ locale }: NewsletterSectionProps) {
  const t = useTranslations("newsletter");
  const isRTL = locale === "ar";
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    setIsSubmitted(true);

    if (btnRef.current) {
      gsap.fromTo(btnRef.current, { scale: 0.95 }, { scale: 1, duration: 0.4, ease: "back.out(2)" });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="py-28 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #07080B 0%, #150E2A 50%, #071624 100%)" }}
    >
      {/* Background ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Cyber Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(rgba(139,92,246,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="container-custom relative z-10">
        <div className="max-w-3xl mx-auto text-center bg-surface/80 backdrop-blur-xl rounded-3xl p-8 sm:p-14 border border-white/10 shadow-2xl">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 font-display leading-tight gradient-text">
            {t("title")}
          </h2>
          <p className="text-muted text-base sm:text-lg mb-8 font-medium max-w-xl mx-auto">{t("subtitle")}</p>

          {/* Form */}
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("placeholder")}
                  required
                  className="input pl-12 h-14 bg-surface-2/80 border-surface-3 focus:border-primary"
                />
              </div>
              <button
                ref={btnRef}
                type="submit"
                disabled={isLoading}
                className="btn-primary whitespace-nowrap flex-shrink-0 h-14 px-8 text-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {t("subscribe")}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-3 text-emerald-400 animate-scale-in p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span className="text-lg font-bold font-display">
                {isRTL ? "شكراً! ستصلك أحدث العروض التقنية" : "Welcome to M.SHOP Qatar 🎉"}
              </span>
            </div>
          )}

          {!isSubmitted && (
            <p className="text-muted text-xs mt-5 font-medium">{t("privacy")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
