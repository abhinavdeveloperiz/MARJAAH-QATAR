"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";
import { CheckCircle2, MapPin, CreditCard, ClipboardList, ChevronRight, Shield, Truck } from "lucide-react";
import Link from "next/link";

const steps = ["address", "payment", "review"] as const;

export default function CheckoutPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const [step, setStep] = useState<typeof steps[number]>("address");
  const [isPlaced, setIsPlaced] = useState(false);
  const { items, getTotalPrice, clearCart } = useCartStore();
  const total = getTotalPrice();

  const [addressForm, setAddressForm] = useState({
    fullName: "", phone: "", email: "", area: "", street: "", building: "", floor: "", city: "Doha",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("card");

  const [orderId] = useState(() => Math.floor(10000 + Math.random() * 90000));

  const stepIndex = steps.indexOf(step);

  const handlePlaceOrder = async () => {
    await new Promise((r) => setTimeout(r, 1500));
    clearCart();
    setIsPlaced(true);
  };

  if (isPlaced) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-24 text-center" style={{ backgroundColor: "var(--bg-base)" }}>
        <div
          className="max-w-lg w-full rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col items-center gap-6 animate-scale-in"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1
              className="text-2xl sm:text-4xl font-black font-display tracking-tight uppercase mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              {isRTL ? "تم الطلب بنجاح!" : "ORDER PLACED SUCCESSFULLY!"}
            </h1>
            <p
              className="text-base sm:text-lg font-medium leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {isRTL ? "شكراً لطلبك. سنتواصل معك قريباً لتأكيد الطلب." : "Thank you! We'll send you a confirmation shortly."}
            </p>
            <div
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: "var(--bg-surface-2)",
                borderColor: "var(--border-color)",
              }}
            >
              <span
                className="text-xs font-bold tracking-wider uppercase font-display"
                style={{ color: "var(--text-secondary)" }}
              >
                {isRTL ? "رقم الطلب:" : "Order"}
              </span>
              <span className="font-mono font-bold text-sm sm:text-base text-[#4063B2]">
                #MTQ-{orderId}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-2">
            <Link
              href={`/${locale}/account/orders`}
              className="btn-primary justify-center flex-1 py-3.5 text-sm font-bold font-display shadow-md"
            >
              {isRTL ? "تتبع طلبك" : "TRACK ORDER"}
            </Link>
            <Link
              href={`/${locale}/shop`}
              className="btn-secondary justify-center flex-1 py-3.5 text-sm font-bold font-display shadow-sm"
            >
              {isRTL ? "مواصلة التسوق" : "CONTINUE SHOPPING"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base pt-24 md:pt-28">
      <div className="container-custom py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-8 font-display" style={{ color: "var(--text-primary)" }}>{isRTL ? "إتمام الشراء" : "Checkout"}</h1>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-10 max-w-md">
          {steps.map((s, i) => {
            const icons = [MapPin, CreditCard, ClipboardList];
            const Icon = icons[i];
            const isDone = stepIndex > i;
            const isCurrent = stepIndex === i;
            return (
              <div key={s} className="flex items-center flex-1">
                <button
                  onClick={() => stepIndex > i && setStep(s)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300",
                    isDone ? "bg-emerald-600 border-emerald-600 text-white"
                      : isCurrent ? "bg-[#4063B2] border-[#4063B2] text-white"
                        : "bg-surface-2 border-border-color text-slate-500"
                  )}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </button>
                {i < steps.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mx-1 transition-all duration-300", isDone ? "bg-emerald-600" : "bg-slate-200")} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            {/* Step 1: Address */}
            {step === "address" && (
              <div className="bg-surface rounded-2xl border border-border-color p-6 space-y-4 shadow-sm">
                <h2 className="font-bold text-xl flex items-center gap-2 font-display" style={{ color: "var(--text-primary)" }}>
                  <MapPin className="w-5 h-5 text-[#4063B2]" />
                  {isRTL ? "عنوان التوصيل" : "Delivery Address"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: "fullName", label: isRTL ? "الاسم الكامل" : "Full Name", type: "text" },
                    { key: "phone", label: isRTL ? "رقم الهاتف" : "Phone", type: "tel" },
                    { key: "email", label: isRTL ? "البريد الإلكتروني" : "Email", type: "email", full: true },
                    { key: "area", label: isRTL ? "المنطقة / الزون" : "Area / Zone", type: "text" },
                    { key: "street", label: isRTL ? "اسم الشارع" : "Street Name", type: "text" },
                    { key: "building", label: isRTL ? "رقم المبنى" : "Building No.", type: "text" },
                    { key: "floor", label: isRTL ? "الطابق (اختياري)" : "Floor (optional)", type: "text" },
                    { key: "city", label: isRTL ? "المدينة" : "City", type: "text" },
                  ].map((field) => (
                    <div key={field.key} className={field.full ? "sm:col-span-2" : ""}>
                      <label className="text-slate-600 text-sm font-medium mb-1.5 block">{field.label}</label>
                      <input
                        type={field.type}
                        value={addressForm[field.key as keyof typeof addressForm]}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="input bg-surface-2 border-border-color"
                        required
                      />
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep("payment")} className="btn-primary mt-2">
                  {isRTL ? "التالي: طريقة الدفع" : "Next: Payment"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === "payment" && (
              <div className="bg-surface rounded-2xl border border-border-color p-6 space-y-4 shadow-sm">
                <h2 className="font-bold text-xl flex items-center gap-2 font-display" style={{ color: "var(--text-primary)" }}>
                  <CreditCard className="w-5 h-5 text-[#4063B2]" />
                  {isRTL ? "طريقة الدفع" : "Payment Method"}
                </h2>
                <div className="space-y-3">
                  {[
                    { value: "card", label: isRTL ? "بطاقة ائتمانية / مدى" : "Credit / Debit Card", desc: "Visa, Mastercard, NAPS", icon: CreditCard },
                    { value: "cod", label: isRTL ? "الدفع عند الاستلام" : "Cash on Delivery", desc: isRTL ? "ادفع عند وصول طلبك" : "Pay when your order arrives", icon: Truck },
                  ].map((method) => (
                    <label key={method.value} className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                      paymentMethod === method.value ? "border-[#4063B2] bg-[#4063B2]/5" : "border-border-color hover:border-[#4063B2]/30"
                    )}>
                      <input type="radio" name="payment" value={method.value} checked={paymentMethod === method.value as "cod" | "card"}
                        onChange={() => setPaymentMethod(method.value as "cod" | "card")} className="sr-only" />
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", paymentMethod === method.value ? "bg-[#4063B2]/15 text-[#4063B2]" : "bg-surface-2 text-slate-500")}>
                        <method.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{method.label}</p>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{method.desc}</p>
                      </div>
                      <div className={cn("ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === method.value ? "border-[#4063B2] bg-[#4063B2]" : "border-border-color")}>
                        {paymentMethod === method.value && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("address")} className="btn-secondary">{isRTL ? "رجوع" : "Back"}</button>
                  <button onClick={() => setStep("review")} className="btn-primary">
                    {isRTL ? "مراجعة الطلب" : "Review Order"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === "review" && (
              <div className="bg-surface rounded-2xl border border-border-color p-6 space-y-4 shadow-sm">
                <h2 className="font-bold text-xl flex items-center gap-2 font-display" style={{ color: "var(--text-primary)" }}>
                  <ClipboardList className="w-5 h-5 text-[#4063B2]" />
                  {isRTL ? "مراجعة الطلب" : "Review Order"}
                </h2>
                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border-color">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>QAR {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                {/* Address summary */}
                <div className="bg-surface-2 rounded-xl p-4 border border-border-color">
                  <p className="text-xs mb-2 font-semibold uppercase tracking-wider text-[#4063B2]">Delivery to:</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{addressForm.fullName} · {addressForm.phone}</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{addressForm.area}, {addressForm.street}, Bldg {addressForm.building}, {addressForm.city}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("payment")} className="btn-secondary">{isRTL ? "رجوع" : "Back"}</button>
                  <button onClick={handlePlaceOrder} className="btn-primary flex-1 justify-center shadow-md">
                    <Shield className="w-4 h-4" />
                    {isRTL ? "تأكيد الطلب" : "Place Order Securely"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div>
            <div className="bg-surface rounded-2xl border border-border-color p-6 sticky top-24 shadow-sm">
              <h3 className="font-bold mb-4 font-display" style={{ color: "var(--text-primary)" }}>{isRTL ? "ملخص الطلب" : "Order Summary"}</h3>
              <div className="space-y-2 mb-4">
                {items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="truncate max-w-[140px]" style={{ color: "var(--text-secondary)" }}>{item.name} ×{item.quantity}</span>
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>QAR {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                {items.length > 3 && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>+{items.length - 3} more items</p>}
              </div>
              <div className="divider mb-4" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Subtotal</span><span style={{ color: "var(--text-primary)" }}>QAR {total.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Shipping</span><span className={total >= 500 ? "text-emerald-600 font-medium" : "font-medium"} style={{ color: total >= 500 ? undefined : "var(--text-primary)" }}>{total >= 500 ? "Free" : "QAR 20"}</span></div>
                <div className="divider" />
                <div className="flex justify-between font-bold text-lg"><span style={{ color: "var(--text-primary)" }}>Total</span><span className="text-[#4063B2] font-display font-black">QAR {(total + (total >= 500 ? 0 : 20)).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
