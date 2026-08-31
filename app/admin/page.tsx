"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, Settings,
  ChevronRight, TrendingUp, DollarSign, Eye, Star, Bell, Search,
  BarChart3, Cpu, AlertTriangle,
} from "lucide-react";
import { products } from "@/lib/data/products";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

const stats = [
  { label: "Total Revenue", value: "QAR 187,420", change: "+18.2%", icon: DollarSign, color: "primary", up: true },
  { label: "Total Orders", value: "1,247", change: "+8.4%", icon: ShoppingCart, color: "success", up: true },
  { label: "Total Products", value: "5,243", change: "+2.1%", icon: Package, color: "accent", up: true },
  { label: "Total Customers", value: "4,831", change: "+15.7%", icon: Users, color: "primary", up: true },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin", active: true },
  { icon: Package, label: "Products", href: "/admin/products", active: false },
  { icon: ShoppingCart, label: "Orders", href: "/admin/orders", active: false },
  { icon: Users, label: "Customers", href: "/admin/customers", active: false },
  { icon: Tag, label: "Categories", href: "/admin/categories", active: false },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics", active: false },
  { icon: Settings, label: "Settings", href: "/admin/settings", active: false },
];

// Simulate recent orders
const recentOrders = [
  { id: "#MTQ-14782", customer: "Ahmed Al-Rashid", total: "QAR 7,450", status: "delivered", date: "Today" },
  { id: "#MTQ-14781", customer: "Sara Mohammed", total: "QAR 1,299", status: "processing", date: "Today" },
  { id: "#MTQ-14780", customer: "Khalid Al-Thani", total: "QAR 379", status: "shipped", date: "Yesterday" },
  { id: "#MTQ-14779", customer: "Fatima Hassan", total: "QAR 9,299", status: "processing", date: "Yesterday" },
  { id: "#MTQ-14778", customer: "Omar Al-Kuwari", total: "QAR 2,199", status: "delivered", date: "Aug 21" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  delivered: { label: "Delivered", className: "badge bg-success/20 text-success border-success/30" },
  processing: { label: "Processing", className: "badge bg-accent-500/20 text-accent-400 border-accent-500/30" },
  shipped: { label: "Shipped", className: "badge bg-primary-500/20 text-primary-400 border-primary-500/30" },
  cancelled: { label: "Cancelled", className: "badge bg-error/20 text-error border-error/30" },
};

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const lowStockProducts = products.filter((p) => p.stockCount && p.stockCount < 10);

  return (
    <div className="min-h-screen bg-dark-300 flex" dir="ltr">
      {/* Sidebar */}
      <aside
        className={cn(
          "h-screen sticky top-0 bg-surface border-r border-surface-2 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-surface-2 flex items-center justify-between">
          <Link href="/en" className="flex items-center gap-2">
            {sidebarOpen ? (
              <Logo variant="dark" size="sm" subtext="ADMIN" />
            ) : (
              <Logo variant="dark" iconOnly size="sm" />
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                item.active
                  ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
                  : "text-muted hover:text-white hover:bg-surface-2"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", item.active ? "text-primary-400" : "text-muted group-hover:text-white")} />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-surface-2 flex items-center justify-center text-muted hover:text-white transition-colors"
        >
          <ChevronRight className={cn("w-5 h-5 transition-transform", sidebarOpen && "rotate-180")} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-surface-2 px-6 py-4 flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" placeholder="Search orders, products..." className="input pl-10 py-2 text-sm w-64" />
          </div>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl bg-surface-2 border border-surface-3 flex items-center justify-center text-muted hover:text-white relative transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-surface-3">
              <div className="w-8 h-8 rounded-full bg-primary-gradient flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <span className="text-white text-sm font-medium">Admin</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Stats */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <span className="text-muted text-sm">Last 30 days</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="bg-surface rounded-2xl border border-surface-3 p-5 hover:border-primary-500/30 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${stat.color}-500/10 border border-${stat.color}-500/20`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                    </div>
                    <span className={cn("text-xs font-bold px-2 py-1 rounded-lg", stat.up ? "text-success bg-success/10" : "text-error bg-error/10")}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-white mb-1">{stat.value}</p>
                  <p className="text-muted text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <div className="xl:col-span-2 bg-surface rounded-2xl border border-surface-3 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold text-lg">Recent Orders</h2>
                <Link href="/admin/orders" className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl hover:bg-surface-3 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-primary-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{order.id}</p>
                        <p className="text-muted text-xs">{order.customer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-bold">{order.total}</p>
                      <p className="text-muted text-xs">{order.date}</p>
                    </div>
                    <span className={statusConfig[order.status]?.className}>
                      {statusConfig[order.status]?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="bg-surface rounded-2xl border border-surface-3 p-6">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-5 h-5 text-accent-400" />
                <h2 className="text-white font-bold text-lg">Low Stock</h2>
                <span className="badge-accent text-xs">{lowStockProducts.length}</span>
              </div>
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2 transition-colors">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-dark-200 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-error text-xs font-bold">{product.stockCount} left</span>
                        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                          <div className="h-full bg-error rounded-full" style={{ width: `${Math.min((product.stockCount! / 30) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/admin/products" className="btn-secondary w-full justify-center mt-4 text-sm py-2.5">
                Manage Inventory
              </Link>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-surface rounded-2xl border border-surface-3 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Products Overview</h2>
              <Link href="/admin/products" className="btn-primary py-2 px-4 text-sm">
                <Package className="w-4 h-4" />
                Manage Products
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3">
                    {["Product", "Brand", "Price", "Stock", "Sales", "Rating", "Status"].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 6).map((product) => (
                    <tr key={product.id} className="border-b border-surface-2 hover:bg-surface-2/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          <span className="text-white text-sm font-medium line-clamp-1 max-w-[160px]">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-muted text-sm">{product.brand}</td>
                      <td className="py-4 px-4 text-white text-sm font-semibold">QAR {product.price.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={cn("text-sm font-semibold", (product.stockCount || 0) < 10 ? "text-error" : "text-success")}>
                          {product.stockCount || "N/A"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-muted text-sm">{product.reviewCount}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-accent-400 fill-accent-400" />
                          <span className="text-white text-sm">{product.rating}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={product.inStock ? "badge bg-success/20 text-success border-success/30" : "badge-error"}>
                          {product.inStock ? "Active" : "OOS"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
