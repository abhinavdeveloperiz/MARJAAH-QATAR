import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';

async function runSeed() {
  console.log('--- Starting Firestore Migration / Seeding ---');

  // 1. Credentials from .env or file
  let credentialOption: admin.credential.Credential | null = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      credentialOption = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
    } catch {}
  }
  if (!credentialOption && fs.existsSync(path.resolve(__dirname, '../firebase-credentials.json'))) {
    credentialOption = admin.credential.cert(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../firebase-credentials.json'), 'utf8')));
  }
  if (!credentialOption) {
    credentialOption = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential: credentialOption,
    projectId: process.env.FIREBASE_PROJECT_ID || 'marjaah-ab2a6',
  });

  const db = admin.firestore();
  const seedPath = path.resolve(__dirname, '../seed-data.json');
  if (!fs.existsSync(seedPath)) {
    console.log('Seed data already processed and deleted. Skipping seed operation.');
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  // 1. Seed Categories
  console.log(`Seeding ${seedData.categories.length} categories...`);
  const catMap: Record<string, string> = {};
  for (const cat of seedData.categories) {
    const docRef = db.collection('categories').doc(cat.slug);
    await docRef.set({
      ...cat,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    catMap[cat.slug] = docRef.id;
  }

  // 2. Seed Subcategories
  console.log(`Seeding ${seedData.subcategories.length} subcategories...`);
  const subMap: Record<string, string> = {};
  for (const sub of seedData.subcategories) {
    const docRef = db.collection('subcategories').doc(sub.slug);
    await docRef.set({
      ...sub,
      category_id: catMap[sub.category_slug] || sub.category_slug,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    subMap[sub.slug] = docRef.id;
  }

  // 3. Seed Brands
  console.log(`Seeding ${seedData.brands.length} brands...`);
  for (const b of seedData.brands) {
    const brandId = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await db.collection('brands').doc(brandId).set({
      ...b,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }

  // 4. Seed Products
  console.log(`Seeding ${seedData.products.length} products...`);
  for (const p of seedData.products) {
    const docRef = db.collection('products').doc(p.slug);
    await docRef.set({
      ...p,
      category_id: catMap[p.category] || p.category,
      category_slug: p.category,
      subcategory_id: subMap[p.subcategory] || p.subcategory,
      subcategory_slug: p.subcategory,
      price: Number(p.price),
      original_price: p.original_price ? Number(p.original_price) : null,
      stock_count: p.stock_count !== undefined ? Number(p.stock_count) : 10,
      in_stock: p.in_stock !== undefined ? Boolean(p.in_stock) : true,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }

  // 5. Seed Banners
  console.log(`Seeding ${seedData.banners.length} banners...`);
  for (const banner of seedData.banners) {
    const bId = banner.id || `banner-${banner.banner_type}-${banner.order}`;
    await db.collection('banners').doc(bId).set({
      ...banner,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }

  // 6. Seed Users & Default Admin
  console.log(`Seeding users and ensuring admin exists...`);
  const adminHashed = await bcrypt.hash('admin', 10);
  await db.collection('users').doc('admin').set({
    username: 'admin',
    email: 'admin@marjaah.qa',
    first_name: 'Admin',
    last_name: 'Marjaah',
    phone: '+974 7799 1013',
    password: adminHashed,
    is_staff: true,
    is_superuser: true,
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { merge: true });

  for (const u of seedData.users) {
    if (u.username !== 'admin') {
      const uRef = db.collection('users').doc(String(u.id));
      const uHash = await bcrypt.hash('user123', 10);
      await uRef.set({
        ...u,
        password: uHash,
        role: u.is_staff ? 'admin' : 'customer',
        updated_at: new Date().toISOString(),
      }, { merge: true });
    }
  }

  // 7. Seed Orders & Order Items
  console.log(`Seeding ${seedData.orders.length} orders...`);
  for (const o of seedData.orders) {
    const oRef = db.collection('orders').doc(`order-${o.id}`);
    const items = seedData.order_items.filter((oi: any) => oi.order_id === o.id).map((oi: any) => ({
      name: oi.product_name,
      price: Number(oi.unit_price),
      quantity: Number(oi.quantity),
      line_total: Number(oi.unit_price) * Number(oi.quantity),
      image: oi.product_image || '/assets/images/products/placeholder.svg',
    }));

    await oRef.set({
      order_number: `MTQ-${String(o.id).padStart(5, '0')}`,
      status: o.status || 'placed',
      payment_status: o.payment_status || 'cod',
      payment_method: o.payment_method || 'cash',
      subtotal: Number(o.subtotal) || Number(o.total),
      shipping: Number(o.shipping) || 0,
      total: Number(o.total),
      customer_name: o.guest_name || 'Customer',
      customer_email: o.guest_email || 'customer@marjaah.qa',
      delivery_address: {
        city: o.delivery_city || 'Doha',
        country: o.delivery_country || 'Qatar',
        full_name: o.delivery_full_name || o.guest_name || 'Customer',
        phone: o.delivery_phone || '+974 7799 1013',
      },
      items,
      created_at: o.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }

  console.log('--- Seeding Completed Successfully! ---');
  process.exit(0);
}

runSeed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
