import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FirestoreService } from '../firebase/firestore.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly uploadService: UploadService,
  ) {}

  private cachedCategories: any[] | null = null;
  private cacheExpiresAt = 0;
  private isRefreshing = false;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour memory TTL
  private readonly DISK_CACHE_PATH = path.resolve(process.cwd(), '.categories-cache.json');

  async onModuleInit() {
    // 1. Immediately hydrate from local disk cache (< 2ms)
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        const raw = fs.readFileSync(this.DISK_CACHE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cachedCategories = parsed;
          this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
          this.logger.log(`Hydrated ${parsed.length} categories instantly from local disk cache.`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not read local categories disk cache: ${e.message}`);
    }

    // 2. Pre-fetch fresh data from Firestore in background
    this.refreshCacheInBackground().catch(() => {});
  }

  invalidateCache() {
    this.cachedCategories = null;
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
      this.logger.error('Background categories refresh failed:', err?.message || err);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async fetchFromFirestore(): Promise<any[]> {
    const snap = await this.firestore.collection('categories').get();
    const categories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    this.cachedCategories = categories;
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;

    try {
      fs.promises.writeFile(this.DISK_CACHE_PATH, JSON.stringify(categories)).catch(() => {});
    } catch (_) {}

    return categories;
  }

  async findAll() {
    const now = Date.now();
    // 1. Fresh in-memory cache: instant 0ms response
    if (this.cachedCategories && now < this.cacheExpiresAt) {
      return this.cachedCategories;
    }

    // 2. Stale-While-Revalidate: return existing data in 0ms, refresh asynchronously in background
    if (this.cachedCategories && this.cachedCategories.length > 0) {
      this.refreshCacheInBackground().catch(() => {});
      return this.cachedCategories;
    }

    return this.fetchFromFirestore();
  }

  async findOne(slugOrId: string) {
    // Try by ID first
    const doc = await this.firestore.doc('categories', slugOrId).get();
    if (doc.exists) {
      const data = doc.data();
      const subcategories = await this.findSubcategories(doc.id, data?.slug);
      return { id: doc.id, ...data, subcategories };
    }

    // Try by slug
    const snap = await this.firestore.collection('categories')
      .where('slug', '==', slugOrId)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new NotFoundException(`Category not found: ${slugOrId}`);
    }

    const catDoc = snap.docs[0];
    const data = catDoc.data();
    const subcategories = await this.findSubcategories(catDoc.id, data.slug);
    return { id: catDoc.id, ...data, subcategories };
  }

  private async findSubcategories(categoryId: string, slug?: string) {
    let snap = await this.firestore.collection('subcategories')
      .where('category_id', '==', categoryId)
      .get();

    if (snap.empty && slug) {
      snap = await this.firestore.collection('subcategories')
        .where('category_slug', '==', slug)
        .get();
    }

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async create(data: any) {
    if (!data.name || !data.slug) {
      throw new BadRequestException('Name and slug are required');
    }
    const now = new Date().toISOString();

    let image = data.image;
    if (image && typeof image === 'string' && image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(image, `cat_${data.slug}.jpg`, 'categories');
      image = uploadRes.url;
    }

    const category = {
      ...data,
      image: image || null,
      is_featured: Boolean(data.is_featured),
      order: Number(data.order) || 0,
      product_count: Number(data.product_count) || 0,
      created_at: now,
      updated_at: now,
    };

    const ref = await this.firestore.collection('categories').add(category);
    this.invalidateCache();
    return { id: ref.id, ...category };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('categories', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.image && typeof data.image === 'string' && data.image.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(data.image, `cat_${id}.jpg`, 'categories');
      updateData.image = uploadRes.url;
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await docRef.update(updateData);
    this.invalidateCache();
    return { id, ...doc.data(), ...updateData };
  }

  async remove(id: string) {
    const docRef = this.firestore.doc('categories', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    await docRef.delete();
    this.invalidateCache();
    return { success: true, message: `Category ${id} deleted` };
  }
}
