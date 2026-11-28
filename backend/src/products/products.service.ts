import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FirestoreService } from '../firebase/firestore.service';
import { UploadService } from '../upload/upload.service';
import { AdminService } from '../admin/admin.service';
import { SeoService } from '../seo/seo.service';
import { CategoriesService } from '../categories/categories.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { BrandsService } from '../brands/brands.service';

export interface ProductFilterQuery {
  page?: number;
  limit?: number;
  cursor?: string;
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
  is_new?: boolean | string;
  isOnSale?: boolean | string;
  isOffer?: boolean | string;
  isBestSeller?: boolean | string;
  is_best_seller?: boolean | string;
  bestseller?: boolean | string;
  sortBy?: string;
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
    @Optional() @Inject(forwardRef(() => SeoService)) private readonly seoService?: SeoService,
    @Optional() @Inject(forwardRef(() => CategoriesService)) private readonly categoriesService?: CategoriesService,
    @Optional() @Inject(forwardRef(() => SubcategoriesService)) private readonly subcategoriesService?: SubcategoriesService,
    @Optional() @Inject(forwardRef(() => BrandsService)) private readonly brandsService?: BrandsService,
  ) {}

  private cachedProducts: any[] | null = null;
  private cacheExpiresAt = 0;
  private isRefreshing = false;
  private pendingFetchPromise: Promise<any[]> | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;
  private readonly DISK_CACHE_PATH = path.resolve(process.cwd(), '.products-cache.json');
  private productSalesMap: Map<string, number> = new Map();
  private productSalesExpiresAt = 0;

  async getProductSalesMap(): Promise<Map<string, number>> {
    if (this.productSalesMap.size > 0 && Date.now() < this.productSalesExpiresAt) {
      return this.productSalesMap;
    }
    try {
      const ordersSnap = await this.firestore.collection('orders').get();
      const map = new Map<string, number>();
      for (const doc of ordersSnap.docs) {
        const order = doc.data();
        if (order.status === 'cancelled' || order.status === 'canceled') continue;
        const items = Array.isArray(order.items) ? order.items : [];
        for (const it of items) {
          const qty = Number(it.quantity) || 1;
          const pid = it.id || it.product_id;
          if (pid) map.set(String(pid), (map.get(String(pid)) || 0) + qty);
          if (it.slug) map.set(String(it.slug), (map.get(String(it.slug)) || 0) + qty);
        }
      }
      this.productSalesMap = map;
      this.productSalesExpiresAt = Date.now() + 5 * 60 * 1000;
      return map;
    } catch (e: any) {
      this.logger.warn(`Could not compute sales map: ${e.message}`);
      return this.productSalesMap;
    }
  }

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

  invalidateCache(cascade = true) {
    this.cachedProducts = null;
    this.cacheExpiresAt = 0;
    try {
      this.seoService?.invalidateSitemapCache();
    } catch (_) {}
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        fs.unlinkSync(this.DISK_CACHE_PATH);
      }
    } catch (_) {}
    if (cascade) {
      try { this.categoriesService?.invalidateCache(); } catch (_) {}
      try { this.subcategoriesService?.invalidateCache(); } catch (_) {}
      try { this.brandsService?.invalidateCache(); } catch (_) {}
    }
    this.refreshCacheInBackground().then(() => {
      if (cascade) {
        try { this.categoriesService?.invalidateCache(); } catch (_) {}
        try { this.subcategoriesService?.invalidateCache(); } catch (_) {}
        try { this.brandsService?.invalidateCache(); } catch (_) {}
      }
    }).catch(() => {});
  }

  private upsertCachedProduct(product: any) {
    if (!product || !product.id) {
      this.invalidateCache();
      return;
    }
    if (Array.isArray(this.cachedProducts)) {
      const idx = this.cachedProducts.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        this.cachedProducts[idx] = { ...this.cachedProducts[idx], ...product };
      } else {
        this.cachedProducts.unshift(product);
      }
      this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
      try {
        fs.promises.writeFile(this.DISK_CACHE_PATH, JSON.stringify(this.cachedProducts)).catch(() => {});
      } catch (_) {}
    } else {
      this.invalidateCache();
    }
    try { this.seoService?.invalidateSitemapCache(); } catch (_) {}
    try { this.categoriesService?.invalidateCache(); } catch (_) {}
    try { this.subcategoriesService?.invalidateCache(); } catch (_) {}
    try { this.brandsService?.invalidateCache(); } catch (_) {}
  }

  private removeCachedProduct(id: string) {
    if (Array.isArray(this.cachedProducts)) {
      this.cachedProducts = this.cachedProducts.filter((p) => p.id !== id);
      this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
      try {
        fs.promises.writeFile(this.DISK_CACHE_PATH, JSON.stringify(this.cachedProducts)).catch(() => {});
      } catch (_) {}
    } else {
      this.invalidateCache();
    }
    try { this.seoService?.invalidateSitemapCache(); } catch (_) {}
    try { this.categoriesService?.invalidateCache(); } catch (_) {}
    try { this.subcategoriesService?.invalidateCache(); } catch (_) {}
    try { this.brandsService?.invalidateCache(); } catch (_) {}
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
    const statusParam = query.status ? String(query.status).toLowerCase().trim() : '';
    const includeHidden = String(query.includeHidden).toLowerCase() === 'true' || statusParam === 'all' || ['hidden', 'pending_approval', 'rejected'].includes(statusParam);
    if (!includeHidden) {
      products = products.filter(p => p.status !== 'hidden' && p.status !== 'pending_approval' && p.status !== 'rejected');
    }
    if (statusParam && statusParam !== 'all') {
      products = products.filter(p => (p.status || 'active').toLowerCase() === statusParam);
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

    const isFeaturedFlag = query.isFeatured ?? query.is_featured ?? query.featured;
    if (isFeaturedFlag !== undefined && String(isFeaturedFlag).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_featured || p.featured));
    }
    const isFavoriteFlag = query.isFavorite ?? query.is_favorite ?? query.isLiked ?? query.is_liked;
    if (isFavoriteFlag !== undefined && String(isFavoriteFlag).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_favorite || p.is_liked));
    }
    const isNewFlag = query.isNew ?? query.is_new;
    if (isNewFlag !== undefined && String(isNewFlag).toLowerCase() === 'true') {
      const fortyFiveDaysAgo = Date.now() - 45 * 24 * 60 * 60 * 1000;
      products = products.filter(p => {
        if (Boolean(p.is_new)) return true;
        const createdMs = new Date(p.created_at || (p.createdAt?._seconds ? p.createdAt._seconds * 1000 : 0)).getTime();
        return createdMs >= fortyFiveDaysAgo;
      });
    }
    if (query.isOnSale !== undefined && String(query.isOnSale).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_on_sale) || Boolean(p.is_offer) || Boolean(p.offer_badge) || Boolean(p.offer_title) || (p.original_price && Number(p.original_price) > Number(p.price)));
    }
    if (query.isOffer !== undefined && String(query.isOffer).toLowerCase() === 'true') {
      products = products.filter(p => Boolean(p.is_offer) || Boolean(p.is_on_sale) || Boolean(p.offer_badge) || Boolean(p.offer_title) || (p.original_price && Number(p.original_price) > Number(p.price)));
    }
    const isBestSellerFlag = query.isBestSeller ?? query.is_best_seller ?? query.bestseller;
    if (isBestSellerFlag !== undefined && String(isBestSellerFlag).toLowerCase() === 'true') {
      const salesMap = await this.getProductSalesMap();
      products = products.filter(p => {
        const orderSales = salesMap.get(String(p.id)) || salesMap.get(String(p.slug)) || 0;
        return orderSales > 0 || Boolean(p.is_best_seller || p.isBestSeller);
      });
    }

    if (query.minPrice !== undefined && !isNaN(Number(query.minPrice))) {
      const minP = Number(query.minPrice);
      products = products.filter(p => Number(p.price) >= minP);
    }
    if (query.maxPrice !== undefined && !isNaN(Number(query.maxPrice))) {
      const maxP = Number(query.maxPrice);
      products = products.filter(p => Number(p.price) <= maxP);
    }

    if (query.rating !== undefined && !isNaN(Number(query.rating))) {
      const minR = Number(query.rating);
      products = products.filter(p => Number(p.rating || 0) >= minR);
    }

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
            const directVal = String(p[attrKey] || p[rawKey] || '').toLowerCase();
            if (acceptedVals.some(v => directVal.includes(v))) return true;

            if (Array.isArray(p.specifications)) {
              return p.specifications.some((spec: any) => {
                const sName = String(spec?.name || spec?.key || '').toLowerCase();
                const sVal = String(spec?.value || spec?.val || '').toLowerCase();
                return (sName === attrKey || sName.includes(attrKey)) && acceptedVals.some(v => sVal.includes(v));
              });
            }

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

    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const parsed = this.parseNaturalQuery(query.search);
      if (query.minPrice === undefined && parsed.minPrice !== null) {
        products = products.filter(p => Number(p.price) >= parsed.minPrice!);
      }
      if (query.maxPrice === undefined && parsed.maxPrice !== null) {
        products = products.filter(p => Number(p.price) <= parsed.maxPrice!);
      }
      if (parsed.termVariants.length > 0) {
        products = products.filter(p => {
          const specText = Array.isArray(p.specifications)
            ? p.specifications.map((s: any) => `${s.name || s.key || ''} ${s.value || s.val || ''}`).join(' ')
            : (p.specifications && typeof p.specifications === 'object' ? Object.values(p.specifications).join(' ') : '');

          const target = [
            p.name || '',
            p.name_ar || '',
            p.short_description || '',
            p.short_description_ar || '',
            p.description || '',
            p.description_ar || '',
            p.brand || '',
            p.brand_name || '',
            p.sku || '',
            p.category || '',
            p.category_name || '',
            p.category_slug || '',
            p.subcategory || '',
            p.subcategory_name || '',
            p.subcategory_slug || '',
            specText,
            ...(Array.isArray(p.tags) ? p.tags : []),
          ].join(' ').toLowerCase();

          return parsed.termVariants.every(variants => variants.some(v => target.includes(v)));
        });
      }
    }

    const salesMap = await this.getProductSalesMap();
    const sortBy = query.sortBy || query.sort || 'newest';
    products.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'price-asc':
        case 'price_asc':
          cmp = Number(a.price) - Number(b.price);
          break;
        case 'price-desc':
        case 'price_desc':
          cmp = Number(b.price) - Number(a.price);
          break;
        case 'featured':
          cmp = (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
          break;
        case 'rating':
          cmp = (Number(b.rating) || 0) - (Number(a.rating) || 0);
          break;
        case 'popular':
        case 'sales':
        case 'bestseller': {
          const salesB = salesMap.get(String(b.id)) || salesMap.get(String(b.slug)) || Number(b.sales_count || 0) || Number(b.review_count || 0);
          const salesA = salesMap.get(String(a.id)) || salesMap.get(String(a.slug)) || Number(a.sales_count || 0) || Number(a.review_count || 0);
          cmp = salesB - salesA;
          break;
        }
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'newest':
        default: {
          const dateB = new Date(b.created_at || (b.createdAt?._seconds ? b.createdAt._seconds * 1000 : 0)).getTime();
          const dateA = new Date(a.created_at || (a.createdAt?._seconds ? a.createdAt._seconds * 1000 : 0)).getTime();
          cmp = dateB - dateA;
          break;
        }
      }
      if (cmp !== 0) return cmp;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    const total = products.length;
    const totalPages = Math.ceil(total / limit) || 1;
    let startIndex = (page - 1) * limit;

    if (query.cursor && typeof query.cursor === 'string' && query.cursor.trim()) {
      const rawCursor = query.cursor.trim();
      let decodedOffset: number | null = null;
      let decodedId: string | null = null;
      try {
        const decodedStr = Buffer.from(rawCursor, 'base64').toString('utf8');
        const parsed = JSON.parse(decodedStr);
        if (parsed) {
          if (parsed.id) decodedId = String(parsed.id);
          if (typeof parsed.offset === 'number') decodedOffset = parsed.offset;
        }
      } catch {
        decodedId = rawCursor;
      }
      if (decodedId) {
        const foundIdx = products.findIndex(p => String(p.id) === decodedId || String(p.slug) === decodedId);
        if (foundIdx !== -1) {
          startIndex = foundIdx + 1;
        } else if (decodedOffset !== null && !isNaN(decodedOffset) && decodedOffset >= 0) {
          startIndex = decodedOffset;
        }
      } else if (decodedOffset !== null && !isNaN(decodedOffset) && decodedOffset >= 0) {
        startIndex = decodedOffset;
      }
    }

    if (startIndex < 0) startIndex = 0;
    const paginatedItems = products.slice(startIndex, startIndex + limit);
    const nextOffset = startIndex + paginatedItems.length;
    const hasMore = nextOffset < total;
    const lastItem = paginatedItems.length > 0 ? paginatedItems[paginatedItems.length - 1] : null;
    const nextCursor = hasMore && lastItem
      ? Buffer.from(JSON.stringify({ id: String(lastItem.id), offset: nextOffset })).toString('base64')
      : null;

    return {
      items: paginatedItems,
      products: paginatedItems,
      total,
      page: Math.floor(startIndex / limit) + 1,
      limit,
      totalPages,
      hasNextPage: hasMore,
      hasPrevPage: startIndex > 0,
      next_cursor: nextCursor,
      nextCursor: nextCursor,
      has_more: hasMore,
      hasMore: hasMore,
    };
  }

  private normalizeSlugText(raw: string): string {
    return String(raw || '')
      .replace(/\s*[\-\|]\s*(M\.SHOP|MARJAAH|Qatar|Store|Shop).*$/i, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async ensureUniqueSlug(rawSource: string, excludeId?: string): Promise<string> {
    const base = this.normalizeSlugText(rawSource) || `product-${Date.now()}`;
    let existingSlugs = new Set<string>();

    if (this.cachedProducts && this.cachedProducts.length > 0) {
      for (const p of this.cachedProducts) {
        if (excludeId && p.id === excludeId) continue;
        if (p.slug) existingSlugs.add(String(p.slug).toLowerCase());
      }
    } else {
      const snap = await this.firestore.collection('products').where('slug', '>=', base).where('slug', '<=', `${base}\uf8ff`).get();
      snap.docs.forEach((d) => {
        if (excludeId && d.id === excludeId) return;
        const s = (d.data() as any)?.slug;
        if (s) existingSlugs.add(String(s).toLowerCase());
      });
    }

    if (!existingSlugs.has(base)) return base;
    let counter = 2;
    let candidate = `${base}-${counter}`;
    while (existingSlugs.has(candidate)) {
      counter++;
      candidate = `${base}-${counter}`;
    }
    return candidate;
  }

  async findOne(slugOrId: string) {
    let rawKey = slugOrId;
    try {
      rawKey = decodeURIComponent(slugOrId);
    } catch (_) {}
    rawKey = String(rawKey || '').trim();
    const lowerSlug = rawKey.toLowerCase();

    // 1. Try by doc ID
    const doc = await this.firestore.doc('products', rawKey).get();
    let product: any = null;

    if (doc.exists) {
      product = { id: doc.id, ...doc.data() };
    } else {
      // 2. Try exact slug in Firestore
      let snap = await this.firestore.collection('products')
        .where('slug', '==', rawKey)
        .limit(1)
        .get();

      if (snap.empty && lowerSlug !== rawKey) {
        snap = await this.firestore.collection('products')
          .where('slug', '==', lowerSlug)
          .limit(1)
          .get();
      }

      if (!snap.empty) {
        product = { id: snap.docs[0].id, ...snap.docs[0].data() };
      } else {
        // 3. Fallback search in cached catalog (handles case-insensitive / urlSlug / sanitized matches)
        const all = await this.getAllProducts();
        const found = all.find((p) => {
          const ps = String(p.slug || '').toLowerCase();
          const pus = String(p.urlSlug || '').toLowerCase();
          return p.id === rawKey || ps === lowerSlug || pus === lowerSlug;
        });
        if (found) product = found;
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
      const parsed = this.parseNaturalQuery(query.search);
      if (parsed.minPrice !== null) {
        products = products.filter(p => Number(p.price) >= parsed.minPrice!);
      }
      if (parsed.maxPrice !== null) {
        products = products.filter(p => Number(p.price) <= parsed.maxPrice!);
      }
      if (parsed.termVariants.length > 0) {
        products = products.filter(p => {
          const target = [
            p.name || '',
            p.brand || '',
            p.description || '',
            p.category_name || '',
            p.subcategory_name || '',
            ...(Array.isArray(p.tags) ? p.tags : []),
          ].join(' ').toLowerCase();
          return parsed.termVariants.every(variants => variants.some(v => target.includes(v)));
        });
      }
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

    // 1b. Subcategories with exact live product counts in this category
    const subMap = new Map<string, { id?: string; name: string; slug: string; count: number }>();
    for (const p of products) {
      const s = (p.subcategory || p.subcategory_name || '').trim();
      const sSlug = p.subcategory_slug || (s ? s.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '');
      const sId = p.subcategory_id;
      if (s) {
        const key = sSlug || s.toLowerCase();
        const existing = subMap.get(key) || { id: sId, name: s, slug: sSlug, count: 0 };
        existing.count += 1;
        if (!existing.id && sId) existing.id = sId;
        subMap.set(key, existing);
      }
    }
    const subcategories = Array.from(subMap.values()).sort((a, b) => b.count - a.count);

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
      subcategories,
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
  // NATURAL LANGUAGE SEARCH PARSER & INTENT RECOGNITION
  // ═══════════════════════════════════════════════════════════════════════════
  private parseNaturalQuery(raw: string): {
    raw: string;
    cleanText: string;
    terms: string[];
    termVariants: string[][];
    minPrice: number | null;
    maxPrice: number | null;
  } {
    if (!raw) {
      return { raw: '', cleanText: '', terms: [], termVariants: [], minPrice: null, maxPrice: null };
    }
    let str = raw.trim().toLowerCase();
    let minPrice: number | null = null;
    let maxPrice: number | null = null;

    // 1. Between X and Y [currency]
    const betweenMatch = str.match(
      /between\s+(\d+(?:\.\d+)?)\s*(?:and|-|to)\s*(\d+(?:\.\d+)?)(?:\s*(?:qar|qr|riyal|riyals|dhs|aed|usd|\$))?/i,
    );
    if (betweenMatch) {
      const p1 = parseFloat(betweenMatch[1]);
      const p2 = parseFloat(betweenMatch[2]);
      minPrice = Math.min(p1, p2);
      maxPrice = Math.max(p1, p2);
      str = str.replace(betweenMatch[0], ' ');
    }

    // 2. Under / Below / Less than / Max / <= / Up to X [currency] (EN + AR)
    const underMatch =
      str.match(
        /(?:under|below|less\s+than|max|up\s+to|within|<=\s*|<\s*)\s*(\d+(?:\.\d+)?)(?:\s*(?:qar|qr|riyal|riyals|dhs|aed|usd|\$))?/i,
      ) ||
      str.match(
        /(\d+(?:\.\d+)?)\s*(?:qar|qr|riyal|riyals|dhs|aed|usd|\$)?\s*(?:and\s+below|or\s+less|max)/i,
      ) ||
      str.match(
        /(?:أقل\s+من|اقل\s+من|تحت|دون|بحد\s+أقصى|لغاية|حتى)\s*(\d+(?:\.\d+)?)(?:\s*(?:ريال|ر\.?ق|qar))?/i,
      );
    if (underMatch) {
      maxPrice = parseFloat(underMatch[1]);
      str = str.replace(underMatch[0], ' ');
    }

    // 3. Above / Over / More than / Min / >= / From X [currency] (EN + AR)
    const aboveMatch =
      str.match(
        /(?:above|over|more\s+than|min|starting\s+from|from|>=\s*|>\s*)\s*(\d+(?:\.\d+)?)(?:\s*(?:qar|qr|riyal|riyals|dhs|aed|usd|\$))?/i,
      ) ||
      str.match(
        /(\d+(?:\.\d+)?)\s*(?:qar|qr|riyal|riyals|dhs|aed|usd|\$)?\s*(?:and\s+above|or\s+more|min)/i,
      ) ||
      str.match(
        /(?:أكثر\s+من|اكثر\s+من|فوق|أعلى\s+من|اعلى\s+من)\s*(\d+(?:\.\d+)?)(?:\s*(?:ريال|ر\.?ق|qar))?/i,
      );
    if (aboveMatch) {
      minPrice = parseFloat(aboveMatch[1]);
      str = str.replace(aboveMatch[0], ' ');
    }

    // Clean currency symbols and orphan words
    str = str.replace(/\b(qar|qr|riyal|riyals|dhs|aed|usd)\b/gi, ' ');
    str = str.replace(/(?:ريال|قطري|ر\.ق)/g, ' ');
    str = str.replace(/[^\w\s\u0600-\u06FF]/g, ' ');
    const stopWords = new Set([
      'in', 'for', 'with', 'of', 'the', 'a', 'an', 'at', 'by',
      'under', 'below', 'above', 'over', 'between', 'and', 'or', 'to',
      'من', 'في', 'مع', 'بين', 'تحت', 'فوق', 'أقل', 'اقل', 'أكثر', 'اكثر', 'و', 'أو', 'او',
    ]);
    const terms = str
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 0 && !stopWords.has(t));

    const synonymGroups = [
      ['magsafe', 'mag safe', 'magnetic', 'magnet'],
      ['case', 'cases', 'cover', 'covers', 'pouch', 'pouches', 'shell', 'bumper'],
      ['mobile', 'mobiles', 'phone', 'phones', 'cellphone', 'cellphones', 'smartphone', 'smartphones', 'iphone', 'samsung'],
      ['watch', 'watches', 'smartwatch', 'smartwatches'],
      ['laptop', 'laptops', 'notebook', 'notebooks', 'computer', 'computers', 'pc'],
      ['earbud', 'earbuds', 'earphone', 'earphones', 'headphone', 'headphones', 'headset', 'headsets', 'audio', 'airpods'],
      ['charger', 'chargers', 'charging', 'adapter', 'adapters', 'gan'],
      ['cable', 'cables', 'cord', 'cords', 'wire', 'wires'],
      ['powerbank', 'powerbanks', 'power bank', 'power banks', 'portable charger'],
      ['speaker', 'speakers'],
      ['screen', 'protector', 'protectors', 'tempered', 'protection'],
      ['camera', 'cameras', 'lens', 'lenses'],
      ['car', 'holder', 'mount', 'stand'],
    ];

    // Build compound words (e.g. ['mag', 'safe'] -> 'magsafe')
    const compoundTokens: string[] = [];
    for (let i = 0; i < terms.length - 1; i++) {
      compoundTokens.push(terms[i] + terms[i + 1]);
      compoundTokens.push(terms[i] + '-' + terms[i + 1]);
    }

    const termVariants = terms.map((term, idx) => {
      const variants = new Set<string>([term]);
      let stem = term;
      if (term.endsWith('ies') && term.length > 4) stem = term.slice(0, -3) + 'y';
      else if (term.endsWith('es') && term.length > 4) stem = term.slice(0, -2);
      else if (term.endsWith('s') && term.length > 3) stem = term.slice(0, -1);
      variants.add(stem);

      // If this term is part of a compound word, add compound variants
      if (idx < terms.length - 1) {
        variants.add(term + terms[idx + 1]);
        variants.add(term + '-' + terms[idx + 1]);
      }
      if (idx > 0) {
        variants.add(terms[idx - 1] + term);
        variants.add(terms[idx - 1] + '-' + term);
      }

      for (const group of synonymGroups) {
        if (group.includes(term) || group.includes(stem)) {
          group.forEach(w => variants.add(w));
        }
      }
      return Array.from(variants);
    });

    return {
      raw,
      cleanText: terms.join(' '),
      terms,
      termVariants,
      minPrice,
      maxPrice,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIFIED CATALOG SEARCH (Products, Categories & Subcategories)
  // ═══════════════════════════════════════════════════════════════════════════
  async searchCatalog(q: string, limit = 8) {
    if (!q || !q.trim()) {
      return {
        query: '',
        parsedIntent: null,
        categories: [],
        subcategories: [],
        products: [],
        totalProducts: 0,
      };
    }

    const rawQuery = q.trim();
    const parsed = this.parseNaturalQuery(rawQuery);
    const queryLower = parsed.cleanText.toLowerCase() || rawQuery.toLowerCase();
    const terms = parsed.terms.length > 0 ? parsed.terms : queryLower.split(/\s+/).filter(Boolean);
    const termVariants = parsed.termVariants;

    // 1. Search Categories
    let allCategories: any[] = [];
    try {
      const catPath = path.resolve(process.cwd(), '.categories-cache.json');
      if (fs.existsSync(catPath)) {
        allCategories = JSON.parse(fs.readFileSync(catPath, 'utf-8'));
      }
    } catch (_) {}
    if (allCategories.length === 0) {
      const snap = await this.firestore.collection('categories').get();
      allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const matchedCategories = allCategories
      .filter(c => {
        const target = [c.name || '', c.name_ar || '', c.slug || ''].join(' ').toLowerCase();
        if (termVariants.length > 0) {
          return termVariants.some(variants => variants.some(v => target.includes(v)));
        }
        return terms.some(t => target.includes(t)) || target.includes(queryLower);
      })
      .slice(0, 6);

    // 2. Search Subcategories
    let allSubcategories: any[] = [];
    try {
      const subPath = path.resolve(process.cwd(), '.subcategories-cache.json');
      if (fs.existsSync(subPath)) {
        allSubcategories = JSON.parse(fs.readFileSync(subPath, 'utf-8'));
      }
    } catch (_) {}
    if (allSubcategories.length === 0) {
      const snap = await this.firestore.collection('subcategories').get();
      allSubcategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const matchedSubcategories = allSubcategories
      .filter(s => {
        if (s.is_active === false) return false;
        const target = [
          s.name || '',
          s.name_ar || '',
          s.slug || '',
          s.category_name || '',
          s.category_slug || '',
        ].join(' ').toLowerCase();
        if (termVariants.length > 0) {
          return termVariants.some(variants => variants.some(v => target.includes(v)));
        }
        return terms.some(t => target.includes(t)) || target.includes(queryLower);
      })
      .slice(0, 10);

    // 3. Search Products across full dataset
    const allProducts = await this.getAllProducts();
    const activeProducts = allProducts.filter(
      p => p.status !== 'hidden' && p.status !== 'pending_approval' && p.status !== 'rejected' && p.is_active !== false,
    );

    const safeStr = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val.toLowerCase();
      if (Array.isArray(val)) return val.map(safeStr).join(' ');
      if (typeof val === 'object') return Object.values(val).map(safeStr).join(' ');
      return String(val).toLowerCase();
    };

    const scoredProducts: { product: any; score: number }[] = [];

    for (const p of activeProducts) {
      const price = Number(p.price) || 0;
      if (parsed.minPrice !== null && price < parsed.minPrice) continue;
      if (parsed.maxPrice !== null && price > parsed.maxPrice) continue;

      const name = safeStr(p.name);
      const nameAr = safeStr(p.name_ar);
      const sku = safeStr(p.sku);
      const brand = safeStr(p.brand || p.brand_name || p.brand_slug);
      const cat = safeStr(p.category_name || p.category || p.category_slug);
      const sub = safeStr(p.subcategory_name || p.subcategory || p.subcategory_slug);
      const compat = safeStr(p.compatibility);
      const colour = safeStr(p.colour || p.color);
      const shortDesc = safeStr(p.short_description || p.short_description_ar);
      const desc = safeStr(p.description || p.description_ar);
      const specText = safeStr(p.specifications);
      const tags = safeStr(p.tags);

      const target = [name, nameAr, sku, brand, cat, sub, compat, colour, specText, shortDesc, desc, tags].join(' ');
      const targetSpaceless = target.replace(/[\s\-_/.,()+]+/g, '');

      let matchesAll = true;
      let score = 0;

      // Exact phrase bonus
      if (queryLower && name.includes(queryLower)) {
        score += 120;
      } else if (queryLower && (compat.includes(queryLower) || sub.includes(queryLower))) {
        score += 60;
      } else if (queryLower && target.includes(queryLower)) {
        score += 40;
      }

      if (termVariants.length > 0) {
        for (const variants of termVariants) {
          let variantMatched = false;
          for (const v of variants) {
            const vSpaceless = v.replace(/[\s\-_/.,()+]+/g, '');
            if (target.includes(v) || (vSpaceless.length > 2 && targetSpaceless.includes(vSpaceless))) {
              variantMatched = true;
              if (name.includes(v)) score += 25;
              if (compat.includes(v)) score += 20;
              if (sub.includes(v)) score += 20;
              if (brand.includes(v)) score += 15;
              if (cat.includes(v)) score += 10;
              if (specText.includes(v)) score += 10;
              if (desc.includes(v)) score += 5;
              break;
            }
          }
          if (!variantMatched) {
            matchesAll = false;
            break;
          }
        }
      } else if (terms.length > 0) {
        matchesAll = terms.every(t => target.includes(t) || targetSpaceless.includes(t.replace(/[\s\-_/]+/g, '')));
      }

      if (matchesAll) {
        if (p.is_featured) score += 5;
        if (Number(p.rating) >= 4.5) score += 5;
        scoredProducts.push({ product: p, score });
      }
    }

    // Sort by relevance score descending
    scoredProducts.sort((a, b) => b.score - a.score);
    const matchingProducts = scoredProducts.map(sp => sp.product);

    return {
      query: rawQuery,
      parsedIntent: {
        cleanText: parsed.cleanText,
        minPrice: parsed.minPrice,
        maxPrice: parsed.maxPrice,
        terms: parsed.terms,
      },
      categories: matchedCategories,
      subcategories: matchedSubcategories,
      products: matchingProducts.slice(0, limit),
      totalProducts: matchingProducts.length,
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

  private async resolveCategoryAndSubcategory(data: any): Promise<{
    category_id?: string;
    category_slug?: string;
    category_name?: string;
    category?: string;
    subcategory_id?: string;
    subcategory_slug?: string;
    subcategory_name?: string;
    subcategory?: string;
  }> {
    const result: any = {};

    // 1. Resolve Category
    const catSearch = data.category_id || data.category_slug || data.category;
    let resolvedCat: any = null;
    if (catSearch) {
      try {
        const catPath = path.resolve(process.cwd(), '.categories-cache.json');
        if (fs.existsSync(catPath)) {
          const cats = JSON.parse(fs.readFileSync(catPath, 'utf-8'));
          resolvedCat = cats.find((c: any) =>
            c.id === catSearch ||
            c.slug === catSearch ||
            c.slug === String(catSearch).toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
            (c.name || '').toLowerCase() === String(catSearch).toLowerCase()
          );
        }
      } catch (_) {}

      if (!resolvedCat && data.category_id) {
        const doc = await this.firestore.doc('categories', data.category_id).get();
        if (doc.exists) resolvedCat = { id: doc.id, ...doc.data() };
      }
      if (!resolvedCat && catSearch) {
        const snap = await this.firestore.collection('categories')
          .where('slug', '==', String(catSearch).toLowerCase().replace(/[^a-z0-9]+/g, '-'))
          .limit(1)
          .get();
        if (!snap.empty) {
          const d = snap.docs[0];
          resolvedCat = { id: d.id, ...d.data() };
        }
      }
    }

    if (resolvedCat) {
      result.category_id = resolvedCat.id;
      result.category_slug = resolvedCat.slug;
      result.category_name = resolvedCat.name;
      result.category = resolvedCat.name;
    } else if (data.category) {
      result.category = data.category;
      result.category_slug = data.category_slug || String(data.category).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    // 2. Resolve Subcategory
    const subSearch = data.subcategory_id || data.subcategory_slug || data.subcategory;
    let resolvedSub: any = null;
    if (subSearch) {
      try {
        const subPath = path.resolve(process.cwd(), '.subcategories-cache.json');
        if (fs.existsSync(subPath)) {
          const subs = JSON.parse(fs.readFileSync(subPath, 'utf-8'));
          resolvedSub = subs.find((s: any) =>
            s.id === subSearch ||
            s.slug === subSearch ||
            s.slug === String(subSearch).toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
            (s.name || '').toLowerCase() === String(subSearch).toLowerCase()
          );
        }
      } catch (_) {}

      if (!resolvedSub && data.subcategory_id) {
        const doc = await this.firestore.doc('subcategories', data.subcategory_id).get();
        if (doc.exists) resolvedSub = { id: doc.id, ...doc.data() };
      }
      if (!resolvedSub && subSearch) {
        const snap = await this.firestore.collection('subcategories')
          .where('slug', '==', String(subSearch).toLowerCase().replace(/[^a-z0-9]+/g, '-'))
          .limit(1)
          .get();
        if (!snap.empty) {
          const d = snap.docs[0];
          resolvedSub = { id: d.id, ...d.data() };
        }
      }
    }

    if (resolvedSub) {
      // Validate relationship: subcategory must belong to the selected category
      if (result.category_id || result.category_slug) {
        const matchCat =
          (result.category_id && (resolvedSub.category_id === result.category_id || resolvedSub.category_slug === result.category_id)) ||
          (result.category_slug && (resolvedSub.category_slug === result.category_slug || resolvedSub.category_id === result.category_slug));
        if (!matchCat) {
          throw new BadRequestException(
            `Subcategory "${resolvedSub.name}" does not belong to category "${result.category_name || result.category}". Expected parent: "${resolvedSub.category_name || resolvedSub.category_slug}"`
          );
        }
      } else {
        result.category_id = resolvedSub.category_id;
        result.category_slug = resolvedSub.category_slug;
        result.category_name = resolvedSub.category_name;
        result.category = resolvedSub.category_name;
      }

      result.subcategory_id = resolvedSub.id;
      result.subcategory_slug = resolvedSub.slug;
      result.subcategory_name = resolvedSub.name;
      result.subcategory = resolvedSub.name;
    } else if (data.subcategory) {
      result.subcategory = data.subcategory;
      result.subcategory_slug = data.subcategory_slug || String(data.subcategory).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    return result;
  }

  async create(data: any, adminUser?: any) {
    if (!data.name || !data.price) {
      throw new BadRequestException('Product name and price are required');
    }
    const rawSlugSource = data.slug || data.seo_title || data.name || data.sku;
    const slug = await this.ensureUniqueSlug(rawSlugSource);
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

    const catSub = await this.resolveCategoryAndSubcategory(data);

    const origPriceNum = data.original_price ? Number(data.original_price) : null;
    const sellPriceNum = Number(data.price);
    const hasOfferPriceDrop = Boolean(origPriceNum && !isNaN(sellPriceNum) && origPriceNum > sellPriceNum);
    const isOfferFlag = Boolean(data.is_offer || data.is_on_sale || hasOfferPriceDrop);
    const computedDiscountPct =
      data.discount_percent !== undefined && data.discount_percent !== null && data.discount_percent !== ''
        ? Number(data.discount_percent)
        : hasOfferPriceDrop && origPriceNum
          ? Math.round(((origPriceNum - sellPriceNum) / origPriceNum) * 100)
          : null;

    const product = {
      ...data,
      ...catSub,
      slug,
      sku: data.sku ? String(data.sku).trim() : undefined,
      image: primaryImage,
      images,
      image_alts: data.image_alts || {},
      price: sellPriceNum,
      original_price: origPriceNum,
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
      is_offer: isOfferFlag,
      is_on_sale: isOfferFlag,
      offer_type: data.offer_type ? String(data.offer_type).trim() : '',
      offer_title: data.offer_title ? String(data.offer_title).trim() : '',
      offer_badge: data.offer_badge ? String(data.offer_badge).trim() : '',
      offer_description: data.offer_description ? String(data.offer_description).trim() : '',
      discount_percent: computedDiscountPct,
      offer_previous_state:
        data.offer_previous_state && typeof data.offer_previous_state === 'object'
          ? data.offer_previous_state
          : null,
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
    if (requiresApproval && !isSuperUser && this.adminService && adminUser) {
      this.invalidateCache();
    } else {
      this.upsertCachedProduct({ id: ref.id, ...product });
    }

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

    if (
      data.category !== undefined ||
      data.category_id !== undefined ||
      data.category_slug !== undefined ||
      data.subcategory !== undefined ||
      data.subcategory_id !== undefined ||
      data.subcategory_slug !== undefined
    ) {
      const existingData = doc.data() as any;
      const mergedForCatSub = {
        category_id: data.category_id !== undefined ? data.category_id : existingData.category_id,
        category_slug: data.category_slug !== undefined ? data.category_slug : existingData.category_slug,
        category: data.category !== undefined ? data.category : existingData.category,
        subcategory_id: data.subcategory_id !== undefined ? data.subcategory_id : existingData.subcategory_id,
        subcategory_slug: data.subcategory_slug !== undefined ? data.subcategory_slug : existingData.subcategory_slug,
        subcategory: data.subcategory !== undefined ? data.subcategory : existingData.subcategory,
      };
      const catSub = await this.resolveCategoryAndSubcategory(mergedForCatSub);
      Object.assign(updateData, catSub);
    }

    if (data.images && Array.isArray(data.images)) {
      updateData.images = await Promise.all(
        data.images.map(async (img: any, idx: number) => {
          if (typeof img === 'string' && img.startsWith('data:')) {
            const res = await this.uploadService.uploadBase64(img, `prod_${id}_${idx}.jpg`, 'products');
            return res.url;
          }
          return img;
        }),
      );
      if (updateData.images.length > 0) {
        updateData.image = updateData.images[0];
      } else if (!data.image) {
        updateData.image = 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg';
      }
    } else if (data.image && typeof data.image === 'string' && data.image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(data.image, `prod_${id}.jpg`, 'products');
      updateData.image = uploadRes.url;
    }

    if (data.price !== undefined) {
      const priceNum = Number(data.price);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new BadRequestException('Invalid product price');
      }
      updateData.price = priceNum;
    }
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
    if (data.seo_title !== undefined) updateData.seo_title = String(data.seo_title).trim();
    if (data.meta_description !== undefined) updateData.meta_description = String(data.meta_description).trim();
    if (data.slug !== undefined) {
      const slugSource = String(data.slug).trim() || String(data.seo_title || '').trim() || String(data.name || doc.data()?.name || '').trim();
      updateData.slug = await this.ensureUniqueSlug(slugSource, id);
    } else if (data.seo_title && !doc.data()?.slug) {
      updateData.slug = await this.ensureUniqueSlug(String(data.seo_title), id);
    }

    if (data.is_featured !== undefined || data.isFeatured !== undefined) {
      updateData.is_featured = Boolean(data.is_featured ?? data.isFeatured);
    }
    if (data.is_favorite !== undefined || data.isFavorite !== undefined || data.is_liked !== undefined || data.isLiked !== undefined) {
      const favVal = Boolean(data.is_favorite ?? data.isFavorite ?? data.is_liked ?? data.isLiked);
      updateData.is_favorite = favVal;
      updateData.is_liked = favVal;
    }
    if (data.is_offer !== undefined || data.is_on_sale !== undefined) {
      const offerVal = Boolean(data.is_offer ?? data.is_on_sale);
      updateData.is_offer = offerVal;
      updateData.is_on_sale = offerVal;
    }
    if (data.offer_type !== undefined) updateData.offer_type = data.offer_type ? String(data.offer_type).trim() : '';
    if (data.offer_title !== undefined) updateData.offer_title = data.offer_title ? String(data.offer_title).trim() : '';
    if (data.offer_badge !== undefined) updateData.offer_badge = data.offer_badge ? String(data.offer_badge).trim() : '';
    if (data.offer_description !== undefined) updateData.offer_description = data.offer_description ? String(data.offer_description).trim() : '';
    if (data.discount_percent !== undefined) {
      updateData.discount_percent = data.discount_percent !== null && data.discount_percent !== '' ? Number(data.discount_percent) : null;
    }
    if (data.offer_previous_state !== undefined) {
      updateData.offer_previous_state =
        data.offer_previous_state && typeof data.offer_previous_state === 'object'
          ? data.offer_previous_state
          : null;
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
    const updatedProduct = { id, ...doc.data(), ...updateData };
    this.upsertCachedProduct(updatedProduct);
    return updatedProduct;
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
    this.removeCachedProduct(id);
    return { success: true, message: `Product ${id} deleted` };
  }
}
