(function () {
  'use strict';

  window.AdminUsers = {
    users: [],
    roles: [],
    selectedUserId: null,
    searchDebounceTimer: null,
    lastCreatedCredentials: null,

    onSearchInput() {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.renderTable();
      }, 250);
    },

    async load() {
      const container = document.getElementById('users-table-body');
      if (container) {
        container.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-slate-400">Loading admin staff...</td></tr>`;
      }

      try {
        const [usersData, rolesData] = await Promise.all([
          window.AdminApp.api('/api/admin/users'),
          window.AdminApp.api('/api/admin/roles'),
        ]);

        this.users = usersData.users || usersData.items || usersData || [];
        this.roles = rolesData.roles || rolesData.items || rolesData || [];
        this.renderTable();
        this.populateRoleDropdowns();
      } catch (err) {
        if (container) {
          container.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-xs text-rose-400">Failed to load admin users.</td></tr>`;
        }
      }
    },

    populateRoleDropdowns() {
      const roleSelects = document.querySelectorAll('.role-select-input');
      roleSelects.forEach((sel) => {
        sel.innerHTML = `
          <option value="">Select a role...</option>
          ${this.roles.map((r) => `<option value="${r.slug || r.id}">${r.name}</option>`).join('')}
        `;
      });
    },

    renderTable() {
      const container = document.getElementById('users-table-body');
      if (!container) return;

      const q = (document.getElementById('users-search-input')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('users-status-filter')?.value || 'all';

      let filtered = this.users.filter((u) => {
        if (statusFilter !== 'all' && (u.status || 'active') !== statusFilter) return false;
        if (q) {
          const hay = `${u.username || ''} ${u.name || ''} ${u.email || ''} ${u.phone || ''}`.toLowerCase();
          return hay.includes(q);
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-400">No admin staff accounts found.</td></tr>`;
        return;
      }

      container.innerHTML = filtered.map((u) => {
        const isSuper = Boolean(u.is_superuser || (Array.isArray(u.role_ids) && u.role_ids.includes('super_admin')));
        const status = u.status || 'active';
        const roleNames = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles.join(', ') : (u.role || 'Staff');
        const lastLogin = u.last_login_at || u.last_login ? new Date(u.last_login_at || u.last_login).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never';

        const statusBadge = {
          active: '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Active</span>',
          inactive: '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Inactive</span>',
          deactivated: '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Deactivated</span>',
          suspended: '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Suspended</span>',
        }[status] || `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">${status}</span>`;

        return `
          <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors">
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-xs flex-shrink-0">
                  ${(u.name || u.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div class="font-bold text-slate-900 text-xs">${u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}</div>
                  <div class="text-[11px] text-slate-400 font-mono">${u.username}</div>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-xs text-slate-600 font-mono">${u.email || '—'}</td>
            <td class="py-3 px-4">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md ${isSuper ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-primary/10 text-primary border border-primary/20'}">
                ${roleNames}
              </span>
            </td>
            <td class="py-3 px-4">${statusBadge}</td>
            <td class="py-3 px-4 text-xs text-slate-400 font-mono">${lastLogin}</td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" onclick="AdminUsers.openEditModal('${u.id}')" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-primary hover:text-primary-hover transition cursor-pointer" title="Edit Staff Details">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                <button type="button" onclick="AdminUsers.openResetPasswordModal('${u.id}', '${u.username}')" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-amber-600 hover:text-amber-700 transition cursor-pointer" title="Reset Password">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L4 19l-2 3 3-2 13.5-13.5z"/><circle cx="16" cy="8" r="2"/></svg>
                </button>
                <button type="button" onclick="AdminUsers.toggleStatus('${u.id}', '${status}')" class="p-1.5 rounded-lg border border-slate-200 ${status === 'active' ? 'hover:bg-rose-50 text-slate-500 hover:text-rose-600' : 'hover:bg-emerald-50 text-emerald-600'} transition cursor-pointer" title="${status === 'active' ? 'Suspend Account' : 'Activate Account'}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                </button>
                <button type="button" onclick="AdminUsers.revokeSessions('${u.id}', '${u.username}')" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer" title="Revoke Active Sessions">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </button>
                ${u.username !== 'admin' ? `
                  <button type="button" onclick="AdminUsers.deleteUser('${u.id}', '${u.username}')" class="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-500 transition cursor-pointer" title="Delete User">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    generateSecurePassword(length = 12) {
      const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const lower = 'abcdefghijkmnpqrstuvwxyz';
      const digits = '23456789';
      const special = '!@#$%&*';
      const all = upper + lower + digits + special;

      let pass = '';
      pass += upper.charAt(Math.floor(Math.random() * upper.length));
      pass += lower.charAt(Math.floor(Math.random() * lower.length));
      pass += digits.charAt(Math.floor(Math.random() * digits.length));
      pass += special.charAt(Math.floor(Math.random() * special.length));

      for (let i = pass.length; i < length; i++) {
        pass += all.charAt(Math.floor(Math.random() * all.length));
      }

      return pass.split('').sort(() => 0.5 - Math.random()).join('');
    },

    fillGeneratedPassword() {
      const gen = this.generateSecurePassword();
      const pwInput = document.getElementById('user-modal-password');
      if (pwInput) {
        pwInput.value = gen;
        pwInput.type = 'text';
      }
    },

    openCreateModal() {
      this.selectedUserId = null;
      document.getElementById('user-modal-title').textContent = 'Create Staff Account';
      document.getElementById('user-modal-name').value = '';
      document.getElementById('user-modal-username').value = '';
      document.getElementById('user-modal-username').disabled = false;
      document.getElementById('user-modal-email').value = '';
      document.getElementById('user-modal-phone').value = '';

      const pwField = document.getElementById('user-modal-password-field');
      const pwInput = document.getElementById('user-modal-password');
      if (pwField && pwInput) {
        pwField.style.display = 'block';
        pwInput.value = this.generateSecurePassword();
        pwInput.type = 'text';
      }

      const roleSelect = document.getElementById('user-modal-role');
      if (roleSelect) {
        roleSelect.value = this.roles[0]?.slug || this.roles[0]?.id || '';
      }

      const statusSelect = document.getElementById('user-modal-status');
      if (statusSelect) statusSelect.value = 'active';
      const mustChangeEl = document.getElementById('user-modal-must-change');
      if (mustChangeEl) mustChangeEl.checked = false;

      document.getElementById('user-modal').classList.remove('hidden');
    },

    openEditModal(userId) {
      const u = this.users.find((x) => x.id === userId);
      if (!u) return;
      this.selectedUserId = userId;

      document.getElementById('user-modal-title').textContent = `Edit Staff: ${u.username}`;
      document.getElementById('user-modal-name').value = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
      document.getElementById('user-modal-username').value = u.username;
      document.getElementById('user-modal-username').disabled = true;
      document.getElementById('user-modal-email').value = u.email || '';
      document.getElementById('user-modal-phone').value = u.phone || '';

      const pwField = document.getElementById('user-modal-password-field');
      const pwInput = document.getElementById('user-modal-password');
      if (pwField && pwInput) {
        pwField.style.display = 'none';
        pwInput.value = '';
      }

      const roleSelect = document.getElementById('user-modal-role');
      if (roleSelect) {
        roleSelect.value = (Array.isArray(u.role_ids) && u.role_ids[0]) || u.role_id || u.role || '';
      }

      const statusSelect = document.getElementById('user-modal-status');
      if (statusSelect) statusSelect.value = u.status || 'active';

      const mustChangeEl = document.getElementById('user-modal-must-change');
      if (mustChangeEl) mustChangeEl.checked = Boolean(u.must_change_password || u.force_password_change);

      document.getElementById('user-modal').classList.remove('hidden');
    },

    closeModal() {
      document.getElementById('user-modal').classList.add('hidden');
    },

    async saveUser(e) {
      e.preventDefault();
      const name = document.getElementById('user-modal-name').value.trim();
      const username = document.getElementById('user-modal-username').value.trim().toLowerCase();
      const email = document.getElementById('user-modal-email').value.trim().toLowerCase();
      const phone = document.getElementById('user-modal-phone').value.trim();
      const roleId = document.getElementById('user-modal-role').value;
      const status = document.getElementById('user-modal-status').value;
      const password = document.getElementById('user-modal-password').value;
      const mustChange = Boolean(document.getElementById('user-modal-must-change')?.checked);

      const payload = {
        name,
        username,
        email,
        phone,
        role_ids: roleId ? [roleId] : ['customer_support'],
        status,
        must_change_password: mustChange,
        force_password_change: mustChange,
      };

      try {
        if (!this.selectedUserId) {
          payload.password = password || this.generateSecurePassword();
          await window.AdminApp.api('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          this.closeModal();
          await this.load();

          const assignedRole = this.roles.find((r) => (r.slug || r.id) === roleId);
          this.showCredentialsModal(username, payload.password, assignedRole?.name || roleId);
          window.AdminApp.toast('Staff account created with auto-generated credentials.', 'success');
        } else {
          await window.AdminApp.api(`/api/admin/users/${this.selectedUserId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          this.closeModal();
          await this.load();
          window.AdminApp.toast('Staff account updated successfully.', 'success');
        }
      } catch (err) {
        window.AdminApp.toast(err.message || 'Failed to save staff account', 'error');
      }
    },

    showCredentialsModal(username, password, roleName) {
      this.lastCreatedCredentials = { username, password, roleName };

      let modal = document.getElementById('credentials-created-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'credentials-created-modal';
        modal.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="w-full max-w-md admin-card p-6 sm:p-7 shadow-2xl flex flex-col space-y-4 border border-emerald-500/30">
          <div class="flex items-center justify-between pb-3 border-b border-admin-border">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 class="font-bold text-sm text-white">Staff Account &amp; Credentials Generated</h3>
            </div>
            <button type="button" onclick="AdminUsers.closeCredentialsModal()" class="text-slate-400 hover:text-white p-1">✕</button>
          </div>

          <p class="text-xs text-slate-300">The account has been created. The staff member can log in immediately with the credentials below.</p>

          <div class="p-3.5 rounded-xl bg-admin-surface2 border border-admin-border space-y-2 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Username:</span>
              <span class="font-mono font-bold text-white selection:bg-indigo-600">${username}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Password:</span>
              <span class="font-mono font-bold text-emerald-400 selection:bg-emerald-800">${password}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Role:</span>
              <span class="font-semibold text-indigo-300">${roleName}</span>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button type="button" onclick="AdminUsers.copyCredentialsToClipboard()" class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Copy Credentials</span>
            </button>
            <button type="button" onclick="AdminUsers.closeCredentialsModal()" class="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer">
              Done
            </button>
          </div>
        </div>
      `;

      modal.classList.remove('hidden');
    },

    closeCredentialsModal() {
      const modal = document.getElementById('credentials-created-modal');
      if (modal) modal.classList.add('hidden');
    },

    async copyCredentialsToClipboard() {
      if (!this.lastCreatedCredentials) return;
      const text = `MARJAAH Portal Credentials:\nUsername: ${this.lastCreatedCredentials.username}\nPassword: ${this.lastCreatedCredentials.password}\nRole: ${this.lastCreatedCredentials.roleName}\nPortal URL: ${window.location.origin}/admin/`;
      try {
        await navigator.clipboard.writeText(text);
        window.AdminApp.toast('Credentials copied to clipboard.', 'success');
      } catch (err) {
        window.AdminApp.toast('Failed to copy. Please select and copy manually.', 'warning');
      }
    },

    async toggleStatus(userId, currentStatus) {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      try {
        await window.AdminApp.api(`/api/admin/users/${userId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });
        window.AdminApp.toast(`Account status updated to ${newStatus}.`, 'success');
        await this.load();
      } catch (err) {
        window.AdminApp.toast(err.message || 'Failed to update account status', 'error');
      }
    },

    openResetPasswordModal(userId, username) {
      const newPass = this.generateSecurePassword();
      const promptRes = prompt(`Reset password for staff member "${username}".\nEnter new password:`, newPass);
      if (!promptRes || !promptRes.trim()) return;

      this.submitResetPassword(userId, username, promptRes.trim());
    },

    async submitResetPassword(userId, username, newPassword) {
      try {
        await window.AdminApp.api(`/api/admin/users/${userId}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ new_password: newPassword, force_change: false }),
        });
        this.showCredentialsModal(username, newPassword, 'Updated Password');
        window.AdminApp.toast(`Password reset for ${username}. Active sessions revoked.`, 'success');
      } catch (err) {
        window.AdminApp.toast(err.message || 'Failed to reset password', 'error');
      }
    },

    async revokeSessions(userId, username) {
      if (!confirm(`Revoke all active sessions for "${username}"? They will be required to log in again immediately.`)) return;
      try {
        await window.AdminApp.api(`/api/admin/users/${userId}/revoke-sessions`, {
          method: 'POST',
        });
        window.AdminApp.toast(`All active sessions revoked for ${username}.`, 'success');
      } catch (err) {
        window.AdminApp.toast(err.message || 'Failed to revoke sessions', 'error');
      }
    },

    async deleteUser(userId, username) {
      if (!confirm(`Are you sure you want to permanently delete staff account "${username}"?`)) return;
      try {
        await window.AdminApp.api(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });
        window.AdminApp.toast(`Staff account "${username}" deleted permanently.`, 'success');
        await this.load();
      } catch (err) {
        window.AdminApp.toast(err.message || 'Failed to delete user', 'error');
      }
    },
  };
})();

