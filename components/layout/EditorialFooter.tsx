"use client";

import Link from "next/link";
import { site } from "@/lib/data/site";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useTranslations } from "next-intl";

interface EditorialFooterProps {
  locale: string;
}

export function EditorialFooter({ locale }: EditorialFooterProps) {
  const currentYear = new Date().getFullYear();
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  return (
    <footer
      className="pt-14 sm:pt-18 md:pt-24 pb-24 sm:pb-16 relative overflow-hidden"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderTop: "1px solid var(--border-color)",
        color: "var(--text-primary)",
      }}
    >
      {/* Floating Ambient Orb in Footer */}
      <div
        className="ambient-orb -bottom-24 right-12 hidden sm:block pointer-events-none"
        style={{ backgroundColor: "var(--color-sage)", animationDelay: "-2s" }}
      />

      <div className="relative z-10 container-custom space-y-10 sm:space-y-14 md:space-y-16">
        {/* Brand Banner with Logo & Status */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 pb-6 sm:pb-8"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <Link href={`/${locale}`} aria-label="Marjaah Trading" className="inline-block">
            <Logo variant="auto" size="lg" subtext="QATAR'S PREMIER TECH STORE" />
          </Link>
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] sm:text-xs font-sans font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("showroom_active")}</span>
          </div>
        </div>

        {/* Massive 'Let's Connect' Heading & Email */}
        <div className="space-y-4 sm:space-y-6">
          <div>
            <span className="text-[11px] sm:text-xs font-sans font-bold uppercase tracking-widest block mb-2 sm:mb-4" style={{ color: "var(--text-secondary)" }}>
              {t("get_in_touch_label")}
            </span>
            <h2 className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black leading-none uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>
              {t("lets_connect")}
            </h2>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[11px] sm:text-xs font-sans font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
              {t("hardware_inquiries")}
            </p>
            <a
              href={`mailto:${site.contact.email}`}
              className="font-display text-xl sm:text-3xl md:text-4xl font-bold underline underline-offset-8 decoration-2 transition-colors duration-200 block break-all text-[#4063B2] hover:text-[#5B7BE8]"
            >
              {site.contact.email}
            </a>
          </div>
        </div>

        {/* Middle Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 pt-8 sm:pt-10" style={{ borderTop: "1px solid var(--border-color)" }}>
          {/* Location */}
          <div className="space-y-2.5">
            <span className="text-xs font-sans font-bold uppercase tracking-widest block" style={{ color: "var(--text-secondary)" }}>
              {t("showroom")}
            </span>
            <p className="text-sm font-sans font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {site.contact.location}
            </p>
            <p className="text-xs font-sans leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {site.contact.hours}
            </p>
          </div>

          {/* Direct WhatsApp & Hotline */}
          <div className="space-y-2.5">
            <span className="text-xs font-sans font-bold uppercase tracking-widest block" style={{ color: "var(--text-secondary)" }}>
              {t("hotline")}
            </span>
            <a
              href={`tel:${site.contact.phone}`}
              className="text-sm sm:text-base font-sans font-bold block transition-colors hover:text-[#4063B2]"
              style={{ color: "var(--text-primary)" }}
            >
              {site.contact.phone}
            </a>
            <a
              href={site.contact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#4063B2] hover:text-[#5B7BE8] transition-colors pt-1"
            >
              <span>{t("chat_whatsapp")}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-2.5 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-sans font-bold uppercase tracking-widest block" style={{ color: "var(--text-secondary)" }}>
              {t("explore")}
            </span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs font-sans font-bold uppercase tracking-wider">
              {[
                { href: `/${locale}`, label: tNav("home") },
                { href: `/${locale}/shop`, label: tNav("shop") },
                { href: `/${locale}/offers`, label: tNav("offers") },
                { href: `/${locale}/about`, label: tNav("about") },
                { href: `/${locale}/contact`, label: tNav("contact") },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-[#4063B2] inline-block py-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] sm:text-xs font-sans font-medium uppercase tracking-wider text-center sm:text-left"
          style={{ borderTop: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
        >
          <p className="leading-relaxed">
            © {currentYear} MARJAAH TRADING W.L.L. {t("rights").toUpperCase()}
          </p>

          {/* Developer Credit */}
          <a
            href="https://www.inspirezesttechnologies.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] sm:text-xs font-sans font-semibold text-slate-700 dark:text-slate-300 hover:text-[#4063B2] hover:underline underline-offset-4 tracking-wide transition-all duration-200"
          >
            {t("designed_by")}
          </a>
        </div>
      </div>
    </footer>
  );
}
