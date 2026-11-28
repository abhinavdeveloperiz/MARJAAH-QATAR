(function () {
  'use strict';

  window.AdminApp = {
    token: localStorage.getItem('marjaah_admin_token') || '',
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem('marjaah_admin_user') || 'null');
      } catch (e) {
        return null;
      }
    })(),
    role: (() => {
      try {
        return JSON.parse(localStorage.getItem('marjaah_admin_role') || 'null');
      } catch (e) {
        return null;
      }
    })(),
    permissions: {},
    activeTab: 'dashboard',
    stats: {},
    refreshInterval: null,

    async api(url, options = {}) {
      const opts = { ...options };
      opts.headers = {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      };

      if (this.token) {
        opts.headers['Authorization'] = `Bearer ${this.token}`;
      }

      try {
        const res = await fetch(url, opts);

        if ((res.status === 502 || res.status === 503 || res.status === 504) && (opts._retryCount || 0) < 2) {
          await new Promise((r) => setTimeout(r, 1200));
          return this.api(url, { ...opts, _retryCount: (opts._retryCount || 0) + 1 });
        }

        if (res.status === 401) {
          if (!opts.skipAuthRedirect) {
            this.logout(false);
            if (window.AdminAuth) {
              window.AdminAuth.showLoginModal('Session expired. Please sign in again.');
            }
          }
          throw new Error('Unauthorized');
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
          throw new Error(msg || `Request failed (${res.status})`);
        }
        // Any successful write to products invalidates the cached product pages.
        const method = String(opts.method || 'GET').toUpperCase();
        if (method !== 'GET' && /^\/api\/(admin\/)?products/.test(url) && window.AdminProducts && window.AdminProducts._pageCache) {
          window.AdminProducts._pageCache.clear();
        }
        return data;
      } catch (err) {
        throw err;
      }
    },

    can(module, action = 'view') {
      if (!this.user) return false;
      if (
        this.user.is_superuser ||
        this.user.role === 'super_admin' ||
        this.user.role === 'admin' ||
        (Array.isArray(this.user.role_ids) && this.user.role_ids.includes('super_admin'))
      ) {
        return true;
      }
      if (!this.role || !this.role.permissions) return false;
      const modPerms = this.role.permissions[module];
      if (!modPerms) return false;
      if (Array.isArray(modPerms)) {
        return modPerms.includes(action) || modPerms.includes('manage') || modPerms.includes('*');
      }
      if (typeof modPerms === 'object') {
        return Boolean(modPerms[action] || modPerms['manage'] || modPerms['*']);
      }
      return false;
    },

    async init() {
      this.bindGlobalEvents();
      this.renderStaffProfile();

      if (!this.token) {
        if (window.AdminAuth) window.AdminAuth.showLoginModal();
        return;
      }

      try {
        await this.loadCurrentStaff();
        if (window.AdminAuth) window.AdminAuth.hideLoginModal();
        this.updatePendingBadges();
        this.navigateTo(this.getInitialTab());

        setTimeout(() => {
          if (window.SmartCache && window.SmartCache.getProducts().length === 0) {
            window.AdminOrders?.preloadCatalogProducts();
          }
        }, 500);

        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => this.updatePendingBadges(), 60000);
      } catch (err) {
        if (!this.user) {
          this.logout(false);
          if (window.AdminAuth) {
            window.AdminAuth.showLoginModal('Please sign in to access the Admin Panel.');
          }
        } else {
          if (window.AdminAuth) window.AdminAuth.hideLoginModal();
          this.navigateTo(this.getInitialTab());
        }
      }
    },

    getFirstPermittedTab() {
      const candidates = [
        { tab: 'dashboard', mod: 'dashboard' },
        { tab: 'products', mod: 'products' },
        { tab: 'categories', mod: 'categories' },
        { tab: 'orders', mod: 'orders' },
        { tab: 'returns-cancellations', mod: 'orders' },
        { tab: 'customers', mod: 'customers' },
        { tab: 'approvals', mod: 'approvals' },
        { tab: 'banners', mod: 'banners' },
        { tab: 'promotions', mod: 'website_content' },
        { tab: 'locations', mod: 'store_locations' },
        { tab: 'users', mod: 'admin_users' },
        { tab: 'roles', mod: 'roles_permissions' },
        { tab: 'settings', mod: 'settings' },
        { tab: 'audit', mod: 'audit_logs' },
      ];

      for (const c of candidates) {
        if (this.can(c.mod, 'view')) {
          return c.tab;
        }
      }
      return null;
    },

    getInitialTab() {
      const hash = window.location.hash.replace('#', '').trim();
      const permMap = {
        'dashboard': 'dashboard',
        'products': 'products',
        'categories': 'categories',
        'orders': 'orders',
        'returns-cancellations': 'orders',
        'customers': 'customers',
        'approvals': 'approvals',
        'locations': 'store_locations',
        'banners': 'banners',
        'promotions': 'website_content',
        'users': 'admin_users',
        'roles': 'roles_permissions',
        'audit': 'audit_logs',
        'settings': 'settings',
      };
      if (hash && permMap[hash] && this.can(permMap[hash], 'view')) {
        return hash;
      }
      return this.getFirstPermittedTab() || 'unauthorized';
    },

    async loadCurrentStaff() {
      let data = null;
      try {
        data = await this.api('/api/admin/me', { skipAuthRedirect: true });
      } catch (err) {
        try {
          data = await this.api('/api/auth/me', { skipAuthRedirect: true });
        } catch (e2) {
          if (this.user) {
            data = { user: this.user };
          } else {
            this.logout(false);
            if (window.AdminAuth) {
              window.AdminAuth.showLoginModal('Session expired. Please sign in again.');
            }
            throw err;
          }
        }
      }

      this.user = data.user || data;
      localStorage.setItem('marjaah_admin_user', JSON.stringify(this.user));
      this.role = data.role || (this.user.is_superuser || this.user.role === 'admin' || this.user.role === 'super_admin' ? {
        id: 'super_admin',
        name: 'Super Administrator',
        permissions: {},
      } : null);
      if (this.role) {
        localStorage.setItem('marjaah_admin_role', JSON.stringify(this.role));
      }

      this.renderStaffProfile();
    },

    renderStaffProfile() {
      if (!this.user) return;
      const nameEl = document.getElementById('admin-staff-name');
      const roleEl = document.getElementById('admin-staff-role');
      const avatarEl = document.getElementById('admin-staff-avatar');

      const displayName = this.user.name || this.user.username || 'Staff User';
      const roleName = this.role?.name || (this.user.is_superuser ? 'Super Administrator' : 'Staff');

      if (nameEl) nameEl.textContent = displayName;
      if (roleEl) roleEl.textContent = roleName;
      if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

      const topName = document.getElementById('topbar-staff-name');
      const topRole = document.getElementById('topbar-staff-role');
      if (topName) topName.textContent = displayName;
      if (topRole) topRole.textContent = roleName;

      document.querySelectorAll('[data-admin-module]').forEach((item) => {
        const mod = item.getAttribute('data-admin-module');
        const canView = this.can(mod, 'view');
        item.classList.toggle('hidden', !canView);
        if (!canView) {
          item.style.setProperty('display', 'none', 'important');
        } else {
          item.style.removeProperty('display');
        }
      });

      document.querySelectorAll('[data-admin-group]').forEach((group) => {
        const items = group.querySelectorAll('[data-admin-module]');
        const hasVisible = Array.from(items).some((item) => {
          return !item.classList.contains('hidden') && item.style.display !== 'none';
        });
        group.classList.toggle('hidden', !hasVisible);
        if (!hasVisible) {
          group.style.setProperty('display', 'none', 'important');
        } else {
          group.style.removeProperty('display');
        }
      });

      const btnNewOrder = document.getElementById('topbar-btn-new-order');
      if (btnNewOrder) {
        btnNewOrder.style.display = this.can('orders', 'create') ? '' : 'none';
      }
      const btnNewProduct = document.getElementById('topbar-btn-new-product');
      if (btnNewProduct) {
        btnNewProduct.style.display = this.can('products', 'create') ? '' : 'none';
      }
      const bell = document.getElementById('topbar-notification-bell');
      if (bell) {
        bell.style.display = this.can('approvals', 'view') ? '' : 'none';
      }

      if (!this.can('dashboard', 'view')) {
        try {
          localStorage.removeItem('marjaah_admin_dashboard_cache_v4');
          localStorage.removeItem('marjaah_admin_dashboard_cache');
          localStorage.removeItem('marjaah_cache_v2_admin_dashboard_cache');
          localStorage.removeItem('marjaah_cache_v2_admin_dashboard_cache_v3');
        } catch (_) {}
      }
    },

    showNoPermissionsView() {
      this.activeTab = 'unauthorized';
      window.location.hash = 'unauthorized';
      document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
        item.classList.remove('active');
        item.classList.add('text-slate-600');
      });
      document.querySelectorAll('.admin-tab-pane').forEach((pane) => {
        pane.classList.add('hidden');
      });
      const unauthPane = document.getElementById('pane-unauthorized');
      if (unauthPane) {
        unauthPane.classList.remove('hidden');
      }
      const bc = document.getElementById('admin-breadcrumb-current');
      if (bc) bc.textContent = 'Access Restricted';
    },

    navigateTo(tabName) {
      if (tabName === 'unauthorized') {
        this.showNoPermissionsView();
        return;
      }

      const permMap = {
        'dashboard': 'dashboard',
        'products': 'products',
        'categories': 'categories',
        'orders': 'orders',
        'returns-cancellations': 'orders',
        'customers': 'customers',
        'approvals': 'approvals',
        'locations': 'store_locations',
        'banners': 'banners',
        'promotions': 'website_content',
        'users': 'admin_users',
        'roles': 'roles_permissions',
        'audit': 'audit_logs',
        'settings': 'settings',
      };
      const permModule = permMap[tabName] || tabName;
      if (!this.can(permModule, 'view')) {
        this.toast('You do not have permission to view this section.', 'error');
        const fallback = this.getFirstPermittedTab();
        if (fallback && fallback !== tabName) {
          this.navigateTo(fallback);
        } else if (!fallback) {
          this.showNoPermissionsView();
        }
        return;
      }

      this.activeTab = tabName;
      window.location.hash = tabName;

      document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
        const itemTab = item.getAttribute('data-tab');
        if (itemTab === tabName) {
          item.classList.add('active');
          item.classList.remove('text-slate-600');
        } else {
          item.classList.remove('active');
          item.classList.add('text-slate-600');
        }
      });

      document.querySelectorAll('.admin-tab-pane').forEach((pane) => {
        pane.classList.add('hidden');
      });
      const activePane = document.getElementById(`pane-${tabName}`);
      if (activePane) {
        activePane.classList.remove('hidden');
      }

      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;

      const bc = document.getElementById('admin-breadcrumb-current');
      if (bc) {
        bc.textContent = this.formatTabTitle(tabName);
      }

      this.closeMobileSidebar();

      switch (tabName) {
        case 'dashboard':
          if (window.AdminDashboard) window.AdminDashboard.load();
          break;
        case 'products':
          if (window.AdminProducts) window.AdminProducts.load();
          break;
        case 'orders':
          if (window.AdminOrders) window.AdminOrders.load();
          break;
        case 'returns-cancellations':
          if (window.AdminReturns) window.AdminReturns.load();
          break;
        case 'customers':
          if (window.AdminCustomers) window.AdminCustomers.load();
          break;
        case 'approvals':
          if (window.AdminApprovals) window.AdminApprovals.load();
          break;
        case 'categories':
          if (window.AdminCategories) window.AdminCategories.load();
          break;
        case 'users':
          if (window.AdminUsers) window.AdminUsers.load();
          break;
        case 'roles':
          if (window.AdminRoles) window.AdminRoles.load();
          break;
        case 'banners':
          if (window.AdminContent) window.AdminContent.loadBanners();
          break;
        case 'promotions':
          if (window.AdminContent) window.AdminContent.loadPromotions();
          break;
        case 'locations':
          if (window.AdminContent) window.AdminContent.loadLocations();
          break;
        case 'settings':
          if (window.AdminContent) window.AdminContent.loadSettings();
          break;
        case 'audit':
          if (window.AdminAudit) window.AdminAudit.load();
          break;
      }
    },

    formatTabTitle(tab) {
      const map = {
        dashboard: 'Executive Overview',
        products: 'Products Catalog',
        orders: 'Orders & Fulfillment',
        'returns-cancellations': 'Returns & Cancellations Hub',
        customers: 'Customer Analytics & Directory',
        approvals: 'Approval Workflows',
        categories: 'Categories & Brands',
        users: 'Staff Management',
        roles: 'IAM Roles & Permissions',
        banners: 'Hero Banners',
        promotions: 'Promotional Sections',
        locations: 'Store Pickup Locations',
        settings: 'Store Settings (CR & Info)',
        audit: 'Immutable Audit Trail',
      };
      return map[tab] || (tab.charAt(0).toUpperCase() + tab.slice(1));
    },

    async updatePendingBadges() {
      try {
        const canApprovals = this.can('approvals', 'view');
        const canOrders = this.can('orders', 'view');
        const canCustomers = this.can('customers', 'view');

        const [approvalsRes, ordersRes, custRes, returnsRes] = await Promise.allSettled([
          canApprovals ? this.api('/api/admin/approvals?status=pending', { skipAuthRedirect: true }) : Promise.resolve(null),
          canOrders ? this.api('/api/orders?status=placed', { skipAuthRedirect: true }) : Promise.resolve(null),
          canCustomers ? this.api('/api/admin/customers/analytics', { skipAuthRedirect: true }) : Promise.resolve(null),
          canOrders ? this.api('/api/orders/admin/returns-and-cancellations?type=return_pending', { skipAuthRedirect: true }) : Promise.resolve(null),
        ]);

        if (canApprovals && approvalsRes.status === 'fulfilled' && approvalsRes.value) {
          const count = approvalsRes.value.total || (approvalsRes.value.items ? approvalsRes.value.items.length : 0);
          const badge = document.getElementById('badge-pending-approvals');
          const topBadge = document.getElementById('topbar-pending-badge');
          if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
          }
          if (topBadge) {
            topBadge.textContent = count;
            topBadge.style.display = count > 0 ? 'inline-flex' : 'none';
          }
        }

        if (canOrders && ordersRes.status === 'fulfilled' && ordersRes.value) {
          const count = ordersRes.value.total || (ordersRes.value.items ? ordersRes.value.items.length : 0);
          const badge = document.getElementById('badge-pending-orders');
          if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
          }
        }

        if (canCustomers && custRes.status === 'fulfilled' && custRes.value) {
          const onlineCount = custRes.value.online_customers || 0;
          const badge = document.getElementById('badge-online-customers');
          if (badge) {
            badge.textContent = `${onlineCount} Online`;
            badge.style.display = onlineCount > 0 ? 'inline-flex' : 'none';
          }
        }

        if (canOrders && returnsRes.status === 'fulfilled' && returnsRes.value) {
          const items = Array.isArray(returnsRes.value) ? returnsRes.value : (returnsRes.value?.items || []);
          const pendingCount = items.filter(it => it.type === 'return' && it.return_status === 'pending').length;
          const badge = document.getElementById('badge-pending-returns');
          if (badge) {
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
          }
        }
      } catch (e) {}
    },

    showLoginModal(msg = '') {
      if (window.AdminAuth) window.AdminAuth.showLoginModal(msg);
    },

    hideLoginModal() {
      if (window.AdminAuth) window.AdminAuth.hideLoginModal();
    },

    logout(notify = true) {
      try {
        localStorage.removeItem('marjaah_admin_dashboard_cache_v4');
        localStorage.removeItem('marjaah_admin_dashboard_cache');
        localStorage.removeItem('marjaah_cache_v2_admin_dashboard_cache');
        localStorage.removeItem('marjaah_cache_v2_admin_dashboard_cache_v3');
      } catch (_) {}

      if (window.AdminAuth) {
        window.AdminAuth.logout(notify);
      } else {
        this.token = '';
        this.user = null;
        this.role = null;
        localStorage.removeItem('marjaah_admin_token');
        localStorage.removeItem('marjaah_admin_user');
        localStorage.removeItem('marjaah_admin_role');
        if (this.refreshInterval) clearInterval(this.refreshInterval);
      }
    },

    toggleSidebar() {
      const sidebar = document.getElementById('admin-sidebar');
      const overlay = document.getElementById('admin-sidebar-overlay');
      if (!sidebar) return;

      const isClosed = sidebar.classList.contains('-translate-x-full');
      if (isClosed) {
        sidebar.classList.remove('-translate-x-full');
        if (overlay) overlay.classList.remove('hidden');
      } else {
        sidebar.classList.add('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
      }
    },

    closeMobileSidebar() {
      const sidebar = document.getElementById('admin-sidebar');
      const overlay = document.getElementById('admin-sidebar-overlay');
      if (sidebar && window.innerWidth < 1024) {
        sidebar.classList.add('-translate-x-full');
      }
      if (overlay) overlay.classList.add('hidden');
    },

    toast(message, type = 'info') {
      const container = document.getElementById('admin-toast-container');
      if (!container) {
        alert(message);
        return;
      }

      const colors = {
        success: 'bg-emerald-500/90 border-emerald-400 text-white',
        error: 'bg-rose-500/90 border-rose-400 text-white',
        warning: 'bg-amber-500/90 border-amber-400 text-slate-900 font-bold',
        info: 'bg-indigo-600/90 border-indigo-400 text-white',
      };

      const icons = {
        success: '✓',
        error: '✕',
        warning: '!',
        info: 'ℹ',
      };

      const toast = document.createElement('div');
      toast.className = `flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md text-xs font-semibold transform transition-all duration-300 translate-y-2 opacity-0 ${colors[type] || colors.info}`;
      toast.innerHTML = `
        <span class="w-5 h-5 rounded-full flex items-center justify-center bg-black/20 text-xs font-black flex-shrink-0">${icons[type]}</span>
        <span class="flex-1">${message}</span>
      `;

      container.appendChild(toast);
      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      });

      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-8');
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    },

    bindGlobalEvents() {
      if (this._eventsBound) return;
      this._eventsBound = true;

      window.addEventListener('hashchange', () => {
        const tab = window.location.hash.replace('#', '').trim();
        if (tab && tab !== this.activeTab) {
          this.navigateTo(tab);
        }
      });

      document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const tab = item.getAttribute('data-tab');
          if (tab) this.navigateTo(tab);
        });
      });

      const btnNewProduct = document.getElementById('topbar-btn-new-product');
      if (btnNewProduct) {
        btnNewProduct.addEventListener('click', () => {
          this.navigateTo('products');
          if (window.AdminProducts && typeof window.AdminProducts.openModal === 'function') {
            window.AdminProducts.openModal();
          }
        });
      }

      const btnNewOrder = document.getElementById('topbar-btn-new-order');
      if (btnNewOrder) {
        btnNewOrder.addEventListener('click', () => {
          this.navigateTo('orders');
          if (window.AdminOrders && typeof window.AdminOrders.openCreateOrderModal === 'function') {
            window.AdminOrders.openCreateOrderModal();
          }
        });
      }

      const setupPasswordToggle = (btnId, inputId) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;

        btn.onclick = (e) => {
          e.preventDefault();
          window.togglePasswordVisibility(input, btn);
        };
      };

      setupPasswordToggle('admin-login-toggle-pw', 'admin-login-password');
      setupPasswordToggle('user-modal-toggle-pw', 'user-modal-password');

      document.querySelectorAll('[data-admin-action="logout"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (confirm('Are you sure you want to sign out of the Admin Portal?')) {
            this.logout();
          }
        });
      });

      const toggleBtn = document.getElementById('sidebar-toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.toggleSidebar());
      }
      const overlay = document.getElementById('admin-sidebar-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => this.closeMobileSidebar());
      }

      const bell = document.getElementById('topbar-notification-bell');
      if (bell) {
        bell.addEventListener('click', () => {
          this.navigateTo('approvals');
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const lb = document.getElementById('image-lightbox-modal');
          if (lb && !lb.classList.contains('hidden')) {
            window.closeImageLightbox();
          }
        }
      });
    },
  };

  window.openImageLightbox = function (src, title = 'Product Image Preview', sku = '') {
    const modal = document.getElementById('image-lightbox-modal');
    const img = document.getElementById('image-lightbox-img');
    const titleEl = document.getElementById('image-lightbox-title');
    const skuEl = document.getElementById('image-lightbox-sku');
    const downloadLink = document.getElementById('image-lightbox-download');
    if (!modal || !img) return;

    const validSrc = src || '/assets/images/products/placeholder.svg';
    img.src = validSrc;
    if (titleEl) titleEl.textContent = title || 'Product Image Preview';
    if (skuEl) {
      skuEl.textContent = sku ? `SKU: ${sku}` : '';
      skuEl.style.display = sku ? 'inline-block' : 'none';
    }
    if (downloadLink) {
      downloadLink.href = validSrc;
    }

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      modal.classList.add('opacity-100');
    });
  };

  window.closeImageLightbox = function (e) {
    if (e && e.target && e.target.closest('#image-lightbox-modal > div')) {
      return;
    }
    const modal = document.getElementById('image-lightbox-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
      const img = document.getElementById('image-lightbox-img');
      if (img) img.src = '';
    }, 200);
  };

  window.togglePasswordVisibility = window.togglePasswordVisibility || function (inputId, btn) {
    const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
    const toggleBtn = btn || (input ? input.parentElement?.querySelector('button') : null);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      toggleBtn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
      toggleBtn.innerHTML = isPassword
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.88 9.88 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
    try {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    } catch (_) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.AdminApp.init();
    });
  } else {
    window.AdminApp.init();
  }
})();

