

(function () {
  'use strict';

  window.AdminApprovals = {
    approvals: [],
    configs: [],
    currentStatus: 'pending',
    selectedApproval: null,

    async load() {
      const container = document.getElementById('approvals-table-body');
      if (container) {
        container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">Loading approval submissions...</td></tr>`;
      }

      const configsTbody = document.getElementById('approval-configs-tbody');
      if (configsTbody && (!this.configs || this.configs.length === 0)) {
        configsTbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-xs text-slate-400">Loading module configs...</td></tr>`;
      }

      const [apprRes, cfgRes] = await Promise.allSettled([
        AdminApp.api(`/api/admin/approvals?status=${this.currentStatus === 'all' ? '' : this.currentStatus}`),
        AdminApp.api('/api/admin/approvals/configs').catch(() => AdminApp.api('/api/admin/approvals/config')),
      ]);

      if (apprRes.status === 'fulfilled' && apprRes.value) {
        const apprData = apprRes.value;
        this.approvals = apprData.items || apprData || [];
        this.renderTable();
      } else {
        console.warn('Approvals queue note:', apprRes.reason?.message);
        this.approvals = [];
        this.renderTable();
      }

      if (cfgRes.status === 'fulfilled' && cfgRes.value) {
        const cfgData = cfgRes.value;
        this.configs = cfgData.configs || cfgData.items || (Array.isArray(cfgData) ? cfgData : []);
        this.renderConfigsTable();
      } else {
        this.configs = [];
        this.renderConfigsTable();
      }
    },

    setStatusTab(status) {
      this.currentStatus = status;
      document.querySelectorAll('.approval-tab-btn').forEach((btn) => {
        const s = btn.getAttribute('data-status');
        if (s === status) {
          btn.classList.add('active', 'border-primary', 'text-primary', 'bg-primary/10');
          btn.classList.remove('border-transparent', 'text-slate-500');
        } else {
          btn.classList.remove('active', 'border-primary', 'text-primary', 'bg-primary/10');
          btn.classList.add('border-transparent', 'text-slate-500');
        }
      });
      this.load();
    },

    renderTable() {
      const container = document.getElementById('approvals-table-body');
      if (!container) return;

      if (this.approvals.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-xs text-slate-400">No submissions found in ${this.currentStatus.toUpperCase()} queue.</td></tr>`;
        return;
      }

      container.innerHTML = this.approvals.map((appr) => {
        const statusBadges = {
          pending: 'bg-amber-50 text-amber-700 border-amber-200',
          approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          rejected: 'bg-rose-50 text-rose-700 border-rose-200',
        };
        const statusBadge = statusBadges[appr.status] || statusBadges.pending;
        const submittedTime = appr.created_at ? new Date(appr.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';
        const itemTitle = appr.target_title || appr.target_id || 'Item Modification';

        return `
          <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors">
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-2">
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">${appr.module}</span>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">${appr.action}</span>
              </div>
              <p class="font-bold text-xs text-slate-900 mt-1.5 truncate max-w-xs">${itemTitle}</p>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-600">
              <span class="font-medium text-slate-800">@${appr.submitted_by_username || appr.submitted_by || 'Staff'}</span>
              <p class="text-[10px] text-slate-500 font-mono mt-0.5">${submittedTime}</p>
            </td>
            <td class="py-3.5 px-4">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}">
                ${(appr.status || 'pending').toUpperCase()}
              </span>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-500">
              ${appr.reviewed_by ? `
                <div class="text-xs text-slate-700">@${appr.reviewed_by}</div>
                <div class="text-[10px] text-slate-500 font-mono">${new Date(appr.reviewed_at).toLocaleDateString('en-GB')}</div>
              ` : '—'}
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-600">
              ${appr.rejection_reason ? `
                <span class="text-rose-600 font-medium italic block max-w-xs truncate" title="${appr.rejection_reason}">
                  "${appr.rejection_reason}"
                </span>
              ` : (appr.status === 'approved' ? '<span class="text-emerald-600 text-[11px] font-semibold">Approved & Published</span>' : '<span class="text-slate-500">Awaiting Decision</span>')}
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button type="button" onclick="AdminApprovals.openDiffModal('${appr.id}')" class="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-primary transition cursor-pointer">
                  Review Diff
                </button>
                ${appr.status === 'pending' ? `
                  <button type="button" onclick="AdminApprovals.approveSubmission('${appr.id}')" class="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-sm cursor-pointer">
                    Approve
                  </button>
                  <button type="button" onclick="AdminApprovals.promptRejectSubmission('${appr.id}')" class="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-sm cursor-pointer">
                    Reject
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    openDiffModal(apprId) {
      const appr = this.approvals.find((x) => x.id === apprId);
      if (!appr) return;
      this.selectedApproval = appr;

      document.getElementById('diff-modal-title').textContent = `Review Submission: ${appr.module} (${appr.action})`;
      document.getElementById('diff-modal-meta').innerHTML = `
        Submitted by <strong>@${appr.submitted_by_username || appr.submitted_by}</strong> on ${new Date(appr.created_at).toLocaleString('en-GB')}.
      `;

      const beforeEl = document.getElementById('diff-modal-before');
      const afterEl = document.getElementById('diff-modal-after');

      const beforeData = appr.before_data || appr.previous_state || { status: 'Original State / None' };
      const afterData = appr.after_data || appr.payload || appr.new_state || {};

      if (beforeEl) beforeEl.textContent = JSON.stringify(beforeData, null, 2);
      if (afterEl) afterEl.textContent = JSON.stringify(afterData, null, 2);

      const actionFooter = document.getElementById('diff-modal-actions');
      if (actionFooter) {
        if (appr.status === 'pending') {
          actionFooter.innerHTML = `
            <button type="button" onclick="AdminApprovals.promptRejectSubmission('${appr.id}')" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition">Reject with Reason</button>
            <button type="button" onclick="AdminApprovals.approveSubmission('${appr.id}')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition">Approve &amp; Publish</button>
          `;
        } else {
          actionFooter.innerHTML = `
            <span class="text-xs font-bold text-slate-400">Status: <strong class="text-white uppercase">${appr.status}</strong></span>
          `;
        }
      }

      document.getElementById('approval-diff-modal').classList.remove('hidden');
    },

    closeDiffModal() {
      document.getElementById('approval-diff-modal').classList.add('hidden');
    },

    async approveSubmission(apprId) {
      if (!confirm('Approve this submission? Changes will immediately take effect on the live website.')) return;
      try {
        await AdminApp.api(`/api/admin/approvals/${apprId}/approve`, {
          method: 'POST',
          body: JSON.stringify({ notes: 'Approved via Admin Panel' }),
        });
        AdminApp.toast('Submission approved successfully.', 'success');
        this.closeDiffModal();
        await this.load();
        AdminApp.updatePendingBadges();
      } catch (err) {
        AdminApp.toast(err.message || 'Approval failed', 'error');
      }
    },

    async promptRejectSubmission(apprId) {
      const reason = prompt('Please enter a rejection reason (mandatory for the submitter):');
      if (!reason || !reason.trim()) {
        AdminApp.toast('Rejection reason is required.', 'warning');
        return;
      }

      try {
        await AdminApp.api(`/api/admin/approvals/${apprId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() }),
        });
        AdminApp.toast('Submission rejected with reason.', 'info');
        this.closeDiffModal();
        await this.load();
        AdminApp.updatePendingBadges();
      } catch (err) {
        AdminApp.toast(err.message || 'Rejection failed', 'error');
      }
    },

    renderConfigsTable() {
      const tbody = document.getElementById('approval-configs-tbody');
      if (!tbody) return;

      const MODULES = [
        { key: 'products', name: 'Products Catalog' },
        { key: 'categories', name: 'Categories' },
        { key: 'banners', name: 'Hero Banners' },
        { key: 'promotional_sections', name: 'Promotional Sections' },
        { key: 'orders', name: 'Order Cancellations / Modifications' },
        { key: 'coupons', name: 'Coupons & Discounts' },
      ];

      tbody.innerHTML = MODULES.map((m) => {
        const cfg = this.configs.find((c) => c.module === m.key) || { requires_approval: false, operations: [] };
        const reqCreate = cfg.operations?.includes('create') || false;
        const reqEdit = cfg.operations?.includes('edit') || false;
        const reqDelete = cfg.operations?.includes('delete') || false;

        return `
          <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors">
            <td class="py-3 px-4 font-bold text-xs text-slate-900">${m.name}</td>
            <td class="py-3 px-3 text-center">
              <input type="checkbox" data-cfg-mod="${m.key}" data-cfg-op="create" ${reqCreate ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-0 cursor-pointer accent-primary" />
            </td>
            <td class="py-3 px-3 text-center">
              <input type="checkbox" data-cfg-mod="${m.key}" data-cfg-op="edit" ${reqEdit ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-0 cursor-pointer accent-primary" />
            </td>
            <td class="py-3 px-3 text-center">
              <input type="checkbox" data-cfg-mod="${m.key}" data-cfg-op="delete" ${reqDelete ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-0 cursor-pointer accent-primary" />
            </td>
            <td class="py-3 px-4 text-right">
              <button type="button" onclick="AdminApprovals.saveModuleApprovalConfig('${m.key}')" class="px-3 py-1 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary transition cursor-pointer">
                Save Rule
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    async saveModuleApprovalConfig(moduleKey) {
      const ops = [];
      document.querySelectorAll(`[data-cfg-mod="${moduleKey}"]:checked`).forEach((cb) => {
        ops.push(cb.getAttribute('data-cfg-op'));
      });

      const requires_approval = ops.length > 0;
      try {
        await AdminApp.api('/api/admin/approvals/configs', {
          method: 'POST',
          body: JSON.stringify({
            module: moduleKey,
            requires_approval,
            operations: ops,
          }),
        });
        AdminApp.toast(`Approval rules for ${moduleKey} updated successfully.`, 'success');
        await this.load();
      } catch (err) {
        AdminApp.toast(err.message || 'Failed to update approval config', 'error');
      }
    },
  };
})();

