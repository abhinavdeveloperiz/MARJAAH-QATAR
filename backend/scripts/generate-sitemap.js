const fs = require('fs');
const path = require('path');

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function findCacheFile(fileName) {
  const candidates = [
    path.resolve(__dirname, '..', fileName),
    path.resolve(__dirname, '../..', fileName),
    path.resolve(process.cwd(), fileName),
    path.resolve(process.cwd(), 'backend', fileName),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function generateSitemapXml(baseUrl = 'https://www.marjaah.shop') {
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

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- Core Static Pages -->`;

  for (const page of staticPages) {
    const enUrl = page.path ? `${baseUrl}/${page.path}/` : `${baseUrl}/`;
    const arUrl = page.path ? `${baseUrl}/ar/${page.path}/` : `${baseUrl}/ar/`;
    const arPriority = Math.max(0.1, parseFloat(page.priority) - 0.1).toFixed(1);

    xml += `
  <url>
    <loc>${escapeXml(enUrl)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}" />
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
  <url>
    <loc>${escapeXml(arUrl)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}" />
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${arPriority}</priority>
  </url>`;
  }

  // 2. Categories
  xml += `\n\n  <!-- Category Pages -->`;
  const categoriesPath = findCacheFile('.categories-cache.json');
  if (categoriesPath && fs.existsSync(categoriesPath)) {
    try {
      const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
      for (const cat of categories) {
        const slug = cat.slug || (cat.name ? cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : null);
        if (!slug) continue;

        const enUrl = `${baseUrl}/category/${encodeURIComponent(slug)}/`;
        const arUrl = `${baseUrl}/ar/category/${encodeURIComponent(slug)}/`;

        xml += `
  <url>
    <loc>${escapeXml(enUrl)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}" />
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${escapeXml(arUrl)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}" />
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    } catch (e) {
      console.warn('Could not read categories for sitemap:', e.message);
    }
  }

  // 3. Products
  xml += `\n\n  <!-- Product Pages -->`;
  const productsPath = findCacheFile('.products-cache.json');
  if (productsPath && fs.existsSync(productsPath)) {
    try {
      const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      for (const prod of products) {
        if (prod.status === 'hidden' || prod.status === 'inactive' || prod.status === 'pending_approval') continue;
        const slug = prod.slug || prod.urlSlug || prod.id;
        if (!slug) continue;

        const enUrl = `${baseUrl}/product/${encodeURIComponent(slug)}/`;
        const arUrl = `${baseUrl}/ar/product/${encodeURIComponent(slug)}/`;
        const lastModDate = prod.updated_at || prod.updatedAt
          ? new Date(prod.updatedAt?.toDate ? prod.updatedAt.toDate() : (prod.updated_at || prod.updatedAt)).toISOString().split('T')[0]
          : today;

        xml += `
  <url>
    <loc>${escapeXml(enUrl)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}" />
    <lastmod>${lastModDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${escapeXml(arUrl)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(arUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enUrl)}" />
    <lastmod>${lastModDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    } catch (e) {
      console.warn('Could not read products for sitemap:', e.message);
    }
  }

  xml += `\n\n</urlset>\n`;
  return xml;
}

if (require.main === module) {
  const targetCandidates = [
    path.resolve(__dirname, '../../frontend/sitemap.xml'),
    path.resolve(__dirname, '../frontend/sitemap.xml'),
    path.resolve(process.cwd(), 'frontend/sitemap.xml'),
  ];
  const targetFile = targetCandidates.find(p => fs.existsSync(path.dirname(p))) || targetCandidates[0];
  console.log(`Generating sitemap for https://www.marjaah.shop ...`);
  const xml = generateSitemapXml('https://www.marjaah.shop');
  fs.writeFileSync(targetFile, xml, 'utf-8');
  const urlCount = (xml.match(/<url>/g) || []).length;
  console.log(`Successfully generated ${targetFile} with ${urlCount} URLs!`);
}

module.exports = { generateSitemapXml };

