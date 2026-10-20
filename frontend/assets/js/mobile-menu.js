// ─── Mobile Menu ──────────────────────────────────────────────────────────────
(function () {
  const isArPage = window.location.pathname.startsWith('/ar/') || window.location.pathname === '/ar';
  if (isArPage) {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'en');
  }

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
  const searchForm = searchOverlay ? searchOverlay.querySelector('form') : null;
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const q = searchInput ? searchInput.value.trim() : '';
      if (q) {
        window.location.href = `${isArPage ? '/ar' : ''}/shop/?search=${encodeURIComponent(q)}`;
      }
    });
  }
  if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) {
          window.location.href = `${isArPage ? '/ar' : ''}/shop/?search=${encodeURIComponent(q)}`;
        }
      }
    });
  }

  // User dropdown & dynamic auth state
  const userBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  const user = window.api ? window.api.getUser() : null;
  const token = window.api ? window.api.getToken() : null;

  if (userBtn) {
    if (user && token && user.role !== 'admin' && user.username !== 'admin') {
      const nameEl = userBtn.querySelector('.user-name');
      if (nameEl) nameEl.textContent = user.first_name || user.username || 'Account';

      const avatarEl = userBtn.querySelector('div');
      if (avatarEl) {
        const initial = (user.first_name || user.username || 'U').charAt(0).toUpperCase();
        avatarEl.textContent = initial;
      }

      if (userDropdown) {
        const emailP = userDropdown.querySelector('p.text-\\[11px\\]');
        if (emailP) emailP.textContent = user.email || '';
        const nameP = userDropdown.querySelector('p.text-xs.font-bold');
        if (nameP) nameP.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
      }
    } else {
      const nameEl = userBtn.querySelector('.user-name');
      if (nameEl) nameEl.textContent = 'Sign In';
      if (userDropdown) {
        userDropdown.innerHTML = `
          <div class="p-3 space-y-2">
            <a href="/login/" class="btn-primary w-full text-center text-xs py-2 block">Sign In</a>
            <a href="/register/" class="btn-ghost w-full text-center text-xs py-2 block" style="border:1px solid var(--border-color);color:var(--text-secondary)">Register</a>
          </div>
        `;
      }
    }

    userBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      userDropdown?.classList.toggle('hidden');
    });
    document.addEventListener('click', function() { userDropdown?.classList.add('hidden'); });
  }

  // Language switcher
  document.querySelectorAll('[data-locale-switch]').forEach(btn => {
    const isThisActive = btn.dataset.localeSwitch === (isArPage ? 'ar' : 'en');
    btn.style.background = isThisActive ? '#4063B2' : 'transparent';
    btn.style.color = isThisActive ? '#fff' : 'rgba(255,255,255,0.75)';

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const targetLocale = btn.dataset.localeSwitch;
      const pathname = window.location.pathname;
      let newPath;
      if (targetLocale === 'ar') {
        if (pathname.startsWith('/ar/')) {
          newPath = pathname;
        } else if (pathname === '/ar') {
          newPath = '/ar/';
        } else {
          newPath = '/ar' + (pathname.startsWith('/') ? pathname : '/' + pathname);
        }
      } else {
        // 'en' (default clean URLs without prefix)
        newPath = pathname.replace(/^\/(en|ar)(\/|$)/, '/');
        if (!newPath.startsWith('/')) newPath = '/' + newPath;
      }
      window.location.href = newPath + window.location.search + window.location.hash;
    });
  });

  // Arabic navigation link persistence & label translations
  if (isArPage) {
    function applyArabicNav() {
      const internalPaths = [
        '/shop/', '/cart/', '/checkout/', '/about/', '/contact/',
        '/offers/', '/wishlist/', '/account/', '/login/', '/register/',
        '/privacy/', '/terms/', '/returns/', '/track-order/'
      ];
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href) return;
        if (href === '/' || href === '/en' || href === '/en/') {
          a.setAttribute('href', '/ar/');
        } else if (href.startsWith('/') && !href.startsWith('/ar/') && !href.startsWith('/assets/') && !href.startsWith('/api/') && !href.startsWith('/static/')) {
          for (const p of internalPaths) {
            if (href === p || href.startsWith(p)) {
              a.setAttribute('href', '/ar' + href);
              break;
            }
          }
        }
      });

      const navMap = {
        'Shop': 'المتجر',
        'Offers': 'العروض',
        'About': 'عن المتجر',
        'Contact': 'اتصل بنا',
        'Cart': 'السلة',
        'Sign In': 'تسجيل الدخول',
        'Register': 'إنشاء حساب',
        'Account': 'حسابي',
        'Wishlist': 'المفضلة',
        'My Account': 'حسابي'
      };
      document.querySelectorAll('.nav-link, #mobile-menu a, .user-name').forEach(el => {
        const text = el.textContent.trim();
        if (navMap[text]) {
          el.textContent = navMap[text];
        }
      });

      document.querySelectorAll('input[type="search"], #search-input').forEach(inp => {
        inp.placeholder = 'ابحث عن الملحقات أو الماركات أو الموديل...';
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyArabicNav);
    } else {
      applyArabicNav();
    }
  }
})();
