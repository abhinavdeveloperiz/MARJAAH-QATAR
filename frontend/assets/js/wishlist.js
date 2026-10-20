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

      container.innerHTML = wishlisted.map(p => `
        <div class="card group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
             style="background:var(--bg-surface);border:1px solid var(--border-color);">
          <div class="relative overflow-hidden block" style="aspect-ratio:4/3;background:var(--bg-surface-2)">
            <button data-wishlist-toggle="${p.slug || p.id}" aria-label="Toggle liked"
              class="wishlist-active absolute top-3 right-3 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white/90 hover:scale-110 shadow-sm cursor-pointer"
              style="border:1px solid var(--border-color);">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
            <a href="/product/${encodeURIComponent(p.slug || p.id)}/">
              <img src="${(p.images && p.images[0]) || p.image || 'https://storage.googleapis.com/marjaah-ab2a6.firebasestorage.app/products/placeholder.svg'}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            </a>
          </div>
          <div class="p-4 flex flex-col flex-1">
            <a href="/product/${encodeURIComponent(p.slug || p.id)}/" class="block text-sm font-semibold mb-2 line-clamp-2 hover:opacity-80" style="color:var(--text-primary)">
              ${isRtl && p.name_ar ? p.name_ar : p.name}
            </a>
            <div class="text-base font-bold mb-4 mt-auto" style="color:var(--text-primary)">${isRtl ? `${p.price} ر.ق` : `QAR ${p.price}`}</div>
            <button data-add-to-cart="${p.slug || p.id}" class="btn-primary w-full justify-center text-xs font-bold py-2.5 rounded-xl cursor-pointer">
              ${isRtl ? 'أضف إلى السلة' : 'Add to Cart'}
            </button>
          </div>
        </div>
      `).join('');
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
