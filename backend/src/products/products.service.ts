import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FirestoreService } from '../firebase/firestore.service';
import { UploadService } from '../upload/upload.service';
import { AdminService } from '../admin/admin.service';

export interface ProductFilterQuery {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean | string;
  isFeatured?: boolean | string;
  is_featured?: boolean | string;
  featured?: boolean | string;
  isFavorite?: boolean | string;
  is_favorite?: boolean | string;
  isLiked?: boolean | string;
  is_liked?: boolean | string;
  isNew?: boolean | string;
  isOnSale?: boolean | string;
  isOffer?: boolean | string;
  isBestSeller?: boolean | string;
  sortBy?: string; // 'price-asc' | 'price-desc' | 'newest' | 'rating' | 'popular' | 'name'
  sort?: string;
  status?: string;
  includeHidden?: boolean | string;
  compatibility?: string;
  attributes?: Record<string, string>;
  rating?: number | string;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly uploadService: UploadService,
    @Optional() @Inject(forwardRef(() => AdminService)) private readonly adminService?: AdminService,
  ) {}

  private cachedProducts: any[] | null = null;
  private cacheExpiresAt = 0;
  private isRefreshing = false;
  private pendingFetchPromise: Promise<any[]> | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour memory TTL
  private readonly DISK_CACHE_PATH = path.resolve(process.cwd(), '.products-cache.json');

  async onModuleInit() {
    // 1. Immediately hydrate from local disk cache (< 3ms) so zero users experience cold start
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        const raw = fs.readFileSync(this.DISK_CACHE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cachedProducts = parsed;
          this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
          this.logger.log(`Hydrated ${parsed.length} products instantly from local disk cache.`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not read local disk cache: ${e.message}`);
    }

    // 2. Pre-fetch fresh data from Firestore in background
    this.refreshCacheInBackground().catch(() => {});
  }

  invalidateCache() {
    this.cachedProducts = null;
    this.cacheExpiresAt = 0;
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        fs.unlinkSync(this.DISK_CACHE_PATH);
      }
    } catch (_) {}
  }

  private async refreshCacheInBackground(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    try {
      await this.fetchFromFirestore();
    } catch (err: any) {
      this.logger.error('Background cache refresh failed:', err?.message || err);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async fetchFromFirestore(): Promise<any[]> {
    const snap = await this.firestore.collection('products').get();
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    this.cachedProducts = docs;
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;

    // Asynchronously save snapshot to disk for instant server reboot hydration
    try {
      fs.promises.writeFile(this.DISK_CACHE_PATH, JSON.stringify(docs)).catch(() => {});
    } catch (_) {}

    return docs;
  }

  private async getAllProducts(): Promise<any[]> {
    const now = Date.now();
    // 1. Fresh in-memory cache: instant 0ms response
    if (this.cachedProducts && now < this.cacheExpiresAt) {
      return this.cachedProducts;
    }

    // 2. Stale-While-Revalidate: return existing data in 0ms, refresh asynchronously in background
    if (this.cachedProducts && this.cachedProducts.length > 0) {
      this.refreshCacheInBackground().catch(() => {});
      return this.cachedProducts;
    }

    // 3. Cold start without cache: deduplicate parallel callers
    if (!this.pendingFetchPromise) {
      this.pendingFetchPromise = this.fetchFromFirestore().finally(() => {
        this.pendingFetchPromise = null;
      });
    }

    return this.pendingFetchPromise;
  }

  async findAll(query: ProductFilterQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const rawLimit = Number(query.limit);
    const limit = String(query.limit).toLowerCase() === 'all' || rawLimit === 0
      ? 10000
      : Math.max(1, Math.min(10000, rawLimit || 12));

    // Fetch all products snapshot to enable multi-field filtering and full-text search
    const allProducts = await this.getAllProducts();
    let products = [...allProducts];

    // 0. Status filter (Active vs Hidden / Pending Approval) - hide hidden & pending products on storefront unless requested
    const includeHidden = String(query.includeHidden).toLowerCase() === 'true' || query.status === 'all';
    if (!includeHidden) {
      products = products.filter(p => p.status !== 'hidden' && p.status !== 'pending_approval' && p.status !== 'rejected');
    }

    // 0b. Compatibility filter
    if (query.compatibility) {
      const compLower = query.compatibility.toLowerCase().trim();
      products = products.filter(p => {
        if (!p.compatibility) return false;
        if (Array.isArray(p.compatibility)) {
          return p.compatibility.some((c: string) => String(c).toLowerCase().includes(compLower));
        }
        return String(p.compatibility).toLowerCase().includes(compLower);
      });
    }

    // 1. Category filter (by slug, id, name, or subcategory)
    if (query.category) {
      const catLower = query.category.toLowerCase().trim();
      const catSlug = catLower.replace(/[^a-z0-9]+/g, '-');
      products = products.filter(p => {
        const pCat = (p.category || '').toLowerCase();
        const pCatSlug = (p.category_slug || '').toLowerCase();
        const pCatId = (p.category_id || '').toLowerCase();
        const pCatName = (p.category_name || '').toLowerCase();
        const pSub = (p.subcategory || '').toLowerCase();
        const pSubSlug = (p.subcategory_slug || '').toLowerCase();
        const pSubId = (p.subcategory_id || '').toLowerCase();

        return (
          pCatSlug === catLower ||
          pCatSlug === catSlug ||
          pCat === catLower ||
          pCat.replace(/[^a-z0-9]+/g, '-') === catSlug ||
          pCatId === catLower ||
          pCatName === catLower ||
          pCatName.replace(/[^a-z0-9]+/g, '-') === catSlug ||
          pSubSlug === catLower ||
          pSubSlug === catSlug ||
          pSub === catLower ||
          pSub.replace(/[^a-z0-9]+/g, '-') === catSlug ||
          pSubId === catLower
        );
      });
    }

    // 2. Subcategory filter
    if (query.subcategory) {
      const subLower = query.subcategory.toLowerCase().trim();
      const subSlug = subLower.replace(/[^a-z0-9]+/g, '-');
      products = products.filter(p => {
        const pSub = (p.subcategory || '').toLowerCase();
        const pSubSlug = (p.subcategory_slug || '').toLowerCase();
        const pSubId = (p.subcategory_id || '').toLowerCase();
        const pSubName = (p.subcategory_name || '').toLowerCase();

        return (
          pSubSlug === subLower ||
          pSubSlug === subSlug ||
          pSub === subLower ||
          pSub.replace(/[^a-z0-9]+/g, '-') === subSlug ||
          pSubId === subLower ||
          pSubName === subLower
        );
      });
    }

    // 3. Brand filter (supports comma-separated list or single brand)
    if (query.brand) {
      const brandList = String(query.brand)
        .toLowerCase()
        .split(',')
        .map(b => b.trim())
        .filter(Boolean);

      if (brandList.length > 0) {
        products = products.filter(p => {
          const pBrand = (p.brand || '').toLowerCase();
          const pBrandName = (p.brand_name || '').toLowerCase();
          const pBrandSlug = (p.brand_slug || '').toLowerCase();
          const pBrandId = (p.brand_id || '').toLowerCase();

          return brandList.some(b =>
            pBrand === b ||
            pBrandName === b ||
            pBrandSlug === b ||
            pBrandId === b ||
            pBrand.includes(b)
          );
        });
      }
    }

    // 4. In Stock filter
    if (query.inStock !== undefined) {
      const inStockBool = String(query.inStock).toLowerCase() === 'true';
      products = products.filter(p => {
        const isProductInStock = Boolean(
          p.in_stock !== false &&
          p.in_stock !== 'false' &&
          p.stock_status !== 'outofstock' &&
          p.stock_status !== 'OUT_OF_STOCK' &&
          (p.stock_count === undefined || p.stock_count === null || Number(p.stock_count) > 0) &&
          (p.stock === undefined || p.stock === null || Number(p.stock) > 0)
        );
        return isProductInStock === inStockBool;
      });
    }

    // 5. Featured / Favorite / New / On Sale / Offer / Best Seller flags
    const isFeaturedFlag = query.isFeatured ?? query.is_featured ?? query.featured;
    if (isFeaturedFlag !== undefined && String(isFeaturedFlag).toLowerCase() === 'true') {
      const featList = products.filter(p => Boolean(p.is_featured));
      if (featList.length > 0) {
        products = featList;
      }
    }
    const isFavoriteFlag = query.isFavorite ?? query.is_favorite ?? query.isLiked ?? query.is_liked;
    if (isFavoriteFlag !== undefined && String(isFavoriteFlag).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_favorite || p.is_liked));
    }
    if (query.isNew !== undefined && String(query.isNew).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_new));
    }
    if (query.isOnSale !== undefined && String(query.isOnSale).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_on_sale) || Boolean(p.is_offer) || (p.original_price && Number(p.original_price) > Number(p.price)));
    }
    if (query.isOffer !== undefined && String(query.isOffer).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_offer) || Boolean(p.is_on_sale) || (p.original_price && Number(p.original_price) > Number(p.price)));
    }
    if (query.isBestSeller !== undefined && String(query.isBestSeller).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_best_seller));
    }

    // 6. Price range
    if (query.minPrice !== undefined && !isNaN(Number(query.minPrice))) {
      const minP = Number(query.minPrice);
      products = products.filter(p => Number(p.price) >= minP);
    }
    if (query.maxPrice !== undefined && !isNaN(Number(query.maxPrice))) {
      const maxP = Number(query.maxPrice);
      products = products.filter(p => Number(p.price) <= maxP);
    }

    // 6b. Rating filter
    if (query.rating !== undefined && !isNaN(Number(query.rating))) {
      const minR = Number(query.rating);
      products = products.filter(p => Number(p.rating || 0) >= minR);
    }

    // 6c. Dynamic Attribute Filters (e.g. RAM, Storage, Color, Processor, Specs)
    let queryAttrs = query.attributes;
    if (typeof queryAttrs === 'string') {
      try {
        queryAttrs = JSON.parse(queryAttrs);
      } catch (e) {
        queryAttrs = undefined;
      }
    }
    if (queryAttrs && typeof queryAttrs === 'object') {
      for (const [rawKey, rawVal] of Object.entries(queryAttrs)) {
        if (!rawVal) continue;
        const attrKey = rawKey.toLowerCase().trim();
        const acceptedVals = String(rawVal)
          .toLowerCase()
          .split(',')
          .map(v => v.trim())
          .filter(Boolean);

        if (acceptedVals.length > 0) {
          products = products.filter(p => {
            // Check direct property
            const directVal = String(p[attrKey] || p[rawKey] || '').toLowerCase();
            if (acceptedVals.some(v => directVal.includes(v))) return true;

            // Check specifications array
            if (Array.isArray(p.specifications)) {
              return p.specifications.some((spec: any) => {
                const sName = String(spec?.name || spec?.key || '').toLowerCase();
                const sVal = String(spec?.value || spec?.val || '').toLowerCase();
                return (sName === attrKey || sName.includes(attrKey)) && acceptedVals.some(v => sVal.includes(v));
              });
            }

            // Check specifications object
            if (p.specifications && typeof p.specifications === 'object') {
              for (const [k, v] of Object.entries(p.specifications)) {
                if (k.toLowerCase() === attrKey || k.toLowerCase().includes(attrKey)) {
                  const sVal = String(v).toLowerCase();
                  if (acceptedVals.some(av => sVal.includes(av))) return true;
                }
              }
            }

            return false;
          });
        }
      }
    }

    // 7. Full-text search (name, name_ar, description, brand, sku, tags)
    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const terms = query.search.toLowerCase().trim().split(/\s+/);
      products = products.filter(p => {
        const target = [
          p.name || '',
          p.name_ar || '',
          p.short_description || '',
          p.description || '',
          p.brand || '',
          p.sku || '',
          ...(Array.isArray(p.tags) ? p.tags : []),
        ].join(' ').toLowerCase();

        return terms.every(t => target.includes(t));
      });
    }

    // 8. Sorting
    const sortBy = query.sortBy || query.sort || 'newest';
    products.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
        case 'price_asc':
          return Number(a.price) - Number(b.price);
        case 'price-desc':
        case 'price_desc':
          return Number(b.price) - Number(a.price);
        case 'featured':
          return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
        case 'rating':
          return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        case 'popular':
          return (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'newest':
        default:
          return new Date(b.created_at || b.createdAt?._seconds * 1000 || 0).getTime() - new Date(a.created_at || a.createdAt?._seconds * 1000 || 0).getTime();
      }
    });

    const total = products.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedItems = products.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOne(slugOrId: string) {
    // 1. Try by doc ID
    const doc = await this.firestore.doc('products', slugOrId).get();
    let product: any = null;

    if (doc.exists) {
      product = { id: doc.id, ...doc.data() };
    } else {
      // 2. Try by slug
      const snap = await this.firestore.collection('products')
        .where('slug', '==', slugOrId)
        .limit(1)
        .get();

      if (!snap.empty) {
        product = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    }

    if (!product) {
      throw new NotFoundException(`Product not found: ${slugOrId}`);
    }

    // Related products (same category or brand)
    let related: any[] = [];
    if (product.category_slug || product.category) {
      const catKey = product.category_slug || product.category;
      const relatedSnap = await this.firestore.collection('products')
        .where('category', '==', catKey)
        .limit(5)
        .get();

      related = relatedSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(p => p.id !== product.id && p.slug !== product.slug)
        .slice(0, 4);
    }

    return {
      ...product,
      related,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DYNAMIC CATEGORY-BASED PRODUCT FILTERS (Requirement 4)
  // ═══════════════════════════════════════════════════════════════════════════
  async getCategoryFilters(queryInput?: any) {
    const query = typeof queryInput === 'string' ? { category: queryInput } : (queryInput || {});
    const allProducts = await this.getAllProducts();
    let products = allProducts.filter(p => p.status !== 'hidden' && p.status !== 'pending_approval' && p.status !== 'rejected');

    if (query.category) {
      const catLower = query.category.toLowerCase().trim();
      const catSlug = catLower.replace(/[^a-z0-9]+/g, '-');
      products = products.filter(p => {
        const pCat = (p.category || '').toLowerCase();
        const pCatSlug = (p.category_slug || '').toLowerCase();
        const pCatId = (p.category_id || '').toLowerCase();
        const pCatName = (p.category_name || '').toLowerCase();
        return (
          pCatSlug === catLower ||
          pCatSlug === catSlug ||
          pCat === catLower ||
          pCat.replace(/[^a-z0-9]+/g, '-') === catSlug ||
          pCatId === catLower ||
          pCatName === catLower
        );
      });
    }

    if (query.subcategory) {
      const subLower = query.subcategory.toLowerCase().trim();
      const subSlug = subLower.replace(/[^a-z0-9]+/g, '-');
      products = products.filter(p => {
        const pSub = (p.subcategory || '').toLowerCase();
        const pSubSlug = (p.subcategory_slug || '').toLowerCase();
        return (
          pSubSlug === subLower ||
          pSubSlug === subSlug ||
          pSub === subLower ||
          pSub.replace(/[^a-z0-9]+/g, '-') === subSlug
        );
      });
    }

    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const terms = query.search.toLowerCase().trim().split(/\s+/);
      products = products.filter(p => {
        const target = [
          p.name || '',
          p.brand || '',
          p.description || '',
          ...(Array.isArray(p.tags) ? p.tags : []),
        ].join(' ').toLowerCase();
        return terms.every(t => target.includes(t));
      });
    }

    // 1. Brands with exact live product counts in this category
    const brandMap = new Map<string, { name: string; count: number }>();
    for (const p of products) {
      const b = (p.brand || p.brand_name || '').trim();
      if (b) {
        const key = b.toLowerCase();
        const existing = brandMap.get(key) || { name: b, count: 0 };
        existing.count += 1;
        brandMap.set(key, existing);
      }
    }
    const brands = Array.from(brandMap.values()).sort((a, b) => b.count - a.count);

    // 2. Exact Price Range in this category
    let minPrice = 0;
    let maxPrice = 0;
    if (products.length > 0) {
      const prices = products.map(p => Number(p.price) || 0).filter(pr => pr > 0);
      if (prices.length > 0) {
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }
    }

    // 3. Category-Specific Specifications and Attributes
    const attributeMap = new Map<string, Map<string, number>>();
    const recordAttr = (key: string, val: any) => {
      if (!val) return;
      const strVal = String(val).trim();
      if (!strVal || strVal === '-' || strVal.toLowerCase() === 'n/a') return;
      const cleanKey = key.trim();
      if (!attributeMap.has(cleanKey)) {
        attributeMap.set(cleanKey, new Map());
      }
      const valMap = attributeMap.get(cleanKey)!;
      valMap.set(strVal, (valMap.get(strVal) || 0) + 1);
    };

    for (const p of products) {
      if (p.ram) recordAttr('RAM', p.ram);
      if (p.storage) recordAttr('Storage', p.storage);
      if (p.processor) recordAttr('Processor', p.processor);
      if (p.screen_size || p.display) recordAttr('Screen Size', p.screen_size || p.display);
      if (p.colour || p.color) recordAttr('Color', p.colour || p.color);
      if (p.capacity) recordAttr('Capacity', p.capacity);
      if (p.warranty) recordAttr('Warranty', p.warranty);

      // Check specifications array: [{ name: "RAM", value: "16GB" }] or key-value object
      if (Array.isArray(p.specifications)) {
        for (const spec of p.specifications) {
          if (spec && typeof spec === 'object') {
            const specKey = spec.name || spec.key || spec.title;
            const specVal = spec.value || spec.val;
            if (specKey && specVal) {
              recordAttr(specKey, specVal);
            }
          }
        }
      } else if (p.specifications && typeof p.specifications === 'object') {
        for (const [k, v] of Object.entries(p.specifications)) {
          recordAttr(k, v);
        }
      }
    }

    const attributesFormatted: { key: string; name: string; label: string; options: { value: string; count: number }[] }[] = [];
    for (const [attrName, valMap] of attributeMap.entries()) {
      if (valMap.size >= 1 && valMap.size <= 25) {
        const options = Array.from(valMap.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
        attributesFormatted.push({
          key: attrName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          name: attrName,
          label: attrName,
          options,
        });
      }
    }

    // 4. Availability & Ratings counts
    const inStockCount = products.filter(p => p.in_stock !== false && (p.stock_count === undefined || Number(p.stock_count) > 0)).length;
    const offersCount = products.filter(p => p.is_on_sale || p.is_offer || (p.original_price && Number(p.original_price) > Number(p.price))).length;
    const rated4Plus = products.filter(p => Number(p.rating || 0) >= 4).length;
    const rated3Plus = products.filter(p => Number(p.rating || 0) >= 3).length;

    return {
      category: query.category || null,
      subcategory: query.subcategory || null,
      total_products: products.length,
      brands,
      price_range: {
        min: minPrice,
        max: maxPrice,
      },
      attributes: attributesFormatted,
      availability: {
        in_stock: inStockCount,
        offers: offersCount,
      },
      ratings: {
        rated_4_plus: rated4Plus,
        rated_3_plus: rated3Plus,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DYNAMIC "YOU MAY ALSO LIKE" RECOMMENDATIONS (Requirement 5)
  // ═══════════════════════════════════════════════════════════════════════════
  async getRecommendations(slugOrId: string, limit = 8) {
    const allProducts = await this.getAllProducts();
    const current = allProducts.find(p => p.id === slugOrId || p.slug === slugOrId);

    // Filter out current product and hidden/pending products
    const candidates = allProducts.filter(p => {
      if (p.id === slugOrId || p.slug === slugOrId) return false;
      if (current && (p.id === current.id || p.slug === current.slug)) return false;
      if (p.status === 'hidden' || p.status === 'pending_approval' || p.status === 'rejected' || p.is_active === false) return false;
      return true;
    });

    if (!current) {
      return candidates.slice(0, limit);
    }

    const curCat = (current.category || current.category_slug || '').toLowerCase();
    const curSub = (current.subcategory || current.subcategory_slug || '').toLowerCase();
    const curBrand = (current.brand || current.brand_name || '').toLowerCase();
    const curPrice = Number(current.price) || 0;
    const curTags = Array.isArray(current.tags) ? current.tags.map((t: string) => String(t).toLowerCase()) : [];

    // Scoring matrix
    const scored = candidates.map(p => {
      let score = 0;
      const pCat = (p.category || p.category_slug || '').toLowerCase();
      const pSub = (p.subcategory || p.subcategory_slug || '').toLowerCase();
      const pBrand = (p.brand || p.brand_name || '').toLowerCase();
      const pPrice = Number(p.price) || 0;
      const pTags = Array.isArray(p.tags) ? p.tags.map((t: string) => String(t).toLowerCase()) : [];

      // 1. Same subcategory (+50)
      if (curSub && pSub && curSub === pSub) {
        score += 50;
      }
      // 2. Same category (+30)
      if (curCat && pCat && curCat === pCat) {
        score += 30;
      }
      // 3. Same brand (+25)
      if (curBrand && pBrand && curBrand === pBrand) {
        score += 25;
      }
      // 4. Shared tags (+10 each)
      for (const t of pTags) {
        if (curTags.includes(t)) {
          score += 10;
        }
      }
      // 5. Price similarity within 30% (+10)
      if (curPrice > 0 && pPrice > 0) {
        const ratio = Math.abs(curPrice - pPrice) / curPrice;
        if (ratio <= 0.3) {
          score += 10;
        } else if (ratio <= 0.6) {
          score += 5;
        }
      }
      // In-stock bonus (+15)
      if (p.in_stock !== false && (p.stock_count === undefined || Number(p.stock_count) > 0)) {
        score += 15;
      }
      // Featured / Bestseller bonus (+5)
      if (p.is_featured || p.is_best_seller) {
        score += 5;
      }

      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(s => s.product);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT DUPLICATION & BULK OPERATIONS (Requirement 14)
  // ═══════════════════════════════════════════════════════════════════════════
  async duplicate(id: string, adminUser?: any) {
    const original = await this.findOne(id);
    const now = new Date().toISOString();
    const timestamp = Date.now().toString(36);
    const newName = `[Copy] ${original.name}`;
    const newSlug = `${original.slug}-copy-${timestamp}`;

    const { id: _, related: __, ...rest } = original;
    const duplicatedProduct = {
      ...rest,
      name: newName,
      slug: newSlug,
      sku: original.sku ? `${original.sku}-COPY` : undefined,
      created_at: now,
      updated_at: now,
      is_featured: false,
      review_count: 0,
      rating: 5.0,
      status: 'active',
    };

    const docRef = await this.firestore.collection('products').add(duplicatedProduct);
    this.invalidateCache();

    return { id: docRef.id, ...duplicatedProduct };
  }

  async bulkUpdateStatus(ids: string[], status: string, adminUser?: any) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Product IDs array is required');
    }

    const now = new Date().toISOString();
    const validStatus = ['active', 'hidden', 'draft', 'pending_approval'].includes(status) ? status : 'active';

    for (const id of ids) {
      try {
        const docRef = this.firestore.doc('products', id);
        await docRef.update({
          status: validStatus,
          is_active: validStatus === 'active',
          updated_at: now,
        });
      } catch (e) {}
    }

    this.invalidateCache();
    return { success: true, count: ids.length, status: validStatus };
  }

  async create(data: any, adminUser?: any) {
    if (!data.name || !data.price) {
      throw new BadRequestException('Product name and price are required');
    }
    const rawSlugSource = data.slug || data.seo_title || data.name;
    const slug = rawSlugSource
      .replace(/\s*[\-\|]\s*(M\.SHOP|MARJAAH|Qatar|Store|Shop).*$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const now = new Date().toISOString();

    // Check approval requirement
    const requiresApproval = this.adminService ? await this.adminService.isApprovalRequired('products', 'create') : false;
    const isSuperUser = Boolean(adminUser?.is_superuser || adminUser?.username === 'admin');
    const finalStatus = (requiresApproval && !isSuperUser) ? 'pending_approval' : (data.status === 'hidden' ? 'hidden' : 'active');

    // If an image is base64, automatically upload to Firebase Storage
    let primaryImage = data.image || data.primary_image;
    if (primaryImage && typeof primaryImage === 'string' && primaryImage.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(primaryImage, `${slug}.jpg`, 'products');
      primaryImage = uploadRes.url;
    }

    let images = Array.isArray(data.images) ? data.images : (primaryImage ? [primaryImage] : []);
    if (images.length > 0) {
      images = await Promise.all(
        images.map(async (img: any, idx: number) => {
          if (typeof img === 'string' && img.startsWith('data:')) {
            const res = await this.uploadService.uploadBase64(img, `${slug}_${idx}.jpg`, 'products');
            return res.url;
          }
          return img;
        })
      );
    } else {
      images = ['https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg'];
    }

    if (!primaryImage && images.length > 0) {
      primaryImage = images[0];
    }

    const product = {
      ...data,
      slug,
      sku: data.sku ? String(data.sku).trim() : undefined,
      image: primaryImage,
      images,
      image_alts: data.image_alts || {},
      price: Number(data.price),
      original_price: data.original_price ? Number(data.original_price) : null,
      stock_count: data.stock_count !== undefined ? Number(data.stock_count) : 10,
      in_stock: data.in_stock !== undefined ? Boolean(data.in_stock) : true,
      status: finalStatus,
      short_description: data.short_description || '',
      short_description_ar: data.short_description_ar || '',
      description: data.description || '',
      description_ar: data.description_ar || '',
      specifications: Array.isArray(data.specifications) ? data.specifications : [],
      whats_in_box: data.whats_in_box || '',
      whats_in_box_ar: data.whats_in_box_ar || '',
      warranty: data.warranty || '',
      compatibility: data.compatibility || '',
      colour: data.colour || data.color || '',
      variants: Array.isArray(data.variants) ? data.variants : [],
      seo_title: data.seo_title || data.name,
      meta_description: data.meta_description || data.short_description || '',
      is_featured: Boolean(data.is_featured || data.isFeatured),
      is_favorite: Boolean(data.is_favorite || data.isFavorite || data.is_liked || data.isLiked),
      is_liked: Boolean(data.is_liked || data.isLiked || data.is_favorite || data.isFavorite),
      is_new: Boolean(data.is_new),
      is_on_sale: Boolean(data.is_on_sale),
      is_best_seller: Boolean(data.is_best_seller),
      rating: Number(data.rating) || 5.0,
      review_count: Number(data.review_count) || 0,
      tags: Array.isArray(data.tags) ? data.tags : [],
      created_at: now,
      updated_at: now,
    };

    Object.keys(product).forEach((key) => {
      if ((product as any)[key] === undefined) {
        delete (product as any)[key];
      }
    });

    const ref = await this.firestore.collection('products').add(product);
    this.invalidateCache();

    if (requiresApproval && !isSuperUser && this.adminService && adminUser) {
      await this.adminService.createApprovalSubmission({
        module: 'products',
        operation: 'create',
        target_id: ref.id,
        target_title: data.name,
        payload: product,
        submitted_by: {
          id: String(adminUser.id || adminUser.sub || 'admin'),
          username: adminUser.username || 'staff',
          email: adminUser.email,
        },
      });
      return {
        id: ref.id,
        ...product,
        status: 'pending_approval',
        pending_approval: true,
        message: 'Product submitted successfully and is pending administrative approval.',
      };
    }

    return { id: ref.id, ...product };
  }

  async update(id: string, data: any, adminUser?: any) {
    const docRef = this.firestore.doc('products', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const requiresApproval = this.adminService ? await this.adminService.isApprovalRequired('products', 'edit') : false;
    const isSuperUser = Boolean(adminUser?.is_superuser || adminUser?.username === 'admin');

    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.image && typeof data.image === 'string' && data.image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(data.image, `prod_${id}.jpg`, 'products');
      updateData.image = uploadRes.url;
    }

    if (data.images && Array.isArray(data.images)) {
      updateData.images = await Promise.all(
        data.images.map(async (img: any, idx: number) => {
          if (typeof img === 'string' && img.startsWith('data:')) {
            const res = await this.uploadService.uploadBase64(img, `prod_${id}_${idx}.jpg`, 'products');
            return res.url;
          }
          return img;
        })
      );
    }

    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.original_price !== undefined) updateData.original_price = data.original_price ? Number(data.original_price) : null;
    if (data.stock_count !== undefined) {
      updateData.stock_count = Number(data.stock_count);
      if (data.in_stock === undefined) updateData.in_stock = updateData.stock_count > 0;
    }
    if (data.in_stock !== undefined) updateData.in_stock = Boolean(data.in_stock);
    if (data.sku !== undefined) updateData.sku = String(data.sku).trim();
    if (data.status !== undefined) updateData.status = data.status === 'hidden' ? 'hidden' : 'active';
    if (data.short_description !== undefined) updateData.short_description = data.short_description;
    if (data.short_description_ar !== undefined) updateData.short_description_ar = data.short_description_ar;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.description_ar !== undefined) updateData.description_ar = data.description_ar;
    if (data.specifications !== undefined) updateData.specifications = Array.isArray(data.specifications) ? data.specifications : [];
    if (data.whats_in_box !== undefined) updateData.whats_in_box = data.whats_in_box;
    if (data.whats_in_box_ar !== undefined) updateData.whats_in_box_ar = data.whats_in_box_ar;
    if (data.warranty !== undefined) updateData.warranty = data.warranty;
    if (data.compatibility !== undefined) updateData.compatibility = data.compatibility;
    if (data.colour !== undefined || data.color !== undefined) updateData.colour = data.colour ?? data.color ?? '';
    if (data.variants !== undefined) updateData.variants = Array.isArray(data.variants) ? data.variants : [];
    if (data.image_alts !== undefined) updateData.image_alts = data.image_alts;
    if (data.seo_title !== undefined) updateData.seo_title = data.seo_title;
    if (data.meta_description !== undefined) updateData.meta_description = data.meta_description;
    if (data.slug !== undefined && data.slug) {
      updateData.slug = String(data.slug).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    } else if (data.seo_title && !data.slug) {
      updateData.slug = String(data.seo_title)
        .replace(/\s*[\-\|]\s*(M\.SHOP|MARJAAH|Qatar|Store|Shop).*$/i, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (data.is_featured !== undefined || data.isFeatured !== undefined) {
      updateData.is_featured = Boolean(data.is_featured ?? data.isFeatured);
    }
    if (data.is_favorite !== undefined || data.isFavorite !== undefined || data.is_liked !== undefined || data.isLiked !== undefined) {
      const favVal = Boolean(data.is_favorite ?? data.isFavorite ?? data.is_liked ?? data.isLiked);
      updateData.is_favorite = favVal;
      updateData.is_liked = favVal;
    }

    // Ensure no undefined properties are passed to Firestore update
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (requiresApproval && !isSuperUser && this.adminService && adminUser) {
      await this.adminService.createApprovalSubmission({
        module: 'products',
        operation: 'edit',
        target_id: id,
        target_title: doc.data()?.name || id,
        payload: updateData,
        original_data: doc.data(),
        submitted_by: {
          id: String(adminUser.id || adminUser.sub || 'admin'),
          username: adminUser.username || 'staff',
          email: adminUser.email,
        },
      });
      return {
        id,
        status: 'pending_approval',
        pending_approval: true,
        message: 'Product update submitted and is pending administrative approval.',
      };
    }

    await docRef.update(updateData);
    this.invalidateCache();
    return { id, ...doc.data(), ...updateData };
  }

  async bulkUpsert(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Items array is required for bulk upsert');
    }

    const errors: Array<{ row: number; sku?: string; name?: string; error: string }> = [];
    let created = 0;
    let updated = 0;

    // Fetch existing products to match by SKU or slug
    const snap = await this.firestore.collection('products').get();
    const existingBySku = new Map<string, { id: string; data: any }>();
    const existingBySlug = new Map<string, { id: string; data: any }>();

    snap.docs.forEach(doc => {
      const d = doc.data() as any;
      if (d.sku && typeof d.sku === 'string' && d.sku.trim()) {
        existingBySku.set(d.sku.trim().toLowerCase(), { id: doc.id, data: d });
      }
      if (d.slug && typeof d.slug === 'string' && d.slug.trim()) {
        existingBySlug.set(d.slug.trim().toLowerCase(), { id: doc.id, data: d });
      }
    });

    const now = new Date().toISOString();

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rowNum = i + 1;

      // Extract and normalize fields supporting both internal names and Excel column headers
      const sku = (row.SKU || row.sku || '').toString().trim();
      const name = (row['Product Name (EN)'] || row['Product Name'] || row.name || row.name_en || '').toString().trim();
      const name_ar = (row['Product Name (AR)'] || row.name_ar || '').toString().trim();
      const category = (row.Category || row.category || '').toString().trim();
      const subcategory = (row.Subcategory || row.subcategory || '').toString().trim();
      const brand = (row.Brand || row.brand || '').toString().trim();

      const rawPrice = row.Price !== undefined ? row.Price : row.price;
      const rawOldPrice = row['Old Price (optional)'] !== undefined ? row['Old Price (optional)'] : (row.old_price ?? row.original_price);
      const rawStock = row['Stock Quantity'] !== undefined ? row['Stock Quantity'] : (row.stock ?? row.stock_count);

      const price = parseFloat(rawPrice);
      const oldPrice = rawOldPrice !== undefined && rawOldPrice !== '' ? parseFloat(rawOldPrice) : null;
      const stock = rawStock !== undefined && rawStock !== '' ? parseInt(rawStock, 10) : 10;

      const shortDesc = (row['Short Description (EN)'] || row['Short Description (EN/AR)'] || row.short_description || '').toString().trim();
      const shortDescAr = (row['Short Description (AR)'] || row.short_description_ar || '').toString().trim();
      const fullDesc = (row['Full Description (EN)'] || row['Full Description (EN/AR)'] || row.description || row.full_description || '').toString().trim();
      const fullDescAr = (row['Full Description (AR)'] || row.description_ar || row.full_description_ar || '').toString().trim();

      const rawSpecs = row.Specifications || row.specifications || '';
      let specifications: any[] = [];
      if (Array.isArray(rawSpecs)) {
        specifications = rawSpecs;
      } else if (typeof rawSpecs === 'string' && rawSpecs.trim()) {
        if (rawSpecs.trim().startsWith('[') || rawSpecs.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(rawSpecs);
            specifications = Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([k, v]) => ({ label: k, value: String(v) }));
          } catch (e) {
            specifications = rawSpecs.split('|').map(s => {
              const [k, ...v] = s.split(':');
              return { label: (k || '').trim(), value: v.join(':').trim() };
            }).filter(s => s.label);
          }
        } else {
          specifications = rawSpecs.split('|').map(s => {
            const [k, ...v] = s.split(':');
            return { label: (k || '').trim(), value: v.join(':').trim() };
          }).filter(s => s.label);
        }
      }

      const colour = (row.Colour || row.Color || row.colour || row.color || '').toString().trim();
      const compatibility = (row.Compatibility || row.compatibility || '').toString().trim();
      const warranty = (row.Warranty || row.warranty || '').toString().trim();
      const whatsInBox = (row["What's in the Box"] || row["Whats in Box"] || row.whats_in_box || row.whatsInBox || '').toString().trim();
      const whatsInBoxAr = (row["What's in the Box (AR)"] || row["Whats in Box (AR)"] || row.whats_in_box_ar || row.whatsInBoxAr || '').toString().trim();

      let variantsList: any[] = [];
      const rawVariants = row.variants || row.Variants;
      if (Array.isArray(rawVariants)) {
        variantsList = rawVariants;
      } else if (typeof rawVariants === 'string' && rawVariants.trim()) {
        try {
          const parsed = JSON.parse(rawVariants);
          if (Array.isArray(parsed)) variantsList = parsed;
        } catch (e) {}
      }

      const rawImages = row['Image file names or URLs'] || row.images || row.image || '';
      let imagesList: string[] = [];
      if (Array.isArray(rawImages)) {
        imagesList = rawImages.filter(Boolean);
      } else if (typeof rawImages === 'string' && rawImages.trim()) {
        imagesList = rawImages.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
      }

      const seoTitle = (row['SEO Title'] || row.seo_title || '').toString().trim();
      const metaDesc = (row['Meta Description'] || row.meta_description || '').toString().trim();
      let slug = (row['URL slug'] || row.slug || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const rawStatus = (row['Status (Active/Hidden)'] || row.status || 'Active').toString().trim().toLowerCase();
      const status = rawStatus === 'hidden' ? 'hidden' : 'active';

      // Validation
      if (!name && !sku) {
        errors.push({ row: rowNum, sku, name, error: 'Product Name or SKU is required' });
        continue;
      }
      if (isNaN(price) || price < 0) {
        errors.push({ row: rowNum, sku, name, error: `Invalid price "${rawPrice}"` });
        continue;
      }

      // Check if existing product by SKU (primary) or Slug
      const existing = (sku && existingBySku.get(sku.toLowerCase())) || (slug && existingBySlug.get(slug.toLowerCase()));

      if (existing) {
        // UPDATE existing product by SKU - avoids duplicates
        const updatePayload: any = {
          updated_at: now,
          price,
          in_stock: !isNaN(stock) ? stock > 0 : true,
        };
        if (!isNaN(stock)) updatePayload.stock_count = stock;
        if (oldPrice !== null && !isNaN(oldPrice)) updatePayload.original_price = oldPrice;
        if (name) updatePayload.name = name;
        if (name_ar) updatePayload.name_ar = name_ar;
        if (category) updatePayload.category = category;
        if (subcategory) updatePayload.subcategory = subcategory;
        if (brand) updatePayload.brand = brand;
        if (shortDesc) updatePayload.short_description = shortDesc;
        if (shortDescAr) updatePayload.short_description_ar = shortDescAr;
        if (fullDesc) updatePayload.description = fullDesc;
        if (fullDescAr) updatePayload.description_ar = fullDescAr;
        if (specifications.length > 0) updatePayload.specifications = specifications;
        if (colour) updatePayload.colour = colour;
        if (compatibility) updatePayload.compatibility = compatibility;
        if (warranty) updatePayload.warranty = warranty;
        if (whatsInBox) updatePayload.whats_in_box = whatsInBox;
        if (whatsInBoxAr) updatePayload.whats_in_box_ar = whatsInBoxAr;
        if (variantsList.length > 0) updatePayload.variants = variantsList;
        if (imagesList.length > 0) {
          updatePayload.images = imagesList;
          updatePayload.image = imagesList[0];
        }
        if (seoTitle) updatePayload.seo_title = seoTitle;
        if (metaDesc) updatePayload.meta_description = metaDesc;
        if (slug) updatePayload.slug = slug;
        updatePayload.status = status;
        if (oldPrice && oldPrice > price) {
          updatePayload.is_on_sale = true;
          updatePayload.is_offer = true;
        }

        try {
          await this.firestore.doc('products', existing.id).update(updatePayload);
          updated++;
        } catch (err: any) {
          errors.push({ row: rowNum, sku, name, error: `Update failed: ${err.message}` });
        }
      } else {
        // CREATE new product
        if (!name) {
          errors.push({ row: rowNum, sku, name, error: 'Product Name (EN) is required for new products' });
          continue;
        }

        if (!slug) {
          slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        // Ensure slug uniqueness
        let uniqueSlug = slug;
        let counter = 1;
        while (existingBySlug.has(uniqueSlug.toLowerCase())) {
          uniqueSlug = `${slug}-${counter++}`;
        }
        slug = uniqueSlug;

        const newProduct: any = {
          name,
          name_ar,
          slug,
          sku: sku || undefined,
          category,
          category_slug: category ? category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
          subcategory,
          subcategory_slug: subcategory ? subcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
          brand,
          brand_slug: brand ? brand.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '',
          price,
          original_price: oldPrice,
          stock_count: !isNaN(stock) ? stock : 10,
          in_stock: !isNaN(stock) ? stock > 0 : true,
          short_description: shortDesc,
          short_description_ar: shortDescAr,
          description: fullDesc,
          description_ar: fullDescAr,
          specifications,
          colour,
          compatibility,
          warranty,
          whats_in_box: whatsInBox || undefined,
          whats_in_box_ar: whatsInBoxAr || undefined,
          variants: variantsList,
          images: imagesList.length > 0 ? imagesList : ['https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg'],
          image: imagesList.length > 0 ? imagesList[0] : 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg',
          seo_title: seoTitle || name,
          meta_description: metaDesc || shortDesc,
          status,
          is_on_sale: Boolean(oldPrice && oldPrice > price),
          is_offer: Boolean(oldPrice && oldPrice > price),
          rating: 5.0,
          review_count: 0,
          created_at: now,
          updated_at: now,
        };

        try {
          const docRef = await this.firestore.collection('products').add(newProduct);
          existingBySlug.set(slug.toLowerCase(), { id: docRef.id, data: newProduct });
          if (sku) {
            existingBySku.set(sku.toLowerCase(), { id: docRef.id, data: newProduct });
          }
          created++;
        } catch (err: any) {
          errors.push({ row: rowNum, sku, name, error: `Create failed: ${err.message}` });
        }
      }
    }

    this.invalidateCache();
    return {
      success: true,
      total: items.length,
      created,
      updated,
      failed: errors.length,
      errors,
    };
  }

  async remove(id: string, adminUser?: any) {
    const docRef = this.firestore.doc('products', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const requiresApproval = this.adminService ? await this.adminService.isApprovalRequired('products', 'delete') : false;
    const isSuperUser = Boolean(adminUser?.is_superuser || adminUser?.username === 'admin');

    if (requiresApproval && !isSuperUser && this.adminService && adminUser) {
      await this.adminService.createApprovalSubmission({
        module: 'products',
        operation: 'delete',
        target_id: id,
        target_title: doc.data()?.name || id,
        payload: { deleted: true },
        original_data: doc.data(),
        submitted_by: {
          id: String(adminUser.id || adminUser.sub || 'admin'),
          username: adminUser.username || 'staff',
          email: adminUser.email,
        },
      });
      return {
        id,
        status: 'pending_approval',
        pending_approval: true,
        message: 'Product deletion request submitted for administrative approval.',
      };
    }

    await docRef.delete();
    this.invalidateCache();
    return { success: true, message: `Product ${id} deleted` };
  }
}
