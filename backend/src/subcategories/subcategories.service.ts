import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FirestoreService } from '../firebase/firestore.service';
import { UploadService } from '../upload/upload.service';
import { CategoriesService } from '../categories/categories.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class SubcategoriesService implements OnModuleInit {
  private readonly logger = new Logger(SubcategoriesService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly uploadService: UploadService,
    @Optional() @Inject(forwardRef(() => CategoriesService)) private readonly categoriesService?: CategoriesService,
    @Optional() @Inject(forwardRef(() => ProductsService)) private readonly productsService?: ProductsService,
  ) {}

  private cachedSubcategories: any[] | null = null;
  private cacheExpiresAt = 0;
  private isRefreshing = false;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour memory TTL
  private readonly DISK_CACHE_PATH = path.resolve(process.cwd(), '.subcategories-cache.json');

  async onModuleInit() {
    // 1. Instantly hydrate from local disk cache (< 2ms)
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        const raw = fs.readFileSync(this.DISK_CACHE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cachedSubcategories = parsed;
          this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
          this.logger.log(`Hydrated ${parsed.length} subcategories instantly from local disk cache.`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not read local subcategories disk cache: ${e.message}`);
    }

    // 2. Pre-fetch fresh data from Firestore in background
    this.refreshCacheInBackground().catch(() => {});
  }

  invalidateCache() {
    this.cachedSubcategories = null;
    this.cacheExpiresAt = 0;
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        fs.unlinkSync(this.DISK_CACHE_PATH);
      }
    } catch (_) {}
    try {
      this.categoriesService?.invalidateCache();
    } catch (_) {}
  }

  private async refreshCacheInBackground(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    try {
      await this.fetchFromFirestore();
    } catch (err: any) {
      this.logger.error('Background subcategories refresh failed:', err?.message || err);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async getProductCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    try {
      let products: any[] | null = null;
      const productsCachePath = path.resolve(process.cwd(), '.products-cache.json');
      if (fs.existsSync(productsCachePath)) {
        const raw = fs.readFileSync(productsCachePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) products = parsed;
      }
      if (!products) {
        const snap = await this.firestore.collection('products').get();
        products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      for (const p of products) {
        if (p.status === 'hidden' || p.status === 'pending_approval' || p.status === 'rejected' || p.is_active === false) continue;
        const subId = p.subcategory_id;
        const subSlug = p.subcategory_slug || (p.subcategory ? String(p.subcategory).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '');
        if (subId) {
          counts[subId] = (counts[subId] || 0) + 1;
        }
        if (subSlug) {
          counts[subSlug] = (counts[subSlug] || 0) + 1;
        }
      }
    } catch (_) {}
    return counts;
  }

  private async fetchFromFirestore(): Promise<any[]> {
    const snap = await this.firestore.collection('subcategories').get();
    const subcategories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const counts = await this.getProductCounts();

    for (const sub of subcategories) {
      const countById = sub.id ? counts[sub.id] : undefined;
      const countBySlug = sub.slug ? counts[sub.slug] : undefined;
      sub.product_count = countById !== undefined ? countById : (countBySlug !== undefined ? countBySlug : 0);
      if (sub.is_active === undefined) {
        sub.is_active = true;
      }
      if (sub.order === undefined) {
        sub.order = 0;
      }
      if (!sub.color) {
        sub.color = '#4063B2';
      }
      if (!sub.icon) {
        sub.icon = 'tag';
      }
    }

    subcategories.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || '')));

    this.cachedSubcategories = subcategories;
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;

    try {
      fs.promises.writeFile(this.DISK_CACHE_PATH, JSON.stringify(subcategories)).catch(() => {});
    } catch (_) {}

    return subcategories;
  }

  private slugify(text: string): string {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(categoryId?: string, categorySlug?: string, includeInactive = false) {
    const now = Date.now();
    let allSubs: any[];

    if (this.cachedSubcategories && now < this.cacheExpiresAt) {
      allSubs = this.cachedSubcategories;
    } else if (this.cachedSubcategories && this.cachedSubcategories.length > 0) {
      this.refreshCacheInBackground().catch(() => {});
      allSubs = this.cachedSubcategories;
    } else {
      allSubs = await this.fetchFromFirestore();
    }

    // Attach latest product counts dynamically
    const counts = this.getProductCounts();
    let results = allSubs.map(s => {
      const c = counts[s.id] !== undefined ? counts[s.id] : (counts[s.slug] !== undefined ? counts[s.slug] : 0);
      return { ...s, product_count: c };
    });

    if (!includeInactive) {
      results = results.filter(s => s.is_active !== false);
    }

    if (categoryId || categorySlug) {
      const targetCatId = (categoryId || '').toLowerCase().trim();
      const targetCatSlug = (categorySlug || '').toLowerCase().trim();

      results = results.filter(s => {
        const sCatId = String(s.category_id || '').toLowerCase();
        const sCatSlug = String(s.category_slug || '').toLowerCase();

        if (targetCatId && (sCatId === targetCatId || sCatSlug === targetCatId)) return true;
        if (targetCatSlug && (sCatSlug === targetCatSlug || sCatId === targetCatSlug)) return true;
        return false;
      });
    }

    return results;
  }

  async findOne(slugOrId: string) {
    // 1. Try from in-memory cache first
    if (this.cachedSubcategories) {
      const found = this.cachedSubcategories.find(
        s => s.id === slugOrId || s.slug === slugOrId
      );
      if (found) {
        const counts = this.getProductCounts();
        const c = counts[found.id] !== undefined ? counts[found.id] : (counts[found.slug] !== undefined ? counts[found.slug] : 0);
        return { ...found, product_count: c };
      }
    }

    // 2. Query Firestore by ID
    const doc = await this.firestore.doc('subcategories', slugOrId).get();
    if (doc.exists) {
      const data = { id: doc.id, ...doc.data() as any };
      const counts = this.getProductCounts();
      data.product_count = counts[data.id] !== undefined ? counts[data.id] : (counts[data.slug] !== undefined ? counts[data.slug] : 0);
      return data;
    }

    // 3. Query Firestore by Slug
    const snap = await this.firestore.collection('subcategories')
      .where('slug', '==', slugOrId)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new NotFoundException(`Subcategory not found: ${slugOrId}`);
    }

    const d = snap.docs[0];
    const data = { id: d.id, ...d.data() as any };
    const counts = this.getProductCounts();
    data.product_count = counts[data.id] !== undefined ? counts[data.id] : (counts[data.slug] !== undefined ? counts[data.slug] : 0);
    return data;
  }

  async create(data: any) {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Subcategory name is required');
    }
    const name = data.name.trim();
    const slug = data.slug && data.slug.trim() ? this.slugify(data.slug) : this.slugify(name);

    if (!data.category_id && !data.category_slug) {
      throw new BadRequestException('Parent category is required');
    }

    // Verify parent category exists and resolve its canonical details
    let parentCat: any = null;
    if (data.category_id) {
      const catDoc = await this.firestore.doc('categories', data.category_id).get();
      if (catDoc.exists) {
        parentCat = { id: catDoc.id, ...catDoc.data() };
      }
    }
    if (!parentCat && (data.category_slug || data.category_id)) {
      const searchVal = data.category_slug || data.category_id;
      const catSnap = await this.firestore.collection('categories')
        .where('slug', '==', searchVal)
        .limit(1)
        .get();
      if (!catSnap.empty) {
        const d = catSnap.docs[0];
        parentCat = { id: d.id, ...d.data() };
      }
    }

    if (!parentCat) {
      throw new BadRequestException(`Parent category not found for id/slug: ${data.category_id || data.category_slug}`);
    }

    const now = new Date().toISOString();

    let image = data.image || null;
    if (image && typeof image === 'string' && image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(image, `subcat_${slug}_${Date.now()}.jpg`, 'categories');
      image = uploadRes.url;
    }

    const subcategory = {
      name,
      name_ar: data.name_ar ? data.name_ar.trim() : '',
      slug,
      category_id: parentCat.id,
      category_slug: parentCat.slug,
      category_name: parentCat.name,
      image: image || null,
      color: data.color || '#4063B2',
      icon: data.icon || 'tag',
      order: Number(data.order) || 0,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_at: now,
      updated_at: now,
    };

    const ref = await this.firestore.collection('subcategories').add(subcategory);
    this.invalidateCache();
    return { id: ref.id, ...subcategory, product_count: 0 };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('subcategories', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Subcategory ${id} not found`);
    }

    const existing = doc.data() as any;
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) throw new BadRequestException('Subcategory name cannot be empty');
      updateData.name = name;
    }
    if (data.name_ar !== undefined) {
      updateData.name_ar = String(data.name_ar).trim();
    }
    if (data.slug !== undefined) {
      const s = String(data.slug).trim();
      updateData.slug = s ? this.slugify(s) : (updateData.name ? this.slugify(updateData.name) : existing.slug);
    }
    if (data.color !== undefined) {
      updateData.color = String(data.color).trim();
    }
    if (data.icon !== undefined) {
      updateData.icon = String(data.icon).trim();
    }
    if (data.order !== undefined) {
      updateData.order = Number(data.order) || 0;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = Boolean(data.is_active);
    }

    // Handle parent category update if provided
    if (data.category_id && data.category_id !== existing.category_id) {
      let parentCat: any = null;
      const catDoc = await this.firestore.doc('categories', data.category_id).get();
      if (catDoc.exists) {
        parentCat = { id: catDoc.id, ...catDoc.data() };
      } else {
        const catSnap = await this.firestore.collection('categories')
          .where('slug', '==', data.category_id)
          .limit(1)
          .get();
        if (!catSnap.empty) {
          const d = catSnap.docs[0];
          parentCat = { id: d.id, ...d.data() };
        }
      }
      if (!parentCat) {
        throw new BadRequestException(`New parent category ${data.category_id} not found`);
      }
      updateData.category_id = parentCat.id;
      updateData.category_slug = parentCat.slug;
      updateData.category_name = parentCat.name;
    }

    // Handle image upload/replacement
    if (data.image !== undefined) {
      if (typeof data.image === 'string' && data.image.startsWith('data:')) {
        const uploadRes = await this.uploadService.uploadBase64(data.image, `subcat_${id}_${Date.now()}.jpg`, 'categories');
        updateData.image = uploadRes.url;
      } else {
        updateData.image = data.image;
      }
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    await docRef.update(updateData);

    const newName = updateData.name || existing.name;
    const newSlug = updateData.slug || existing.slug;
    const newCatId = updateData.category_id || existing.category_id;
    const newCatSlug = updateData.category_slug || existing.category_slug;
    const newCatName = updateData.category_name || existing.category_name;
    const changed =
      (newName && newName !== existing.name) ||
      (newSlug && newSlug !== existing.slug) ||
      (newCatId && newCatId !== existing.category_id);

    if (changed) {
      try {
        const prodDocs = new Map<string, any>();
        const pBySubId = await this.firestore.collection('products').where('subcategory_id', '==', id).get();
        pBySubId.docs.forEach((d) => prodDocs.set(d.id, d.ref));
        if (existing.slug) {
          const pBySubSlug = await this.firestore.collection('products').where('subcategory_slug', '==', existing.slug).get();
          pBySubSlug.docs.forEach((d) => prodDocs.set(d.id, d.ref));
        }
        const cascadeUpdate: Record<string, any> = {
          subcategory_id: id,
          subcategory: newName,
          subcategory_name: newName,
          subcategory_slug: newSlug,
          updated_at: new Date().toISOString(),
        };
        if (newCatId && newCatId !== existing.category_id) {
          cascadeUpdate.category_id = newCatId;
          cascadeUpdate.category_slug = newCatSlug;
          cascadeUpdate.category = newCatName;
          cascadeUpdate.category_name = newCatName;
        }
        await Promise.all(Array.from(prodDocs.values()).map((ref) => ref.update(cascadeUpdate)));
      } catch (e: any) {
        this.logger.warn(`Cascade update warning for subcategory ${id}: ${e?.message}`);
      }
    }

    this.invalidateCache();
    if (changed) this.productsService?.invalidateCache(false);

    const counts = await this.getProductCounts();
    const finalSub = { id, ...existing, ...updateData };
    finalSub.product_count = counts[id] !== undefined ? counts[id] : (counts[finalSub.slug] !== undefined ? counts[finalSub.slug] : 0);
    return finalSub;
  }

  async remove(id: string, force = false) {
    const docRef = this.firestore.doc('subcategories', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Subcategory ${id} not found`);
    }

    const data = doc.data() as any;

    // Dependency Validation: Check if active products are assigned to this subcategory
    const counts = await this.getProductCounts();
    const assignedProducts = Math.max(counts[id] || 0, data.slug ? (counts[data.slug] || 0) : 0);

    if (assignedProducts > 0 && !force) {
      throw new BadRequestException(
        `Cannot delete subcategory "${data.name}" because ${assignedProducts} product(s) are currently assigned to it. Please reassign or remove the products first.`
      );
    }

    await docRef.delete();
    this.invalidateCache();
    return { id, success: true, message: `Subcategory "${data.name}" deleted successfully` };
  }
}
