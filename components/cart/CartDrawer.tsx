"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const total = getTotalPrice();

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
    } else {
      document.body.style.overflow = "";
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.25 });
      gsap.to(drawerRef.current, { x: "100%", duration: 0.35, ease: "power3.in" });
    }
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={closeCart}
        className={cn(
          "fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm opacity-0",
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-[420px] flex flex-col shadow-2xl translate-x-full"
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid var(--bg-surface-2)" }}
        >
          <div className="flex items-center gap-3">
            <Logo variant="auto" size="xs" />
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              Cart ({items.length})
            </span>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="btn-icon"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4 px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "var(--bg-surface-2)" }}
              >
                <ShoppingBag className="w-10 h-10" style={{ color: "var(--text-secondary)" }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Your cart is empty</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Add some products to get started</p>
              </div>
              <button onClick={closeCart} className="btn-primary mt-2">
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 rounded-2xl group"
                  style={{
                    backgroundColor: "var(--bg-surface-2)",
                    border: "1px solid var(--bg-surface-3)",
                  }}
                >
                  {/* Image */}
                  <div
                    className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: "var(--bg-surface-3)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium leading-tight mb-1 line-clamp-2" style={{ color: "var(--text-primary)" }}>
                      {item.name}
                    </h4>
                    <p className="text-sm font-bold mb-3" style={{ color: "var(--color-accent)" }}>
                      QAR {(item.price * item.quantity).toLocaleString()}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-2 rounded-xl p-1"
                        style={{ backgroundColor: "var(--bg-surface-3)" }}
                      >
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-3)";
                            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)";
                            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                          }}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center" style={{ color: "var(--text-primary)" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                          style={{ backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-3)";
                            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)";
                            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-xl hover:bg-red-500/10 flex items-center justify-center transition-all"
                        style={{ color: "var(--text-secondary)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 space-y-4" style={{ borderTop: "1px solid var(--bg-surface-2)" }}>
            {/* Free shipping threshold */}
            {total < 500 && (
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--bg-surface-2)" }}>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Add{" "}
                  <span className="font-bold" style={{ color: "var(--color-accent)" }}>
                    QAR {(500 - total).toFixed(0)}
                  </span>{" "}
                  more for free delivery! 🚚
                </p>
                <div className="progress-bar mt-2">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min((total / 500) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>QAR {total.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Shipping</span>
                <span className={total >= 500 ? "text-emerald-500 text-sm" : "text-sm font-medium"} style={total < 500 ? { color: "var(--text-primary)" } : {}}>
                  {total >= 500 ? "Free 🎉" : "QAR 20"}
                </span>
              </div>
              <div className="divider" />
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
                <span className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>
                  QAR {(total + (total >= 500 ? 0 : 20)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/en/checkout"
              onClick={closeCart}
              className="btn-primary w-full justify-center"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={closeCart}
              className="btn-ghost w-full justify-center text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
