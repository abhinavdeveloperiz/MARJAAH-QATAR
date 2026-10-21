// ─── Liked & Saved Products Engine (Client-side localStorage + Storefront UI Sync) ──────
(function () {
  const isRtl = document.documentElement.getAttribute('dir') === 'rtl' || window.location.pathname.startsWith('/ar');
  const LOCALE = isRtl ? 'ar' : 'en';
  const STORAGE_KEY = 'marjaah_wishlist';

  function getWishlist() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function setWishlist(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
    updateWishlistBadges(items.length);
  }

  function updateWishlistBadges(count) {
    document.querySelectorAll('[data-wishlist-count]').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  function syncWishlistButtons() {
    const list = getWishlist();
    document.querySelectorAll('[data-wishlist-toggle]').forEach(btn => {
      const slug = btn.dataset.wishlistToggle;
      if (!slug) return;
      const isLiked = list.includes(slug);
      const icon = btn.querySelector('svg');
      if (isLiked) {
        btn.classList.add('wishlist-active');
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('title', LOCALE === 'ar' ? 'إزالة من المفضلة والمحفوظات' : 'Remove from Liked / Saved');
        if (icon) {
          icon.style.fill = '#ef4444';
          icon.style.stroke = '#ef4444';
        }
      } else {
        btn.classList.remove('wishlist-active');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('title', LOCALE === 'ar' ? 'إضافة إلى المنتجات المفضلة' : 'Add to Liked / Saved');
        if (icon) {
          icon.style.fill = 'none';
          icon.style.stroke = '#ef4444';
        }
      }
    });
  }

  // Toggle Handler
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const slug = btn.dataset.wishlistToggle;
    if (!slug) return;

    let list = getWishlist();
    const index = list.indexOf(slug);
    let inWishlist = false;

    if (index > -1) {
      list.splice(index, 1);
      inWishlist = false;
      if (window.Toast) {
        window.Toast.info(LOCALE === 'ar' ? 'تمت الإزالة من المنتجات المفضلة والمحفوظة' : 'Removed from Liked / Saved Products');
      }
    } else {
      list.push(slug);
      inWishlist = true;
      if (window.Toast) {
        window.Toast.success(LOCALE === 'ar' ? 'تمت الإضافة إلى المنتجات المفضلة والمحفوظة!' : 'Added to Liked & Saved Products!');
      }
    }

    setWishlist(list);
    syncWishlistButtons();

    // If on wishlist page, re-render
    if (window.location.pathname.includes('/wishlist/')) {
      renderWishlistPage();
    }
  });

  // Render on /wishlist/ page
  async function renderWishlistPage() {
    const container = document.getElementById('wishlist-items-container');
    const emptyState = document.getElementById('wishlist-empty-state');
    const countHeader = document.getElementById('wishlist-header-count');
    if (!container && !emptyState) return;

    const list = getWishlist();
    if (countHeader) {
      countHeader.textContent = LOCALE === 'ar'
        ? `المنتجات المفضلة والمحفوظة (${list.length})`
        : `Liked & Saved Products (${list.length})`;
    }

    if (list.length === 0) {
      if (container) container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (!container) return;

    container.innerHTML = '<div class="col-span-full py-12 text-center"><div class="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>';

    try {
      let allRes;
      if (window.api && typeof window.api.getProducts === 'function') {
        allRes = await window.api.getProducts({ limit: 1000 });
      } else if (window.ApiClient) {
        allRes = await (new window.ApiClient()).getProducts({ limit: 1000 });
      } else {
        const res = await fetch('/api/products?limit=1000');
        allRes = await res.json();
      }

      let allProds = [];
      if (Array.isArray(allRes)) allProds = allRes;
      else if (allRes && Array.isArray(allRes.items)) allProds = allRes.items;
      else if (allRes && Array.isArray(allRes.data)) allProds = allRes.data;

      const wishlisted = allProds.filter(p => list.includes(p.slug) || list.includes(p.id));

      if (wishlisted.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        container.innerHTML = '';
        return;
      }

      container.innerHTML = wishlisted.map((p, idx) => {
        if (typeof window.renderProductCard === 'function') {
          return window.renderProductCard(p, idx);
        }
        const isFeatured = Boolean(p.is_featured || p.featured);
        const inStock = Boolean(
          p.in_stock !== false &&
          p.in_stock !== 'false' &&
          p.stock_status !== 'outofstock' &&
          p.stock_status !== 'OUT_OF_STOCK'
        );
        const starPos = isRtl ? 'top-2.5 right-2.5 sm:top-3 sm:right-3' : 'top-2.5 left-2.5 sm:top-3 sm:left-3';
        const heartPos = isRtl ? 'top-2.5 left-2.5 sm:top-3 sm:left-3' : 'top-2.5 right-2.5 sm:top-3 sm:right-3';
        const brandName = p.brand || p.brand_name || '';

        return `
          <div class="card anim-visible group relative rounded-xl sm:rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300 ${!inStock ? 'opacity-90' : ''}"
               style="background:var(--bg-surface);border:1px solid var(--border-color);">
            <div class="relative overflow-hidden block" style="aspect-ratio:4/3;background:var(--bg-surface-2)">
              ${isFeatured ? `
                <div class="absolute ${starPos} z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm pointer-events-none transition-transform group-hover:scale-105"
                     style="background:rgba(255,255,255,0.92);border:1px solid var(--border-color);backdrop-filter:blur(6px)"
                     title="${isRtl ? 'منتج مميز' : 'Featured Product'}" aria-label="${isRtl ? 'منتج مميز' : 'Featured Product'}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
              ` : ''}
              <button data-wishlist-toggle="${p.slug || p.id}" aria-label="Toggle liked"
                class="wishlist-active absolute ${heartPos} z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all opacity-90 hover:opacity-100 hover:scale-110 shadow-sm cursor-pointer"
                style="background:rgba(255,255,255,0.92);border:1px solid var(--border-color);backdrop-filter:blur(6px)">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </button>
              <a href="/product/${encodeURIComponent(p.slug || p.id)}/">
                <img src="${(p.images && p.images[0]) || p.image || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg'}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!inStock ? 'grayscale-[25%]' : ''}" loading="lazy" />
              </a>
            </div>
            <div class="p-3 sm:p-4 flex flex-col flex-1">
              <div class="mb-2">
                ${brandName ? `<span class="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest block truncate" style="color:var(--color-accent)">${brandName}</span>` : ''}
                <a href="/product/${encodeURIComponent(p.slug || p.id)}/" class="block text-xs sm:text-sm font-semibold leading-snug mt-1 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] transition-colors duration-200 hover:opacity-80" style="color:var(--text-primary)">
                  ${isRtl && p.name_ar ? p.name_ar : p.name}
                </a>
              </div>
              <div class="flex flex-wrap items-baseline gap-1.5 sm:gap-2 mb-3 mt-auto">
                <span class="font-display font-black text-base sm:text-lg md:text-xl" style="color:var(--text-primary)">${isRtl ? `${p.price} ر.ق` : `QAR ${p.price}`}</span>
              </div>
              ${inStock
                ? `<button data-add-to-cart="${p.slug || p.id}" class="btn-primary w-full justify-center text-xs font-bold py-2 sm:py-2.5 px-2 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    <span class="truncate">${isRtl ? 'أضف إلى السلة' : 'Add to Cart'}</span>
                   </button>`
                : `<button disabled type="button" aria-disabled="true" class="w-full text-xs text-center py-2 sm:py-2.5 px-2 rounded-xl font-bold uppercase tracking-wider opacity-60 cursor-not-allowed border border-rose-500/25 text-rose-500 bg-rose-500/10 flex items-center justify-center gap-1.5 select-none shrink-0" style="pointer-events:none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>
                    <span class="truncate">${isRtl ? 'نفذت الكمية' : 'Out of Stock'}</span>
                   </button>`
              }
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('Failed to load liked products:', e);
      if (emptyState) emptyState.style.display = 'flex';
      container.innerHTML = '';
    }
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    const list = getWishlist();
    updateWishlistBadges(list.length);
    syncWishlistButtons();
    if (window.location.pathname.includes('/wishlist/')) {
      renderWishlistPage();
    }
  });

  // Expose global helper
  window.Wishlist = {
    get: getWishlist,
    set: setWishlist,
    sync: syncWishlistButtons,
    updateBadges: updateWishlistBadges,
    has: (slug) => getWishlist().includes(slug),
    toggle: (slug) => {
      let list = getWishlist();
      const idx = list.indexOf(slug);
      if (idx > -1) list.splice(idx, 1);
      else list.push(slug);
      setWishlist(list);
      syncWishlistButtons();
      return list.includes(slug);
    }
  };
})();
