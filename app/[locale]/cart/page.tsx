"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/lib/store/cart";
import Link from "next/link";
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const total = getTotalPrice();
  const shipping = total >= 500 ? 0 : 20;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-24 h-24 rounded-3xl bg-surface-2 flex items-center justify-center border border-border-color">
          <ShoppingBag className="w-12 h-12 text-[#4063B2]" />
        </div>
        <h1 className="text-3xl font-bold font-display" style={{ color: "var(--text-primary)" }}>{isRTL ? "السلة فارغة" : "Your Cart is Empty"}</h1>
        <p className="text-lg text-center max-w-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {isRTL ? "أضف بعض المنتجات الرائعة!" : "Add some amazing products to get started!"}
        </p>
        <Link href={`/${locale}/shop`} className="btn-primary">
          <ShoppingBag className="w-5 h-5" />
          {isRTL ? "تسوق الآن" : "Start Shopping"}
          <ArrowRight className={cn("w-4 h-4", isRTL && "rotate-180")} />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base pt-24 md:pt-28">
      <div className="container-custom py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-display" style={{ color: "var(--text-primary)" }}>
            {isRTL ? "سلة التسوق" : "Shopping Cart"}
            <span className="text-slate-500 text-lg font-normal ml-3">({items.length} items)</span>
          </h1>
          <button onClick={clearCart} className="text-slate-500 hover:text-error text-sm font-medium flex items-center gap-1.5 transition-colors">
            <Trash2 className="w-4 h-4" />
            {isRTL ? "مسح الكل" : "Clear All"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-surface rounded-2xl border border-border-color p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 group shadow-sm">
                {/* Image */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-surface-2 flex-shrink-0 border border-border-color">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/${locale}/product/${item.slug}`} className="font-semibold text-sm sm:text-base line-clamp-2 hover:text-[#4063B2] transition-colors mb-1 block" style={{ color: "var(--text-primary)" }}>
                    {isRTL ? item.nameAr : item.name}
                  </Link>
                  <p className="text-sm mb-3 font-medium" style={{ color: "var(--text-secondary)" }}>{item.brand}</p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center bg-surface-2 rounded-xl p-1 border border-border-color">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-lg hover:bg-surface-3 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold w-8 text-center" style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-lg hover:bg-surface-3 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg font-display" style={{ color: "var(--text-primary)" }}>QAR {(item.price * item.quantity).toLocaleString()}</span>
                      <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-xl hover:bg-error/10 flex items-center justify-center text-slate-500 hover:text-error transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-surface rounded-2xl border border-border-color p-6 sticky top-24 shadow-sm">
              <h2 className="font-bold text-xl mb-6 font-display" style={{ color: "var(--text-primary)" }}>{isRTL ? "ملخص الطلب" : "Order Summary"}</h2>

              {/* Coupon */}
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder={isRTL ? "كود الخصم" : "Coupon code"} className="input pl-10 py-2.5 text-sm bg-surface-2 border-border-color" />
                </div>
                <button className="btn-secondary py-2.5 px-4 text-sm">{isRTL ? "تطبيق" : "Apply"}</button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{isRTL ? "المجموع الجزئي" : "Subtotal"}</span>
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>QAR {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{isRTL ? "الشحن" : "Shipping"}</span>
                  <span className={shipping === 0 ? "text-emerald-600 font-medium" : "font-medium"} style={{ color: shipping === 0 ? undefined : "var(--text-primary)" }}>
                    {shipping === 0 ? (isRTL ? "مجاناً 🎉" : "Free 🎉") : `QAR ${shipping}`}
                  </span>
                </div>
                <div className="divider" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{isRTL ? "الإجمالي" : "Total"}</span>
                  <span className="text-[#4063B2] font-black text-2xl font-display">QAR {(total + shipping).toLocaleString()}</span>
                </div>
              </div>

              {total < 500 && (
                <div className="bg-[#4063B2]/10 border border-[#4063B2]/20 rounded-xl p-3 text-center mb-4">
                  <p className="text-[#4063B2] text-xs font-semibold">
                    {isRTL
                      ? `أضف QAR ${(500 - total).toFixed(0)} للتوصيل المجاني!`
                      : `Add QAR ${(500 - total).toFixed(0)} for FREE delivery!`}
                  </p>
                </div>
              )}

              <Link href={`/${locale}/checkout`} className="btn-primary w-full justify-center py-4 text-base shadow-md">
                {isRTL ? "إتمام الشراء" : "Proceed to Checkout"}
                <ArrowRight className={cn("w-5 h-5", isRTL && "rotate-180")} />
              </Link>
              <Link href={`/${locale}/shop`} className="btn-ghost w-full justify-center mt-3 text-sm text-slate-500 hover:text-slate-900">
                {isRTL ? "مواصلة التسوق" : "Continue Shopping"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
