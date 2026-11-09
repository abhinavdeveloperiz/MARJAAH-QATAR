/**
 * MARJAAH QATAR — Enterprise Admin Panel Core Controller
 * Handles authentication, routing, RBAC authorization, and module dispatching.
 */

(function () {
  'use strict';

  // Global Admin Application State
  window.AdminApp = {
    token: localStorage.getItem('marjaah_admin_token') || '',
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem('marjaah_admin_user') || 'null');
      } catch (e) {
        return null;
      }
    })(),
    role: null,
    permissions: {},
    activeTab: 'dashboard',
    stats: {},
    refreshInterval: null,

    // ── 1. API HELPER WITH AUTOMATIC AUTH HEADER & ERROR HANDLING ──
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
        
        // Auto-retry transient gateway/proxy errors (502, 503, 504)
        if ((res.status === 502 || res.status === 503 || res.status === 504) && (opts._retryCount || 0) < 2) {
          console.warn(`[AdminApp] Received ${res.status} on ${url}. Retrying in 1.2s...`);
          await new Promise((r) => setTimeout(r, 1200));
          return this.api(url, { ...opts, _retryCount: (opts._retryCount || 0) + 1 });
        }

        if (res.status === 401) {
          if (!opts.skipAuthRedirect) {
            console.warn('[AdminApp] Unauthorized 401 received. Redirecting to login.');
            this.logout(false);
            this.showLoginModal('Session expired. Please sign in again.');
          }
          throw new Error('Unauthorized');
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || `Request failed (${res.status})`);
        }
        return data;
      } catch (err) {
        console.error(`[AdminApp API Error] ${url}:`, err);
        throw err;
      }
    },

    // ── 2. PERMISSION CHECK (IAM RBAC) ──
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
      return Boolean(modPerms[action] || modPerms['manage']);
    },

    // ── 3. INITIALIZATION ──
    async init() {
      this.bindGlobalEvents();

      if (!this.token) {
        this.showLoginModal();
        return;
      }

      try {
        await this.loadCurrentStaff();
        this.hideLoginModal();
        this.updatePendingBadges();
        this.navigateTo(this.getInitialTab());

        // Refresh badges every 60 seconds
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => this.updatePendingBadges(), 60000);
      } catch (err) {
        console.error('[AdminApp] Auth validation failed:', err);
        if (!this.user) {
          this.logout(false);
          this.showLoginModal('Please sign in to access the Admin Panel.');
        } else {
          this.hideLoginModal();
          this.navigateTo(this.getInitialTab());
        }
      }
    },

    getInitialTab() {
      const hash = window.location.hash.replace('#', '').trim();
      return hash || 'dashboard';
    },

    // ── 4. LOAD CURRENT USER & ROLE ──
    async loadCurrentStaff() {
      let data = null;
      try {
        data = await this.api('/api/admin/me', { skipAuthRedirect: true });
      } catch (err) {
        console.warn('[AdminApp] /api/admin/me unavailable, falling back to /api/auth/me:', err);
        try {
          data = await this.api('/api/auth/me', { skipAuthRedirect: true });
        } catch (e2) {
          if (this.user) {
            console.log('[AdminApp] Using cached user session:', this.user);
            data = { user: this.user };
          } else {
            this.logout(false);
            this.showLoginModal('Session expired. Please sign in again.');
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

      // Top bar user badge
      const topName = document.getElementById('topbar-staff-name');
      const topRole = document.getElementById('topbar-staff-role');
      if (topName) topName.textContent = displayName;
      if (topRole) topRole.textContent = roleName;

      // Filter sidebar links based on module permissions
      document.querySelectorAll('[data-admin-module]').forEach((item) => {
        const mod = item.getAttribute('data-admin-module');
        if (!this.can(mod, 'view')) {
          item.style.display = 'none';
        } else {
          item.style.display = '';
        }
      });
    },

    // ── 5. NAVIGATION / TAB DISPATCHER ──
    navigateTo(tabName) {
      const permModule = tabName === 'returns-cancellations' ? 'orders' : tabName;
      if (!this.can(permModule, 'view') && tabName !== 'dashboard') {
        this.toast('You do not have permission to view this section.', 'error');
        return;
      }

      this.activeTab = tabName;
      window.location.hash = tabName;

      // Update sidebar active highlights
      document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
        const itemTab = item.getAttribute('data-tab');
        if (itemTab === tabName) {
          item.classList.add('active', 'bg-indigo-600/20', 'text-white', 'border-indigo-500');
          item.classList.remove('text-slate-400', 'border-transparent');
        } else {
          item.classList.remove('active', 'bg-indigo-600/20', 'text-white', 'border-indigo-500');
          item.classList.add('text-slate-400', 'border-transparent');
        }
      });

      // Update view panels
      document.querySelectorAll('.admin-tab-pane').forEach((pane) => {
        pane.classList.add('hidden');
      });
      const activePane = document.getElementById(`pane-${tabName}`);
      if (activePane) {
        activePane.classList.remove('hidden');
      }

      // Reset scroll position to top of workspace
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;

      // Update Breadcrumb
      const bc = document.getElementById('admin-breadcrumb-current');
      if (bc) {
        bc.textContent = this.formatTabTitle(tabName);
      }

      // Close mobile sidebar if open
      this.closeMobileSidebar();

      // Dispatch module loaders
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

    // ── 6. PENDING COUNTERS & NOTIFICATION BADGES ──
    async updatePendingBadges() {
      try {
        const [approvalsRes, ordersRes, custRes, returnsRes] = await Promise.allSettled([
          this.api('/api/admin/approvals?status=pending'),
          this.api('/api/orders?status=placed'),
          this.api('/api/admin/customers/analytics'),
          this.api('/api/orders/admin/returns-and-cancellations?type=return_pending'),
        ]);

        if (approvalsRes.status === 'fulfilled') {
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

        if (ordersRes.status === 'fulfilled') {
          const count = ordersRes.value.total || (ordersRes.value.items ? ordersRes.value.items.length : 0);
          const badge = document.getElementById('badge-pending-orders');
          if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
          }
        }

        if (custRes.status === 'fulfilled') {
          const onlineCount = custRes.value.online_customers || 0;
          const badge = document.getElementById('badge-online-customers');
          if (badge) {
            badge.textContent = `${onlineCount} Online`;
            badge.style.display = onlineCount > 0 ? 'inline-flex' : 'none';
          }
        }

        if (returnsRes.status === 'fulfilled') {
          const items = Array.isArray(returnsRes.value) ? returnsRes.value : (returnsRes.value?.items || []);
          const pendingCount = items.filter(it => it.type === 'return' && it.return_status === 'pending').length;
          const badge = document.getElementById('badge-pending-returns');
          if (badge) {
            badge.textContent = pendingCount;
            badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
          }
        }
      } catch (e) {
        console.warn('Failed to update pending badges:', e);
      }
    },

    // ── 7. LOGIN & LOGOUT ──
    showLoginModal(msg = '') {
      const modal = document.getElementById('admin-login-modal');
      const errEl = document.getElementById('admin-login-error');
      if (modal) modal.classList.remove('hidden');
      if (errEl) {
        errEl.textContent = msg;
        errEl.classList.toggle('hidden', !msg);
      }
    },

    hideLoginModal() {
      const modal = document.getElementById('admin-login-modal');
      if (modal) modal.classList.add('hidden');
    },

    async handleLogin(username, password) {
      const errEl = document.getElementById('admin-login-error');
      const submitBtn = document.getElementById('admin-login-submit-btn');

      if (errEl) errEl.classList.add('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Verifying credentials...';
      }

      try {
        const res = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Invalid credentials');
        }

        this.token = data.token;
        this.user = data.user || null;
        localStorage.setItem('marjaah_admin_token', this.token);
        if (this.user) {
          localStorage.setItem('marjaah_admin_user', JSON.stringify(this.user));
        }
        if (window.api && typeof window.api.setToken === 'function') {
          window.api.setToken(this.token);
        }

        this.toast('Authentication successful. Welcome to Admin Portal.', 'success');
        this.hideLoginModal();
        await this.init();
      } catch (err) {
        console.error('Admin login error:', err);
        if (errEl) {
          errEl.textContent = err.message || 'Login failed. Please verify credentials.';
          errEl.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Sign In to Management';
        }
      }
    },

    logout(notify = true) {
      this.token = '';
      this.user = null;
      this.role = null;
      localStorage.removeItem('marjaah_admin_token');
      localStorage.removeItem('marjaah_admin_user');
      if (this.refreshInterval) clearInterval(this.refreshInterval);
      if (notify) this.toast('Logged out successfully.', 'info');
      this.showLoginModal();
    },

    // ── 8. RESPONSIVE SIDEBAR TOGGLE ──
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

    // ── 9. TOAST NOTIFICATIONS ──
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

    // ── 10. GLOBAL EVENT BINDING ──
    bindGlobalEvents() {
      // Sidebar tab links
      document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const tab = item.getAttribute('data-tab');
          if (tab) this.navigateTo(tab);
        });
      });

      // Quick action button (+ New Product, + New Order)
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

      // Login form submit
      const loginForm = document.getElementById('admin-login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const u = document.getElementById('admin-login-username').value.trim();
          const p = document.getElementById('admin-login-password').value;
          this.handleLogin(u, p);
        });
      }

      // Password visibility toggles (Eye icon toggle)
      const setupPasswordToggle = (btnId, inputId) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.innerHTML = isPassword
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.88 9.88 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
        });
      };

      setupPasswordToggle('admin-login-toggle-pw', 'admin-login-password');
      setupPasswordToggle('user-modal-toggle-pw', 'user-modal-password');

      // Logout buttons
      document.querySelectorAll('[data-admin-action="logout"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (confirm('Are you sure you want to sign out of the Admin Portal?')) {
            this.logout();
          }
        });
      });

      // Sidebar collapse toggle
      const toggleBtn = document.getElementById('sidebar-toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.toggleSidebar());
      }
      const overlay = document.getElementById('admin-sidebar-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => this.closeMobileSidebar());
      }

      // Notification bell
      const bell = document.getElementById('topbar-notification-bell');
      if (bell) {
        bell.addEventListener('click', () => {
          this.navigateTo('approvals');
        });
      }
    },
  };

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.AdminApp.init();
  });
})();

