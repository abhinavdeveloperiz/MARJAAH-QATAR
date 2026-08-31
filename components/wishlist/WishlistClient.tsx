"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Trash2, ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist";
import { useCartStore } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

interface WishlistClientProps {
  locale: string;
}

export function WishlistClient({ locale }: WishlistClientProps) {
  const [mounted, setMounted] = useState(false);
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);

  const addCartItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddToCart = (item: any) => {
    addCartItem({
      id: item.id,
      name: item.name,
      nameAr: item.nameAr || item.name,
      price: item.price,
      originalPrice: item.originalPrice,
      image: item.image,
      slug: item.slug,
      inStock: item.inStock ?? true,
      brand: item.brand || "M.SHOP",
      quantity: 1,
    });
    toast.success(`${item.name} added to cart!`);
    openCart();
  };

  const handleRemove = (id: string, name: string) => {
    removeItem(id);
    toast.success(`${name} removed from wishlist`);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#070B14] pt-[120px] pb-24">
        <div className="container-custom">
          <div className="h-64 rounded-3xl bg-[#0B1120] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] pt-[100px] pb-24">
      {/* Hero Header */}
      <section className="border-b border-white/10 bg-gradient-to-b from-[#10192D]/90 via-[#0B1120]/95 to-[#070B14] py-8 md:py-12">
        <div className="container-custom">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-sans font-bold uppercase tracking-widest">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>Saved Favorites ({items.length})</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white uppercase tracking-tight">
                MY WISHLIST
              </h1>
              <p className="text-[#94A3B8] text-xs sm:text-sm font-sans max-w-xl">
                Your personal curated list of high-performance rigs, laptops, and hardware in Qatar.
              </p>
            </div>

            {items.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear your wishlist?")) {
                    clearWishlist();
                    toast.success("Wishlist cleared");
                  }
                }}
                className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-xs font-sans font-semibold text-white/70 hover:text-rose-300 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container-custom pt-8 sm:pt-12">
        {items.length === 0 ? (
          /* Empty State */
          <div className="max-w-xl mx-auto text-center py-16 sm:py-24 px-6 rounded-3xl bg-[#0B1120] border border-white/10 shadow-2xl space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#10192D] border border-white/10 flex items-center justify-center text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
              <Heart className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-tight">
                YOUR WISHLIST IS EMPTY
              </h2>
              <p className="text-[#94A3B8] text-xs sm:text-sm font-sans leading-relaxed">
                Explore our catalog of ultra workstations, OLED gaming displays, GPUs, and peripherals to save your top picks.
              </p>
            </div>
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl btn-primary text-xs font-sans font-bold tracking-widest uppercase shadow-lg shadow-[#8D9CF5]/20 hover:scale-105 transition-transform"
            >
              <span>EXPLORE PRODUCTS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-[#0B1120] border border-white/10 hover:border-[#8D9CF5]/60 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-xl"
                >
                  {/* Top Bar inside Card */}
                  <div className="p-4 sm:p-5 flex flex-col gap-4">
                    {/* Image Area */}
                    <div className="relative w-full aspect-square rounded-2xl bg-[#10192D] overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />

                      {/* Delete from Wishlist button */}
                      <button
                        onClick={() => handleRemove(item.id, item.name)}
                        aria-label="Remove from wishlist"
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-rose-400 hover:border-rose-500/40 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Brand Pill */}
                      <span className="absolute bottom-3 left-3 text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[#8D9CF5]">
                        {item.brand}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <Link
                        href={`/${locale}/product/${item.slug}`}
                        className="font-sans font-bold text-sm sm:text-base text-white hover:text-[#8D9CF5] line-clamp-2 transition-colors"
                      >
                        {item.name}
                      </Link>

                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-lg sm:text-xl text-[#8D9CF5]">
                          {formatPrice(item.price, locale)}
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-xs text-white/40 line-through">
                            {formatPrice(item.originalPrice, locale)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 sm:p-5 pt-0 flex items-center gap-2 border-t border-white/5">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl btn-primary text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>ADD TO CART</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Qatar Trust Strip inside Wishlist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs font-sans text-white/70">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#0B1120] border border-white/5">
                <Truck className="w-5 h-5 text-[#8D9CF5] flex-shrink-0" />
                <div>
                  <p className="font-bold text-white uppercase">Same-Day Doha Dispatch</p>
                  <p className="text-white/50 text-[11px]">Free delivery on orders above 500 QAR</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#0B1120] border border-white/5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-white uppercase">Official Brand Warranty</p>
                  <p className="text-white/50 text-[11px]">100% genuine GCC authorized stock</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#0B1120] border border-white/5">
                <Sparkles className="w-5 h-5 text-[#BB9AED] flex-shrink-0" />
                <div>
                  <p className="font-bold text-white uppercase">WhatsApp</p>
                  <p className="text-white/50 text-[11px]">Direct custom build quotes in Qatar</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
