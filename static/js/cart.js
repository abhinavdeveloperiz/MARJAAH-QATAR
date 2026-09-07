// ─── Cart System (localStorage + Server AJAX) ─────────────────────────────────
(function () {
  const LOCALE = document.documentElement.lang || 'en';

  function getCsrf() {
    return document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';
  }

  function apiPost(url, data, cb) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
      body: JSON.stringify(data),
    }).then(r => r.json()).then(cb).catch(console.error);
  }

  // ── Cart Drawer open/close ─────────────────────────
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');

  function openCart() {
    if (!overlay || !drawer) return;
    overlay.classList.remove('pointer-events-none', 'opacity-0');
    overlay.classList.add('opacity-100');
    drawer.style.transform = 'translateX(0)';
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    if (!overlay || !drawer) return;
    overlay.classList.add('opacity-0', 'pointer-events-none');
    overlay.classList.remove('opacity-100');
    drawer.style.transform = 'translateX(100%)';
    document.body.style.overflow = '';
  }

  if (overlay) overlay.addEventListener('click', closeCart);
  document.querySelectorAll('[data-open-cart]').forEach(btn => btn.addEventListener('click', openCart));
  document.querySelectorAll('[data-close-cart]').forEach(btn => btn.addEventListener('click', closeCart));

  // ── Add to cart ───────────────────────────────────
  function updateCartBadge(count) {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    const slug = btn.dataset.addToCart;
    apiPost(`/${LOCALE}/api/cart/add/`, { slug: slug, quantity: 1 }, function(res) {
      if (res.success) {
        updateCartBadge(res.cart_count);
        Toast.success(LOCALE === 'ar' ? 'تمت الإضافة إلى السلة' : 'Added to cart!');
        refreshCartDrawer();
      }
    });
  });

  // ── Update quantity ───────────────────────────────
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-cart-qty]');
    if (!btn) return;
    const slug = btn.dataset.cartQty;
    const delta = parseInt(btn.dataset.delta || '0');
    const qtyEl = btn.closest('[data-cart-item]')?.querySelector('[data-qty-display]');
    const currentQty = parseInt(qtyEl?.textContent || '1');
    const newQty = currentQty + delta;
    apiPost(`/${LOCALE}/api/cart/update/`, { slug: slug, quantity: newQty }, function(res) {
      if (res.success) {
        updateCartBadge(res.cart_count);
        refreshCartDrawer();
      }
    });
  });

  // ── Remove item ───────────────────────────────────
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-cart-remove]');
    if (!btn) return;
    const slug = btn.dataset.cartRemove;
    apiPost(`/${LOCALE}/api/cart/remove/`, { slug: slug }, function(res) {
      if (res.success) {
        updateCartBadge(res.cart_count);
        Toast.success(LOCALE === 'ar' ? 'تمت الإزالة من السلة' : 'Removed from cart');
        refreshCartDrawer();
      }
    });
  });

  // ── Refresh cart drawer content via fetch ─────────
  function refreshCartDrawer() {
    const drawerContent = document.getElementById('cart-drawer-content');
    if (!drawerContent) return;
    fetch(`/${LOCALE}/cart/?partial=1`).then(r => r.text()).then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newContent = doc.getElementById('cart-drawer-content');
      if (newContent) drawerContent.innerHTML = newContent.innerHTML;
    }).catch(() => {
      // Silently fail — page reload will sync
    });
  }

  window.CartSystem = { open: openCart, close: closeCart };
})();

