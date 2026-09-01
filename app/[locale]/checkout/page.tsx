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

  const stepIndex = steps.indexOf(step);

  const handlePlaceOrder = async () => {
    await new Promise((r) => setTimeout(r, 1500));
    clearCart();
    setIsPlaced(true);
  };

  if (isPlaced) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-success/20 border border-success/30 flex items-center justify-center animate-scale-in">
          <CheckCircle2 className="w-12 h-12 text-success" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-3">{isRTL ? "تم الطلب بنجاح!" : "Order Placed Successfully!"}</h1>
          <p className="text-muted text-lg max-w-md">
            {isRTL ? "شكراً لطلبك. سنتواصل معك قريباً لتأكيد الطلب." : "Thank you! We'll send you a confirmation shortly."}
          </p>
          <p className="text-primary-400 font-bold mt-2">{isRTL ? "رقم الطلب: #MTQ-" : "Order #MTQ-"}{Math.floor(Math.random() * 90000) + 10000}</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href={`/${locale}/account/orders`} className="btn-primary">{isRTL ? "تتبع طلبك" : "Track Order"}</Link>
          <Link href={`/${locale}/shop`} className="btn-secondary">{isRTL ? "مواصلة التسوق" : "Continue Shopping"}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-300 pt-24 md:pt-28">
      <div className="container-custom py-8 md:py-12">
        <h1 className="text-3xl font-bold text-white mb-8 font-display">{isRTL ? "إتمام الشراء" : "Checkout"}</h1>

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
                    isDone ? "bg-success border-success text-white"
                      : isCurrent ? "bg-primary-500 border-primary-500 text-white"
                        : "bg-surface-2 border-surface-3 text-muted"
                  )}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </button>
                {i < steps.length - 1 && (
                  <div className={cn("flex-1 h-0.5 mx-1 transition-all duration-300", isDone ? "bg-success" : "bg-surface-3")} />
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
              <div className="bg-surface rounded-2xl border border-surface-3 p-6 space-y-4">
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-400" />
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
                      <label className="text-muted text-sm font-medium mb-1.5 block">{field.label}</label>
                      <input
                        type={field.type}
                        value={addressForm[field.key as keyof typeof addressForm]}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="input"
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
              <div className="bg-surface rounded-2xl border border-surface-3 p-6 space-y-4">
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary-400" />
                  {isRTL ? "طريقة الدفع" : "Payment Method"}
                </h2>
                <div className="space-y-3">
                  {[
                    { value: "card", label: isRTL ? "بطاقة ائتمانية / مدى" : "Credit / Debit Card", desc: "Visa, Mastercard, NAPS", icon: CreditCard },
                    { value: "cod", label: isRTL ? "الدفع عند الاستلام" : "Cash on Delivery", desc: isRTL ? "ادفع عند وصول طلبك" : "Pay when your order arrives", icon: Truck },
                  ].map((method) => (
                    <label key={method.value} className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                      paymentMethod === method.value ? "border-primary-500 bg-primary-500/5" : "border-surface-3 hover:border-primary-500/30"
                    )}>
                      <input type="radio" name="payment" value={method.value} checked={paymentMethod === method.value as "cod" | "card"}
                        onChange={() => setPaymentMethod(method.value as "cod" | "card")} className="sr-only" />
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", paymentMethod === method.value ? "bg-primary-500/20" : "bg-surface-2")}>
                        <method.icon className={cn("w-6 h-6", paymentMethod === method.value ? "text-primary-400" : "text-muted")} />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{method.label}</p>
                        <p className="text-muted text-sm">{method.desc}</p>
                      </div>
                      <div className={cn("ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === method.value ? "border-primary-500 bg-primary-500" : "border-surface-3")}>
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
              <div className="bg-surface rounded-2xl border border-surface-3 p-6 space-y-4">
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary-400" />
                  {isRTL ? "مراجعة الطلب" : "Review Order"}
                </h2>
                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-muted text-xs">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-white font-semibold text-sm">QAR {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                {/* Address summary */}
                <div className="bg-surface-2 rounded-xl p-4">
                  <p className="text-muted text-xs mb-2 font-semibold uppercase tracking-wider">Delivery to:</p>
                  <p className="text-white text-sm">{addressForm.fullName} · {addressForm.phone}</p>
                  <p className="text-muted text-sm">{addressForm.area}, {addressForm.street}, Bldg {addressForm.building}, {addressForm.city}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("payment")} className="btn-secondary">{isRTL ? "رجوع" : "Back"}</button>
                  <button onClick={handlePlaceOrder} className="btn-primary flex-1 justify-center shadow-glow-primary">
                    <Shield className="w-4 h-4" />
                    {isRTL ? "تأكيد الطلب" : "Place Order Securely"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div>
            <div className="bg-surface rounded-2xl border border-surface-3 p-6 sticky top-24">
              <h3 className="text-white font-bold mb-4">{isRTL ? "ملخص الطلب" : "Order Summary"}</h3>
              <div className="space-y-2 mb-4">
                {items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted truncate max-w-[140px]">{item.name} ×{item.quantity}</span>
                    <span className="text-white font-medium">QAR {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                {items.length > 3 && <p className="text-muted text-xs">+{items.length - 3} more items</p>}
              </div>
              <div className="divider mb-4" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="text-white">QAR {total.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted">Shipping</span><span className={total >= 500 ? "text-success" : "text-white"}>{total >= 500 ? "Free" : "QAR 20"}</span></div>
                <div className="divider" />
                <div className="flex justify-between font-bold text-lg"><span className="text-white">Total</span><span className="text-primary-400">QAR {(total + (total >= 500 ? 0 : 20)).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
