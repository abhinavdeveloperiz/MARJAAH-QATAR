(function () {
  'use strict';

  window.AdminAuth = {
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

        window.AdminApp.token = data.token;
        window.AdminApp.user = data.user || null;
        localStorage.setItem('marjaah_admin_token', data.token);
        if (data.user) {
          localStorage.setItem('marjaah_admin_user', JSON.stringify(data.user));
        }
        try {
          localStorage.removeItem('marjaah_admin_dashboard_cache_v4');
          localStorage.removeItem('marjaah_admin_dashboard_cache');
          localStorage.removeItem('marjaah_cache_v2_admin_dashboard_cache');
          localStorage.removeItem('marjaah_cache_v2_admin_dashboard_cache_v3');
        } catch (_) {}
        if (window.api && typeof window.api.setToken === 'function') {
          window.api.setToken(data.token);
        }

        window.AdminApp.toast('Authentication successful. Welcome to Admin Portal.', 'success');
        this.hideLoginModal();
        await window.AdminApp.init();
      } catch (err) {
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
      window.AdminApp.token = '';
      window.AdminApp.user = null;
      window.AdminApp.role = null;
      localStorage.removeItem('marjaah_admin_token');
      localStorage.removeItem('marjaah_admin_user');
      localStorage.removeItem('marjaah_admin_role');
      try {
        localStorage.removeItem('marjaah_admin_dashboard_cache_v4');
        localStorage.removeItem('marjaah_admin_dashboard_cache');
        localStorage.removeItem('marjaah_cache_v2_admin_dashboard_cache');
        localStorage.removeItem('marjaah_cache_v2_admin_dashboard_cache_v3');
      } catch (_) {}
      if (window.AdminApp.refreshInterval) clearInterval(window.AdminApp.refreshInterval);
      if (notify) window.AdminApp.toast('Logged out successfully.', 'info');
      this.showLoginModal();
    },

    bindEvents() {
      const loginForm = document.getElementById('admin-login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const u = document.getElementById('admin-login-username').value.trim();
          const p = document.getElementById('admin-login-password').value;
          this.handleLogin(u, p);
        });
      }

      const toggleBtn = document.getElementById('admin-login-toggle-pw');
      if (toggleBtn) {
        toggleBtn.onclick = (e) => {
          e.preventDefault();
          if (typeof window.togglePasswordVisibility === 'function') {
            window.togglePasswordVisibility('admin-login-password', toggleBtn);
          }
        };
      }
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.AdminAuth.bindEvents();
    });
  } else {
    window.AdminAuth.bindEvents();
  }
})();

