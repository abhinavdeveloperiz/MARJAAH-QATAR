// ─── Mobile Menu ──────────────────────────────────────────────────────────────
(function () {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-menu-close');
  const drawer = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');

  function openMenu() {
    if (!drawer) return;
    drawer.classList.remove('translate-x-full');
    drawer.classList.add('translate-x-0');
    if (overlay) { overlay.classList.remove('opacity-0', 'pointer-events-none'); overlay.classList.add('opacity-100'); }
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!drawer) return;
    drawer.classList.add('translate-x-full');
    drawer.classList.remove('translate-x-0');
    if (overlay) { overlay.classList.add('opacity-0', 'pointer-events-none'); overlay.classList.remove('opacity-100'); }
    document.body.style.overflow = '';
  }

  if (menuBtn) menuBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
  document.querySelectorAll('#mobile-menu a').forEach(a => a.addEventListener('click', closeMenu));

  // Navbar scroll behavior
  const navbar = document.getElementById('main-navbar');
  let lastScroll = 0;
  window.addEventListener('scroll', function() {
    const y = window.scrollY;
    if (navbar) {
      if (y > 20) {
        navbar.classList.add('navbar-scrolled');
        navbar.classList.remove('navbar-transparent');
      } else {
        navbar.classList.remove('navbar-scrolled');
        navbar.classList.add('navbar-transparent');
      }
    }
    lastScroll = y;
  }, { passive: true });

  // Search overlay
  const searchBtn = document.getElementById('search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const searchClose = document.getElementById('search-close');
  const searchInput = document.getElementById('search-input');

  if (searchBtn) searchBtn.addEventListener('click', function() {
    searchOverlay.classList.remove('hidden');
    setTimeout(() => searchInput?.focus(), 50);
  });
  if (searchClose) searchClose.addEventListener('click', function() { searchOverlay.classList.add('hidden'); });
  if (searchOverlay) searchOverlay.addEventListener('click', function(e) {
    if (e.target === searchOverlay) searchOverlay.classList.add('hidden');
  });

  // User dropdown
  const userBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  if (userBtn) {
    userBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', function() { userDropdown?.classList.add('hidden'); });
  }

  // Language switcher
  document.querySelectorAll('[data-locale-switch]').forEach(btn => {
    btn.addEventListener('click', function() {
      const targetLocale = btn.dataset.localeSwitch;
      const currentPath = window.location.pathname;
      const newPath = currentPath.replace(/^\/(en|ar)/, '/' + targetLocale);
      window.location.href = newPath;
    });
  });
})();
