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
  const path = window.location.pathname;
  const isHome = path === '/' || path === '/en/' || path === '/ar/' || path === '/en' || path === '/ar';

  function updateNavbar() {
    if (!navbar) return;
    if (isHome) {
      if (window.scrollY > 20) {
        navbar.classList.add('navbar-scrolled');
        navbar.classList.remove('navbar-transparent');
      } else {
        navbar.classList.remove('navbar-scrolled');
        navbar.classList.add('navbar-transparent');
      }
    } else {
      navbar.classList.add('navbar-scrolled');
      navbar.classList.remove('navbar-transparent');
    }
  }

  updateNavbar();
  window.addEventListener('scroll', updateNavbar, { passive: true });

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
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const targetLocale = btn.dataset.localeSwitch;
      const pathname = window.location.pathname;
      let newPath;
      if (pathname.startsWith('/en/') || pathname.startsWith('/ar/')) {
        newPath = pathname.replace(/^\/(en|ar)\//, '/' + targetLocale + '/');
      } else if (pathname === '/en' || pathname === '/ar') {
        newPath = '/' + targetLocale + '/';
      } else if (pathname === '/' || !pathname) {
        newPath = '/' + targetLocale + '/';
      } else {
        newPath = '/' + targetLocale + (pathname.startsWith('/') ? pathname : '/' + pathname);
      }
      window.location.href = newPath + window.location.search + window.location.hash;
    });
  });
})();
