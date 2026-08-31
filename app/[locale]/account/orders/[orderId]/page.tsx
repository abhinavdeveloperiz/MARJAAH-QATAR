"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, MapPin, CreditCard, Truck, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  processing: { color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", icon: Clock, label: "Processing" },
  confirmed: { color: "text-blue-400 border-blue-400/30 bg-blue-400/10", icon: AlertCircle, label: "Confirmed" },
  shipped: { color: "text-[#8D9CF5] border-[#8D9CF5]/30 bg-[#8D9CF5]/10", icon: Truck, label: "Shipped" },
  delivered: { color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10", icon: CheckCircle2, label: "Delivered" },
  cancelled: { color: "text-red-400 border-red-400/30 bg-red-400/10", icon: XCircle, label: "Cancelled" },
};

const TIMELINE_STEPS = ["processing", "confirmed", "shipped", "delivered"];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { orderId } = use(params);
  const orderHistory = useAuthStore((s) => s.orderHistory);
  const order = orderHistory.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-12 text-center">
        <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <p className="text-sm text-white/40 font-sans">Order not found</p>
        <Link
          href="/en/account/orders"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-[#8D9CF5]/10 border border-[#8D9CF5]/30 text-[#8D9CF5] text-xs font-sans font-semibold hover:bg-[#8D9CF5]/20 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
        </Link>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.processing;
  const StatusIcon = statusConf.icon;
  const currentStep = TIMELINE_STEPS.indexOf(order.status);

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/en/account/orders"
        className="inline-flex items-center gap-2 text-[#8D9CF5] text-xs font-sans font-bold uppercase tracking-widest hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Orders
      </Link>

      {/* Header */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xl font-tall uppercase text-white">{order.id}</p>
            <p className="text-xs text-white/40 font-sans mt-1">
              Placed on{" "}
              {new Date(order.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-sans font-bold uppercase tracking-wider",
              statusConf.color
            )}
          >
            <StatusIcon className="w-4 h-4" />
            {statusConf.label}
          </div>
        </div>

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 w-fit">
            <Truck className="w-3.5 h-3.5 text-[#8D9CF5]" />
            <span className="text-xs text-white/60 font-sans">Tracking:</span>
            <span className="text-xs text-white font-sans font-semibold">{order.trackingNumber}</span>
          </div>
        )}
      </div>

      {/* Status Timeline */}
      {order.status !== "cancelled" && (
        <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
          <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-white/60 mb-6">Order Progress</h2>
          <div className="flex items-center gap-0">
            {TIMELINE_STEPS.map((step, idx) => {
              const done = idx <= currentStep;
              const conf = STATUS_CONFIG[step];
              const Icon = conf.icon;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all",
                        done
                          ? "border-[#8D9CF5] bg-[#8D9CF5]/20"
                          : "border-white/10 bg-white/5"
                      )}
                    >
                      <Icon
                        className={cn("w-4 h-4", done ? "text-[#8D9CF5]" : "text-white/20")}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-sans font-semibold uppercase tracking-wider whitespace-nowrap",
                        done ? "text-[#8D9CF5]" : "text-white/20"
                      )}
                    >
                      {conf.label}
                    </span>
                  </div>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all",
                        idx < currentStep ? "bg-[#8D9CF5]" : "bg-white/10"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Items */}
        <div className="sm:col-span-2 bg-[#0B1120] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-white/60">Items Ordered</h2>
          </div>
          <div className="divide-y divide-white/5">
            {order.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 px-6 py-4">
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-sans font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-white/40 font-sans mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-sans font-bold text-white flex-shrink-0">
                  QAR {(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="px-6 py-4 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-xs text-white/50 font-sans">
              <span>Subtotal</span>
              <span>QAR {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-white/50 font-sans">
              <span>Shipping</span>
              <span className="text-emerald-400">{order.shipping === 0 ? "Free" : `QAR ${order.shipping}`}</span>
            </div>
            <div className="flex justify-between text-sm font-sans font-bold text-white pt-2 border-t border-white/10">
              <span>Total</span>
              <span>QAR {order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-[#8D9CF5]" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-white/60">Delivery Address</h3>
          </div>
          <p className="text-sm font-sans font-semibold text-white">{order.address.fullName}</p>
          <p className="text-xs text-white/50 font-sans mt-1.5 leading-relaxed">
            {order.address.building}
            {order.address.street && `, ${order.address.street}`}
            <br />
            {order.address.zone && `${order.address.zone}, `}
            {order.address.city}, {order.address.country}
          </p>
          <p className="text-xs text-white/40 font-sans mt-1">{order.address.phone}</p>
        </div>

        {/* Payment */}
        <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-[#8D9CF5]" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-white/60">Payment Method</h3>
          </div>
          <p className="text-sm font-sans font-semibold text-white">{order.paymentMethod}</p>
          <p className="text-xs text-white/40 font-sans mt-1.5">
            Payment processed at time of order
          </p>
        </div>
      </div>
    </div>
  );
}
