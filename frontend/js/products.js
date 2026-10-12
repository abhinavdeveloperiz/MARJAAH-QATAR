/**
 * MARJAAH Qatar - Dynamic Products, Catalog & Details Engine
 * Connects Frontend seamlessly with NestJS + Firebase Firestore APIs.
 */

(function (global) {
  const isRtl = document.documentElement.getAttribute('dir') === 'rtl' || window.location.pathname.startsWith('/ar');
  const locale = isRtl ? 'ar' : 'en';

  function formatPrice(amount) {
    if (amount === undefined || amount === null) return '';
    return isRtl ? `${amount} ر.ق` : `QAR ${amount}`;
  }

  function renderProductCard(product, index = 0) {
    const slug = product.slug || product.id;
    const name = (isRtl && product.name_ar) ? product.name_ar : (product.name || 'Product');
    const price = product.price;
    const originalPrice = product.original_price;
    const image = product.image || (Array.isArray(product.images) && product.images[0]) || '/static/images/placeholder.svg';
    const inStock = product.in_stock !== false && (product.stock_count === undefined || product.stock_count > 0);
    const brandName = product.brand || '';
    const delay = (index % 8) * 50;

    const badgeHtml = inStock
      ? `<span class="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">${isRtl ? 'متوفر' : 'In Stock'}</span>`
      : `<span class="text-[10px] uppercase font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">${isRtl ? 'غير متوفر' : 'Out of Stock'}</span>`;

    let priceHtml = `<span class="font-display font-black text-lg sm:text-xl" style="color:var(--text-primary)">${formatPrice(price)}</span>`;
    if (originalPrice && originalPrice > price) {
      priceHtml += `<span class="text-xs line-through" style="color:var(--text-tertiary)">${formatPrice(originalPrice)}</span>`;
    }

    const actionHtml = inStock
      ? `<button data-add-to-cart="${slug}" class="btn-primary w-full justify-center text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          ${isRtl ? 'أضف إلى السلة' : 'Add to Cart'}
         </button>`
      : `<div class="text-xs text-center py-2.5 rounded-xl font-bold uppercase tracking-wider" style="background:var(--bg-surface-3);color:var(--text-tertiary)">
          ${isRtl ? 'نفذت الكمية' : 'Out of Stock'}
         </div>`;

    return `
      <div data-animate class="card group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300"
           style="background:var(--bg-surface);border:1px solid var(--border-color);transition-delay:${delay}ms">
        <a href="/product/?slug=${encodeURIComponent(slug)}" class="relative overflow-hidden block" style="aspect-ratio:4/3;background:var(--bg-surface-2)">
          <button data-wishlist-toggle="${slug}" aria-label="Toggle wishlist"
            class="absolute top-3 right-3 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 opacity-90 hover:opacity-100 hover:scale-110 shadow-sm cursor-pointer"
            style="background:rgba(255,255,255,0.9);border:1px solid var(--border-color);backdrop-filter:blur(6px)">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
          <img src="${image}" alt="${name}" class="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108" loading="lazy" onerror="this.src='/static/images/placeholder.svg'" />
        </a>
        <div class="p-4 flex flex-col flex-1">
          <div class="mb-1.5">
            ${brandName ? `<span class="text-[10px] font-extrabold uppercase tracking-widest" style="color:var(--color-accent)">${brandName}</span>` : ''}
            <a href="/product/?slug=${encodeURIComponent(slug)}" class="block text-sm font-semibold leading-snug mt-1 line-clamp-2 transition-colors duration-200 hover:opacity-80" style="color:var(--text-primary)">
              ${name}
            </a>
          </div>
          <div class="flex items-center gap-1.5 mb-3">
            ${badgeHtml}
          </div>
          <div class="flex flex-wrap items-baseline gap-2 mb-4 mt-auto">
            ${priceHtml}
          </div>
          ${actionHtml}
        </div>
      </div>
    `;
  }

  // ─── 1. GENERIC PRODUCT LOADER (HOME / SECTIONS) ─────────────────────────
  async function loadProducts(containerId, queryParams = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      let data;
      if (global.api && typeof global.api.getProducts === 'function') {
        data = await global.api.getProducts(queryParams);
      } else {
        const queryStr = typeof queryParams === 'string' ? queryParams : '?' + new URLSearchParams(queryParams).toString();
        const base = global.API_BASE_URL || 'http://localhost:3001';
        const res = await fetch(`${base}/api/products${queryStr}`);
        data = await res.json();
      }

      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.items)) {
        items = data.items;
      } else if (data && Array.isArray(data.data)) {
        items = data.data;
      }

      if (items.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500 font-medium">${isRtl ? 'لم يتم العثور على منتجات.' : 'No products found.'}</div>`;
        return;
      }

      container.innerHTML = items.map((p, idx) => renderProductCard(p, idx)).join('');
    } catch (err) {
      console.error('Error loading products for #' + containerId, err);
      container.innerHTML = `<div class="col-span-full py-12 text-center text-rose-500 font-medium">${isRtl ? 'فشل تحميل المنتجات.' : 'Failed to load products.'}</div>`;
    }
  }

  // ─── 2. SHOP CATALOG CONTROLLER (FILTERS, SEARCH, PAGINATION) ───────────
  const shopState = {
    category: '',
    search: '',
    sort: 'featured',
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 1
  };

  async function loadShopCategories() {
    const pillsContainer = document.getElementById('shop-category-pills');
    if (!pillsContainer || !global.api) return;

    try {
      const categories = await global.api.getCategories();
      if (!Array.isArray(categories)) return;

      const activeCat = shopState.category;
      let html = `
        <a href="javascript:void(0)" data-category-slug=""
           class="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${!activeCat ? 'bg-[#4063B2] text-white shadow-[0_4px_12px_rgba(64,99,178,0.25)]' : 'border border-slate-700/30 text-slate-400 hover:text-white'}">
          ${isRtl ? 'جميع المنتجات' : 'All Products'}
        </a>
      `;

      categories.forEach(cat => {
        const slug = cat.slug || cat.id;
        const name = (isRtl && cat.name_ar) ? cat.name_ar : (cat.name || slug);
        const isActive = activeCat === slug;
        html += `
          <a href="javascript:void(0)" data-category-slug="${slug}"
             class="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${isActive ? 'bg-[#4063B2] text-white shadow-[0_4px_12px_rgba(64,99,178,0.25)]' : 'border border-slate-700/30 text-slate-400 hover:text-white'}">
            ${name}
          </a>
        `;
      });

      pillsContainer.innerHTML = html;

      pillsContainer.querySelectorAll('[data-category-slug]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          shopState.category = btn.getAttribute('data-category-slug');
          shopState.page = 1;
          renderShop();
          loadShopCategories();
        });
      });
    } catch (e) {
      console.warn('Could not load shop categories:', e);
    }
  }

  function renderPagination() {
    const container = document.getElementById('shop-pagination-container');
    if (!container) return;

    if (shopState.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    // Previous Button
    const prevDisabled = shopState.page <= 1;
    html += `
      <button ${prevDisabled ? 'disabled' : ''} data-page="${shopState.page - 1}"
        class="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${prevDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary-500 hover:text-primary-500'}"
        style="background:var(--bg-surface-2);border-color:var(--border-color);color:var(--text-primary)">
        ${isRtl ? 'السابق' : 'Previous'}
      </button>
    `;

    // Page numbers
    for (let i = 1; i <= shopState.totalPages; i++) {
      const isCurrent = i === shopState.page;
      html += `
        <button data-page="${i}"
          class="w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${isCurrent ? 'bg-[#4063B2] text-white shadow-md' : 'border hover:border-primary-500'}"
          style="${isCurrent ? '' : 'background:var(--bg-surface-2);border-color:var(--border-color);color:var(--text-primary)'}">
          ${i}
        </button>
      `;
    }

    // Next Button
    const nextDisabled = shopState.page >= shopState.totalPages;
    html += `
      <button ${nextDisabled ? 'disabled' : ''} data-page="${shopState.page + 1}"
        class="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${nextDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary-500 hover:text-primary-500'}"
        style="background:var(--bg-surface-2);border-color:var(--border-color);color:var(--text-primary)">
        ${isRtl ? 'التالي' : 'Next'}
      </button>
    `;

    container.innerHTML = html;

    container.querySelectorAll('button[data-page]').forEach(b => {
      b.addEventListener('click', () => {
        const p = parseInt(b.getAttribute('data-page'), 10);
        if (p >= 1 && p <= shopState.totalPages && p !== shopState.page) {
          shopState.page = p;
          renderShop();
          const target = document.getElementById('shop-products-container');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  async function renderShop() {
    const container = document.getElementById('shop-products-container');
    if (!container) return;

    container.innerHTML = `
      <div class="col-span-full py-16 flex flex-col items-center justify-center gap-3">
        <div class="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-xs font-bold uppercase tracking-widest text-slate-400">${isRtl ? 'جاري التحميل...' : 'Loading products...'}</span>
      </div>
    `;

    const params = {
      page: shopState.page,
      limit: shopState.limit,
      sort: shopState.sort
    };
    if (shopState.category) params.category = shopState.category;
    if (shopState.search) params.search = shopState.search;

    try {
      const data = await global.api.getProducts(params);
      const items = data.items || data.data || (Array.isArray(data) ? data : []);
      shopState.total = data.total || items.length;
      shopState.totalPages = data.totalPages || 1;

      // Update counters
      const counterEl = document.getElementById('shop-items-counter');
      if (counterEl) {
        const start = shopState.total === 0 ? 0 : (shopState.page - 1) * shopState.limit + 1;
        const end = Math.min(shopState.page * shopState.limit, shopState.total);
        counterEl.innerHTML = `<span>${isRtl ? 'عرض' : 'Showing'} <strong style="color:var(--text-primary)">${start}–${end}</strong> ${isRtl ? 'من أصل' : 'of'} <strong style="color:var(--text-primary)">${shopState.total}</strong> ${isRtl ? 'منتج' : 'items'}</span>`;
      }

      if (items.length === 0) {
        container.innerHTML = `<div class="col-span-full py-16 text-center text-slate-500 font-medium">${isRtl ? 'لم يتم العثور على منتجات مطابقة لخياراتك.' : 'No products found matching your selection.'}</div>`;
        renderPagination();
        return;
      }

      container.innerHTML = items.map((p, idx) => renderProductCard(p, idx)).join('');
      renderPagination();
    } catch (err) {
      console.error('Failed to load shop catalog:', err);
      container.innerHTML = `<div class="col-span-full py-16 text-center text-rose-500 font-medium">${isRtl ? 'تعذر تحميل المنتجات.' : 'Unable to load products from server.'}</div>`;
    }
  }

  function initShopPage() {
    const container = document.getElementById('shop-products-container');
    if (!container) return;

    // Read initial URL params
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('category')) shopState.category = searchParams.get('category');
    if (searchParams.has('search')) shopState.search = searchParams.get('search');
    if (searchParams.has('sort')) shopState.sort = searchParams.get('sort');
    if (searchParams.has('page')) shopState.page = parseInt(searchParams.get('page'), 10) || 1;
    if (searchParams.has('per_page')) shopState.limit = parseInt(searchParams.get('per_page'), 10) || 8;

    // Search Input binding
    const searchInput = document.getElementById('shop-search-input');
    const searchForm = document.getElementById('shop-search-form');
    if (searchInput) {
      if (shopState.search) searchInput.value = shopState.search;
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          shopState.search = e.target.value.trim();
          shopState.page = 1;
          renderShop();
        }, 350);
      });
    }
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (searchInput) shopState.search = searchInput.value.trim();
        shopState.page = 1;
        renderShop();
      });
    }

    // Sort select binding
    const sortSelect = document.getElementById('shop-sort-select');
    if (sortSelect) {
      sortSelect.value = shopState.sort;
      sortSelect.addEventListener('change', (e) => {
        shopState.sort = e.target.value;
        shopState.page = 1;
        renderShop();
      });
    }

    // Items per page buttons
    const perPageContainer = document.getElementById('shop-per-page-container');
    if (perPageContainer) {
      perPageContainer.querySelectorAll('[data-per-page]').forEach(btn => {
        const limitVal = parseInt(btn.getAttribute('data-per-page'), 10);
        if (limitVal === shopState.limit) {
          btn.className = 'px-2.5 py-1 rounded-lg transition-all bg-white dark:bg-slate-700 shadow-xs font-bold text-slate-900 dark:text-white cursor-pointer';
        } else {
          btn.className = 'px-2.5 py-1 rounded-lg transition-all text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer';
        }
        btn.addEventListener('click', () => {
          shopState.limit = limitVal;
          shopState.page = 1;
          perPageContainer.querySelectorAll('[data-per-page]').forEach(b => {
            b.className = 'px-2.5 py-1 rounded-lg transition-all text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer';
          });
          btn.className = 'px-2.5 py-1 rounded-lg transition-all bg-white dark:bg-slate-700 shadow-xs font-bold text-slate-900 dark:text-white cursor-pointer';
          renderShop();
        });
      });
    }

    loadShopCategories();
    renderShop();
  }

  // ─── 3. PRODUCT DETAIL HYDRATION ─────────────────────────────────────────
  async function hydrateProductDetail() {
    const titleEl = document.getElementById('product-title');
    if (!titleEl || !global.api) return;

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug') || urlParams.get('id');
    if (!slug) return; // Keep fallback if no slug specified

    try {
      const product = await global.api.getProduct(slug);
      if (!product) return;

      const pName = (isRtl && product.name_ar) ? product.name_ar : (product.name || 'Product');
      const pDesc = (isRtl && product.description_ar) ? product.description_ar : (product.description || '');
      const pShortDesc = (isRtl && product.short_description_ar) ? product.short_description_ar : (product.short_description || '');
      const pPrice = product.price;
      const pOrigPrice = product.original_price;
      const pStock = product.stock_count !== undefined ? product.stock_count : (product.in_stock ? 10 : 0);
      const inStock = product.in_stock !== false && pStock > 0;
      const primaryImage = product.image || (Array.isArray(product.images) && product.images[0]) || '/static/images/placeholder.svg';

      // Document title
      document.title = `${pName} — M.SHOP Qatar`;

      // Breadcrumb & Category Link
      const crumbNameEl = document.getElementById('product-crumb-name');
      if (crumbNameEl) crumbNameEl.textContent = pName;
      const catLinkEl = document.getElementById('product-category-link');
      if (catLinkEl && product.category) {
        catLinkEl.textContent = product.category;
        catLinkEl.href = `/shop/?category=${encodeURIComponent(product.category_slug || product.category)}`;
      }

      // Title & Brand & SKU
      titleEl.textContent = pName;
      const brandEl = document.getElementById('product-brand');
      if (brandEl) brandEl.textContent = product.brand || 'M.SHOP';
      const skuEl = document.getElementById('product-sku');
      if (skuEl) skuEl.textContent = `SKU: ${product.sku || product.id || 'N/A'}`;

      // Main Image
      const mainImg = document.getElementById('main-image');
      if (mainImg) {
        mainImg.src = primaryImage;
        mainImg.alt = pName;
      }

      // Gallery Thumbnails
      const thumbsContainer = document.getElementById('product-thumbnails-container');
      if (thumbsContainer && Array.isArray(product.images) && product.images.length > 1) {
        thumbsContainer.innerHTML = product.images.map((imgUrl, i) => `
          <button type="button" class="w-16 h-16 rounded-xl border overflow-hidden flex-shrink-0 cursor-pointer transition-all hover:opacity-100 ${i === 0 ? 'border-primary-500 opacity-100' : 'opacity-60 border-slate-700/30'}"
            onclick="document.getElementById('main-image').src='${imgUrl}';">
            <img src="${imgUrl}" alt="Thumbnail ${i + 1}" class="w-full h-full object-cover" />
          </button>
        `).join('');
      }

      // Price Container
      const priceContainer = document.getElementById('product-price-container');
      if (priceContainer) {
        let phtml = `<span class="text-4xl font-display font-black" style="color:var(--text-primary)">${formatPrice(pPrice)}</span>`;
        if (pOrigPrice && pOrigPrice > pPrice) {
          phtml += `<span class="text-lg line-through" style="color:var(--text-tertiary)">${formatPrice(pOrigPrice)}</span>`;
        }
        priceContainer.innerHTML = phtml;
      }

      // Short Description
      const shortDescEl = document.getElementById('product-short-description');
      if (shortDescEl) shortDescEl.textContent = pShortDesc;

      // Stock Container
      const stockContainer = document.getElementById('product-stock-container');
      if (stockContainer) {
        stockContainer.innerHTML = inStock
          ? `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-xs font-bold text-emerald-500">${isRtl ? `متوفر (${pStock} متبقي)` : `In Stock (${pStock} left)`}</span>`
          : `<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-xs font-bold text-rose-500">${isRtl ? 'غير متوفر حالياً' : 'Out of Stock'}</span>`;
      }

      // Add to Cart Button
      const addBtn = document.getElementById('product-add-to-cart-btn');
      if (addBtn) {
        addBtn.setAttribute('data-add-to-cart', product.slug || product.id);
        if (!inStock) {
          addBtn.disabled = true;
          addBtn.classList.add('opacity-50', 'pointer-events-none');
          addBtn.querySelector('span') && (addBtn.querySelector('span').textContent = isRtl ? 'نفذت الكمية' : 'Out of Stock');
        }
      }

      // Wishlist Button
      const wishBtn = document.getElementById('product-wishlist-btn');
      if (wishBtn) wishBtn.setAttribute('data-wishlist-toggle', product.slug || product.id);

      // Delivery & Warranty
      const delEl = document.getElementById('product-delivery-text');
      if (delEl) {
        const days = product.delivery_days || 2;
        delEl.textContent = isRtl ? `توصيل خلال ${days} أيام` : `Delivery in ${days} days`;
      }
      const warEl = document.getElementById('product-warranty-text');
      if (warEl) {
        const months = product.warranty_months || 24;
        warEl.textContent = isRtl ? `ضمان ${months} شهراً` : `${months}-month warranty`;
      }

      // Specifications Table
      const specsTable = document.getElementById('product-specs-table');
      const specs = product.specifications || product.specs;
      if (specsTable && Array.isArray(specs) && specs.length > 0) {
        specsTable.innerHTML = specs.map(s => {
          const k = (isRtl && s.keyAr) ? s.keyAr : (s.key || s.name);
          const v = (isRtl && s.valueAr) ? s.valueAr : s.value;
          return `
            <tr style="border-bottom:1px solid var(--border-color)">
              <td class="px-4 py-3 font-medium w-36 sm:w-44" style="color:var(--text-secondary)">${k}</td>
              <td class="px-4 py-3 font-bold" style="color:var(--text-primary)">${v}</td>
            </tr>
          `;
        }).join('');
      }

      // Long Description
      const descEl = document.getElementById('product-description-text');
      if (descEl && pDesc) descEl.textContent = pDesc;

      // Related Products
      const relContainer = document.getElementById('product-related-container');
      if (relContainer && Array.isArray(product.related) && product.related.length > 0) {
        relContainer.innerHTML = product.related.map((rp, i) => renderProductCard(rp, i)).join('');
      }
    } catch (err) {
      console.error('Failed to hydrate product detail:', err);
    }
  }

  // ─── INITIALIZATION ON DOM READY ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Featured products on home page
    if (document.getElementById('featured-products-container')) {
      loadProducts('featured-products-container', { limit: 8 });
    }

    // 2. New arrivals if container exists
    if (document.getElementById('new-arrivals-container')) {
      loadProducts('new-arrivals-container', { limit: 8, sort: 'newest' });
    }

    // 3. Shop Catalog Page
    if (document.getElementById('shop-products-container')) {
      initShopPage();
    }

    // 4. Product Detail Page
    if (document.getElementById('product-title') && document.getElementById('product-price-container')) {
      hydrateProductDetail();
    }
  });

  global.loadProducts = loadProducts;
  global.renderProductCard = renderProductCard;
})(window);
