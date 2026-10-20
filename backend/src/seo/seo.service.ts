import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(private readonly firestore: FirestoreService) {}

  async generateSitemapXml(baseUrl: string = 'https://mshop.qa'): Promise<string> {
    const today = new Date().toISOString().split('T')[0];

    // 1. Static Pages
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: 'shop', priority: '0.9', changefreq: 'daily' },
      { path: 'offers', priority: '0.8', changefreq: 'daily' },
      { path: 'about', priority: '0.7', changefreq: 'weekly' },
      { path: 'contact', priority: '0.7', changefreq: 'weekly' },
      { path: 'terms', priority: '0.5', changefreq: 'monthly' },
      { path: 'returns', priority: '0.5', changefreq: 'monthly' },
      { path: 'privacy', priority: '0.5', changefreq: 'monthly' },
      { path: 'track-order', priority: '0.6', changefreq: 'weekly' },
    ];

    let urlsXml = '';

    for (const page of staticPages) {
      const enUrl = page.path ? `${baseUrl}/${page.path}/` : `${baseUrl}/`;
      const arUrl = page.path ? `${baseUrl}/ar/${page.path}/` : `${baseUrl}/ar/`;

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
    <priority>${(parseFloat(page.priority) - 0.1).toFixed(1)}</priority>
  </url>`;
    }

    // 2. Dynamic Categories
    try {
      const catSnap = await this.firestore.collection('categories').get();
      catSnap.forEach((doc) => {
        const cat = doc.data();
        const slug = cat.slug || cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || doc.id;
        const enCatUrl = `${baseUrl}/category/${slug}/`;
        const arCatUrl = `${baseUrl}/ar/category/${slug}/`;

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
      });
    } catch (err: any) {
      this.logger.warn(`Could not load categories for sitemap: ${err.message}`);
    }

    // 3. Dynamic Products
    try {
      const prodSnap = await this.firestore.collection('products').get();
      prodSnap.forEach((doc) => {
        const prod = doc.data();
        if (prod.status === 'hidden' || prod.status === 'inactive') return;

        const slug = prod.slug || prod.urlSlug || doc.id;
        const enProdUrl = `${baseUrl}/product/${slug}/`;
        const arProdUrl = `${baseUrl}/ar/product/${slug}/`;
        const lastModDate = prod.updatedAt ? new Date(prod.updatedAt.toDate ? prod.updatedAt.toDate() : prod.updatedAt).toISOString().split('T')[0] : today;

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
      });
    } catch (err: any) {
      this.logger.warn(`Could not load products for sitemap: ${err.message}`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlsXml}
</urlset>`.trim();
  }

  getRobotsTxt(baseUrl: string = 'https://mshop.qa'): string {
    return `User-agent: *
Allow: /

# Disallow private user and administrative areas
Disallow: /admin/
Disallow: /account/
Disallow: /checkout/
Disallow: /checkout/success/
Disallow: /api/
Disallow: /ar/admin/
Disallow: /ar/account/
Disallow: /ar/checkout/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
`.trim();
  }
}
