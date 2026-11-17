const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  const saKey = process.env.APP_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (saKey) {
    const sa = JSON.parse(saKey);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    admin.initializeApp({
      projectId: process.env.APP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'marjaah-ab2a6',
    });
  }
}

const db = admin.firestore();

const COLOR_MAP = {
  'mobile-accessories': '#3B82F6',
  'audio': '#8B5CF6',
  'gaming': '#EF4444',
  'laptops-pcs': '#6366F1',
  'home-kitchen': '#F59E0B',
  'personal-care': '#EC4899',
  'tablets': '#14B8A6',
  'networking': '#06B6D4',
  'computer-accessories': '#2563EB',
  'printers-scanners': '#10B981',
  'smart-wearables': '#D946EF',
  'tv-projectors': '#A855F7',
  'storage': '#64748B',
  'toys-hobbies': '#EAB308',
  'software': '#0284C7',
};

const ICON_MAP = {
  'screen-protectors': 'shield',
  'charging-cables': 'zap',
  'earphones-headsets': 'headphones',
  'smart-trackers': 'map-pin',
  'power-banks': 'battery-charging',
  'otg-hubs': 'cpu',
  'cases-covers': 'smartphone',
  'phone-holders-stands': 'maximize',
  'chargers-adapters': 'plug',
  'car-accessories': 'car',
  'selfie-sticks-tripods-gimbals': 'camera',
  'bluetooth-speakers': 'volume-2',
  'mobile-bluetooth-speakers': 'volume-2',
  'smart-watches': 'watch',
  'mobile-smart-watches': 'watch',
  'watch-straps-chargers': 'watch',
  'mobile-watch-straps-chargers': 'watch',
  'headphones': 'headphones',
  'earbuds': 'radio',
  'gaming-consoles': 'gamepad-2',
  'gaming-accessories': 'crosshair',
  'gaming-laptops': 'laptop',
  'gaming-mice': 'mouse',
  'gaming-monitors': 'monitor',
  'gaming-pcs': 'server',
  'headsets': 'headphones',
  'laptops': 'laptop',
  '2-in-1-laptops': 'tablet',
  'desktop-computers': 'hard-drive',
  'business-laptops': 'briefcase',
  'all-in-one-pcs': 'monitor',
  'monitors': 'tv',
  'keyboards-mice': 'keyboard',
  'servers-server-parts': 'server',
  'workstations': 'cpu',
  'cookware': 'utensils',
  'cooler-bags': 'shopping-bag',
  'tea-coffee': 'coffee',
  'home-appliances': 'home',
  'home-fragrance': 'sparkles',
  'kitchen-tools-knives': 'utensils',
  'oral-care': 'smile',
  'grooming': 'scissors',
  'health-care': 'activity',
  'beauty-grooming-accessories': 'sparkles',
  'android-tablets': 'tablet',
  'tablet-accessories': 'pen-tool',
  'routers': 'wifi',
  'switches': 'share-2',
  'network-cables': 'git-commit',
  'wi-fi-extenders-adapters': 'radio',
  'ip-cameras-phones': 'video',
  'docks-hubs-adapters': 'cpu',
  'networking-docks-hubs-adapters': 'cpu',
  'stylus-pens': 'edit-3',
  'webcams': 'video',
  'computer-components': 'layers',
  'laptop-stands-desks': 'layout',
  'mouse-pads-deskpads': 'square',
  'cleaning-kits': 'droplet',
  'laptop-bags': 'briefcase',
  'inks-toners': 'droplet',
  'printers': 'printer',
  'inkjet': 'printer',
  'scanners': 'file-text',
  'projectors': 'video',
  'smart-screens': 'tv',
  'ssds': 'database',
  'rc-cars': 'truck',
  'operating-systems': 'disc',
};

