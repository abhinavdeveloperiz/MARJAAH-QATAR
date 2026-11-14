import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { FirestoreService } from '../firebase/firestore.service';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private cachedSitemapXml: string | null = null;
  private sitemapExpiresAt = 0;
  private readonly SITEMAP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour memory cache

  constructor(private readonly firestore: FirestoreService) {}

  invalidateSitemapCache() {
    this.cachedSitemapXml = null;
    this.sitemapExpiresAt = 0;
    this.logger.log('Sitemap in-memory cache invalidated');
    this.syncFrontendSitemap().catch((err) => {
      this.logger.warn(`Could not sync frontend sitemap file: ${err.message}`);
    });
  }

  async syncFrontendSitemap(baseUrl: string = 'https://www.marjaah.shop'): Promise<void> {
    try {
      const candidates = [
        path.resolve(process.cwd(), '../frontend/sitemap.xml'),
        path.resolve(process.cwd(), 'frontend/sitemap.xml'),
        path.resolve(__dirname, '../../../frontend/sitemap.xml'),
      ];
      for (const targetPath of candidates) {
        if (fs.existsSync(path.dirname(targetPath))) {
          const xml = await this.generateSitemapXml(baseUrl, true);
          fs.writeFileSync(targetPath, xml, 'utf-8');
          this.logger.log(`Synced sitemap to ${targetPath}`);
          break;
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not sync frontend/sitemap.xml: ${e.message}`);
    }
  }

  async generateSitemapXml(baseUrl: string = 'https://www.marjaah.shop', forceFresh: boolean = false): Promise<string> {
    if (!forceFresh && this.cachedSitemapXml && Date.now() < this.sitemapExpiresAt) {
      return this.cachedSitemapXml;
    }

    baseUrl = baseUrl.replace(/\/+$/, '');
    const today = new Date().toISOString().split('T')[0];

    // 1. Static Pages
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: 'shop', priority: '0.9', changefreq: 'daily' },
      { path: 'categories', priority: '0.8', changefreq: 'daily' },
      { path: 'brands', priority: '0.8', changefreq: 'weekly' },
      { path: 'offers', priority: '0.8', changefreq: 'daily' },
      { path: 'about', priority: '0.7', changefreq: 'weekly' },
      { path: 'contact', priority: '0.7', changefreq: 'weekly' },
      { path: 'terms', priority: '0.5', changefreq: 'monthly' },
      { path: 'returns', priority: '0.5', changefreq: 'monthly' },
      { path: 'privacy', priority: '0.5', changefreq: 'monthly' },
      { path: 'track-order', priority: '0.6', changefreq: 'weekly' },
    ];

    let urlsXml = `\n  <!-- Core Static Pages -->`;

    for (const page of staticPages) {
      const enUrl = page.path ? `${baseUrl}/${page.path}/` : `${baseUrl}/`;
      const arUrl = page.path ? `${baseUrl}/ar/${page.path}/` : `${baseUrl}/ar/`;
      const arPriority = Math.max(0.1, parseFloat(page.priority) - 0.1).toFixed(1);

      urlsXml += `
  <url>
    <loc>${enUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${arUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}" />
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
  <url>
    <loc>${arUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${arUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}" />
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${arPriority}</priority>
  </url>`;
    }

    // 2. Dynamic Categories
    urlsXml += `\n\n  <!-- Category Pages -->`;
    try {
      let categories: any[] = [];
      try {
        const catSnap = await this.firestore.collection('categories').get();
        if (catSnap && !catSnap.empty) {
          catSnap.forEach((doc) => categories.push({ id: doc.id, ...doc.data() }));
        }
      } catch (err: any) {
        this.logger.warn(`Could not load categories from Firestore: ${err.message}. Trying disk cache...`);
      }

      if (categories.length === 0) {
        const catCachePath = path.resolve(process.cwd(), '.categories-cache.json');
        if (fs.existsSync(catCachePath)) {
          categories = JSON.parse(fs.readFileSync(catCachePath, 'utf-8'));
        }
      }

      for (const cat of categories) {
        const slug = cat.slug || cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || cat.id;
        if (!slug) continue;
        const enCatUrl = `${baseUrl}/category/${encodeURIComponent(slug)}/`;
        const arCatUrl = `${baseUrl}/ar/category/${encodeURIComponent(slug)}/`;

        urlsXml += `
  <url>
    <loc>${enCatUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enCatUrl}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${arCatUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enCatUrl}" />
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${arCatUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enCatUrl}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${arCatUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enCatUrl}" />
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    } catch (err: any) {
      this.logger.warn(`Could not load categories for sitemap: ${err.message}`);
    }

    // 3. Dynamic Products
    urlsXml += `\n\n  <!-- Product Pages -->`;
    try {
      let products: any[] = [];
      try {
        const prodSnap = await this.firestore.collection('products').get();
        if (prodSnap && !prodSnap.empty) {
          prodSnap.forEach((doc) => products.push({ id: doc.id, ...doc.data() }));
        }
      } catch (err: any) {
        this.logger.warn(`Could not load products from Firestore: ${err.message}. Trying disk cache...`);
      }

      if (products.length === 0) {
        const prodCachePath = path.resolve(process.cwd(), '.products-cache.json');
        if (fs.existsSync(prodCachePath)) {
          products = JSON.parse(fs.readFileSync(prodCachePath, 'utf-8'));
        }
      }

      for (const prod of products) {
        if (prod.status === 'hidden' || prod.status === 'inactive' || prod.status === 'pending_approval') continue;

        const slug = prod.slug || prod.urlSlug || prod.id;
        if (!slug) continue;
        const enProdUrl = `${baseUrl}/product/${encodeURIComponent(slug)}/`;
        const arProdUrl = `${baseUrl}/ar/product/${encodeURIComponent(slug)}/`;
        const lastModDate = prod.updated_at || prod.updatedAt
          ? new Date(prod.updatedAt?.toDate ? prod.updatedAt.toDate() : (prod.updated_at || prod.updatedAt)).toISOString().split('T')[0]
          : today;

        urlsXml += `
  <url>
    <loc>${enProdUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enProdUrl}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${arProdUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enProdUrl}" />
    <lastmod>${lastModDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${arProdUrl}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enProdUrl}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${arProdUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enProdUrl}" />
    <lastmod>${lastModDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    } catch (err: any) {
      this.logger.warn(`Could not load products for sitemap: ${err.message}`);
    }

    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlsXml}
</urlset>`.trim();

    this.cachedSitemapXml = fullXml;
    this.sitemapExpiresAt = Date.now() + this.SITEMAP_CACHE_TTL_MS;
    return fullXml;
  }

  getRobotsTxt(baseUrl: string = 'https://www.marjaah.shop'): string {
    baseUrl = baseUrl.replace(/\/+$/, '');
    return `User-agent: *
Allow: /

# Disallow private user and administrative areas
Disallow: /admin/
Disallow: /admin-login/
Disallow: /account/
Disallow: /checkout/
Disallow: /checkout-success/
Disallow: /api/
Disallow: /ar/admin/
Disallow: /ar/account/
Disallow: /ar/checkout/
Disallow: /ar/checkout-success/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
`.trim();
  }
}
