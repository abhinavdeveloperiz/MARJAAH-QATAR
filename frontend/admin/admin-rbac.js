/**
 * MARJAAH QATAR — Admin RBAC & Staff Management Controller (Requirement 2)
 * Handles Admin Users, Custom Roles, and Granular Permission Matrix.
 */

(function () {
  'use strict';

  const MODULES_LIST = [
    { key: 'dashboard', name: 'Dashboard & Analytics' },
    { key: 'products', name: 'Products Catalog' },
    { key: 'categories', name: 'Categories' },
    { key: 'brands', name: 'Brands' },
    { key: 'inventory', name: 'Inventory & Stock' },
    { key: 'orders', name: 'Orders & Fulfillment' },
    { key: 'customers', name: 'Customer Accounts' },
    { key: 'payments', name: 'Payments & Transactions' },
    { key: 'coupons', name: 'Coupons & Discounts' },
    { key: 'banners', name: 'Hero Banners' },
    { key: 'promotional_sections', name: 'Promotional Sections' },
    { key: 'store_locations', name: 'Store Pickup Locations' },
    { key: 'website_content', name: 'Website Content' },
    { key: 'reports', name: 'Reports & Export' },
    { key: 'admin_users', name: 'Admin Staff' },
    { key: 'roles_permissions', name: 'Roles & IAM' },
    { key: 'settings', name: 'Store Settings' },
    { key: 'audit_logs', name: 'Audit Logs' },
  ];

  const ACTIONS_LIST = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'];

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ADMIN USERS CONTROLLER
  // ═══════════════════════════════════════════════════════════════════════════
  window.AdminUsers = {
    users: [],
    roles: [],
    selectedUserId: null,
    searchDebounceTimer: null,

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
          AdminApp.api('/api/admin/users'),
          AdminApp.api('/api/admin/roles'),
        ]);

        this.users = usersData.users || usersData.items || usersData || [];
        this.roles = rolesData.roles || rolesData.items || rolesData || [];
        this.renderTable();
        this.populateRoleDropdowns();
      } catch (err) {
        console.error('Failed to load users:', err);
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
        container.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-xs text-slate-400">No admin staff accounts found.</td></tr>`;
        return;
      }

      container.innerHTML = filtered.map((u) => {
        const roleObj = this.roles.find((r) => r.slug === u.role_id || r.id === u.role_id || r.slug === u.role);
        const roleLabel = roleObj ? roleObj.name : (u.is_superuser ? 'Super Admin' : (u.role || 'Staff'));

        const statusBadges = {
          active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          inactive: 'bg-slate-700/30 text-slate-400 border-slate-700',
          suspended: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        };
        const statusClass = statusBadges[u.status] || statusBadges.active;

        const lastLoginStr = u.last_login ? new Date(u.last_login).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : 'Never';

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                  ${(u.name || u.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p class="font-bold text-xs text-white">${u.name || u.username}</p>
                  <p class="text-[11px] text-slate-400 font-mono">@${u.username}</p>
                </div>
              </div>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-300">${u.email || '—'}</td>
            <td class="py-3.5 px-4">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                ${roleLabel}
              </span>
            </td>
            <td class="py-3.5 px-4">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}">
                ${(u.status || 'active').toUpperCase()}
              </span>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-400 font-mono">${lastLoginStr}</td>
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button type="button" onclick="AdminUsers.openEditModal('${u.id}')" title="Edit Staff" class="p-1.5 rounded-lg border border-slate-700/60 hover:bg-slate-700/40 text-slate-300 hover:text-white transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
                <button type="button" onclick="AdminUsers.promptResetPassword('${u.id}', '${u.username}')" title="Reset Password" class="p-1.5 rounded-lg border border-slate-700/60 hover:bg-slate-700/40 text-amber-400 hover:text-amber-300 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </button>
                <button type="button" onclick="AdminUsers.toggleUserStatus('${u.id}', '${u.status || 'active'}')" title="Toggle Status" class="p-1.5 rounded-lg border border-slate-700/60 hover:bg-slate-700/40 text-slate-300 hover:text-white transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>
                </button>
                <button type="button" onclick="AdminUsers.revokeSessions('${u.id}')" title="Revoke Active Sessions" class="p-1.5 rounded-lg border border-slate-700/60 hover:bg-rose-500/20 text-rose-400 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    openCreateModal() {
      this.selectedUserId = null;
      document.getElementById('user-modal-title').textContent = 'Create Admin User';
      document.getElementById('user-modal-form').reset();
      document.getElementById('user-modal-password-field').classList.remove('hidden');
      document.getElementById('user-modal-password').setAttribute('required', 'required');
      document.getElementById('user-modal').classList.remove('hidden');
    },

    openEditModal(userId) {
      const u = this.users.find((x) => x.id === userId);
      if (!u) return;
      this.selectedUserId = userId;

      document.getElementById('user-modal-title').textContent = `Edit Staff: @${u.username}`;
      document.getElementById('user-modal-name').value = u.name || '';
      document.getElementById('user-modal-username').value = u.username || '';
      document.getElementById('user-modal-username').disabled = true;
      document.getElementById('user-modal-email').value = u.email || '';
      document.getElementById('user-modal-phone').value = u.phone || '';
      document.getElementById('user-modal-role').value = u.role_id || u.role || '';
      document.getElementById('user-modal-status').value = u.status || 'active';
      document.getElementById('user-modal-must-change').checked = Boolean(u.must_change_password);

      document.getElementById('user-modal-password-field').classList.add('hidden');
      document.getElementById('user-modal-password').removeAttribute('required');
      document.getElementById('user-modal').classList.remove('hidden');
    },

    closeModal() {
      document.getElementById('user-modal').classList.add('hidden');
      document.getElementById('user-modal-username').disabled = false;
    },

    async saveUser(e) {
      e.preventDefault();
      const name = document.getElementById('user-modal-name').value.trim();
      const username = document.getElementById('user-modal-username').value.trim();
      const email = document.getElementById('user-modal-email').value.trim();
      const phone = document.getElementById('user-modal-phone').value.trim();
      const role_id = document.getElementById('user-modal-role').value;
      const status = document.getElementById('user-modal-status').value;
      const must_change_password = document.getElementById('user-modal-must-change').checked;

      const payload = { name, email, phone, role_id, status, must_change_password };

      try {
        if (!this.selectedUserId) {
          payload.username = username;
          payload.password = document.getElementById('user-modal-password').value.trim();
          await AdminApp.api('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          AdminApp.toast('Admin user created successfully.', 'success');
        } else {
          await AdminApp.api(`/api/admin/users/${this.selectedUserId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          AdminApp.toast('Admin user updated successfully.', 'success');
        }
        this.closeModal();
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Operation failed', 'error');
      }
    },

    async toggleUserStatus(userId, currentStatus) {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      if (!confirm(`Are you sure you want to change this account status to ${newStatus.toUpperCase()}?`)) return;

      try {
        await AdminApp.api(`/api/admin/users/${userId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        });
        AdminApp.toast(`Account status set to ${newStatus}.`, 'success');
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to update status', 'error');
      }
    },

    async promptResetPassword(userId, username) {
      const newPass = prompt(`Enter new password for @${username}:`);
      if (!newPass) return;

      try {
        await AdminApp.api(`/api/admin/users/${userId}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ new_password: newPass, force_change: true }),
        });
        AdminApp.toast('Password reset successfully. Staff must change on next login.', 'success');
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to reset password', 'error');
      }
    },

    async revokeSessions(userId) {
      if (!confirm('Revoke all active JWT sessions for this staff member immediately?')) return;
      try {
        await AdminApp.api(`/api/admin/users/${userId}/revoke-sessions`, {
          method: 'POST',
        });
        AdminApp.toast('Sessions revoked. User must authenticate again.', 'success');
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to revoke sessions', 'error');
      }
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CUSTOM ROLES & PERMISSION MATRIX CONTROLLER
  // ═══════════════════════════════════════════════════════════════════════════
  window.AdminRoles = {
    roles: [],
    selectedRoleId: null,

    async load() {
      const container = document.getElementById('roles-cards-container');
      if (container) {
        container.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-400">Loading custom roles...</div>`;
      }

      try {
        const data = await AdminApp.api('/api/admin/roles');
        this.roles = data.roles || data.items || data || [];
        this.renderCards();
      } catch (err) {
        console.error('Failed to load roles:', err);
        if (container) {
          container.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-rose-400">Failed to load roles.</div>`;
        }
      }
    },

    renderCards() {
      const container = document.getElementById('roles-cards-container');
      if (!container) return;

      container.innerHTML = this.roles.map((r) => {
        const isSystem = Boolean(r.is_system);
        const perms = r.permissions || {};
        const totalPerms = Object.values(perms).reduce((acc, m) => {
          return acc + Object.values(m || {}).filter(Boolean).length;
        }, 0);

        return `
          <div class="rounded-3xl p-6 border flex flex-col justify-between shadow-sm transition-all duration-300 hover:border-indigo-500/50" style="background:var(--bg-surface-2);border-color:var(--border-color)">
            <div>
              <div class="flex items-center justify-between gap-3 mb-2">
                <h3 class="font-bold text-base text-white">${r.name}</h3>
                ${isSystem ? `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">System Role</span>` : `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">Custom Role</span>`}
              </div>
              <p class="text-xs text-slate-400 leading-relaxed mb-4 min-h-[36px]">${r.description || 'No description provided.'}</p>
              
              <div class="flex items-center gap-4 text-xs font-semibold py-3 border-t border-slate-800 text-slate-300">
                <div>Permissions: <strong class="text-white">${totalPerms}</strong></div>
                <div>Slug: <span class="font-mono text-indigo-400">${r.slug || r.id}</span></div>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-800 flex items-center justify-between gap-2 mt-2">
              <button type="button" onclick="AdminRoles.openMatrixModal('${r.id || r.slug}')" class="flex-1 py-2 rounded-xl border border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-600/10 text-xs font-bold text-indigo-300 hover:text-white transition cursor-pointer">
                Configure Permissions
              </button>
              ${!isSystem ? `
                <button type="button" onclick="AdminRoles.deleteRole('${r.id || r.slug}')" class="p-2 rounded-xl border border-slate-700 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer" title="Delete Role">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    },

    openCreateModal() {
      this.selectedRoleId = null;
      document.getElementById('role-modal-title').textContent = 'Create Custom Role';
      document.getElementById('role-modal-name').value = '';
      document.getElementById('role-modal-slug').value = '';
      document.getElementById('role-modal-slug').disabled = false;
      document.getElementById('role-modal-desc').value = '';
      this.renderPermissionMatrix({});
      document.getElementById('role-matrix-modal').classList.remove('hidden');
    },

    openMatrixModal(roleId) {
      const r = this.roles.find((x) => x.id === roleId || x.slug === roleId);
      if (!r) return;
      this.selectedRoleId = r.id || r.slug;

      document.getElementById('role-modal-title').textContent = `Role Permissions: ${r.name}`;
      document.getElementById('role-modal-name').value = r.name || '';
      document.getElementById('role-modal-slug').value = r.slug || r.id;
      document.getElementById('role-modal-slug').disabled = true;
      document.getElementById('role-modal-desc').value = r.description || '';
      this.renderPermissionMatrix(r.permissions || {});
      document.getElementById('role-matrix-modal').classList.remove('hidden');
    },

    closeMatrixModal() {
      document.getElementById('role-matrix-modal').classList.add('hidden');
    },

    renderPermissionMatrix(perms) {
      const tbody = document.getElementById('role-matrix-tbody');
      if (!tbody) return;

      tbody.innerHTML = MODULES_LIST.map((mod) => {
        const modPerms = perms[mod.key] || {};
        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
            <td class="py-2.5 px-4 text-xs font-bold text-white">${mod.name}</td>
            ${ACTIONS_LIST.map((act) => {
              const isChecked = Boolean(modPerms[act] || modPerms['manage']);
              return `
                <td class="py-2.5 px-3 text-center">
                  <input type="checkbox" data-matrix-mod="${mod.key}" data-matrix-act="${act}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-500" />
                </td>
              `;
            }).join('')}
            <td class="py-2.5 px-4 text-center">
              <button type="button" onclick="AdminRoles.toggleModuleRow('${mod.key}')" class="text-[10px] text-indigo-400 hover:underline">Toggle All</button>
            </td>
          </tr>
        `;
      }).join('');
    },

    toggleModuleRow(modKey) {
      const cbs = document.querySelectorAll(`[data-matrix-mod="${modKey}"]`);
      const allChecked = Array.from(cbs).every((cb) => cb.checked);
      cbs.forEach((cb) => (cb.checked = !allChecked));
    },

    selectAllMatrix(checked = true) {
      document.querySelectorAll('#role-matrix-tbody input[type="checkbox"]').forEach((cb) => {
        cb.checked = checked;
      });
    },

    async saveRole(e) {
      e.preventDefault();
      const name = document.getElementById('role-modal-name').value.trim();
      const slug = document.getElementById('role-modal-slug').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const description = document.getElementById('role-modal-desc').value.trim();

      const permissions = {};
      document.querySelectorAll('#role-matrix-tbody input[type="checkbox"]').forEach((cb) => {
        const mod = cb.getAttribute('data-matrix-mod');
        const act = cb.getAttribute('data-matrix-act');
        if (!permissions[mod]) permissions[mod] = {};
        if (cb.checked) {
          permissions[mod][act] = true;
        }
      });

      const payload = { name, description, permissions };

      try {
        if (!this.selectedRoleId) {
          payload.slug = slug;
          await AdminApp.api('/api/admin/roles', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          AdminApp.toast('Custom role created successfully.', 'success');
        } else {
          await AdminApp.api(`/api/admin/roles/${this.selectedRoleId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          AdminApp.toast('Role permissions updated successfully.', 'success');
        }
        this.closeMatrixModal();
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to save role', 'error');
      }
    },

    async deleteRole(roleId) {
      if (!confirm('Are you sure you want to delete this custom role? Users assigned will lose these permissions.')) return;
      try {
        await AdminApp.api(`/api/admin/roles/${roleId}`, {
          method: 'DELETE',
        });
        AdminApp.toast('Role removed successfully.', 'success');
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to delete role', 'error');
      }
    },
  };
})();

