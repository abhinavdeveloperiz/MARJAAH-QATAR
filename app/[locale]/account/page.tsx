"use client";

import Link from "next/link";
import { Package, MapPin, Heart, User, ArrowUpRight, Clock } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useWishlistStore } from "@/lib/store/wishlist";

const STATUS_COLORS: Record<string, string> = {
  processing: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  confirmed: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  shipped: "text-[#8D9CF5] bg-[#8D9CF5]/10 border-[#8D9CF5]/30",
  delivered: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/30",
};

export default function AccountDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const orderHistory = useAuthStore((s) => s.orderHistory);
  const savedAddresses = useAuthStore((s) => s.savedAddresses);
  const wishlistItems = useWishlistStore((s) => s.items);

  if (!user) return null;

  const recentOrders = orderHistory.slice(0, 3);

  const stats = [
    { label: "Total Orders", value: orderHistory.length, icon: Package, color: "text-[#8D9CF5]", bg: "bg-[#8D9CF5]/10", link: "/en/account/orders" },
    { label: "Saved Addresses", value: savedAddresses.length, icon: MapPin, color: "text-emerald-400", bg: "bg-emerald-400/10", link: "/en/account/addresses" },
    { label: "Wishlist Items", value: wishlistItems.length, icon: Heart, color: "text-rose-400", bg: "bg-rose-400/10", link: "/en/wishlist" },
    { label: "Account Status", value: "Active", icon: User, color: "text-amber-400", bg: "bg-amber-400/10", link: "/en/account/profile" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(to right, var(--bg-surface), var(--bg-surface-2), var(--bg-surface))", border: "1px solid var(--border-color)" }}>
        <p className="text-xs font-sans font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-accent)" }}>
          Welcome back
        </p>
        <h1 className="text-2xl font-tall uppercase" style={{ color: "var(--text-primary)" }}>{user.name}</h1>
        <p className="text-xs text-white/40 font-sans mt-1">
          Member since{" "}
          {new Date(user.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.link}
              className="bg-[#0B1120] border border-white/10 rounded-2xl p-5 hover:border-[#8D9CF5]/30 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-xl font-tall text-white">{stat.value}</p>
              <p className="text-[11px] text-white/40 font-sans uppercase tracking-wider mt-0.5">
                {stat.label}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8D9CF5]" />
            <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-white">Recent Orders</h2>
          </div>
          <Link
            href="/en/account/orders"
            className="text-[11px] text-[#8D9CF5] hover:text-white font-sans font-semibold flex items-center gap-1 transition-colors"
          >
            View All <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40 font-sans">No orders yet</p>
            <Link
              href="/en/shop"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-[#8D9CF5]/10 border border-[#8D9CF5]/30 text-[#8D9CF5] text-xs font-sans font-semibold hover:bg-[#8D9CF5]/20 transition-all"
            >
              Shop Now <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/en/account/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-all group"
              >
                <div>
                  <p className="text-sm font-sans font-semibold text-white group-hover:text-[#8D9CF5] transition-colors">
                    {order.id}
                  </p>
                  <p className="text-xs text-white/40 font-sans mt-0.5">
                    {new Date(order.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-sans font-semibold uppercase tracking-wider ${STATUS_COLORS[order.status] ?? ""}`}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm font-sans font-bold text-white">
                    QAR {order.total.toLocaleString()}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-[#8D9CF5] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
