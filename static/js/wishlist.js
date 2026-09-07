// ─── Wishlist Toggle (AJAX) ───────────────────────────────────────────────────
(function () {
  const LOCALE = document.documentElement.lang || 'en';

  function getCsrf() {
    return document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] || '';
  }

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    e.preventDefault();
    const slug = btn.dataset.wishlistToggle;
    fetch(`/${LOCALE}/api/wishlist/toggle/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrf() },
      body: JSON.stringify({ slug: slug }),
    }).then(r => r.json()).then(res => {
      if (res.success) {
        const icon = btn.querySelector('svg, [data-wishlist-icon]');
        if (res.in_wishlist) {
          btn.classList.add('wishlist-active');
          if (icon) icon.style.fill = '#f87171';
          Toast.success(LOCALE === 'ar' ? 'تمت الإضافة إلى المفضلة' : 'Added to wishlist!');
        } else {
          btn.classList.remove('wishlist-active');
          if (icon) icon.style.fill = 'none';
          Toast.info(LOCALE === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist');
        }
        // Update wishlist badge count
        document.querySelectorAll('[data-wishlist-count]').forEach(el => {
          el.textContent = res.wishlist_count;
          el.style.display = res.wishlist_count > 0 ? 'flex' : 'none';
        });
      }
    }).catch(console.error);
  });
})();

