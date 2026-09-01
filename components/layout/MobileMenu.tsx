"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, ChevronRight, User, Heart } from "lucide-react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { categories } from "@/lib/data/categories";
import { Logo } from "@/components/ui/Logo";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
  navLinks: { href: string; label: string; badge?: string }[];
}

export function MobileMenu({ isOpen, onClose, locale, navLinks }: MobileMenuProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerRef.current || !overlayRef.current) return;

    if (isOpen) {
      document.body.style.overflow = "hidden";
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.fromTo(
        drawerRef.current,
        { x: "100%" },
        { x: "0%", duration: 0.4, ease: "power3.out" }
      );
      // Stagger items
      gsap.fromTo(
        ".mobile-nav-item",
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", delay: 0.2 }
      );
    } else {
      document.body.style.overflow = "";
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.25 });
      gsap.to(drawerRef.current, {
        x: "100%",
        duration: 0.35,
        ease: "power3.in",
      });
    }
  }, [isOpen]);

  if (typeof window === "undefined") return null;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm",
          isOpen ? "pointer-events-auto" : "pointer-events-none opacity-0"
        )}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 bottom-0 z-[70] w-[320px] bg-surface flex flex-col shadow-2xl right-0 translate-x-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-color">
          <Link href={`/${locale}`} onClick={onClose} className="flex items-center">
            <Logo variant="light" size="sm" />
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="mobile-nav-item flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-surface-2 text-slate-700 hover:text-[#4063B2] transition-all duration-200 mb-1"
            >
              <span className="font-semibold">{link.label}</span>
              <div className="flex items-center gap-2">
                {link.badge && (
                  <span className="badge-accent text-xs">{link.badge}</span>
                )}
                <ChevronRight className="w-4 h-4 opacity-40" />
              </div>
            </Link>
          ))}

          {/* Categories Section */}
          <div className="mt-4 pt-4 border-t border-border-color">
            <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Categories
            </p>
            {categories.slice(0, 5).map((cat) => (
              <Link
                key={cat.id}
                href={`/${locale}/shop/${cat.slug}`}
                onClick={onClose}
                className="mobile-nav-item flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-2 transition-all duration-200 mb-1"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-slate-700 hover:text-[#4063B2] text-sm font-semibold">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-color space-y-2">
          <Link
            href={`/${locale}/account`}
            onClick={onClose}
            className="mobile-nav-item flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-2 text-slate-700 hover:text-[#4063B2] transition-all"
          >
            <User className="w-5 h-5 text-[#4063B2]" />
            <span className="font-semibold">My Account</span>
          </Link>
          <Link
            href={`/${locale}/wishlist`}
            onClick={onClose}
            className="mobile-nav-item flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-2 text-slate-700 hover:text-[#4063B2] transition-all"
          >
            <Heart className="w-5 h-5 text-pink-500" />
            <span className="font-semibold">Wishlist</span>
          </Link>
        </div>
      </div>
    </>
  );
}
