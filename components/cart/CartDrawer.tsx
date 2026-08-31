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
        className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-[420px] bg-surface flex flex-col shadow-2xl translate-x-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-2">
          <div className="flex items-center gap-3">
            <Logo variant="dark" size="xs" />
            <span className="text-muted text-xs">|</span>
            <span className="text-white font-bold text-sm">Cart ({items.length})</span>
          </div>
          <button onClick={closeCart} aria-label="Close cart" className="btn-icon text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4 px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-muted" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Your cart is empty</p>
                <p className="text-muted text-sm">Add some products to get started</p>
              </div>
              <button
                onClick={closeCart}
                className="btn-primary mt-2"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-surface-2 rounded-2xl border border-surface-3 group"
                >
                  {/* Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-dark-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium leading-tight mb-1 line-clamp-2">
                      {item.name}
                    </h4>
                    <p className="text-primary-400 text-sm font-bold mb-3">
                      QAR {(item.price * item.quantity).toLocaleString()}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-dark-200 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted hover:text-white transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-white text-sm font-medium w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted hover:text-white transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-xl hover:bg-error/10 flex items-center justify-center text-muted hover:text-error transition-all"
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
          <div className="p-5 border-t border-surface-2 space-y-4">
            {/* Free shipping threshold */}
            {total < 500 && (
              <div className="bg-surface-2 rounded-xl p-3 text-center">
                <p className="text-muted text-xs">
                  Add{" "}
                  <span className="text-accent-400 font-bold">
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
                <span className="text-muted">Subtotal</span>
                <span className="text-white font-medium">QAR {total.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Shipping</span>
                <span className={total >= 500 ? "text-success text-sm" : "text-white text-sm font-medium"}>
                  {total >= 500 ? "Free 🎉" : "QAR 20"}
                </span>
              </div>
              <div className="divider" />
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-primary-400 text-xl font-bold">
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
            <button onClick={closeCart} className="btn-ghost w-full justify-center text-sm text-muted">
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
