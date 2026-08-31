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
    <footer className="bg-navy text-white pt-16 sm:pt-20 md:pt-28 pb-12 border-t border-white/10 relative overflow-hidden">
      {/* Floating Ambient Orb in Footer */}
      <div
        className="ambient-orb -bottom-24 right-12 bg-sage hidden sm:block"
        style={{ animationDelay: "-2s" }}
      />

      <div className="relative z-10 container-custom space-y-12 sm:space-y-16 md:space-y-20">
        {/* Brand Banner with M.SHOP Logo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-white/10">
          <Link href={`/${locale}`} aria-label="M.SHOP" className="inline-block">
            <Logo variant="dark" size="lg" subtext="QATAR'S PREMIER TECH STORE" />
          </Link>
          <div className="flex items-center gap-3 text-xs font-sans font-bold tracking-widest uppercase text-taupe">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>DOHA SHOWROOM ACTIVE</span>
          </div>
        </div>

        {/* Massive 'Let's Connect' Heading */}
        <div>
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-taupe block mb-6">
            GET IN TOUCH WITH SPECIALISTS
          </span>
          <h2 className="font-display text-6xl sm:text-8xl md:text-9xl text-white leading-none uppercase tracking-tight">
            LET’S CONNECT.
          </h2>
        </div>

        {/* Email link in Periwinkle Blue */}
        <div className="space-y-4">
          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-muted">
            DIRECT HARDWARE & CORPORATE INQUIRIES
          </p>
          <a
            href={`mailto:${site.contact.email}`}
            className="font-display text-2xl sm:text-3xl md:text-5xl text-[#8D9CF5] hover:text-[#BB9AED] underline underline-offset-8 decoration-1 transition-colors duration-300 block break-all"
          >
            {site.contact.email}
          </a>
        </div>

        {/* Middle Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-12 border-t border-white/10">
          {/* Location */}
          <div className="space-y-3">
            <span className="text-xs font-sans font-bold uppercase tracking-widest text-muted block">
              DOHA SHOWROOM
            </span>
            <p className="text-sm font-sans font-medium text-white/90 leading-relaxed">
              {site.contact.location}
            </p>
            <p className="text-xs font-sans text-muted">
              {site.contact.hours}
            </p>
          </div>

          {/* Direct WhatsApp & Hotline */}
          <div className="space-y-3">
            <span className="text-xs font-sans font-bold uppercase tracking-widest text-muted block">
              INSTANT HOTLINE
            </span>
            <p className="text-sm font-sans font-semibold text-white">
              {site.contact.phone}
            </p>
            <a
              href={site.contact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest text-[#8D9CF5] hover:text-[#BB9AED] transition-colors"
            >
              <span>CHAT ON WHATSAPP</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <span className="text-xs font-sans font-bold uppercase tracking-widest text-muted block">
              EXPLORE
            </span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-sans font-bold uppercase tracking-widest text-white/80">
              <Link href={`/${locale}`} className="hover:text-[#8D9CF5] transition-colors">HOME</Link>
              <Link href={`/${locale}/shop`} className="hover:text-[#8D9CF5] transition-colors">SHOP</Link>
              <Link href={`/${locale}/offers`} className="hover:text-[#8D9CF5] transition-colors">OFFERS</Link>
              <Link href={`/${locale}/about`} className="hover:text-[#8D9CF5] transition-colors">ABOUT</Link>
              <Link href={`/${locale}/contact`} className="hover:text-[#8D9CF5] transition-colors">CONTACT</Link>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] font-sans font-medium uppercase tracking-widest text-taupe">
          <p>© {currentYear} MARJAAH TRADING W.L.L. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">PRIVACY</span>
            <span className="hover:text-white transition-colors cursor-pointer">TERMS</span>
            <span className="hover:text-white transition-colors cursor-pointer">WARRANTY</span>
          </div>
        </div>

        {/* Developer Credit */}
        <div className="pt-4 text-center">
          <a
            href="https://www.inspirezesttechnologies.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs sm:text-sm font-sans font-normal text-[#D4AF37] hover:text-[#F3C34D] hover:underline underline-offset-4 tracking-wide transition-all duration-300"
          >
            Designed and Developed by InspireZest Technologies Pvt Ltd.
          </a>
        </div>
      </div>
    </footer>
  );
}
