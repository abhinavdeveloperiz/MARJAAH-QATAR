"use client";

import Link from "next/link";
import { Package, ArrowUpRight, Search } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useState } from "react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  processing: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  confirmed: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  shipped: "text-[#8D9CF5] bg-[#8D9CF5]/10 border-[#8D9CF5]/30",
  delivered: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/30",
};

export default function OrdersPage() {
  const orderHistory = useAuthStore((s) => s.orderHistory);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = orderHistory.filter((o) => {
    const matchSearch =
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <Package className="w-4 h-4 text-[#8D9CF5]" />
          <h1 className="text-xs font-sans font-bold uppercase tracking-wider text-[#8D9CF5]">Order History</h1>
        </div>
        <p className="text-xl font-tall uppercase text-white">
          {orderHistory.length} Order{orderHistory.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8D9CF5]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders or products..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0B1120] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors placeholder:text-white/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-2 rounded-xl text-[11px] font-sans font-bold uppercase tracking-wider border transition-all",
                statusFilter === s
                  ? "bg-[#8D9CF5] border-[#8D9CF5] text-[#070B14]"
                  : "border-white/10 text-white/50 hover:border-white/30 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-12 text-center">
          <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40 font-sans">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order.id}
              href={`/en/account/orders/${order.id}`}
              className="block bg-[#0B1120] border border-white/10 rounded-2xl p-5 hover:border-[#8D9CF5]/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-sans font-bold text-white group-hover:text-[#8D9CF5] transition-colors">
                      {order.id}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] px-2.5 py-0.5 rounded-full border font-sans font-semibold uppercase tracking-wider",
                        STATUS_COLORS[order.status]
                      )}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 font-sans mt-1">
                    {new Date(order.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span
                        key={item.productId}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-white/60 font-sans"
                      >
                        {item.name} ×{item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-sans font-bold text-white">
                      QAR {order.total.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-white/40 font-sans mt-0.5">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-[#8D9CF5] transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
