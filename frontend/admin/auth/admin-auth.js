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

    openChangePassword() {
      const modal = document.getElementById('change-pw-modal');
      const form = document.getElementById('change-pw-form');
      if (!modal) return;
      if (form) form.reset();
      this._cpwError('');
      this._cpwStrength('');
      modal.classList.remove('hidden');
      setTimeout(() => document.getElementById('cpw-current')?.focus(), 30);
    },

    closeChangePassword() {
      document.getElementById('change-pw-modal')?.classList.add('hidden');
      document.getElementById('change-pw-form')?.reset();
    },

    _cpwError(msg) {
      const el = document.getElementById('change-pw-error');
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    },

    _cpwStrength(pw) {
      const bar = document.getElementById('cpw-strength-bar');
      const label = document.getElementById('cpw-strength-label');
      if (!bar || !label) return;
      let score = 0;
      if (pw.length >= 8) score++;
      if (pw.length >= 12) score++;
      if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
      if (/\d/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;
      const levels = [
        ['0%', '#e2e8f0', 'At least 8 characters, with a letter and a number.'],
        ['25%', '#ef4444', 'Weak'],
        ['50%', '#f59e0b', 'Fair'],
        ['75%', '#84cc16', 'Good'],
        ['100%', '#22c55e', 'Strong'],
      ];
      const lv = !pw ? 0 : Math.min(4, Math.max(1, score - (score > 4 ? 1 : 0)));
      bar.style.width = levels[lv][0];
      bar.style.background = levels[lv][1];
      label.textContent = levels[lv][2];
    },

    async submitChangePassword(e) {
      e.preventDefault();
      const cur = document.getElementById('cpw-current').value;
      const next = document.getElementById('cpw-new').value;
      const conf = document.getElementById('cpw-confirm').value;
      const btn = document.getElementById('change-pw-submit');

      if (!cur || !next || !conf) return this._cpwError('Please fill in all fields.');
      if (next.length < 8) return this._cpwError('New password must be at least 8 characters.');
      if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return this._cpwError('New password needs at least one letter and one number.');
      if (next === cur) return this._cpwError('New password must be different from the current one.');
      if (next !== conf) return this._cpwError('New password and confirmation do not match.');

      this._cpwError('');
      btn.disabled = true;
      btn.textContent = 'Updating...';
      try {
        const data = await window.AdminApp.api('/api/auth/admin/change-password', {
          method: 'POST',
          skipAuthRedirect: true,
          body: JSON.stringify({ current_password: cur, new_password: next }),
        });
        if (data.token) {
          window.AdminApp.token = data.token;
          localStorage.setItem('marjaah_admin_token', data.token);
          if (window.api && typeof window.api.setToken === 'function') window.api.setToken(data.token);
        }
        this.closeChangePassword();
        window.AdminApp.toast('Password changed. Other sessions were signed out.', 'success');
      } catch (err) {
        this._cpwError(err.message === 'Unauthorized' ? 'Current password is incorrect or your session expired.' : (err.message || 'Could not change password.'));
      } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    },

    bindEvents() {
      const cpwForm = document.getElementById('change-pw-form');
      if (cpwForm) {
        cpwForm.addEventListener('submit', (e) => this.submitChangePassword(e));
        document.getElementById('cpw-new')?.addEventListener('input', (e) => this._cpwStrength(e.target.value));
        document.querySelectorAll('[data-cpw-toggle]').forEach((b) => {
          b.addEventListener('click', () => {
            const input = document.getElementById(b.getAttribute('data-cpw-toggle'));
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            b.textContent = show ? 'Hide' : 'Show';
          });
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') this.closeChangePassword();
        });
      }

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

