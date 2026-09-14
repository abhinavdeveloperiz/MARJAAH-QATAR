// ─── Cart System (Server AJAX) ────────────────────────────────────────────────
(function () {
  const LOCALE = document.documentElement.lang || 'en';

  function getCsrf() {
    if (window.CSRF_TOKEN && window.CSRF_TOKEN !== 'NOTPROVIDED') return window.CSRF_TOKEN;
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    return document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';
  }

  function apiPost(url, data, cb) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
      body: JSON.stringify(data),
    })
      .then(r => r.json())
      .then(cb)
      .catch(console.error);
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

  // ── Cart badge update ──────────────────────────────
  function updateCartBadge(count) {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  // ── Add to cart ───────────────────────────────────
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    const slug = btn.dataset.addToCart;
    // Visual feedback: disable button while request is in flight
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span style="opacity:0.7">Adding…</span>';
    apiPost(`/${LOCALE}/api/cart/add/`, { slug: slug, quantity: 1 }, function (res) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      if (res.success) {
        updateCartBadge(res.cart_count);
        if (typeof Toast !== 'undefined') {
          Toast.success(LOCALE === 'ar' ? 'تمت الإضافة إلى السلة ✓' : 'Added to cart! ✓');
        }
        refreshCartDrawer();
        openCart();
      } else {
        if (typeof Toast !== 'undefined') {
          Toast.error(res.error || (LOCALE === 'ar' ? 'حدث خطأ' : 'Could not add item.'));
        }
      }
    });
  });

  // ── Update quantity ───────────────────────────────
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-cart-qty]');
    if (!btn) return;
    const slug = btn.dataset.cartQty;
    const delta = parseInt(btn.dataset.delta || '0');
    const qtyEl = btn.closest('[data-cart-item]')?.querySelector('[data-qty-display]');
    const currentQty = parseInt(qtyEl?.textContent || '1');
    const newQty = currentQty + delta;
    apiPost(`/${LOCALE}/api/cart/update/`, { slug: slug, quantity: newQty }, function (res) {
      if (res.success) {
        updateCartBadge(res.cart_count);
        refreshCartDrawer();
      }
    });
  });

  // ── Remove item ───────────────────────────────────
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-cart-remove]');
    if (!btn) return;
    const slug = btn.dataset.cartRemove;
    apiPost(`/${LOCALE}/api/cart/remove/`, { slug: slug }, function (res) {
      if (res.success) {
        updateCartBadge(res.cart_count);
        if (typeof Toast !== 'undefined') {
          Toast.info(LOCALE === 'ar' ? 'تمت الإزالة من السلة' : 'Removed from cart');
        }
        refreshCartDrawer();
      }
    });
  });

  // ── Refresh cart drawer via AJAX partial ──────────
  function refreshCartDrawer() {
    const drawerContent = document.getElementById('cart-drawer-content');
    if (!drawerContent) return;
    // Fetch the standalone partial — cart_view detects ?partial=1
    fetch(`/${LOCALE}/cart/?partial=1`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(r => r.text())
      .then(html => {
        drawerContent.innerHTML = html;
      })
      .catch(() => {
        // Silently fail — cart state is still correct, page reload will sync UI
      });
  }

  window.CartSystem = { open: openCart, close: closeCart, refresh: refreshCartDrawer };
})();
