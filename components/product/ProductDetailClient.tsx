"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { type Product, getRelatedProducts } from "@/lib/data/products";
import { calculateDiscount, cn } from "@/lib/utils";
import { ShoppingCart, Heart, Share2, Shield, Truck, RotateCcw, ChevronLeft, ChevronRight, Minus, Plus, Zap, Star } from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import toast from "react-hot-toast";
import Link from "next/link";

interface ProductDetailClientProps {
  product: Product;
  locale: string;
}

export function ProductDetailClient({ product, locale }: ProductDetailClientProps) {
  const isRTL = locale === "ar";
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "specs" | "delivery">("description");

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));
  const openCart = useCartStore((s) => s.openCart);

  const relatedProducts = getRelatedProducts(product).slice(0, 4);
  const discount = product.originalPrice
    ? calculateDiscount(product.originalPrice, product.price)
    : null;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id, name: product.name, nameAr: product.nameAr,
        price: product.price, originalPrice: product.originalPrice,
        image: product.images[0], quantity: 1, slug: product.slug,
        brand: product.brand, inStock: product.inStock,
      });
    }
    toast.success(isRTL ? "تمت الإضافة إلى السلة!" : "Added to cart!");
    openCart();
  };

  const handleBuyNow = () => {
    handleAddToCart();
    window.location.href = `/${locale}/checkout`;
  };

  return (
    <div className="min-h-screen bg-base">
      {/* Breadcrumb */}
      <div className="bg-surface border-b border-border-color pt-24 md:pt-28 pb-4">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm font-medium">
            <Link href={`/${locale}`} className="hover:text-[#4063B2] transition-colors">Home</Link>
            <span>/</span>
            <Link href={`/${locale}/shop`} className="hover:text-[#4063B2] transition-colors">Shop</Link>
            <span>/</span>
            <Link href={`/${locale}/shop/${product.categoryId}`} className="hover:text-[#4063B2] transition-colors capitalize">
              {product.categoryId}
            </Link>
            <span>/</span>
            <span className="truncate max-w-[200px] font-semibold" style={{ color: "var(--text-primary)" }}>{isRTL ? product.nameAr : product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Left: Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative rounded-3xl overflow-hidden bg-surface-2 aspect-[4/3] group border border-border-color shadow-sm flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.images[selectedImage]}
                alt={isRTL ? product.nameAr : product.name}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".fallback-placeholder")) {
                    const placeholder = document.createElement("div");
                    placeholder.className = "fallback-placeholder w-full h-full flex flex-col items-center justify-center p-8 text-center select-none";
                    placeholder.innerHTML = `
                      <div class="w-20 h-20 rounded-2xl bg-surface-2 border border-border-color flex items-center justify-center mb-3 shadow-inner">
                        <svg class="w-10 h-10 text-[#4063B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                      </div>
                      <span class="text-sm font-bold text-slate-500 uppercase tracking-wider">${product.brand}</span>
                    `;
                    parent.appendChild(placeholder);
                  }
                }}
                className="w-full h-full object-cover select-none"
              />
              {/* Navigation arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-md border border-border-color rounded-xl flex items-center justify-center text-slate-800 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer shadow-md z-20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev + 1) % product.images.length)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-md border border-border-color rounded-xl flex items-center justify-center text-slate-800 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer shadow-md z-20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              {/* Badges */}
              <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 flex flex-col gap-2 z-20 pointer-events-none">
                {discount && (
                  <span className="badge bg-[#4063B2] text-white font-black shadow-md">-{discount}%</span>
                )}
                {product.isNew && <span className="badge bg-[#8D9CF5] text-[#070B14] font-black shadow-md">NEW</span>}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 max-w-full">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    aria-label={`Select product image ${i + 1}`}
                    className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-pointer",
                      selectedImage === i ? "border-[#4063B2] shadow-sm" : "border-border-color opacity-70 hover:opacity-100"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {/* Brand & SKU */}
            <div className="flex items-center justify-between">
              <span className="text-[#4063B2] font-bold text-xs uppercase tracking-widest font-display">{product.brand}</span>
              <span className="text-slate-500 text-xs font-mono">SKU: {product.sku}</span>
            </div>

            {/* Name */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight font-display" style={{ color: "var(--text-primary)" }}>
              {isRTL ? product.nameAr : product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn("w-4 h-4", i < Math.floor(product.rating) ? "text-[#4063B2] fill-[#4063B2]" : "text-slate-300 fill-slate-300")}
                  />
                ))}
              </div>
              <span className="font-bold font-display" style={{ color: "var(--text-primary)" }}>{product.rating}</span>
              <span className="text-slate-500 text-sm font-medium">({product.reviewCount} reviews)</span>
            </div>

            {/* Price Box */}
            <div className="bg-surface rounded-3xl p-6 border border-border-color shadow-sm">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-3xl sm:text-4xl font-black font-display" style={{ color: "var(--text-primary)" }}>QAR {product.price.toLocaleString()}</span>
                {product.originalPrice && (
                  <span className="text-slate-400 text-lg sm:text-xl line-through font-medium">QAR {product.originalPrice.toLocaleString()}</span>
                )}
                {discount && (
                  <span className="badge bg-[#4063B2] text-white text-xs font-black shadow-sm">Save {discount}%</span>
                )}
              </div>
              {product.originalPrice && (
                <p className="text-emerald-600 text-sm font-bold">
                  You save: QAR {(product.originalPrice - product.price).toLocaleString()}
                </p>
              )}
            </div>

            {/* Short Description */}
            <p className="text-base leading-relaxed font-medium" style={{ color: "var(--text-secondary)" }}>
              {isRTL ? product.shortDescriptionAr : product.shortDescription}
            </p>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", product.inStock ? "bg-emerald-500" : "bg-error")} />
              <span className={cn("text-sm font-bold font-display", product.inStock ? "text-emerald-600" : "text-error")}>
                {product.inStock
                  ? (product.stockCount && product.stockCount < 10 ? `Only ${product.stockCount} left in Qatar!` : "In Stock — Ready to Dispatch")
                  : "Out of Stock"}
              </span>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold font-display" style={{ color: "var(--text-primary)" }}>{isRTL ? "الكمية:" : "Quantity:"}</span>
              <div className="flex items-center bg-surface-2 rounded-2xl p-1 border border-border-color">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 rounded-xl hover:bg-surface-3 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-black w-12 text-center text-lg font-display" style={{ color: "var(--text-primary)" }}>{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="w-10 h-10 rounded-xl hover:bg-surface-3 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="btn-secondary flex-1 justify-center py-4 text-sm font-bold font-display disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl"
              >
                <ShoppingCart className="w-5 h-5 text-[#4063B2]" />
                {isRTL ? "أضف إلى السلة" : "Add to Cart"}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!product.inStock}
                className="btn-primary flex-1 justify-center py-4 text-sm font-bold font-display shadow-md disabled:opacity-50 rounded-2xl"
              >
                <Zap className="w-5 h-5" />
                {isRTL ? "اشترِ الآن" : "Instant Checkout"}
              </button>
            </div>

            {/* Wishlist & Share */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  toggleItem({
                    id: product.id, name: product.name, nameAr: product.nameAr,
                    price: product.price, image: product.images[0],
                    slug: product.slug, brand: product.brand, inStock: product.inStock,
                  });
                  toast.success(isInWishlist ? "Removed from wishlist" : "Added to wishlist!");
                }}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all text-xs font-bold font-display",
                  isInWishlist
                    ? "bg-pink-500/10 border-pink-500/40 text-pink-500"
                    : "border-border-color text-slate-700 hover:text-[#4063B2] hover:border-[#4063B2]/40 bg-surface"
                )}
              >
                <Heart className={cn("w-4 h-4", isInWishlist && "fill-current")} />
                {isRTL ? "المفضلة" : "Wishlist"}
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-border-color bg-surface text-slate-700 hover:text-[#4063B2] text-xs font-bold font-display transition-all"
              >
                <Share2 className="w-4 h-4" />
                {isRTL ? "مشاركة" : "Share"}
              </button>
            </div>

            {/* Trust info */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Shield, text: `${product.warrantyMonths}m Warranty` },
                { icon: Truck, text: `${product.deliveryDays}-day delivery` },
                { icon: RotateCcw, text: "7-day returns" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3.5 bg-surface rounded-2xl text-center border border-border-color shadow-sm">
                  <item.icon className="w-5 h-5 text-[#4063B2]" />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs: Description / Specs / Delivery */}
        <div className="mb-16">
          <div className="flex gap-2 bg-surface-2 rounded-2xl p-1.5 mb-8 w-fit border border-border-color">
            {(["description", "specs", "delivery"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-3 rounded-xl text-xs sm:text-sm font-bold font-display transition-all capitalize",
                  activeTab === tab ? "bg-[#4063B2] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tab === "description" ? (isRTL ? "الوصف" : "Overview")
                  : tab === "specs" ? (isRTL ? "المواصفات" : "Technical Specs")
                  : (isRTL ? "التوصيل والضمان" : "Delivery & Warranty")}
              </button>
            ))}
          </div>

          {activeTab === "description" && (
            <div className="bg-surface rounded-3xl p-8 max-w-4xl border border-border-color shadow-sm">
              <p className="leading-relaxed font-medium text-base sm:text-lg" style={{ color: "var(--text-secondary)" }}>
                {isRTL ? product.descriptionAr : product.description}
              </p>
            </div>
          )}

          {activeTab === "specs" && (
            <div className="bg-surface rounded-3xl p-8 max-w-4xl border border-border-color shadow-sm">
              <table className="w-full">
                <tbody>
                  {product.specifications.map((spec, i) => (
                    <tr key={i} className={cn(i % 2 === 0 && "bg-surface-2/60")}>
                      <td className="py-3.5 px-4 text-[#4063B2] text-xs sm:text-sm font-bold font-display w-1/3 rounded-l-xl">
                        {isRTL ? spec.keyAr : spec.key}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-medium rounded-r-xl" style={{ color: "var(--text-primary)" }}>
                        {isRTL ? spec.valueAr : spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "delivery" && (
            <div className="bg-surface rounded-3xl p-8 max-w-4xl space-y-6 border border-border-color shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#4063B2]/10 border border-[#4063B2]/30 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6 text-[#4063B2]" />
                </div>
                <div>
                  <h4 className="font-bold font-display text-base mb-1" style={{ color: "var(--text-primary)" }}>Qatar Express Delivery</h4>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Free delivery across Qatar on all orders over QAR 500. Standard delivery fee: QAR 20. Estimated delivery in {product.deliveryDays} business day(s).</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#4063B2]/10 border border-[#4063B2]/30 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#4063B2]" />
                </div>
                <div>
                  <h4 className="font-bold font-display text-base mb-1" style={{ color: "var(--text-primary)" }}>Official Manufacturer Warranty</h4>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                    {(product.warrantyMonths ?? 0) > 0
                      ? `Includes an official ${product.warrantyMonths}-month brand warranty with local authorized support in Qatar.`
                      : "Official limited warranty included. Contact our team for extended protection plans."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <h4 className="font-bold font-display text-base mb-1" style={{ color: "var(--text-primary)" }}>Hassle-Free Returns</h4>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>7-day easy return policy for unopened products in original factory-sealed packaging.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-black mb-8 font-display" style={{ color: "var(--text-primary)" }}>{isRTL ? "قد يعجبك أيضاً" : "Complementary Gear"}</h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
