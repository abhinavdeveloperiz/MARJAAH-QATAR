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
    const image = product.image || (Array.isArray(product.images) && product.images[0]) || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg';
    
    // Strict stock calculation: checks in_stock, stock_status, and stock_count
    const inStock = Boolean(
      product.in_stock !== false &&
      product.in_stock !== 'false' &&
      product.stock_status !== 'outofstock' &&
      product.stock_status !== 'OUT_OF_STOCK' &&
      (product.stock_count === undefined || product.stock_count === null || Number(product.stock_count) > 0) &&
      (product.stock === undefined || product.stock === null || Number(product.stock) > 0)
    );
    const brandName = product.brand || product.brand_name || '';
    const delay = (index % 8) * 50;

    const isSaved = (typeof window.Wishlist !== 'undefined' && typeof window.Wishlist.has === 'function')
      ? window.Wishlist.has(slug)
      : false;

    const isFeatured = Boolean(product.is_featured || product.featured);

    let priceHtml = `<span class="font-display font-black text-base sm:text-lg md:text-xl" style="color:var(--text-primary)">${formatPrice(price)}</span>`;
    if (originalPrice && originalPrice > price) {
      priceHtml += `<span class="text-[11px] sm:text-xs line-through" style="color:var(--text-tertiary)">${formatPrice(originalPrice)}</span>`;
    }

    const actionHtml = inStock
      ? `<button data-add-to-cart="${slug}" class="btn-primary w-full justify-center text-xs font-bold py-2 sm:py-2.5 px-2 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span class="truncate">${isRtl ? 'أضف إلى السلة' : 'Add to Cart'}</span>
         </button>`
      : `<button disabled type="button" aria-disabled="true" class="w-full text-xs text-center py-2 sm:py-2.5 px-2 rounded-xl font-bold uppercase tracking-wider opacity-60 cursor-not-allowed border border-rose-500/25 text-rose-500 bg-rose-500/10 flex items-center justify-center gap-1.5 select-none shrink-0" style="pointer-events:none">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>
          <span class="truncate">${isRtl ? 'نفذت الكمية' : 'Out of Stock'}</span>
         </button>`;

    const productHref = `${isRtl ? '/ar' : ''}/product/${encodeURIComponent(slug)}/`;

    const starPos = isRtl ? 'top-2.5 right-2.5 sm:top-3 sm:right-3' : 'top-2.5 left-2.5 sm:top-3 sm:left-3';
    const heartPos = isRtl ? 'top-2.5 left-2.5 sm:top-3 sm:left-3' : 'top-2.5 right-2.5 sm:top-3 sm:right-3';

    return `
      <div data-animate class="card anim-visible group relative rounded-xl sm:rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300 ${!inStock ? 'opacity-90' : ''}"
           style="background:var(--bg-surface);border:1px solid var(--border-color);transition-delay:${delay}ms">
        <a href="${productHref}" class="relative overflow-hidden block" style="aspect-ratio:4/3;background:var(--bg-surface-2)">
          ${isFeatured ? `
            <div class="absolute ${starPos} z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm pointer-events-none transition-transform group-hover:scale-105"
                 style="background:rgba(255,255,255,0.92);border:1px solid var(--border-color);backdrop-filter:blur(6px)"
                 title="${isRtl ? 'منتج مميز' : 'Featured Product'}" aria-label="${isRtl ? 'منتج مميز' : 'Featured Product'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
          ` : ''}
          <button data-wishlist-toggle="${slug}" aria-label="Toggle liked product" aria-pressed="${isSaved ? 'true' : 'false'}"
            class="${isSaved ? 'wishlist-active ' : ''}absolute ${heartPos} z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-200 opacity-90 hover:opacity-100 hover:scale-110 shadow-sm cursor-pointer"
            style="background:rgba(255,255,255,0.92);border:1px solid var(--border-color);backdrop-filter:blur(6px)">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="${isSaved ? '#ef4444' : 'none'}" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
          <img src="${image}" alt="${name}" class="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108 ${!inStock ? 'grayscale-[25%]' : ''}" loading="lazy" onerror="this.src='https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg'" />
        </a>
        <div class="p-3 sm:p-4 flex flex-col flex-1">
          <div class="mb-2">
            ${brandName ? `<span class="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest block truncate" style="color:var(--color-accent)">${brandName}</span>` : ''}
            <a href="${productHref}" class="block text-xs sm:text-sm font-semibold leading-snug mt-1 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] transition-colors duration-200 hover:opacity-80" style="color:var(--text-primary)">
              ${name}
            </a>
          </div>
          <div class="flex flex-wrap items-baseline gap-1.5 sm:gap-2 mb-3 mt-auto">
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
        const base = global.API_BASE_URL || (global.api && global.api.config && global.api.config.baseUrl) || '';
        const endpoint = base.endsWith('/api') ? `${base}/products${queryStr}` : `${base}/api/products${queryStr}`;
        const res = await fetch(endpoint);
        data = await res.json();
      }

      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.products)) {
        items = data.products;
      } else if (data && Array.isArray(data.items)) {
        items = data.items;
      } else if (data && Array.isArray(data.data)) {
        items = data.data;
      }

      // If featured requested but returned 0 items, fallback to real items from catalogue
      if (items.length === 0 && queryParams.isFeatured) {
        return loadProducts(containerId, { limit: queryParams.limit || 8 });
      }

      if (items.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500 font-medium">${isRtl ? 'لم يتم العثور على منتجات.' : 'No products found.'}</div>`;
        return;
      }

      container.innerHTML = items.map((p, idx) => renderProductCard(p, idx)).join('');
      if (window.Wishlist && typeof window.Wishlist.sync === 'function') window.Wishlist.sync();
      if (window.observeAnimations) window.observeAnimations();
      container.querySelectorAll('.card, [data-animate]').forEach(card => card.classList.add('anim-visible'));
    } catch (err) {
      console.error('Error loading products for #' + containerId, err);
      container.innerHTML = `<div class="col-span-full py-12 text-center text-rose-500 font-medium">${isRtl ? 'فشل تحميل المنتجات.' : 'Failed to load products.'}</div>`;
    }
  }

  // ─── 2. SHOP CATALOG CONTROLLER (FILTERS, SEARCH, PAGINATION) ───────────
  const shopState = {
    category: '',
    categoryName: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    inStock: false,
    isOffer: false,
    search: '',
    sort: 'featured',
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1
  };

  // Client-side instant filter cache & request abort controller
  const shopCatalogCache = new Map();
  const SHOP_CACHE_TTL_MS = 90 * 1000; // 90s instant cache
  let shopAbortController = null;

  function syncShopUrlParams() {
    try {
      const isArabic = window.location.pathname.startsWith('/ar');
      let targetPath = `${isArabic ? '/ar' : ''}/shop/`;
      if (shopState.category && !shopState.search && !shopState.brand && !shopState.minPrice && !shopState.maxPrice && !shopState.inStock && !shopState.isOffer) {
        targetPath = `${isArabic ? '/ar' : ''}/category/${encodeURIComponent(shopState.category)}/`;
      }
      const url = new URL(targetPath, window.location.origin);
      if (shopState.search) url.searchParams.set('search', shopState.search);
      if (shopState.category) url.searchParams.set('category', shopState.category);
      if (shopState.brand) url.searchParams.set('brand', shopState.brand);
      if (shopState.minPrice) url.searchParams.set('minPrice', shopState.minPrice);
      if (shopState.maxPrice) url.searchParams.set('maxPrice', shopState.maxPrice);
      if (shopState.inStock) url.searchParams.set('inStock', 'true');
      if (shopState.isOffer) url.searchParams.set('isOffer', 'true');
      if (shopState.sort && shopState.sort !== 'featured') url.searchParams.set('sort', shopState.sort);
      if (shopState.page > 1) url.searchParams.set('page', shopState.page);
      if (shopState.limit && shopState.limit !== 12) url.searchParams.set('per_page', shopState.limit);

      window.history.pushState({}, '', url);
    } catch (e) { }
  }

  function syncShopInputs() {
    // In Stock checkboxes
    const inStockDesk = document.getElementById('filter-in-stock-only');
    const inStockMob = document.getElementById('mobile-filter-in-stock-only');
    if (inStockDesk) inStockDesk.checked = Boolean(shopState.inStock);
    if (inStockMob) inStockMob.checked = Boolean(shopState.inStock);

    // Offers checkboxes
    const offersDesk = document.getElementById('filter-offers-only');
    const offersMob = document.getElementById('mobile-filter-offers-only');
    if (offersDesk) offersDesk.checked = Boolean(shopState.isOffer);
    if (offersMob) offersMob.checked = Boolean(shopState.isOffer);

    // Price inputs
    const minDesk = document.getElementById('filter-min-price');
    const maxDesk = document.getElementById('filter-max-price');
    const minMob = document.getElementById('mobile-filter-min-price');
    const maxMob = document.getElementById('mobile-filter-max-price');
    if (minDesk) minDesk.value = shopState.minPrice || '';
    if (maxDesk) maxDesk.value = shopState.maxPrice || '';
    if (minMob) minMob.value = shopState.minPrice || '';
    if (maxMob) maxMob.value = shopState.maxPrice || '';

    // Highlight matching price chip preset
    document.querySelectorAll('[data-price-min]').forEach(chip => {
      const min = chip.getAttribute('data-price-min') || '';
      const max = chip.getAttribute('data-price-max') || '';
      const isMatch = (shopState.minPrice === min && shopState.maxPrice === max);
      if (isMatch) {
        chip.style.borderColor = 'var(--color-accent, #8D9CF5)';
        chip.style.backgroundColor = 'rgba(64,99,178,0.2)';
        chip.style.color = '#fff';
      } else {
        chip.style.borderColor = '';
        chip.style.backgroundColor = '';
        chip.style.color = '';
      }
    });

    // Brand checkboxes
    const selectedBrands = (shopState.brand || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    document.querySelectorAll('[data-brand-name]').forEach(cb => {
      const bName = (cb.getAttribute('data-brand-name') || '').toLowerCase();
      cb.checked = selectedBrands.includes(bName);
    });
  }

  function renderActiveFilterChips() {
    const bar = document.getElementById('shop-active-filters-bar');
    const mobileCount = document.getElementById('mobile-filter-count');
    const shopFilterCount = document.getElementById('shop-filter-active-count');
    const brandCountBadge = document.getElementById('filter-brands-selected-count');

    const selectedBrands = shopState.brand ? shopState.brand.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (brandCountBadge) {
      brandCountBadge.textContent = selectedBrands.length > 0 ? `(${selectedBrands.length})` : '';
    }

    let activeCount = 0;
    let chips = [];

    if (shopState.category) {
      activeCount++;
      const catLabel = (shopState.categoryName || shopState.category).replace(/-/g, ' ');
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#4063B2]/15 text-[#4063B2] dark:text-[#8D9CF5] border border-[#4063B2]/30">
          <span>${isRtl ? 'الفئة:' : 'Category:'} <strong>${catLabel}</strong></span>
          <button type="button" data-clear="category" aria-label="Remove category filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    selectedBrands.forEach(b => {
      activeCount++;
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
          <span>${b}</span>
          <button type="button" data-clear-brand="${b}" aria-label="Remove brand filter ${b}" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    });

    if (shopState.minPrice || shopState.maxPrice) {
      activeCount++;
      const minText = shopState.minPrice ? formatPrice(shopState.minPrice) : '0';
      const maxText = shopState.maxPrice ? formatPrice(shopState.maxPrice) : '+∞';
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span>${minText} – ${maxText}</span>
          <button type="button" data-clear="price" aria-label="Remove price filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    if (shopState.inStock) {
      activeCount++;
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <span>${isRtl ? 'متوفر فقط' : 'In Stock Only'}</span>
          <button type="button" data-clear="inStock" aria-label="Remove in-stock filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    if (shopState.isOffer) {
      activeCount++;
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          <span>${isRtl ? 'عروض فقط' : 'Offers Only'}</span>
          <button type="button" data-clear="isOffer" aria-label="Remove offers filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    if (shopState.search) {
      activeCount++;
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
          <span>"${shopState.search}"</span>
          <button type="button" data-clear="search" aria-label="Remove search term" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    [mobileCount, shopFilterCount].forEach(badge => {
      if (!badge) return;
      if (activeCount > 0) {
        badge.textContent = activeCount;
        badge.classList.remove('hidden');
        badge.classList.add('inline-flex');
      } else {
        badge.classList.add('hidden');
        badge.classList.remove('inline-flex');
      }
    });

    if (!bar) return;

    if (activeCount > 0) {
      bar.innerHTML = `
        <div class="flex flex-wrap items-center gap-2 flex-1">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">${isRtl ? 'الفلاتر النشطة:' : 'Active Filters:'}</span>
          ${chips.join('')}
        </div>
        <button id="shop-clear-all-filters" type="button" class="text-xs font-bold text-rose-500 hover:underline cursor-pointer flex-shrink-0">
          ${isRtl ? 'مسح الكل' : 'Clear All'}
        </button>
      `;
      bar.classList.remove('hidden');
      bar.classList.add('flex');

      bar.querySelectorAll('[data-clear]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-clear');
          if (key === 'category') { shopState.category = ''; shopState.categoryName = ''; }
          if (key === 'price') { shopState.minPrice = ''; shopState.maxPrice = ''; }
          if (key === 'inStock') shopState.inStock = false;
          if (key === 'isOffer') shopState.isOffer = false;
          if (key === 'search') {
            shopState.search = '';
            const sInput = document.getElementById('shop-search-input');
            if (sInput) sInput.value = '';
          }
          shopState.page = 1;
          syncShopInputs();
          syncShopUrlParams();
          renderShop();
          loadShopCategories();
        });
      });

      bar.querySelectorAll('[data-clear-brand]').forEach(btn => {
        btn.addEventListener('click', () => {
          const brandToClear = btn.getAttribute('data-clear-brand');
          const remaining = (shopState.brand || '').split(',').map(s => s.trim()).filter(b => b && b.toLowerCase() !== brandToClear.toLowerCase());
          shopState.brand = remaining.join(',');
          shopState.page = 1;
          syncShopInputs();
          syncShopUrlParams();
          renderShop();
        });
      });

      const clearAllBtn = document.getElementById('shop-clear-all-filters');
      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
          shopState.category = '';
          shopState.categoryName = '';
          shopState.brand = '';
          shopState.minPrice = '';
          shopState.maxPrice = '';
          shopState.inStock = false;
          shopState.isOffer = false;
          shopState.search = '';
          shopState.page = 1;
          const sInput = document.getElementById('shop-search-input');
          if (sInput) sInput.value = '';
          syncShopInputs();
          syncShopUrlParams();
          renderShop();
          loadShopCategories();
        });
      }
    } else {
      bar.innerHTML = '';
      bar.classList.add('hidden');
      bar.classList.remove('flex');
    }
  }

  async function loadShopCategories() {
    const pillsContainer = document.getElementById('shop-category-pills');
    const sideCatContainer = document.getElementById('filter-category-list');
    if (!pillsContainer && !sideCatContainer) return;

    try {
      let categories;
      if (global.api && typeof global.api.getCategories === 'function') {
        categories = await global.api.getCategories();
      } else {
        const res = await fetch('/api/categories');
        categories = await res.json();
      }
      if (!Array.isArray(categories)) return;

      const activeCat = (shopState.category || '').toLowerCase();
      
      const currentCatObj = categories.find(c => (c.slug || c.id || '').toLowerCase() === activeCat);
      if (currentCatObj) {
        shopState.categoryName = (isRtl && currentCatObj.name_ar) ? currentCatObj.name_ar : (currentCatObj.name || activeCat);
      } else if (!activeCat) {
        shopState.categoryName = '';
      }

      // 1. Top horizontal category pills
      if (pillsContainer) {
        let html = `
          <a href="javascript:void(0)" data-category-slug=""
             class="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${!activeCat ? 'bg-[#4063B2] text-white shadow-[0_4px_12px_rgba(64,99,178,0.25)]' : 'border border-slate-700/30 text-slate-400 hover:text-white'}">
            ${isRtl ? 'جميع المنتجات' : 'All Products'}
          </a>
        `;

        categories.forEach(cat => {
          const slug = cat.slug || cat.id;
          const name = (isRtl && cat.name_ar) ? cat.name_ar : (cat.name || slug);
          const isActive = Boolean(activeCat && activeCat === (slug || '').toLowerCase());
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
            const targetSlug = btn.getAttribute('data-category-slug') || '';
            shopState.category = targetSlug.toLowerCase();
            shopState.page = 1;
            syncShopUrlParams();
            renderShop();
            loadShopCategories();
          });
        });
      }

      // 2. Sidebar category list
      if (sideCatContainer) {
        let sideHtml = `
          <button type="button" data-sidebar-cat="" class="w-full text-left flex items-center justify-between text-xs py-1.5 px-2 rounded-lg cursor-pointer transition-all ${!activeCat ? 'bg-[#4063B2] text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'}" style="${!activeCat ? '' : 'color:var(--text-secondary)'}">
            <span>${isRtl ? 'جميع الفئات' : 'All Categories'}</span>
            <span class="text-[10px] opacity-75">•</span>
          </button>
        `;

        categories.forEach(cat => {
          const slug = cat.slug || cat.id;
          const name = (isRtl && cat.name_ar) ? cat.name_ar : (cat.name || slug);
          const isActive = Boolean(activeCat && activeCat === (slug || '').toLowerCase());
          const count = cat.product_count !== undefined ? `(${cat.product_count})` : '';

          sideHtml += `
            <button type="button" data-sidebar-cat="${slug}" class="w-full text-left flex items-center justify-between text-xs py-1.5 px-2 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-[#4063B2] text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'}" style="${isActive ? '' : 'color:var(--text-secondary)'}">
              <span class="truncate pr-1">${name}</span>
              ${count ? `<span class="text-[10px] font-mono opacity-70">${count}</span>` : ''}
            </button>
          `;
        });

        sideCatContainer.innerHTML = sideHtml;

        sideCatContainer.querySelectorAll('[data-sidebar-cat]').forEach(btn => {
          btn.addEventListener('click', () => {
            const targetSlug = btn.getAttribute('data-sidebar-cat') || '';
            shopState.category = targetSlug.toLowerCase();
            shopState.page = 1;
            syncShopUrlParams();
            renderShop();
            loadShopCategories();
          });
        });
      }
    } catch (e) {
      console.warn('Could not load shop categories:', e);
    }
  }

  async function loadShopBrands() {
    const listDesk = document.getElementById('filter-brand-list');
    const listMob = document.getElementById('mobile-filter-brand-list');
    if (!listDesk && !listMob) return;

    const defaultBrands = [
      { name: 'HP', count: 258 },
      { name: 'Lenovo', count: 219 },
      { name: 'Platinum', count: 119 },
      { name: 'D-Link', count: 91 },
      { name: 'Resto', count: 88 },
      { name: 'HyperX', count: 29 },
      { name: 'NowGo', count: 18 },
      { name: 'Transformers', count: 11 },
      { name: 'Kingston', count: 9 },
      { name: 'Ricoh', count: 5 },
      { name: 'Apple' },
      { name: 'Dell' },
      { name: 'Samsung' },
      { name: 'ASUS' },
      { name: 'Alienware' },
      { name: 'Anker' },
      { name: 'Belkin' },
      { name: 'Razer' },
      { name: 'Corsair' },
      { name: 'TP-Link' },
      { name: 'Logitech' },
      { name: 'Acer' },
      { name: 'MSI' },
      { name: 'Sony' }
    ];

    let brandsList = defaultBrands;
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        brandsList = data.map(b => ({
          name: b.name,
          count: b.product_count !== undefined ? b.product_count : (b.count || 0)
        }));
      }
    } catch (e) {
      console.warn('Could not load brands from API for shop sidebar, using defaults:', e);
    }

    const renderBrandItems = (container) => {
      if (!container) return;
      const selected = (shopState.brand || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      container.innerHTML = brandsList.map(b => {
        const isChecked = selected.includes(b.name.toLowerCase());
        return `
          <label class="brand-item flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors" data-brand-search="${b.name.toLowerCase()}">
            <div class="flex items-center gap-2">
              <input type="checkbox" data-brand-name="${b.name}" ${isChecked ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-slate-600 text-[#4063B2] focus:ring-0 cursor-pointer" />
              <span class="font-medium" style="color:var(--text-primary)">${b.name}</span>
            </div>
            ${b.count ? `<span class="text-[10px] text-slate-400 font-mono">(${b.count})</span>` : ''}
          </label>
        `;
      }).join('');

      container.querySelectorAll('[data-brand-name]').forEach(cb => {
        cb.addEventListener('change', () => {
          const brandName = cb.getAttribute('data-brand-name');
          let current = (shopState.brand || '').split(',').map(s => s.trim()).filter(Boolean);
          if (cb.checked) {
            if (!current.some(x => x.toLowerCase() === brandName.toLowerCase())) {
              current.push(brandName);
            }
          } else {
            current = current.filter(x => x.toLowerCase() !== brandName.toLowerCase());
          }
          shopState.brand = current.join(',');
          shopState.page = 1;
          syncShopInputs();
          syncShopUrlParams();
          renderShop();
        });
      });
    };

    renderBrandItems(listDesk);
    renderBrandItems(listMob);

    const brandSearchInput = document.getElementById('filter-brand-search-input');
    if (brandSearchInput) {
      brandSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.brand-item').forEach(item => {
          const itemText = item.getAttribute('data-brand-search') || '';
          item.style.display = (!query || itemText.includes(query)) ? '' : 'none';
        });
      });
    }
  }

  function renderPagination() {
    const container = document.getElementById('shop-pagination-container');
    if (!container) return;

    if (!shopState.totalPages || shopState.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const cur = shopState.page;
    const total = shopState.totalPages;

    // Windowed page numbers with ellipsis
    const pageItems = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pageItems.push(i);
    } else {
      pageItems.push(1);

      let start = Math.max(2, cur - 1);
      let end = Math.min(total - 1, cur + 1);

      if (cur <= 3) {
        start = 2;
        end = 4;
      } else if (cur >= total - 2) {
        start = total - 3;
        end = total - 1;
      }

      if (start > 2) {
        pageItems.push('...');
      }

      for (let i = start; i <= end; i++) {
        pageItems.push(i);
      }

      if (end < total - 1) {
        pageItems.push('...');
      }

      pageItems.push(total);
    }

    let html = '';
    const prevDisabled = cur <= 1;
    html += `
      <button ${prevDisabled ? 'disabled' : ''} data-page="${cur - 1}"
        class="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${prevDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary-500 hover:text-primary-500'}"
        style="background:var(--bg-surface-2);border-color:var(--border-color);color:var(--text-primary)">
        ${isRtl ? 'السابق' : 'Previous'}
      </button>
    `;

    pageItems.forEach(item => {
      if (item === '...') {
        html += `
          <span class="w-9 h-9 flex items-center justify-center text-xs font-bold text-slate-400 select-none">
            &hellip;
          </span>
        `;
      } else {
        const isCurrent = item === cur;
        html += `
          <button data-page="${item}"
            class="w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${isCurrent ? 'bg-[#4063B2] text-white shadow-md' : 'border hover:border-primary-500'}"
            style="${isCurrent ? '' : 'background:var(--bg-surface-2);border-color:var(--border-color);color:var(--text-primary)'}">
            ${item}
          </button>
        `;
      }
    });

    const nextDisabled = cur >= total;
    html += `
      <button ${nextDisabled ? 'disabled' : ''} data-page="${cur + 1}"
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
          syncShopUrlParams();
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

    // Keep active filters bar hidden while loading products
    const activeFiltersBar = document.getElementById('shop-active-filters-bar');
    if (activeFiltersBar) activeFiltersBar.classList.add('hidden');

    function revealShopFilters() {
      const filterSidebar = document.getElementById('shop-filters-sidebar');
      if (filterSidebar) {
        filterSidebar.style.display = '';
        filterSidebar.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        filterSidebar.classList.add('lg:block', 'opacity-100', 'pointer-events-auto');
      }
      const mobFilterBtn = document.getElementById('mobile-filter-btn');
      if (mobFilterBtn) {
        mobFilterBtn.style.display = '';
      }
      const shopFilterOpenBtn = document.getElementById('shop-filter-open-btn');
      if (shopFilterOpenBtn) {
        shopFilterOpenBtn.style.display = '';
      }
      renderActiveFilterChips();
      syncShopInputs();
    }

    const params = {
      page: shopState.page,
      limit: shopState.limit,
      sort: shopState.sort
    };
    if (shopState.category) params.category = shopState.category;
    if (shopState.brand) params.brand = shopState.brand;
    if (shopState.minPrice) params.minPrice = shopState.minPrice;
    if (shopState.maxPrice) params.maxPrice = shopState.maxPrice;
    if (shopState.inStock) params.inStock = 'true';
    if (shopState.isOffer) params.isOffer = 'true';
    if (shopState.search) params.search = shopState.search;

    const cacheKey = JSON.stringify(params);

    function displayCatalogData(data) {
      const items = data.products || data.items || data.data || (Array.isArray(data) ? data : []);
      shopState.total = data.total !== undefined ? data.total : items.length;
      shopState.totalPages = data.totalPages || 1;

      // Update counters
      const counterEl = document.getElementById('shop-items-counter');
      if (counterEl) {
        const start = shopState.total === 0 ? 0 : (shopState.page - 1) * shopState.limit + 1;
        const end = Math.min(shopState.page * shopState.limit, shopState.total);
        counterEl.innerHTML = `<span>${isRtl ? 'عرض' : 'Showing'} <strong style="color:var(--text-primary)">${start}–${end}</strong> ${isRtl ? 'من أصل' : 'of'} <strong style="color:var(--text-primary)">${shopState.total}</strong> ${isRtl ? 'منتج' : 'items'}</span>`;
      }

      if (items.length === 0) {
        container.innerHTML = `<div class="col-span-full w-full py-20 text-center text-slate-400 font-medium">${isRtl ? 'لم يتم العثور على منتجات مطابقة لخياراتك.' : 'No products found matching your selection.'}</div>`;
        renderPagination();
        revealShopFilters();
        return;
      }

      container.innerHTML = items.map((p, idx) => renderProductCard(p, idx)).join('');
      if (window.Wishlist && typeof window.Wishlist.sync === 'function') window.Wishlist.sync();
      renderPagination();
      if (window.observeAnimations) window.observeAnimations();
      container.querySelectorAll('.card, [data-animate]').forEach(card => card.classList.add('anim-visible'));
      
      revealShopFilters();
    }

    // Check fast client-side in-memory cache for instant filter responses
    const cachedEntry = shopCatalogCache.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < SHOP_CACHE_TTL_MS)) {
      displayCatalogData(cachedEntry.data);
      return;
    }

    // Cancel in-flight request if another filter was tapped rapidly
    if (shopAbortController) {
      shopAbortController.abort();
    }
    shopAbortController = new AbortController();
    const { signal } = shopAbortController;

    // Centered modern dual-ring loading state across all screen sizes
    container.innerHTML = `
      <div class="col-span-full w-full min-h-[420px] flex flex-col items-center justify-center py-20 px-4 text-center my-auto">
        <div class="relative w-14 h-14 mb-4 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full border-4 border-[#8D9CF5]/20"></div>
          <div class="absolute inset-0 rounded-full border-4 border-[#4063B2] border-t-transparent animate-spin"></div>
          <div class="w-6 h-6 rounded-full bg-[#4063B2]/20 animate-pulse"></div>
        </div>
        <h4 class="font-display font-bold text-base sm:text-lg tracking-tight" style="color:var(--text-primary)">
          ${isRtl ? 'جاري تحميل المنتجات...' : 'Loading Products...'}
        </h4>
        <p class="text-xs text-slate-400 font-medium max-w-xs mt-1">
          ${isRtl ? 'يرجى الانتظار، جاري جلب أحدث المنتجات...' : 'Fetching the latest catalog items'}
        </p>
      </div>
    `;

    try {
      let data;
      const queryStr = '?' + new URLSearchParams(params).toString();
      try {
        // Fast primary fetch directly from local proxied endpoint with instant abort signal
        const res = await fetch(`/api/products${queryStr}`, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      } catch (primaryErr) {
        if (signal.aborted) return;
        if (global.api && typeof global.api.getProducts === 'function') {
          try {
            data = await global.api.getProducts(params);
          } catch (apiErr) {
            console.warn('api.getProducts fallback failed, using cloud fallback...', apiErr);
            const res = await fetch(`https://api-44oukcn4rq-uc.a.run.app/api/products${queryStr}`, { signal });
            data = await res.json();
          }
        } else {
          console.warn('Primary products fetch failed, attempting cloud backend direct fallback...', primaryErr);
          const res = await fetch(`https://api-44oukcn4rq-uc.a.run.app/api/products${queryStr}`, { signal });
          data = await res.json();
        }
      }

      if (signal.aborted) return;

      // Save into fast client-side cache
      shopCatalogCache.set(cacheKey, { timestamp: Date.now(), data });

      displayCatalogData(data);
    } catch (err) {
      if (signal.aborted) return;
      console.error('Failed to load shop catalog:', err);
      container.innerHTML = `<div class="col-span-full w-full py-20 text-center text-rose-500 font-medium">${isRtl ? 'تعذر تحميل المنتجات.' : 'Unable to load products from server.'}</div>`;
      revealShopFilters();
    }
  }

  function initShopPage() {
    const container = document.getElementById('shop-products-container');
    if (!container) return;

    // Read initial URL params or clean path /category/:slug/ or /ar/category/:slug/
    const catMatch = window.location.pathname.match(/(?:\/ar)?\/category\/([^/?#]+)/i);
    if (catMatch && catMatch[1]) {
      shopState.category = decodeURIComponent(catMatch[1]).trim().toLowerCase();
    }
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('category')) {
      shopState.category = searchParams.get('category').trim().toLowerCase();
      if (window.history && window.history.replaceState && !searchParams.has('search') && !searchParams.has('brand') && !searchParams.has('minPrice')) {
        const isArabic = window.location.pathname.startsWith('/ar');
        const cleanCatPath = `${isArabic ? '/ar' : ''}/category/${encodeURIComponent(shopState.category)}/`;
        window.history.replaceState(null, '', cleanCatPath);
      }
    }
    if (searchParams.has('brand')) shopState.brand = searchParams.get('brand').trim();
    if (searchParams.has('minPrice')) shopState.minPrice = searchParams.get('minPrice').trim();
    if (searchParams.has('maxPrice')) shopState.maxPrice = searchParams.get('maxPrice').trim();
    if (searchParams.has('inStock')) shopState.inStock = searchParams.get('inStock') === 'true';
    if (searchParams.has('isOffer')) shopState.isOffer = searchParams.get('isOffer') === 'true';
    if (searchParams.has('search')) shopState.search = searchParams.get('search');
    if (searchParams.has('sort')) shopState.sort = searchParams.get('sort');
    if (searchParams.has('page')) shopState.page = parseInt(searchParams.get('page'), 10) || 1;
    if (searchParams.has('per_page')) shopState.limit = parseInt(searchParams.get('per_page'), 10) || 12;

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
          syncShopUrlParams();
          renderShop();
        }, 350);
      });
    }
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (searchInput) shopState.search = searchInput.value.trim();
        shopState.page = 1;
        syncShopUrlParams();
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
        syncShopUrlParams();
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
          syncShopUrlParams();
          renderShop();
        });
      });
    }

    // In Stock toggles (Desktop & Mobile)
    const handleInStockToggle = (e) => {
      shopState.inStock = e.target.checked;
      shopState.page = 1;
      syncShopInputs();
      syncShopUrlParams();
      renderShop();
    };
    const inStockDesk = document.getElementById('filter-in-stock-only');
    const inStockMob = document.getElementById('mobile-filter-in-stock-only');
    if (inStockDesk) inStockDesk.addEventListener('change', handleInStockToggle);
    if (inStockMob) inStockMob.addEventListener('change', handleInStockToggle);

    // Offers toggles (Desktop & Mobile)
    const handleOffersToggle = (e) => {
      shopState.isOffer = e.target.checked;
      shopState.page = 1;
      syncShopInputs();
      syncShopUrlParams();
      renderShop();
    };
    const offersDesk = document.getElementById('filter-offers-only');
    const offersMob = document.getElementById('mobile-filter-offers-only');
    if (offersDesk) offersDesk.addEventListener('change', handleOffersToggle);
    if (offersMob) offersMob.addEventListener('change', handleOffersToggle);

    // Price Apply triggers
    const applyPriceFilter = (minVal, maxVal) => {
      shopState.minPrice = minVal !== undefined && minVal !== '' ? String(minVal).trim() : '';
      shopState.maxPrice = maxVal !== undefined && maxVal !== '' ? String(maxVal).trim() : '';
      shopState.page = 1;
      syncShopInputs();
      syncShopUrlParams();
      renderShop();
    };

    const priceApplyBtnDesk = document.getElementById('filter-price-apply-btn');
    if (priceApplyBtnDesk) {
      priceApplyBtnDesk.addEventListener('click', () => {
        const minVal = document.getElementById('filter-min-price')?.value;
        const maxVal = document.getElementById('filter-max-price')?.value;
        applyPriceFilter(minVal, maxVal);
      });
    }
    const priceApplyBtnMob = document.getElementById('mobile-filter-price-apply-btn');
    if (priceApplyBtnMob) {
      priceApplyBtnMob.addEventListener('click', () => {
        const minVal = document.getElementById('mobile-filter-min-price')?.value;
        const maxVal = document.getElementById('mobile-filter-max-price')?.value;
        applyPriceFilter(minVal, maxVal);
        if (window.closeMobileFilterDrawer) window.closeMobileFilterDrawer();
      });
    }

    // Price Preset Chips
    document.querySelectorAll('[data-price-min]').forEach(chip => {
      chip.addEventListener('click', () => {
        const min = chip.getAttribute('data-price-min') || '';
        const max = chip.getAttribute('data-price-max') || '';
        applyPriceFilter(min, max);
        if (window.closeMobileFilterDrawer) window.closeMobileFilterDrawer();
      });
    });

    window.addEventListener('popstate', () => {
      const p = new URLSearchParams(window.location.search);
      shopState.category = p.get('category')?.trim().toLowerCase() || '';
      shopState.brand = p.get('brand')?.trim() || '';
      shopState.minPrice = p.get('minPrice')?.trim() || '';
      shopState.maxPrice = p.get('maxPrice')?.trim() || '';
      shopState.inStock = p.get('inStock') === 'true';
      shopState.isOffer = p.get('isOffer') === 'true';
      shopState.search = p.get('search')?.trim() || '';
      shopState.sort = p.get('sort')?.trim() || 'featured';
      shopState.page = parseInt(p.get('page'), 10) || 1;
      shopState.limit = parseInt(p.get('per_page'), 10) || 12;
      if (searchInput) searchInput.value = shopState.search;
      if (sortSelect) sortSelect.value = shopState.sort;
      syncShopInputs();
      loadShopCategories();
      renderShop();
    });

    loadShopCategories();
    loadShopBrands();
    renderShop();
  }

  // ─── 3. PRODUCT DETAIL HYDRATION ─────────────────────────────────────────
  async function hydrateProductDetail() {
    const titleEl = document.getElementById('product-title');
    const detailView = document.getElementById('product-detail-view');
    const notFoundView = document.getElementById('product-not-found-view');

    function showNotFound() {
      if (detailView) detailView.classList.add('hidden');
      if (notFoundView) notFoundView.classList.remove('hidden');
      document.title = `${isRtl ? 'المنتج غير موجود' : 'Product Not Found'} — M.SHOP Qatar`;
    }

    if (!titleEl || !global.api) return;

    // Extract slug from standard clean path /product/:slug/ or /ar/product/:slug/, with query fallback
    let slug = '';
    const pathname = window.location.pathname;
    const match = pathname.match(/(?:\/ar)?\/product\/([^/?#]+)/i);
    if (match && match[1] && match[1] !== 'index.html') {
      slug = decodeURIComponent(match[1]);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      slug = urlParams.get('slug') || urlParams.get('id') || '';
    }

    if (!slug) {
      showNotFound();
      return;
    }

    // If loaded via legacy ?slug= query param, update URL to clean standard path
    if (window.history && window.history.replaceState && window.location.search.includes('slug=')) {
      const isArabic = pathname.startsWith('/ar');
      const cleanPath = `${isArabic ? '/ar' : ''}/product/${encodeURIComponent(slug)}/`;
      window.history.replaceState(null, '', cleanPath);
    }

    let product;
    try {
      product = await global.api.getProduct(slug);
    } catch (err) {
      console.error('Failed to fetch product:', err);
      showNotFound();
      return;
    }

    if (!product || !product.name) {
      showNotFound();
      return;
    }

    // Product found successfully: ensure detail view is shown and 404 view is hidden
    if (detailView) detailView.classList.remove('hidden');
    if (notFoundView) notFoundView.classList.add('hidden');

    try {
      const pName = (isRtl && (product.name_ar || product.nameAr)) ? (product.name_ar || product.nameAr) : (product.name || 'Product');
      const rawDesc = (isRtl && (product.description_ar || product.descriptionAr))
        ? (product.description_ar || product.descriptionAr)
        : (product.description || '');
      const pDesc = typeof rawDesc === 'string'
        ? rawDesc
        : (Array.isArray(rawDesc) ? rawDesc.join('\n') : (rawDesc ? String(rawDesc) : ''));

      const rawShortDesc = (isRtl && (product.short_description_ar || product.shortDescriptionAr))
        ? (product.short_description_ar || product.shortDescriptionAr)
        : (product.short_description || product.shortDescription || '');
      const pShortDesc = typeof rawShortDesc === 'string'
        ? rawShortDesc
        : (Array.isArray(rawShortDesc) ? rawShortDesc.join('\n') : (rawShortDesc ? String(rawShortDesc) : ''));

      const pPrice = product.price;
      const pOrigPrice = product.original_price || product.originalPrice;
      const pStockCount = product.stock_count !== undefined ? Number(product.stock_count) : (product.stock !== undefined ? Number(product.stock) : null);
      const inStock = Boolean(
        product.in_stock !== false &&
        product.in_stock !== 'false' &&
        product.stock_status !== 'outofstock' &&
        product.stock_status !== 'OUT_OF_STOCK' &&
        (pStockCount === null || pStockCount > 0)
      );
      const pStock = pStockCount !== null ? pStockCount : (inStock ? 10 : 0);
      const primaryImage = product.image || (Array.isArray(product.images) && product.images[0]) || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg';
      function slugifyText(text) {
        if (!text) return '';
        let cleaned = String(text)
          .replace(/\s*[\-\|]\s*(M\.SHOP|MARJAAH|Qatar|Store|Shop).*$/i, '')
          .trim();
        if (!cleaned) cleaned = String(text);
        return cleaned
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      const cleanSlug = product.slug || product.urlSlug || slugifyText(product.seo_title) || slugifyText(product.name) || slug;

      // 0. Automatically update the browser's address bar to domain / product / proper SEO title slug
      const isArabic = isRtl || pathname.startsWith('/ar') || (document.documentElement && document.documentElement.getAttribute('dir') === 'rtl');
      const canonicalPath = `${isArabic ? '/ar' : ''}/product/${encodeURIComponent(cleanSlug)}/`;
      if (window.history && window.history.replaceState) {
        const curPath = window.location.pathname.replace(/\/+$/, '') + '/';
        const tgtPath = canonicalPath.replace(/\/+$/, '') + '/';
        if (curPath !== tgtPath || window.location.search.length > 0) {
          window.history.replaceState(null, '', canonicalPath);
        }
      }

      // 1. Canonical & Hreflang SEO tags
      const siteBaseUrl = 'https://www.marjaah.shop';
      const canonicalTag = document.getElementById('canonical-tag');
      if (canonicalTag) canonicalTag.href = `${siteBaseUrl}/product/${encodeURIComponent(cleanSlug)}/`;
      const hreflangEn = document.getElementById('hreflang-en');
      if (hreflangEn) hreflangEn.href = `${siteBaseUrl}/product/${encodeURIComponent(cleanSlug)}/`;
      const hreflangAr = document.getElementById('hreflang-ar');
      if (hreflangAr) hreflangAr.href = `${siteBaseUrl}/ar/product/${encodeURIComponent(cleanSlug)}/`;
      const hreflangDefault = document.getElementById('hreflang-default');
      if (hreflangDefault) hreflangDefault.href = `${siteBaseUrl}/product/${encodeURIComponent(cleanSlug)}/`;

      // 2. SEO Title & Meta Description
      const seoTitle = (isRtl && product.seoTitleAr) || product.seoTitle || product.seo_title || `${pName} — M.SHOP Qatar`;
      document.title = seoTitle;
      const metaDescEl = document.getElementById('page-meta-desc') || document.querySelector('meta[name="description"]');
      const seoDesc = (isRtl && product.metaDescriptionAr) || product.metaDescription || product.meta_description || pShortDesc || (pDesc ? pDesc.replace(/<[^>]+>/g, '').slice(0, 160) : '');
      if (metaDescEl && seoDesc) metaDescEl.setAttribute('content', seoDesc);

      // 3. Schema.org JSON-LD Structured Data
      const schemaEl = document.getElementById('product-schema-jsonld');
      if (schemaEl) {
        const schema = {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": pName,
          "image": Array.isArray(product.images) && product.images.length > 0 ? product.images : [primaryImage],
          "description": seoDesc || pName,
          "sku": product.sku || product.id,
          "brand": {
            "@type": "Brand",
            "name": product.brand || "M.SHOP"
          },
          "offers": {
            "@type": "Offer",
            "url": `${siteBaseUrl}/product/${encodeURIComponent(cleanSlug)}/`,
            "priceCurrency": "QAR",
            "price": pPrice,
            "itemCondition": "https://schema.org/NewCondition",
            "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
              "@type": "Organization",
              "name": "M.SHOP Qatar"
            }
          }
        };
        schemaEl.textContent = JSON.stringify(schema, null, 2);
      }

      // Track ViewContent for GA4, Meta Pixel, Snapchat Pixel
      if (global.MShopTracker && typeof global.MShopTracker.trackViewItem === 'function') {
        try {
          global.MShopTracker.trackViewItem({
            sku: product.sku || product.id,
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category || product.category_name || ''
          });
        } catch (e) { }
      }

      // Breadcrumb & Category Link
      const crumbNameEl = document.getElementById('product-crumb-name');
      if (crumbNameEl) crumbNameEl.textContent = pName;
      const catLinkEl = document.getElementById('product-category-link');
      if (catLinkEl && (product.category || product.category_name)) {
        const catName = product.category || product.category_name;
        catLinkEl.textContent = catName;
        catLinkEl.href = `${isRtl ? '/ar' : ''}/category/${encodeURIComponent(product.category_slug || catName)}/`;
      }

      // Title & Brand & SKU
      titleEl.textContent = pName;
      const brandEl = document.getElementById('product-brand');
      if (brandEl) brandEl.textContent = product.brand || product.brand_name || 'M.SHOP';
      const skuEl = document.getElementById('product-sku');
      if (skuEl) skuEl.textContent = `SKU: ${product.sku || product.id || 'N/A'}`;

      // Rating & Reviews Count
      const ratingContainer = document.getElementById('product-rating-container');
      if (ratingContainer) {
        const rating = Number(product.rating || product.ratings || 5.0);
        const reviewsCount = Number(product.review_count || product.reviews_count || product.reviewsCount || 0);
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        let starsHtml = '';
        for (let i = 0; i < 5; i++) {
          if (i < fullStars) {
            starsHtml += `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
          } else if (i === fullStars && hasHalf) {
            starsHtml += `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-amber-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
          } else {
            starsHtml += `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-600"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
          }
        }
        ratingContainer.innerHTML = `
          <div class="flex items-center gap-0.5">${starsHtml}</div>
          <span class="text-sm font-bold" style="color:var(--text-primary)">${rating.toFixed(1)}</span>
          <span class="text-xs" style="color:var(--text-tertiary)">(${reviewsCount} ${isRtl ? 'تقييم' : (reviewsCount === 1 ? 'review' : 'reviews')})</span>
        `;
      }

      // ── Normalize Images List (array, JSON string, or comma-separated) ──
      let imagesList = [];
      if (Array.isArray(product.images) && product.images.length > 0) {
        imagesList = product.images.filter(Boolean);
      } else if (typeof product.images === 'string' && product.images.trim()) {
        try {
          const parsed = JSON.parse(product.images);
          if (Array.isArray(parsed)) imagesList = parsed.filter(Boolean);
        } catch (e) {
          imagesList = product.images.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
        }
      }
      if (primaryImage && !imagesList.includes(primaryImage)) {
        imagesList.unshift(primaryImage);
      }
      if (imagesList.length === 0) {
        imagesList = [primaryImage];
      }

      // Main Image, Prev/Next Arrows, Badge & Thumbnails
      const mainImg = document.getElementById('main-image');
      const prevBtn = document.getElementById('gallery-prev-btn');
      const nextBtn = document.getElementById('gallery-next-btn');
      const indexBadge = document.getElementById('gallery-index-badge');
      const thumbsContainer = document.getElementById('product-thumbnails-container');
      let activeImageIdx = 0;

      function setActiveImage(idx) {
        if (idx < 0) idx = imagesList.length - 1;
        if (idx >= imagesList.length) idx = 0;
        activeImageIdx = idx;

        const currentUrl = imagesList[activeImageIdx];
        const currentAlt = (product.imagesMetadata && product.imagesMetadata[activeImageIdx]?.alt) ||
          (product.imagesAlt && product.imagesAlt[activeImageIdx]) ||
          `${pName} - Image ${activeImageIdx + 1}`;

        if (mainImg) {
          mainImg.style.opacity = '0.4';
          mainImg.src = currentUrl;
          mainImg.alt = currentAlt;
          setTimeout(() => { mainImg.style.opacity = '1'; }, 50);
        }

        if (indexBadge) {
          indexBadge.textContent = `${activeImageIdx + 1} / ${imagesList.length}`;
        }

        // Highlight active thumbnail and scroll into view smoothly
        if (thumbsContainer) {
          const thumbButtons = thumbsContainer.querySelectorAll('button[data-thumb-idx]');
          thumbButtons.forEach((btn, bIdx) => {
            if (bIdx === activeImageIdx) {
              btn.className = 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-[#4063B2] ring-2 ring-[#4063B2]/50 overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 scale-105 opacity-100 shadow-md';
              try {
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              } catch (e) { }
            } else {
              btn.className = 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-700/30 overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 opacity-60 hover:opacity-90';
            }
          });
        }
      }

      if (imagesList.length > 1) {
        if (prevBtn) {
          prevBtn.classList.remove('hidden');
          prevBtn.classList.add('flex');
          prevBtn.onclick = () => setActiveImage(activeImageIdx - 1);
        }
        if (nextBtn) {
          nextBtn.classList.remove('hidden');
          nextBtn.classList.add('flex');
          nextBtn.onclick = () => setActiveImage(activeImageIdx + 1);
        }
        if (indexBadge) {
          indexBadge.classList.remove('hidden');
        }

        if (thumbsContainer) {
          thumbsContainer.innerHTML = imagesList.map((imgUrl, i) => {
            const thumbAlt = (product.imagesMetadata && product.imagesMetadata[i]?.alt) ||
              (product.imagesAlt && product.imagesAlt[i]) ||
              `${pName} - Thumbnail ${i + 1}`;
            return `
              <button type="button" data-thumb-idx="${i}" aria-label="View image ${i + 1}"
                class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 ${i === 0 ? 'border-2 border-[#4063B2] ring-2 ring-[#4063B2]/50 scale-105 opacity-100 shadow-md' : 'border-slate-700/30 opacity-60 hover:opacity-90'}"
                onclick="window.__selectGalleryImage(${i})">
                <img src="${imgUrl}" alt="${thumbAlt}" class="w-full h-full object-cover" onerror="this.src='/assets/images/products/placeholder.svg'" />
              </button>
            `;
          }).join('');
        }
        window.__selectGalleryImage = setActiveImage;
      } else {
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        if (indexBadge) indexBadge.classList.add('hidden');
        if (thumbsContainer) thumbsContainer.innerHTML = '';
      }

      // Touch swipe support for mobile multi-image scrolling
      if (mainImg && mainImg.parentElement) {
        let touchStartX = 0;
        let touchEndX = 0;
        mainImg.parentElement.addEventListener('touchstart', (e) => {
          if (e.changedTouches && e.changedTouches[0]) {
            touchStartX = e.changedTouches[0].screenX;
          }
        }, { passive: true });
        mainImg.parentElement.addEventListener('touchend', (e) => {
          if (e.changedTouches && e.changedTouches[0] && imagesList.length > 1) {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX;
            if (Math.abs(diff) > 40) {
              if (diff < 0) {
                setActiveImage(activeImageIdx + 1); // Swipe left -> Next image
              } else {
                setActiveImage(activeImageIdx - 1); // Swipe right -> Prev image
              }
            }
          }
        }, { passive: true });
      }

      setActiveImage(0);

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
      if (shortDescEl) {
        if (pShortDesc && pShortDesc.trim()) {
          if (pShortDesc.includes('\n') || pShortDesc.includes('•') || pShortDesc.includes('-')) {
            const lines = pShortDesc.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
            shortDescEl.innerHTML = `<ul class="space-y-1.5 list-disc list-inside text-sm leading-relaxed">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
          } else {
            shortDescEl.textContent = pShortDesc;
          }
          shortDescEl.classList.remove('hidden');
        } else {
          shortDescEl.classList.add('hidden');
        }
      }

      // Compatibility Badges (handles array, JSON string, or comma-separated string)
      const compBox = document.getElementById('product-compatibility-container');
      const compBadges = document.getElementById('product-compatibility-badges');
      let compItems = [];
      const rawComp = product.compatibility || product.compatibleWith || product.compatible_with;
      if (Array.isArray(rawComp)) {
        compItems = rawComp.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof rawComp === 'string' && rawComp.trim()) {
        try {
          const parsed = JSON.parse(rawComp);
          if (Array.isArray(parsed)) {
            compItems = parsed.map(s => String(s).trim()).filter(Boolean);
          } else {
            compItems = rawComp.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
          }
        } catch (e) {
          compItems = rawComp.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
        }
      }
      if (compBox && compBadges && compItems.length > 0) {
        compBadges.innerHTML = compItems.map(c => `
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#4063B2]/20 text-[#8D9CF5] border border-[#8D9CF5]/30">
            ${c}
          </span>
        `).join('');
        compBox.classList.remove('hidden');
        compBox.classList.add('flex');
      } else if (compBox) {
        compBox.classList.add('hidden');
        compBox.classList.remove('flex');
      }

      // Stock Container
      const stockContainer = document.getElementById('product-stock-container');
      if (stockContainer) {
        stockContainer.innerHTML = inStock
          ? `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-xs font-bold text-emerald-500">${isRtl ? `متوفر (${pStock} متبقي)` : `In Stock (${pStock} left)`}</span>`
          : `<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-xs font-bold text-rose-500">${isRtl ? 'غير متوفر حالياً' : 'Out of Stock'}</span>`;
      }

      // Variants Selector (Colour/Size)
      const variantsBox = document.getElementById('product-variants-container');
      const variantsOptions = document.getElementById('product-variants-options');
      const variantLabel = document.getElementById('product-selected-variant-label');
      let variantsList = product.variants;
      if (typeof variantsList === 'string') {
        try { variantsList = JSON.parse(variantsList); } catch (e) { variantsList = []; }
      }
      if (variantsBox && variantsOptions && Array.isArray(variantsList) && variantsList.length > 0) {
        let activeVariantIdx = 0;
        const updateSelectedVariant = (idx) => {
          activeVariantIdx = idx;
          const v = variantsList[idx];
          const vName = (isRtl && (v.nameAr || v.name_ar)) || v.name || v.color || v.size || `Variant ${idx + 1}`;
          if (variantLabel) variantLabel.textContent = vName;
          if (v.price && priceContainer) {
            let phtml = `<span class="text-4xl font-display font-black" style="color:var(--text-primary)">${formatPrice(v.price)}</span>`;
            const origP = v.original_price || (pOrigPrice && pOrigPrice > v.price ? pOrigPrice : null);
            if (origP && origP > v.price) {
              phtml += `<span class="text-lg line-through" style="color:var(--text-tertiary)">${formatPrice(origP)}</span>`;
            }
            priceContainer.innerHTML = phtml;
          }
          if (v.sku && skuEl) skuEl.textContent = `SKU: ${v.sku}`;
          if (v.stock !== undefined && stockContainer) {
            const vInStock = Number(v.stock) > 0;
            stockContainer.innerHTML = vInStock
              ? `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-xs font-bold text-emerald-500">${isRtl ? `متوفر (${v.stock} متبقي)` : `In Stock (${v.stock} left)`}</span>`
              : `<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-xs font-bold text-rose-500">${isRtl ? 'غير متوفر حالياً' : 'Out of Stock'}</span>`;
          }
          if (v.image && mainImg) mainImg.src = v.image;
          renderVariantButtons();
        };

        const renderVariantButtons = () => {
          variantsOptions.innerHTML = variantsList.map((v, i) => {
            const isSel = i === activeVariantIdx;
            const label = (isRtl && (v.nameAr || v.name_ar)) || v.name || v.color || v.size || `Variant ${i + 1}`;
            return `
              <button type="button" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSel ? 'bg-[#4063B2] text-white shadow-md' : 'border border-slate-700/30 text-slate-300 hover:text-white'}" onclick="window.__selectVariant(${i})">
                ${label}
              </button>
            `;
          }).join('');
        };

        window.__selectVariant = updateSelectedVariant;
        updateSelectedVariant(0);
        variantsBox.classList.remove('hidden');
      }

      // Add to Cart Button
      const addBtn = document.getElementById('product-add-to-cart-btn');
      if (addBtn) {
        if (!inStock) {
          addBtn.disabled = true;
          addBtn.setAttribute('aria-disabled', 'true');
          addBtn.removeAttribute('data-add-to-cart');
          addBtn.classList.add('opacity-50', 'cursor-not-allowed');
          addBtn.classList.remove('cursor-pointer');
          addBtn.style.pointerEvents = 'none';
          const span = addBtn.querySelector('span');
          if (span) span.textContent = isRtl ? 'نفذت الكمية' : 'Out of Stock';
        } else {
          addBtn.disabled = false;
          addBtn.removeAttribute('aria-disabled');
          addBtn.setAttribute('data-add-to-cart', product.slug || product.id);
          addBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          addBtn.classList.add('cursor-pointer');
          addBtn.style.pointerEvents = '';
          const span = addBtn.querySelector('span');
          if (span) span.textContent = isRtl ? 'أضف إلى السلة' : 'Add to Cart';
        }
      }

      // Wishlist / Liked Button
      const wishBtn = document.getElementById('product-wishlist-btn');
      if (wishBtn) {
        wishBtn.setAttribute('data-wishlist-toggle', product.slug || product.id);
        if (window.Wishlist && typeof window.Wishlist.sync === 'function') {
          window.Wishlist.sync();
        }
      }

      // Delivery & Warranty
      const delEl = document.getElementById('product-delivery-text');
      if (delEl) {
        const days = product.delivery_days || product.deliveryDays || 1;
        delEl.textContent = isRtl ? `توصيل خلال ${days} يوم في قطر` : `Express Delivery (${days} Day) in Qatar`;
      }
      const warEl = document.getElementById('product-warranty-text');
      if (warEl) {
        const warVal = (isRtl && (product.warrantyAr || product.warranty_ar)) || product.warranty || (product.warranty_months ? `${product.warranty_months} Months Warranty` : '1 Year Brand Warranty');
        warEl.textContent = warVal;
      }

      // Specifications Table (supports array of objects, array of strings, object map, JSON, or pipe/newline text)
      const specsTableTbody = document.getElementById('product-specs-tbody') || document.getElementById('product-specs-table');
      const specsContainer = document.getElementById('product-specs-container') || (specsTableTbody ? specsTableTbody.closest('.rounded-2xl') : null);
      let specs = product.specifications || product.specs;
      if (typeof specs === 'string') {
        try {
          const parsed = JSON.parse(specs);
          specs = parsed;
        } catch (e) {
          specs = specs.split(/[\n|;]+/).map(line => {
            const parts = line.split(/[:=]/);
            if (parts.length >= 2) {
              return { key: parts[0].trim(), value: parts.slice(1).join(':').trim() };
            }
            return null;
          }).filter(Boolean);
        }
      }
      if (specs && typeof specs === 'object' && !Array.isArray(specs)) {
        specs = Object.entries(specs).map(([k, v]) => ({ key: k, value: String(v) }));
      }
      if (specsTableTbody && Array.isArray(specs) && specs.length > 0) {
        const rowsHtml = specs.map(s => {
          if (!s) return '';
          if (typeof s === 'string') {
            const parts = s.split(/[:=]/);
            return `
              <tr style="border-bottom:1px solid var(--border-color)">
                <td class="px-4 py-3 font-medium w-36 sm:w-44" style="color:var(--text-secondary)">${parts[0]?.trim() || ''}</td>
                <td class="px-4 py-3 font-bold" style="color:var(--text-primary)">${parts.slice(1).join(':')?.trim() || ''}</td>
              </tr>
            `;
          }
          const k = (isRtl && (s.keyAr || s.labelAr || s.key_ar || s.label_ar))
            ? (s.keyAr || s.labelAr || s.key_ar || s.label_ar)
            : (s.key || s.label || s.name || '');
          const v = (isRtl && (s.valueAr || s.valAr || s.value_ar || s.val_ar))
            ? (s.valueAr || s.valAr || s.value_ar || s.val_ar)
            : (s.value || s.val || '');
          if (!k && !v) return '';
          return `
            <tr style="border-bottom:1px solid var(--border-color)">
              <td class="px-4 py-3 font-medium w-36 sm:w-44" style="color:var(--text-secondary)">${k}</td>
              <td class="px-4 py-3 font-bold" style="color:var(--text-primary)">${v}</td>
            </tr>
          `;
        }).filter(Boolean).join('');

        if (rowsHtml.trim()) {
          specsTableTbody.innerHTML = rowsHtml;
          if (specsContainer) specsContainer.classList.remove('hidden');
        } else if (specsContainer) {
          specsContainer.classList.add('hidden');
        }
      } else if (specsContainer) {
        specsContainer.classList.add('hidden');
      }

      // What's in the Box (handles string, array, or HTML)
      const inBoxBox = document.getElementById('product-in-box-container');
      const inBoxText = document.getElementById('product-in-box-text');
      const rawInBox = (isRtl && (product.whatsInBoxAr || product.whats_in_box_ar))
        ? (product.whatsInBoxAr || product.whats_in_box_ar)
        : (product.whatsInBox || product.whats_in_box);
      let inBoxContent = '';
      if (Array.isArray(rawInBox)) {
        inBoxContent = rawInBox.map(s => String(s).trim()).filter(Boolean).join('<br/>');
      } else if (typeof rawInBox === 'string' && rawInBox.trim()) {
        inBoxContent = rawInBox.trim();
        inBoxContent = inBoxContent.includes('<') ? inBoxContent : inBoxContent.replace(/\n/g, '<br/>');
      } else if (rawInBox) {
        inBoxContent = String(rawInBox);
      }
      if (inBoxBox && inBoxText) {
        if (inBoxContent) {
          inBoxText.innerHTML = inBoxContent;
          inBoxBox.classList.remove('hidden');
        } else {
          inBoxBox.classList.add('hidden');
        }
      }

      // Long Description (Rich HTML)
      const descEl = document.getElementById('product-description-text');
      const descSection = descEl && typeof descEl.closest === 'function' ? descEl.closest('.mt-14') : null;
      if (descEl) {
        if (pDesc && pDesc.trim()) {
          descEl.innerHTML = pDesc.includes('<') ? pDesc : pDesc.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
          if (descSection) descSection.classList.remove('hidden');
        } else if (descSection) {
          descSection.classList.add('hidden');
        }
      }

      // Related Products
      const relContainer = document.getElementById('product-related-container');
      if (relContainer && Array.isArray(product.related) && product.related.length > 0) {
        relContainer.innerHTML = product.related.map((rp, i) => renderProductCard(rp, i)).join('');
        if (window.Wishlist && typeof window.Wishlist.sync === 'function') {
          window.Wishlist.sync();
        }
      }
    } catch (err) {
      console.warn('Warning during product hydration:', err);
    }
  }

  // ─── 2.5 HOMEPAGE BROWSE BY CATEGORY HYDRATION ─────────────────────────
  async function loadHomeCategoriesGrid() {
    const grid = document.getElementById('home-categories-grid');
    if (!grid) return;

    try {
      let categories = [];
      if (global.api && typeof global.api.getCategories === 'function') {
        categories = await global.api.getCategories();
      } else {
        const res = await fetch('/api/categories');
        categories = await res.json();
      }
      if (!Array.isArray(categories) || categories.length === 0) return;

      // Prioritize categories with products or featured status
      const sorted = categories
        .filter(c => c && c.name)
        .sort((a, b) => {
          const aCount = a.product_count || 0;
          const bCount = b.product_count || 0;
          if (bCount !== aCount) return bCount - aCount;
          return (a.order || 0) - (b.order || 0);
        });

      if (sorted.length === 0) return;

      const defaultCatImages = {
        'mobile-accessories': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/hero-mobile.jpg',
        'laptops-pcs': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/cat-laptops.jpg',
        'laptops': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/cat-laptops.jpg',
        'monitors': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/samsung-odyssey-g5.jpg',
        'peripherals': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/corsair-k70-pro.jpg',
        'storage': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/samsung-970-evo-plus.jpg',
        'gaming': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/razer-blackshark-v2.jpg',
        'networking': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/tplink-deco-xe75.jpg',
        'audio': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/razer-blackshark-v2.jpg',
        'smart-wearables': '/assets/images/categories/cat-smartwatches.svg'
      };

      const isArabic = isRtl || window.location.pathname.startsWith('/ar');

      // 1st category gets the large 2x2 Bento hero card
      const primary = sorted[0];
      const others = sorted.slice(1, 5);

      const primSlug = primary.slug || primary.id;
      const primName = (isArabic && primary.name_ar) ? primary.name_ar : primary.name;
      const primImg = primary.image || defaultCatImages[primSlug] || defaultCatImages[primary.id] || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/cat-laptops.jpg';
      const primHref = `${isArabic ? '/ar' : ''}/shop/?category=${encodeURIComponent(primSlug)}`;
      const primCount = primary.product_count !== undefined ? `${primary.product_count} ${isArabic ? 'منتج' : 'Products'}` : (isArabic ? 'مجموعة مميزة' : 'Featured Collection');

      let html = `
        <!-- Big Featured Category Card -->
        <div class="col-span-2 md:col-span-1 lg:col-span-2 row-span-2">
          <a href="${primHref}">
            <div class="h-[400px] group relative rounded-3xl overflow-hidden border border-[#4063B2]/30 hover:border-[#8D9CF5] hover:shadow-[0_0_30px_rgba(141,156,245,0.3)] transition-all duration-500">
              <img src="${primImg}" alt="${primName}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onerror="this.src='https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/cat-laptops.jpg'" />
              <div class="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#070B14]/40 to-transparent"></div>
              <div class="absolute bottom-0 left-0 right-0 p-8">
                <span class="inline-block px-3 py-1 rounded-full bg-[#4063B2]/30 text-[#8D9CF5] border border-[#8D9CF5]/40 text-xs mb-2 font-sans font-bold">
                  ${primCount} ${primary.name_ar ? `• ${primary.name_ar}` : ''}
                </span>
                <h3 class="text-white text-3xl font-black font-display mb-1">${primName}</h3>
                <p class="text-xs text-slate-300 font-sans mb-3">${primary.name_ar || 'Explore all products in this collection'}</p>
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <span class="text-[#8D9CF5] text-sm font-bold font-sans tracking-wider uppercase">${isArabic ? 'تسوق المجموعة' : 'Shop Collection'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#8D9CF5] ${isArabic ? 'rotate-180' : ''}"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
              </div>
            </div>
          </a>
        </div>
      `;

      others.forEach(cat => {
        const slug = cat.slug || cat.id;
        const name = (isArabic && cat.name_ar) ? cat.name_ar : cat.name;
        const img = cat.image || defaultCatImages[slug] || defaultCatImages[cat.id] || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg';
        const href = `${isArabic ? '/ar' : ''}/shop/?category=${encodeURIComponent(slug)}`;
        const countBadge = cat.product_count !== undefined ? `${cat.product_count} ${isArabic ? 'منتج' : 'Products'}` : (cat.name_ar || '');

        html += `
          <div>
            <a href="${href}">
              <div class="h-[190px] group relative rounded-2xl overflow-hidden border border-white/10 hover:border-[#8D9CF5]/70 hover:shadow-[0_0_20px_rgba(141,156,245,0.25)] transition-all duration-300">
                <img src="${img}" alt="${name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onerror="this.src='/assets/images/products/placeholder.svg'" />
                <div class="absolute inset-0 bg-gradient-to-t from-[#070B14]/90 via-[#070B14]/30 to-transparent"></div>
                <div class="absolute bottom-0 left-0 right-0 p-4">
                  <span class="text-[10px] text-[#38BDF8] font-bold font-sans tracking-wider uppercase truncate block">${countBadge}</span>
                  <h3 class="text-white text-lg font-bold font-display leading-tight group-hover:text-[#8D9CF5] transition-colors truncate">${name}</h3>
                </div>
              </div>
            </a>
          </div>
        `;
      });

      grid.innerHTML = html;
    } catch (err) {
      console.warn('Could not load categories grid:', err);
    }
  }

  // ─── 2.55 TOP BRANDS WE CARRY (HOME MARQUEE HYDRATION) ──────────────────
  async function loadHomeBrands() {
    const col1 = document.getElementById('home-brands-col-1');
    const col2 = document.getElementById('home-brands-col-2');
    const col3 = document.getElementById('home-brands-col-3');
    const col4 = document.getElementById('home-brands-col-4');
    if (!col1 && !col2 && !col3 && !col4) return;

    const brandMeta = {
      'hp': { color: '#0096D6', series: 'Omen & Victus', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_2012.svg' },
      'lenovo': { color: '#E2231A', series: 'Legion & ThinkPad', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg' },
      'platinum': { color: '#38BDF8', series: 'Mobile Accessories' },
      'd-link': { color: '#0284C7', series: 'Networking & Wi-Fi', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/D-Link_wordmark.svg' },
      'resto': { color: '#F97316', series: 'Sleeves & Cases' },
      'hyperx': { color: '#EF4444', series: 'Cloud & Pulsefire', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/HyperX_logo.svg' },
      'nowgo': { color: '#8B5CF6', series: 'Audio & Wireless' },
      'transformers': { color: '#EAB308', series: 'Official Edition' },
      'kingston': { color: '#DC2626', series: 'Fury & Canvas', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Kingston_Technology_logo.svg' },
      'ricoh': { color: '#E11D48', series: 'Imaging & Print', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Ricoh_logo.svg' },
      'apple': { color: '#E2E8F0', series: 'MacBook & Studio', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
      'samsung': { color: '#2563EB', series: 'Odyssey & Galaxy', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
      'asus': { color: '#0284C7', series: 'ROG & TUF Gaming', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg' },
      'asus rog': { color: '#FF0033', series: 'Maximus & Strix', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg' },
      'dell': { color: '#0284C7', series: 'XPS & Alienware', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg' },
      'nvidia': { color: '#84CC16', series: 'GeForce RTX 4090', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg' },
      'corsair': { color: '#FACC15', series: 'Vengeance & Dominator', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Corsair_logo.svg' },
      'amd': { color: '#EF4444', series: 'Ryzen & Radeon', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg' },
      'msi': { color: '#EF4444', series: 'Stealth & Raider', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Micro-Star_International_logo.svg' },
      'logitech': { color: '#06B6D4', series: 'G Pro & MX Master', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Logitech_logo.svg' },
      'razer': { color: '#22C55E', series: 'Blade & DeathAdder', logo: 'https://upload.wikimedia.org/wikipedia/en/4/40/Razer_snake_logo.svg' },
      'steelseries': { color: '#F97316', series: 'Apex & Arctis' },
      'western digital': { color: '#0284C7', series: 'Black & Blue NVMe', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Western_Digital_logo.svg' },
      'gigabyte aorus': { color: '#FF4D00', series: 'Master & Elite' },
      'benq zowie': { color: '#EF4444', series: 'Esports Displays' },
      'tp-link': { color: '#10B981', series: 'Archer & Deco', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/78/TP-Link_logo_2016.svg' },
      'acer': { color: '#84CC16', series: 'Predator & Nitro', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Acer_2011.svg' },
      'alienware': { color: '#06B6D4', series: 'Aurora & x-Series' },
      'sony': { color: '#F8FAFC', series: 'PlayStation & WH', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg' },
      'anker': { color: '#0284C7', series: 'PowerCore & MagGo' },
      'belkin': { color: '#10B981', series: 'BoostCharge Pro' },
      'pny': { color: '#8B5CF6', series: 'XLR8 Gaming' },
      'microsoft': { color: '#00A4EF', series: 'Surface & Xbox', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg' }
    };

    let brands = [];
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        brands = data.filter(b => {
          if (!b || !b.name) return false;
          const name = String(b.name).trim();
          if (name.length < 2) return false;
          if (/^\d+$/.test(name)) return false;
          return true;
        }).sort((a, b) => (b.product_count || 0) - (a.product_count || 0));
      }
    } catch (err) {
      console.warn('Could not load brands for home marquee:', err);
    }

    if (brands.length === 0) return;

    // Cache globally for modal usage
    global._cachedBrands = brands;
    global._brandMeta = brandMeta;

    const isArabic = isRtl || window.location.pathname.startsWith('/ar');

    function createBrandCardHtml(brand) {
      const bKey = (brand.name || '').toLowerCase().trim();
      const meta = brandMeta[bKey] || {};
      const color = meta.color || '#8D9CF5';
      const series = meta.series || (brand.product_count > 0 ? `${brand.product_count} ${isArabic ? 'منتج' : 'Products'}` : (isArabic ? 'ماركة رسمية' : 'Official Store'));
      const count = brand.product_count || 0;
      
      // Image priority: brand.image > brand.logo > meta.logo
      const logoUrl = (brand.image && brand.image.trim()) || (brand.logo && brand.logo.trim()) || meta.logo || '';
      const hasImage = Boolean(logoUrl);

      const href = `${isArabic ? '/ar' : ''}/shop/?brand=${encodeURIComponent(brand.name)}`;

      return `
        <a href="${href}" class="group relative p-3 sm:p-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between min-h-[76px] sm:min-h-[84px] cursor-pointer"
           style="background-color:var(--bg-surface-2);border:1px solid var(--border-color)">
          <div class="flex items-center justify-between gap-2">
            ${hasImage ? `
              <div class="h-6 sm:h-7 max-w-[95px] flex items-center">
                <img src="${logoUrl}" alt="${brand.name}" class="max-h-full max-w-full object-contain filter brightness-105 group-hover:scale-105 transition-transform duration-300" loading="lazy"
                     onerror="this.parentElement.style.display='none';var s=this.parentElement.nextElementSibling;if(s)s.style.display='inline-flex';" />
              </div>
              <span class="hidden font-display font-black text-xs sm:text-sm tracking-tight transition-colors group-hover:brightness-125" style="color:${color}">${brand.name}</span>
            ` : `
              <span class="font-display font-black text-xs sm:text-sm tracking-tight transition-colors group-hover:brightness-125" style="color:${color}">${brand.name}</span>
            `}
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform" style="background-color:${color};box-shadow:0 0 8px ${color}80"></span>
          </div>
          <div class="mt-2 flex items-center justify-between text-[10px] sm:text-xs">
            <span class="font-medium text-slate-400 group-hover:text-slate-300 transition-colors truncate max-w-[70%]">${series}</span>
            ${count > 0 ? `<span class="font-mono text-slate-500 text-[9px] sm:text-[10px] flex-shrink-0">${count}</span>` : ''}
          </div>
        </a>
      `;
    }

    // Split brands across 4 columns
    const cols = [[], [], [], []];
    brands.forEach((brand, idx) => {
      cols[idx % 4].push(brand);
    });

    const colEls = [col1, col2, col3, col4];
    colEls.forEach((el, idx) => {
      if (!el) return;
      const bucket = cols[idx];
      if (bucket.length === 0) return;
      // Ensure unit block is at least 6 items (>500px, exceeds 420px container height)
      let unit = [...bucket];
      while (unit.length < 6) {
        unit = unit.concat(bucket);
      }
      // Exactly 3 identical unit sets for the 0% -> -33.333% CSS marquee animation
      const repeated = [...unit, ...unit, ...unit];
      el.innerHTML = repeated.map(b => createBrandCardHtml(b)).join('');
    });
  }

  // ─── 2.6 FOOTER CATEGORIES HYDRATION ────────────────────────────────────
  async function loadFooterCategories() {
    const list = document.getElementById('footer-categories-list');
    if (!list) return;

    try {
      let categories = [];
      if (global.api && typeof global.api.getCategories === 'function') {
        categories = await global.api.getCategories();
      } else {
        const res = await fetch('/api/categories');
        categories = await res.json();
      }
      if (!Array.isArray(categories) || categories.length === 0) return;

      const isArabic = isRtl || window.location.pathname.startsWith('/ar');
      const topCats = categories
        .filter(c => c && c.name)
        .sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
        .slice(0, 7);

      let html = topCats.map(c => {
        const slug = c.slug || c.id;
        const name = (isArabic && c.name_ar) ? c.name_ar : c.name;
        return `<li><a href="${isArabic ? '/ar' : ''}/shop/?category=${encodeURIComponent(slug)}" class="transition-colors hover:text-[#8D9CF5] hover:underline">${name}</a></li>`;
      }).join('');

      html += `<li><a href="${isArabic ? '/ar' : ''}/categories/" class="font-bold text-[#8D9CF5] hover:underline flex items-center gap-1">${isArabic ? 'جميع الفئات ←' : 'View All Categories →'}</a></li>`;

      list.innerHTML = html;
    } catch (e) {
      console.warn('Could not load footer categories:', e);
    }
  }

  // ─── 2.7 VIEW ALL CATEGORIES MODAL (HOMEPAGE) ──────────────────────────
  window.openAllCategoriesModal = async function (e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const modal = document.getElementById('modal-all-categories');
    if (!modal) {
      const isArabic = isRtl || window.location.pathname.startsWith('/ar');
      window.location.href = `${isArabic ? '/ar' : ''}/categories/`;
      return;
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      const dialog = modal.querySelector('[role="dialog"]') || modal.querySelector('.relative');
      if (dialog) dialog.classList.remove('scale-95');
    }, 10);

    const grid = document.getElementById('modal-categories-grid');
    if (grid && (!grid.dataset.loaded || grid.children.length <= 1)) {
      try {
        grid.innerHTML = `
          <div class="col-span-full py-12 flex flex-col items-center justify-center gap-3">
            <div class="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs font-bold uppercase tracking-widest text-slate-400">${isRtl ? 'جاري التحميل...' : 'Loading categories...'}</span>
          </div>
        `;

        let categories = [];
        if (global.api && typeof global.api.getCategories === 'function') {
          categories = await global.api.getCategories();
        } else {
          const res = await fetch('/api/categories');
          categories = await res.json();
        }

        const isArabic = isRtl || window.location.pathname.startsWith('/ar');
        const defaultImages = {
          'mobile-accessories': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/hero-mobile.jpg',
          'laptops-pcs': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/cat-laptops.jpg',
          'monitors': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/samsung-odyssey-g5.jpg',
          'peripherals': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/corsair-k70-pro.jpg',
          'storage': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/samsung-970-evo-plus.jpg',
          'gaming': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/razer-blackshark-v2.jpg',
          'networking': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/tplink-deco-xe75.jpg'
        };

        grid.innerHTML = (categories || []).map(cat => {
          const slug = cat.slug || cat.id;
          const name = (isArabic && cat.name_ar) ? cat.name_ar : (cat.name || slug);
          const img = cat.image || defaultImages[slug] || defaultImages[cat.id] || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg';
          const count = cat.product_count !== undefined ? `${cat.product_count} ${isArabic ? 'منتج' : 'Items'}` : '';

          return `
            <a href="${isArabic ? '/ar' : ''}/shop/?category=${encodeURIComponent(slug)}"
               data-cat-name="${(name + ' ' + slug).toLowerCase()}"
               class="group relative rounded-2xl overflow-hidden border border-slate-700/30 hover:border-[#8D9CF5] hover:shadow-lg transition-all duration-300 flex flex-col"
               style="background:var(--bg-surface-2)">
              <div class="w-full aspect-[4/3] overflow-hidden bg-slate-900/50 relative">
                <img src="${img}" alt="${name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108" onerror="this.src='/assets/images/products/placeholder.svg'" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                ${count ? `<span class="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#4063B2]/90 text-white backdrop-blur-xs">${count}</span>` : ''}
              </div>
              <div class="p-3">
                <h4 class="text-sm font-bold truncate group-hover:text-[#8D9CF5] transition-colors" style="color:var(--text-primary)">${name}</h4>
              </div>
            </a>
          `;
        }).join('');

        grid.dataset.loaded = 'true';

        const modalSearch = document.getElementById('modal-categories-search');
        if (modalSearch) {
          modalSearch.oninput = (e) => {
            const val = e.target.value.toLowerCase().trim();
            grid.querySelectorAll('a[data-cat-name]').forEach(card => {
              const cardName = card.getAttribute('data-cat-name') || '';
              card.style.display = (!val || cardName.includes(val)) ? '' : 'none';
            });
          };
        }
      } catch (err) {
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-rose-500">${isRtl ? 'فشل تحميل الفئات' : 'Failed to load categories'}</div>`;
      }
    }
  };

  window.closeAllCategoriesModal = function () {
    const modal = document.getElementById('modal-all-categories');
    if (!modal) return;
    modal.classList.add('opacity-0');
    const dialog = modal.querySelector('[role="dialog"]') || modal.querySelector('.relative');
    if (dialog) dialog.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 200);
  };

  // ─── 2.8 UNIVERSAL FILTER SIDEBAR DRAWER TOGGLES (Desktop + Mobile) ─────
  window.openShopFilterDrawer = function () {
    const drawer = document.getElementById('shop-filter-drawer') || document.getElementById('mobile-filter-drawer');
    if (!drawer) return;
    drawer.classList.remove('hidden', 'pointer-events-none');
    // Force DOM reflow before removing opacity/transform for smooth CSS transition
    void drawer.offsetWidth;
    drawer.classList.remove('opacity-0');
    const panel = drawer.querySelector('.shadow-2xl') || drawer.querySelector('[style*="border-left"]') || drawer.querySelector('.max-w-sm');
    if (panel) {
      panel.classList.remove('translate-x-full');
    }
    document.body.style.overflow = 'hidden';
  };

  window.closeShopFilterDrawer = function () {
    const drawer = document.getElementById('shop-filter-drawer') || document.getElementById('mobile-filter-drawer');
    if (!drawer) return;
    drawer.classList.add('opacity-0');
    const panel = drawer.querySelector('.shadow-2xl') || drawer.querySelector('[style*="border-left"]') || drawer.querySelector('.max-w-sm');
    if (panel) {
      panel.classList.add('translate-x-full');
    }
    setTimeout(() => {
      drawer.classList.add('hidden', 'pointer-events-none');
      document.body.style.overflow = '';
    }, 280);
  };

  window.applyAndCloseShopFilterDrawer = function () {
    const minInput = document.getElementById('filter-min-price') || document.getElementById('mobile-filter-min-price');
    const maxInput = document.getElementById('filter-max-price') || document.getElementById('mobile-filter-max-price');
    if (minInput || maxInput) {
      const minVal = minInput ? minInput.value.trim() : '';
      const maxVal = maxInput ? maxInput.value.trim() : '';
      if (minVal !== (shopState.minPrice || '') || maxVal !== (shopState.maxPrice || '')) {
        shopState.minPrice = minVal;
        shopState.maxPrice = maxVal;
        shopState.page = 1;
        syncShopInputs();
        syncShopUrlParams();
        renderShop();
      }
    }
    window.closeShopFilterDrawer();
  };

  window.clearAllShopFilters = function () {
    shopState.category = '';
    shopState.categoryName = '';
    shopState.brand = '';
    shopState.minPrice = '';
    shopState.maxPrice = '';
    shopState.inStock = false;
    shopState.isOffer = false;
    shopState.search = '';
    shopState.page = 1;
    const sInput = document.getElementById('shop-search-input');
    if (sInput) sInput.value = '';
    syncShopInputs();
    syncShopUrlParams();
    renderShop();
    loadShopCategories();
  };

  window.openMobileFilterDrawer = window.openShopFilterDrawer;
  window.closeMobileFilterDrawer = window.closeShopFilterDrawer;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeShopFilterDrawer();
      if (window.closeAllCategoriesModal) window.closeAllCategoriesModal();
    }
  });

  function initAll() {
    // 0. Browse by category on home page
    if (document.getElementById('home-categories-grid')) {
      loadHomeCategoriesGrid();
    }

    // 0.5 Top Brands Marquee on home page
    if (document.getElementById('home-brands-col-1')) {
      loadHomeBrands();
    }

    // 1. Featured products on home page
    if (document.getElementById('featured-products-container')) {
      loadProducts('featured-products-container', { isFeatured: true, limit: 8 });
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

    // 5. Footer Categories (all pages)
    loadFooterCategories();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  global.loadProducts = loadProducts;
  global.loadHomeBrands = loadHomeBrands;
  global.loadShopBrands = loadShopBrands;
  global.renderProductCard = renderProductCard;
  global.hydrateProductDetail = hydrateProductDetail;
  global.openAllCategoriesModal = window.openAllCategoriesModal;
  global.closeAllCategoriesModal = window.closeAllCategoriesModal;
  global.openShopFilterDrawer = window.openShopFilterDrawer;
  global.closeShopFilterDrawer = window.closeShopFilterDrawer;
  global.applyAndCloseShopFilterDrawer = window.applyAndCloseShopFilterDrawer;
  global.clearAllShopFilters = window.clearAllShopFilters;
  global.openMobileFilterDrawer = window.openShopFilterDrawer;
  global.closeMobileFilterDrawer = window.closeShopFilterDrawer;
})(window);
