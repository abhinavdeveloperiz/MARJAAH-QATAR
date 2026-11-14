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

  window.AdminRoles = {
    roles: [],
    selectedRoleId: null,

    async load() {
      const container = document.getElementById('roles-cards-container');
      if (container) {
        container.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-400">Loading IAM roles...</div>`;
      }

      try {
        const res = await window.AdminApp.api('/api/admin/roles');
        this.roles = res.roles || res.items || res || [];
        this.renderCards();
      } catch (err) {
        if (container) {
          container.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-rose-400">Failed to load IAM roles.</div>`;
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
          if (Array.isArray(m)) return acc + m.length;
          return acc + Object.values(m || {}).filter(Boolean).length;
        }, 0);

        return `
          <div class="rounded-3xl p-6 border flex flex-col justify-between shadow-sm transition-all duration-300 hover:border-primary/50 bg-white" style="border-color:var(--admin-border)">
            <div>
              <div class="flex items-center justify-between gap-3 mb-2">
                <h3 class="font-bold text-base text-slate-900">${r.name}</h3>
                ${isSystem ? `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">System Role</span>` : `<span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">Custom Role</span>`}
              </div>
              <p class="text-xs text-slate-500 leading-relaxed mb-4 min-h-[36px]">${r.description || 'No description provided.'}</p>
              
              <div class="flex items-center gap-4 text-xs font-semibold py-3 border-t border-slate-200 text-slate-600">
                <div>Permissions: <strong class="text-slate-900">${totalPerms}</strong></div>
                <div>Slug: <span class="font-mono text-primary font-bold">${r.slug || r.id}</span></div>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-200 flex items-center justify-between gap-2 mt-2">
              <button type="button" onclick="AdminRoles.openMatrixModal('${r.id || r.slug}')" class="flex-1 py-2 rounded-xl border border-slate-200 hover:border-primary hover:bg-primary/5 text-xs font-bold text-primary transition cursor-pointer">
                Configure Permissions
              </button>
              ${!isSystem ? `
                <button type="button" onclick="AdminRoles.deleteRole('${r.id || r.slug}')" class="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-500 transition cursor-pointer" title="Delete Role">
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
              const isChecked = Array.isArray(modPerms)
                ? (modPerms.includes(act) || modPerms.includes('manage') || modPerms.includes('*'))
                : Boolean(modPerms[act] || modPerms['manage'] || modPerms['*']);
              return `
                <td class="py-2.5 px-3 text-center">
                  <input type="checkbox" data-matrix-mod="${mod.key}" data-matrix-act="${act}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-500" />
                </td>
              `;
            }).join('')}
            <td class="py-2.5 px-4 text-center">
              <button type="button" onclick="AdminRoles.toggleModuleRow('${mod.key}')" class="text-[10px] text-indigo-400 hover:underline cursor-pointer">Toggle All</button>
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
        if (!permissions[mod]) permissions[mod] = [];
        if (cb.checked) {
          permissions[mod].push(act);
        }
      });

      const payload = { name, description, permissions };

      try {
        if (!this.selectedRoleId) {
          payload.slug = slug;
          await window.AdminApp.api('/api/admin/roles', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          window.AdminApp.toast('Custom role created successfully.', 'success');
        } else {
          await window.AdminApp.api(`/api/admin/roles/${this.selectedRoleId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          window.AdminApp.toast('Role permissions updated successfully.', 'success');
        }
        this.closeMatrixModal();
        await this.load();
      } catch (err) {
        window.AdminApp.toast(err.message || 'Failed to save role', 'error');
      }
    },

    async deleteRole(roleId) {
      if (!confirm('Are you sure you want to delete this custom role? Users assigned will lose these permissions.')) return;
      try {
        await window.AdminApp.api(`/api/admin/roles/${roleId}`, {
          method: 'DELETE',
        });
        window.AdminApp.toast('Role removed successfully.', 'success');
        await this.load();
      } catch (err) {
        window.AdminApp.toast(err.message || 'Failed to delete role', 'error');
      }
    },
  };
})();

