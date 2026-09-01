"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ShoppingCart, Star, Eye, Zap, Package } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { calculateDiscount, cn } from "@/lib/utils";
import { type Product } from "@/lib/data/products";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: Product;
  locale: string;
  variant?: "default" | "compact";
}

export function ProductCard({ product, locale, variant = "default" }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const isRTL = locale === "ar";

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const discount = product.originalPrice
    ? calculateDiscount(product.originalPrice, product.price)
    : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.images[0],
      quantity: 1,
      slug: product.slug,
      brand: product.brand,
      inStock: product.inStock,
    });
    toast.success(isRTL ? "تمت الإضافة إلى السلة" : "Added to cart!");
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.images[0],
      slug: product.slug,
      brand: product.brand,
      inStock: product.inStock,
      rating: product.rating,
    });
    toast.success(
      isInWishlist
        ? (isRTL ? "تمت الإزالة من المفضلة" : "Removed from wishlist")
        : (isRTL ? "تمت الإضافة إلى المفضلة" : "Added to wishlist!")
    );
  };

  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/${locale}/product/${product.slug}`}>
      <div
        className={cn(
          "product-card group cursor-pointer h-full flex flex-col transition-all duration-300",
          !product.inStock && "opacity-70"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setActiveImage(0); }}
      >
        {/* Image Container */}
        <div className="relative overflow-hidden aspect-[4/3] flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, var(--bg-surface-2), var(--bg-surface-3))" }}>
          {/* Product image or fallback */}
          {!imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.images[activeImage] || product.images[0]}
              alt={isRTL ? product.nameAr : product.name}
              onError={() => setImgError(true)}
              className={cn(
                "w-full h-full object-cover transition-all duration-500 text-transparent select-none",
                isHovered && "scale-108"
              )}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none" style={{ background: "linear-gradient(to bottom, var(--bg-surface-2), var(--bg-surface))", borderBottom: "1px solid var(--bg-surface-3)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 shadow-inner group-hover:border-[#8D9CF5]/40 transition-colors" style={{ backgroundColor: "var(--bg-surface-3)", border: "1px solid var(--border-color)" }}>
                <Package className="w-7 h-7 transition-colors" style={{ color: "var(--color-accent)" }} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider font-display" style={{ color: "var(--text-secondary)" }}>
                {product.brand}
              </span>
            </div>
          )}

          {/* Badges Overlay - properly aligned with start positioning */}
          <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 flex flex-col items-start gap-1.5 z-20 pointer-events-none">
            {discount && (
              <span className="badge bg-gradient-to-r from-[#4063B2] to-[#8D9CF5] text-white text-xs font-black shadow-md">
                -{discount}%
              </span>
            )}
            {product.isNew && (
              <span className="badge bg-gradient-to-r from-[#8D9CF5] to-[#BB9AED] text-[#070B14] text-xs font-black shadow-md">
                NEW
              </span>
            )}
            {product.isBestSeller && !product.isNew && (
              <span className="badge bg-[#4063B2] text-white text-xs font-black shadow-md">
                TOP
              </span>
            )}
          </div>

          {/* Stock badge */}
          {!product.inStock && (
            <div className="absolute inset-0 bg-dark-300/80 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
              <span className="badge-error text-xs font-black font-display">
                {isRTL ? "غير متوفر" : "Out of Stock"}
              </span>
            </div>
          )}

          {/* Action buttons - properly aligned to end */}
          <div
            className={cn(
              "absolute top-3 right-3 rtl:right-auto rtl:left-3 flex flex-col gap-2 transition-all duration-300 z-20",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 ltr:translate-x-3 rtl:-translate-x-3 pointer-events-none"
            )}
          >
            <button
              onClick={handleWishlist}
              aria-label="Wishlist"
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-md shadow-lg cursor-pointer",
                isInWishlist
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                  : "text-muted hover:text-rose-400"
              )}
              style={!isInWishlist ? { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-color)" } : {}}
            >
              <Heart className={cn("w-4 h-4", isInWishlist && "fill-current")} />
            </button>
            <div
              className="w-9 h-9 rounded-xl backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-lg"
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
              title={isRTL ? "عرض التفاصيل" : "View Details"}
            >
              <Eye className="w-4 h-4" />
            </div>
          </div>

          {/* Multiple images indicator */}
          {!imgError && product.images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); setActiveImage(i); }}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === activeImage ? "bg-[#8D9CF5] w-4 shadow-[0_0_8px_#8D9CF5]" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 sm:p-5 flex flex-col flex-1" style={{ backgroundColor: "var(--bg-surface)" }}>
          {/* Brand */}
          <p className="text-xs font-bold uppercase tracking-wider mb-1.5 font-display" style={{ color: "var(--color-accent)" }}>
            {product.brand}
          </p>

          {/* Name */}
          <h3
            className={cn(
              "font-semibold leading-snug mb-2 flex-1 transition-colors",
              variant === "default" ? "text-sm sm:text-base line-clamp-2" : "text-xs line-clamp-2"
            )}
            style={{ color: "var(--text-primary)" }}
          >
            {isRTL ? product.nameAr : product.name}
          </h3>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5",
                      i < Math.floor(product.rating) ? "text-[#8D9CF5] fill-[#8D9CF5]" : "text-surface-3 fill-surface-3"
                    )}
                  />
                ))}
              </div>
              <span className="text-muted text-xs font-medium">({product.reviewCount})</span>
            </div>
          )}

          {/* Price with Unbounded display font */}
          <div className="flex items-baseline gap-2.5 mb-4">
            <span className="font-black text-lg sm:text-xl font-display" style={{ color: "var(--text-primary)" }}>
              QAR {product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-xs sm:text-sm line-through font-medium" style={{ color: "var(--text-secondary)" }}>
                QAR {product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Add to cart */}
          {product.inStock ? (
            <button
              onClick={handleAddToCart}
              className="btn-primary w-full justify-center text-xs sm:text-sm py-2.5 sm:py-3 transition-all duration-300 shadow-md cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              {isRTL ? "أضف إلى السلة" : "Add to Cart"}
            </button>
          ) : (
            <button disabled className="btn-secondary w-full justify-center text-xs sm:text-sm py-2.5 opacity-50 cursor-not-allowed font-display">
              {isRTL ? "غير متوفر" : "Out of Stock"}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
