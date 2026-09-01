"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "gsap";
import { SlidersHorizontal, Grid3X3, List, ChevronDown, X, Filter } from "lucide-react";
import { products } from "@/lib/data/products";
import { categories } from "@/lib/data/categories";
import { ProductCard } from "@/components/ui/ProductCard";
import { cn } from "@/lib/utils";

interface ShopClientProps {
  locale: string;
  initialCategory?: string;
}

const sortOptions = [
  { value: "featured", label: "Featured", labelAr: "مميز" },
  { value: "newest", label: "Newest", labelAr: "الأحدث" },
  { value: "price-asc", label: "Price: Low to High", labelAr: "السعر: من الأقل" },
  { value: "price-desc", label: "Price: High to Low", labelAr: "السعر: من الأعلى" },
  { value: "rating", label: "Top Rated", labelAr: "الأعلى تقييماً" },
];

export function ShopClient({ locale, initialCategory }: ShopClientProps) {
  const t = useTranslations("common");
  const isRTL = locale === "ar";
  const gridRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 15000]);
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const allBrands = [...new Set(products.map((p) => p.brand))].sort();

  const filteredProducts = products
    .filter((p) => {
      if (selectedCategory && p.categoryId !== selectedCategory) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (inStockOnly && !p.inStock) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "rating": return b.rating - a.rating;
        case "newest": return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        default: return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }
    });

  useEffect(() => {
    if (gridRef.current) {
      gsap.fromTo(
        ".shop-card",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, stagger: 0.04, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [filteredProducts.length, sortBy, selectedCategory, viewMode]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedBrands([]);
    setPriceRange([0, 15000]);
    setInStockOnly(false);
  };

  const hasFilters = selectedCategory || selectedBrands.length > 0 || inStockOnly || priceRange[0] > 0 || priceRange[1] < 15000;

  return (
    <div className="container-custom py-8">
      <div className="flex gap-8">
        {/* Sidebar Filter */}
        <aside className="w-72 flex-shrink-0 space-y-6 hidden lg:block">
          <div className="bg-surface rounded-3xl p-6 sticky top-24 border border-border-color shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold font-display text-base flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Filter className="w-4 h-4 text-[#4063B2]" />
                {isRTL ? "تصفية المنتجات" : "Filters"}
              </h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-[#4063B2] hover:text-blue-700 text-xs font-bold font-display transition-colors">
                  {t("clear")}
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="mb-6 pb-6 border-b border-border-color">
              <p className="text-xs font-bold uppercase tracking-wider mb-3 font-display text-[#4063B2]">{isRTL ? "الفئات" : "Categories"}</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={cn(
                    "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                    !selectedCategory ? "bg-[#4063B2]/10 text-[#4063B2] border border-[#4063B2]/30 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-surface-2"
                  )}
                >
                  {isRTL ? "جميع الفئات" : "All Categories"}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-all",
                      selectedCategory === cat.id ? "bg-[#4063B2]/10 text-[#4063B2] border border-[#4063B2]/30 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-surface-2"
                    )}
                  >
                    <span>{isRTL ? cat.nameAr : cat.name}</span>
                    <span className="text-xs opacity-60 font-display">{cat.productCount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            <div className="mb-6 pb-6 border-b border-border-color">
              <p className="text-xs font-bold uppercase tracking-wider mb-3 font-display text-[#4063B2]">{isRTL ? "الماركات" : "Brands"}</p>
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {allBrands.map((brand) => (
                  <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="w-4 h-4 rounded border-border-color bg-surface-2 text-primary focus:ring-primary/50 focus:ring-2 accent-[#4063B2]"
                    />
                    <span className="text-slate-700 group-hover:text-slate-900 text-sm font-medium transition-colors">{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6 pb-6 border-b border-border-color">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider font-display text-[#4063B2]">{isRTL ? "نطاق السعر" : "Price Range"}</p>
                <span className="text-xs font-bold text-slate-600">QAR {priceRange[1].toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max="15000"
                step="100"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full accent-[#4063B2] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1 font-display">
                <span>QAR 0</span>
                <span>QAR 15,000+</span>
              </div>
            </div>

            {/* In Stock Only */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-border-color bg-surface-2 text-primary focus:ring-primary/50 focus:ring-2 accent-[#4063B2]"
              />
              <span className="text-slate-800 text-sm font-medium font-display">{isRTL ? "المتوفر فقط" : "In Stock Only"}</span>
            </label>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between mb-8 gap-4 bg-surface p-4 rounded-2xl border border-border-color shadow-sm">
            <p className="text-slate-600 text-sm font-medium">
              <span className="font-bold font-display text-base" style={{ color: "var(--text-primary)" }}>{filteredProducts.length}</span>{" "}
              {isRTL ? "منتجات مطابقة" : "products found"}
              {hasFilters && (
                <button onClick={clearFilters} className="ml-3 text-[#4063B2] hover:text-blue-700 font-bold font-display text-xs transition-colors">
                  <X className="w-3.5 h-3.5 inline mr-0.5" />
                  {t("clear")}
                </button>
              )}
            </p>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Filter Trigger Button */}
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border-color text-slate-800 text-xs font-bold font-display hover:bg-surface-3 transition-colors cursor-pointer"
              >
                <Filter className="w-4 h-4 text-[#4063B2]" />
                <span>{isRTL ? "الفلاتر" : "Filters"}</span>
                {hasFilters && <span className="w-2 h-2 rounded-full bg-[#4063B2]" />}
              </button>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input py-2.5 pr-8 appearance-none text-xs font-bold font-display cursor-pointer min-w-[140px] sm:min-w-[170px] bg-surface-2 border-border-color text-slate-800"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isRTL ? opt.labelAr : opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4063B2] pointer-events-none" />
              </div>

              {/* View Modes (Grid, List) */}
              <div className="flex items-center bg-surface-2 rounded-xl p-1 border border-border-color">
                <button
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                  aria-label="Grid view"
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === "grid"
                      ? "bg-[#4063B2] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="List View"
                  aria-label="List view"
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === "list"
                      ? "bg-[#4063B2] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Views */}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-surface rounded-3xl border border-border-color p-8 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <SlidersHorizontal className="w-8 h-8 text-[#4063B2]" />
              </div>
              <p className="font-bold font-display text-xl mb-2" style={{ color: "var(--text-primary)" }}>{isRTL ? "لا توجد نتائج" : "No Products Found"}</p>
              <p className="text-slate-600 text-sm mb-5 font-medium">{isRTL ? "جرب تغيير الفلاتر" : "Try adjusting your filters or search term"}</p>
              <button onClick={clearFilters} className="btn-primary">{t("clear")}</button>
            </div>
          ) : (
            /* Grid or List */
            <div
              ref={gridRef}
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
                  : "grid grid-cols-1 gap-4"
              )}
            >
              {filteredProducts.map((product) => (
                <div key={product.id} className="shop-card">
                  <ProductCard product={product} locale={locale} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile / Tablet Filter Drawer Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div
            className={cn(
              "relative w-full max-w-xs sm:max-w-sm h-full bg-surface border-border-color p-6 flex flex-col justify-between overflow-y-auto z-10 animate-fade-in shadow-2xl",
              isRTL ? "mr-auto border-r" : "ml-auto border-l"
            )}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-border-color">
                <h3 className="font-bold font-display text-lg flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Filter className="w-5 h-5 text-[#4063B2]" />
                  {isRTL ? "تصفية المنتجات" : "Filter Products"}
                </h3>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-surface-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Categories */}
              <div className="mb-6 pb-6 border-b border-border-color">
                <p className="text-xs font-bold uppercase tracking-wider mb-3 font-display text-[#4063B2]">
                  {isRTL ? "الفئات" : "Categories"}
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <button
                    onClick={() => setSelectedCategory("")}
                    className={cn(
                      "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                      !selectedCategory ? "bg-[#4063B2]/10 text-[#4063B2] border border-[#4063B2]/30 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-surface-2"
                    )}
                  >
                    {isRTL ? "جميع الفئات" : "All Categories"}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-all",
                        selectedCategory === cat.id ? "bg-[#4063B2]/10 text-[#4063B2] border border-[#4063B2]/30 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-surface-2"
                      )}
                    >
                      <span>{isRTL ? cat.nameAr : cat.name}</span>
                      <span className="text-xs opacity-60 font-display">{cat.productCount}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div className="mb-6 pb-6 border-b border-border-color">
                <p className="text-xs font-bold uppercase tracking-wider mb-3 font-display text-[#4063B2]">
                  {isRTL ? "الماركات" : "Brands"}
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {allBrands.map((brand) => (
                    <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="w-4 h-4 rounded border-border-color bg-surface-2 text-primary focus:ring-primary/50 focus:ring-2 accent-[#4063B2]"
                      />
                      <span className="text-slate-700 group-hover:text-slate-900 text-sm font-medium transition-colors">{brand}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6 pb-6 border-b border-border-color">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider font-display text-[#4063B2]">
                    {isRTL ? "نطاق السعر" : "Price Range"}
                  </p>
                  <span className="text-xs font-bold text-slate-600">QAR {priceRange[1].toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15000"
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full accent-[#4063B2] cursor-pointer"
                />
              </div>

              {/* In Stock */}
              <label className="flex items-center gap-3 cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-border-color bg-surface-2 text-primary focus:ring-primary/50 focus:ring-2 accent-[#4063B2]"
                />
                <span className="text-slate-800 text-sm font-medium font-display">{isRTL ? "المتوفر فقط" : "In Stock Only"}</span>
              </label>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border-color flex gap-3">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary flex-1 justify-center py-3 text-xs font-bold font-display"
                >
                  {t("clear")}
                </button>
              )}
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="btn-primary flex-1 justify-center py-3 text-xs font-bold font-display"
              >
                {isRTL ? `عرض ${filteredProducts.length} منتج` : `View ${filteredProducts.length} Results`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
