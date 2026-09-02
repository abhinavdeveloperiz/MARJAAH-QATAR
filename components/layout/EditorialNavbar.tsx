"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingBag, Heart, Menu, X, ArrowUpRight, Search, Zap, ShieldCheck, Truck, User, LogOut, Package, Settings } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTranslations } from "next-intl";

interface EditorialNavbarProps {
  locale: string;
}

export function EditorialNavbar({ locale }: EditorialNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");

  const switchLocale = (next: string) => {
    const newPath = pathname.replace(/^\/(en|ar)/, `/${next}`);
    router.push(newPath);
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const items = useCartStore((s) => s.items);
  const openCart = useCartStore((s) => s.openCart);
  const wishlistItems = useWishlistStore((s) => s.items);
  const authUser = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);
  const isRTL = locale === "ar";

  const totalCartItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalWishlistItems = wishlistItems.length;

  const userInitials = authUser
    ? authUser.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push(`/${locale}`);
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${locale}/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/shop`, label: t("shop") },
    { href: `/${locale}/offers`, label: t("offers") },
    { href: `/${locale}/about`, label: t("about") },
    { href: `/${locale}/contact`, label: t("contact") },
  ];

  const isHomePage =
    pathname === `/${locale}` ||
    pathname === `/${locale}/` ||
    pathname === "/" ||
    pathname === "";

  const isTransparent = isHomePage && !isScrolled;

  const navbarBg = isTransparent
    ? "bg-transparent border-b border-transparent shadow-none"
    : isScrolled
      ? "bg-white/95 dark:bg-[#070B14]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 shadow-md"
      : "bg-white/85 dark:bg-[#070B14]/85 backdrop-blur-md border-b border-slate-200/60 dark:border-white/10 shadow-sm";

  const iconBtnClass = isTransparent
    ? "bg-transparent hover:bg-white/10 text-white"
    : "bg-transparent hover:bg-slate-100/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-[#4063B2]";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 select-none">
      {/* Main Navbar */}
      <div className={cn("transition-all duration-300", navbarBg)}>
        <div className="container-custom h-[64px] sm:h-[72px] flex items-center justify-between gap-2 sm:gap-4">
          {/* M.SHOP Official Logo */}
          <Link
            href={`/${locale}`}
            aria-label="M.SHOP Home"
            className="flex items-center group transition-transform duration-300 hover:scale-105 flex-shrink-0"
          >
            <Logo variant={isTransparent ? "dark" : "light"} size="md" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-xs font-sans font-bold tracking-widest uppercase transition-all duration-300",
                    isTransparent
                      ? isActive
                        ? "text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                        : "text-white/85 hover:text-white hover:tracking-[0.2em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                      : isActive
                        ? "text-[#4063B2] font-black"
                        : "text-slate-700 dark:text-slate-200 hover:text-[#4063B2] hover:tracking-[0.2em]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-5 flex-shrink-0">

            {/* Language Switcher (Desktop / Tablet view: md and up) */}
            <div className={cn(
              "hidden md:flex items-center gap-0.5 rounded-xl px-1 py-1 border transition-all",
              isTransparent
                ? "border-white/30 bg-white/10 backdrop-blur-sm"
                : "border-border-color bg-surface"
            )}>
              {(["en", "ar"] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => switchLocale(loc)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-sans font-bold uppercase tracking-widest transition-all cursor-pointer"
                  style={{
                    backgroundColor: locale === loc ? "#4063B2" : "transparent",
                    color: locale === loc ? "#ffffff" : isTransparent ? "rgba(255,255,255,0.75)" : "var(--text-secondary)",
                  }}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Theme Toggle (Desktop / Tablet view: md and up) */}
            <ThemeToggle size="10px" className="hidden md:flex" />

            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search Catalog"
              className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                iconBtnClass
              )}
            >
              <Search className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isTransparent ? "text-white" : "text-[#4063B2]")} />
            </button>

            {/* Wishlist Link */}
            <Link
              href={`/${locale}/wishlist`}
              aria-label="Wishlist"
              className={cn(
                "relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                iconBtnClass,
                "hover:text-rose-400"
              )}
            >
              <Heart className="w-4 h-4 text-rose-400" />
              {totalWishlistItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-display text-[9px] flex items-center justify-center font-bold shadow-md">
                  {totalWishlistItems}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <button
              onClick={openCart}
              aria-label="Open cart"
              className={cn(
                "relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0",
                iconBtnClass
              )}
            >
              <ShoppingBag className={cn("w-4 h-4", isTransparent ? "text-white" : "text-[#4063B2]")} />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#4063B2] text-white font-display text-[9px] flex items-center justify-center font-bold shadow-md">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* User Account Button (Desktop) */}
            <div ref={userMenuRef} className="hidden lg:block relative">
              {isLoggedIn && authUser ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer",
                      iconBtnClass
                    )}
                    aria-label="My Account"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4063B2] to-[#8D9CF5] flex items-center justify-center text-white font-tall text-xs">
                      {userInitials}
                    </div>
                    <span
                      className="text-xs font-sans font-semibold max-w-[80px] truncate"
                      style={{ color: isTransparent ? "#ffffff" : "var(--text-secondary)" }}
                    >
                      {authUser.name.split(" ")[0]}
                    </span>
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-52 border rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up"
                      style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)" }}
                    >
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <p className="text-xs font-sans font-bold truncate" style={{ color: "var(--text-primary)" }}>{authUser.name}</p>
                        <p className="text-[11px] font-sans truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>{authUser.email}</p>
                      </div>
                      {[
                        { href: `/${locale}/account`, icon: User, label: t("my_account") },
                        { href: `/${locale}/account/orders`, icon: Package, label: t("orders") },
                        { href: `/${locale}/account/profile`, icon: Settings, label: t("settings") },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-xs font-sans transition-all"
                          style={{
                            color: "var(--text-secondary)",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          <item.icon className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
                          {item.label}
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all font-sans"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {t("sign_out")}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={`/${locale}/auth/login`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4063B2] via-[#5B7BE8] to-[#8D9CF5] hover:from-[#36529A] hover:to-[#7B8BE5] text-xs font-sans font-bold tracking-widest uppercase text-white shadow-md hover:shadow-[0_0_20px_rgba(141,156,245,0.5)] transition-all duration-300 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t("login")}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
              className={cn(
                "lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0",
                iconBtnClass
              )}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Instant Search Overlay / Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 sm:pt-24 px-4">
          <div
            className="w-full max-w-2xl border rounded-3xl p-5 sm:p-6 shadow-2xl animate-fade-in-up"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--color-accent)" }}
          >
            <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <span className="text-xs font-sans font-bold tracking-widest uppercase" style={{ color: "var(--color-accent)" }}>
                {t("fast_catalog_search")}
              </span>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 transition-colors cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="mt-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--color-accent)" }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search laptops, RTX 4090, Intel i9, OLED monitors, RAM..."
                  className="w-full pl-12 pr-24 sm:pr-28 py-3.5 sm:py-4 rounded-2xl border text-xs sm:text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg-surface-2)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 px-4 rounded-xl text-xs"
                >
                  {t("search")}
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-sans" style={{ color: "var(--text-tertiary)" }}>{t("trending")}</span>
              {["RTX 4090", "ROG Strix", "MacBook Pro M3", "Alienware", "DDR5 RAM", "Samsung Odyssey"].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    router.push(`/${locale}/shop?search=${encodeURIComponent(term)}`);
                    setSearchOpen(false);
                  }}
                  className="text-[11px] sm:text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg-surface-3)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--color-accent)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-[64px] sm:top-[72px] bottom-0 p-5 sm:p-7 flex flex-col justify-between z-[100] overflow-y-auto"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderTop: "1px solid var(--border-color)",
            height: "calc(100dvh - 64px)",
          }}
        >
          <div className="flex flex-col gap-4 pt-1">
            {/* Dedicated Mobile Quick Controls: Language & Theme Bar */}
            <div
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: "var(--bg-surface-2)",
                borderColor: "var(--border-color)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wider pl-1" style={{ color: "var(--text-tertiary)" }}>
                  {locale === "ar" ? "اللغة" : "Language"}
                </span>
                <div className="flex items-center gap-1 rounded-xl border border-border-color bg-surface px-1 py-0.5">
                  {(["en", "ar"] as const).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => { switchLocale(loc); setMobileMenuOpen(false); }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer"
                      style={{
                        backgroundColor: locale === loc ? "#4063B2" : "transparent",
                        color: locale === loc ? "#ffffff" : "var(--text-secondary)",
                      }}
                    >
                      {loc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {locale === "ar" ? "المظهر" : "Theme"}
                </span>
                <ThemeToggle size="11px" />
              </div>
            </div>

            {/* Quick search button on mobile */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              className="flex items-center gap-3 w-full py-3 px-4 rounded-xl border text-xs font-sans"
              style={{
                backgroundColor: "var(--bg-surface-2)",
                borderColor: "var(--border-color)",
                color: "var(--text-secondary)",
              }}
            >
              <Search className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              <span>{t("search_catalog")}</span>
            </button>

            {navLinks.map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base sm:text-lg font-sans font-bold tracking-widest uppercase transition-colors py-2.5"
                style={{
                  borderBottom: "1px solid var(--border-color)",
                  color: pathname === item.href ? "var(--color-accent)" : "var(--text-secondary)",
                }}
              >
                <span className="text-xs font-mono mr-3" style={{ color: "var(--text-tertiary)" }}>0{idx + 1}</span>
                {item.label}
              </Link>
            ))}

            {/* Wishlist Mobile Link */}
            <Link
              href={`/${locale}/wishlist`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between text-base sm:text-lg font-sans font-bold tracking-widest uppercase transition-colors py-2.5"
              style={{
                borderBottom: "1px solid var(--border-color)",
                color: pathname === `/${locale}/wishlist` ? "#f87171" : "var(--text-secondary)",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>06</span>
                <span className="inline-flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>{t("wishlist").toUpperCase()}</span>
                </span>
              </div>
              {totalWishlistItems > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-mono font-bold">
                  {totalWishlistItems}
                </span>
              )}
            </Link>

            {/* Account Mobile Link */}
            {isLoggedIn ? (
              <>
                <Link
                  href={`/${locale}/account`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-base sm:text-lg font-sans font-bold tracking-widest uppercase transition-colors py-2.5"
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    color: pathname.startsWith(`/${locale}/account`) ? "var(--color-accent)" : "var(--text-secondary)",
                  }}
                >
                  <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>07</span>
                  <User className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                  <span>{t("my_account").toUpperCase()}</span>
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 text-base sm:text-lg font-sans font-bold tracking-widest uppercase transition-colors py-2.5 text-red-400/70 hover:text-red-400 w-full"
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                >
                  <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>08</span>
                  <LogOut className="w-4 h-4" />
                  <span>{t("sign_out").toUpperCase()}</span>
                </button>
              </>
            ) : (
              <Link
                href={`/${locale}/auth/login`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-base sm:text-lg font-sans font-bold tracking-widest uppercase transition-colors py-2.5"
                style={{
                  borderBottom: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                }}
              >
                <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>07</span>
                <User className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                <span>{t("login").toUpperCase()}</span>
              </Link>
            )}

          </div>

          <div className="pt-6" style={{ borderTop: "1px solid var(--border-color)" }}>
            <Link
              href={`/${locale}/contact`}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3.5 text-center btn-primary text-xs font-sans font-bold tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg"
            >
              {t("get_in_touch").toUpperCase()} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
