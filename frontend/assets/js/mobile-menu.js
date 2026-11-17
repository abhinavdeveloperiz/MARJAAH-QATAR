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

  // Search button: Navigate to dedicated search page with automatic autofocus & recent searches
  const searchBtn = document.getElementById('search-btn');
  const allSearchBtns = document.querySelectorAll('#search-btn, [data-open-search], .btn-open-search');
  const searchOverlay = document.getElementById('search-overlay');
  const searchClose = document.getElementById('search-close');
  const searchInput = document.getElementById('search-input');

  allSearchBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const isAr = window.location.pathname.startsWith('/ar') || document.documentElement.getAttribute('dir') === 'rtl';
      window.location.href = `${isAr ? '/ar' : ''}/search/`;
    });
  });
  if (searchClose) searchClose.addEventListener('click', function() {
    searchOverlay.classList.add('hidden');
    if (liveResultsContainer) {
      liveResultsContainer.classList.add('hidden');
      liveResultsContainer.innerHTML = '';
    }
  });
  if (searchOverlay) searchOverlay.addEventListener('click', function(e) {
    if (e.target === searchOverlay) {
      searchOverlay.classList.add('hidden');
      if (liveResultsContainer) {
        liveResultsContainer.classList.add('hidden');
        liveResultsContainer.innerHTML = '';
      }
    }
  });

  const searchForm = searchOverlay ? searchOverlay.querySelector('form') : null;
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const q = searchInput ? searchInput.value.trim() : '';
      if (q) {
        window.location.href = `${isArPage ? '/ar' : ''}/search/?q=${encodeURIComponent(q)}`;
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) {
          window.location.href = `${isArPage ? '/ar' : ''}/search/?q=${encodeURIComponent(q)}`;
        }
      } else if (e.key === 'Escape') {
        if (searchOverlay) searchOverlay.classList.add('hidden');
      }
    });

    searchInput.addEventListener('input', function(e) {
      clearTimeout(searchDebounceTimer);
      const q = (e.target.value || '').trim();

      if (q.length < 2) {
        if (liveResultsContainer) {
          liveResultsContainer.classList.add('hidden');
          liveResultsContainer.innerHTML = '';
        }
        return;
      }

      searchDebounceTimer = setTimeout(async () => {
        if (searchAbortController) searchAbortController.abort();
        searchAbortController = new AbortController();

        if (liveResultsContainer) {
          liveResultsContainer.classList.remove('hidden');
          liveResultsContainer.innerHTML = `
            <div class="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <span class="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
              <span>${isArPage ? 'جاري البحث في الكتالوج...' : 'Searching catalog...'}</span>
            </div>
          `;
        }

        try {
          const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}&limit=6`, {
            signal: searchAbortController.signal,
          });
          if (!res.ok) throw new Error('Search failed');
          const data = await res.json();
          const categories = data.categories || [];
          const subcategories = data.subcategories || [];
          const products = data.products || [];
          const totalMatches = categories.length + subcategories.length + products.length;

          if (!liveResultsContainer) return;

          if (totalMatches === 0) {
            liveResultsContainer.innerHTML = `
              <div class="p-4 rounded-2xl border border-dashed border-slate-700/80 text-center text-xs text-slate-400">
                ${isArPage ? `لم يتم العثور على نتائج تطابق "${q}"` : `No matching categories, subcategories, or products for "${q}"`}
              </div>
            `;
            return;
          }

          let html = '<div class="space-y-3 max-h-[70vh] overflow-y-auto pr-1">';

          // 1. Matching Categories Section
          if (categories.length > 0) {
            html += `
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 flex items-center justify-between">
                  <span>${isArPage ? 'الفئات الرئيسية' : 'Categories'}</span>
                  <span class="text-indigo-400">${categories.length}</span>
                </div>
                <div class="space-y-1">
                  ${categories.map(c => {
                    const catUrl = `${isArPage ? '/ar' : ''}/shop/?category=${encodeURIComponent(c.slug || c.id)}`;
                    const img = c.image || '/assets/images/products/placeholder.svg';
                    return `
                      <a href="${catUrl}" class="flex items-center justify-between p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition group">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <img src="${img}" class="w-8 h-8 object-cover rounded-lg border border-indigo-400/30 flex-shrink-0" onerror="this.src='/assets/images/products/placeholder.svg'" />
                          <div class="min-w-0">
                            <div class="text-xs font-bold text-white group-hover:text-indigo-300 transition truncate">${c.name || ''}</div>
                            <div class="text-[10px] text-slate-400 font-medium">${c.product_count || 0} products</div>
                          </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Category</span>
                      </a>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }

          // 2. Matching Subcategories Section
          if (subcategories.length > 0) {
            html += `
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 flex items-center justify-between">
                  <span>${isArPage ? 'الفئات الفرعية' : 'Subcategories'}</span>
                  <span class="text-indigo-400">${subcategories.length}</span>
                </div>
                <div class="space-y-1">
                  ${subcategories.map(s => {
                    const subUrl = `${isArPage ? '/ar' : ''}/shop/?category=${encodeURIComponent(s.category_slug || '')}&subcategory=${encodeURIComponent(s.slug || s.id)}`;
                    const colorDot = s.color || '#4063B2';
                    const img = s.image || '/assets/images/products/placeholder.svg';
                    return `
                      <a href="${subUrl}" class="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition group">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="relative w-8 h-8 rounded-lg overflow-hidden border border-purple-400/30 flex-shrink-0">
                            <img src="${img}" class="w-full h-full object-cover" onerror="this.src='/assets/images/products/placeholder.svg'" />
                            <span class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-white" style="background:${colorDot}"></span>
                          </div>
                          <div class="min-w-0">
                            <div class="text-xs font-bold text-white group-hover:text-purple-300 transition truncate">${s.name || ''}</div>
                            <div class="text-[10px] text-slate-400 truncate">in ${s.category_name || 'Category'} &bull; ${s.product_count || 0} items</div>
                          </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/30">Subcategory</span>
                      </a>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }

          // 3. Matching Products Section
          if (products.length > 0) {
            html += `
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 flex items-center justify-between">
                  <span>${isArPage ? 'المنتجات' : 'Products'}</span>
                  <span class="text-indigo-400">${data.totalProducts || products.length}</span>
                </div>
                <div class="space-y-1">
                  ${products.map(p => {
                    const prodUrl = `${isArPage ? '/ar' : ''}/product/?slug=${encodeURIComponent(p.slug || p.id)}`;
                    const price = Number(p.price || 0).toLocaleString();
                    const img = p.image || '/assets/images/products/placeholder.svg';
                    return `
                      <a href="${prodUrl}" class="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 transition group">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <img src="${img}" class="w-9 h-9 object-cover rounded-xl border border-slate-700/60 flex-shrink-0" onerror="this.src='/assets/images/products/placeholder.svg'" />
                          <div class="min-w-0">
                            <div class="text-xs font-bold text-white group-hover:text-indigo-400 transition truncate">${p.name || ''}</div>
                            <div class="text-[10px] text-slate-400 truncate">${p.brand || p.subcategory_name || p.category_name || 'Item'}</div>
                          </div>
                        </div>
                        <div class="text-right flex-shrink-0 pl-2">
                          <div class="text-xs font-black text-indigo-400 font-mono">${price} <span class="text-[9px] text-slate-400">QAR</span></div>
                        </div>
                      </a>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }

          html += `
            <div class="pt-2 text-center border-t border-slate-700/60 mt-2">
              <a href="${isArPage ? '/ar' : ''}/shop/?search=${encodeURIComponent(q)}" class="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition py-1">
                <span>${isArPage ? 'عرض جميع النتائج في الكتالوج' : `View all results for "${q}" in Shop`} &rarr;</span>
              </a>
            </div>
          </div>`;

          liveResultsContainer.innerHTML = html;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('Live search error:', err);
        }
      }, 250);
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
