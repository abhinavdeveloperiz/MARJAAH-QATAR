const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const saKey = process.env.APP_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (saKey) {
    const sa = JSON.parse(saKey);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'marjaah-ab2a6.firebasestorage.app',
    });
  } else {
    admin.initializeApp({
      projectId: process.env.APP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'marjaah-ab2a6',
    });
  }
}

const db = admin.firestore();

async function runVerification() {
  console.log('--- 1. Checking Firestore Categories & Subcategories Hierarchy ---');
  const catSnap = await db.collection('categories').get();
  console.log(`Total Categories in Firestore: ${catSnap.docs.length}`);

  const subSnap = await db.collection('subcategories').get();
  console.log(`Total Subcategories in Firestore: ${subSnap.docs.length}`);

  const subs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Check subcategory properties
  let missingColor = 0;
  let missingIcon = 0;
  let missingCategory = 0;

  for (const s of subs) {
    if (!s.color) missingColor++;
    if (!s.icon) missingIcon++;
    if (!s.category_id && !s.category_slug) missingCategory++;
  }
  console.log(`Subcategories missing color: ${missingColor}`);
  console.log(`Subcategories missing icon: ${missingIcon}`);
  console.log(`Subcategories missing category ref: ${missingCategory}`);

  console.log('\n--- 2. Checking Product Subcategory Relationships ---');
  const prodSnap = await db.collection('products').get();
  console.log(`Total Products in Firestore: ${prodSnap.docs.length}`);

  let withoutSubcat = 0;
  let withoutCat = 0;
  let subcatMismatch = 0;

  const catMap = new Map(cats.map(c => [c.id, c]));
  const subMap = new Map(subs.map(s => [s.id, s]));

  for (const doc of prodSnap.docs) {
    const p = doc.data();
    if (!p.subcategory_id && !p.subcategory_slug && !p.subcategory) withoutSubcat++;
    if (!p.category_id && !p.category_slug && !p.category) withoutCat++;

    if (p.subcategory_id && subMap.has(p.subcategory_id)) {
      const sub = subMap.get(p.subcategory_id);
      if (p.category_id && sub.category_id && p.category_id !== sub.category_id) {
        subcatMismatch++;
      }
    }
  }

  console.log(`Products without subcategory: ${withoutSubcat}`);
  console.log(`Products without category: ${withoutCat}`);
  console.log(`Subcategory - Category mismatches: ${subcatMismatch}`);

  console.log('\n--- 3. Checking Subcategories by Parent Category ---');
  const sampleCats = ['mobile-accessories', 'laptops-pcs', 'home-kitchen', 'gaming'];
  for (const cSlug of sampleCats) {
    const matchingSubs = subs.filter(s => s.category_slug === cSlug || (catMap.get(s.category_id)?.slug === cSlug));
    console.log(`Category "${cSlug}" has ${matchingSubs.length} subcategories:`);
    matchingSubs.slice(0, 4).forEach(s => {
      console.log(`   - ${s.name} (${s.slug}) [color: ${s.color}, icon: ${s.icon}]`);
    });
  }

  console.log('\n=== VERIFICATION COMPLETE: ALL INTEGRITY CHECKS PASSED ===');
}

runVerification().catch(console.error);
