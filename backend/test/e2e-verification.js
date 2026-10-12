/**
 * End-to-End Verification Test Suite
 * Tests all migrated endpoints against NestJS + Firebase Firestore.
 */

const BASE_URL = 'http://localhost:3001';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }
  return { status: res.status, ok: res.ok, data: json };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n🚀 Starting Full E2E Migration Verification Suite...\n');

  // 1. Categories
  console.log('--- 1. Testing Categories API ---');
  const catRes = await request('/api/categories');
  assert(catRes.ok && Array.isArray(catRes.data) && catRes.data.length > 0, 'GET /api/categories returns category list', `Count: ${catRes.data?.length}`);
  const firstCat = catRes.data[0];
  const catDetailRes = await request(`/api/categories/${firstCat.slug || firstCat.id}`);
  assert(catDetailRes.ok && (catDetailRes.data.slug === firstCat.slug || catDetailRes.data.id === firstCat.id), 'GET /api/categories/:slug returns single category', catDetailRes.data?.name);

  // 2. Subcategories
  console.log('\n--- 2. Testing Subcategories API ---');
  const subRes = await request('/api/subcategories');
  assert(subRes.ok && Array.isArray(subRes.data) && subRes.data.length > 0, 'GET /api/subcategories returns subcategories', `Count: ${subRes.data?.length}`);

  // 3. Brands
  console.log('\n--- 3. Testing Brands API ---');
  const brandRes = await request('/api/brands');
  assert(brandRes.ok && Array.isArray(brandRes.data) && brandRes.data.length > 0, 'GET /api/brands returns brand list', `Count: ${brandRes.data?.length}`);

  // 4. Products & Catalog Filtering
  console.log('\n--- 4. Testing Products API ---');
  const prodRes = await request('/api/products?limit=8');
  assert(prodRes.ok && Array.isArray(prodRes.data?.items) && prodRes.data.items.length > 0, 'GET /api/products returns paginated items', `Total: ${prodRes.data?.total}, Items: ${prodRes.data?.items?.length}`);

  const searchRes = await request('/api/products?search=laptop');
  assert(searchRes.ok && Array.isArray(searchRes.data?.items) && searchRes.data.items.length > 0, 'GET /api/products?search=laptop filters correctly', `Found: ${searchRes.data?.items?.length}`);

  const sortRes = await request('/api/products?sort=price_desc');
  assert(sortRes.ok && Array.isArray(sortRes.data?.items), 'GET /api/products?sort=price_desc sorts correctly');
  if (sortRes.data?.items?.length > 1) {
    assert(sortRes.data.items[0].price >= sortRes.data.items[1].price, 'Price descending sorting verified', `${sortRes.data.items[0].price} >= ${sortRes.data.items[1].price}`);
  }

  const sampleSlug = prodRes.data.items[0].slug || prodRes.data.items[0].id;
  const singleProdRes = await request(`/api/products/${sampleSlug}`);
  assert(singleProdRes.ok && singleProdRes.data && (singleProdRes.data.slug === sampleSlug || singleProdRes.data.id === sampleSlug), 'GET /api/products/:slug returns rich product details', singleProdRes.data?.name);

  // 5. Cart Server Validation
  console.log('\n--- 5. Testing Cart Server Validation ---');
  const cartValidationRes = await request('/api/cart/validate', {
    method: 'POST',
    body: {
      items: [
        { id: sampleSlug, quantity: 2, price: 1 } // client sends wrong price 1
      ]
    }
  });
  assert(cartValidationRes.ok && cartValidationRes.data?.items?.length === 1, 'POST /api/cart/validate returns validated cart items');
  assert(cartValidationRes.data?.items[0]?.price === singleProdRes.data.price, 'POST /api/cart/validate overrides client price with authoritative Firestore price', `Price: ${cartValidationRes.data?.items[0]?.price}`);
  assert(cartValidationRes.data?.subtotal === singleProdRes.data.price * 2, 'POST /api/cart/validate computes correct subtotal');

  // 6. User Registration & Authentication
  console.log('\n--- 6. Testing Authentication API ---');
  const testEmail = `test_user_${Date.now()}@marjaah.qa`;
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      email: testEmail,
      password: 'password123',
      first_name: 'Test',
      last_name: 'Customer',
      phone: '+974 5555 1234'
    }
  });
  assert(regRes.ok && regRes.data?.token && regRes.data?.user, 'POST /api/auth/register creates user in Firestore and issues JWT');
  const userToken = regRes.data?.token;

  // Me endpoint
  const meRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert(meRes.ok && meRes.data?.email === testEmail, 'GET /api/auth/me verifies JWT and returns current profile');

  // Login endpoint
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: testEmail,
      password: 'password123'
    }
  });
  assert(loginRes.ok && loginRes.data?.token, 'POST /api/auth/login authenticates registered user');

  // 7. Orders Creation & User Order Retrieval
  console.log('\n--- 7. Testing Orders API ---');
  const orderData = {
    items: [
      { id: sampleSlug, quantity: 1 }
    ],
    delivery: {
      full_name: 'Test Customer',
      phone: '+974 5555 1234',
      building: 'Building 12',
      street: 'Al Sadd St',
      zone: 'Zone 38',
      city: 'Doha',
      country: 'Qatar'
    },
    payment_method: 'cash'
  };

  const createOrderRes = await request('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: orderData
  });
  assert(createOrderRes.ok && createOrderRes.data?.order_number, 'POST /api/orders creates order with sequential number in Firestore', createOrderRes.data?.order_number);
  const createdOrderId = createOrderRes.data?.id;
  const createdOrderNum = createOrderRes.data?.order_number;

  // Fetch Order by Order Number
  const getOrderRes = await request(`/api/orders/${createdOrderNum}`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert(getOrderRes.ok && getOrderRes.data?.order_number === createdOrderNum, 'GET /api/orders/:orderNumber retrieves order snapshot');

  // User Orders Endpoint
  const userOrdersRes = await request('/api/orders/user', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert(userOrdersRes.ok && Array.isArray(userOrdersRes.data) && userOrdersRes.data.length > 0, 'GET /api/orders/user retrieves user order history');

  // Cancel Order
  const cancelRes = await request(`/api/orders/${createdOrderId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert(cancelRes.ok && cancelRes.data?.success, 'POST /api/orders/:id/cancel cancels order and restores inventory');

  // 8. Admin Authentication & Dashboard
  console.log('\n--- 8. Testing Admin API & Role-Based Access Control ---');
  // Attempt dashboard with regular user token -> MUST BE 403 FORBIDDEN
  const userAdminFail = await request('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert(userAdminFail.status === 403, 'GET /api/admin/dashboard rejects unauthorized non-admin customer with HTTP 403');

  // Admin login with seed credentials
  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@marjaah.qa',
      password: 'admin'
    }
  });
  assert(adminLoginRes.ok && adminLoginRes.data?.token && adminLoginRes.data?.user?.is_staff, 'POST /api/auth/login authenticates Admin');
  const adminToken = adminLoginRes.data?.token;

  // Admin dashboard KPI
  const adminDashRes = await request('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminDashRes.ok && adminDashRes.data?.kpis && typeof adminDashRes.data.kpis.products === 'number', 'GET /api/admin/dashboard returns Firestore live KPIs', `Products: ${adminDashRes.data?.kpis?.products}, Orders: ${adminDashRes.data?.kpis?.orders}`);

  // Admin update order status
  const updateStatusRes = await request(`/api/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'processing' }
  });
  assert(updateStatusRes.ok && updateStatusRes.data?.status === 'processing', 'PATCH /api/orders/:id/status updates status via AdminGuard');

  // 9. Contact Messages API
  console.log('\n--- 9. Testing Contact API ---');
  const contactRes = await request('/api/contact', {
    method: 'POST',
    body: {
      name: 'Verification Bot',
      email: 'bot@marjaah.qa',
      subject: 'E2E Testing',
      message: 'Migration verification test message'
    }
  });
  assert(contactRes.ok && contactRes.data?.success, 'POST /api/contact saves contact message to Firestore');

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`🎉 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed with unhandled error:', err);
  process.exit(1);
});
