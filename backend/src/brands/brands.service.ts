import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FirestoreService } from '../firebase/firestore.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class BrandsService implements OnModuleInit {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly uploadService: UploadService,
  ) {}

  private cachedBrands: any[] | null = null;
  private cacheExpiresAt = 0;
  private isRefreshing = false;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour memory TTL
  private readonly DISK_CACHE_PATH = path.resolve(process.cwd(), '.brands-cache.json');

  async onModuleInit() {
    // 1. Immediately hydrate from local disk cache (< 2ms)
    try {
      if (fs.existsSync(this.DISK_CACHE_PATH)) {
        const raw = fs.readFileSync(this.DISK_CACHE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cachedBrands = parsed;
          this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
          this.logger.log(`Hydrated ${parsed.length} brands instantly from local disk cache.`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not read local brands disk cache: ${e.message}`);
    }

    // 2. Pre-fetch fresh data from Firestore in background
    this.refreshCacheInBackground().catch(() => {});
  }

  invalidateCache() {
    this.cachedBrands = null;
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
      this.logger.error('Background brands refresh failed:', err?.message || err);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async fetchFromFirestore(): Promise<any[]> {
    const [brandsSnap, productsSnap] = await Promise.all([
      this.firestore.collection('brands').get(),
      this.firestore.collection('products').get(),
    ]);

    const brandCounts: Record<string, number> = {};
    const seenBrandNames = new Set<string>();

    productsSnap.docs.forEach(doc => {
      const p = doc.data() as any;
      const bName = (p.brand || p.brand_name || '').trim();
      if (bName) {
        const key = bName.toLowerCase();
        brandCounts[key] = (brandCounts[key] || 0) + 1;
        seenBrandNames.add(bName);
      }
    });

    const brands = brandsSnap.docs.map(doc => {
      const data = doc.data() as any;
      const name = data.name || doc.id;
      const count = brandCounts[name.toLowerCase()] || brandCounts[doc.id.toLowerCase()] || 0;
      return {
        id: doc.id,
        ...data,
        name,
        product_count: count,
      };
    });

    // Check if there are brands associated with products that are not in the brands collection
    const existingNames = new Set(brands.map(b => (b.name || '').toLowerCase()));
    seenBrandNames.forEach(name => {
      if (!existingNames.has(name.toLowerCase())) {
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        brands.push({
          id,
          name,
          slug: id,
          logo: '',
          product_count: brandCounts[name.toLowerCase()] || 0,
        });
      }
    });

    // Sort by product count descending, then alphabetically
    brands.sort((a, b) => {
      const diff = (b.product_count || 0) - (a.product_count || 0);
      if (diff !== 0) return diff;
      return (a.name || '').localeCompare(b.name || '');
    });

    this.cachedBrands = brands;
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;

    try {
      fs.promises.writeFile(this.DISK_CACHE_PATH, JSON.stringify(brands)).catch(() => {});
    } catch (_) {}

    return brands;
  }

  async findAll() {
    const now = Date.now();
    // 1. Fresh in-memory cache: instant 0ms response
    if (this.cachedBrands && now < this.cacheExpiresAt) {
      return this.cachedBrands;
    }

    // 2. Stale-While-Revalidate: return existing data in 0ms, refresh asynchronously in background
    if (this.cachedBrands && this.cachedBrands.length > 0) {
      this.refreshCacheInBackground().catch(() => {});
      return this.cachedBrands;
    }

    return this.fetchFromFirestore();
  }

  async findOne(id: string) {
    const doc = await this.firestore.doc('brands', id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Brand ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(data: any) {
    if (!data.name) {
      throw new BadRequestException('Brand name is required');
    }

    let logo = data.logo || '';
    if (logo && typeof logo === 'string' && logo.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(
        logo,
        `brand_${data.slug || 'logo'}.jpg`,
        'brands',
      );
      logo = uploadRes.url;
    }

    const brand = {
      ...data,
      logo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const ref = await this.firestore.collection('brands').add(brand);
    this.invalidateCache();
    return { id: ref.id, ...brand };
  }

  async update(id: string, data: any) {
    const docRef = this.firestore.doc('brands', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (data.logo && typeof data.logo === 'string' && data.logo.startsWith('data:')) {
      const uploadRes = await this.uploadService.uploadBase64(
        data.logo,
        `brand_${id}.jpg`,
        'brands',
      );
      updateData.logo = uploadRes.url;
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
    const docRef = this.firestore.doc('brands', id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Brand ${id} not found`);
    }
    await docRef.delete();
    this.invalidateCache();
    return { success: true, message: `Brand ${id} deleted` };
  }
}