async function organizeDatabase() {
  console.log('🚀 Starting Category & Subcategory Database Synchronization...');

  // 1. Fetch categories
  const catSnap = await db.collection('categories').get();
  const categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Loaded ${categories.length} categories from Firestore.`);

  const catById = {};
  const catBySlug = {};
  categories.forEach(c => {
    catById[c.id] = c;
    catBySlug[c.slug] = c;
  });

  // 2. Fetch existing subcategories
  const subSnap = await db.collection('subcategories').get();
  const subcategories = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Loaded ${subcategories.length} subcategories from Firestore.`);

  // 3. Ensure the 4 additional subcategories exist so Mobile Accessories & Networking products are 100% matched
  const mobileCat = catBySlug['mobile-accessories'];
  const netCat = catBySlug['networking'];

  const extraSubs = [
    {
      name: 'Bluetooth Speakers',
      name_ar: 'سماعات بلوتوث',
      slug: 'mobile-bluetooth-speakers',
      category_id: mobileCat.id,
      category_slug: mobileCat.slug,
      category_name: mobileCat.name,
      image: 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/1794308679803_watch-straps-chargers.jpg',
      color: '#2DD4BF',
      icon: 'volume-2',
      order: 11,
      is_active: true,
    },
    {
      name: 'Smart Watches',
      name_ar: 'ساعات ذكية',
      slug: 'mobile-smart-watches',
      category_id: mobileCat.id,
      category_slug: mobileCat.slug,
      category_name: mobileCat.name,
      image: 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/1794308679803_watch-straps-chargers.jpg',
      color: '#A855F7',
      icon: 'watch',
      order: 12,
      is_active: true,
    },
    {
      name: 'Watch Straps & Chargers',
      name_ar: 'أحزمة وشواحن الساعات',
      slug: 'mobile-watch-straps-chargers',
      category_id: mobileCat.id,
      category_slug: mobileCat.slug,
      category_name: mobileCat.name,
      image: 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/1794308679803_watch-straps-chargers.jpg',
      color: '#EC4899',
      icon: 'watch',
      order: 13,
      is_active: true,
    },
    {
      name: 'Docks, Hubs & Adapters',
      name_ar: 'محطات الإرساء والمحولات',
      slug: 'networking-docks-hubs-adapters',
      category_id: netCat.id,
      category_slug: netCat.slug,
      category_name: netCat.name,
      image: 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/tplink-deco-xe75.jpg',
      color: '#0284C7',
      icon: 'cpu',
      order: 5,
      is_active: true,
    },
  ];

  for (const extra of extraSubs) {
    const exists = subcategories.find(
      s => (s.category_id === extra.category_id || s.category_slug === extra.category_slug) &&
           (s.name.toLowerCase() === extra.name.toLowerCase() || s.slug === extra.slug)
    );
    if (!exists) {
      const now = new Date().toISOString();
      const docData = { ...extra, created_at: now, updated_at: now };
      const ref = await db.collection('subcategories').add(docData);
      subcategories.push({ id: ref.id, ...docData });
      console.log(`Created missing subcategory: ${extra.name} under ${extra.category_name} (${ref.id})`);
    }
  }

  // 4. Update / Enrich subcategories metadata (color, icon, is_active, order)
  console.log('Enriching subcategory attributes (colors, icons, active status)...');
  const subBatch = db.batch();
  let subBatchCount = 0;

  subcategories.forEach((s, idx) => {
    const parentCatSlug = s.category_slug || '';
    const defColor = COLOR_MAP[parentCatSlug] || '#4063B2';
    const defIcon = ICON_MAP[s.slug] || 'tag';

    const updates = {};
    if (!s.color) updates.color = defColor;
    if (!s.icon) updates.icon = defIcon;
    if (s.is_active === undefined) updates.is_active = true;
    if (s.order === undefined) updates.order = idx;

    if (Object.keys(updates).length > 0) {
      subBatch.update(db.collection('subcategories').doc(s.id), updates);
      Object.assign(s, updates);
      subBatchCount++;
    }
  });

  if (subBatchCount > 0) {
    await subBatch.commit();
    console.log(`Updated attributes for ${subBatchCount} subcategories in Firestore.`);
  }

  // 5. Read all products
  const productsCachePath = path.resolve(__dirname, '../../.products-cache.json');
  let products = [];
  if (fs.existsSync(productsCachePath)) {
    products = JSON.parse(fs.readFileSync(productsCachePath, 'utf-8'));
  }
  if (!products || products.length === 0) {
    const pSnap = await db.collection('products').get();
    products = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  console.log(`Loaded ${products.length} products to map.`);

  // 6. Map every product to canonical Category & Subcategory
  const catProductCounts = {};
  const subProductCounts = {};

  let mappedCount = 0;
  let changedProducts = 0;

  for (const p of products) {
    // A. Match parent category
    const cat = categories.find(c =>
      c.id === p.category_id ||
      c.slug === p.category_slug ||
      c.name.toLowerCase() === (p.category || '').toLowerCase()
    );

    if (cat) {
      p.category_id = cat.id;
      p.category_slug = cat.slug;
      p.category_name = cat.name;
      p.category = cat.name;
      catProductCounts[cat.slug] = (catProductCounts[cat.slug] || 0) + 1;
    }

    // B. Match subcategory under this category
    const pSubName = (p.subcategory || p.subcategory_name || '').toLowerCase();
    const pSubSlug = (p.subcategory_slug || '').toLowerCase();

    let sub = subcategories.find(s => {
      const matchCat = (s.category_id === (cat ? cat.id : null)) || (s.category_slug === (cat ? cat.slug : null));
      if (!matchCat) return false;
      const matchName = s.name.toLowerCase() === pSubName;
      const matchSlug = s.slug === pSubSlug || s.slug === pSubName.replace(/[^a-z0-9]+/g, '-');
      const matchId = s.id === p.subcategory_id;
      return matchId || matchName || matchSlug;
    });

    if (!sub && pSubName) {
      // Fallback matching
      sub = subcategories.find(s => {
        const matchCat = (s.category_id === (cat ? cat.id : null)) || (s.category_slug === (cat ? cat.slug : null));
        return matchCat && (s.name.toLowerCase().includes(pSubName) || pSubName.includes(s.name.toLowerCase()));
      });
    }

    if (sub) {
      p.subcategory_id = sub.id;
      p.subcategory_slug = sub.slug;
      p.subcategory_name = sub.name;
      p.subcategory = sub.name;
      subProductCounts[sub.id] = (subProductCounts[sub.id] || 0) + 1;
      subProductCounts[sub.slug] = (subProductCounts[sub.slug] || 0) + 1;
      mappedCount++;
    }
  }

  console.log(`Successfully mapped ${mappedCount} of ${products.length} products to their subcategories.`);

  // 7. Update subcategory and category product_counts
  subcategories.forEach(s => {
    s.product_count = subProductCounts[s.id] || subProductCounts[s.slug] || 0;
  });
  categories.forEach(c => {
    c.product_count = catProductCounts[c.slug] || 0;
  });

  // 8. Commit product updates to Firestore in batches
  console.log('Writing product relationship updates to Firestore...');
  const BATCH_SIZE = 450;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(p => {
      const ref = db.collection('products').doc(p.id);
      batch.update(ref, {
        category_id: p.category_id || null,
        category_slug: p.category_slug || null,
        category_name: p.category_name || null,
        category: p.category || null,
        subcategory_id: p.subcategory_id || null,
        subcategory_slug: p.subcategory_slug || null,
        subcategory_name: p.subcategory_name || null,
        subcategory: p.subcategory || null,
        updated_at: new Date().toISOString(),
      });
    });
    await batch.commit();
    console.log(`Committed products batch ${Math.min(i + BATCH_SIZE, products.length)} of ${products.length}`);
  }

  // 9. Write cache files
  const rootDir = path.resolve(__dirname, '../../');
  const backendDir = path.resolve(__dirname, '../');

  [rootDir, backendDir].forEach(dir => {
    fs.writeFileSync(path.join(dir, '.categories-cache.json'), JSON.stringify(categories, null, 2), 'utf-8');
    fs.writeFileSync(path.join(dir, '.subcategories-cache.json'), JSON.stringify(subcategories, null, 2), 'utf-8');
    fs.writeFileSync(path.join(dir, '.products-cache.json'), JSON.stringify(products), 'utf-8');
  });

  console.log('✅ Successfully organized Category, Subcategory and Product relationships & refreshed all caches!');
}

organizeDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
