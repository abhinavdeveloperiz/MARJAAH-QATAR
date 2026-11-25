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

    const inStock = Boolean(
      product.in_stock !== false &&
      product.in_stock !== 'false' &&
      product.stock_status !== 'outofstock' &&
      product.stock_status !== 'OUT_OF_STOCK' &&
      (product.stock_count === undefined || product.stock_count === null || Number(product.stock_count) > 0) &&
      (product.stock === undefined || product.stock === null || Number(product.stock) > 0)
    );
    const stockCount = (product.stock_count !== undefined && product.stock_count !== null) ? Number(product.stock_count) : null;
    const brandName = product.brand || product.brand_name || '';
    const delay = (index % 10) * 35;

    const isSaved = (typeof window.Wishlist !== 'undefined' && typeof window.Wishlist.has === 'function')
      ? window.Wishlist.has(slug)
      : false;

    const isFeatured = Boolean(product.is_featured || product.featured);
    const isBestSeller = Boolean(product.is_best_seller || product.bestseller || product.isBestSeller);
    const isNew = Boolean(product.is_new || product.isNew);

    let discountPct = 0;
    if (originalPrice && Number(originalPrice) > Number(price)) {
      discountPct = Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100);
    }

    let priceHtml = `<span class="font-display font-black text-base sm:text-lg" style="color:var(--text-primary)">${formatPrice(price)}</span>`;
    if (originalPrice && Number(originalPrice) > Number(price)) {
      priceHtml += `<span class="text-[11px] sm:text-xs line-through" style="color:var(--text-tertiary)">${formatPrice(originalPrice)}</span>`;
    }

    const ratingVal = Number(product.rating || product.average_rating || 0);
    const reviewCount = Number(product.review_count || product.reviews_count || 0);
    let ratingHtml = '';
    if (ratingVal > 0) {
      ratingHtml = `
        <div class="flex items-center gap-1 text-[11px] font-bold text-amber-500 my-0.5">
          <svg class="w-3 h-3 fill-amber-500 shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          <span>${ratingVal.toFixed(1)}</span>
          ${reviewCount > 0 ? `<span class="text-slate-400 font-normal text-[10px]">(${reviewCount})</span>` : ''}
        </div>
      `;
    }

    let stockStatusHtml = '';
    if (!inStock) {
      stockStatusHtml = `<span class="text-[10px] font-bold text-rose-500 block">${isRtl ? 'نفذت الكمية' : 'Out of stock'}</span>`;
    } else if (stockCount !== null && stockCount > 0 && stockCount <= 5) {
      stockStatusHtml = `<span class="text-[10px] font-bold text-amber-500 block">${isRtl ? `متبقي ${stockCount} قطع فقط` : `Only ${stockCount} left`}</span>`;
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
    const heartPos = isRtl ? 'top-2.5 left-2.5 sm:top-3 sm:left-3' : 'top-2.5 right-2.5 sm:top-3 sm:right-3';
    const badgePos = isRtl ? 'top-2.5 right-2.5 sm:top-3 sm:right-3' : 'top-2.5 left-2.5 sm:top-3 sm:left-3';

    let cornerBadgeHtml = '';
    if (isBestSeller) {
      cornerBadgeHtml = `<span class="px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">${isRtl ? 'الأكثر طلباً' : 'Best Seller'}</span>`;
    } else if (isNew) {
      cornerBadgeHtml = `<span class="px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">${isRtl ? 'جديد' : 'New'}</span>`;
    } else if (isFeatured) {
      cornerBadgeHtml = `
        <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-xs" style="background:rgba(255,255,255,0.92);border:1px solid var(--border-color);backdrop-filter:blur(6px)" title="${isRtl ? 'منتج مميز' : 'Featured Product'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
      `;
    }

    return `
      <div data-animate class="card anim-visible group relative rounded-xl sm:rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300 ${!inStock ? 'opacity-90' : ''}"
           style="background:var(--bg-surface);border:1px solid var(--border-color);transition-delay:${delay}ms">
        <a href="${productHref}" class="relative overflow-hidden block img-shimmer-wrap" style="aspect-ratio:4/3;background:var(--bg-surface-2)">
          ${cornerBadgeHtml ? `<div class="absolute ${badgePos} z-10 pointer-events-none">${cornerBadgeHtml}</div>` : ''}
          ${discountPct > 0 ? `<div class="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wide bg-rose-500 text-white shadow-xs pointer-events-none">-${discountPct}%</div>` : ''}
          <button data-wishlist-toggle="${slug}" aria-label="Toggle liked product" aria-pressed="${isSaved ? 'true' : 'false'}"
            class="${isSaved ? 'wishlist-active ' : ''}absolute ${heartPos} z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-200 opacity-90 hover:opacity-100 hover:scale-110 shadow-sm cursor-pointer"
            style="background:rgba(255,255,255,0.92);border:1px solid var(--border-color);backdrop-filter:blur(6px)">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${isSaved ? '#ef4444' : 'none'}" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
          <img src="${image}" alt="${name}" class="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108 ${!inStock ? 'grayscale-[25%]' : ''}" loading="lazy" onload="this.parentElement.classList.add('img-loaded')" onerror="this.src='/assets/images/products/placeholder.svg';this.parentElement.classList.add('img-loaded')" />
        </a>
        <div class="p-3 sm:p-4 flex flex-col flex-1">
          <div class="mb-1.5">
            ${brandName ? `<span class="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest block truncate" style="color:var(--color-accent)">${brandName}</span>` : ''}
            <a href="${productHref}" class="block text-xs sm:text-sm font-semibold leading-snug mt-1 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] transition-colors duration-200 hover:opacity-80 break-words" style="color:var(--text-primary)">
              ${name}
            </a>
          </div>
          ${ratingHtml}
          ${stockStatusHtml}
          <div class="flex flex-wrap items-baseline gap-1.5 sm:gap-2 mb-3 mt-auto pt-2">
            ${priceHtml}
          </div>
          ${actionHtml}
        </div>
      </div>
    `;
  }

  function createCursorInfiniteScroll(config) {
    const container = typeof config.container === 'string'
      ? document.getElementById(config.container)
      : config.container;
    if (!container) return null;

    const endpoint = config.endpoint || '/api/products';
    const getParams = config.getParams || (() => ({}));
    const renderCard = config.renderCard || renderProductCard;
    const limit = config.limit || 15;
    const prefetchThreshold = config.prefetchThreshold || 450;
    const onBatchLoaded = config.onBatchLoaded || null;
    const onEmpty = config.onEmpty || null;
    const onError = config.onError || null;

    let cursor = null;
    let hasMore = true;
    let isLoading = false;
    let abortCtrl = null;
    const seenIds = new Set();
    let retryCount = 0;
    const maxRetries = 2;

    let sentinelEl = container.querySelector('.cursor-infinite-sentinel');
    if (!sentinelEl) {
      sentinelEl = document.createElement('div');
      sentinelEl.className = 'cursor-infinite-sentinel col-span-full w-full h-1 pointer-events-none opacity-0';
      container.appendChild(sentinelEl);
    }

    let loaderEl = container.querySelector('.cursor-infinite-loader');
    if (!loaderEl) {
      loaderEl = document.createElement('div');
      loaderEl.className = 'cursor-infinite-loader col-span-full w-full py-8 flex flex-col items-center justify-center gap-2 hidden';
      loaderEl.innerHTML = `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full border-2 border-[#8D9CF5]/20"></div>
          <div class="absolute inset-0 rounded-full border-2 border-[#4063B2] border-t-transparent animate-spin"></div>
        </div>
        <span class="text-[11px] font-bold tracking-wide text-slate-400">
          ${isRtl ? 'جاري جلب المزيد من المنتجات...' : 'Fetching more items...'}
        </span>
      `;
      container.appendChild(loaderEl);
    }

    async function fetchBatch(isInitial = false) {
      if (isLoading) return;
      if (!hasMore && !isInitial) return;

      if (isInitial) {
        cursor = null;
        hasMore = true;
        seenIds.clear();
        retryCount = 0;
      }

      isLoading = true;

      if (!isInitial && loaderEl) {
        loaderEl.classList.remove('hidden');
      }

      if (abortCtrl) {
        abortCtrl.abort();
      }
      abortCtrl = new AbortController();
      const { signal } = abortCtrl;

      const baseParams = getParams() || {};
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(baseParams)) {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, String(v));
        }
      }
      params.set('limit', String(limit));
      if (cursor) {
        params.set('cursor', cursor);
      }

      const queryUrl = `${endpoint}?${params.toString()}`;

      try {
        let data;
        const res = await fetch(queryUrl, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();

        if (signal.aborted) return;

        const items = data.items || data.products || data.data || (Array.isArray(data) ? data : []);
        const nextCursor = data.next_cursor || data.nextCursor || null;
        hasMore = Boolean(data.has_more ?? data.hasMore ?? (nextCursor && items.length >= limit));
        cursor = nextCursor;

        const uniqueItems = items.filter(it => {
          const id = String(it.id || it.slug);
          if (seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });

        if (isInitial && uniqueItems.length === 0) {
          if (loaderEl) loaderEl.classList.add('hidden');
          isLoading = false;
          if (typeof onEmpty === 'function') onEmpty(container);
          return;
        }

        if (isInitial) {
          const keepNodes = [sentinelEl, loaderEl];
          Array.from(container.children).forEach(n => {
            if (!keepNodes.includes(n)) n.remove();
          });
        }

        const startIndex = seenIds.size - uniqueItems.length;
        const html = uniqueItems.map((p, idx) => renderCard(p, startIndex + idx)).join('');
        if (html) {
          const temp = document.createElement('div');
          temp.innerHTML = html;
          while (temp.firstChild) {
            container.insertBefore(temp.firstChild, sentinelEl);
          }
        }

        if (window.Wishlist && typeof window.Wishlist.sync === 'function') {
          window.Wishlist.sync();
        }
        if (window.observeAnimations) {
          window.observeAnimations();
        }
        container.querySelectorAll('.card, [data-animate]').forEach(c => c.classList.add('anim-visible'));

        if (loaderEl) loaderEl.classList.add('hidden');
        isLoading = false;
        retryCount = 0;

        if (typeof onBatchLoaded === 'function') {
          onBatchLoaded({
            items: uniqueItems,
            totalLoaded: seenIds.size,
            total: data.total || seenIds.size,
            hasMore,
            cursor
          });
        }

        if (!hasMore && observer) {
          observer.unobserve(sentinelEl);
        }
      } catch (err) {
        if (signal.aborted) return;
        if (loaderEl) loaderEl.classList.add('hidden');
        isLoading = false;

        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            if (!signal.aborted) fetchBatch(isInitial);
          }, 1200);
        } else if (typeof onError === 'function') {
          onError(err, isInitial);
        }
      }
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting && !isLoading && hasMore) {
        fetchBatch(false);
      }
    }, {
      root: null,
      rootMargin: `${prefetchThreshold}px 0px ${prefetchThreshold}px 0px`,
      threshold: 0
    });

    observer.observe(sentinelEl);

    let scrollRaf = null;
    function onScrollCheck() {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        if (isLoading || !hasMore) return;
        const rect = sentinelEl.getBoundingClientRect();
        if (rect.top <= window.innerHeight + prefetchThreshold) {
          fetchBatch(false);
        }
      });
    }
    window.addEventListener('scroll', onScrollCheck, { passive: true });

    return {
      fetchInitial: () => fetchBatch(true),
      loadNext: () => fetchBatch(false),
      reset: () => fetchBatch(true),
      destroy: () => {
        if (abortCtrl) abortCtrl.abort();
        if (observer) observer.disconnect();
        window.removeEventListener('scroll', onScrollCheck);
      },
      hasMore: () => hasMore,
      isLoading: () => isLoading,
      getTotalLoaded: () => seenIds.size
    };
  }

  async function loadProducts(containerId, queryParams = {}, sectionId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const section = sectionId ? document.getElementById(sectionId) : container.closest('section');

    try {
      let data;
      const queryStr = typeof queryParams === 'string' ? queryParams : '?' + new URLSearchParams(queryParams).toString();
      try {
        const res = await fetch(`/api/products${queryStr}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      } catch (err) {
        if (global.api && typeof global.api.getProducts === 'function') {
          data = await global.api.getProducts(queryParams);
        } else {
          throw err;
        }
      }

      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.items)) {
        items = data.items;
      } else if (data && Array.isArray(data.products)) {
        items = data.products;
      } else if (data && Array.isArray(data.data)) {
        items = data.data;
      }

      if (items.length === 0) {
        if (section) {
          section.style.display = 'none';
        } else {
          container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500 font-medium">${isRtl ? 'لم يتم العثور على منتجات.' : 'No products found.'}</div>`;
        }
        return;
      }

      if (section) {
        section.style.display = '';
      }

      container.innerHTML = items.map((p, idx) => renderProductCard(p, idx)).join('');
      if (window.Wishlist && typeof window.Wishlist.sync === 'function') window.Wishlist.sync();
      if (window.observeAnimations) window.observeAnimations();
      container.querySelectorAll('.card, [data-animate]').forEach(card => card.classList.add('anim-visible'));
    } catch (err) {
      console.error('Error loading products for #' + containerId, err);
      if (section) {
        section.style.display = 'none';
      } else {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-rose-500 font-medium">${isRtl ? 'فشل تحميل المنتجات.' : 'Failed to load products.'}</div>`;
      }
    }
  }

  // ─── 2. SHOP CATALOG CONTROLLER (FILTERS, SEARCH, PAGINATION) ───────────
  const shopState = {
    viewMode: 'categories', // 'categories' | 'products'
    category: '',
    categoryName: '',
    subcategory: '',
    subcategoryName: '',
    brand: '',
    attributes: {},
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

  const categoryState = {
    page: 1,
    limit: 20, // 20 categories per page limit as requested
    total: 0,
    totalPages: 1,
    all: [],
    filtered: [],
    search: '',
    loading: false
  };

  const subcategoryState = {
    all: [],
    filterQuery: '',
    loading: false
  };

  const expandedCategories = new Set();

  function getSubcategoryIconSvg(iconKey) {
    const k = (iconKey || 'tag').toLowerCase().trim();
    switch (k) {
      case 'smartphone':
      case 'mobile':
      case 'phone':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></svg>`;
      case 'headphones':
      case 'headset':
      case 'audio':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`;
      case 'watch':
      case 'smartwatch':
      case 'wearable':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><polyline points="12 9 12 12 13.5 13.5"/><path d="M16.51 17.35l-.85 3.22a2 2 0 0 1-1.93 1.43H10.27a2 2 0 0 1-1.93-1.43l-.85-3.22"/><path d="M7.49 6.65l.85-3.22A2 2 0 0 1 10.27 2h3.46a2 2 0 0 1 1.93 1.43l.85 3.22"/></svg>`;
      case 'laptop':
      case 'computer':
      case 'pc':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg>`;
      case 'tv':
      case 'monitor':
      case 'display':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>`;
      case 'camera':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;
      case 'gamepad':
      case 'gaming':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/></svg>`;
      case 'shirt':
      case 'fashion':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`;
      case 'package':
      case 'box':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
      case 'sparkles':
      case 'star':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
      case 'zap':
      case 'bolt':
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
      case 'tag':
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`;
    }
  }

  const categoryImageFallbacks = {
    'laptops-pcs': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/cat-laptops.jpg',
    'laptops': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/cat-laptops.jpg',
    'desktops': '/assets/images/categories/cat-desktops.jpg',
    'storage': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/samsung-970-evo-plus.jpg',
    'portable-ssds-hard-drives': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/samsung-970-evo-plus.jpg',
    'mobile-accessories': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/hero-mobile.jpg',
    'gaming': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/razer-blackshark-v2.jpg',
    'gaming-headsets': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/razer-blackshark-v2.jpg',
    'gaming-mice-keyboards': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/corsair-k70-pro.jpg',
    'peripherals': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/corsair-k70-pro.jpg',
    'audio': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/razer-blackshark-v2.jpg',
    'networking': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/tplink-deco-xe75.jpg',
    'routers-wi-fi-extenders': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/tplink-deco-xe75.jpg',
    'smart-wearables': '/assets/images/categories/cat-smartwatches.svg',
    'printers-scanners': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/1792585934711_pexels-jakubzerdzicki-17235421.jpg',
    'computer-accessories': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/1792579428454_pexels-andrei-l-335499537-31145466.jpg',
    'tablets': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/1792579481496_pexels-jibarofoto-13570160.jpg',
    'home-kitchen': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/categories/1792579222935_pexels-phenyo-deluxe-427483-1370082.jpg',
    'powerbanks': '/assets/images/categories/cat-powerbanks.jpg',
    'cables': '/assets/images/categories/cat-cables.svg',
    'chargers': '/assets/images/categories/cat-chargers.svg',
    'earbuds': '/assets/images/categories/cat-earbuds.svg',
    'default': 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/hero-mobile.jpg'
  };

  // Client-side instant filter cache & request abort controller
  const shopCatalogCache = new Map();
  const SHOP_CACHE_TTL_MS = 90 * 1000; // 90s instant cache
  let shopAbortController = null;

  function renderCategoryCard(cat, idx = 0) {
    const slug = cat.slug || cat.id;
    const name = (isRtl && cat.name_ar) ? cat.name_ar : (cat.name || 'Category');
    const pCount = cat.product_count !== undefined ? Number(cat.product_count) : 0;
    const imgUrl = cat.image || categoryImageFallbacks[slug] || categoryImageFallbacks.default;
    const delay = (idx % 8) * 40;
    const catHref = `${isRtl ? '/ar' : ''}/category/${encodeURIComponent(slug)}/`;

    return `
      <a href="${catHref}" data-category-card="${slug}" class="group relative rounded-3xl overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#8D9CF5] cursor-pointer block text-inherit no-underline"
           style="background:var(--bg-surface);border-color:var(--border-color);animation-delay:${delay}ms">
        <div class="relative h-48 overflow-hidden" style="background:var(--bg-surface-2)">
          <img src="${imgUrl}" alt="${name}" class="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
               loading="lazy" onerror="this.src='https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/hero-mobile.jpg'" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#070B14]/40 to-transparent"></div>
          <div class="absolute top-3.5 right-3.5">
            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-white/10 text-white/90 border border-white/15">
              ${isRtl ? 'استكشف' : 'Explore'}
            </span>
          </div>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-display font-bold text-lg mb-1 group-hover:text-[#8D9CF5] transition-colors" style="color:var(--text-primary)">${name}</h3>
            ${cat.name_ar && !isRtl ? `<p class="text-xs text-slate-400 mb-2">${cat.name_ar}</p>` : ''}
            ${cat.name && isRtl ? `<p class="text-xs text-slate-400 mb-2">${cat.name}</p>` : ''}
          </div>
          <div class="pt-3 border-t mt-3 flex items-center justify-between text-xs font-bold text-[#8D9CF5]" style="border-color:var(--border-color)">
            <span>${isRtl ? 'تصفح المنتجات' : 'Browse Products'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-1.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </div>
      </a>
    `;
  }

  function renderSubcategoryCard(sub, catObj, idx = 0) {
    const catSlug = (catObj?.slug || catObj?.id || shopState.category || '').toLowerCase();
    const subSlug = (sub.slug || sub.id || '').toLowerCase();
    const name = (isRtl && sub.name_ar) ? sub.name_ar : (sub.name || subSlug);
    const altName = (isRtl && sub.name) ? sub.name : (sub.name_ar || '');
    const pCount = sub.product_count !== undefined ? Number(sub.product_count) : 0;
    const color = sub.color || '#4063B2';
    const iconSvg = getSubcategoryIconSvg(sub.icon);
    const delay = (idx % 8) * 40;

    const imgUrl = sub.image || sub.image_url || sub.thumbnail || catObj?.image || categoryImageFallbacks[subSlug] || categoryImageFallbacks[catSlug] || categoryImageFallbacks.default;
    const subHref = `${isRtl ? '/ar' : ''}/category/${encodeURIComponent(catSlug)}/?subcategory=${encodeURIComponent(subSlug)}`;

    return `
      <a href="${subHref}" data-subcategory-card="${subSlug}" data-parent-cat="${catSlug}" class="group relative rounded-3xl overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#8D9CF5] cursor-pointer block text-inherit no-underline"
           style="background:var(--bg-surface);border-color:var(--border-color);animation-delay:${delay}ms">
        <div class="relative h-48 overflow-hidden" style="background:var(--bg-surface-2)">
          <img src="${imgUrl}" alt="${name}" class="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
               loading="lazy" onerror="this.src='https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/hero-mobile.jpg'" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#070B14]/40 to-transparent"></div>
          
          <!-- Top Badges: Icon/Color & Explore -->
          <div class="absolute top-3.5 left-3.5 flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl flex items-center justify-center backdrop-blur-md bg-white/20 text-white shadow-sm border border-white/20" title="${name}">
              ${iconSvg}
            </span>
            <span class="w-2.5 h-2.5 rounded-full ring-2 ring-white/30" style="background:${color}"></span>
          </div>

          <div class="absolute top-3.5 right-3.5">
            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-white/10 text-white/90 border border-white/15">
              ${isRtl ? 'استكشف' : 'Explore'}
            </span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-display font-bold text-lg mb-1 group-hover:text-[#8D9CF5] transition-colors flex items-center gap-2" style="color:var(--text-primary)">
              <span>${name}</span>
            </h3>
            ${altName ? `<p class="text-xs text-slate-400 mb-2">${altName}</p>` : ''}
          </div>
          <div class="pt-3 border-t mt-3 flex items-center justify-between text-xs font-bold text-[#8D9CF5]" style="border-color:var(--border-color)">
            <span>${isRtl ? 'تصفح المنتجات' : 'Browse Products'} (${pCount})</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-1.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </div>
      </a>
    `;
  }

  function renderAllProductsInCatCard(catObj) {
    const catSlug = (catObj?.slug || catObj?.id || shopState.category || '').toLowerCase();
    const catName = (isRtl && catObj?.name_ar) ? catObj.name_ar : (catObj?.name || catSlug);
    const pCount = catObj?.product_count !== undefined ? Number(catObj.product_count) : 0;
    const imgUrl = catObj?.image || categoryImageFallbacks[catSlug] || categoryImageFallbacks.default;
    const catHref = `${isRtl ? '/ar' : ''}/category/${encodeURIComponent(catSlug)}/?view=products`;

    return `
      <a href="${catHref}" data-view-all-category-products="${catSlug}" class="group relative rounded-3xl overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#8D9CF5] cursor-pointer block text-inherit no-underline"
           style="background:linear-gradient(135deg, rgba(64,99,178,0.18), var(--bg-surface));border-color:rgba(141,156,245,0.4)">
        <div class="relative h-48 overflow-hidden" style="background:var(--bg-surface-2)">
          <img src="${imgUrl}" alt="${catName}" class="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
               loading="lazy" onerror="this.src='https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/hero-mobile.jpg'" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#070B14]/60 to-transparent"></div>
          
          <div class="absolute top-3.5 left-3.5">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4063B2] text-white shadow-sm flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              <span>${isRtl ? 'جميع المنتجات' : 'All Products'}</span>
            </span>
          </div>

          <div class="absolute top-3.5 right-3.5">
            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-white/15 text-white border border-white/20">
              ${isRtl ? 'تصفح الكل' : 'Browse All'}
            </span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-display font-bold text-lg mb-1 text-[#8D9CF5] transition-colors" style="color:var(--text-primary)">
              ${isRtl ? `جميع منتجات ${catName}` : `All ${catName} Products`}
            </h3>
            <p class="text-xs text-slate-400 mb-2">${isRtl ? 'عرض كافة منتجات هذه الفئة مباشرة' : `Browse all ${pCount} products in this category`}</p>
          </div>
          <div class="pt-3 border-t mt-3 flex items-center justify-between text-xs font-bold text-[#8D9CF5]" style="border-color:var(--border-color)">
            <span>${isRtl ? 'عرض كل المنتجات' : 'View All Products'} (${pCount})</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-1.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </div>
        </div>
      </a>
    `;
  }

  async function renderShopSubcategories() {
    const container = document.getElementById('shop-subcategories-container');
    if (!container) return;

    const catSlug = (shopState.category || '').toLowerCase();
    if (!catSlug) {
      returnToShopCategories();
      return;
    }

    container.innerHTML = `
      <div class="col-span-full py-16 flex flex-col items-center justify-center text-center">
        <div class="w-10 h-10 border-3 border-[#4063B2] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p class="text-xs text-slate-400 font-medium">${isRtl ? 'جاري تحميل الفئات الفرعية...' : 'Loading subcategories...'}</p>
      </div>
    `;

    // Ensure categories are loaded
    let catObj = (categoryState.all || []).find(c => (c.slug || c.id || '').toLowerCase() === catSlug);
    let subs = catObj?.subcategories || [];

    if (!subs || subs.length === 0) {
      try {
        const res = await fetch(`/api/subcategories?categorySlug=${encodeURIComponent(catSlug)}`);
        if (res.ok) {
          const sData = await res.json();
          subs = Array.isArray(sData) ? sData : (sData.subcategories || []);
          if (catObj) catObj.subcategories = subs;
        }
      } catch (err) {
        console.warn('Error loading subcategories:', err);
      }
    }

    if (!catObj && categoryState.all && categoryState.all.length > 0) {
      catObj = categoryState.all.find(c => (c.slug || c.id || '').toLowerCase() === catSlug);
    }

    const catName = (isRtl && catObj?.name_ar) ? catObj.name_ar : (catObj?.name || catSlug.replace(/-/g, ' '));
    shopState.categoryName = catName;

    // Filter by categoryState.search if user searched in subcategories page
    const filterQuery = (categoryState.search || '').trim().toLowerCase();
    let displaySubs = subs;
    if (filterQuery) {
      displaySubs = subs.filter(s => {
        const n = (s.name || '').toLowerCase();
        const na = (s.name_ar || '').toLowerCase();
        return n.includes(filterQuery) || na.includes(filterQuery);
      });
    }

    // Sort subcategories by order or name
    displaySubs.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    // Update Counter text
    const counterEl = document.getElementById('shop-items-counter');
    if (counterEl) {
      counterEl.innerHTML = `<span>${isRtl ? 'عرض' : 'Showing'} <strong style="color:var(--text-primary)">${displaySubs.length}</strong> ${isRtl ? 'فئة فرعية في' : 'subcategories in'} <strong class="text-[#8D9CF5]">${catName}</strong></span>`;
    }

    // Build Cards HTML
    let html = '';
    // Add "All Products in Category" card first if not searching
    if (!filterQuery) {
      html += renderAllProductsInCatCard(catObj);
    }

    if (displaySubs.length > 0) {
      html += displaySubs.map((sub, idx) => renderSubcategoryCard(sub, catObj, idx)).join('');
    } else if (subs.length === 0) {
      // No subcategories in this category
      html += `
        <div class="col-span-full py-12 text-center rounded-3xl border p-8" style="background:var(--bg-surface);border-color:var(--border-color)">
          <div class="w-14 h-14 rounded-2xl bg-[#4063B2]/10 text-[#8D9CF5] flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </div>
          <h3 class="text-base font-bold mb-1" style="color:var(--text-primary)">${isRtl ? 'لا توجد فئات فرعية لهذه الفئة حالياً' : 'No subcategories in this category yet'}</h3>
          <p class="text-xs text-slate-400 mb-5">${isRtl ? 'يمكنك تصفح جميع منتجات هذه الفئة مباشرة' : `Browse all ${catObj?.product_count || 0} products in ${catName} directly.`}</p>
          <button type="button" onclick="selectShopCategory('${catSlug}', true)" class="px-5 py-2.5 rounded-xl bg-[#4063B2] text-white text-xs font-bold hover:bg-[#345296] transition cursor-pointer">
            ${isRtl ? `تصفح كل منتجات ${catName}` : `Browse All ${catName} Products`}
          </button>
        </div>
      `;
    } else {
      // Search had no matches
      html += `
        <div class="col-span-full py-12 text-center">
          <p class="text-xs text-slate-400 font-medium">${isRtl ? 'لم يتم العثور على فئات فرعية مطابقة للبحث.' : 'No subcategories found matching your search.'}</p>
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach click listeners to Subcategory cards
    container.querySelectorAll('[data-subcategory-card]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
        }
        const targetSub = card.getAttribute('data-subcategory-card');
        const parentCat = card.getAttribute('data-parent-cat') || catSlug;
        selectShopSubcategory(parentCat, targetSub);
      });
    });

    // Attach click listener to "View All Category Products" card
    container.querySelectorAll('[data-view-all-category-products]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
        }
        const parentCat = card.getAttribute('data-view-all-category-products') || catSlug;
        selectShopCategory(parentCat, true);
      });
    });

    // Clear category pagination since subcategories are displayed on a single page
    const paginationContainer = document.getElementById('shop-pagination-container');
    if (paginationContainer) paginationContainer.innerHTML = '';
  }
  global.renderShopSubcategories = renderShopSubcategories;
  window.renderShopSubcategories = renderShopSubcategories;

  function updateShopViewMode() {
    try {
      document.documentElement.classList.remove('init-categories-view', 'init-subcategories-view', 'init-products-view');
    } catch (_) {}
    const isCategories = shopState.viewMode === 'categories';
    const isSubcategories = shopState.viewMode === 'subcategories';

    const categoriesContainer = document.getElementById('shop-categories-container');
    const subcategoriesContainer = document.getElementById('shop-subcategories-container');
    const productsContainer = document.getElementById('shop-products-container');
    const sidebar = document.getElementById('shop-category-sidebar');
    const filterControlsBar = document.getElementById('shop-filter-controls-bar');
    const backBtn = document.getElementById('shop-back-to-categories-btn');
    const backBtnText = document.getElementById('shop-back-to-categories-text');
    const pageTitle = document.getElementById('shop-page-title');
    const breadcrumbSep = document.getElementById('shop-breadcrumb-sep');
    const breadcrumbCurrent = document.getElementById('shop-breadcrumb-current');
    const activeFiltersBar = document.getElementById('shop-active-filters-bar');
    const searchInput = document.getElementById('shop-search-input');
    const pillsContainer = document.getElementById('shop-category-pills');
    const mobileCatIndicator = document.getElementById('shop-mobile-cat-indicator');

    if (isCategories) {
      if (categoriesContainer) {
        categoriesContainer.classList.remove('hidden');
        categoriesContainer.style.display = 'grid';
      }
      if (subcategoriesContainer) {
        subcategoriesContainer.classList.add('hidden');
        subcategoriesContainer.style.display = 'none';
      }
      if (productsContainer) {
        productsContainer.classList.add('hidden');
        productsContainer.style.display = 'none';
      }
      if (sidebar) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('lg:block');
        sidebar.style.display = 'none';
      }
      if (filterControlsBar) filterControlsBar.classList.add('hidden');
      if (backBtn) backBtn.classList.add('hidden');
      if (activeFiltersBar) activeFiltersBar.classList.add('hidden');
      if (pillsContainer) {
        pillsContainer.classList.remove('hidden');
        pillsContainer.classList.add('flex');
      }

      if (breadcrumbSep) breadcrumbSep.classList.add('hidden');
      if (breadcrumbCurrent) {
        breadcrumbCurrent.classList.add('hidden');
        breadcrumbCurrent.textContent = '';
      }

      if (pageTitle) {
        pageTitle.textContent = isRtl ? 'تسوق حسب الفئة' : 'Shop by Category';
      }
      if (searchInput) {
        searchInput.placeholder = isRtl ? 'البحث في الفئات...' : 'Search categories...';
        searchInput.value = categoryState.search || '';
      }
      if (mobileCatIndicator) {
        mobileCatIndicator.textContent = isRtl ? 'جميع الفئات' : 'All Categories';
      }
    } else if (isSubcategories) {
      if (categoriesContainer) {
        categoriesContainer.classList.add('hidden');
        categoriesContainer.style.display = 'none';
      }
      if (subcategoriesContainer) {
        subcategoriesContainer.classList.remove('hidden');
        subcategoriesContainer.style.display = 'grid';
      }
      if (productsContainer) {
        productsContainer.classList.add('hidden');
        productsContainer.style.display = 'none';
      }
      if (sidebar) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('lg:block');
        sidebar.style.display = 'none';
      }
      if (filterControlsBar) filterControlsBar.classList.add('hidden');
      if (backBtn) {
        backBtn.classList.remove('hidden');
        if (backBtnText) backBtnText.textContent = isRtl ? 'جميع الفئات' : 'All Categories';
      }
      if (activeFiltersBar) activeFiltersBar.classList.add('hidden');
      if (pillsContainer) {
        pillsContainer.classList.add('hidden');
        pillsContainer.classList.remove('flex', 'md:flex');
      }

      if (breadcrumbSep) breadcrumbSep.classList.remove('hidden');
      if (breadcrumbCurrent) {
        breadcrumbCurrent.classList.remove('hidden');
        breadcrumbCurrent.innerHTML = `<span class="text-[#8D9CF5] font-bold">${shopState.categoryName || (shopState.category ? shopState.category.replace(/-/g, ' ') : '')}</span>`;
      }

      if (pageTitle) {
        pageTitle.textContent = shopState.categoryName || (shopState.category ? shopState.category.replace(/-/g, ' ') : (isRtl ? 'الفئات الفرعية' : 'Subcategories'));
      }
      if (searchInput) {
        searchInput.placeholder = isRtl ? `البحث في الفئات الفرعية...` : `Search subcategories...`;
        searchInput.value = categoryState.search || '';
      }
      if (mobileCatIndicator) {
        mobileCatIndicator.textContent = shopState.categoryName || (isRtl ? 'الفئات الفرعية' : 'Subcategories');
      }
    } else {
      // Products view: ALWAYS show products and the left-side subcategory navigation sidebar!
      if (categoriesContainer) {
        categoriesContainer.classList.add('hidden');
        categoriesContainer.style.display = 'none';
      }
      if (subcategoriesContainer) {
        subcategoriesContainer.classList.add('hidden');
        subcategoriesContainer.style.display = 'none';
      }
      if (productsContainer) {
        productsContainer.classList.remove('hidden');
        productsContainer.style.display = 'grid';
      }
      if (sidebar) {
        sidebar.classList.add('hidden', 'lg:block');
        sidebar.style.display = '';
      }
      if (filterControlsBar) filterControlsBar.classList.remove('hidden');
      if (backBtn) {
        backBtn.classList.remove('hidden');
        if (backBtnText) {
          if (shopState.subcategory) {
            backBtnText.textContent = isRtl ? `فئات ${shopState.categoryName || ''}` : `All ${shopState.categoryName || ''} Subcategories`;
          } else {
            backBtnText.textContent = isRtl ? 'جميع الفئات' : 'All Categories';
          }
        }
      }
      if (pillsContainer) {
        pillsContainer.classList.add('hidden', 'md:flex');
        pillsContainer.classList.remove('flex');
      }

      if (breadcrumbSep) breadcrumbSep.classList.remove('hidden');
      if (breadcrumbCurrent) {
        breadcrumbCurrent.classList.remove('hidden');
        if (shopState.subcategoryName) {
          const catLabel = shopState.categoryName || (shopState.category ? shopState.category.replace(/-/g, ' ') : '');
          breadcrumbCurrent.innerHTML = `${catLabel ? `<a href="javascript:void(0)" onclick="if(window.selectShopCategory)window.selectShopCategory('${shopState.category}')" class="hover:underline">${catLabel}</a> <span class="mx-1 text-slate-400">/</span> ` : ''}<span class="text-[#8D9CF5] font-bold">${shopState.subcategoryName}</span>`;
        } else {
          breadcrumbCurrent.textContent = shopState.categoryName || (shopState.category ? shopState.category.replace(/-/g, ' ') : (isRtl ? 'جميع المنتجات' : 'All Products'));
        }
      }

      if (pageTitle) {
        if (shopState.subcategoryName) {
          pageTitle.textContent = shopState.subcategoryName;
        } else if (shopState.categoryName) {
          pageTitle.textContent = shopState.categoryName;
        } else if (shopState.category) {
          pageTitle.textContent = shopState.category.replace(/-/g, ' ');
        } else if (shopState.brand) {
          pageTitle.textContent = `${shopState.brand} Products`;
        } else {
          pageTitle.textContent = isRtl ? 'جميع المنتجات' : 'All Products';
        }
      }
      if (searchInput) {
        searchInput.placeholder = isRtl ? 'البحث عن منتجات...' : 'Search products in category...';
        searchInput.value = shopState.search || '';
      }
      if (mobileCatIndicator) {
        if (shopState.subcategoryName) {
          mobileCatIndicator.textContent = `${shopState.categoryName || 'Category'} > ${shopState.subcategoryName}`;
        } else if (shopState.categoryName) {
          mobileCatIndicator.textContent = shopState.categoryName;
        } else {
          mobileCatIndicator.textContent = isRtl ? 'جميع المنتجات' : 'All Products';
        }
      }
    }
  }

  function renderCategoryPagination() {
    const container = document.getElementById('shop-pagination-container');
    if (!container) return;

    if (!categoryState.totalPages || categoryState.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const cur = categoryState.page;
    const total = categoryState.totalPages;

    let html = '';
    const prevDisabled = cur <= 1;
    html += `
      <button ${prevDisabled ? 'disabled' : ''} data-cat-page="${cur - 1}"
        class="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${prevDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary-500 hover:text-primary-500'}"
        style="background:var(--bg-surface-2);border-color:var(--border-color);color:var(--text-primary)">
        ${isRtl ? 'السابق' : 'Previous'}
      </button>
    `;

    for (let i = 1; i <= total; i++) {
      const isCurrent = i === cur;
      html += `
        <button data-cat-page="${i}"
          class="w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${isCurrent ? 'bg-[#4063B2] text-white shadow-md' : 'border hover:border-primary-500'}"
          style="${isCurrent ? '' : 'background:var(--bg-surface-2);border-color:var(--border-color);color:var(--text-primary)'}">
          ${i}
        </button>
      `;
    }

    const nextDisabled = cur >= total;
    html += `
      <button ${nextDisabled ? 'disabled' : ''} data-cat-page="${cur + 1}"
        class="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${nextDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-primary-500 hover:text-primary-500'}"
        style="background:var(--bg-surface-2);border-color:var(--border-color);color:var(--text-primary)">
        ${isRtl ? 'التالي' : 'Next'}
      </button>
    `;

    container.innerHTML = html;

    container.querySelectorAll('button[data-cat-page]').forEach(b => {
      b.addEventListener('click', () => {
        const p = parseInt(b.getAttribute('data-cat-page'), 10);
        if (p >= 1 && p <= categoryState.totalPages && p !== categoryState.page) {
          categoryState.page = p;
          renderShopCategories();
          const target = document.getElementById('shop-categories-container');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  async function renderShopCategories() {
    const container = document.getElementById('shop-categories-container');
    if (!container) return;

    const counterEl = document.getElementById('shop-items-counter');

    // Fetch categories if needed
    if (!categoryState.all || categoryState.all.length === 0) {
      container.innerHTML = `
        <div class="col-span-full w-full min-h-[360px] flex flex-col items-center justify-center py-20 px-4 text-center my-auto">
          <div class="relative w-14 h-14 mb-4 flex items-center justify-center">
            <div class="absolute inset-0 rounded-full border-4 border-[#8D9CF5]/20"></div>
            <div class="absolute inset-0 rounded-full border-4 border-[#4063B2] border-t-transparent animate-spin"></div>
            <div class="w-6 h-6 rounded-full bg-[#4063B2]/20 animate-pulse"></div>
          </div>
          <h4 class="font-display font-bold text-base sm:text-lg tracking-tight" style="color:var(--text-primary)">
            ${isRtl ? 'جاري تحميل الفئات...' : 'Loading Categories...'}
          </h4>
          <p class="text-xs text-slate-400 font-medium max-w-xs mt-1">
            ${isRtl ? 'يرجى الانتظار، جاري جلب فئات المنتجات...' : 'Fetching catalog categories'}
          </p>
        </div>
      `;

      try {
        let data;
        if (global.api && typeof global.api.getCategories === 'function') {
          data = await global.api.getCategories(true);
        } else {
          const res = await fetch('/api/categories?includeSubcategories=true');
          data = await res.json();
        }
        if (Array.isArray(data)) {
          categoryState.all = data;
        } else if (data && Array.isArray(data.categories)) {
          categoryState.all = data.categories;
        } else if (data && Array.isArray(data.items)) {
          categoryState.all = data.items;
        }
        renderLeftCategorySidebar();
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }

    let list = (categoryState.all || []).slice();
    // Sort categories by order asc, then name
    list.sort((a, b) => {
      const oDiff = (a.order || 0) - (b.order || 0);
      if (oDiff !== 0) return oDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    const query = (categoryState.search || '').trim().toLowerCase();
    if (query) {
      list = list.filter(c => {
        const n = (c.name || '').toLowerCase();
        const na = (c.name_ar || '').toLowerCase();
        const s = (c.slug || c.id || '').toLowerCase();
        return n.includes(query) || na.includes(query) || s.includes(query);
      });
    }

    categoryState.filtered = list;
    categoryState.total = list.length;
    categoryState.totalPages = Math.ceil(list.length / categoryState.limit) || 1;

    if (categoryState.page > categoryState.totalPages) {
      categoryState.page = 1;
    }

    // Update items counter
    if (counterEl) {
      const start = categoryState.total === 0 ? 0 : (categoryState.page - 1) * categoryState.limit + 1;
      const end = Math.min(categoryState.page * categoryState.limit, categoryState.total);
      counterEl.innerHTML = `<span>${isRtl ? 'عرض' : 'Showing'} <strong style="color:var(--text-primary)">${start}–${end}</strong> ${isRtl ? 'من أصل' : 'of'} <strong style="color:var(--text-primary)">${categoryState.total}</strong> ${isRtl ? 'فئة (20 لكل صفحة)' : 'categories (20 per page)'}</span>`;
    }

    if (list.length === 0) {
      container.innerHTML = `<div class="col-span-full w-full py-20 text-center text-slate-400 font-medium">${isRtl ? 'لم يتم العثور على فئات مطابقة.' : 'No categories found matching your search.'}</div>`;
      renderCategoryPagination();
      return;
    }

    const startIndex = (categoryState.page - 1) * categoryState.limit;
    const pageCategories = list.slice(startIndex, startIndex + categoryState.limit);

    container.innerHTML = pageCategories.map((c, idx) => renderCategoryCard(c, idx)).join('');

    container.querySelectorAll('[data-category-card]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
        }
        const slug = card.getAttribute('data-category-card');
        selectShopCategory(slug);
      });
    });

    renderCategoryPagination();
  }

  function selectShopCategory(slug, directToProducts = false) {
    shopState.category = (slug || '').trim().toLowerCase();
    shopState.subcategory = '';
    shopState.subcategoryName = '';
    shopState.brand = '';
    shopState.attributes = {};
    shopState.page = 1;
    categoryState.search = '';

    const found = (categoryState.all || []).find(c => (c.slug || c.id || '').toLowerCase() === shopState.category);
    if (found) {
      shopState.categoryName = (isRtl && found.name_ar) ? found.name_ar : (found.name || shopState.category);
    } else {
      shopState.categoryName = shopState.category.replace(/-/g, ' ');
    }

    if (shopState.category) expandedCategories.add(shopState.category);

    if (directToProducts) {
      shopState.viewMode = 'products';
      syncShopUrlParams();
      updateShopViewMode();
      syncShopInputs();
      renderActiveFilterChips();
      renderLeftCategorySidebar();
      loadShopBrands();
      loadShopSubcategories();
      renderShop();
    } else {
      shopState.viewMode = 'subcategories';
      syncShopUrlParams();
      updateShopViewMode();
      syncShopInputs();
      renderActiveFilterChips();
      renderShopSubcategories();
      loadShopSubcategories();
      renderLeftCategorySidebar();
    }
    loadShopCategories();

    const target = document.getElementById('shop-page-title');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  global.selectShopCategory = selectShopCategory;
  window.selectShopCategory = selectShopCategory;

  function selectShopSubcategory(catSlug, subSlug) {
    shopState.viewMode = 'products';
    shopState.category = (catSlug || '').trim().toLowerCase();
    shopState.subcategory = (subSlug || '').trim().toLowerCase();
    shopState.page = 1;

    if (shopState.category) expandedCategories.add(shopState.category);

    const foundCat = (categoryState.all || []).find(c => (c.slug || c.id || '').toLowerCase() === shopState.category);
    if (foundCat) {
      shopState.categoryName = (isRtl && foundCat.name_ar) ? foundCat.name_ar : (foundCat.name || shopState.category);
      const foundSub = (foundCat.subcategories || []).find(s => (s.slug || s.id || '').toLowerCase() === shopState.subcategory);
      if (foundSub) {
        shopState.subcategoryName = (isRtl && foundSub.name_ar) ? foundSub.name_ar : (foundSub.name || shopState.subcategory);
      } else {
        shopState.subcategoryName = shopState.subcategory.replace(/-/g, ' ');
      }
    } else {
      shopState.categoryName = shopState.category.replace(/-/g, ' ');
      shopState.subcategoryName = shopState.subcategory.replace(/-/g, ' ');
    }

    syncShopUrlParams();
    updateShopViewMode();
    syncShopInputs();
    renderActiveFilterChips();
    renderLeftCategorySidebar();
    loadShopBrands();
    loadShopSubcategories();
    renderShop();
    loadShopCategories();

    const target = document.getElementById('shop-page-title');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  global.selectShopSubcategory = selectShopSubcategory;
  window.selectShopSubcategory = selectShopSubcategory;

  function returnToShopCategories() {
    shopState.viewMode = 'categories';
    shopState.category = '';
    shopState.categoryName = '';
    shopState.subcategory = '';
    shopState.subcategoryName = '';
    shopState.brand = '';
    shopState.attributes = {};
    shopState.search = '';
    categoryState.search = '';
    shopState.page = 1;
    categoryState.page = 1;

    syncShopUrlParams();
    updateShopViewMode();
    syncShopInputs();
    renderActiveFilterChips();
    renderLeftCategorySidebar();
    loadShopBrands();
    loadShopSubcategories();
    renderShopCategories();
    loadShopCategories();

    const target = document.getElementById('shop-page-title');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  global.returnToShopCategories = returnToShopCategories;
  window.returnToShopCategories = returnToShopCategories;

  function syncShopUrlParams() {
    try {
      const isArabic = window.location.pathname.startsWith('/ar');
      let targetPath = `${isArabic ? '/ar' : ''}/shop/`;
      if ((shopState.viewMode === 'subcategories' || shopState.viewMode === 'products') && shopState.category) {
        targetPath = `${isArabic ? '/ar' : ''}/category/${encodeURIComponent(shopState.category)}/`;
      }
      const url = new URL(targetPath, window.location.origin);
      if (shopState.viewMode === 'products') {
        if (shopState.subcategory) url.searchParams.set('subcategory', shopState.subcategory);
        if (shopState.search) url.searchParams.set('search', shopState.search);
        if (shopState.brand) url.searchParams.set('brand', shopState.brand);
        if (shopState.minPrice) url.searchParams.set('minPrice', shopState.minPrice);
        if (shopState.maxPrice) url.searchParams.set('maxPrice', shopState.maxPrice);
        if (shopState.inStock) url.searchParams.set('inStock', 'true');
        if (shopState.isOffer) url.searchParams.set('isOffer', 'true');
        if (shopState.sort && shopState.sort !== 'featured') url.searchParams.set('sort', shopState.sort);
        if (shopState.page > 1) url.searchParams.set('page', shopState.page);
        if (!shopState.subcategory && !shopState.search && !shopState.brand && !shopState.minPrice && !shopState.maxPrice && !shopState.inStock && !shopState.isOffer) {
          url.searchParams.set('view', 'products');
        }
        url.searchParams.delete('per_page');
      } else if (shopState.viewMode === 'subcategories') {
        if (categoryState.search) url.searchParams.set('search', categoryState.search);
      } else {
        if (categoryState.search) url.searchParams.set('search', categoryState.search);
        if (categoryState.page > 1) url.searchParams.set('cat_page', categoryState.page);
      }

      window.history.pushState({ viewMode: shopState.viewMode, category: shopState.category, subcategory: shopState.subcategory }, '', url);
    } catch (e) { }
  }

  function renderLeftCategorySidebar() {
    const sidebarList = document.getElementById('shop-sidebar-category-list');
    const drawerList = document.getElementById('shop-drawer-category-list');
    const totalCountEl = document.getElementById('sidebar-total-products-count');
    const allCatBtn = document.getElementById('sidebar-all-categories-btn');

    if (!sidebarList && !drawerList) return;

    const categories = (categoryState.all || []).slice();
    categories.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    const totalCatalogProducts = categories.reduce((sum, c) => sum + (Number(c.product_count) || 0), 0);
    if (totalCountEl) totalCountEl.textContent = (totalCatalogProducts || 1462).toLocaleString();

    const activeCatSlug = (shopState.category || '').toLowerCase();
    const activeSubSlug = (shopState.subcategory || '').toLowerCase();
    const isAllActive = shopState.viewMode === 'categories' || (!activeCatSlug && !activeSubSlug);

    if (allCatBtn) {
      if (isAllActive) {
        allCatBtn.className = 'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-[#4063B2] text-white shadow-sm';
      } else {
        allCatBtn.className = 'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300';
      }
    }

    if (activeCatSlug) {
      expandedCategories.add(activeCatSlug);
    }

    const filterQ = (subcategoryState.filterQuery || '').toLowerCase().trim();

    let filteredCats = categories;
    if (filterQ) {
      filteredCats = categories.filter(c => {
        const matchCat = (c.name || '').toLowerCase().includes(filterQ) || (c.name_ar || '').toLowerCase().includes(filterQ);
        const matchSub = (c.subcategories || []).some(s => (s.name || '').toLowerCase().includes(filterQ) || (s.name_ar || '').toLowerCase().includes(filterQ));
        return matchCat || matchSub;
      });
    }

    const generateListHtml = (isDrawer = false) => {
      if (filteredCats.length === 0) {
        return `<div class="p-4 text-center text-xs text-slate-400 font-medium">${isRtl ? 'لا توجد فئات مطابقة' : 'No categories match your search.'}</div>`;
      }

      return filteredCats.map(cat => {
        const catSlug = (cat.slug || cat.id || '').toLowerCase();
        const catName = (isRtl && cat.name_ar) ? cat.name_ar : (cat.name || catSlug);
        const isCatActive = activeCatSlug === catSlug;
        const isExpanded = isCatActive || expandedCategories.has(catSlug) || Boolean(filterQ);
        const catCount = Number(cat.product_count) || 0;
        const subs = (cat.subcategories || []).slice();
        subs.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        let subsHtml = '';
        if (subs.length > 0) {
          subsHtml = `
            <div class="mt-1 pl-2.5 pr-1 py-1 space-y-1 border-l-2 ml-3 border-slate-200 dark:border-slate-800 ${isExpanded ? '' : 'hidden'}" data-accordion-content="${catSlug}">
              <!-- "All in Category" Option -->
              <button type="button" data-nav-category="${catSlug}" class="w-full text-left flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer ${isCatActive && !activeSubSlug ? 'bg-[#4063B2]/15 text-[#4063B2] dark:text-[#8D9CF5] font-black' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40 font-semibold'}">
                <span class="truncate">${isRtl ? `جميع ${catName}` : `All ${catName}`}</span>
                <span class="text-[10px] font-mono opacity-60">(${catCount})</span>
              </button>

              ${subs.map(sub => {
                const subSlug = (sub.slug || sub.id || '').toLowerCase();
                const subName = (isRtl && sub.name_ar) ? sub.name_ar : (sub.name || subSlug);
                const isSubActive = isCatActive && activeSubSlug === subSlug;
                const subCount = Number(sub.product_count) || 0;
                const color = sub.color || '#4063B2';
                const iconSvg = getSubcategoryIconSvg(sub.icon);
                const img = sub.image || '/assets/images/products/placeholder.svg';

                return `
                  <button type="button" data-nav-subcategory="${subSlug}" data-parent-cat="${catSlug}" class="w-full text-left flex items-center justify-between py-1.5 px-2 rounded-xl text-xs transition-all cursor-pointer group ${isSubActive ? 'bg-[#4063B2] text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'}">
                    <div class="flex items-center gap-2 min-w-0">
                      <!-- Color dot + Thumbnail -->
                      <div class="relative w-6 h-6 rounded-lg overflow-hidden border border-slate-700/30 flex-shrink-0 bg-slate-800/50 flex items-center justify-center">
                        <img src="${img}" class="w-full h-full object-cover" onerror="this.src='/assets/images/products/placeholder.svg'" />
                        <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white" style="background:${color}"></span>
                      </div>
                      <!-- Icon + Name -->
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="text-slate-400 shrink-0 ${isSubActive ? '!text-white' : ''}">${iconSvg}</span>
                        <span class="truncate">${subName}</span>
                      </div>
                    </div>
                    <span class="text-[10px] font-mono ml-1 flex-shrink-0 ${isSubActive ? 'text-white/90' : 'text-slate-400'}">(${subCount})</span>
                  </button>
                `;
              }).join('')}
            </div>
          `;
        }

        return `
          <div class="category-accordion-group rounded-2xl transition-all" data-cat-group="${catSlug}">
            <!-- Parent Category Header Button -->
            <div class="flex items-center justify-between p-1 rounded-xl transition-all ${isCatActive ? 'bg-[#4063B2]/10 text-[#4063B2] dark:text-[#8D9CF5]' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'}">
              <button type="button" data-nav-category="${catSlug}" class="flex-1 text-left flex items-center gap-2.5 py-1 px-2 rounded-lg cursor-pointer min-w-0">
                <span class="w-2 h-2 rounded-full flex-shrink-0 ${isCatActive ? 'bg-[#4063B2] animate-pulse' : 'bg-slate-400/40'}"></span>
                <span class="text-xs font-bold truncate">${catName}</span>
                <span class="text-[10px] font-mono text-slate-400 shrink-0">(${catCount})</span>
              </button>
              ${subs.length > 0 ? `
                <button type="button" data-toggle-accordion="${catSlug}" aria-label="Toggle subcategories" class="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              ` : ''}
            </div>
            ${subsHtml}
          </div>
        `;
      }).join('');
    };

    if (sidebarList) {
      sidebarList.innerHTML = generateListHtml(false);
      bindSidebarListeners(sidebarList, false);
    }
    if (drawerList) {
      drawerList.innerHTML = generateListHtml(true);
      bindSidebarListeners(drawerList, true);
    }
  }
  global.renderLeftCategorySidebar = renderLeftCategorySidebar;
  window.renderLeftCategorySidebar = renderLeftCategorySidebar;

  function bindSidebarListeners(container, isDrawer = false) {
    container.querySelectorAll('[data-toggle-accordion]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slug = btn.getAttribute('data-toggle-accordion');
        if (expandedCategories.has(slug)) {
          expandedCategories.delete(slug);
        } else {
          expandedCategories.add(slug);
        }
        renderLeftCategorySidebar();
      });
    });

    container.querySelectorAll('[data-nav-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-nav-category');
        selectShopCategory(slug);
        if (isDrawer && window.closeShopCategoryDrawer) window.closeShopCategoryDrawer();
      });
    });

    container.querySelectorAll('[data-nav-subcategory]').forEach(btn => {
      btn.addEventListener('click', () => {
        const subSlug = btn.getAttribute('data-nav-subcategory');
        const parentSlug = btn.getAttribute('data-parent-cat');
        selectShopSubcategory(parentSlug, subSlug);
        if (isDrawer && window.closeShopCategoryDrawer) window.closeShopCategoryDrawer();
      });
    });
  }

  async function loadShopSubcategories(categorySlug = null) {
    const filterSubSec = document.getElementById('filter-subcategories-section');
    const filterSubList = document.getElementById('filter-subcategory-list');
    const filterSubName = document.getElementById('filter-subcategories-selected-name');
    if (!filterSubSec || !filterSubList) return;

    const catSlug = (categorySlug || shopState.category || '').toLowerCase();
    if (!catSlug) {
      filterSubSec.classList.add('hidden');
      filterSubList.innerHTML = '';
      if (filterSubName) filterSubName.textContent = '';
      return;
    }

    filterSubSec.classList.remove('hidden');

    let catObj = (categoryState.all || []).find(c => (c.slug || c.id || '').toLowerCase() === catSlug);
    let subs = catObj?.subcategories || [];

    if (!subs || subs.length === 0) {
      try {
        const res = await fetch(`/api/subcategories?categorySlug=${encodeURIComponent(catSlug)}`);
        if (res.ok) {
          const sData = await res.json();
          subs = Array.isArray(sData) ? sData : (sData.subcategories || []);
          if (catObj) catObj.subcategories = subs;
        }
      } catch (err) {}
    }

    if (filterSubName) {
      filterSubName.textContent = shopState.subcategoryName ? `(${shopState.subcategoryName})` : '';
    }

    if (subs.length === 0) {
      filterSubList.innerHTML = `<p class="text-[11px] text-slate-400 py-1 italic">${isRtl ? 'لا توجد فئات فرعية لهذه الفئة' : 'No subcategories available'}</p>`;
      return;
    }

    const curSub = (shopState.subcategory || '').toLowerCase();
    const allCatCount = Number(catObj?.product_count) || subs.reduce((sum, s) => sum + (Number(s.product_count) || 0), 0);

    let html = `
      <label class="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${!curSub ? 'bg-[#4063B2]/10 font-bold text-[#4063B2] dark:text-[#8D9CF5]' : ''}">
        <div class="flex items-center gap-2 min-w-0">
          <input type="radio" name="filter-subcat-radio" data-filter-sub="" ${!curSub ? 'checked' : ''} class="w-3.5 h-3.5 text-[#4063B2] focus:ring-0 cursor-pointer" />
          <span class="w-2 h-2 rounded-full shrink-0 bg-slate-400"></span>
          <span class="truncate font-medium">${isRtl ? 'جميع الفئات الفرعية' : 'All Subcategories'}</span>
        </div>
        <span class="text-[10px] font-mono text-slate-400 shrink-0">(${allCatCount})</span>
      </label>
    `;

    html += subs.map(sub => {
      const subSlug = (sub.slug || sub.id || '').toLowerCase();
      const subName = (isRtl && sub.name_ar) ? sub.name_ar : (sub.name || subSlug);
      const isChecked = curSub === subSlug;
      const count = Number(sub.product_count) || 0;
      const color = sub.color || '#4063B2';

      return `
        <label class="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${isChecked ? 'bg-[#4063B2]/10 font-bold text-[#4063B2] dark:text-[#8D9CF5]' : ''}">
          <div class="flex items-center gap-2 min-w-0">
            <input type="radio" name="filter-subcat-radio" data-filter-sub="${subSlug}" ${isChecked ? 'checked' : ''} class="w-3.5 h-3.5 text-[#4063B2] focus:ring-0 cursor-pointer" />
            <span class="w-2 h-2 rounded-full shrink-0" style="background:${color}"></span>
            <span class="truncate font-medium">${subName}</span>
          </div>
          <span class="text-[10px] font-mono text-slate-400 shrink-0">(${count})</span>
        </label>
      `;
    }).join('');

    filterSubList.innerHTML = html;

    filterSubList.querySelectorAll('input[data-filter-sub]').forEach(input => {
      input.addEventListener('change', () => {
        const targetSub = input.getAttribute('data-filter-sub');
        if (!targetSub) {
          shopState.subcategory = '';
          shopState.subcategoryName = '';
          selectShopCategory(catSlug, true);
        } else {
          selectShopSubcategory(catSlug, targetSub);
        }
      });
    });
  }
  global.loadShopSubcategories = loadShopSubcategories;
  window.loadShopSubcategories = loadShopSubcategories;

  function updateSearchMatchBanner() {
    const banner = document.getElementById('shop-search-match-banner');
    const bannerText = document.getElementById('shop-search-match-text');
    const bannerAction = document.getElementById('shop-search-match-action');
    if (!banner || !bannerText || !bannerAction) return;

    const q = (shopState.search || '').toLowerCase().trim();
    if (!q || q.length < 2) {
      banner.classList.add('hidden');
      return;
    }

    let matchSub = null;
    let matchCat = null;

    for (const cat of (categoryState.all || [])) {
      for (const s of (cat.subcategories || [])) {
        if ((s.name || '').toLowerCase().includes(q) || (s.name_ar || '').toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q)) {
          matchSub = { ...s, parentCat: cat };
          break;
        }
      }
      if (matchSub) break;
      if ((cat.name || '').toLowerCase().includes(q) || (cat.name_ar || '').toLowerCase().includes(q) || (cat.slug || '').toLowerCase().includes(q)) {
        matchCat = cat;
      }
    }

    if (matchSub) {
      banner.classList.remove('hidden');
      const catName = matchSub.parentCat.name || '';
      bannerText.innerHTML = `Found matching subcategory: <strong>${matchSub.name}</strong> in ${catName} <span class="text-[10px] text-slate-400 font-mono">(${matchSub.product_count || 0} items)</span>`;
      bannerAction.textContent = `Explore ${matchSub.name}`;
      bannerAction.onclick = () => {
        selectShopSubcategory(matchSub.parentCat.slug, matchSub.slug);
      };
    } else if (matchCat) {
      banner.classList.remove('hidden');
      bannerText.innerHTML = `Found matching category: <strong>${matchCat.name}</strong> <span class="text-[10px] text-slate-400 font-mono">(${matchCat.product_count || 0} items)</span>`;
      bannerAction.textContent = `Explore ${matchCat.name}`;
      bannerAction.onclick = () => {
        selectShopCategory(matchCat.slug);
      };
    } else {
      banner.classList.add('hidden');
    }
  }

  window.openShopCategoryDrawer = function() {
    const drawer = document.getElementById('shop-category-drawer');
    if (!drawer) return;
    drawer.classList.remove('hidden', 'pointer-events-none');
    void drawer.offsetWidth;
    drawer.classList.remove('opacity-0');
    drawer.classList.add('opacity-100');
    const panel = drawer.querySelector('.max-w-\\[92vw\\]') || drawer.querySelector('[style*="border-right"]');
    if (panel) {
      panel.classList.remove('-translate-x-full');
      panel.classList.add('translate-x-0');
    }
    const openBtn = document.getElementById('shop-subcategories-open-btn');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  window.closeShopCategoryDrawer = function() {
    const drawer = document.getElementById('shop-category-drawer');
    if (!drawer) return;
    drawer.classList.remove('opacity-100');
    drawer.classList.add('opacity-0');
    const panel = drawer.querySelector('.max-w-\\[92vw\\]') || drawer.querySelector('[style*="border-right"]');
    if (panel) {
      panel.classList.remove('translate-x-0');
      panel.classList.add('-translate-x-full');
    }
    const openBtn = document.getElementById('shop-subcategories-open-btn');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      drawer.classList.add('hidden', 'pointer-events-none');
      document.body.style.overflow = '';
    }, 300);
  };

  window.onSidebarSearchInput = function(val, target = 'sidebar') {
    subcategoryState.filterQuery = (val || '').toLowerCase().trim();
    renderLeftCategorySidebar();
  };

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
      // In responsive / mobile design (< lg), if a subcategory is also selected, hide the parent category chip
      const catChipClass = shopState.subcategory ? 'hidden lg:inline-flex' : 'inline-flex';
      chips.push(`
        <span class="${catChipClass} items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#4063B2]/15 text-[#4063B2] dark:text-[#8D9CF5] border border-[#4063B2]/30 flex-shrink-0 whitespace-nowrap">
          <span>${isRtl ? 'الفئة:' : 'Category:'} <strong>${catLabel}</strong></span>
          <button type="button" data-clear="category" aria-label="Remove category filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    if (shopState.subcategory) {
      activeCount++;
      const subLabel = (shopState.subcategoryName || shopState.subcategory).replace(/-/g, ' ');
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#8D9CF5]/20 text-[#4063B2] dark:text-[#8D9CF5] border border-[#8D9CF5]/40 shadow-xs flex-shrink-0 whitespace-nowrap">
          <span>${isRtl ? 'الفئة الفرعية:' : 'Subcategory:'} <strong>${subLabel}</strong></span>
          <button type="button" data-clear="subcategory" aria-label="Remove subcategory filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    selectedBrands.forEach(b => {
      activeCount++;
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex-shrink-0 whitespace-nowrap">
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
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex-shrink-0 whitespace-nowrap">
          <span>${minText} – ${maxText}</span>
          <button type="button" data-clear="price" aria-label="Remove price filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    if (shopState.inStock) {
      activeCount++;
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex-shrink-0 whitespace-nowrap">
          <span>${isRtl ? 'متوفر فقط' : 'In Stock Only'}</span>
          <button type="button" data-clear="inStock" aria-label="Remove in-stock filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    if (shopState.isOffer) {
      activeCount++;
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex-shrink-0 whitespace-nowrap">
          <span>${isRtl ? 'عروض فقط' : 'Offers Only'}</span>
          <button type="button" data-clear="isOffer" aria-label="Remove offers filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    if (shopState.search) {
      activeCount++;
      chips.push(`
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex-shrink-0 whitespace-nowrap">
          <span>"${shopState.search}"</span>
          <button type="button" data-clear="search" aria-label="Remove search term" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
        </span>
      `);
    }

    // Dynamic Attribute Chips (Requirement 4)
    if (shopState.attributes && typeof shopState.attributes === 'object') {
      for (const [attrKey, vals] of Object.entries(shopState.attributes)) {
        const valArr = Array.isArray(vals) ? vals : [vals];
        valArr.forEach(v => {
          activeCount++;
          const labelKey = attrKey.replace(/_/g, ' ').toUpperCase();
          chips.push(`
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex-shrink-0 whitespace-nowrap">
              <span>${labelKey}: <strong>${v}</strong></span>
              <button type="button" data-clear-attr="${attrKey}" data-clear-val="${v}" aria-label="Remove ${labelKey} filter" class="hover:opacity-75 cursor-pointer ml-1 text-sm font-black">&times;</button>
            </span>
          `);
        });
      }
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
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 select-none">
          <span class="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-0.5 flex-shrink-0">${isRtl ? 'الفلاتر النشطة:' : 'Active:'}</span>
          ${chips.join('')}
        </div>
        <button id="shop-clear-all-filters" type="button" class="text-xs font-bold text-rose-500 hover:underline cursor-pointer flex-shrink-0 ml-2 whitespace-nowrap">
          ${isRtl ? 'مسح الكل' : 'Clear All'}
        </button>
      `;
      bar.classList.remove('hidden');
      bar.classList.add('flex');

      bar.querySelectorAll('[data-clear]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-clear');
          if (key === 'category') {
            returnToShopCategories();
            return;
          }
          if (key === 'subcategory') {
            shopState.subcategory = '';
            shopState.subcategoryName = '';
            shopState.page = 1;
            if (shopState.category) {
              selectShopCategory(shopState.category);
            } else {
              returnToShopCategories();
            }
            return;
          }
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
          renderActiveFilterChips();
          renderShop();
        });
      });

      bar.querySelectorAll('[data-clear-attr]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.getAttribute('data-clear-attr');
          const v = btn.getAttribute('data-clear-val');
          if (shopState.attributes && shopState.attributes[k]) {
            let arr = Array.isArray(shopState.attributes[k]) ? shopState.attributes[k] : [shopState.attributes[k]];
            arr = arr.filter(item => item !== v);
            if (arr.length > 0) {
              shopState.attributes[k] = arr;
            } else {
              delete shopState.attributes[k];
            }
          }
          shopState.page = 1;
          syncShopInputs();
          syncShopUrlParams();
          loadShopBrands();
          renderActiveFilterChips();
          renderShop();
        });
      });

      const clearAllBtn = document.getElementById('shop-clear-all-filters');
      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
          clearAllShopFilters();
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
      if (categoryState.all && categoryState.all.length > 0) {
        categories = categoryState.all;
      } else if (global.api && typeof global.api.getCategories === 'function') {
        categories = await global.api.getCategories(true);
      } else {
        const res = await fetch('/api/categories?includeSubcategories=true');
        categories = await res.json();
      }
      if (!Array.isArray(categories)) return;
      categoryState.all = categories;
      renderLeftCategorySidebar();

      const activeCat = (shopState.category || '').toLowerCase();
      
      const currentCatObj = categories.find(c => (c.slug || c.id || '').toLowerCase() === activeCat);
      if (currentCatObj) {
        shopState.categoryName = (isRtl && currentCatObj.name_ar) ? currentCatObj.name_ar : (currentCatObj.name || activeCat);
        if (shopState.viewMode === 'products') {
          const pageTitle = document.getElementById('shop-page-title');
          const breadcrumbCurrent = document.getElementById('shop-breadcrumb-current');
          if (pageTitle) pageTitle.textContent = shopState.categoryName;
          if (breadcrumbCurrent) breadcrumbCurrent.textContent = shopState.categoryName;
        }
      } else if (!activeCat) {
        shopState.categoryName = '';
      }

      const isAllCategoriesActive = shopState.viewMode === 'categories' || !activeCat;

      // 1. Top horizontal category pills
      if (pillsContainer) {
        let html = `
          <a href="javascript:void(0)" data-category-slug=""
             class="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${isAllCategoriesActive ? 'bg-[#4063B2] text-white shadow-[0_4px_12px_rgba(64,99,178,0.25)]' : 'border border-slate-700/30 text-slate-400 hover:text-white'}">
            ${isRtl ? 'جميع الفئات' : 'All Categories'}
          </a>
        `;

        categories.forEach(cat => {
          const slug = cat.slug || cat.id;
          const name = (isRtl && cat.name_ar) ? cat.name_ar : (cat.name || slug);
          const isActive = Boolean(shopState.viewMode === 'products' && activeCat && activeCat === (slug || '').toLowerCase());
          html += `
            <a href="javascript:void(0)" data-category-slug="${slug}"
               class="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${isActive ? 'bg-[#4063B2] text-white shadow-[0_4px_12px_rgba(64,99,178,0.25)]' : 'border border-slate-700/30 text-slate-400 hover:text-white'}">
              ${name}
            </a>
          `;
        });

        pillsContainer.innerHTML = html;
        if (shopState.viewMode === 'products') {
          pillsContainer.classList.add('hidden', 'md:flex');
          pillsContainer.classList.remove('flex');
        } else {
          pillsContainer.classList.remove('hidden');
          pillsContainer.classList.add('flex');
        }

        pillsContainer.querySelectorAll('[data-category-slug]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSlug = (btn.getAttribute('data-category-slug') || '').toLowerCase();
            if (!targetSlug) {
              returnToShopCategories();
            } else {
              selectShopCategory(targetSlug);
            }
          });
        });
      }

      // 2. Sidebar category list
      if (sideCatContainer) {
        let sideHtml = `
          <button type="button" data-sidebar-cat="" class="w-full text-left flex items-center justify-between text-xs py-1.5 px-2 rounded-lg cursor-pointer transition-all ${isAllCategoriesActive ? 'bg-[#4063B2] text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'}" style="${isAllCategoriesActive ? '' : 'color:var(--text-secondary)'}">
            <span>${isRtl ? 'جميع الفئات' : 'All Categories'}</span>
            <span class="text-[10px] opacity-75">•</span>
          </button>
        `;

        categories.forEach(cat => {
          const slug = cat.slug || cat.id;
          const name = (isRtl && cat.name_ar) ? cat.name_ar : (cat.name || slug);
          const isActive = Boolean(shopState.viewMode === 'products' && activeCat && activeCat === (slug || '').toLowerCase());
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
            const targetSlug = (btn.getAttribute('data-sidebar-cat') || '').toLowerCase();
            if (!targetSlug) {
              returnToShopCategories();
            } else {
              selectShopCategory(targetSlug);
            }
            if (window.closeShopFilterDrawer) window.closeShopFilterDrawer();
          });
        });
      }
    } catch (e) {
      console.warn('Could not load shop categories:', e);
    }
  }

  function clearAllShopFilters() {
    shopState.category = '';
    shopState.categoryName = '';
    shopState.subcategory = '';
    shopState.brand = '';
    shopState.attributes = {};
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
    loadShopBrands();
    renderActiveFilterChips();
    renderShop();
    loadShopCategories();
  }
  global.clearAllShopFilters = clearAllShopFilters;
  window.clearAllShopFilters = clearAllShopFilters;

  async function loadShopBrands() {
    const listDesk = document.getElementById('filter-brand-list');
    const listMob = document.getElementById('mobile-filter-brand-list');
    const attrSec = document.getElementById('filter-attributes-section');
    const attrContainer = document.getElementById('filter-attributes-container');
    if (!listDesk && !listMob && !attrSec) return;

    let brandsList = [];
    let attributesList = [];

    try {
      const qParams = new URLSearchParams();
      if (shopState.category) qParams.set('category', shopState.category);
      if (shopState.subcategory) qParams.set('subcategory', shopState.subcategory);
      if (shopState.search) qParams.set('search', shopState.search);

      const res = await fetch(`/api/products/filters?${qParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        brandsList = data.brands || [];
        attributesList = data.attributes || [];
      } else {
        throw new Error('Filters API returned ' + res.status);
      }
    } catch (e) {
      console.warn('Could not load dynamic category filters, falling back:', e);
      try {
        const res2 = await fetch('/api/brands');
        const bData = await res2.json();
        if (Array.isArray(bData)) {
          brandsList = bData.map(b => ({ name: b.name, count: b.product_count || 0 }));
        }
      } catch (err) {}
    }

    // Render Dynamic Brands
    const renderBrandItems = (container) => {
      if (!container) return;
      if (brandsList.length === 0) {
        container.innerHTML = `<p class="text-[11px] text-slate-400 py-1 italic">${isRtl ? 'لا توجد علامات تجارية لهذه الفئة' : 'No brands available in this category'}</p>`;
        return;
      }
      const selected = (shopState.brand || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

      container.innerHTML = brandsList.map(b => {
        const isChecked = selected.includes(b.name.toLowerCase());
        return `
          <label class="brand-item flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors" data-brand-search="${b.name.toLowerCase()}">
            <div class="flex items-center gap-2">
              <input type="checkbox" data-brand-name="${b.name}" ${isChecked ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-slate-600 text-[#4063B2] focus:ring-0 cursor-pointer" />
              <span class="font-medium" style="color:var(--text-primary)">${b.name}</span>
            </div>
            ${b.count !== undefined ? `<span class="text-[10px] text-slate-400 font-mono">(${b.count})</span>` : ''}
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
          renderActiveFilterChips();
          renderShop();
        });
      });
    };

    renderBrandItems(listDesk);
    renderBrandItems(listMob);

    // Render Category-Specific Attributes (RAM, Storage, Processor, Screen Size, Capacity, etc.)
    if (attrSec && attrContainer) {
      if (attributesList.length > 0) {
        attrSec.classList.remove('hidden');
        attrContainer.innerHTML = attributesList.map(attr => {
          const attrKey = attr.key || attr.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          const currentVals = (shopState.attributes && shopState.attributes[attrKey]) || [];
          const selectedVals = Array.isArray(currentVals) ? currentVals.map(v => String(v).toLowerCase()) : [String(currentVals).toLowerCase()];

          return `
            <div class="space-y-2 py-2 border-t first:border-t-0" style="border-color:var(--border-color)">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">${attr.label || attr.name}</span>
              </div>
              <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                ${attr.options.map(opt => {
                  const isChecked = selectedVals.includes(String(opt.value).toLowerCase());
                  return `
                    <label class="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                      <div class="flex items-center gap-2">
                        <input type="checkbox" data-attr-key="${attrKey}" data-attr-val="${opt.value}" ${isChecked ? 'checked' : ''} class="w-3.5 h-3.5 rounded border-slate-600 text-[#4063B2] focus:ring-0 cursor-pointer" />
                        <span class="font-medium text-slate-200">${opt.value}</span>
                      </div>
                      ${opt.count !== undefined ? `<span class="text-[10px] text-slate-400 font-mono">(${opt.count})</span>` : ''}
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('');

        attrContainer.querySelectorAll('[data-attr-key]').forEach(cb => {
          cb.addEventListener('change', () => {
            const key = cb.getAttribute('data-attr-key');
            const val = cb.getAttribute('data-attr-val');
            if (!shopState.attributes) shopState.attributes = {};
            let arr = shopState.attributes[key] || [];
            if (!Array.isArray(arr)) arr = [arr];

            if (cb.checked) {
              if (!arr.includes(val)) arr.push(val);
            } else {
              arr = arr.filter(v => v !== val);
            }

            if (arr.length > 0) {
              shopState.attributes[key] = arr;
            } else {
              delete shopState.attributes[key];
            }

            shopState.page = 1;
            renderActiveFilterChips();
            renderShop();
          });
        });
      } else {
        attrSec.classList.add('hidden');
        attrContainer.innerHTML = '';
      }
    }

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

  let shopInfiniteScroller = null;

  async function renderShop() {
    const container = document.getElementById('shop-products-container');
    if (!container) return;

    if (shopState.viewMode === 'categories') {
      if (shopInfiniteScroller) {
        shopInfiniteScroller.destroy();
        shopInfiniteScroller = null;
      }
      return renderShopCategories();
    }
    if (shopState.viewMode === 'subcategories') {
      if (shopInfiniteScroller) {
        shopInfiniteScroller.destroy();
        shopInfiniteScroller = null;
      }
      return renderShopSubcategories();
    }

    updateShopViewMode();

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
      if (mobFilterBtn) mobFilterBtn.style.display = '';
      const shopFilterOpenBtn = document.getElementById('shop-filter-open-btn');
      if (shopFilterOpenBtn) shopFilterOpenBtn.style.display = '';
      renderActiveFilterChips();
      syncShopInputs();
    }

    revealShopFilters();

    if (shopInfiniteScroller) {
      shopInfiniteScroller.destroy();
      shopInfiniteScroller = null;
    }

    updateSearchMatchBanner();

    container.style.opacity = '1';
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

    shopInfiniteScroller = createCursorInfiniteScroll({
      container,
      endpoint: '/api/products',
      limit: 15,
      prefetchThreshold: 450,
      getParams: () => {
        const p = {
          sort: shopState.sort
        };
        if (shopState.category) p.category = shopState.category;
        if (shopState.subcategory) p.subcategory = shopState.subcategory;
        if (shopState.brand) p.brand = shopState.brand;
        if (shopState.minPrice) p.minPrice = shopState.minPrice;
        if (shopState.maxPrice) p.maxPrice = shopState.maxPrice;
        if (shopState.inStock) p.inStock = 'true';
        if (shopState.isOffer) p.isOffer = 'true';
        if (shopState.search) p.search = shopState.search;
        if (shopState.attributes && Object.keys(shopState.attributes).length > 0) {
          p.attributes = JSON.stringify(shopState.attributes);
        }
        return p;
      },
      renderCard: renderProductCard,
      onBatchLoaded: ({ totalLoaded, total, hasMore }) => {
        shopState.total = total;
        const counterEl = document.getElementById('shop-items-counter');
        if (counterEl) {
          counterEl.innerHTML = `<span>${isRtl ? 'عرض' : 'Showing'} <strong style="color:var(--text-primary)">${totalLoaded}</strong> ${isRtl ? 'من أصل' : 'of'} <strong style="color:var(--text-primary)">${total}</strong> ${isRtl ? 'منتج' : 'items'}</span>`;
        }
        const paginationContainer = document.getElementById('shop-pagination-container');
        if (paginationContainer) {
          if (!hasMore && totalLoaded > 0) {
            paginationContainer.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-400 font-bold tracking-wider uppercase">${isRtl ? 'تم عرض جميع المنتجات' : "You've viewed all products"}</div>`;
          } else {
            paginationContainer.innerHTML = '';
          }
        }
      },
      onEmpty: (cnt) => {
        cnt.innerHTML = `<div class="col-span-full w-full py-20 text-center text-slate-400 font-medium">${isRtl ? 'لم يتم العثور على منتجات مطابقة لخياراتك.' : 'No products found matching your selection.'}</div>`;
        const counterEl = document.getElementById('shop-items-counter');
        if (counterEl) {
          counterEl.innerHTML = `<span>${isRtl ? 'عرض' : 'Showing'} <strong style="color:var(--text-primary)">0</strong> ${isRtl ? 'منتج' : 'items'}</span>`;
        }
        const paginationContainer = document.getElementById('shop-pagination-container');
        if (paginationContainer) paginationContainer.innerHTML = '';
      },
      onError: (err, isInitial) => {
        if (isInitial) {
          container.innerHTML = `<div class="col-span-full w-full py-20 text-center text-rose-500 font-medium">${isRtl ? 'تعذر تحميل المنتجات.' : 'Unable to load products from server.'}</div>`;
        }
      }
    });

    if (shopInfiniteScroller) {
      shopInfiniteScroller.fetchInitial();
    }
  }

  function initShopPage() {
    const productsContainer = document.getElementById('shop-products-container');
    const categoriesContainer = document.getElementById('shop-categories-container');
    if (!productsContainer && !categoriesContainer) return;

    // Read initial URL params or clean path /category/:slug/ or /subcategory/:slug/
    const catMatch = window.location.pathname.match(/(?:\/ar)?\/category\/([^/?#]+)/i);
    const subMatch = window.location.pathname.match(/(?:\/ar)?\/subcategory\/([^/?#]+)/i);
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('per_page')) {
      searchParams.delete('per_page');
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('per_page');
        window.history.replaceState({}, '', cleanUrl.toString());
      } catch (_) {}
    }

    let initialCategory = '';
    if (catMatch && catMatch[1]) {
      initialCategory = decodeURIComponent(catMatch[1]).trim().toLowerCase();
    } else if (searchParams.has('category')) {
      initialCategory = searchParams.get('category').trim().toLowerCase();
    }

    if (subMatch && subMatch[1]) {
      shopState.subcategory = decodeURIComponent(subMatch[1]).trim().toLowerCase();
    } else if (searchParams.has('subcategory')) {
      shopState.subcategory = searchParams.get('subcategory').trim().toLowerCase();
    }
    if (searchParams.has('brand')) {
      shopState.brand = searchParams.get('brand').trim();
    }
    if (searchParams.has('minPrice')) {
      shopState.minPrice = searchParams.get('minPrice').trim();
    }
    if (searchParams.has('maxPrice')) {
      shopState.maxPrice = searchParams.get('maxPrice').trim();
    }
    if (searchParams.has('inStock')) {
      shopState.inStock = searchParams.get('inStock') === 'true';
    }
    if (searchParams.has('isOffer')) {
      shopState.isOffer = searchParams.get('isOffer') === 'true';
    }
    if (searchParams.has('search')) {
      const sVal = searchParams.get('search').trim();
      shopState.search = sVal;
      categoryState.search = sVal;
    }
    if (searchParams.has('sort')) shopState.sort = searchParams.get('sort');
    if (searchParams.has('page')) shopState.page = parseInt(searchParams.get('page'), 10) || 1;
    if (searchParams.has('cat_page')) categoryState.page = parseInt(searchParams.get('cat_page'), 10) || 1;

    if (initialCategory) {
      shopState.category = initialCategory;
      if (shopState.subcategory || shopState.brand || shopState.minPrice || shopState.maxPrice || shopState.inStock || shopState.isOffer || (searchParams.has('search') && shopState.search) || searchParams.get('view') === 'products') {
        shopState.viewMode = 'products';
      } else {
        shopState.viewMode = 'subcategories';
      }
    } else if (shopState.subcategory) {
      shopState.viewMode = 'products';
    } else {
      if (shopState.brand || shopState.minPrice || shopState.maxPrice || shopState.inStock || shopState.isOffer || shopState.search) {
        shopState.viewMode = 'products';
      } else {
        shopState.viewMode = 'categories';
      }
    }

    // Call updateShopViewMode synchronously right away to guarantee zero layout flash
    updateShopViewMode();

    // Bind Back to Categories / Subcategories button
    const backToCatBtn = document.getElementById('shop-back-to-categories-btn');
    if (backToCatBtn) {
      backToCatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (shopState.viewMode === 'products' && shopState.category && shopState.subcategory) {
          selectShopCategory(shopState.category);
        } else {
          returnToShopCategories();
        }
      });
    }

    // Bind breadcrumb Shop root link
    const breadcrumbRoot = document.getElementById('shop-breadcrumb-root');
    if (breadcrumbRoot) {
      breadcrumbRoot.addEventListener('click', (e) => {
        e.preventDefault();
        returnToShopCategories();
      });
    }

    // Search Input binding
    const searchInput = document.getElementById('shop-search-input');
    const searchForm = document.getElementById('shop-search-form');
    if (searchInput) {
      if (shopState.viewMode === 'products' && shopState.search) {
        searchInput.value = shopState.search;
      } else if (categoryState.search) {
        searchInput.value = categoryState.search;
      }

      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const val = e.target.value.trim();
          if (shopState.viewMode === 'categories') {
            categoryState.search = val;
            categoryState.page = 1;
            renderShopCategories();
          } else if (shopState.viewMode === 'subcategories') {
            categoryState.search = val;
            renderShopSubcategories();
          } else {
            shopState.search = val;
            shopState.page = 1;
            syncShopUrlParams();
            renderShop();
          }
        }, 300);
      });
    }
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = searchInput ? searchInput.value.trim() : '';
        if (shopState.viewMode === 'categories') {
          categoryState.search = val;
          categoryState.page = 1;
          renderShopCategories();
        } else if (shopState.viewMode === 'subcategories') {
          categoryState.search = val;
          renderShopSubcategories();
        } else {
          shopState.search = val;
          shopState.page = 1;
          syncShopUrlParams();
          renderShop();
        }
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
      const cMatch = window.location.pathname.match(/(?:\/ar)?\/category\/([^/?#]+)/i);
      const urlCategory = cMatch && cMatch[1] ? decodeURIComponent(cMatch[1]).trim().toLowerCase() : (p.get('category')?.trim().toLowerCase() || '');

      shopState.category = urlCategory;
      shopState.subcategory = p.get('subcategory')?.trim().toLowerCase() || '';
      shopState.brand = p.get('brand')?.trim() || '';
      shopState.minPrice = p.get('minPrice')?.trim() || '';
      shopState.maxPrice = p.get('maxPrice')?.trim() || '';
      shopState.inStock = p.get('inStock') === 'true';
      shopState.isOffer = p.get('isOffer') === 'true';
      shopState.search = p.get('search')?.trim() || '';
      shopState.sort = p.get('sort')?.trim() || 'featured';
      shopState.page = parseInt(p.get('page'), 10) || 1;

      categoryState.page = parseInt(p.get('cat_page'), 10) || 1;

      if (!shopState.category && !shopState.subcategory && !shopState.brand && !shopState.minPrice && !shopState.maxPrice && !shopState.inStock && !shopState.isOffer && !shopState.search) {
        shopState.viewMode = 'categories';
        categoryState.search = '';
        if (searchInput) searchInput.value = '';
        updateShopViewMode();
        renderShopCategories();
      } else if (shopState.category && !shopState.subcategory && !shopState.brand && !shopState.minPrice && !shopState.maxPrice && !shopState.inStock && !shopState.isOffer && !shopState.search && p.get('view') !== 'products') {
        shopState.viewMode = 'subcategories';
        categoryState.search = '';
        if (searchInput) searchInput.value = '';
        updateShopViewMode();
        renderShopSubcategories();
      } else {
        shopState.viewMode = 'products';
        if (searchInput) searchInput.value = shopState.search;
        if (sortSelect) sortSelect.value = shopState.sort;
        updateShopViewMode();
        renderShop();
      }
      syncShopInputs();
      renderActiveFilterChips();
      loadShopCategories();
      loadShopSubcategories();
      renderLeftCategorySidebar();
    });

    loadShopCategories();
    loadShopBrands();
    loadShopSubcategories();
    renderLeftCategorySidebar();

    updateShopViewMode();
    if (shopState.viewMode === 'categories') {
      renderShopCategories();
    } else if (shopState.viewMode === 'subcategories') {
      renderShopSubcategories();
    } else {
      renderShop();
    }
  }

  // ─── 3. PRODUCT DETAIL HYDRATION ─────────────────────────────────────────
  async function hydrateProductDetail() {
    const titleEl = document.getElementById('product-title');
    const detailView = document.getElementById('product-detail-view');
    const notFoundView = document.getElementById('product-not-found-view');

    function showNotFound() {
      if (detailView) {
        detailView.classList.add('hidden');
        detailView.setAttribute('aria-busy', 'false');
      }
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

      // Open Graph & Twitter Cards (for WhatsApp & social previews)
      const ogTitle = document.getElementById('og-title') || document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', seoTitle);
      const ogDesc = document.getElementById('og-desc') || document.querySelector('meta[property="og:description"]');
      if (ogDesc && seoDesc) ogDesc.setAttribute('content', seoDesc);
      const ogUrl = document.getElementById('og-url') || document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', `${siteBaseUrl}/product/${encodeURIComponent(cleanSlug)}/`);
      const ogImg = document.getElementById('og-image') || document.querySelector('meta[property="og:image"]');
      if (ogImg && primaryImage) ogImg.setAttribute('content', primaryImage);

      const twTitle = document.getElementById('tw-title') || document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', seoTitle);
      const twDesc = document.getElementById('tw-desc') || document.querySelector('meta[name="twitter:description"]');
      if (twDesc && seoDesc) twDesc.setAttribute('content', seoDesc);
      const twImg = document.getElementById('tw-image') || document.querySelector('meta[name="twitter:image"]');
      if (twImg && primaryImage) twImg.setAttribute('content', primaryImage);

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
      const catSepEl = document.getElementById('product-category-sep');
      if (catLinkEl) {
        const catName = product.category || product.category_name;
        if (catName) {
          catLinkEl.textContent = catName;
          catLinkEl.href = `${isRtl ? '/ar' : ''}/category/${encodeURIComponent(product.category_slug || catName)}/`;
          catLinkEl.removeAttribute('aria-label');
          catLinkEl.classList.remove('hidden');
          if (catSepEl) catSepEl.classList.remove('hidden');
        } else {
          catLinkEl.classList.add('hidden');
          if (catSepEl) catSepEl.classList.add('hidden');
        }
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
        ratingContainer.removeAttribute('aria-hidden');
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
      const mainImgWrap = document.getElementById('product-main-image-wrap') || (mainImg ? mainImg.parentElement : null);
      const prevBtn = document.getElementById('gallery-prev-btn');
      const nextBtn = document.getElementById('gallery-next-btn');
      const indexBadge = document.getElementById('gallery-index-badge');
      const thumbsContainer = document.getElementById('product-thumbnails-container');
      let activeImageIdx = 0;
      let imageLoadSeq = 0;

      function loadMainProductImage(url, altText) {
        if (!mainImg) return;
        const targetUrl = url || '/assets/images/products/placeholder.svg';
        mainImg.alt = altText || pName;

        if (mainImg.getAttribute('data-loaded-src') === targetUrl && mainImg.complete && mainImg.naturalWidth > 0) {
          if (mainImgWrap) mainImgWrap.classList.add('img-loaded');
          return;
        }

        const reqId = ++imageLoadSeq;
        if (mainImgWrap) mainImgWrap.classList.remove('img-loaded');

        const markLoaded = (loadedKey) => {
          if (reqId !== imageLoadSeq) return;
          mainImg.setAttribute('data-loaded-src', loadedKey);
          if (mainImgWrap) mainImgWrap.classList.add('img-loaded');
        };

        mainImg.onload = () => markLoaded(targetUrl);
        mainImg.onerror = () => {
          if (reqId !== imageLoadSeq) return;
          if (!mainImg.src.includes('/assets/images/products/placeholder.svg')) {
            mainImg.onload = () => markLoaded('/assets/images/products/placeholder.svg');
            mainImg.src = '/assets/images/products/placeholder.svg';
          } else {
            markLoaded('/assets/images/products/placeholder.svg');
          }
        };

        mainImg.src = targetUrl;
        if (mainImg.complete && mainImg.naturalWidth > 0) {
          markLoaded(targetUrl);
        }
      }

      function setActiveImage(idx) {
        if (idx < 0) idx = imagesList.length - 1;
        if (idx >= imagesList.length) idx = 0;
        activeImageIdx = idx;

        const currentUrl = imagesList[activeImageIdx];
        const currentAlt = (product.imagesMetadata && product.imagesMetadata[activeImageIdx]?.alt) ||
          (product.imagesAlt && product.imagesAlt[activeImageIdx]) ||
          `${pName} - Image ${activeImageIdx + 1}`;

        loadMainProductImage(currentUrl, currentAlt);

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
        priceContainer.removeAttribute('aria-hidden');
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
        stockContainer.removeAttribute('aria-hidden');
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
          if (v.image && mainImg) loadMainProductImage(v.image, `${pName} - ${vName}`);
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
          addBtn.classList.remove('opacity-50', 'opacity-60', 'opacity-70', 'cursor-not-allowed');
          addBtn.classList.add('cursor-pointer');
          addBtn.style.pointerEvents = '';
          const span = addBtn.querySelector('span');
          if (span) span.textContent = isRtl ? 'أضف إلى السلة' : 'Add to Cart';
        }
      }

      // Wishlist / Liked Button
      const wishBtn = document.getElementById('product-wishlist-btn');
      if (wishBtn) {
        wishBtn.disabled = false;
        wishBtn.removeAttribute('aria-disabled');
        wishBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        wishBtn.classList.add('cursor-pointer');
        wishBtn.style.pointerEvents = '';
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

      // Mark main product details as loaded
      if (detailView) detailView.setAttribute('aria-busy', 'false');

      // ════ Dynamic "You May Also Like" Recommendations (Requirement 5) ════
      const relContainer = document.getElementById('product-related-container');
      if (relContainer) {
        try {
          const recRes = await fetch(`/api/products/${encodeURIComponent(slug)}/recommendations?limit=8`);
          const recData = await recRes.json();
          const recItems = Array.isArray(recData) ? recData : (Array.isArray(product.related) ? product.related : []);
          if (recItems.length > 0) {
            relContainer.innerHTML = recItems.map((rp, i) => renderProductCard(rp, i)).join('');
            if (window.Wishlist && typeof window.Wishlist.sync === 'function') {
              window.Wishlist.sync();
            }
          } else {
            relContainer.innerHTML = `
              <div class="col-span-full py-8 text-center text-xs text-slate-400">
                ${isRtl ? 'لا توجد منتجات مشابهة حالياً.' : 'No similar products found at this moment.'}
              </div>`;
          }
        } catch (e) {
          if (Array.isArray(product.related) && product.related.length > 0) {
            relContainer.innerHTML = product.related.map((rp, i) => renderProductCard(rp, i)).join('');
          }
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
      const primCount = isArabic ? 'مجموعة مميزة' : 'Featured Collection';

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
        const countBadge = (isArabic && cat.name_ar) ? cat.name_ar : (isArabic ? 'تصفح الفئة' : 'Explore Category');

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
      // Exactly 3 identical sets for the 0% -> -33.333% CSS marquee animation
      const repeated = [...bucket, ...bucket, ...bucket];
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
        .slice(0, 5);

      let html = topCats.map(c => {
        const slug = c.slug || c.id;
        const name = (isArabic && c.name_ar) ? c.name_ar : c.name;
        return `<li><a href="${isArabic ? '/ar' : ''}/shop/?category=${encodeURIComponent(slug)}" class="text-xs transition-colors hover:text-[#8D9CF5]" style="color:var(--text-secondary);font-size:12px">${name}</a></li>`;
      }).join('');

      html += `<li><a href="${isArabic ? '/ar' : ''}/categories/" class="view-all-link text-xs font-semibold tracking-wide text-[#8D9CF5] hover:underline flex items-center gap-1 mt-1.5" style="font-size:12px">${isArabic ? 'جميع الفئات ←' : 'View All Categories →'}</a></li>`;

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
    returnToShopCategories();
  };

  window.openMobileFilterDrawer = window.openShopFilterDrawer;
  window.closeMobileFilterDrawer = window.closeShopFilterDrawer;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeShopFilterDrawer();
      if (window.closeShopCategoryDrawer) window.closeShopCategoryDrawer();
      if (window.closeAllCategoriesModal) window.closeAllCategoriesModal();
    }
  });

  // ─── 2.56 DYNAMIC HERO BANNER HYDRATION (Requirement 3 & 1) ────────────────
  // Implements instant local storage hydration and smart DB change detection to skip continuous fetching.
  async function loadDynamicHeroBanner() {
    const headlineEl = document.getElementById('hero-headline');
    const subtitleEl = document.getElementById('hero-subtitle');
    const bgImgEl = document.getElementById('hero-bg-img');
    const actionsEl = document.getElementById('hero-actions');
    const heroSection = document.getElementById('hero-section');
    if (!headlineEl && !subtitleEl && !bgImgEl) return;

    const HERO_STORAGE_KEY = 'marjaah_hero_banner_cache';
    const isRtl = document.documentElement.dir === 'rtl' || window.location.pathname.startsWith('/ar');

    function getLocalHeroCache() {
      try {
        const raw = localStorage.getItem(HERO_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.banner || (parsed.allBanners && parsed.allBanners.length))) {
          return parsed;
        }
      } catch (e) {
        console.warn('[HeroBanner] Cache read error:', e);
      }
      return null;
    }

    function saveLocalHeroCache(version, banners) {
      try {
        if (!banners || !banners.length) return;
        const payload = {
          version: String(version || Date.now()),
          savedAt: Date.now(),
          banner: banners[0],
          allBanners: banners,
        };
        localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn('[HeroBanner] Cache write error:', e);
      }
    }

    function applyBanner(b) {
      if (!b) return;
      const isMobile = window.innerWidth < 640;

      // 1. Headline / Hero Title
      const headlineText = isRtl && b.headline_ar ? b.headline_ar : (b.headline || b.title);
      if (headlineText && headlineEl) {
        const span = headlineEl.querySelector('span');
        if (span) {
          span.textContent = headlineText;
        } else {
          headlineEl.textContent = headlineText;
        }
      }

      // 2. Subtitle
      const subText = isRtl && b.subtitle_ar ? b.subtitle_ar : (b.subtitle || b.description);
      if (subText && subtitleEl) {
        subtitleEl.textContent = subText;
      }

      // 3. Desktop / Mobile background image
      const targetImg = isMobile
        ? (b.image_mobile || b.mobile_image || b.image_desktop || b.image || b.image_url)
        : (b.image_desktop || b.image || b.image_url || b.image_mobile);
      if (targetImg && bgImgEl) {
        bgImgEl.style.backgroundImage = "url('" + targetImg + "')";
      }

      let rawPrimaryText = isRtl && (b.cta_text_ar || b.button_text_ar)
        ? (b.cta_text_ar || b.button_text_ar)
        : (b.cta_text || b.button_text || 'Shop All Collections');
      if (rawPrimaryText === 'Explore Catalog') {
        rawPrimaryText = 'Shop All Collections';
      }
      const primaryText = rawPrimaryText;
      const primaryLink = b.cta_link || b.link_url || '/shop/';

      if (actionsEl) {
        let btnsHtml = '<a href="' + primaryLink + '" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4063B2] to-[#8D9CF5] text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-lg shadow-[#4063B2]/20 transition-all duration-200">' +
          '<span>' + primaryText + '</span>' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>' +
        '</a>';

        const secText = isRtl && b.secondary_cta_text_ar ? b.secondary_cta_text_ar : b.secondary_cta_text;
        const secLink = b.secondary_cta_link || '/shop/?category=home-appliances';
        if (secText) {
          btnsHtml += '<a href="' + secLink + '" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider border border-white/20 backdrop-blur-md transition-all duration-200">' +
            '<span>' + secText + '</span>' +
          '</a>';
        }
        actionsEl.innerHTML = btnsHtml;
      }
    }

    let rotationTimer = null;
    function setupBannerRotation(activeBanners) {
      if (!activeBanners || activeBanners.length <= 1 || !heroSection) return;
      if (rotationTimer) clearInterval(rotationTimer);

      let currentIdx = 0;
      let dotsContainer = document.getElementById('hero-banner-dots');
      if (!dotsContainer) {
        dotsContainer = document.createElement('div');
        dotsContainer.id = 'hero-banner-dots';
        dotsContainer.className = 'absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2';
        heroSection.appendChild(dotsContainer);
      }

      const renderDots = () => {
        dotsContainer.innerHTML = activeBanners.map((_, i) => `
          <button type="button" data-hero-slide="${i}" class="w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${i === currentIdx ? 'bg-indigo-400 w-8' : 'bg-white/40 hover:bg-white/70'}" aria-label="Go to slide ${i + 1}"></button>
        `).join('');

        dotsContainer.querySelectorAll('[data-hero-slide]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            currentIdx = Number(btn.getAttribute('data-hero-slide'));
            applyBanner(activeBanners[currentIdx]);
            renderDots();
          });
        });
      };

      renderDots();

      // Auto rotate every 6 seconds
      rotationTimer = setInterval(() => {
        currentIdx = (currentIdx + 1) % activeBanners.length;
        applyBanner(activeBanners[currentIdx]);
        renderDots();
      }, 6000);
    }

    // ── STEP 1: FAST 0ms HYDRATION FROM LOCAL STORAGE ──
    const cached = getLocalHeroCache();
    let hasRenderedFromCache = false;

    if (cached && (cached.banner || (cached.allBanners && cached.allBanners.length))) {
      const bannerToApply = cached.banner || cached.allBanners[0];
      applyBanner(bannerToApply);
      hasRenderedFromCache = true;
      if (cached.allBanners && cached.allBanners.length > 1) {
        setupBannerRotation(cached.allBanners);
      }
    }

    // ── STEP 2: CHECK DB VERSION (Skip continuous fetching if DB unchanged) ──
    try {
      let dbVersion = null;
      try {
        const verRes = await fetch('/api/banners/version?type=hero');
        if (verRes.ok) {
          const verData = await verRes.json();
          dbVersion = verData && verData.version ? String(verData.version) : null;
        }
      } catch (err) {
        // Network offline or version endpoint unreachable; cache already shown!
      }

      // If local cache is active and DB version hasn't changed, SKIP full fetch!
      if (hasRenderedFromCache && dbVersion && cached && cached.version && String(cached.version) === dbVersion) {
        return; // Fast path: Zero full-fetch overhead, identical database state!
      }

      // ── STEP 3: FETCH FROM DB (Only when changed or no cache) ──
      const res = await fetch('/api/banners?type=hero');
      if (!res.ok) return;
      const banners = await res.json();
      if (!Array.isArray(banners) || banners.length === 0) return;
      const activeBanners = banners.filter(b => b.is_active !== false && b.status !== 'inactive');
      if (activeBanners.length === 0) return;

      // Save fresh data & version to local storage
      saveLocalHeroCache(dbVersion || String(Date.now()), activeBanners);

      // Render fresh banner
      applyBanner(activeBanners[0]);

      if (activeBanners.length > 1) {
        setupBannerRotation(activeBanners);
      }
    } catch (e) {
      console.warn('[HeroBanner] Sync error:', e);
    }
  }

  // ─── 2.57 DYNAMIC PROMOTIONAL SECTIONS HYDRATION (Requirement 6) ────────
  async function loadDynamicPromotionalSections() {
    const container = document.getElementById('dynamic-promotional-sections');
    if (!container) return;

    try {
      const res = await fetch('/api/promotional-sections');
      if (!res.ok) return;
      const sections = await res.json();
      if (!Array.isArray(sections) || sections.length === 0) return;

      const isRtl = document.documentElement.dir === 'rtl';
      const isMobile = window.innerWidth < 768;

      container.innerHTML = sections.map(function(sec) {
        const title = isRtl && sec.title_ar ? sec.title_ar : (sec.title || 'NEXT-GEN MOBILE & POWER ESSENTIALS');
        const badge = isRtl && sec.badge_ar ? sec.badge_ar : (sec.badge || 'PREMIUM MOBILE ESSENTIALS • إكسسوارات الجوال الأصلية');
        const subtitle = isRtl && sec.subtitle_ar ? sec.subtitle_ar : (sec.subtitle || 'Genuine high-speed fast chargers, high-capacity power banks, and accessories across Qatar.');
        const img = isMobile ? (sec.image_mobile || sec.image_desktop || '/assets/images/banners/hero-mobile.jpg') : (sec.image_desktop || '/assets/images/banners/hero-mobile.jpg');
        const ctaText = isRtl && sec.cta_text_ar ? sec.cta_text_ar : (sec.cta_text || 'SHOP MOBILE ACCESSORIES');
        const ctaLink = sec.cta_link || '/shop/?category=mobile-accessories';
        const secCtaText = isRtl && sec.secondary_cta_text_ar ? sec.secondary_cta_text_ar : (sec.secondary_cta_text || 'CHAT ON WHATSAPP');
        const secCtaLink = sec.secondary_cta_link || 'https://wa.me/97477991013';

        const cardTag = sec.card_tag || 'FAST CHARGING & POWER';
        const cardPrice = sec.card_price || 'FROM QAR 49';
        const cardLink = sec.card_link || '/shop/?category=mobile-accessories';

        let titleHtml = title;
        if (title.indexOf('&') !== -1) {
          const parts = title.split('&');
          titleHtml = parts[0].trim() + ' &amp;<br /><span class="text-outline">' + parts.slice(1).join('&').trim() + '</span>';
        }

        return '<section class="py-24 md:py-36 px-6 sm:px-12 md:px-16 overflow-hidden" style="background-color:var(--bg-surface);border-top:1px solid var(--border-color);color:var(--text-primary)">' +
          '<div class="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center max-w-[1440px] mx-auto">' +
            '<div class="lg:col-span-6 relative cursor-pointer group">' +
              '<div class="absolute w-full h-full bg-gradient-to-br from-[#4063B2]/20 to-[#8D9CF5]/20 rounded-3xl pointer-events-none -top-8 -left-8 md:-top-12 md:-left-12 z-0"></div>' +
              '<div class="relative z-10 aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2 transition-transform duration-500 ease-out">' +
                '<img src="' + img + '" alt="' + title.replace(/"/g, '&quot;') + '" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />' +
                '<div class="absolute inset-0 bg-black/20 pointer-events-none"></div>' +
                '<div class="absolute bottom-6 left-6 right-6 p-4 bg-[#070B14]/85 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-between rounded-xl">' +
                  '<div>' +
                    '<p class="text-[10px] font-sans font-bold uppercase tracking-widest text-[#8D9CF5]">' + cardTag + '</p>' +
                    (cardPrice ? '<p class="font-display text-lg text-white font-bold">' + cardPrice + '</p>' : '') +
                  '</div>' +
                  '<a href="' + cardLink + '" class="text-xs font-sans font-bold uppercase tracking-widest text-white underline underline-offset-4">EXPLORE</a>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="lg:col-span-6 space-y-8">' +
              '<span class="font-display text-sm md:text-base uppercase tracking-widest text-[#8D9CF5] font-bold block">' + badge + '</span>' +
              '<h2 class="font-display text-5xl sm:text-6xl md:text-7xl leading-tight uppercase tracking-tight font-black" style="color:var(--text-primary)">' +
                titleHtml +
              '</h2>' +
              '<p class="text-base sm:text-lg font-sans leading-relaxed max-w-xl" style="color:var(--text-secondary)">' +
                subtitle +
              '</p>' +
              '<div class="pt-4 flex flex-wrap items-center gap-6">' +
                '<a class="group inline-flex items-center gap-4 text-xs font-sans font-bold tracking-widest uppercase transition-colors duration-300" style="color:var(--text-primary)" href="' + ctaLink + '">' +
                  '<span>' + ctaText + '</span>' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 group-hover:translate-x-2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>' +
                '</a>' +
                (secCtaText ? '<a href="' + secCtaLink + '" target="_blank" rel="noopener noreferrer" class="text-xs font-sans font-bold tracking-widest uppercase text-slate-400 hover:text-white underline underline-offset-4 transition-colors">' + secCtaText + '</a>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>';
      }).join('');
    } catch (e) {
      // Graceful fallback to static section
    }
  }

  function initAll() {
    // 0. Hero Banner dynamic updates (home page)
    if (document.getElementById('hero-headline') || document.getElementById('hero-bg-img')) {
      loadDynamicHeroBanner();
    }

    // 0.2 Dynamic Promotional Sections (home page)
    if (document.getElementById('dynamic-promotional-sections')) {
      loadDynamicPromotionalSections();
    }

    // 0.3 Browse by category on home page
    if (document.getElementById('home-categories-grid')) {
      loadHomeCategoriesGrid();
    }

    // 0.5 Top Brands Marquee on home page
    if (document.getElementById('home-brands-col-1')) {
      loadHomeBrands();
    }

    if (document.getElementById('featured-products-container')) {
      loadProducts('featured-products-container', { isFeatured: true, limit: 10 }, 'featured-products-section');
    }

    if (document.getElementById('bestsellers-products-container')) {
      loadProducts('bestsellers-products-container', { isBestSeller: true, limit: 10 }, 'bestsellers-products-section');
    }

    if (document.getElementById('newarrivals-products-container')) {
      loadProducts('newarrivals-products-container', { isNew: true, sort: 'newest', limit: 10 }, 'newarrivals-products-section');
    }

    if (document.getElementById('new-arrivals-container')) {
      loadProducts('new-arrivals-container', { limit: 10, sort: 'newest' });
    }

    // 3. Shop Catalog Page
    if (document.getElementById('shop-products-container') || document.getElementById('shop-categories-container')) {
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
  global.selectShopCategory = selectShopCategory;
  global.returnToShopCategories = returnToShopCategories;
  global.renderShopCategories = renderShopCategories;
  global.createCursorInfiniteScroll = createCursorInfiniteScroll;
  global.loadDynamicHeroBanner = loadDynamicHeroBanner;
  global.loadDynamicPromotionalSections = loadDynamicPromotionalSections;
})(window);
