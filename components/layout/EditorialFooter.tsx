"use client";

import Link from "next/link";
import { site } from "@/lib/data/site";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

interface EditorialFooterProps {
  locale: string;
}

export function EditorialFooter({ locale }: EditorialFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="pt-16 sm:pt-20 md:pt-28 pb-12 relative overflow-hidden"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderTop: "1px solid var(--border-color)",
        color: "var(--text-primary)",
      }}
    >
      {/* Floating Ambient Orb in Footer */}
      <div
        className="ambient-orb -bottom-24 right-12 hidden sm:block"
        style={{ backgroundColor: "var(--color-sage)", animationDelay: "-2s" }}
      />

      <div className="relative z-10 container-custom space-y-12 sm:space-y-16 md:space-y-20">
        {/* Brand Banner with M.SHOP Logo */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <Link href={`/${locale}`} aria-label="M.SHOP" className="inline-block">
            <Logo variant="auto" size="lg" subtext="QATAR'S PREMIER TECH STORE" />
          </Link>
          <div className="flex items-center gap-3 text-xs font-sans font-bold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>DOHA SHOWROOM ACTIVE</span>
          </div>
        </div>

        {/* Massive 'Let's Connect' Heading */}
        <div>
          <span className="text-xs font-sans font-bold uppercase tracking-widest block mb-6" style={{ color: "var(--text-secondary)" }}>
            GET IN TOUCH WITH SPECIALISTS
          </span>
          <h2 className="font-display text-6xl sm:text-8xl md:text-9xl leading-none uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>
            LET&#39;S CONNECT.
          </h2>
        </div>

        {/* Email link in Periwinkle Blue */}
        <div className="space-y-4">
          <p className="text-xs font-sans font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            DIRECT HARDWARE &amp; CORPORATE INQUIRIES
          </p>
          <a
            href={`mailto:${site.contact.email}`}
            className="font-display text-2xl sm:text-3xl md:text-5xl underline underline-offset-8 decoration-1 transition-colors duration-300 block break-all"
            style={{ color: "var(--color-accent)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-violet)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
          >
            {site.contact.email}
          </a>
        </div>

        {/* Middle Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-12" style={{ borderTop: "1px solid var(--border-color)" }}>
          {/* Location */}
          <div className="space-y-3">
            <span className="text-xs font-sans font-bold uppercase tracking-widest block" style={{ color: "var(--text-secondary)" }}>
              DOHA SHOWROOM
            </span>
            <p className="text-sm font-sans font-medium leading-relaxed" style={{ color: "var(--text-primary)", opacity: 0.9 }}>
              {site.contact.location}
            </p>
            <p className="text-xs font-sans" style={{ color: "var(--text-secondary)" }}>
              {site.contact.hours}
            </p>
          </div>

          {/* Direct WhatsApp & Hotline */}
          <div className="space-y-3">
            <span className="text-xs font-sans font-bold uppercase tracking-widest block" style={{ color: "var(--text-secondary)" }}>
              INSTANT HOTLINE
            </span>
            <p className="text-sm font-sans font-semibold" style={{ color: "var(--text-primary)" }}>
              {site.contact.phone}
            </p>
            <a
              href={site.contact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest transition-colors"
              style={{ color: "var(--color-accent)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-violet)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
            >
              <span>CHAT ON WHATSAPP</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <span className="text-xs font-sans font-bold uppercase tracking-widest block" style={{ color: "var(--text-secondary)" }}>
              EXPLORE
            </span>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-3 text-xs font-sans font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
              {[
                { href: `/${locale}`, label: "HOME" },
                { href: `/${locale}/shop`, label: "SHOP" },
                { href: `/${locale}/offers`, label: "OFFERS" },
                { href: `/${locale}/about`, label: "ABOUT" },
                { href: `/${locale}/contact`, label: "CONTACT" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div
          className="pt-8 flex items-center justify-center text-[12px] font-sans font-medium uppercase tracking-widest text-center"
          style={{ borderTop: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
        >
          <p className="leading-relaxed">
            © {currentYear} MARJAAH TRADING W.L.L. ALL RIGHTS RESERVED.
          </p>
        </div>

        {/* Developer Credit */}
        <div className="pt-4 text-center">
          <a
            href="https://www.inspirezesttechnologies.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs sm:text-sm font-sans font-semibold text-black hover:text-[#4063B2] hover:underline underline-offset-4 tracking-wide transition-all duration-300"
          >
            Designed and Developed by InspireZest Technologies Pvt Ltd.
          </a>
        </div>
      </div>
    </footer>
  );
}
