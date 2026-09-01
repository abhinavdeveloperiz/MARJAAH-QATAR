"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  User,
  MapPin,
  Package,
  Shield,
  Heart,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const sidebarLinks = [
  { href: "/en/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/en/account/profile", label: "My Profile", icon: User },
  { href: "/en/account/addresses", label: "Saved Addresses", icon: MapPin },
  { href: "/en/account/orders", label: "Order History", icon: Package },
  { href: "/en/wishlist", label: "My Wishlist", icon: Heart },
  { href: "/en/account/security", label: "Security", icon: Shield },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/en/auth/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn || !user) return null;

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    router.push("/en");
  };

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen pt-28 pb-16 px-4" style={{ backgroundColor: "var(--bg-base)" }}>
      <div className="container-custom max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            {/* User Card */}
            <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4063B2] to-[#8D9CF5] flex items-center justify-center text-white font-tall text-xl flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-sans font-bold truncate" style={{ color: "var(--text-primary)" }}>{user.name}</p>
                  <p className="text-xs font-sans truncate" style={{ color: "var(--text-tertiary)" }}>{user.email}</p>
                </div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-color)" }}>
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const isActive = link.exact
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center justify-between px-5 py-3.5 last:border-0 transition-all group",
                      isActive
                        ? "text-[#8D9CF5]"
                        : "hover:bg-white/5"
                    )}
                    style={{
                      borderBottom: "1px solid var(--border-color)",
                      backgroundColor: isActive ? "rgba(141,156,245,0.08)" : undefined,
                      color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-sans font-semibold uppercase tracking-wider">
                        {link.label}
                      </span>
                    </div>
                    <ChevronRight
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                      )}
                    />
                  </Link>
                );
              })}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-sans font-semibold uppercase tracking-wider">
                  Sign Out
                </span>
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
